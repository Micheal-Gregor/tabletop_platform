#!/usr/bin/env python3
"""
precommit — the checks every commit runs, from any session or any shell (2.6.17; the staged snapshot, 2.6.18).

.githooks/pre-commit runs this on every `git commit`, .githooks/pre-merge-commit on every merge that makes a commit,
and .githooks/pre-applypatch on every patch `git am` applies (2.6.21; am has written the patch into the index by
then, so the staged snapshot is the patch), once tools/install-gates.py has set core.hooksPath. So a commit made
from a plain terminal, a CI job or a session the gate never reached is checked the same as one made inside a gated
session. gate.py runs it too, before it lets a session's commit through, so the session sees the reason in its own
transcript. One implementation, run twice.

The checks read exactly what the commit records: the staged index is written to a tree and checked out into a
throwaway detached worktree, and the content checks run there (2.6.18). In 2.6.17 they read the working tree, so a
violation staged and then removed from disk, staged straight into the index (`git update-index --cacheinfo`) or staged
in part (`git add -p`) was committed unchecked (LedgerCore V2's live test 5b). The checks are this checkout's
installed tools, run against the snapshot; a commit that edits a tool is still judged by the tools it would replace.

Checks:
  probe       .metaframework/gate-probe is on disk: a probe that was not refused, so a session wrote ungated.
  frozen      a staged change under governance/S3/ after the s3-anchor tag, or to a file sealed at the latest seal.
              After a seal, a file new to governance/S3/ is an extension's Phase 3 export and passes once (2.8.1).
              Before a seal, a file new to the next revision's folder, governance/S3/v1.<n>/, is F's superseding
              export and passes once (2.8.2).
  logs        .metaframework/gate-live.jsonl and brief-log.jsonl only grow: the staged copy starts with HEAD's.
  objects     phase4-checks.py objects reports a violation in a staged file (OS-1, OS-2, OS-3, OS-9, OS-12).
  declarations  seal.py declarations reports a staged signature that disagrees with the object model or contract.
  structure   structure-check.py reports a staged document that breaks its role's rules.
  project     a hook listed in project.json project_hooks exits non-zero; each gets the staged paths as arguments.
  code-gates  with code_gates declared, `node <gates.cjs> precommit` refuses (it reads the staged copies itself).

Usage:
    precommit.py [--root .] [--json]
Exit: 0 the commit may proceed, 1 it is refused (every reason listed), 2 bad invocation.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, NamedTuple

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gate                                          # noqa: E402 - the seal and S3 rules have one source
from basis import project                            # noqa: E402
from gatecheck import LOCAL, PROBE, local_settings   # noqa: E402

LOGS = (".metaframework/gate-live.jsonl", ".metaframework/brief-log.jsonl")
# git hands a hook GIT_INDEX_FILE (and may hand it GIT_DIR); anything run in the snapshot must not inherit them, or
# it would read or write the commit-in-progress index instead of the snapshot's own.
CLEAN = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
IDENTITY = {**CLEAN, "GIT_AUTHOR_NAME": "precommit", "GIT_AUTHOR_EMAIL": "precommit@invalid",
            "GIT_COMMITTER_NAME": "precommit", "GIT_COMMITTER_EMAIL": "precommit@invalid"}
# The checks are Python children: they write UTF-8 and are read as UTF-8, whatever the console's code page (2.6.21).
CHILD = {**CLEAN, "PYTHONIOENCODING": "utf-8"}
UTF8 = {"encoding": "utf-8", "errors": "replace"}


class Commit(NamedTuple):
    """The commit being checked: the repository, a checkout of exactly what it records, and what it stages."""
    root: Path
    snap: Path
    staged: list
    cfg: dict


def git(root: Path, *args: str, env: dict | None = None) -> tuple[int, str]:
    """git in `root`; `env` None keeps the hook's environment (its index), which the real repository's reads need."""
    try:
        r = subprocess.run(["git", "-C", str(root), *args], capture_output=True, timeout=120, env=env)
        return r.returncode, r.stdout.decode("utf-8", "replace").strip()
    except (OSError, subprocess.SubprocessError):
        return 1, ""


@contextmanager
def snapshot(root: Path) -> Iterator[Path]:
    """A throwaway detached worktree holding exactly the tree the staged index would commit."""
    rc, tree = git(root, "write-tree")
    rc2, commit = git(root, "commit-tree", tree, "-m", "precommit snapshot", env=IDENTITY) if rc == 0 else (1, "")
    tmp = Path(tempfile.mkdtemp(prefix="mf-precommit-"))
    snap = tmp / "snap"
    try:
        if rc2 or git(root, "worktree", "add", "--detach", "-q", str(snap), commit, env=CLEAN)[0]:
            raise OSError("the staged commit could not be checked out for checking")
        yield snap
    finally:
        git(root, "worktree", "remove", "--force", str(snap), env=CLEAN)
        shutil.rmtree(tmp, ignore_errors=True)
        git(root, "worktree", "prune", env=CLEAN)


def v(rule: str, detail: str, file: str = "") -> dict:
    return {"rule": rule, "detail": detail, "file": file}


def tool_json(c: Commit, script: str, *args: str) -> tuple[dict, str]:
    """(the JSON an installed tool printed about the snapshot, '' or why it could not be read)."""
    try:
        r = subprocess.run([sys.executable, str(c.root / "tools" / script), *args, "--root", str(c.snap), "--json"],
                           capture_output=True, timeout=180, cwd=c.snap, env=CHILD, **UTF8)
        return json.loads(r.stdout), ""
    except (OSError, ValueError, subprocess.SubprocessError) as exc:
        return {}, f"tools/{script} could not run ({exc}); failing closed"


def staged_findings(c: Commit, script: str, key: str, *args: str) -> list[dict]:
    """The findings an installed tool reports about the snapshot, kept to the staged files."""
    found, err = tool_json(c, script, *args)
    if err:
        return [v(f"{script}_unchecked", err)]
    return [v(x.get("rule", script), x.get("detail", ""), x["file"]) for x in found.get(key, [])
            if x.get("file") in c.staged]


def check_probe(c: Commit) -> list[dict]:
    if not (c.root / PROBE).exists():
        return []
    return [v("probe_left", "a gate probe was written instead of refused: a session here ran ungated. Find which, "
              "then delete the file", PROBE)]


def held_at(c: Commit, refs: list[str], path: str) -> bool:
    """Is the staged copy of `path` the one one of `refs` holds? Staging a frozen file exactly as it was frozen edits
    nothing: the seal's merge of phase4 into main (2.8.0) brings every sealed and S3 file into main that way."""
    rc, staged = git(c.root, "rev-parse", f":{path}")
    return rc == 0 and any(git(c.root, "rev-parse", f"{ref}:{path}") == (0, staged) for ref in refs)


def new_export(c: Commit, anchors: list[str], path: str) -> bool:
    """Is the staged `path` a new Phase 3 export file? A file that HEAD and every anchor lack edits nothing frozen. Once
    committed it is held like the rest: a later edit or delete is refused. Two exports come in this way:
    - after a seal, an extension's, which the owner commits under governance/S3/, where seal.py begin-extension reads
      it, and tags s3-anchor-ext-N (2.8.1);
    - before a seal, F's superseding revision, which anchor-s3.py --revision places in the next revision's folder
      (2.8.2; revision_file).
    In 2.6.17 to 2.8.0 every staged S3 file was refused after the first anchor, so neither could be anchored."""
    return (git(c.root, "rev-parse", "-q", "--verify", f":{path}")[0] == 0
            and all(git(c.root, "rev-parse", "-q", "--verify", f"{ref}:{path}")[0] != 0
                    for ref in ["HEAD", *anchors]))


def revision_file(anchors: list[str], path: str) -> bool:
    """Is `path` in the next S3 revision's folder, governance/S3/v1.<n>/? Only the next one: a folder an earlier
    revision was anchored in is held at its tag, and one further ahead skips a revision."""
    found = gate.REVISION_FOLDER.match(path)
    return bool(found) and int(found.group(1)) == gate.next_revision(anchors)


def s3_edit(c: Commit, anchors: list[str], seal: str, path: str) -> bool:
    """Does staging `path` change the frozen S3? A file held at an anchor changes nothing, nor does a new export that
    the seal (an extension's) or the next revision's folder (F's) admits."""
    if not anchors or not gate.PROTECTED_PATH.search(path) or held_at(c, anchors, path):
        return False
    return not ((seal or revision_file(anchors, path)) and new_export(c, anchors, path))


def check_frozen(c: Commit) -> list[dict]:
    anchors = git(c.root, "tag", "-l", "s3-anchor-*")[1].split()
    seal, sealed = gate.seal_context(c.root)
    out = [v("s3_frozen", "governance/S3/ is frozen at its anchor: supersede via F, never edit (F's revision comes "
             "in through tools/anchor-s3.py --revision)", f) for f in c.staged if s3_edit(c, anchors, seal, f)]
    return out + [v("sealed", f"sealed at {seal}: the library is read-only", f) for f in c.staged
                  if f in sealed and not held_at(c, [seal], f)]


def check_logs(c: Commit) -> list[dict]:
    out = []
    for log in (x for x in LOGS if x in c.staged):
        rc, before = git(c.root, "show", f"HEAD:{log}")
        after = git(c.root, "show", f":{log}")[1]
        if rc == 0 and not after.startswith(before):
            out.append(v("log_rewritten", "an append-only record lost or changed a line; only additions commit", log))
    return out


def check_objects(c: Commit) -> list[dict]:
    return staged_findings(c, "phase4-checks.py", "violations", "objects")


def check_declarations(c: Commit) -> list[dict]:
    return [{**x, "rule": "declarations"} for x in staged_findings(c, "seal.py", "problems", "declarations")]


def check_structure(c: Commit) -> list[dict]:
    return staged_findings(c, "structure-check.py", "violations")


def run(cmd: list[str], cwd: Path, env: dict | None) -> tuple[int, str]:
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, timeout=180, env=env, **UTF8)
        return r.returncode, "\n".join((r.stdout + r.stderr).strip().splitlines()[-6:])
    except (OSError, subprocess.SubprocessError) as exc:
        return 1, f"could not run ({exc})"


def check_project_hooks(c: Commit) -> list[dict]:
    """Each installed project hook, run in the snapshot on the staged paths."""
    out = []
    for hook in c.cfg.get("project_hooks") or []:
        rc, said = run([sys.executable, str(c.root / hook), *c.staged], c.snap, CHILD)
        if rc:
            out.append(v("project_hook", said or f"exit {rc}", str(hook)))
    return out


def check_code_gates(c: Commit) -> list[dict]:
    if not c.cfg.get("code_gates"):
        return []
    cli = local_settings(c.root).get("code_gates_cli") or ""
    if not cli or not Path(cli).is_file():
        return [v("code_gates_cli_missing", f"no gates.cjs at the path in {LOCAL}; run python3 tools/install-gates.py "
                  "--code-gates <the bundle's gates.cjs>", LOCAL)]
    rc, said = run(["node", cli, "precommit"], c.root, None)     # reads the staged copies through the hook's index
    return [v("code_gates", said or f"exit {rc}")] if rc else []


CHECKS = (check_probe, check_frozen, check_logs, check_objects, check_declarations, check_structure,
          check_project_hooks, check_code_gates)


def findings(root: Path, staged: list[str]) -> list[dict]:
    """Every check's findings on the commit the index holds; nothing staged, nothing to check."""
    if not staged:
        return check_probe(Commit(root, root, staged, {}))
    try:
        with snapshot(root) as snap:
            c = Commit(root, snap, staged, project(root))
            return [x for check in CHECKS for x in check(c)]
    except OSError as exc:
        return [v("snapshot_failed", f"{exc}; failing closed")]


def main() -> int:
    ap = argparse.ArgumentParser(description="the checks every commit runs")
    ap.add_argument("--root", default=".")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()
    root = Path(args.root).resolve()
    rc, names = git(root, "diff", "--cached", "--name-only", "--no-renames")
    if rc:
        print(f"precommit: cannot read the index of {root}; failing closed", file=sys.stderr)
        return 1
    found = findings(root, [x for x in names.splitlines() if x])
    report(found, args.json)
    return 1 if found else 0


def report(found: list[dict], as_json: bool) -> None:
    if as_json:
        print(json.dumps({"status": "fail" if found else "pass", "violations": found}, indent=2))
        return
    for x in found:
        print(f"precommit: {x['rule']}: {x['file'] + ': ' if x['file'] else ''}{x['detail']}", file=sys.stderr)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")      # every tool writes UTF-8 (2.8.0)
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
