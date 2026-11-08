#!/usr/bin/env python3
"""
emission-check — validates S2/S3 documents against the Emission Contract v1.0.

Fails on a renamed heading, a missing or reordered section, a wrong column set,
a malformed or duplicated ID, an unknown cross-reference, a status outside the
enum, a DEFERRED vector with no discharge condition, an orphaned object or
module, or an object mapped to more than one module.

Usage:
    emission-check.py CLAUDE_Foo_Phase2.md
    emission-check.py CLAUDE_Foo_Phase3.md --phase2 CLAUDE_Foo_Phase2.md
    emission-check.py <doc> [--phase2 <doc>] [--json]

Cross-document checks (every OBJ mapped exactly once) require --phase2 when
validating a Phase 3 document; without it those checks are skipped and reported.

Exit codes: 0 pass, 1 violations, 2 bad invocation.
"""

import argparse
import json
import re
import sys
from pathlib import Path

ID_RE = re.compile(r"^[A-Z]+-[0-9]{2,}$")
ENTITY_STATUS = {"PROPOSED", "ACTIVE", "DEFERRED", "DISCHARGED", "SUPERSEDED", "REFUSED"}
READINESS = {"NOT_STARTED", "BUILT", "COMPLETE", "BLOCKED"}
VECTOR_STATE = {"COMPUTED", "DEFERRED"}
DECIDES = {"YES", "NO"}
BINDING = {"INJECTED", "NAMED"}

# Added by the binding rule: a module that answers a business question (who may act,
# what is visible, which version is active, what time it is) is a DECIDER, and a seam
# into a decider must hand it in, never reach for it by name. Documents emitted before
# this rule carry neither column; they are noted, not failed.
# Added by the frozen test set (Amendment S-1): §5's Outcome names the guard element a
# refusal row covers in its module, which tools/test-set.py reads. Documents emitted
# before it are noted, not failed, the same way.
OPTIONAL_COLUMNS = {
    "2. Expressed Object Model": ["Decides"],
    "2. Resolved partition": ["Decides"],
    "4. Seam contracts": ["Binding"],
    "5. Refusal tests (CT-4)": ["Outcome"],
}
OUTCOME_TOKEN = re.compile(r"^[A-Z][A-Z0-9_.*-]*$")
HOOK_ID = re.compile(r"^HOOK-[0-9]{2,}$")

PHASE2 = {
    "name": "Phase 2",
    "filename": re.compile(r"^CLAUDE_.+_Phase2\.md$"),
    "headings": [
        "1. Concept and S1 provenance",
        "2. Expressed Object Model",
        "3. Admitted family",
        "4. Refused edges and abstractions",
        "5. Admitted exceptions",
        "6. Carried judgment for Phase 3",
        "7. Open questions",
    ],
    "tables": {
        "2. Expressed Object Model": {
            "columns": ["ID", "Node", "Kind", "Tag", "Traces to", "Status"],
            "id_prefix": "OBJ", "status_col": "Status", "status_enum": ENTITY_STATUS,
        },
        "4. Refused edges and abstractions": {
            "columns": ["ID", "Refused item", "Kind", "Reason", "Preserved as"],
            "id_prefix": None,
        },
        "5. Admitted exceptions": {
            "columns": ["ID", "Exception", "Scope", "Justification", "Status"],
            "id_prefix": "AE", "status_col": "Status", "status_enum": ENTITY_STATUS,
        },
    },
}

PHASE3 = {
    "name": "Phase 3",
    "filename": re.compile(r"^CLAUDE_.+_Phase3\.md$"),
    "headings": [
        "1. Disambiguation header",
        "2. Resolved partition",
        "3. Object-to-module map",
        "4. Seam contracts",
        "5. Refusal tests (CT-4)",
        "6. Golden vectors (CT-5)",
        "7. Hook manifest (CT-6)",
        "8. Production concerns",
        "9. Open decision gates",
        "10. Build order",
        "11. Module completion checklist",
    ],
    "tables": {
        "2. Resolved partition": {
            "columns": ["ID", "Module", "File", "Owns OBJ", "Status"],
            "id_prefix": "MOD", "status_col": "Status", "status_enum": ENTITY_STATUS,
        },
        "3. Object-to-module map": {
            "columns": ["OBJ", "MOD", "Role"], "id_prefix": None,
        },
        "4. Seam contracts": {
            "columns": ["ID", "Source MOD", "Target MOD", "Transferred value",
                        "Dependency requirement", "Validation rule"],
            "id_prefix": "SEAM",
        },
        "5. Refusal tests (CT-4)": {
            "columns": ["ID", "MOD", "Invariant", "Forbidden input",
                        "Expected rejection", "Test name"],
            "id_prefix": "REF",
        },
        "6. Golden vectors (CT-5)": {
            "columns": ["ID", "MOD", "Pinned value", "Rule", "Input", "Output",
                        "Encoding", "State", "Discharge condition"],
            "id_prefix": "VEC", "status_col": "State", "status_enum": VECTOR_STATE,
        },
        "7. Hook manifest (CT-6)": {
            "columns": ["ID", "MOD", "Trigger", "Condition", "Block action",
                        "Registered at"],
            "id_prefix": "HOOK",
        },
        "8. Production concerns": {
            "columns": ["ID", "MOD", "Concern", "Class", "Owner", "Discharge target"],
            "id_prefix": "PC",
        },
        "11. Module completion checklist": {
            "columns": ["MOD", "CT-1", "CT-2", "CT-3", "CT-4", "CT-5", "CT-6",
                        "PC enum", "Readiness"],
            "id_prefix": None, "status_col": "Readiness", "status_enum": READINESS,
        },
    },
}


def read_table(lines: list[str], i: int) -> tuple[list[str], list[dict], int]:
    """The table whose header is lines[i]: (columns, rows of that width, index of the line after it)."""
    cols = [c.strip() for c in lines[i].strip().strip("|").split("|")]
    i += 2
    rows = []
    while i < len(lines) and lines[i].strip().startswith("|"):
        vals = [c.strip() for c in lines[i].strip().strip("|").split("|")]
        if len(vals) == len(cols):
            rows.append(dict(zip(cols, vals)))
        i += 1
    return cols, rows, i


def parse(path: Path) -> tuple[list[str], dict[str, list[dict]]]:
    """Return (ordered level-2 headings, {heading: [row dicts]})."""
    headings: list[str] = []
    tables: dict[str, list[dict]] = {}
    current = None
    lines = path.read_text(encoding="utf-8").splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        if line.startswith("## "):
            current = line[3:].strip()
            headings.append(current)
            i += 1
            continue
        if line.startswith("|") and i + 1 < len(lines) and \
                re.match(r"^\|[\s\-:|]+\|$", lines[i + 1].strip()):
            cols, rows, i = read_table(lines, i)
            if current is not None:
                tables.setdefault(current, []).append({"__columns__": cols,
                                                       "__rows__": rows})
            continue
        i += 1
    return headings, tables


def v(f, rule, detail):
    return {"file": f, "rule": rule, "detail": detail}


def check(path: Path, spec: dict, phase2_path: Path | None) -> list[dict]:
    f = path.name
    out: list[dict] = []

    if not spec["filename"].match(f):
        out.append(v(f, "filename", f"expected {spec['filename'].pattern}"))

    headings, tables = parse(path)
    out.extend(check_headings(f, spec["headings"], headings))
    found, data = check_tables(f, spec["tables"], tables)
    out.extend(found)

    if spec is not PHASE3:
        return out
    out.extend(check_phase3(f, data, phase2_path))
    return out


def check_headings(f: str, wanted: list[str], headings: list[str]) -> list[dict]:
    """Every contract heading is present, in contract order."""
    got = [h for h in headings if h in wanted]
    out = [v(f, "heading_missing", f"'## {want}'") for want in wanted if want not in headings]
    if got != [h for h in wanted if h in got]:
        out.append(v(f, "heading_order",
                     "sections out of contract order; numbering is load-bearing "
                     "(completion-ledger cites S3 §11)"))
    return out


def check_tables(f: str, specs: dict, tables: dict) -> tuple[list[dict], dict[str, list[dict]]]:
    """Each contract table: present, with its columns, IDs well formed and never reused, statuses in the enum.
    Returns (violations, {section: rows} for every table whose columns conform)."""
    out: list[dict] = []
    seen_ids: dict[str, tuple] = {}
    data: dict[str, list[dict]] = {}
    for section, tspec in specs.items():
        blocks = tables.get(section)
        if not blocks:
            out.append(v(f, "table_missing", f"no table under '## {section}'"))
            continue
        mismatch = column_mismatch(f, section, tspec, blocks[0]["__columns__"])
        if mismatch:
            out.append(mismatch)
            continue
        data[section] = blocks[0]["__rows__"]
        out.extend(check_rows(f, section, tspec, data[section], seen_ids))
    return out, data


def column_mismatch(f: str, section: str, tspec: dict, cols: list[str]) -> dict | None:
    """The column_mismatch violation when `cols` is neither the contract's set nor it plus the optional columns."""
    extended = tspec["columns"] + OPTIONAL_COLUMNS.get(section, [])
    if cols in (tspec["columns"], extended):
        return None
    return v(f, "column_mismatch",
             f"'{section}' has {cols}, "
             f"contract requires {tspec['columns']}"
             + (f" (or {extended} with its optional columns)"
                if extended != tspec["columns"] else ""))


def check_rows(f: str, section: str, tspec: dict, rows: list[dict], seen_ids: dict) -> list[dict]:
    """One table's rows: the ID (where the table has one) and the status (where it has an enum)."""
    out: list[dict] = []
    sc = tspec.get("status_col")
    for n, row in enumerate(rows, 1):
        if tspec.get("id_prefix"):
            bad = id_violation(f, (section, n), row.get("ID", ""), tspec["id_prefix"], seen_ids)
            if bad:
                out.append(bad)
        if sc and row.get(sc, "") not in tspec["status_enum"]:
            out.append(v(f, "enum_value", f"'{section}' row {n}: {sc}="
                                          f"'{row.get(sc, '')}' not in "
                                          f"{sorted(tspec['status_enum'])}"))
    return out


def id_violation(f: str, at: tuple, rid: str, prefix: str, seen_ids: dict) -> dict | None:
    """What is wrong with the ID in row `at` = (section, n), or None, recording the ID as seen there."""
    section, n = at
    if not ID_RE.match(rid):
        return v(f, "id_format", f"'{section}' row {n}: '{rid}'")
    if not rid.startswith(prefix + "-"):
        return v(f, "id_format", f"'{section}' row {n}: '{rid}' "
                                 f"must use prefix {prefix}-")
    if rid in seen_ids:
        first = seen_ids[rid]
        where = (f"twice in '{section}' (rows {first[1]} and {n})"
                 if first[0] == section
                 else f"in '{first[0]}' row {first[1]} and '{section}' row {n}")
        return v(f, "id_duplicate", f"'{rid}' appears {where}; "
                                    f"IDs are never reused")
    seen_ids[rid] = at
    return None


# The (section, column) cells of a Phase 3 document that name a module, in the order they are checked.
MOD_REFERENCES = [
    ("5. Refusal tests (CT-4)", "MOD"), ("6. Golden vectors (CT-5)", "MOD"), ("7. Hook manifest (CT-6)", "MOD"),
    ("8. Production concerns", "MOD"), ("3. Object-to-module map", "MOD"),
    ("4. Seam contracts", "Source MOD"), ("4. Seam contracts", "Target MOD"),
    ("11. Module completion checklist", "MOD"),
]


def check_phase3(f: str, data: dict, phase2_path: Path | None) -> list[dict]:
    """Phase 3's cross-references: modules known, deferrals discharged, no orphan, deciders handed in, OBJs mapped."""
    mods = {r["ID"] for r in data.get("2. Resolved partition", []) if "ID" in r}
    out = check_module_refs(f, data, mods)
    out.extend(v(f, "deferred_without_discharge",
                 f"§6 row {n} ({row.get('ID')}): a deferred vector with no "
                 f"discharge condition is an omission, not a deferral")
               for n, row in enumerate(data.get("6. Golden vectors (CT-5)", []), 1)
               if row.get("State") == "DEFERRED" and not row.get("Discharge condition"))

    seamed = set()
    for row in data.get("4. Seam contracts", []):
        seamed.update({row.get("Source MOD", ""), row.get("Target MOD", "")})
    out.extend(v(f, "orphan_module", f"{m} is neither source nor target of any seam") for m in sorted(mods - seamed))

    out.extend(check_binding(f, data) + check_outcome(f, data))
    out.extend(check_mapping(f, data, phase2_path))
    return out


def check_module_refs(f: str, data: dict, mods: set) -> list[dict]:
    """Every module a Phase 3 table names is a module in §2."""
    out: list[dict] = []
    for section, col in MOD_REFERENCES:
        for n, row in enumerate(data.get(section, []), 1):
            val = row.get(col, "")
            if val and val not in mods:
                out.append(v(f, "id_unknown_reference",
                             f"'{section}' row {n}: {col}='{val}' is not a module in §2"))
    return out


def check_mapping(f: str, data: dict, phase2_path: Path | None) -> list[dict]:
    """§3 maps each object once, and (with --phase2) exactly the objects of Phase 2 §2."""
    mapped = [r.get("OBJ", "") for r in data.get("3. Object-to-module map", [])]
    out = [v(f, "object_mapped_twice",
             f"{o} appears {mapped.count(o)}x in §3; the invariant is "
             f"'exactly one Phase 3 destination'")
           for o in sorted({o for o in mapped if mapped.count(o) > 1})]
    out.extend(check_cross_document(f, mapped, phase2_path))
    return out


def check_cross_document(f: str, mapped: list[str], phase2_path: Path | None) -> list[dict]:
    """Every OBJ of Phase 2 §2 mapped in §3, and nothing else; noted as skipped without --phase2."""
    if phase2_path is None:
        return [v(f, "cross_document_skipped",
                  "--phase2 not supplied; 'every OBJ mapped exactly once' unverified")]
    _, p2t = parse(phase2_path)
    blocks = p2t.get("2. Expressed Object Model")
    objs = {r["ID"] for r in blocks[0]["__rows__"]} if blocks else set()
    out = [v(f, "orphan_object", f"{o} from Phase 2 §2 is not mapped in §3") for o in sorted(objs - set(mapped))]
    out.extend(v(f, "id_unknown_reference",
                 f"§3 maps '{o}', which is not an object in Phase 2 §2")
               for o in sorted(set(mapped) - objs - {""}))
    return out


def check_binding(f: str, data: dict) -> list[dict]:
    """A seam into a decider must be INJECTED. Unclassified documents are noted."""
    mods = data.get("2. Resolved partition", []) or data.get("2. Expressed Object Model", [])
    seams = data.get("4. Seam contracts", [])
    has_decides = any("Decides" in r for r in mods)
    has_binding = any("Binding" in r for r in seams)

    out = binding_values(f, mods, seams)
    if not seams:
        return out
    if has_binding and not has_decides:
        out.append(v(f, "decides_unclassified",
                     "§4 carries Binding but §2 has no Decides column; the decider-injection "
                     "rule cannot be checked"))
        return out
    if not has_binding:
        return out
    out.extend(deciders_by_name(f, mods, seams))
    return out


def binding_values(f: str, mods: list[dict], seams: list[dict]) -> list[dict]:
    """Each Decides cell is YES or NO; each Binding cell is INJECTED or NAMED."""
    out = [v(f, "decides_value", f"module row {n}: Decides='{r['Decides']}' "
                                 f"must be one of {sorted(DECIDES)}")
           for n, r in enumerate(mods, 1) if "Decides" in r and r["Decides"] not in DECIDES]
    out.extend(v(f, "binding_value", f"seam row {n}: Binding='{r['Binding']}' "
                                     f"must be one of {sorted(BINDING)}")
               for n, r in enumerate(seams, 1) if "Binding" in r and r["Binding"] not in BINDING)
    return out


def deciders_by_name(f: str, mods: list[dict], seams: list[dict]) -> list[dict]:
    """Each seam whose target decides (Decides=YES) but that reaches it by name instead of having it handed in."""
    deciders = {r.get("ID", "") for r in mods if r.get("Decides") == "YES"}
    return [v(f, "decider_called_by_name",
              f"seam row {n} ({r.get('ID')}): {r.get('Source MOD')} reaches "
              f"{r.get('Target MOD')} by name, but that module answers a business "
              f"question — it must be handed in (Binding=INJECTED)")
            for n, r in enumerate(seams, 1)
            if r.get("Target MOD") in deciders and r.get("Binding") != "INJECTED"]


OUTCOME_RULES = {
    "outcome_value": "must name the refusal outcome(s) the row observes, the invariant it guards, or one HOOK-nn",
    "id_unknown_reference": "must be one HOOK-nn that §7 holds",
}


def outcome_rule(cell: str, hooks: set) -> str | None:
    """The rule an Outcome cell breaks, or None. A token that is not an upper-case name (an empty
    cell, '—') breaks outcome_value; a HOOK-nn must stand alone and be one §7 holds."""
    tokens = [t.strip() for t in cell.split(",") if t.strip()]
    if not tokens or not all(map(OUTCOME_TOKEN.match, tokens)):
        return "outcome_value"
    named = list(filter(HOOK_ID.match, tokens))
    if named and (len(tokens) > 1 or named[0] not in hooks):
        return "id_unknown_reference"
    return None


def check_outcome(f: str, data: dict) -> list[dict]:
    """§5's Outcome, where present: outcome names (or the invariant a row with no named outcome
    guards), or one HOOK-nn from §7. Never empty: test-set.py reads it as the guard element."""
    hooks = {r.get("ID", "") for r in data.get("7. Hook manifest (CT-6)", [])}
    out: list[dict] = []
    for n, r in enumerate(data.get("5. Refusal tests (CT-4)", []), 1):
        rule = outcome_rule(r["Outcome"], hooks) if "Outcome" in r else None
        if rule:
            out.append(v(f, rule, f"§5 row {n} ({r.get('ID')}): Outcome='{r['Outcome']}' {OUTCOME_RULES[rule]}"))
    return out


def notes_for(path: Path, violations: list[dict]) -> list[str]:
    """The rules a document emitted before them leaves unchecked: noted, never failed."""
    notes = []
    text = path.read_text(encoding="utf-8")
    if not any(x["rule"].startswith(("decider_", "decides_", "binding_")) for x in violations):
        if "| Binding |" not in text and "| Decides |" not in text:
            notes.append("emitted before the binding rule: no Decides/Binding columns, so "
                         "'a decider is handed in, never reached by name' is unchecked here")
    refusals = parse(path)[1].get("5. Refusal tests (CT-4)")
    if "Phase3" in path.name and refusals and "Outcome" not in refusals[0]["__columns__"]:
        notes.append("emitted before the Outcome column: §5 does not name each row's guard "
                     "element, so tools/test-set.py needs the outcome supplied by its config "
                     "(pre_outcome; governance/test-set.md)")
    return notes


def spec_for(path: Path) -> dict | None:
    """The contract the filename names (Phase3 or Phase2), or None."""
    return PHASE3 if "Phase3" in path.name else PHASE2 if "Phase2" in path.name else None


def invocation_problem(path: Path, p2: Path | None) -> str | None:
    """Why the document (and --phase2) cannot be checked, or None."""
    if not path.is_file():
        return f"no such file: {path}"
    if spec_for(path) is None:
        return ("cannot infer phase; filename must contain "
                "Phase2 or Phase3")
    if p2 and not p2.is_file():
        return f"no such file: {p2}"
    return None


def print_result(path: Path, spec: dict, violations: list[dict], notes: list[str]) -> None:
    """The text report: each violation, each note, then the count or the pass line."""
    for x in violations:
        print(f"{x['file']}: [{x['rule']}] {x['detail']}")
    for n in notes:
        print(f"{path.name}: [note] {n}")
    print(f"\n{len(violations)} violation(s)." if violations
          else f"emission-check: {spec['name']} document conforms.")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("document")
    ap.add_argument("--phase2", help="Phase 2 doc, for cross-document checks")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    path = Path(args.document)
    p2 = Path(args.phase2) if args.phase2 else None
    problem = invocation_problem(path, p2)
    if problem:
        print(f"emission-check: {problem}", file=sys.stderr)
        return 2

    spec = spec_for(path)
    violations = check(path, spec, p2)
    notes = notes_for(path, violations)
    result = {"status": "fail" if violations else "pass", "violations": violations,
              "notes": notes}

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print_result(path, spec, violations, notes)
    return 1 if violations else 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")      # every tool writes UTF-8 (2.8.0)
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
