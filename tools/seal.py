#!/usr/bin/env python3
"""
seal — ends Phase 4 with one sweep and a lock, and hands the repo to Phase 5.

The failure this exists to prevent: review with no end goal. Once the library is
built and reviewed, re-reviewing it produces relative verdicts, and every pass
generates documentation that the next pass audits. The seal replaces that with
one mechanical sweep, one owner decision, and a tag. After the tag, files present
at the seal are frozen (tools/gate.py refuses writes to them); new capability
arrives as NEW files through an extension run.

Subcommands:
    check                      the sweep: one pass of mechanical checks, no judgment
    apply --approved-by WHO    lock it: seal record, Phase 5 contract, ui/ skeleton, tag
          [--accept-failures]  seal with failing checks the owner triaged as known issues
    verify [--ref REF]         sealed files unchanged (working tree, or REF)
    list                       print the sealed file set
    begin-extension --s3 P [--s2 P]
                               hand a sealed repo back to Phase 4 for an extension build
    reopen --approved-by WHO --ruling ID
                               reopen the latest seal for one owner-ruled change; the
                               next seal closes it and retires the record (tools/reopen.py)

Usage:
    seal.py <subcommand> [--root .] [--json]
Exit: 0 pass/done, 1 violations/refused, 2 bad invocation.

The close (2.8.0, roster v0.14; the owner, 31 Oct 2026: "Adopt it"): the last
module is built; ui/interface-contract.md is written; the final K7 review runs
(k7-run.py --final); `check` sweeps; the owner gives one approval, and `apply`
seals the library and merges phase4 into main with --no-ff. The owner's approval
closes the final review: no closed-by-owner tag is asked for. The review's
findings become Phase 5 gaps in ui/gaps.md, and everything the sweep carries
goes to Phase 5: production concerns, deferred vectors, incomplete modules, the
final review's findings, open owner gates and the object standard's exceptions
(SR-1 entries among them). `check` is started through tools/run.py.

Nothing here asks a model to assess itself. Every step compares an artifact to
another artifact, or an exit code to zero.
"""

import argparse
import importlib.util
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from source_scan import glob_to_regex, signatures  # shared with phase4-checks.py (2.6.19)

MERGE_FROM, MERGE_INTO = "phase4", "main"       # the owner's one approval merges the build into main (2.8.0)
PHASE4_MARK = "## Phase 4 process contract"

GAPS_TEMPLATE = """\
# Gap log

Engine gaps found while surfacing the library. The test: does the feature need the engine to
decide, record, or enforce something it doesn't already? If it only changes how something is
shown, it is not a gap — build it in the view.

A claim needs evidence, not absence of memory: name the interface-contract entries checked and
the compositions tried, and why each fails. States: `noticed` → `withdrawn` (it existed; name
the operation) or `shaped` → `ready`. An entry is `ready` when all three hold: no composition of
existing operations covers it; it came up in more than one walk, or it blocks a chosen job; the
owner agrees the shaped behaviour is the real need. Ready entries go to a Phase 1–4 extension
run, batched with related entries.

| ID | User job | Engine must decide / record / enforce | Walk it came from | Lookup evidence | State |
|---|---|---|---|---|---|

## Shaped detail

(For each `shaped` or `ready` entry: inputs, outputs, rules, and a worked example taken from the
simulation. Describe the need, not a class design — Phase 1 derives the component.)
"""

CONTRACT_TEMPLATE = """\
# Interface contract

One page. What the sealed library offers a UI or an agent caller, in the terms a caller needs.
Phase 5 reads this FIRST, every session — it is the cheap answer to "can the library already
do this?", and it exists so no session ever guesses instead. Written at the seal from the
object model and the modules' public signatures; regenerated only at a re-seal. Keep it a
listing, not an explanation. NOT-YET-WRITTEN

## Objects

| Object | What it represents | Read-only to the user |
|---|---|---|

## Actions

Copied from the signatures, never written from memory of the happy path. Every cell is
required: an operation whose refusals are unwritten cannot be called safely, because a caller
cannot tell a correct refusal from a break. `Invariant to` lists any declared input the
operation legitimately ignores — the only way an OS-12 two-call test may return equal answers.

| Operation | Module | What it does | Inputs | Returns | Refusals | Side effects | Determinism | Invariant to |
|---|---|---|---|---|---|---|---|---|

## Error states

| Error | Raised by | What the user should see |
|---|---|---|
"""

SURFACE_TEMPLATE = """\
# Surface map

What the UI surfaces today. Read this instead of the codebase when simulating. Updated at the
end of every build. The utilization audit compares the operations listed here against the
library's public operations.

| View | User job | Library operations called | Faces | Built in batch |
|---|---|---|---|---|
"""


# --------------------------------------------------------------------------- helpers

def ended(path: Path, text: str) -> bytes:
    """`text` as UTF-8 bytes, its lines ended LF, or CRLF where the file at `path` already uses it."""
    crlf = path.is_file() and b"\r\n" in path.read_bytes()
    return text.replace("\r\n", "\n").replace("\n", "\r\n" if crlf else "\n").encode("utf-8")


def write_text_kept(path: Path, text: str) -> None:
    """Write text as UTF-8 bytes. Text mode would turn every \\n into \\r\\n on Windows (F7, the Frame Gate trial),
    so this writes LF, or CRLF only where the file being rewritten already uses it."""
    path.write_bytes(ended(path, text))


def append_text_kept(path: Path, text: str) -> None:
    """Append text as UTF-8 bytes, ended as write_text_kept would end it; every byte already in the file stays as it
    is (2.6.24). A rewrite re-ended a mixed-ending ledger's earlier lines (FirmOS seal-record.md at seal-17)."""
    data = ended(path, text)
    with path.open("ab") as f:
        f.write(data)


def git(root: Path, *a: str, check: bool = False) -> str:
    try:
        r = subprocess.run(["git", "-C", str(root), *a],
                           capture_output=True, encoding="utf-8", errors="replace", timeout=60)
    except (OSError, subprocess.SubprocessError):
        return ""
    if check and r.returncode != 0:
        raise RuntimeError(f"git {' '.join(a)} failed: {r.stderr.strip()}")
    return r.stdout.strip() if r.returncode == 0 else ""


def git_ok(root: Path, *a: str) -> bool:
    try:
        return subprocess.run(["git", "-C", str(root), *a], capture_output=True,
                              timeout=60).returncode == 0
    except (OSError, subprocess.SubprocessError):
        return False


def load_cfg(root: Path) -> dict:
    try:
        return json.loads((root / ".metaframework" / "project.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def sealed_globs(cfg: dict) -> list[str]:
    return cfg.get("sealed_globs") or [cfg.get("source_glob") or "src/**", "tests/**"]


def latest_seal(root: Path) -> str:
    tags = git(root, "tag", "-l", "seal-*", "--sort=-v:refname").splitlines()
    return tags[0] if tags else ""


def sealed_files(root: Path, tag: str, cfg: dict) -> set[str]:
    rx = [glob_to_regex(g) for g in sealed_globs(cfg)]
    files = git(root, "ls-tree", "-r", "--name-only", tag).splitlines()
    return {f for f in files if any(r.match(f) for r in rx)}


def changed_sealed(root: Path, tag: str, cfg: dict, ref: str | None = None) -> list[str]:
    sealed = sealed_files(root, tag, cfg)
    args = ["diff", "--name-only", tag] + ([ref] if ref else [])
    changed = set(git(root, *args).splitlines())
    if ref is None:  # working tree: also catch deletions of sealed files not yet staged
        changed |= {f for f in sealed if not (root / f).exists()}
    return sorted(changed & sealed)


def reopened(root: Path, tag: str) -> dict | None:
    """The record of the owner ruling that reopened `tag`, or None (tools/reopen.py)."""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from reopen import reopen_record
    return reopen_record(root, tag)


def prior_seal_step(root: Path, cfg: dict, prior: str) -> dict:
    """prior-seal-intact: the files sealed at `prior` are unchanged. A seal an owner ruling reopened has changed by
    that ruling, and this seal is the one that closes the reopen, so the step passes and names the ruling."""
    broken = changed_sealed(root, prior, cfg)
    record = reopened(root, prior)
    if record:
        return step("prior-seal-intact", True,
                    f"{prior} reopened by {record.get('ruling')} ({record.get('approved_by')}): "
                    f"{len(broken)} sealed file(s) changed under it; this seal closes the reopen")
    return step("prior-seal-intact", not broken,
                f"{prior} intact" if not broken else f"files sealed at {prior} changed: {', '.join(broken[:6])}")


def phase5_refusal(root: Path, st: dict) -> str:
    """Why no seal can be applied now, or "" when one can. In phase 5 the library is sealed, unless an owner ruling
    reopened the latest seal: the next seal closes the reopen (seal.py reopen)."""
    if str(st.get("phase", 4)) != "5" or reopened(root, latest_seal(root)):
        return ""
    return ("seal: STATE.json says phase 5 — the library is already sealed. An extension "
            "build starts with `seal.py begin-extension`.")


def retire_reopen(root: Path) -> None:
    """The seal that closes a reopen retires its record: .metaframework/reopen.json leaves in the seal's commit. A
    record binds to one tag and none can name the seal being made, so any record here is spent. Its history stays
    in git, and the seal record's prior-seal-intact row names the ruling it closed."""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from reopen import RECORD
    git(root, "rm", "-q", "-f", "--ignore-unmatch", "--", RECORD.as_posix())
    (root / RECORD).unlink(missing_ok=True)


def worktree_clean(root: Path) -> bool:
    return git(root, "status", "--porcelain", "--", ".", ":(exclude)STATE.json") == ""


def load_state(root: Path) -> dict:
    try:
        return json.loads((root / "STATE.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def run_shell(root: Path, cmd: str, timeout: int = 3600) -> tuple[int, str]:
    """The command's exit code and the last lines of its output, read as UTF-8 (2.6.24): in the Windows locale (cp1252)
    one byte it has no character for left stdout None, and the sweep died (FirmOS, `npm test`)."""
    try:
        r = subprocess.run(cmd, shell=True, cwd=str(root), capture_output=True,
                           encoding="utf-8", errors="replace", timeout=timeout)
        tail = "\n".join((r.stdout + r.stderr).strip().splitlines()[-8:])
        return r.returncode, tail
    except subprocess.TimeoutExpired:
        return 124, f"timed out after {timeout}s"


def run_tool(root: Path, script: str, *args: str) -> dict:
    p = root / "tools" / script
    if not p.is_file():
        return {"status": "fail", "violations": [{"detail": f"tools/{script} not found"}]}
    r = subprocess.run([sys.executable, str(p), *args, "--json"],
                       capture_output=True, encoding="utf-8", errors="replace", cwd=str(root))
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        return {"status": "fail", "violations": [{"detail": (r.stderr or r.stdout)[:300]}]}


def heads_table(lines: list[str], i: int) -> bool:
    """Whether lines[i] is a table's header row: it starts with a pipe and a separator row follows it."""
    return lines[i].startswith("|") and i + 1 < len(lines) and \
        re.match(r"^\|[\s\-:|]+\|$", lines[i + 1].strip()) is not None


def table_under(lines: list[str], i: int) -> tuple[list[dict], int]:
    """(the rows of the table headed at lines[i] whose cell count matches the header, the index just past it)."""
    cols = [c.strip() for c in lines[i].strip().strip("|").split("|")]
    end = i + 2
    while end < len(lines) and lines[end].strip().startswith("|"):
        end += 1
    split = ([c.strip() for c in ln.strip().strip("|").split("|")] for ln in lines[i + 2:end])
    return [dict(zip(cols, vals)) for vals in split if len(vals) == len(cols)], end


def md_tables(path: Path) -> dict[str, list[dict]]:
    """{level-2 heading: rows of the first table under it}."""
    tables, current = {}, None
    if not path.is_file():
        return tables
    lines = path.read_text(encoding="utf-8").splitlines()
    i = 0
    while i < len(lines):
        ln = lines[i].rstrip()
        if ln.startswith("## "):
            current = ln[3:].strip(); i += 1; continue
        if not heads_table(lines, i):
            i += 1; continue
        rows, i = table_under(lines, i)
        tables.setdefault(current if current is not None else "", rows)
    return tables


def first_table(path: Path) -> list[dict]:
    t = md_tables(path)
    return next(iter(t.values()), []) if t else []


def step(name: str, ok: bool, detail: str = "") -> dict:
    return {"step": name, "status": "pass" if ok else "fail", "detail": detail}


REQUIRED_CELLS = ("Refusals", "Side effects", "Determinism")
CONSTRUCTORS = ("__init__", "constructor", "__construct")
TYPE_WORDS = ("int", "str", "float", "bool", "number", "string",
              "object", "list", "dict", "array", "date", "null")


def contract_file(cfg: dict) -> str:
    """The interface contract, in the folder project.json's ui_root names ("ui" when it names none)."""
    return f"{cfg.get('ui_root') or 'ui'}/interface-contract.md"


def table_problems(om_rows: list[dict], contract_rows: list[dict], contract: str) -> list[dict]:
    """The object model or the contract's Actions table, where either cannot be checked at all. A contract finding
    names the file read (2.6.24): it named ui/ under any ui_root, so precommit charged FirmOS's mirror in ui/, never
    the web/ contract the check reads."""
    problems: list[dict] = []
    if not om_rows:
        problems.append({"file": "INSTRUMENTS/object-model-and-parameters.md",
                         "detail": "no readable module rows — a row whose cell count does not match the header "
                                   "is skipped, so this check would otherwise pass by default"})
    if not contract_rows:
        problems.append({"file": contract, "detail": "no readable '## Actions' table"})
    elif not all(c in contract_rows[0] for c in REQUIRED_CELLS):
        problems.append({"file": contract, "detail": f"the Actions table is missing "
                         f"{[c for c in REQUIRED_CELLS if c not in contract_rows[0]]} — OS-6/7/8 have no "
                         f"home, and a caller cannot tell a correct refusal from a break"})
    return problems


NONE_CELL = ("—", "-", "none")
CLASS_PART = re.compile(r"^\s*([A-Za-z_$][\w$]*)\s*:(.*)$", re.S)


def declared_inputs(row: dict) -> tuple[str, dict[str, str]]:
    """An object-model row's 'Declared inputs' cell as (its plain part, {class: its part}) (2.6.21). The cell
    `ClassA: x, y; ClassB: z` declares per class; a class it does not name takes the plain part, if any."""
    cell = next((val for key, val in row.items()
                 if key.lower().startswith("declared inputs")), "")
    plain, per_class = [], {}
    for part in cell.split(";"):
        named = CLASS_PART.match(part)
        if named:
            per_class[named.group(1)] = named.group(2)
        else:
            plain.append(part)
    return ",".join(plain), per_class


def part_names(part: str) -> set[str]:
    """The names in one part of a 'Declared inputs' cell."""
    return {x.strip() for x in re.split(r"[,/]", part)
            if x.strip() and x.strip() not in NONE_CELL}


def constructor_params(members: dict) -> list[str]:
    """A class's constructor parameters, in order, from its signatures (a dataclass's fields, 2.6.21)."""
    return members.get("__init__", members.get("constructor", members.get("__construct", [])))


def shared_cell_problem(takers: dict) -> str:
    """Several classes that take inputs under one plain cell: no one list can match them all (2.6.21)."""
    form = "; ".join(f"{cls}: {', '.join(ctor)}" for cls, ctor in takers.items())
    return (f"{', '.join(takers)}: {len(takers)} classes in this file take constructor inputs and share one plain "
            f"object-model Declared inputs cell — declare each class's own, as `{form}`")


def constructor_findings(sig: dict, row: dict) -> list[str]:
    """Each class's constructor against its own part of the row's Declared inputs cell (2.6.21)."""
    plain, per_class = declared_inputs(row)
    ctors = {cls: constructor_params(members) for cls, members in sig.items()}
    takers = {cls: ctor for cls, ctor in ctors.items() if ctor}
    if not per_class and len(takers) > 1:
        return [shared_cell_problem(takers)]
    return [p for cls, ctor in ctors.items() for p in constructor_problems(cls, ctor, per_class.get(cls, plain))]


def constructor_problems(cls: str, ctor: list[str], part: str) -> list[str]:
    """The class's constructor parameters against its part of the object-model Declared inputs cell, both ways. A
    `none` part over a constructor that takes anything is refused by name (2.6.21)."""
    if ctor and part.strip() in NONE_CELL:
        return [f"{cls}: the object-model Declared inputs cell says '{part.strip()}', but the constructor takes "
                f"{ctor} — declare them"]
    declared = part_names(part)
    missing, extra = set(ctor) - declared, declared - set(ctor)
    out = []
    if missing:
        out.append(f"{cls}: constructor takes {sorted(missing)}, absent from the "
                   f"object-model Declared inputs cell")
    if extra:
        out.append(f"{cls}: object model declares {sorted(extra)}, not in the "
                   f"constructor signature")
    return out


def contract_row(cls: str, op: str, contract_rows: list[dict]) -> dict | None:
    """GOV-9: a class operation is matched to its own `Class.op` row; a bare-name row (no class) is the fallback;
    another class's row of the same name never matches."""
    cells = [(r.get("Operation", "").split("(")[0].strip(), r) for r in contract_rows]
    return next((r for name, r in cells if name == f"{cls}.{op}"), None) or \
        next((r for name, r in cells if name == op), None)


def inputs_problems(qual: str, params: list[str], cell: str) -> list[str]:
    """The operation's parameter names against its contract Inputs cell, both ways."""
    named = {x for x in re.findall(r"[A-Za-z_$][\w$]*", cell)}
    out = [f"{qual}: parameter '{pname}' is not in its contract Inputs cell"
           for pname in params if pname not in named]
    out += [f"{qual}: contract lists '{n}', which is not a parameter of the signature"
            for n in named - set(params) - {"none", "None", "—"} if n.lower() not in TYPE_WORDS]
    return out


def operation_problems(cls: str, op: str, params: list[str], contract_rows: list[dict]) -> list[str]:
    """One operation against its contract row: the row exists, its required cells are written, its Inputs match."""
    qual = f"{cls}.{op}"
    row_c = contract_row(cls, op, contract_rows)
    if row_c is None:
        return [f"{qual}: no row in the interface contract's Actions table (rows are matched by Class.operation, "
                f"GOV-9)"]
    out = [f"{qual}: the contract's {col} cell is empty — 'none' is an answer and must be written"
           for col in REQUIRED_CELLS if col in row_c and not row_c.get(col, "").strip()]
    return out + inputs_problems(qual, params, row_c.get("Inputs", ""))


def module_problems(root: Path, rel: str, row: dict, contract_rows: list[dict]) -> list[str]:
    """One object-model row: its file's signatures against the row's Declared inputs and the contract's rows."""
    f = root / rel
    if not f.is_file():
        return []
    try:
        sig = signatures(rel, f.read_text(encoding="utf-8"), root)       # root: inherited dataclass fields (2.6.24)
    except (OSError, UnicodeDecodeError):
        return []
    out = constructor_findings(sig, row)
    for cls, members in sig.items():
        for op, params in members.items():
            if op not in CONSTRUCTORS:
                out += operation_problems(cls, op, params, contract_rows)
    return out


def check_declarations(root: Path, cfg: dict) -> list[dict]:
    """The contract is copied from the signatures, not written from memory of the happy
    path. Every constructor parameter appears in the object-model 'Declared inputs' cell;
    every operation's parameter names appear in that operation's 'Inputs' cell."""
    om_rows = first_table(root / "INSTRUMENTS" / "object-model-and-parameters.md")
    contract = contract_file(cfg)
    contract_rows = md_tables(root / contract).get("Actions", [])
    by_file = {r.get("File", ""): r for r in om_rows if r.get("File")}
    problems = table_problems(om_rows, contract_rows, contract)
    for rel, row in by_file.items():
        problems += [{"file": rel, "detail": d} for d in module_problems(root, rel, row, contract_rows)]
    return problems

# --------------------------------------------------------------------------- check

def s3_missing(root: Path, tables: dict) -> list[str]:
    """The S3 section-2 rows (ACTIVE or PROPOSED) whose File cell names a path that is not a file under root.

    A cell names its files as code spans, several separated by commas (GOV-10); a cell with no code span is
    read as comma-separated bare paths. A cell that names nothing fails its row, and so does any one
    missing file of several."""
    out = []
    for r in tables.get("2. Resolved partition", []):
        if r.get("Status") not in ("ACTIVE", "PROPOSED"):
            continue
        paths = named_files(r.get("File", ""))
        gone = [x for x in paths if not (root / x).is_file()]
        if not paths or gone:
            out.append(f"{r.get('ID')} → {', '.join(gone) if gone else 'no file named'}")
    return out


def named_files(cell: str) -> list[str]:
    """The paths a File cell names: its code spans, or else its comma-separated bare paths."""
    return re.findall(r"`([^`]+)`", cell) or [x.strip() for x in cell.split(",") if x.strip()]


def manifests():
    """tools/manifests.py: the verdict files and the module fingerprints (credited review)."""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import manifests as mf
    return mf


def from_final(root: Path) -> list[tuple[int, dict]]:
    """The final review toward this seal (k7-run.py --final) and every round after it, which only the owner orders;
    [] when no final review has run since the latest seal."""
    rounds = manifests().rounds_toward_seal(root, root / "INSTRUMENTS")
    finals = [i for i, (_, v) in enumerate(rounds) if manifests().round_kind(v) == "final"]
    return rounds[finals[-1]:] if finals else []


def reviewed_step(root: Path, cfg: dict) -> dict:
    """The library was reviewed (2.8.0): the final review, or a round the owner ordered after it, reviewed the code
    being sealed. Its verdict is not asked about: the owner's approval closes it, and its findings go to Phase 5."""
    rounds = from_final(root)
    if not rounds:
        return step("reviewed", False, "no final review toward this seal: run `python tools/run.py --kind k7 -- "
                                       "python tools/k7-run.py --final` first (roster v0.14)")
    (n, final), (last, newest) = rounds[0], rounds[-1]
    drift = changed_since(root, cfg, manifests().reviewed_commit(newest))
    said = f"final review, round {n} ({final.get('verdict')})" + (f"; last reviewed in round {last}" if last != n else "")
    return step("reviewed", not drift, f"{said}; the owner's approval closes it" if not drift else
                f"code changed after round {last}'s review: {', '.join(drift[:6])}")


def changed_since(root: Path, cfg: dict, commit: str) -> list[str]:
    """The sealed-glob files HEAD changed after `commit`; a round with no reviewed commit covers nothing."""
    if not commit:
        return ["(the round names no reviewed commit)"]
    rx = [glob_to_regex(g) for g in sealed_globs(cfg)]
    return [f for f in git(root, "diff", "--name-only", commit, "HEAD").splitlines() if any(r.match(f) for r in rx)]


def approved_full(root: Path) -> dict:
    """{module: fingerprint} the final review, or a round after it, reviewed in full: what the owner's approval closes."""
    out = {}
    for _, v in from_final(root):
        out |= {s["module"]: s["manifest"] for s in (v.get("reviewed") or {}).get("scope") or []
                if s.get("mode") == "full" and s.get("manifest")}
    return out


def full_review_step(root: Path, cfg: dict) -> dict:
    """Credited review's backstop: a module may have been reviewed on its diff since its last full review, so
    every module's final content must have had one FULL review in a concluded round (tools/manifests.py). The final
    review is concluded by the owner's approval of this seal (2.8.0)."""
    try:
        gaps = manifests().backstop(root, cfg, root / "INSTRUMENTS", approved_full(root))
        return step("full-review", not gaps,
                    "every module's final content has had a full review" if not gaps else
                    "; ".join(gaps[:6]) + (f" (+{len(gaps) - 6} more)" if len(gaps) > 6 else "")
                    + ". The final review (k7-run.py --final) reviews every module in full.")
    except Exception as exc:                       # the step reports, it never crashes the sweep
        return step("full-review", False, f"could not compute the backstop: {exc}")


# (project.json key, step, detail when undeclared, detail suffix on exit 0): run in this order through the shell.
SHELL_STEPS = (
    ("test_command", "full-suite", "test_command undeclared in project.json", ""),
    ("rederive_all", "rederive-all", "rederive_all undeclared in project.json", ""),
    ("isolation_test_command", "isolation-tests",
     "isolation_test_command undeclared — OS-12 is what proves a class "
     "takes nothing it did not declare; a seal cannot stand without it", " (OS-12, env cleared)"),
)


def shell_steps(root: Path, cfg: dict) -> list[dict]:
    """The declared full suite, re-derive-all and isolation tests, each passing on exit 0."""
    out = []
    for key, name, undeclared, passed in SHELL_STEPS:
        cmd = cfg.get(key)
        if not cmd:
            out.append(step(name, False, undeclared))
            continue
        code, tail = run_shell(root, cmd)
        out.append(step(name, code == 0, f"exit {code}" + (f": {tail}" if code else passed)))
    return out


def tool_steps(root: Path) -> list[dict]:
    """phase4-checks and structure-check over the repo."""
    p4 = run_tool(root, "phase4-checks.py", "--root", str(root))
    p4_step = step("phase4-checks", p4.get("status") == "pass",
                   "; ".join(f"{x.get('check', '')}:{x.get('rule', '')} {x.get('file', '')}"
                             for x in p4.get("violations", [])[:6]))
    sc = run_tool(root, "structure-check.py", "--root", str(root))
    return [p4_step, step("structure-check", sc.get("status") == "pass",
                          "; ".join(f"{x.get('file', '')}:{x.get('rule', '')}"
                                    for x in sc.get("violations", [])[:6]))]


def s3_steps(root: Path, cfg: dict) -> tuple[list[dict], dict]:
    """(emission-check and s3-coverage on the declared S3, the S3's tables or {} when none is declared)."""
    s3 = cfg.get("s3_document") or ""
    s2 = cfg.get("s2_document") or ""
    if not s3:
        return [step("emission-check", False, "s3_document undeclared in project.json"),
                step("s3-coverage", False, "s3_document undeclared")], {}
    em = run_tool(root, "emission-check.py", s3, *(["--phase2", s2] if s2 else []))
    em_step = step("emission-check", em.get("status") == "pass",
                   "; ".join(x.get("rule", "") for x in em.get("violations", [])[:6]))
    tables = md_tables(root / s3)
    missing = s3_missing(root, tables)
    return [em_step, step("s3-coverage", not missing,
                          "every specified module is built" if not missing else
                          "specified but not on disk: " + ", ".join(missing[:8]))], tables


def contract_steps(root: Path, cfg: dict) -> list[dict]:
    """The interface contract is written, and its declarations match the signatures and the object model."""
    contract = root / contract_file(cfg)
    written = contract.is_file() and "NOT-YET" + "-WRITTEN" not in contract.read_text(encoding="utf-8")
    written_step = step("interface-contract", written,
                        "written" if written else
                        "missing or still unwritten — Phase 5 reads it first, and a caller who "
                        "cannot see an operation's refusals reports a correct refusal as a "
                        "missing object")
    problems = check_declarations(root, cfg) if written else []
    return [written_step, step("declarations-match", not problems,
                               "signatures, object model and contract agree" if not problems else
                               "; ".join(x["detail"] for x in problems[:4]) + (f" (+{len(problems) - 4} more)"
                                                          if len(problems) > 4 else ""))]


def incomplete_modules(root: Path) -> list[str]:
    """The completion ledger's modules with a status that is neither COMPLETE nor a dash."""
    out = []
    for r in first_table(root / "INSTRUMENTS" / "completion-ledger.md"):
        st = r.get("Status", "")
        if st and st.upper() != "COMPLETE" and not st.startswith("—"):
            out.append(f"{r.get('Module')} completion status {st}")
    return out


def final_findings(root: Path) -> list[tuple[int, dict]]:
    """(round, finding) for each blocking finding of the final review and the rounds after it (2.8.0): Phase 5 gaps."""
    return [(n, f) for n, v in from_final(root) for f in v.get("blocking") or [] if isinstance(f, dict)]


UNDECIDED = re.compile(r"\s*(?:[-—–]*|(?:open|pending)\b.*)", re.I | re.S)


def disposition(row: dict) -> str:
    """A RESOLUTION_RECORD row's Disposition cell, whatever its header's tail says."""
    return next((v for k, v in row.items() if k.startswith("Disposition")), "") or ""


def open_gates(root: Path) -> list[str]:
    """The owner gates still open: RESOLUTION_RECORD rows with no disposition (empty, a dash, open or pending), and
    STATE.json's blocked_on."""
    out = [f"open owner gate — {r['Gate']}" for r in first_table(root / "INSTRUMENTS" / "RESOLUTION_RECORD.md")
           if r.get("Gate") and UNDECIDED.fullmatch(disposition(r))]
    blocked = load_state(root).get("blocked_on")
    return out + ([f"open owner gate — STATE.json blocked_on: {blocked}"] if blocked else [])


def exceptions(cfg: dict) -> list[str]:
    """The object standard's switched-off rules, SR-1 entries among them: known issues carried into the seal record
    (the owner's ruling of 31 Oct 2026, Projects/CLAUDE.md rule 12)."""
    allow = (cfg.get("object_standard") or {}).get("allow") or {}
    return [f"known issue — object_standard.allow {path}: {', '.join(rules) if isinstance(rules, list) else rules} "
            f"(an SR-1 entry or a documented exception; K7 confirms the file meets the rule by hand)"
            for path, rules in sorted(allow.items())]


def carried_items(root: Path, cfg: dict, tables: dict) -> list[str]:
    """What the seal carries to Phase 5: the S3's production concerns, deferred vectors and deferred modules, the
    modules the completion ledger does not show complete, and (2.8.0) the final review's findings, the open owner
    gates and the object standard's exceptions."""
    carried: list[str] = []
    for r in tables.get("8. Production concerns", []):
        carried.append(f"{r.get('ID')} ({r.get('MOD')}) production concern — {r.get('Concern')} "
                       f"[{r.get('Class')}; owner {r.get('Owner')}; target {r.get('Discharge target')}]")
    for r in tables.get("6. Golden vectors (CT-5)", []):
        if r.get("State") == "DEFERRED":
            carried.append(f"{r.get('ID')} ({r.get('MOD')}) deferred vector — discharge: "
                           f"{r.get('Discharge condition')}")
    for r in tables.get("2. Resolved partition", []):
        if r.get("Status") == "DEFERRED":
            carried.append(f"{r.get('ID')} deferred module — {r.get('Module')}")
    findings = [f"final review finding (round {n}) — {f.get('module')} {f.get('check_id')}: {f.get('required_change')}"
                f" [a Phase 5 gap]" for n, f in final_findings(root)]
    return carried + incomplete_modules(root) + findings + open_gates(root) + exceptions(cfg)


def sweep(root: Path, cfg: dict) -> tuple[list[dict], list[str]]:
    steps = [step("worktree-clean", worktree_clean(root),
                  "" if worktree_clean(root) else "commit or stash first; a seal covers a committed tree")]
    steps += [reviewed_step(root, cfg), full_review_step(root, cfg)]
    steps += shell_steps(root, cfg) + tool_steps(root)
    s3, tables = s3_steps(root, cfg)
    steps += s3 + contract_steps(root, cfg)

    prior = latest_seal(root)
    if prior:
        steps.append(prior_seal_step(root, cfg, prior))
    return steps, carried_items(root, cfg, tables)


def print_sweep(steps: list[dict], carried: list[str]) -> None:
    for s in steps:
        mark = "PASS" if s["status"] == "pass" else "FAIL"
        print(f"  [{mark}] {s['step']:<18} {s['detail']}")
    print("\n  Carried forward (input to Phase 5's latency / scale / security review):")
    for c in carried or ["(nothing)"]:
        print(f"    - {c}")


# --------------------------------------------------------------------------- apply

def seal_section(tag: str, today: str, approved_by: str, cfg: dict, swept: tuple[list[dict], list[str]]) -> str:
    """The seal record's section for `tag`: the sweep, what the owner accepted as known issues, what is carried."""
    steps, carried = swept
    failed = [s["step"] for s in steps if s["status"] == "fail"]
    sec = [f"\n## {tag} — {today} — approved by {approved_by}\n",
           f"Sealed paths: files matching {', '.join(sealed_globs(cfg))} present at this tag.\n",
           "| Step | Result | Detail |", "|---|---|---|"]
    sec += [f"| {s['step']} | {s['status']} | {s['detail'].replace('|', '/')[:160]} |" for s in steps]
    if failed:
        sec += ["", "**Accepted as known issues (owner triage, see RESOLUTION_RECORD.md):** " + ", ".join(failed)]
    sec += ["", "**Carried forward:**", ""] + [f"- {c}" for c in carried or ["(nothing)"]]
    return "\n".join(sec) + "\n"


def append_seal_record(root: Path, section: str) -> None:
    """Append `section` to INSTRUMENTS/seal-record.md, a ledger, starting the file at the first seal."""
    rec = root / "INSTRUMENTS" / "seal-record.md"
    head = "" if rec.is_file() else (
        "# Seal record\n\nOne section per seal. Each lists the sweep result, what the owner "
        "accepted, and what is carried forward to Phase 5's latency / scale / security review.\n")
    rec.parent.mkdir(exist_ok=True)
    append_text_kept(rec, head + section)


def seal_state(root: Path, tag: str) -> None:
    """STATE.json as the seal commit holds it: phase 5, every git-derived field refreshed, and `tag`, which is cut just
    after the commit, as its seal and its last gate. Refreshed only after the tag, the committed STATE named the
    previous seal and K7 round (PipelineGate's seal-4, 440ded8, needed refresh commit 0b7458f). The repo's own
    tools/state.py writes it."""
    path = root / "tools" / "state.py"
    if not path.is_file():
        print("seal: tools/state.py is missing; STATE.json is committed as it stands", file=sys.stderr)
        return
    spec = importlib.util.spec_from_file_location("state", path)
    state = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(state)
    st = state.refresh(root, state.load(root))
    st.update(phase=5, current_module=None, seal_tag=tag, last_gate_tag=tag, reopened="", dirty=False,
              next_action=f"Phase 5 — Simulate: propose candidate features from {state.ui_root(root)}/surface-map.md")
    state.save(root, st, f"seal:{tag}")


def commit_seal(root: Path, tag: str, today: str, approved_by: str, ui: Path) -> None:
    """Retire a reopen this seal closes, write STATE, commit, and tag: the tree is clean after."""
    retire_reopen(root)
    seal_state(root, tag)
    git(root, "add", "-A", "--", "CLAUDE.md", "governance/archive", "INSTRUMENTS/seal-record.md",
        str(ui.relative_to(root)), "STATE.json", check=True)
    git(root, "commit", "-m", f"{tag}: library sealed ({approved_by}); Phase 5 contract installed",
        check=True)
    git(root, "tag", "-a", tag, "-m", f"Library sealed {today}, approved by {approved_by}",
        check=True)


def apply_refusal(root: Path, st: dict, contract: Path) -> str:
    """Why no seal can start, or "": the library is already sealed, or the Phase 5 contract is missing."""
    refusal = phase5_refusal(root, st)
    if refusal or contract.is_file():
        return refusal
    return (f"seal: {contract.relative_to(root)} missing; the Phase 5 contract is what "
            f"replaces the Phase 4 one. Install it from the phase4-build template.")


def sweep_refusal(steps: list[dict], accept_failures: bool) -> str:
    """Why the sweep refuses the seal, or "". A dirty tree or a broken prior seal is never a known issue."""
    failed = [s for s in steps if s["status"] == "fail"]
    if any(s["step"] in ("worktree-clean", "prior-seal-intact") for s in failed):
        return ("\nseal: refused — a dirty tree or a broken prior seal cannot be accepted "
                "as a known issue.")
    if failed and not accept_failures:
        return ("\nseal: refused — checks failed. Owner triage: fix now (one round), or record "
                "them as known issues in RESOLUTION_RECORD.md and re-run with --accept-failures.")
    return ""


def next_seal_tag(root: Path) -> str:
    n = int(latest_seal(root).split("-")[-1]) + 1 if latest_seal(root) else 1
    return f"seal-{n}"


def install_phase5_claude(root: Path, tag: str, concept: str, contract: Path) -> None:
    """Retire the Phase 4 resident contract to governance/archive/; install the Phase 5 one as CLAUDE.md."""
    claude = root / "CLAUDE.md"
    archive = root / "governance" / "archive" / f"CLAUDE-{tag}.md"
    archive.parent.mkdir(parents=True, exist_ok=True)
    if claude.is_file():
        archive.write_bytes(claude.read_bytes())
    write_text_kept(claude, f"# {concept} — Phase 5 (library sealed at `{tag}`)\n\n"
                      f"The engine build instruction is archived at "
                      f"`governance/archive/CLAUDE-{tag}.md`. Read it only to find operation "
                      f"names.\n\n" + contract.read_text(encoding="utf-8"))


def gap_rows(root: Path, tag: str) -> list[str]:
    """The final review's findings as gap-log rows (2.8.0): noticed, for Phase 5 to shape or withdraw."""
    rows = []
    for i, (n, f) in enumerate(final_findings(root), 1):
        text = f"{f.get('module')} {f.get('check_id')}: {f.get('required_change')}".replace("|", "/").replace("\n", " ")
        rows.append(f"| K7-{n}-{i} | (from the final review) | {text} | K7 round {n}, final review before {tag} | "
                    f"INSTRUMENTS/k7-verdict-{n}.json | noticed |")
    return rows


def add_gaps(ui: Path, rows: list[str]) -> None:
    """Append `rows` to the gap log's table, the first table headed `| ID |`; the file's other lines are kept."""
    if not rows:
        return
    path = ui / "gaps.md"
    lines = path.read_bytes().decode("utf-8").replace("\r\n", "\n").split("\n")
    head = next((i for i, x in enumerate(lines) if x.startswith("| ID |")), None)
    if head is None:
        lines += ["", "| ID | User job | Engine must decide / record / enforce | Walk it came from | Lookup evidence | "
                      "State |", "|---|---|---|---|---|---|"]
        head = len(lines) - 2
    end = head
    while end + 1 < len(lines) and lines[end + 1].startswith("|"):
        end += 1
    write_text_kept(path, "\n".join(lines[:end + 1] + rows + lines[end + 1:]))


def merge_into_main(root: Path, tag: str) -> str:
    """The owner's one approval also merges phase4 into main with --no-ff (2.8.0): what happened, in one line. The
    merge runs the commit checks (.githooks/pre-merge-commit); one that is refused is undone and left to the owner."""
    branch = git(root, "rev-parse", "--abbrev-ref", "HEAD")
    if branch != MERGE_FROM:
        return f"HEAD is on {branch or '(detached)'}, not {MERGE_FROM}: nothing merged into {MERGE_INTO}."
    if not git_ok(root, "rev-parse", "--verify", "--quiet", f"refs/heads/{MERGE_INTO}"):
        return f"no {MERGE_INTO} branch: nothing merged."
    if not git_ok(root, "checkout", "-q", MERGE_INTO):
        return (f"{MERGE_INTO} could not be checked out here (is it checked out in another worktree?); merge it there: "
                f"git merge --no-ff {MERGE_FROM}")
    if git_ok(root, "merge", "--no-ff", MERGE_FROM, "-m", f"{tag}: merge {MERGE_FROM} into {MERGE_INTO} (the owner's approval)"):
        return f"{MERGE_FROM} merged into {MERGE_INTO} with --no-ff; HEAD is on {MERGE_INTO}."
    git(root, "merge", "--abort")
    git(root, "checkout", "-q", MERGE_FROM)
    return (f"the merge into {MERGE_INTO} was refused (a conflict, or the commit checks); {MERGE_INTO} is unchanged and "
            f"HEAD is back on {MERGE_FROM}. Merge by hand: git checkout {MERGE_INTO}; git merge --no-ff {MERGE_FROM}")


def ui_skeleton(root: Path, cfg: dict) -> Path:
    """The UI tree, with each working file written where it is absent (the first seal)."""
    ui = root / (cfg.get("ui_root") or "ui")
    ui.mkdir(exist_ok=True)
    for name, body in (("gaps.md", GAPS_TEMPLATE), ("surface-map.md", SURFACE_TEMPLATE),
                       ("interface-contract.md", CONTRACT_TEMPLATE)):
        if not (ui / name).exists():
            write_text_kept(ui / name, body)
    return ui


def cmd_apply(root: Path, cfg: dict, approved_by: str, accept_failures: bool) -> int:
    st = load_state(root)
    contract = root / "governance" / "contracts" / "CLAUDE-phase5.md"
    refusal = apply_refusal(root, st, contract)
    if refusal:
        print(refusal, file=sys.stderr)
        return 1

    steps, carried = sweep(root, cfg)
    refusal = sweep_refusal(steps, accept_failures)
    if refusal:
        print_sweep(steps, carried)
        print(refusal, file=sys.stderr)
        return 1

    tag = next_seal_tag(root)
    today = datetime.now(timezone.utc).date().isoformat()
    concept = st.get("concept") or cfg.get("concept") or root.name

    # 1. Seal record (appended; INSTRUMENTS/ is ledger).
    append_seal_record(root, seal_section(tag, today, approved_by, cfg, (steps, carried)))

    # 2. Retire the Phase 4 resident contract; install the Phase 5 one.
    install_phase5_claude(root, tag, concept, contract)

    # 3. The UI tree's working files, if this is the first seal, and the final review's findings as gaps (2.8.0).
    ui = ui_skeleton(root, cfg)
    add_gaps(ui, gap_rows(root, tag))

    # 4. State, commit, tag. A reopen this seal closes leaves in the same commit.
    commit_seal(root, tag, today, approved_by, ui)
    files = sealed_files(root, tag, cfg)
    print(f"seal: {tag} applied — {len(files)} files frozen. Phase 5 contract installed; "
          f"STATE phase=5. Carried forward: {len(carried)} item(s), see INSTRUMENTS/seal-record.md.")

    # 5. The same approval merges the build into main (2.8.0).
    print(f"seal: {merge_into_main(root, tag)}")
    return 0


# --------------------------------------------------------------------------- extension

def cmd_begin_extension(root: Path, cfg: dict, s3: str, s2: str | None) -> int:
    tag = latest_seal(root)
    if not tag:
        print("seal: no seal-* tag; there is nothing to extend. Seal first.", file=sys.stderr)
        return 1
    if not worktree_clean(root):
        print("seal: working tree dirty; commit first.", file=sys.stderr)
        return 1
    for label, p in (("--s3", s3), ("--s2", s2)):
        if p is None:
            continue
        if not p.startswith("governance/S3/") or not git_ok(root, "ls-files", "--error-unmatch", p):
            print(f"seal: {label} {p} must be committed under governance/S3/ (the owner commits "
                  f"and tags the extension's Phase 3 export, as at the first anchor).",
                  file=sys.stderr)
            return 1
    contract = root / "governance" / "contracts" / "phase4-contract.md"
    if not contract.is_file():
        print(f"seal: {contract.relative_to(root)} missing.", file=sys.stderr)
        return 1

    write_text_kept(
        root / "CLAUDE.md",
        (root / s3).read_text(encoding="utf-8").rstrip("\n") + "\n\n---\n\n"
        + f"> Extension build over `{tag}`. Files present at `{tag}` are frozen (gate.py); "
        f"build new modules only.\n\n" + contract.read_text(encoding="utf-8"))

    pj = root / ".metaframework" / "project.json"
    data = load_cfg(root)
    data["s3_document"] = s3
    if s2:
        data["s2_document"] = s2
    write_text_kept(pj, json.dumps(data, indent=2, ensure_ascii=False) + "\n")

    subprocess.run([sys.executable, str(root / "tools" / "state.py"), "set", "phase=4",
                    "current_module=", f"next_action=Extension build over {tag}: run the C4 anchor on {s3}",
                    "--root", str(root)], capture_output=True, encoding="utf-8", errors="replace")
    git(root, "add", "-A", "--", "CLAUDE.md", ".metaframework/project.json", "STATE.json", check=True)
    git(root, "commit", "-m", f"begin extension over {tag}: {s3}", check=True)
    print(f"seal: extension started over {tag}. CLAUDE.md now carries {s3} plus the Phase 4 "
          f"contract; STATE phase=4. Next: the C4 anchor.")
    return 0


# --------------------------------------------------------------------------- reopen

REOPEN_NOTE = """\

## Reopened · {tag}

- **Ruling:** {ruling} (`INSTRUMENTS/RESOLUTION_RECORD.md`), approved by {approved_by}, recorded {at}.
- **Effect:** files sealed at `{tag}` are writable (`tools/gate.py`), and `seal.py verify` reports the
  seal as reopened with the files changed since, until the next seal. The next seal is a new tag: it
  closes the reopen and retires `.metaframework/reopen.json`. This section is appended, never edited.
"""


def ruling_recorded(root: Path, ruling: str) -> bool:
    """Whether INSTRUMENTS/RESOLUTION_RECORD.md names `ruling` as a whole ID: GOV-2 is not found in GOV-20."""
    rulings = root / "INSTRUMENTS" / "RESOLUTION_RECORD.md"
    text = rulings.read_text(encoding="utf-8") if rulings.is_file() else ""
    return re.search(rf"(?<![\w-]){re.escape(ruling)}(?![\w-])", text) is not None


def cmd_reopen(root: Path, approved_by: str, ruling: str) -> int:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from reopen import write_reopen
    tag = latest_seal(root)
    if not tag:
        print("seal: no seal-* tag; there is nothing to reopen.", file=sys.stderr)
        return 1
    if reopened(root, tag):
        print(f"seal: {tag} is already reopened.", file=sys.stderr)
        return 1
    if not ruling_recorded(root, ruling):
        print(f"seal: {ruling} is not in INSTRUMENTS/RESOLUTION_RECORD.md; record the owner's "
              f"ruling first.", file=sys.stderr)
        return 1
    at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    write_reopen(root, {"seal": tag, "ruling": ruling, "approved_by": approved_by, "at": at})
    append_seal_record(root, REOPEN_NOTE.format(tag=tag, ruling=ruling, approved_by=approved_by, at=at))
    subprocess.run([sys.executable, str(root / "tools" / "state.py"), "set",
                    f"next_action=Reopened under {ruling}: make the ruled change to the files sealed at "
                    f"{tag}, then re-seal (seal.py check, seal.py apply)", "--root", str(root)],
                   capture_output=True, encoding="utf-8", errors="replace")
    print(f"seal: {tag} reopened by {ruling} ({approved_by}). Sealed files are writable until "
          f"the next seal. Commit .metaframework/reopen.json and INSTRUMENTS/seal-record.md.")
    return 0


# --------------------------------------------------------------------------- commands

def run_declarations(root: Path, cfg: dict, a: argparse.Namespace) -> int:
    problems = check_declarations(root, cfg)
    if a.json:
        print(json.dumps({"status": "fail" if problems else "pass",
                          "problems": problems}, indent=2))
    else:
        for x in problems:
            print(f"{x['file']}: {x['detail']}")
    return 1 if problems else 0


def run_check(root: Path, cfg: dict, a: argparse.Namespace) -> int:
    steps, carried = sweep(root, cfg)
    ok = all(s["status"] == "pass" for s in steps)
    if a.json:
        print(json.dumps({"status": "pass" if ok else "fail", "steps": steps,
                          "carried": carried}, indent=2))
    else:
        print_sweep(steps, carried)
        print("\nseal check: " + ("pass — ready for the owner's seal decision" if ok else
              "fail — owner triage: fix now (one round), or known issue"))
    return 0 if ok else 1


def run_apply(root: Path, cfg: dict, a: argparse.Namespace) -> int:
    if not a.approved_by:
        print("seal: --approved-by is required. The seal is the owner's decision, "
              "recorded with their name and the date.", file=sys.stderr)
        return 2
    return cmd_apply(root, cfg, a.approved_by, a.accept_failures)


def run_begin_extension(root: Path, cfg: dict, a: argparse.Namespace) -> int:
    if not a.s3:
        print("seal: begin-extension needs --s3 governance/S3/<...>_Phase3.md", file=sys.stderr)
        return 2
    return cmd_begin_extension(root, cfg, a.s3, a.s2)


def run_reopen(root: Path, cfg: dict, a: argparse.Namespace) -> int:
    if not (a.approved_by and a.ruling):
        print("seal: reopen needs --approved-by WHO and --ruling ID, the owner's ruling as "
              "recorded in INSTRUMENTS/RESOLUTION_RECORD.md.", file=sys.stderr)
        return 2
    return cmd_reopen(root, a.approved_by, a.ruling)


def no_seal(a: argparse.Namespace) -> int:
    print("seal: no seal-* tag yet." if not a.json else json.dumps({"status": "pass", "seal": None}))
    return 0


def run_list(root: Path, cfg: dict, a: argparse.Namespace) -> int:
    tag = latest_seal(root)
    if not tag:
        return no_seal(a)
    print("\n".join(sorted(sealed_files(root, tag, cfg))))
    return 0


def report_reopened(tag: str, record: dict, changed: list[str], as_json: bool) -> int:
    if as_json:
        print(json.dumps({"status": "reopened", "seal": tag, "ruling": record.get("ruling"),
                          "approved_by": record.get("approved_by"), "changed": changed}))
    else:
        print(f"seal verify: {tag} reopened by {record.get('ruling')} "
              f"({record.get('approved_by')}); {len(changed)} sealed file(s) changed since. "
              f"The next seal closes the reopen.")
    return 0


def run_verify(root: Path, cfg: dict, a: argparse.Namespace) -> int:
    tag = latest_seal(root)
    if not tag:
        return no_seal(a)
    broken = changed_sealed(root, tag, cfg, a.ref)
    record = reopened(root, tag)
    if record:
        return report_reopened(tag, record, broken, a.json)
    if a.json:
        print(json.dumps({"status": "fail" if broken else "pass", "seal": tag, "changed": broken}))
    else:
        print(f"seal verify: {tag} intact" if not broken else
              f"seal verify: {tag} BROKEN — sealed files changed:\n  " + "\n  ".join(broken))
    return 1 if broken else 0


COMMANDS = {
    "check": run_check, "apply": run_apply, "verify": run_verify, "list": run_list,
    "begin-extension": run_begin_extension, "declarations": run_declarations,
    "reopen": run_reopen,
}


# --------------------------------------------------------------------------- main

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=list(COMMANDS))
    ap.add_argument("--root", default=".")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--approved-by")
    ap.add_argument("--accept-failures", action="store_true")
    ap.add_argument("--ref")
    ap.add_argument("--s3")
    ap.add_argument("--s2")
    ap.add_argument("--ruling")
    a = ap.parse_args()

    root = Path(a.root).resolve()
    if not (root / ".git").exists():
        print(f"seal: {root} is not a git repository", file=sys.stderr)
        return 2
    return COMMANDS[a.cmd](root, load_cfg(root), a)


if __name__ == "__main__":
    # A Windows console's code page cannot print every character a record holds: LedgerCore V2's sweep died on 'Φ' in
    # print_sweep after every step had run (2.8.0).
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
