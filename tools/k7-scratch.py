#!/usr/bin/env python3
"""
k7-scratch — the K7 reviewer's only shell (RD-29).

For each round, k7-run.py makes a throwaway git worktree of the reviewed commit at .k7/wt. It grants the reviewer Write
and Edit there, and this tool as its whole shell. Every verb runs inside that worktree, never in the repository:

  suite             the declared full suite (test_command)
  select <name>     one named test (test_select, with {test_name} substituted)
  rederive          the declared re-derive-all (rederive_all)
  reset             restore the worktree to the reviewed commit, after a mutation experiment
  status            what is mutated in the worktree right now

The declared commands are the project's own (.metaframework/project.json), so nothing here is inferred. suite and
rederive run as seal.py runs them (through the shell; their text is declared, with no reviewer input). select splits the
declared command and puts the test name in as one argument, never through a shell, so a name cannot become a command.

Usage:
    k7-scratch.py suite | select <name> | rederive | reset | status
Exit: the command's own exit code; 2 on usage, an undeclared command, or no worktree.
"""

import json
import re
import shlex
import shutil
import subprocess
import sys
from pathlib import Path

def repository_root() -> Path:
    """The repository whose round worktree this tool acts on. The worktree at .k7/wt holds its own copy of this tool,
    which a reviewer whose shell has moved into the worktree runs instead (PipelineGate GOV-18; the plugin's frame-gate
    findings log, row 28). Its folder is a worktree (`.git` is a file there), so that copy finds the repository through
    git's common directory and acts on the same worktree as the repository's own copy."""
    here = Path(__file__).resolve().parents[1]
    if (here / ".git").is_dir():
        return here
    common = subprocess.run(["git", "-C", str(here), "rev-parse", "--path-format=absolute", "--git-common-dir"],
                            capture_output=True, text=True)
    found = common.stdout.strip()
    return Path(found).resolve().parent if common.returncode == 0 and found else here


ROOT = repository_root()
WT = ROOT / ".k7" / "wt"
# A test name as S3 §5 writes one: words, ids, punctuation that reads as text. Nothing a shell or an option parser acts on.
NAME = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9 _.:/#,()'\[\]-]*$")


def die(msg: str) -> int:
    print(f"k7-scratch: {msg}", file=sys.stderr)
    return 2


def declared(key: str) -> str:
    try:
        cfg = json.loads((ROOT / ".metaframework" / "project.json").read_bytes())
    except (OSError, json.JSONDecodeError):
        return ""
    return cfg.get(key) or ""


def git_wt(*a: str) -> int:
    return subprocess.run(["git", "-C", str(WT), *a]).returncode


def run_declared(key: str) -> int:
    """suite and rederive: the declared command, through the shell as seal.py runs it."""
    cmd = declared(key)
    if not cmd:
        return die(f"{key} is not declared in .metaframework/project.json")
    return subprocess.run(cmd, shell=True, cwd=str(WT)).returncode


def suite(rest: list[str]) -> int:
    return run_declared("test_command")


def rederive(rest: list[str]) -> int:
    return run_declared("rederive_all")


def select(rest: list[str]) -> int:
    """One named test: the declared command split, the name put in as one argument, never through a shell."""
    if len(rest) != 1 or not NAME.match(rest[0]):
        return die("select takes one test name: letters, digits, spaces and the punctuation a test name uses")
    tpl = declared("test_select")
    if not tpl or "{test_name}" not in tpl:
        return die("test_select is not declared with a {test_name} placeholder in .metaframework/project.json")
    args = [t.replace("{test_name}", rest[0]) for t in shlex.split(tpl)]
    exe = shutil.which(args[0]) or args[0]                 # npx is npx.cmd on Windows
    return subprocess.run([exe, *args[1:]], cwd=str(WT)).returncode


def reset(rest: list[str]) -> int:
    if git_wt("reset", "--hard", "-q") != 0:
        return 1
    return git_wt("clean", "-fdq")


def status(rest: list[str]) -> int:
    print(f"(paths relative to the worktree {WT.relative_to(ROOT).as_posix()}, not the repository)", flush=True)
    return git_wt("status", "--porcelain")


VERBS = {"suite": suite, "select": select, "rederive": rederive, "reset": reset, "status": status}


def main() -> int:
    argv = sys.argv[1:]
    if not argv or argv[0] not in VERBS:
        return die("usage: k7-scratch.py suite | select <name> | rederive | reset | status")
    if not (WT / ".git").exists():
        return die(f"no worktree at {WT}: k7-run.py makes one for each round and removes it after")
    sys.stdout.flush()
    return VERBS[argv[0]](argv[1:])


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")      # every tool writes UTF-8 (2.8.0)
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
