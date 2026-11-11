"""Emit CLAUDE_TABLETOP_G1_Phase3.md (TE-5: assembly and id minting are a script).

Run from anywhere:  python docs/ext-G1/phase3/emit_phase3.py
Reads the facet slices and S5's tables (rows by local id; S5's cuts and changed cells applied), mints SEAM, REF, VEC,
HOOK and PC ids above the sealed record's in source order, maps S1 hook ids to the minted HOOK ids in Outcome cells,
builds §3 from the S2 node table and the frame's §2, and §11 from the minted rows. Prints each input's sha256.
"""
import hashlib
import re
from pathlib import Path

import slice as sl

HERE = Path(__file__).resolve().parent
SOURCES = ["facets/FA.md", "facets/FB.md", "S5-synthesis.md"]
S2 = HERE.parent / "phase2" / "CLAUDE_TABLETOP_G1_Phase2.md"
FRAME, OUT = HERE / "emission-frame.md", HERE / "CLAUDE_TABLETOP_G1_Phase3.md"
KINDS = {"Target MOD": ("seams", "SEAM", 46), "Invariant": ("refusals", "REF", 25),
         "Pinned value": ("vectors", "VEC", 10), "Trigger": ("hooks", "HOOK", 13), "Concern": ("concerns", "PC", 10)}
S1_COL = {"refusals": "S1 case", "vectors": "S1 vector", "hooks": "S1 hook", "concerns": "S1"}
LOCAL = re.compile(r"\b(?:FA|FB|S5)\.[SRVHP]\d+\b")
XH = re.compile(r"^XH-\d\d$")
BLOCKED = {"MOD-45", "MOD-46", "MOD-47", "MOD-49"}  # buildable; COMPLETE waits on ODG-g9, the films, ODG-g8 (S3 §11)


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def table_role(head: list[str]) -> str:
    """The kind of rows a table holds, 'cuts', 'changes' or '' for a table's header."""
    if head[:2] == ["Local id", "Change"]:
        return "cuts"
    if head[:3] == ["Local id", "Column", "Value"]:
        return "changes"
    kind = KINDS.get(head[2]) if head[0] == "Local id" and len(head) > 2 else None
    return kind[0] if kind else ""


def take_cuts(acc: dict, head: list[str], body: list) -> None:
    acc["cuts"] |= {r[0] for r in body if r[1] == "drop"}


def take_changes(acc: dict, head: list[str], body: list) -> None:
    acc["changes"] += [tuple(r[:3]) for r in body]


def take_rows(acc: dict, head: list[str], body: list) -> None:
    acc["rows"][table_role(head)] += [dict(zip(head, r)) for r in body]


TAKERS = {"cuts": take_cuts, "changes": take_changes, "": lambda acc, head, body: None}


def read_sources() -> dict:
    """{'rows': {kind: [row dict]}, 'cuts': local ids, 'changes': [(local id, column, value)]}."""
    acc = {"rows": {k[0]: [] for k in KINDS.values()}, "cuts": set(), "changes": []}
    for name in SOURCES:
        for head, body in sl.tables((HERE / name).read_text(encoding="utf-8").splitlines()):
            TAKERS.get(table_role(head), take_rows)(acc, head, body)
    return acc


def mint(rows: dict, cuts: set, changes: list) -> dict:
    """Apply the cuts and changed cells; give each kept row its contract id. {local id: minted id}."""
    ids = {}
    for kind, prefix, first in KINDS.values():
        kept = [r for r in rows[kind] if r["Local id"] not in cuts]
        for n, r in enumerate(kept):
            ids[r["Local id"]] = r["ID"] = f"{prefix}-{first + n:02d}"
        rows[kind] = kept
    by_local = {r["Local id"]: r for kind in rows.values() for r in kind}
    for local, column, value in changes:
        if local in by_local:
            by_local[local][column] = value
    return ids


def relink(rows: dict, ids: dict) -> None:
    """Local ids inside cells become minted ids; a hook-only Outcome's S1 hook becomes its HOOK id."""
    hooks = {r["S1 hook"]: r["ID"] for r in rows["hooks"]}
    for kind in rows.values():
        for r in kind:
            for col, val in r.items():
                r[col] = LOCAL.sub(lambda m: ids.get(m.group(0), m.group(0)), val)
    for r in rows["refusals"]:
        r["Outcome"] = hooks.get(r["Outcome"], r["Outcome"]) if XH.match(r["Outcome"]) else r["Outcome"]
        r["Test name"] = r["Test name"].strip("`")
        cases = re.findall(r"\bXR-\d\d\b", r.get("S1 case", ""))
        r["Invariant"] += f"; S1 {', '.join(cases)}" if cases else ""


def render(columns: list[str], rows: list[dict]) -> str:
    lines = ["| " + " | ".join(columns) + " |", "|" + "---|" * len(columns)]
    return "\n".join(lines + ["| " + " | ".join(r.get(c, "") for c in columns) + " |" for r in rows])


def s1_index(rows: list[dict], column: str) -> str:
    """'S1 → S3: XR-01 → REF-25; …' for the rows that cite an S1 id."""
    pairs = {}
    for r in rows:
        for s1 in re.findall(r"\bX(?:R|V|H|PC)-\d\d\b", r.get(column, "")):
            pairs.setdefault(s1, []).append(r["ID"])
    return "S1 → S3: " + "; ".join(f"{k} → {', '.join(v)}" for k, v in sorted(pairs.items())) + "."


def frame_modules(frame: str) -> list[dict]:
    lines = frame.splitlines()
    return next([dict(zip(h, r)) for r in body] for h, body in sl.tables(lines) if h[:2] == ["ID", "Module"])


def object_map(modules: list[dict]) -> str:
    """§3: each OBJ once, its module, and 'Node — kind; Decides X' from the S2 node table."""
    owner = {o: m["ID"] for m in modules for o in re.findall(r"OBJ-\d\d", m["Owns OBJ"])}
    s2 = S2.read_text(encoding="utf-8").splitlines()
    nodes = next(body for h, body in sl.tables(s2) if h[:3] == ["ID", "Node", "Kind"])
    out = [{"OBJ": n[0], "MOD": owner[n[0]], "Role": f"{n[1]} — {re.split(r' \(|;', n[2])[0]}; Decides {n[6]}"}
           for n in nodes]
    assert len(out) == len(owner) == 49, (len(out), len(owner))
    return render(["OBJ", "MOD", "Role"], out)


def owned(rows: dict, kind: str, mod: str) -> str:
    return ", ".join(r["ID"] for r in rows[kind] if r["MOD"] == mod) or "—"


def checklist(modules: list[dict], rows: dict) -> str:
    out = []
    for m in (m for m in modules if int(m["ID"][4:]) >= 36):
        mod = m["ID"]
        out.append({"MOD": mod, "CT-1": "traces §3" if "OBJ-" in m["Owns OBJ"] else "S2 §6 (the package)",
                    "CT-2": "§1 Do not; S5 rulings", "CT-3": "none invented (S5)",
                    "CT-4": owned(rows, "refusals", mod), "CT-5": owned(rows, "vectors", mod),
                    "CT-6": owned(rows, "hooks", mod), "PC enum": owned(rows, "concerns", mod),
                    "Readiness": "BLOCKED" if mod in BLOCKED else "NOT_STARTED"})
    return render(["MOD", "CT-1", "CT-2", "CT-3", "CT-4", "CT-5", "CT-6", "PC enum", "Readiness"], out)


def grammar(hooks: list[dict]) -> str:
    return "\n".join(f"HOOK {h['ID']} @{h['Trigger'].lstrip('@')} {{ condition: {h['Condition']}, "
                     f"BLOCK: {h['Block action']} }}" for h in hooks)


COLUMNS = {"seams": ["ID", "Source MOD", "Target MOD", "Transferred value", "Dependency requirement",
                     "Validation rule", "Binding"],
           "refusals": ["ID", "MOD", "Invariant", "Forbidden input", "Expected rejection", "Test name", "Outcome"],
           "vectors": ["ID", "MOD", "Pinned value", "Rule", "Input", "Output", "Encoding", "State",
                       "Discharge condition"],
           "hooks": ["ID", "MOD", "Trigger", "Condition", "Block action", "Registered at"],
           "concerns": ["ID", "MOD", "Concern", "Class", "Owner", "Discharge target"]}


def bodies(rows: dict, modules: list[dict]) -> dict:
    out = {k: render(cols, rows[k]) for k, cols in COLUMNS.items()}
    for k, col in S1_COL.items():
        out[k] += "\n\n" + s1_index(rows[k], col)
    out["hooks"] += "\n\n```\n" + grammar(rows["hooks"]) + "\n```"
    out["map"], out["checklist"] = object_map(modules), checklist(modules, rows)
    return out


def main() -> None:
    acc = read_sources()
    rows = acc["rows"]
    ids = mint(rows, acc["cuts"], acc["changes"])
    relink(rows, ids)
    frame = LOCAL.sub(lambda m: ids.get(m.group(0), m.group(0)), FRAME.read_text(encoding="utf-8"))
    for marker, body in bodies(rows, frame_modules(frame)).items():
        tag = f"<!-- TABLE {marker} -->"
        assert frame.count(tag) == 1, tag
        frame = frame.replace(tag, body)
    OUT.write_text(frame, encoding="utf-8", newline="\n")
    for name in SOURCES + ["emission-frame.md"]:
        print(f"input  {name}  sha256 {sha(HERE / name)}")
    print(f"wrote  {OUT.name}  sha256 {sha(OUT)}  " + ", ".join(f"{k} {len(v)}" for k, v in rows.items()))


if __name__ == "__main__":
    main()
