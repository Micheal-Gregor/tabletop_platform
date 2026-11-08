#!/usr/bin/env python3
"""
install-gates — put this checkout's commit checks in place, then show what is still missing (2.6.17).

Run it once per clone, at C4 before the first commit and after every fresh clone: git does not clone config, so
core.hooksPath has to be set again in each copy. It is the only thing in a session that sets core.hooksPath;
gate.py refuses any other change to it.

  0. write the git hooks                       each .githooks/ hook that is missing, or is not the one
                                               .metaframework/template-manifest.json records, is written from
                                               the text below, when that text is the one recorded (2.6.24). A
                                               session may not write .githooks/, so a release that adds a hook
                                               reached a build only by the owner's hand (LedgerCore V2 adopting
                                               2.6.21's pre-applypatch)
  1. git config core.hooksPath .githooks       every commit runs .githooks/pre-commit -> tools/precommit.py,
                                               every merge that commits runs .githooks/pre-merge-commit (2.6.18),
                                               and every patch git am applies runs .githooks/pre-applypatch
                                               (2.6.21). With extensions.worktreeConfig on, the worktree's own
                                               value is set too (2.6.21): an app-made worktree points it at the
                                               main checkout's hooks
     git config merge.ff false, pull.ff only   a merge always commits, so pre-merge-commit runs (2.6.21)
  2. make the hooks executable                off Windows, git skips a hook that is not
  3. --code-gates PATH                         record where the oop-standards bundle's gates.cjs is on this
                                               machine, in .metaframework/local.json (not committed: the path
                                               is this machine's, and moves when the plug-in is updated)
  4. write the session profiles (2.7.0)        .claude/agents/builder.md, as the hooks are written (missing, or not
                                               the one the manifest records); and .claude/settings.local.json's
                                               enabledPlugins, every plugin installed on this machine off but
                                               metaframework and oop-standards (not committed: the list is this
                                               machine's). A session's builders inherit it, so each starts light
  5. print tools/gatecheck.py's result         exit 0 only when the install is complete

Usage:
    install-gates.py [--root .] [--code-gates <path to gates.cjs>]
Exit: 0 installed and complete, 1 installed but problems remain (listed), 2 bad invocation.
"""

import argparse
import hashlib
import json
import os
import stat
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from basis import file_sha256                                                       # noqa: E402
from gatecheck import (BUILDER_PROFILE, COORDINATOR_PROFILE, GIT_HOOKS, LOCAL, MERGE_SETTINGS,   # noqa: E402
                       coordinator_settings, local_settings, problems, read_json, recorded_manifest)

# The git hooks as the repo template ships them in .githooks/ (2.6.24): each one's own heading, then the body they
# share. tests/test_install_gates.py holds every one to the template's file, byte for byte.
HOOK_HEADS = {
    "pre-commit": ("commit", "# MetaFramework pre-commit (2.6.17): every commit, from any session or any shell, runs "
                   "tools/precommit.py.\n# tools/install-gates.py points git here (core.hooksPath = .githooks); "
                   "phase4-checks.py gates checks it is.\n# Fails closed: a python3 that cannot start refuses the "
                   "commit rather than skipping the checks.\n"),
    "pre-merge-commit": ("merge", "# MetaFramework pre-merge-commit (2.6.18): a merge that makes a commit runs the "
                         "same checks as any other commit.\n# git runs this for a merge it can commit by itself; a "
                         "conflicted merge is finished with `git commit`, which runs\n# pre-commit. Same script, same "
                         "tools/precommit.py, checking the merge's own snapshot. Fails closed.\n"),
    "pre-applypatch": ("patch", "# MetaFramework pre-applypatch (2.6.21): a patch `git am` applies runs the same "
                       "checks as any other commit.\n# git am writes the patch into the index before it runs this "
                       "hook, and commits it only when the hook exits 0, so\n# tools/precommit.py checks the patch's "
                       "own snapshot, as pre-commit checks a commit's. Fails closed.\n"),
}
HOOK_BODY = ('root=$(git rev-parse --show-toplevel) || exit 1\n'
             'if ! command -v python3 >/dev/null 2>&1; then\n'
             '  echo "{name}: python3 is not on the PATH, so the commit checks cannot run; {what} refused" >&2\n'
             '  exit 1\n'
             'fi\n'
             'exec python3 "$root/tools/precommit.py" --root "$root"\n')


# The builder profile as the repo template ships it in .claude/agents/builder.md (2.7.0): only the tools a builder
# uses, no Skill, no MCP, and no model line, so a builder runs on the lead's choice (the owner: "No model, queue
# roles"). tests/test_session_profiles.py holds it to the template's file, byte for byte.
BUILDER_TEXT = """\
---
name: builder
description: A MetaFramework Phase 4 builder. Builds one module from the brief tools/brief.py writes, passed whole by the lead as this agent's prompt. Starts with only the tools a builder uses (2.7.0). Never a reviewer; K7 runs through tools/k7-run.py.
tools: Read, Write, Edit, Grep, Glob, Bash, PowerShell
disallowedTools: mcp__*
---

You build one module of a governed MetaFramework Phase 4 build. Your prompt is your brief, written by tools/brief.py:
follow it as written. Your first tool call is the gate probe it names. Report in about 20 lines.
"""


def hook_text(name: str) -> str:
    """The template's .githooks/<name>, as this file carries it."""
    what, head = HOOK_HEADS[name]
    return "#!/bin/sh\n" + head + HOOK_BODY.format(name=name, what=what)


def place(root: Path, rel: str, text: str, want: str, what: str) -> str:
    """'' once `rel` is the file the manifest records (`want`), writing `text` if it was not; else why not."""
    if not want or file_sha256(root / rel) == want:
        return ""
    if hashlib.sha256(text.encode("utf-8")).hexdigest() != want:
        return (f"{what}_not_placed: {rel}: the copy this tools/install-gates.py carries is not the one "
                f".metaframework/template-manifest.json records; copy both from the same release")
    (root / rel).parent.mkdir(parents=True, exist_ok=True)
    (root / rel).write_bytes(text.encode("utf-8"))
    print(f"  wrote {rel}")
    return ""


def place_hooks(root: Path) -> list[str]:
    """Each git hook, and (2.7.0) the builder profile, made the template's where the manifest records one; what could
    not be placed."""
    recorded = recorded_manifest(root) or {}
    placed = [place(root, f".githooks/{n}", hook_text(n), recorded.get(f".githooks/{n}", ""), "hook") for n in GIT_HOOKS]
    placed.append(place(root, BUILDER_PROFILE, BUILDER_TEXT, recorded.get(BUILDER_PROFILE, ""), "profile"))
    return [r for r in placed if r]


def write_coordinator_profile(root: Path) -> None:
    """.claude/settings.local.json's enabledPlugins as a build runs them (2.7.0); the file's other settings kept."""
    want = coordinator_settings()
    path = root / COORDINATOR_PROFILE
    settings = read_json(path)
    if not want or settings.get("enabledPlugins") == want:
        return
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps({**settings, "enabledPlugins": want}, indent=2) + "\n", encoding="utf-8")
    print(f"  wrote {COORDINATOR_PROFILE}: {sum(not on for on in want.values())} plugin(s) off, "
          f"{sum(want.values())} on")


def record_code_gates(root: Path, cli: str) -> str:
    """'' once the gates.cjs path is recorded in .metaframework/local.json, else why not."""
    path = Path(cli).expanduser().resolve()
    if not path.is_file() or path.name != "gates.cjs":
        return f"{cli} is not a gates.cjs file"
    settings = {**local_settings(root), "code_gates_cli": str(path)}
    (root / LOCAL).write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")
    return ""


def git_config_set(root: Path, *args: str) -> None:
    subprocess.run(["git", "-C", str(root), "config", *args], check=True)


def worktree_config_on(root: Path) -> bool:
    """Is extensions.worktreeConfig on, so that a worktree's own config.worktree overrides the shared config?"""
    r = subprocess.run(["git", "-C", str(root), "config", "--type=bool", "--get", "extensions.worktreeConfig"],
                       capture_output=True, encoding="utf-8", errors="replace")
    return r.stdout.strip() == "true"


def point_git_at_hooks(root: Path) -> None:
    """core.hooksPath to .githooks, and the hooks executable (off Windows git skips one that is not)."""
    git_config_set(root, "core.hooksPath", ".githooks")
    if worktree_config_on(root):            # an app-made worktree's own absolute value would win (2.6.21)
        git_config_set(root, "--worktree", "core.hooksPath", ".githooks")
    for key, value in MERGE_SETTINGS:       # no fast-forward merge: every merge commits, so its hook runs (2.6.21)
        git_config_set(root, key, value)
    for hook in (root / ".githooks" / name for name in GIT_HOOKS):
        if hook.is_file() and os.name != "nt":
            hook.chmod(hook.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)


def report(root: Path, unplaced: list[str]) -> int:
    found = problems(root)
    for line in unplaced:
        print(f"  {line}")
    for p in found:
        print(f"  {p['rule']}: {p['file'] + ': ' if p['file'] else ''}{p['detail']}")
    print("install-gates: complete" if not found else f"install-gates: {len(found)} problem(s) remain")
    return 1 if found else 0


def main() -> int:
    ap = argparse.ArgumentParser(description="install this checkout's commit checks")
    ap.add_argument("--root", default=".")
    ap.add_argument("--code-gates", default="", help="path to the oop-standards bundle's code-gates gates.cjs")
    args = ap.parse_args()
    root = Path(args.root).resolve()
    if not (root / ".git").exists():
        print(f"install-gates: {root} is not a git checkout", file=sys.stderr)
        return 2
    unplaced = place_hooks(root)
    point_git_at_hooks(root)
    write_coordinator_profile(root)
    refused = record_code_gates(root, args.code_gates) if args.code_gates else ""
    if refused:
        print(f"install-gates: {refused}", file=sys.stderr)
        return 2
    return report(root, unplaced)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")      # every tool writes UTF-8 (2.8.0)
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
