#!/usr/bin/env python3
"""
structure-check — deterministic document-structure gate for the metaframework.

Classifies every tracked .md by role and enforces only the rules that apply to
that role. Emits the `preflight.structure_check` object required by
k7-verdict.schema.json.

Roles (configure in .metaframework/doc-roles.json; defaults below):
  resident  - always in context. Hard line cap. e.g. CLAUDE.md
  step      - loaded on demand, one at a time. Line cap acts as a split
              detector, and must declare exactly one acceptance test.
  ledger    - appended data, read by query. No cap.
  frozen    - read once at anchor, never resident. No cap.

A step declares its acceptance test with a single line:
    ACCEPT: <shell command>
Two ACCEPT lines means two steps. That is the real rule; the line cap is
just the cheap proxy that catches the gross cases.

Usage:
    structure-check.py [--root .] [--json]
Exit codes: 0 = pass, 1 = violations found, 2 = bad invocation.
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

RESIDENT_LINE_CAP = 200
STEP_LINE_CAP = 200

DEFAULT_ROLES = {
    "resident": ["**/CLAUDE.md"],
    "step":     ["**/steps/**/*.md"],
    "ledger":   ["**/INSTRUMENTS/*.md"],
    "frozen":   ["**/governance/**/*.md"],
}


def glob_to_regex(pattern: str) -> re.Pattern:
    """Translate a glob to a regex with correct ** semantics.

    fnmatch is unusable here: it maps * to .* (crossing separators) and gives
    ** no special meaning, so 'steps/**/*.md' silently fails to match
    'steps/ok.md'. Rules below:
        **/  -> zero or more directories
        **   -> anything, separators included
        *    -> anything except a separator
        ?    -> one character except a separator
    """
    out, i, n = [], 0, len(pattern)
    while i < n:
        c = pattern[i]
        if pattern.startswith("**/", i):
            out.append("(?:.*/)?")
            i += 3
        elif pattern.startswith("**", i):
            out.append(".*")
            i += 2
        elif c == "*":
            out.append("[^/]*")
            i += 1
        elif c == "?":
            out.append("[^/]")
            i += 1
        else:
            out.append(re.escape(c))
            i += 1
    return re.compile("^" + "".join(out) + "$")


def load_roles(root: Path) -> dict:
    cfg = root / ".metaframework" / "doc-roles.json"
    if cfg.is_file():
        try:
            return json.loads(cfg.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            print(f"structure-check: cannot read {cfg}: {exc}", file=sys.stderr)
            sys.exit(2)
    return DEFAULT_ROLES


def tracked_markdown(root: Path) -> list[str]:
    try:
        out = subprocess.run(
            ["git", "-C", str(root), "ls-files", "*.md"],
            capture_output=True, encoding="utf-8", errors="replace", check=True,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        print(f"structure-check: git ls-files failed: {exc}", file=sys.stderr)
        sys.exit(2)
    return [line for line in out.stdout.splitlines() if line.strip()]


def classify(path: str, roles: dict) -> str | None:
    for role, patterns in roles.items():
        if any(glob_to_regex(pat).match(path) for pat in patterns):
            return role
    return None


def resident_violations(rel: str, lines: list[str]) -> list[dict]:
    """A resident document's rule: the line cap."""
    n = len(lines)
    if n <= RESIDENT_LINE_CAP:
        return []
    return [{
        "file": rel,
        "rule": "resident_line_cap",
        "detail": f"{n} lines exceeds the {RESIDENT_LINE_CAP}-line cap for "
                  f"always-resident documents. Move non-contract content to a "
                  f"frozen or step document.",
    }]


def step_violations(rel: str, lines: list[str]) -> list[dict]:
    """A step document's rules: the line cap, and exactly one acceptance test."""
    violations: list[dict] = []
    n = len(lines)
    if n > STEP_LINE_CAP:
        violations.append({
            "file": rel,
            "rule": "step_line_cap",
            "detail": f"{n} lines exceeds {STEP_LINE_CAP}. Treat as evidence the "
                      f"step does more than one thing: split the step, not the file.",
        })

    accepts = [ln for ln in lines if ln.startswith("ACCEPT: ")]
    if not accepts:
        violations.append({
            "file": rel,
            "rule": "missing_acceptance_test",
            "detail": "No 'ACCEPT: <command>' line. A step with no mechanical "
                      "acceptance test cannot be verified and must not exist.",
        })
    elif len(accepts) > 1:
        violations.append({
            "file": rel,
            "rule": "single_acceptance_test",
            "detail": f"{len(accepts)} ACCEPT lines. Two acceptance tests means "
                      f"two steps. Split it.",
        })
    return violations


def check_file(root: Path, rel: str, role: str | None) -> list[dict]:
    if role is None:
        return [{
            "file": rel,
            "rule": "unclassified_document",
            "detail": "No role matched. Add a pattern to .metaframework/doc-roles.json "
                      "or move the file. Unclassified documents are a violation because "
                      "an unknown residency cost cannot be budgeted.",
        }]

    if role in ("ledger", "frozen"):
        return []

    try:
        lines = (root / rel).read_text(encoding="utf-8").splitlines()
    except OSError as exc:
        return [{"file": rel, "rule": "unclassified_document",
                 "detail": f"unreadable: {exc}"}]

    if role == "resident":
        return resident_violations(rel, lines)
    if role == "step":
        return step_violations(rel, lines)
    return []


def main() -> int:
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument("--root", default=".", help="repo root (default: cwd)")
    ap.add_argument("--json", action="store_true",
                    help="emit the verdict-schema structure_check object")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    roles = load_roles(root)

    violations: list[dict] = []
    for rel in tracked_markdown(root):
        violations.extend(check_file(root, rel, classify(rel, roles)))

    result = {"status": "fail" if violations else "pass", "violations": violations}

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        if violations:
            for v in violations:
                print(f"{v['file']}: [{v['rule']}] {v['detail']}")
            print(f"\n{len(violations)} violation(s).")
        else:
            print("structure-check: pass")

    return 1 if violations else 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")      # every tool writes UTF-8 (2.8.0)
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
