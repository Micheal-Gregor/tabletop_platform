#!/usr/bin/env python3
"""
gate — PreToolUse hook. The wall.

Reads the hook payload on stdin and denies seven things:

  1. Any write to governance/S3/, including via Bash or PowerShell. The existing
     protect-s3.sh inspects tool_input.file_path only, so `cat > governance/
     S3/x` passes untouched and Phase 4 leans on Bash. This closes that. Every
     shell rule below applies to PowerShell as to Bash (GOV-1): on Windows it is
     a second shell, and a rule that names only one shell is a door left open.
     A shell command is judged by the paths it writes, moves or removes, read
     from the folder it runs in (2.6.18): until then a write verb anywhere
     beside the folder's name refused the whole command, so
     `cp governance/S3/x docs/`, a read, was refused. And by where it lands
     (2.6.21): `cp x governance/S3/`, `rm -r governance/S3` and `rm -rf .`
     reach the S3 through its folder.
  2. `git tag k7-pass-N` without a PASS verdict N whose reviewed.tree_sha
     equals the tree being tagged. Tags become evidence, not assertion. Read
     however git is spelled (2.7.0): `git -C <repo> tag`, git.exe, Git.
  3. `git merge` while the newest K7 round blocks: a verdict that is not a PASS
     at or above the drift floor, with no closing tag (k7-pass, closed-by-owner,
     seal) at or after the commit it reviewed. This is the drift-teeth rule.
     Under RD-32 (2.7.0) a step closes on the gates with no K7 round, so a merge
     no longer needs a verdict covering its tree; before the first round it needs
     none. From 2.8.0 (roster v0.14, the close) a foundation checkpoint holds no
     merge: it gets one fix pass, with no re-check and no triage. The final
     review holds merges until the seal, whose one owner approval closes it, or
     until the owner orders work on it (an owner-round tag at or after it). In
     Phase 5 (after a seal) this rule is replaced: merges need no K7 verdict,
     only an intact seal.
  4. After a seal: any write to a file present at the latest seal-* tag that
     matches sealed_globs. The library is read-only; extensions add new files.
  5. A hand-made `git tag seal-*`. Seals are made by tools/seal.py apply, which
     runs the sweep and writes the record first. An owner's tag, closed-by-owner-N
     or (2.6.21) owner-round-N, the owner's order for one more K7 fix round and
     re-check, needs the owner's receipts when a receipts store is declared.
  6. A write to a library source file that takes an input it never declared: a
     default argument, an *args/**kwargs bag, a zero-argument method returning a
     literal, a module constant read inside a class (OS-1), or an ambient read —
     env, clock, randomness, globals, singletons (OS-2). The rule arrives at the moment of the write, which is
     the only moment it competes with the three-token shortcut.
  7. `git commit` into this repo, however spelled (`git -C <repo> commit`,
     `cd <repo>; git commit`), that skips the pre-commit checks, or before
     tools/install-gates.py has installed them, or while tools/precommit.py
     refuses what is staged: the objects check, the declaration comparison and
     the rest — so nothing accumulates until the seal, where it is expensive.
  8. The rest of 2.6.17's reach rules, in tools/gate_reach.py: the liveness
     probe and its log, the gate's own machinery off limits to builders, source
     written through a shell, core.hooksPath, and the MF-BRIEF stamp on a
     builder's launch; and 2.6.21's: nothing lands commits without the commit
     or merge check, no staging and committing in one call, no tag by a builder;
     and 2.8.0's: k7-run.py, seal.py check and the full suite start through
     tools/run.py, detached, with a record a crash cannot lose.

FAILS CLOSED. Any error — unreadable payload, missing python, malformed
verdict, absent config — denies. The framework's own doctrine is that UNKNOWN
fails safe toward HALT; protect-s3.sh violates it by redirecting stderr to
/dev/null and treating an empty parse as permission to proceed. A python3 that
cannot start is covered by the hook command itself: Claude Code runs a tool when
its hook exits non-zero but not 2, so the command ends in `|| exit 2`.

Install in .claude/settings.json (tools/gatecheck.py checks it):

    {"hooks": {"PreToolUse": [
      {"matcher": "Bash|PowerShell|Write|Edit|MultiEdit|NotebookEdit|mcp__terminal__run_in_terminal|Monitor|Agent|Task",
       "hooks": [{"type": "command", "command": "python3 \"$CLAUDE_PROJECT_DIR/tools/gate.py\" || exit 2"}]}]}}

The path is anchored to the project, not the shell's folder: after a `cd ui` a relative
`tools/gate.py` is not found, and every tool call is blocked until the turn ends. A session
started in another folder reaches this file through the plugin's router (hooks/route.py).

Deny is signalled two ways for compatibility: permissionDecision on stdout and
exit code 2. A PreToolUse deny holds even under bypassPermissions.
"""

import importlib
import json
import re
import subprocess
import sys
from pathlib import Path


def sibling(name: str):
    """A module from beside this file, in tools/."""
    here = str(Path(__file__).resolve().parent)
    if here not in sys.path:
        sys.path.insert(0, here)
    return importlib.import_module(name)


def php_support():
    """tools/php_support.py: the PHP readers every tool shares (G-C7)."""
    return sibling("php_support")


def reach():
    """tools/gate_reach.py: the 2.6.17 rules (probe, builders, commits, briefs)."""
    return sibling("gate_reach")


sys.path.insert(0, str(Path(__file__).resolve().parent))
from source_scan import code_only, glob_to_regex, os1_findings  # shared with phase4-checks.py (2.6.19)

DRIFT_FLOOR = 7
# A repo-relative path, or a file tool's path, inside the frozen S3. Case-insensitive: NTFS resolves governance/s3/
# to the same directory (GOV-1). A shell command is judged by what it writes, moves or removes (gate_reach's
# frozen_writes, 2.6.18), never by whether it names the folder: a command that only reads the S3 passes.
PROTECTED_PATH = re.compile(r"(^|/)governance/S3/", re.IGNORECASE)
S3_FOLDER = "governance/s3"
# F's superseding Phase 3 export, taken in before a seal (2.8.2): tools/anchor-s3.py --revision places it in
# governance/S3/v1.<n>/ and tags it s3-anchor-v1.<n>, n one past the last such tag.
REVISION_FOLDER = re.compile(r"^governance/S3/v1\.(\d+)/")
REVISION_TAG = re.compile(r"^s3-anchor-v1\.(\d+)$")
# The owner's hand-made tags, each placed with the owner's receipts when a store is declared (RD-28): what it does.
OWNER_TAGS = {"closed-by-owner": "closes round",
              "owner-round": "orders one more K7 fix round and re-check after round"}

SHELL_TOOLS = ("Bash", "PowerShell", "Monitor", "mcp__terminal__run_in_terminal")


def next_revision(anchors: list[str]) -> int:
    """The next S3 revision's number: 1 while only s3-anchor-v1.0 is tagged, then one past the last s3-anchor-v1.<n>."""
    return 1 + max((int(m.group(1)) for m in map(REVISION_TAG.match, anchors) if m), default=0)


def seal_context(root: Path) -> tuple[str, set[str]]:
    """(latest seal tag, files it froze). ("", set()) before the first seal."""
    tags = git(root, "tag", "-l", "seal-*", "--sort=-v:refname").splitlines()
    if not tags:
        return "", set()
    tag = tags[0]
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from reopen import reopen_record
    if reopen_record(root, tag):
        return tag, set()       # reopened by an owner ruling until the next seal (tools/reopen.py)
    try:
        cfg = json.loads((root / ".metaframework" / "project.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        cfg = {}   # fall back to the defaults below rather than failing open
    globs = cfg.get("sealed_globs") or [cfg.get("source_glob") or "src/**", "tests/**"]
    rx = [glob_to_regex(g) for g in globs]
    files = git(root, "ls-tree", "-r", "--name-only", tag).splitlines()
    return tag, {f for f in files if any(r.match(f) for r in rx)}


def writes_s3(t) -> bool:
    """Does this write reach the frozen S3: a path inside it, or (2.6.21) a folder above it removed or overwritten?"""
    return bool(PROTECTED_PATH.search(t.rel)) or (t.tree and reach().under(S3_FOLDER, t.rel.lower()))


def sealed_hit(written: list, sealed: set[str]) -> tuple:
    """(the first sealed file a write reaches, that write), or ('', None). A folder reaches every file beneath it."""
    for t in written:
        hit = t.rel if t.rel in sealed else ""
        if t.tree and not hit:
            hit = next((s for s in sorted(sealed) if t.covers(s)), "")
        if hit:
            return hit, t
    return "", None


def frozen_shell_write(root: Path, cwd: Path, payload: dict, seal: str, sealed: set[str]) -> str:
    """'' unless a shell command writes, moves or removes a file in the frozen S3 or one sealed at `seal`. Read by
    target (2.6.18): copying a frozen file elsewhere, diffing it or reading it passes; and by where it lands
    (2.6.21). A tripwire for the sealed library; the authoritative checks are the commit's (tools/precommit.py) and
    seal.py verify."""
    written = reach().frozen_writes(root, cwd, payload)
    s3 = next((t for t in written if writes_s3(t)), None)
    if s3:
        return ("this command writes inside governance/S3/, which is frozen at the anchor. Supersede, never edit."
                + reach().folder_note(s3, "governance/S3"))
    hit, t = sealed_hit(written, sealed)
    return (f"this command writes, moves or removes {hit}, sealed at {seal}. The library is read-only."
            + reach().folder_note(t, hit) if hit else "")


def phase(root: Path) -> str:
    try:
        return str(json.loads((root / "STATE.json").read_text(encoding="utf-8")).get("phase", 4))
    except (OSError, json.JSONDecodeError):
        return "4"          # unknown phase -> the stricter Phase 4 merge rule


def rel_to(root: Path, p: str, cwd: Path) -> str:
    """`p` relative to the repo root. A relative `p` is resolved against the session's cwd,
    which is where the tool will act, not against the root (PipelineGate GOV-6)."""
    q = Path(p)
    try:
        return (q if q.is_absolute() else (cwd / q)).resolve().relative_to(root).as_posix()
    except ValueError:
        return q.as_posix()


def repo_and_cwd(payload: dict) -> tuple[Path, Path]:
    """(the repo this gate guards, the session's cwd). The repo is the checkout this file lives in, which the hook
    names as "$CLAUDE_PROJECT_DIR/tools/gate.py". The cwd follows any `cd`: read as the root, a session in ui/
    would find no seal and no project.json, and the gate would freeze nothing. It only resolves relative paths.
    The terminal tool carries its own folder (tool_input.cwd), relative to the session's."""
    root = Path(__file__).resolve().parents[1]
    here = Path(payload.get("cwd") or root)
    tcwd = (payload.get("tool_input") or {}).get("cwd")
    return root, (here / tcwd if isinstance(tcwd, str) and tcwd else here).resolve()


def merge_ref(cmd: str) -> str | None:
    """The single branch/commit named by `git merge`, or None if not exactly one."""
    m = re.search(reach().GIT + r"merge\b([^\n;&|]*)", cmd)
    if not m:
        return None
    toks, skip = [], False
    # A quoted message is one word (2.8.0): split on blanks, `-m "seal-1: merge phase4"` named three branches.
    for t in re.findall(reach().TOKEN, m.group(2)):
        if skip:
            skip = False; continue
        if t in ("-m", "--message", "-s", "-X", "--strategy", "--strategy-option", "-F", "--file"):
            skip = True; continue
        if t.startswith("-"):
            continue
        toks.append(t.strip("'\""))
    return toks[0] if len(toks) == 1 else None


AMBIENT = [
    (r"process\.env\b", "hand the value in at construction"),
    (r"\bos\.environ\b", "hand the value in at construction"),
    (r"\bDate\.now\(|new Date\(\)", "inject a clock provider"),
    (r"\bdatetime\.now\(|\btime\.time\(", "inject a clock provider"),
    (r"\bMath\.random\(|\brandom\.(random|randint|choice)\(", "inject an id provider"),
    (r"\bglobalThis\b|\bwindow\.|\bdocument\.", "the library is not the browser"),
    (r"\bgetInstance\(\)", "inject the instance"),
]


def object_standard(root: Path) -> tuple[dict, str]:
    try:
        cfg = json.loads((root / ".metaframework" / "project.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}, "src/**"
    return cfg.get("object_standard") or {}, cfg.get("source_glob") or "src/**"


def ambient_exempt(std: dict, rel: str) -> bool:
    """OS-2 does not reach this file: the clock provider, or a path the object standard allows."""
    provider = std.get("provider_glob", "**/*provider*")
    if provider and glob_to_regex(provider).match(rel.lower()):
        return True            # the clock provider is where reading the clock belongs
    allow = std.get("allow") or {}
    return any(rel.startswith(k) and "OS-2" in vals for k, vals in allow.items())


def ambient_patterns(std: dict) -> list:
    """(pattern, fix) pairs: the object standard's own ambient_patterns, else AMBIENT."""
    declared = std.get("ambient_patterns")
    return [(p, f) for p, f, *_ in declared] if declared else AMBIENT


def ambient_hit(root: Path, rel: str, content: str) -> tuple[str, str] | None:
    """OS-2: a library source file's code may not reach outside the object's declared inputs. Its comments and
    docstrings are not code (2.6.24, as phase4-checks.py reads them)."""
    std, glob = object_standard(root)
    if std.get("skip") or not content or not glob_to_regex(glob).match(rel):
        return None
    if ambient_exempt(std, rel):
        return None
    code = code_only(rel, content)
    for pat, fix in ambient_patterns(std):
        if re.search(pat, code):
            return pat, fix
    if not rel.endswith(".php") or std.get("ambient_patterns"):
        return None
    hit = php_support().ambient(content)
    return (hit[0], hit[2]) if hit else None


def decide(allow: bool, reason: str = "") -> int:
    if allow:
        return 0
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": reason}}))
    print(f"gate: DENIED — {reason}", file=sys.stderr)
    return 2


def git(root: Path, *a: str) -> str:
    try:
        r = subprocess.run(["git", "-C", str(root), *a],
                           capture_output=True, encoding="utf-8", errors="replace", timeout=15)
        return r.stdout.strip() if r.returncode == 0 else ""
    except (OSError, subprocess.SubprocessError):
        return ""


def load_verdict(root: Path, n: str) -> dict | None:
    try:
        return json.loads((root / "INSTRUMENTS" / f"k7-verdict-{n}.json")
                          .read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def check_owner_close(root: Path, n: str, tag: str = "closed-by-owner") -> str:
    """RD-28: '' when the owner's receipts exist for round n's modules (or no store is declared), else the reason.
    `tag` is the owner's tag being placed: closed-by-owner, or (2.6.21) owner-round."""
    try:
        cfg = json.loads((root / ".metaframework" / "project.json").read_bytes().decode("utf-8"))
    except (OSError, ValueError):
        return ""
    if not cfg.get("pipelinegate_command"):
        return ""                                    # credited review from verdict files alone (RD-27)
    vf = root / "INSTRUMENTS" / f"k7-verdict-{n}.json"
    if not vf.is_file():
        return f"{tag}-{n} {OWNER_TAGS[tag]} {n}, and INSTRUMENTS/k7-verdict-{n}.json does not exist."
    tools = Path(__file__).resolve().parent
    sys.path.insert(0, str(tools))
    try:
        missing = owner_unaccepted(root, cfg, vf)
    except Exception as exc:                         # fail closed: a close the gate cannot check is not a close
        return f"cannot read the owner's receipts for round {n} ({exc}); failing closed."
    if missing:
        return (f"{tag}-{n}: no owner ACCEPT receipt at owner-triage for the current content of "
                f"{', '.join(missing)}. On the owner's word: python tools/receipts.py owner-close --round {n} "
                f"--person <the owner's principal>; then tag.")
    return ""


def owner_unaccepted(root: Path, cfg: dict, vf: Path) -> list[str]:
    """The modules the round in `vf` reviewed whose current content has no owner ACCEPT at owner-triage."""
    import manifests
    import receipts
    reviewed = json.loads(vf.read_bytes().decode("utf-8")).get("reviewed") or {}
    built = manifests.build(root, cfg)
    mods = [s["module"] for s in reviewed.get("scope", [])] or [x for x in reviewed.get("modules", []) if x in built]
    return [x for x in mods if x in built and
            receipts.standing(root, cfg, receipts.h_of(built[x]["manifest"]), "owner-triage") != "ACCEPT"]


def check_verdict(root: Path, n: str, tree: str, what: str) -> str:
    """Return an empty string if the verdict authorises `what`, else the reason."""
    v = load_verdict(root, n)
    if v is None:
        return (f"{what} requires INSTRUMENTS/k7-verdict-{n}.json; it is absent or "
                f"unparseable. Run tools/k7-run.py first.")
    got = (v.get("reviewed") or {}).get("tree_sha", "")
    if got != tree:
        return (f"{what}: verdict {n} reviewed tree {got[:12] or '(none)'} but the "
                f"tree here is {tree[:12]}. Re-run K7 against this tree.")
    return verdict_passes(v, n, what)


def verdict_passes(v: dict, n: str, what: str) -> str:
    """'' when verdict n, which reviewed this tree, is a PASS at or above the drift floor with no structure
    violations; else the reason."""
    if v.get("verdict") != "PASS":
        return f"{what}: verdict {n} is {v.get('verdict')}, not PASS."
    score = (v.get("drift_score") or {}).get("value")
    if not isinstance(score, int) or score < DRIFT_FLOOR:
        return (f"{what}: drift score {score} is below {DRIFT_FLOOR}. "
                f"The drift-teeth rule blocks new work.")
    if (v.get("preflight") or {}).get("structure_check", {}).get("status") != "pass":
        return f"{what}: verdict {n} carries structure violations."
    return ""


FILE_KEYS = ("file_path", "notebook_path", "path")


def s3_file_reason(tool: str, ti: dict) -> str:
    """Rule 1, the file tools: '' unless the call names a path inside the frozen S3, or writes naming no path."""
    for key in FILE_KEYS:
        p = ti.get(key)
        if isinstance(p, str) and PROTECTED_PATH.search(p.replace("\\", "/")):
            return f"{p} is inside the frozen S3 anchor. Supersede via F-supersession-proposals, never edit."
    if tool in ("Write", "Edit", "NotebookEdit") and not any(isinstance(ti.get(k), str) for k in FILE_KEYS):
        return f"{tool} carried no readable path; failing closed rather than assuming it is outside the S3."
    return ""


def sealed_file_reason(root: Path, cwd: Path, ti: dict, seal: str, sealed: set[str]) -> str:
    """Rule 4, the file tools: '' unless the call names a file sealed at `seal`."""
    if not sealed:
        return ""
    for key in FILE_KEYS:
        p = ti.get(key)
        if isinstance(p, str) and rel_to(root, p, cwd) in sealed:
            return (f"{p} is sealed at {seal}. The library is read-only; new capability arrives as new files through "
                    f"an extension run (tools/seal.py begin-extension).")
    return ""


def written(ti: dict) -> tuple[str, object]:
    """(the text a file tool writes, the path it names)."""
    body = " ".join(str(ti.get(k, "")) for k in ("content", "new_string", "new_str", "new_source"))
    return body, ti.get("file_path") or ti.get("notebook_path") or ti.get("path") or ""


def os1_hits(root: Path, rel: str, body: str) -> list:
    """OS-1's findings in what a write puts in a library source file the object standard does not exempt."""
    std, glob = object_standard(root)
    if not body or std.get("skip") or not glob_to_regex(glob).match(rel):
        return []
    if any(rel.startswith(k) and "OS-1" in val for k, val in (std.get("allow") or {}).items()):
        return []
    return os1_findings(rel, body)


def object_standard_reason(root: Path, cwd: Path, tool: str, ti: dict) -> str:
    """Rule 6, at the moment of the write: '' unless it brings an undeclared input (OS-1) or an ambient read
    (OS-2) into a library source file."""
    if tool not in ("Write", "Edit", "MultiEdit", "NotebookEdit"):
        return ""
    body, path_in = written(ti)
    if not isinstance(path_in, str) or not path_in:
        return ""
    rel = rel_to(root, path_in, cwd)
    found = os1_hits(root, rel, body)
    if found:
        rule, line, detail = found[0]
        return (f"{rule} at line {line}: {detail}. Everything a class uses arrives through its own declaration — "
                f"see governance/Object_Writing_Standard.md (OS-1).")
    hit = ambient_hit(root, rel, body)
    if hit:
        return (f"this write reaches outside the object's declared inputs (/{hit[0]}/ — OS-2): {hit[1]}. Everything "
                f"a class needs arrives at construction; see governance/Object_Writing_Standard.md.")
    return ""


def hand_seal_reason(norm: str) -> str:
    """Rule 5: seals are made by the tool, not by hand."""
    tag = reach().GIT + r"tag"
    if re.search(tag + r"\b[^\n;&|]*\bseal-\d", norm) and not re.search(tag + r"\s+(-l|--list)\b", norm):
        return ("seal tags are made by `python3 tools/seal.py apply --approved-by ...`, which runs the sweep and "
                "writes the seal record first.")
    return ""


def tag_after(root: Path, commit: str, *patterns: str) -> bool:
    """Does a tag matching one of `patterns` sit at or after `commit`?"""
    tags = git(root, "tag", "-l", *patterns).splitlines()
    return bool(commit) and any(subprocess.run(["git", "-C", str(root), "merge-base", "--is-ancestor", commit, t],
                                               capture_output=True).returncode == 0 for t in tags)


def closed_after(root: Path, commit: str) -> bool:
    """Does a closing tag (k7-pass, closed-by-owner, seal) sit at or after `commit`?"""
    return tag_after(root, commit, "k7-pass-*", "closed-by-owner*", "seal-*")


def is_the_seal(root: Path, ref: str, seal: str) -> bool:
    """Is `ref` the commit the latest seal tag sits on? Merging it into main is the close's own merge (2.8.0). The
    receiving branch's STATE.json still says phase 4 until the merge lands, and its newest K7 round is one the seal
    already closed on the build's branch (LedgerCore V2, 31 Oct 2026: the seal-to-main merge had no passing route)."""
    at = git(root, "rev-parse", "--verify", "--quiet", f"{ref}^{{commit}}")
    return bool(at) and at == git(root, "rev-parse", "--verify", "--quiet", f"{seal}^{{commit}}")


def merge_judgement(root: Path, norm: str, tree: str, seal: str, sealed: set[str]) -> tuple[bool, str]:
    """Rule 3: after a seal the merged branch leaves the sealed files alone, which in Phase 5 is the whole rule;
    otherwise (RD-32, 2.7.0) the newest K7 round must not block: a PASS at or above the drift floor, or closed."""
    if seal:
        ref = merge_ref(norm)
        if ref is None:
            return False, f"after {seal}, merge exactly one named branch so the seal can be checked against it."
        touched = sorted(set(git(root, "diff", "--name-only", seal, ref).splitlines()) & sealed)
        if touched:
            return False, f"{ref} changes files sealed at {seal}: {', '.join(touched[:5])}. Not mergeable."
        if phase(root) == "5" or is_the_seal(root, ref, seal):
            return True, ""     # Phase 5, or the sealed build merged into main: an intact seal is the whole rule
    reason = newest_round_reason(root)
    return not reason, reason


def newest_held_round(root: Path) -> tuple[int, dict | None] | None:
    """(round, verdict) of the newest K7 round that can hold a merge, or None. A foundation checkpoint holds none
    (2.8.0): it gets one fix pass, with no re-check and no triage. An unparseable verdict is returned as None, and
    the merge fails closed on it."""
    vs = sorted((int(x.stem.rsplit("-", 1)[1])
                 for x in (root / "INSTRUMENTS").glob("k7-verdict-*.json")
                 if x.stem.rsplit("-", 1)[1].isdigit()), reverse=True)
    for n in vs:
        v = load_verdict(root, str(n))
        if v is None or (v.get("reviewed") or {}).get("kind") != "checkpoint":
            return n, v
    return None


def newest_round_reason(root: Path) -> str:
    """RD-32 (2.7.0) and the close (2.8.0): '' unless the newest K7 round blocks new work: not a PASS at or above the
    drift floor, no closing tag (the seal among them) and no owner order at or after the commit it reviewed. A step
    closes on the gates, so before any round nothing blocks, and a checkpoint blocks nothing."""
    held = newest_held_round(root)
    if held is None:
        return ""
    n, v = held
    if v is None:
        return f"merge: INSTRUMENTS/k7-verdict-{n}.json is unparseable; failing closed."
    reason = verdict_passes(v, str(n), "merge")
    commit = (v.get("reviewed") or {}).get("commit_sha", "")
    if not reason or closed_after(root, commit) or tag_after(root, commit, "owner-round-*"):
        return ""
    return (f"{reason} Nothing is worked between the final review and the seal unless the owner orders it: its "
            f"findings go to Phase 5 (ui/gaps.md). Run seal.py check through tools/run.py and take the sweep to the "
            f"owner; the owner's one approval (seal.py apply) closes the review, seals the library and merges phase4 "
            f"into main.")


def owner_round_reason(root: Path, norm: str) -> str:
    """2.6.21: a hand-made owner-round tag is the owner's order for one more K7 fix round and re-check. It names the
    round the owner triaged, owner-round-<n>, and is placed as closed-by-owner is: with a receipts store, only on the
    owner's receipt. Read in each command of the line, however git is spelled (git -C <repo> tag)."""
    tag = reach().GIT + r"tag\b"
    for seg in reach().segments(norm):
        m = re.search(tag + r"[^\n;&|]*?\bowner-round\b(-\d+\b)?", seg)
        if not m or re.search(tag + r"\s*(?:-l|--list|-d|--delete)\b", seg):
            continue
        reason = check_owner_close(root, m.group(2)[1:], "owner-round") if m.group(2) else (
            "an owner's order for one more K7 round is tagged owner-round-<n>, n the round the owner triaged (RD-9); "
            "tag it so.")
        if reason:
            return reason
    return ""


def git_judgement(root: Path, norm: str, tree: str, seal: str, sealed: set[str]) -> tuple[bool, str]:
    """Rules 2 and 3 and RD-28: a k7-pass tag, a closed-by-owner or (2.6.21) owner-round tag, a merge. git is read
    with its options (2.7.0: git -C <repo> tag)."""
    tag = reach().GIT + r"tag"
    m = re.search(tag + r"\b[^\n;&|]*?\bk7-pass-(\d+)\b", norm)
    if m:
        reason = check_verdict(root, m.group(2), tree, f"tagging k7-pass-{m.group(2)}")
        return not reason, reason
    # RD-28: an owner's close is a receipt. With a PipelineGate store declared, `closed-by-owner-N` needs the owner's
    # ACCEPT at owner-triage on the current content of every module in round N's scope.
    m = re.search(tag + r"\b[^\n;&|]*?\bclosed-by-owner-(\d+)\b", norm)
    if m and not re.search(tag + r"\s+(-l|--list|-d|--delete)\b", norm):
        reason = check_owner_close(root, m.group(2))
        if reason:
            return False, reason
    reason = owner_round_reason(root, norm)
    if reason:
        return False, reason
    if re.search(reach().GIT + r"merge\b", norm) and not re.search(r"--abort|--continue", norm):
        return merge_judgement(root, norm, tree, seal, sealed)
    return True, ""


def shell_judgement(root: Path, cwd: Path, payload: dict, seal: str, sealed: set[str]) -> tuple[bool, str]:
    """A shell command: rules 1 and 4 by what it writes, moves or removes, then 5, then its tags and merges."""
    tool, ti = payload.get("tool_name", ""), payload.get("tool_input") or {}
    cmd = ti.get("command", "")
    if not isinstance(cmd, str):
        return False, f"{tool} call carried no readable command; failing closed."
    norm = reach().git_spelled(cmd.replace("\\", "/"))        # git.exe, Git: one spelling for every rule (2.7.0)
    reason = frozen_shell_write(root, cwd, payload, seal, sealed) or hand_seal_reason(norm)
    if reason:
        return False, reason
    tree = git(root, "rev-parse", "HEAD^{tree}")
    if tree:
        return git_judgement(root, norm, tree, seal, sealed)
    # Only gate git operations; a repo we cannot read cannot be tagged either.
    if re.search(reach().GIT + r"(tag|merge)\b", norm):
        return False, "cannot resolve HEAD tree to validate this operation; failing closed."
    return True, ""


def judge(payload: dict) -> tuple[bool, str]:
    """(allow, reason) for one tool call. The rules run in a fixed order and the first refusal is the reason."""
    tool = payload.get("tool_name", "")
    ti = payload.get("tool_input") or {}
    root, cwd = repo_and_cwd(payload)
    if not tool:
        return False, ("hook payload carried no tool_name; the gate cannot tell what it is being asked to allow. "
                       "Failing closed.")
    # 7 and 8, the 2.6.17 reach rules, the commit checks among them (tools/gate_reach.py); then 1, the file tools.
    reason = reach().check(root, cwd, payload, glob_to_regex(object_standard(root)[1]), phase(root)) \
        or s3_file_reason(tool, ti)
    if reason:
        return False, reason
    seal, sealed = seal_context(root)
    # 4 and 6, the file tools: the sealed library, then the object standard at the moment of the write.
    reason = sealed_file_reason(root, cwd, ti, seal, sealed) or object_standard_reason(root, cwd, tool, ti)
    if reason:
        return False, reason
    if tool not in SHELL_TOOLS:
        return True, ""
    return shell_judgement(root, cwd, payload, seal, sealed)


def read_payload() -> dict:
    """The hook payload. Claude Code writes it as UTF-8; read as text, Windows decoded it in the locale's code page and
    an Edit holding ρ failed closed (2.7.0)."""
    return json.loads(sys.stdin.buffer.read().decode("utf-8"))


def main() -> int:
    try:
        payload = read_payload()
    except (ValueError, OSError) as e:
        return decide(False, f"gate could not read its own input ({e}); failing closed")
    return decide(*judge(payload))


if __name__ == "__main__":
    # Claude Code (and the plugin's router) read a hook's output as UTF-8; on Windows the console code page would
    # turn the dash in a reason into "?" (2.6.18).
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    try:
        sys.exit(main())
    except Exception as e:                      # noqa: BLE001 - fail closed on anything
        print(f"gate: internal error ({e}); failing closed", file=sys.stderr)
        sys.exit(2)
