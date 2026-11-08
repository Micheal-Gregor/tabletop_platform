#!/usr/bin/env python3
"""
brief — a builder's brief, generated from the documents K7 reviews against (2.6.17).

LedgerCore V2 attempt 1 briefed its builders by hand. The briefs did not cite the Object Writing Standard or the
object model; K7 reviewed against both, and six rounds followed. A generated brief carries exactly the review
basis (tools/basis.py), so the builder and the reviewer are handed the same rules:

  - the module's S3 rows: §2 partition, §3 objects, §4 seams with their binding, §5 refusal tests, §7 hooks
  - its S2 nodes (every S2 table row for the module's OBJ ids, when project.json declares s2_document)
  - its object-model rows, and the new-object.py command that starts each class
  - the Object Writing Standard, in full
  - the gate probe: the builder's first tool call, refused and logged with this brief's nonce
  - the build's operating rules, .metaframework/operating-rules.md, whole, when the owner keeps one (2.6.21)

The first line is the stamp: `MF-BRIEF MOD-nn nonce=... roster=... std=... s3=... s2=... om=...`. gate.py refuses
a sub-agent launched on a module here without a current one, and k7-run.py shows the reviewer the same digests.
The operating rules are followed by their own line, `MF-RULES <first 12 hex of the file's sha256, CRLF read as LF>`,
which the gate requires, current, in a builder's prompt (2.6.21). Without the file the brief has neither. The brief
is launched as the builder profile, `subagent_type: builder` (.claude/agents/builder.md, 2.7.0); the gate refuses any
other.

Base cases first (2.7.0). `red` reads the base-case rows added to INSTRUMENTS/axioms-and-base-cases.md since HEAD,
each naming its test (`test:` and the name in backticks), runs each named test on its own through test_select against
the module's current code, and requires every one to fail or error: a test file that does not import is no red. It
appends the nonce, module, rows, tests, counts and the tests' digests to .metaframework/red-log.jsonl, which only this
tool writes. In a Python build the gate refuses a builder's Write or Edit to its module's S3 §2 File until that line
exists, and `verify` refuses a nonce without one, or whose red tests changed after it. K7 fix rounds too: the test
fails before the fix. TypeScript and PHP builds wait for their runners' per-test form.

Usage:
    brief.py MOD-nn [--root .] [--out FILE]   write the brief (stdout by default); log its nonce
    brief.py red --nonce N [--root .]         watch the step's new base-case tests fail; log the red run
    brief.py verify --nonce N [--root .]      exit 0 when that nonce's probe was refused by this repo's current
                                              gate.py, once, inside a sub-agent, and (Python) its red run stands:
                                              the step may be accepted
Exit: 0 written / red / verified, 1 refused, 2 bad invocation.
"""

import argparse
import ast
import hashlib
import json
import re
import secrets
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import basis                                                            # noqa: E402
from gate_reach import (BRIEF_LOG, BUILDER_AGENT, LIVE_LOG, PROBE, RED_LOG, append_line,   # noqa: E402
                        read_jsonl)

S3_SECTIONS = (("2", "The module (S3 §2)"), ("3", "Its objects (S3 §3)"),
               ("4", "Its seams (S3 §4). INJECTED: the source is handed the target at construction, never imports it"),
               ("5", "Its refusal tests (S3 §5)"), ("7", "Its hooks (S3 §7)"))
OPERATING_RULES = ".metaframework/operating-rules.md"
BASE_CASES = "INSTRUMENTS/axioms-and-base-cases.md"
# A row of the base-case section: `- **BC-24.1 —** *Given* ...`, continued on the lines under it.
ROW = re.compile(r"^\s*[-*]\s+\*\*([A-Za-z][\w]*-[\w.]+)")
TESTS_NAMED = re.compile(r"\btests?:\s*(.*)", re.S)
IMPORT_FAILED = ("Failed to import test module", "unittest.loader._FailedTest", "ERROR collecting")
RED_TIMEOUT = 900


def cells(line: str) -> list[str]:
    return [c.strip().strip("`").strip() for c in line.strip().strip("|").split("|")]


def sections(text: str) -> dict[str, list[str]]:
    """{'2': lines of '## 2. ...', ...} for a numbered markdown document."""
    out, key = {}, ""
    for line in text.splitlines():
        m = re.match(r"^##\s+(\d+)[.\s]", line)
        if m:
            key = m.group(1)
        out.setdefault(key, []).append(line)
    return out


def tables(lines: list[str]) -> list[tuple[str, list[str], list[str]]]:
    """(the heading above it, its header and separator lines, its rows) for each table in `lines`."""
    found, heading, i = [], "", 0
    while i < len(lines) - 1:
        line = lines[i]
        heading = line if line.startswith("#") else heading
        if line.startswith("|") and re.match(r"^\|[\s\-:|]+\|$", lines[i + 1].strip()):
            j = i + 2
            while j < len(lines) and lines[j].startswith("|"):
                j += 1
            found.append((heading, lines[i:i + 2], lines[i + 2:j]))
            i = j
        else:
            i += 1
    return found


def label(heading: str) -> list[str]:
    """A source document's heading, shown as a label so it does not break the brief's own outline."""
    return [f"*From: {heading.lstrip('#').strip()}*"] if heading else []


def demoted(text: str) -> str:
    """An embedded document with every heading two levels down (H1 becomes H3)."""
    return re.sub(r"^(#{1,4})(?=\s)", lambda m: m.group(1) + "##", text, flags=re.M)


def rows_naming(lines: list[str], ids: set[str], first_cell_only: bool = False) -> list[str]:
    """Each table whose rows name one of `ids` in a whole cell, cut down to those rows, under its heading."""
    out = []
    for heading, head, rows in tables(lines):
        hit = [r for r in rows if set(cells(r)[:1] if first_cell_only else cells(r)) & ids]
        if hit:
            out += label(heading) + head + hit + [""]
    return out


def om_rows(text: str, module: str) -> list[str]:
    """The object model's rows for `module`: a Module cell that starts with its id (`MOD-24 ActProtocol`)."""
    out = []
    for heading, head, rows in tables(text.splitlines()):
        hit = [r for r in rows if re.match(rf"{module}\b", cells(r)[0])]
        if hit:
            out += label(heading) + head + hit + [""]
    return out


def read(root: Path, rel: str) -> str:
    try:
        return (root / rel).read_bytes().decode("utf-8")
    except OSError:
        return ""


def s3_slice(s3: dict[str, list[str]], module: str) -> list[str]:
    out = []
    for num, title in S3_SECTIONS:
        found = rows_naming(s3.get(num, []), {module})
        out += [f"### {title}", ""] + (found or ["(none)", ""])
    return out


def objects_of(s3: dict[str, list[str]], module: str) -> list[dict]:
    """[{obj, name, decides}] for the module, from S3 §3 rows: | OBJ | MOD | Name — Kind; Decides YES |."""
    out = []
    for _, _, rows in tables(s3.get("3", [])):
        for c in (cells(r) for r in rows):
            if len(c) >= 3 and c[1] == module and c[0].startswith("OBJ-"):
                decides = re.search(r"Decides\s+(YES|NO)", c[2], re.I)
                out.append({"obj": c[0], "name": re.split(r"\s+[—-]\s+", c[2])[0].strip(),
                            "decides": decides.group(1).lower() if decides else "no"})
    return out


def module_file(s3: dict[str, list[str]], module: str) -> str:
    for _, _, rows in tables(s3.get("2", [])):
        for c in (cells(r) for r in rows):
            if c and c[0] == module and len(c) >= 3:
                return c[2]
    return ""


def partition_files(s3: dict[str, list[str]]) -> dict[str, list[str]]:
    """{MOD-nn: the paths its S3 §2 File cell names} (2.7.0)."""
    out = {}
    for _, _, rows in tables(s3.get("2", [])):
        for c in (cells(r) for r in rows):
            if c and re.fullmatch(r"MOD-\d+", c[0]) and len(c) >= 3:
                out[c[0]] = [p for p in re.split(r"[`,\s]+", c[2]) if "/" in p or "." in p]
    return out


def declared_inputs(s2_text: str) -> dict[str, str]:
    """{OBJ-nn: the S2 'Declared inputs' cell} from S2's Declared inputs table."""
    out = {}
    for heading, _, rows in tables(s2_text.splitlines()):
        if "declared inputs" in heading.lower():
            out.update({c[0]: c[1] for c in map(cells, rows) if len(c) >= 2 and c[0].startswith("OBJ-")})
    return out


def scaffold_lines(objs: list[dict], file: str, module: str, inputs: dict[str, str]) -> list[str]:
    out = ["new-object.py starts a file and refuses one that exists. When the module's File holds several",
           "objects, scaffold the first and write the others to the same shape.", "", "```"]
    for o in objs:
        out += [f"python3 tools/new-object.py {o['name']} --file {file or '<the S3 §2 File>'} "
                f"--decides {o['decides']} --traces {module} --inputs <names>",
                f"    # S2 declared inputs for {o['obj']}: {inputs.get(o['obj'], '(not in S2)')}"]
    return out + ["```", ""]


def probe_lines(root: Path, nonce: str) -> list[str]:
    return [f"## 0. Your first tool call: prove the gate reaches you", "",
            f"Write the file `{(root / PROBE).as_posix()}` with the content `nonce={nonce}`.",
            "The gate must REFUSE that write. The refusal is the expected answer: carry on with the step.",
            "If the write succeeds, stop at once and report UNGATED: the gate does not run in your session,",
            "and nothing you write can be accepted.", ""]


def red_lines(cfg: dict, nonce: str, file: str) -> list[str]:
    """2.7.0: the red run, in a build where it runs (Python first)."""
    if not red_runs(cfg):
        return []
    return [f"- Base cases first. Add this step's rows to `{BASE_CASES}`, each naming its test as `test:` and",
            "  the test's name in backticks. Write those tests, and start each class with new-object.py. Then run",
            f"  `python tools/brief.py red --nonce {nonce}`: every named test must fail or error on its own against",
            f"  the current code. Until it does, the gate refuses your Write or Edit to `{file or 'the S3 §2 File'}`.",
            "  A test watched failing is not rewritten afterwards: the step is not accepted if it changes."]


def rules_lines(root: Path, red: list[str] = ()) -> list[str]:
    return ["## 5. How you work", "", *red,
            f"- Write only inside `{root.as_posix()}`. Source files with Write or Edit, never through a shell:",
            "  the gate reads what Write and Edit carry, and refuses a shell write into a source file.",
            "- tools/, .githooks/, .claude/ and .metaframework/ are not yours to write; the gate refuses them.",
            "- Commit only through the pre-commit checks; never --no-verify.",
            "- Report in about 20 lines (TE-4): verdict, files written, tests run with their exit codes,",
            "  anything you could not do and why. Detail lives in files, not in the report.", ""]


def operating_rules_lines(root: Path) -> list[str]:
    """The owner's operating rules, whole, then the MF-RULES line the gate looks for; nothing without the file."""
    path = root / OPERATING_RULES
    if not path.is_file():
        return []
    text = read(root, OPERATING_RULES).replace("\r\n", "\n").strip()
    return [f"## 6. The operating rules ({OPERATING_RULES}), in full", "", demoted(text), "",
            f"MF-RULES {basis.file_sha256(path)[:12]}", ""]


def compose(root: Path, cfg: dict, module: str, nonce: str) -> str:
    s3 = sections(read(root, cfg.get("s3_document") or ""))
    s2_text = read(root, cfg.get("s2_document") or "")
    objs = objects_of(s3, module)
    ids = {o["obj"] for o in objs}
    om = om_rows(read(root, basis.FIXED[2][1]), module)
    body = [basis.stamp(module, nonce, basis.digests(root, cfg)), "",
            f"# Builder brief: {module} ({root.name})", "",
            f"Generated by tools/brief.py at {datetime.now(timezone.utc).isoformat(timespec='seconds')}. The stamp "
            "above is checked when you are launched; it is not yours to edit. You run as the builder profile "
            f"(`subagent_type: {BUILDER_AGENT}`, .claude/agents/{BUILDER_AGENT}.md).", ""]
    body += probe_lines(root, nonce) + ["## 1. The specification (S3)", ""] + s3_slice(s3, module)
    body += ["## 2. The object model (S2)", ""] + (rows_naming(s2_text.splitlines(), ids, first_cell_only=True)
                                                    or ["(project.json declares no s2_document, or S2 names none)", ""])
    body += ["## 3. Object-model rows and how each class starts", ""] + (om or ["(none yet: new-object.py adds them)", ""])
    body += scaffold_lines(objs, module_file(s3, module), module, declared_inputs(s2_text))
    body += ["## 4. The Object Writing Standard (governance/Object_Writing_Standard.md), in full", "",
             demoted(read(root, basis.FIXED[1][1])), ""]
    body += rules_lines(root, red_lines(cfg, nonce, module_file(s3, module))) + operating_rules_lines(root)
    return "\n".join(body)


def write_brief(root: Path, module: str, out: str) -> int:
    cfg = basis.project(root)
    if not cfg.get("s3_document") or not (root / cfg["s3_document"]).is_file():
        print("brief: project.json declares no readable s3_document", file=sys.stderr)
        return 1
    if not module_file(sections(read(root, cfg["s3_document"])), module):
        print(f"brief: {module} is not in S3 §2", file=sys.stderr)
        return 1
    nonce = secrets.token_hex(8)
    text = compose(root, cfg, module, nonce)
    if not append_line(root / BRIEF_LOG, {"time": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                                          "module": module, "nonce": nonce, "digests": basis.digests(root, cfg)}):
        print(f"brief: cannot log the nonce to {BRIEF_LOG}", file=sys.stderr)
        return 1
    if out:
        Path(out).write_text(text + "\n", encoding="utf-8")
    else:
        sys.stdout.buffer.write((text + "\n").encode("utf-8"))
    return 0


def red_runs(cfg: dict) -> bool:
    """Can `red` run one named test here: a Python test_select (unittest or pytest) taking {test_name}? (2.7.0)"""
    sel = cfg.get("test_select") or ""
    return "{test_name}" in sel and bool(re.search(r"\b(unittest|pytest)\b", sel))


def base_case_rows(text: str) -> dict[str, str]:
    """{row id: the row's text, its continuation lines joined} for each row under a level-2 heading naming base
    cases."""
    rows, current, inside = {}, None, False
    for line in text.splitlines():
        if re.match(r"^#{1,2}\s", line):
            inside = "base case" in line.lower()
        m = ROW.match(line) if inside else None
        if m:
            current = m.group(1)
            rows[current] = line.strip()
        elif current and line.strip() and not re.match(r"^\s*(?:[-*]\s|#)", line):
            rows[current] += " " + line.strip()
        else:
            current = None
    return rows


def named_tests(row: str) -> list[str]:
    """The tests a row names after `test:` or `tests:`: its code spans, else its bare names. A path is left out, and
    `file::name` is read as name."""
    m = TESTS_NAMED.search(row)
    if not m:
        return []
    text = m.group(1).split(")*")[0]
    spans = re.findall(r"`([^`]+)`", text) or re.findall(r"[A-Za-z_][\w.:]*", text)
    names = [s.split("::")[-1].strip() for s in spans]
    return [n for n in names if n and not re.search(r"[/\\]|\.(?:py|ts|js|php)$", n)]


def at_head(root: Path, rel: str) -> str:
    """The file as HEAD has it; '' when HEAD has none."""
    r = subprocess.run(["git", "-C", str(root), "show", f"HEAD:{rel}"], capture_output=True)
    return r.stdout.decode("utf-8", "replace") if r.returncode == 0 else ""


def rows_added(root: Path) -> dict[str, list[str]]:
    """{row id: the tests it names} for each base-case row added since HEAD."""
    now, then = base_case_rows(read(root, BASE_CASES)), base_case_rows(at_head(root, BASE_CASES))
    return {k: named_tests(v) for k, v in now.items() if k not in then}


def suite_folder(cfg: dict) -> str:
    """The folder test_select discovers from (-s), tests/ when it names none."""
    m = re.search(r"(?:^|\s)-s\s+(\"[^\"]+\"|'[^']+'|\S+)", cfg.get("test_select") or "")
    return m.group(1).strip("\"'") if m else "tests"


def test_sources(root: Path, cfg: dict, name: str) -> dict[str, str]:
    """{test file: the source of every def or class `name` in it}, under the suite's folder."""
    leaf, out = re.split(r"[.:]", name)[-1], {}
    for path in sorted((root / suite_folder(cfg)).rglob("*.py")):
        try:
            text = path.read_bytes().decode("utf-8").replace("\r\n", "\n")
            nodes = ast.walk(ast.parse(text))
        except (OSError, ValueError, SyntaxError):
            continue
        found = [ast.get_source_segment(text, n) or "" for n in nodes
                 if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) and n.name == leaf]
        if found:
            out[path.relative_to(root).as_posix()] = "\n".join(found)
    return out


def test_digest(root: Path, cfg: dict, name: str) -> str:
    """sha256 of the named test's own source, wherever it is defined; '' when nothing defines it."""
    src = test_sources(root, cfg, name)
    return hashlib.sha256(json.dumps(src, sort_keys=True).encode("utf-8")).hexdigest() if src else ""


def counts_of(out: str) -> dict[str, int]:
    """How many tests a run reports as run, failed, errored and passed (unittest's summary, else pytest's)."""
    ran = re.search(r"\bRan (\d+) tests?\b", out)
    if ran:
        tail = re.search(r"FAILED \(([^)]*)\)", out)
        got = {k.strip(): int(v) for k, v in (x.rsplit("=", 1) for x in tail.group(1).split(",") if "=" in x)} \
            if tail else {}
        n, failed, errors = int(ran.group(1)), got.get("failures", 0), got.get("errors", 0)
        held = sum(got.get(k, 0) for k in ("skipped", "expected failures", "unexpected successes"))
        return {"ran": n, "failed": failed, "errors": errors, "passed": n - failed - errors - held}
    found = {k: int(m.group(1)) if (m := re.search(rf"(\d+) {w}\b", out)) else 0
             for k, w in (("failed", "failed"), ("errors", "errors?"), ("passed", "passed"))}
    return {"ran": sum(found.values()), **found}


def red_outcome(out: str, code: int) -> dict:
    """One named test's run: its counts, and why it is no red ('' when it is one)."""
    counts = counts_of(out)
    if any(x in out for x in IMPORT_FAILED):
        why = "a test module does not import, and a file that does not import is no red"
    elif not counts["ran"]:
        why = "it ran no test: name it as test_select finds it"
    elif counts["passed"] > 0 or code == 0:
        why = f"{max(counts['passed'], 1)} passed against the current code"
    else:
        why = ""
    return {**counts, "why": why}


def run_named(root: Path, cfg: dict, name: str) -> dict:
    """The named test, run on its own through test_select against the code as it is now."""
    cmd = cfg["test_select"].replace("{test_name}", name)
    try:
        r = subprocess.run(cmd, shell=True, cwd=str(root), capture_output=True, encoding="utf-8", errors="replace",
                           timeout=RED_TIMEOUT)
    except subprocess.TimeoutExpired:
        return {"ran": 0, "failed": 0, "errors": 0, "passed": 0, "why": f"timed out after {RED_TIMEOUT}s"}
    return red_outcome(r.stdout + r.stderr, r.returncode)


def red_inputs(root: Path, cfg: dict, nonce: str) -> tuple[str, dict[str, list[str]], list[str]]:
    """(the nonce's module, {new row: its tests}, why a red cannot run: [] when it can)."""
    issued = [x for x in read_jsonl(root / BRIEF_LOG) if x.get("nonce") == nonce]
    if not issued:
        return "", {}, ["tools/brief.py never issued this nonce"]
    if not red_runs(cfg):
        return "", {}, ["red runs one named test through a Python test_select (unittest or pytest) taking {test_name}; "
                        "TypeScript and PHP builds wait for their runners' per-test form"]
    rows = rows_added(root)
    if not rows:
        return "", {}, [f"no base-case row added to {BASE_CASES} since HEAD: write the step's base cases first"]
    return issued[-1].get("module", ""), rows, unnamed(root, cfg, rows)


def unnamed(root: Path, cfg: dict, rows: dict[str, list[str]]) -> list[str]:
    """Each new row that names no test, and each named test nothing in the suite defines."""
    why = [f"{r} names no test (`test:` and the test's name in backticks)" for r, t in rows.items() if not t]
    return why + [f"{t}: no def or class of that name under {suite_folder(cfg)}/" for t in tests_of(rows)
                  if not test_sources(root, cfg, t)]


def tests_of(rows: dict[str, list[str]]) -> list[str]:
    return sorted({t for ts in rows.values() for t in ts})


def red_evidence(root: Path, cfg: dict, runs: dict) -> dict:
    """The red-log line's evidence: each test's counts, its files' digests and its own source's digest."""
    files = sorted({f for t in runs for f in test_sources(root, cfg, t)})
    return {"tests": {t: counts for t, (counts, _) in runs.items()},
            "test_files": {f: basis.file_sha256(root / f) for f in files},
            "digests": {t: test_digest(root, cfg, t) for t in runs}}


def red(root: Path, nonce: str) -> int:
    """`red --nonce N`: run each new base-case test on its own; every one fails or errors, or nothing is logged."""
    cfg = basis.project(root)
    module, rows, why = red_inputs(root, cfg, nonce)
    runs = {} if why else {t: split_why(run_named(root, cfg, t)) for t in tests_of(rows)}
    why += [f"{t}: {said}" for t, (_, said) in runs.items() if said]
    if why:
        print("\n".join(f"brief red: {w}" for w in why), file=sys.stderr)
        return 1
    record = {"time": datetime.now(timezone.utc).isoformat(timespec="seconds"), "nonce": nonce, "module": module,
              "rows": sorted(rows), **red_evidence(root, cfg, runs)}
    if not append_line(root / RED_LOG, record):
        print(f"brief red: cannot log the red run to {RED_LOG}", file=sys.stderr)
        return 1
    print(f"brief red: {module} red on {len(runs)} test(s) from {', '.join(sorted(rows))}; logged in {RED_LOG}")
    return 0


def split_why(outcome: dict) -> tuple[dict, str]:
    """(a run's counts, why it is no red)."""
    return {k: v for k, v in outcome.items() if k != "why"}, outcome["why"]


def changed_red_tests(root: Path, cfg: dict, runs: list[dict]) -> list[str]:
    """Each red test whose own source is not what its latest red run digested."""
    digests = {}
    for x in runs:
        digests.update(x.get("digests") or {})
    return [t for t, d in sorted(digests.items()) if test_digest(root, cfg, t) != d]


def red_reasons(root: Path, nonce: str) -> list[str]:
    """Why the step's red run does not stand (2.7.0): none logged, or a red test changed after it. [] outside a build
    where red runs."""
    cfg = basis.project(root)
    if not red_runs(cfg):
        return []
    runs = [x for x in read_jsonl(root / RED_LOG) if x.get("nonce") == nonce]
    if not runs:
        return [f"no red run for this nonce: its base-case tests were never watched failing (python tools/brief.py "
                f"red --nonce {nonce})"]
    return [f"red test {t} changed after its red run ({', '.join(test_sources(root, cfg, t)) or 'no longer defined'}):"
            f" a test watched failing is not rewritten afterwards" for t in changed_red_tests(root, cfg, runs)]


def verify_reasons(root: Path, nonce: str) -> list[str]:
    """Why the step carrying `nonce` may not be accepted; [] when it may."""
    issued = [x for x in read_jsonl(root / BRIEF_LOG) if x.get("nonce") == nonce]
    probes = [x for x in read_jsonl(root / LIVE_LOG) if x.get("nonce") == nonce]
    gate_now = basis.file_sha256(root / "tools" / "gate.py")
    reasons = [] if issued else ["tools/brief.py never issued this nonce"]
    callers = {(x.get("session_id"), x.get("agent_id")) for x in probes}      # one call may be logged by two hooks
    if len(callers) != 1:
        return reasons + [f"{len(callers)} sessions or agents probed with this nonce; exactly one is the proof"]
    p = probes[0]
    reasons += [] if p.get("agent_id") else ["the probe came from a session, not a sub-agent (no agent_id)"]
    reasons += [] if p.get("gate_sha256") == gate_now else ["gate.py has changed since the probe was refused"]
    return reasons + red_reasons(root, nonce)


def main() -> int:
    ap = argparse.ArgumentParser(description="a builder's brief, its red run, or the check that its builder was gated")
    ap.add_argument("what", help="MOD-nn, red or verify")
    ap.add_argument("--root", default=".")
    ap.add_argument("--out", default="")
    ap.add_argument("--nonce", default="")
    args = ap.parse_args()
    root = Path(args.root).resolve()
    if args.what == "red":
        if not args.nonce:
            print("brief red: --nonce is required", file=sys.stderr)
            return 2
        return red(root, args.nonce)
    if args.what == "verify":
        reasons = verify_reasons(root, args.nonce) if args.nonce else ["--nonce is required"]
        print("\n".join(f"brief verify: {r}" for r in reasons) or f"brief verify: nonce {args.nonce} proven",
              file=sys.stderr if reasons else sys.stdout)
        return 1 if reasons else 0
    if not re.fullmatch(r"MOD-\d+", args.what):
        print("brief: give MOD-nn, red or verify", file=sys.stderr)
        return 2
    return write_brief(root, args.what, args.out)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")      # every tool writes UTF-8 (2.8.0)
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
