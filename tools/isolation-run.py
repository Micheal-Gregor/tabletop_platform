#!/usr/bin/env python3
"""
isolation-run — a Python build's OS-12 isolation tests, run with the environment cleared (2.6.21).

Windows has no `env -i`, so a Python build had nothing to declare as isolation_test_command: LedgerCore V2 wrote this
runner, and its restart had to bring it over by owner ruling. The template ships it, and the Python preset
(.metaframework/presets/python.json) declares it: "isolation_test_command": "python tools/isolation-run.py".

It runs with unittest every .py file the project's isolation test pattern names (object_standard's
isolation_test_pattern, {stem} read as any name; the built-in tests/**/*{stem}*.isolation.* when it is not set), in a
child Python started with -s (no user site-packages) whose environment holds only:

  PATH                     so the interpreter, and on Windows its DLLs, can be found
  SYSTEMROOT, TEMP, TMP    on Windows only: Python needs SYSTEMROOT to start, and tempfile needs TEMP to stay out of
                           the tree
  PYTHONHASHSEED=0         hash() and set order are the same on every run
  TZ=UTC0                  local time is UTC whatever the machine's zone (the C runtime reads TZ on Windows too)

Not -I: it would ignore PYTHONHASHSEED, and an environment built from nothing has no other PYTHON* variable to ignore.
The clock is not frozen, as V2's runner did not freeze it: a class that reads the clock instead of being handed one is
OS-2's finding, and its isolation test hands it a clock. Each test is imported by its dotted path from the repo root
(tests/test_ledger_isolation.py is tests.test_ledger_isolation), so it imports the library from the root
(from src.ledger import Ledger). A class that reaches for anything it was not handed fails here.

A TypeScript or PHP build names its own test runner after `--` (2.7.0), and it is started in DIR with the same
environment and nothing else. Their presets declared `env -i PATH="$PATH" …`, which cmd.exe does not have, and seal.py
runs the command through the shell, so the seal's isolation step failed on Windows. The program is found on the
cleared PATH, or under DIR when it names a folder (vendor/bin/phpunit), with the extensions Windows runs (npx.cmd).

Usage:
    isolation-run.py [--root DIR]                  DIR defaults to the checkout this file is in
    isolation-run.py [--root DIR] -- COMMAND ...   e.g. -- npx vitest run .isolation.
Exit: 0 every isolation test passed; 1 one failed or errored, or no file matches the pattern; 2 OS-12 is switched off
(isolation_test_pattern null), a matched file cannot be imported by name, or COMMAND cannot be found.
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from basis import project                      # noqa: E402
from source_scan import glob_to_regex          # noqa: E402 - the matcher OS-12's check uses

DEFAULT_PATTERN = "tests/**/*{stem}*.isolation.*"
KEEP = ("PATH",)
KEEP_ON_WINDOWS = ("SYSTEMROOT", "TEMP", "TMP")
FIXED = {"PYTHONHASHSEED": "0", "TZ": "UTC0"}


def pattern(cfg: dict) -> str:
    """The project's isolation test pattern with {stem} read as any name; '' when OS-12 is switched off."""
    pat = (cfg.get("object_standard") or {}).get("isolation_test_pattern", DEFAULT_PATTERN)
    return re.sub(r"\*{3,}", "*", pat.replace("{stem}", "*")) if pat else ""


def isolation_tests(root: Path, pat: str) -> list[str]:
    """The .py files under `root` that `pat` names, repo-relative, in order."""
    rx = glob_to_regex(pat)
    base = root / re.split(r"[*?]", pat)[0].rpartition("/")[0]
    found = (p.relative_to(root).as_posix() for p in base.rglob("*.py") if p.is_file())
    return sorted(rel for rel in found if rx.match(rel))


def module_name(rel: str) -> str:
    """tests/sub/test_x_isolation.py as tests.sub.test_x_isolation; '' when a part is not a Python name."""
    parts = rel.removesuffix(".py").split("/")
    return ".".join(parts) if all(p.isidentifier() for p in parts) else ""


def cleared_env() -> dict[str, str]:
    """The child's whole environment: what Python needs to start, then the fixed hash seed and zone."""
    keep = KEEP + (KEEP_ON_WINDOWS if os.name == "nt" else ())
    return {**{k: os.environ[k] for k in keep if k in os.environ}, **FIXED}


def described(env: dict[str, str]) -> str:
    return ", ".join(f"{k}={v}" if k in FIXED else k for k, v in env.items())


def run(root: Path, modules: list[str]) -> int:
    env = cleared_env()
    print(f"isolation-run: {len(modules)} isolation test file(s), the environment cleared to {described(env)}",
          flush=True)
    child = subprocess.run([sys.executable, "-s", "-m", "unittest", *modules], cwd=str(root), env=env)
    return 0 if child.returncode == 0 else 1


def run_command(root: Path, command: list[str]) -> int:
    """A build's own isolation command, started in `root` with the cleared environment (2.7.0)."""
    env = cleared_env()
    name = str(root / command[0]) if os.path.dirname(command[0]) else command[0]
    exe = shutil.which(name, path=env.get("PATH"))
    if not exe:
        print(f"isolation-run: {name} is not a program on the cleared PATH", file=sys.stderr)
        return 2
    print(f"isolation-run: {' '.join(command)}, the environment cleared to {described(env)}", flush=True)
    child = subprocess.run([exe, *command[1:]], cwd=str(root), env=env)
    return 0 if child.returncode == 0 else 1


def refusal(pat: str, files: list[str]) -> tuple[int, str]:
    """(exit code, why) when there is nothing this runner can run; (0, '') when there is."""
    if not pat:
        return 2, "object_standard.isolation_test_pattern is null, so OS-12 is switched off: nothing to run"
    unnamed = [f for f in files if not module_name(f)]
    if unnamed:
        return 2, (f"{', '.join(unnamed)} cannot be imported by name: name isolation tests as the Python preset "
                   "does, tests/**/test_{stem}_isolation.py")
    return (1, f"no .py file matches {pat}: OS-12 has nothing to prove") if not files else (0, "")


def main() -> int:
    argv = sys.argv[1:]
    cut = argv.index("--") if "--" in argv else len(argv)
    ap = argparse.ArgumentParser(description="a build's OS-12 isolation tests, with the environment cleared")
    ap.add_argument("--root", default=str(Path(__file__).resolve().parents[1]))
    root = Path(ap.parse_args(argv[:cut]).root).resolve()
    if cut < len(argv):
        return run_command(root, argv[cut + 1:]) if argv[cut + 1:] else ap.error("-- names no command")
    pat = pattern(project(root))
    files = isolation_tests(root, pat) if pat else []
    code, why = refusal(pat, files)
    if code:
        print(f"isolation-run: {why}", file=sys.stderr)
        return code
    return run(root, [module_name(f) for f in files])


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")      # every tool writes UTF-8 (2.8.0)
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
