#!/usr/bin/env python3
"""test-set: the frozen test set's set-cover analysis over an S3's §5 (Amendment S-1, TS-5).

    python tools/test-set.py S3.md [--config CONFIG] [--s1 S1.md] [--modules MOD-01,MOD-02]
                             [--out FILE] [--json]

Reads §5 Refusal tests (CT-4) of a Phase 3 document and gives every row one disposition:
critical (it gates COMPLETE), cut (it stays in §5 as the record and gates nothing), or the
positive suite. The method is governance/test-set.md:

  1. A guard element is (module, Outcome). A row that names no outcome is keyed by the
     invariant it cites.
  2. The critical set is a minimal set cover of each module's guard elements. It prefers a row
     that carries an S1 case; an S1 case decides which row covers an element, never whether.
  3. Shared guards are tested in full at their owner modules. A calling module keeps one wiring
     row, or none where the config says a hook proves the wrapping.
  4. A row whose Outcome is a HOOK-nn duplicates that hook's show-it-blocks test (CT-6).
  5. The S1 floor: every S1 test group the rows cite keeps at least one row.
  6. No guard element is dropped: each is covered by a kept row in its module, by its shared
     guard's owner, or by its HOOK row. A dropped one is exit 1.

The config is JSON, approved by the lead, and holds the judgment calls: the S1 case pattern,
shared-guard owners, misfiled positives and, for an S3 emitted before the Outcome column, how
the outcome is supplied (`pre_outcome`, with --s1 for the outcome vocabulary). Phase 3 runs the
plugin's copy of this file before its human gate; Phase 4 runs it when the lead freezes a
stretch, with --modules for that stretch's modules.

Exit: 0 every guard element is covered; 1 one would be dropped, or the config or an Outcome cell
is inconsistent with §5 (named on stderr); 2 a usage error or an unreadable document.
Standard library only.
"""

from __future__ import annotations

import argparse
import collections
import json
import re
import sys
from pathlib import Path

SECTION5 = "5. Refusal tests (CT-4)"
SECTION7 = "7. Hook manifest (CT-6)"
COLUMNS = ["ID", "MOD", "Invariant", "Forbidden input", "Expected rejection", "Test name"]
DEFAULT_CASE = r"\bT-[0-9]+\b"
TOKEN = re.compile(r"^[A-Z][A-Z0-9_.*-]*$")
HOOK_ID = re.compile(r"^HOOK-[0-9]{2,}$")
EMPTY = ("", "—", "-")
NAME = re.compile(r"\b[A-Z][A-Z0-9_]{3,}\b")             # an outcome named in an Expected rejection
S1_NAME = re.compile(r"\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b")    # an UPPER_SNAKE name in the S1 document
KEPT = ("critical", "wiring", "restored")
LABELS = {"critical": "critical", "wiring": "critical (wiring row: proves the call)",
          "variant": "cut: variant of a kept row", "hook": "cut: covered by its HOOK row",
          "positive": "positive suite"}
RESULT = (("Critical path (gates COMPLETE)", "keep"),
          ("Cut: variant of a kept row (same guard, same module, another input)", "variant"),
          ("Cut: covered by its HOOK row (the hook's own show-it-blocks test)", "hook"),
          ("Cut: shared guard re-tested in a calling module", "shared"),
          ("Moved to the positive suite (not refusal tests)", "positive"))


class TestSetError(Exception):
    """A config or an Outcome cell that does not agree with the S3 it is run against."""


def tables(text: str) -> dict:
    """{level-2 heading: (columns, rows)}: the first table under each heading, rows as dicts."""
    found: dict = {}
    heading, lines = None, text.splitlines()
    for i, line in enumerate(lines):
        if line.startswith("## "):
            heading = line[3:].strip()
        elif heading and heading not in found and is_table_start(lines, i):
            found[heading] = table_at(lines, i)
    return found


def is_table_start(lines: list, i: int) -> bool:
    return (lines[i].startswith("|") and i + 1 < len(lines)
            and re.match(r"^\|[\s\-:|]+\|$", lines[i + 1].strip()) is not None)


def cells(line: str) -> list:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def table_at(lines: list, i: int) -> tuple:
    cols, rows = cells(lines[i]), []
    for line in lines[i + 2:]:
        if not line.strip().startswith("|"):
            break
        vals = cells(line)
        if len(vals) == len(cols):
            rows.append(dict(zip(cols, vals)))
    return cols, rows


def read_s3(path: Path) -> tuple:
    """(§5 rows, §7's HOOK rows as {ID: Condition}, whether §5 carries the Outcome column)."""
    found = tables(path.read_text(encoding="utf-8"))
    if SECTION5 not in found:
        raise OSError(f"{path.name} has no table under '## {SECTION5}'")
    cols, raw = found[SECTION5]
    if cols not in (COLUMNS, COLUMNS + ["Outcome"]):
        raise OSError(f"{path.name} section 5 has columns {cols}; run tools/emission-check.py first")
    hooks = {r.get("ID", ""): r.get("Condition", "") for r in found.get(SECTION7, ((), []))[1]}
    rows = [{"id": r["ID"], "mod": r["MOD"], "inv": r["Invariant"], "exp": r["Expected rejection"],
             "outcome": r.get("Outcome")} for r in raw]
    return rows, hooks, "Outcome" in cols


CONFIG_KEYS = {"": {"about", "s1_case", "shared_guards", "misfiled_positives", "pre_outcome"},
               "s1_case": {"pattern", "suite_groups"},
               "shared_guards[]": {"name", "outcomes", "owners", "wiring_row", "why"},
               "pre_outcome": {"vocabulary", "hook_pattern", "hook_ids", "outcomes"},
               "pre_outcome.vocabulary": {"add", "drop", "prefixes"}}


def known_keys(obj: object, where: str) -> None:
    """A config key the tool does not read is a typo that would silently drop a rule: refused."""
    if not isinstance(obj, dict):
        raise ValueError(f"config {where or 'root'} must be a JSON object")
    extra = sorted(set(obj) - CONFIG_KEYS[where])
    if extra:
        raise ValueError(f"config {where or 'root'} has keys {extra}; it reads {sorted(CONFIG_KEYS[where])}")


def check_config(cfg: object) -> None:
    known_keys(cfg, "")
    known_keys(cfg.get("s1_case") or {}, "s1_case")
    for g in cfg.get("shared_guards") or []:
        known_keys(g, "shared_guards[]")
    known_keys(cfg.get("pre_outcome") or {}, "pre_outcome")
    known_keys((cfg.get("pre_outcome") or {}).get("vocabulary") or {}, "pre_outcome.vocabulary")


def load_config(path: Path | None) -> dict:
    """The run's config with every key defaulted. A config the tool cannot read is a usage error."""
    cfg = json.loads(path.read_text(encoding="utf-8")) if path else {}
    check_config(cfg)
    case = cfg.get("s1_case") or {}
    return {"case": re.compile(case.get("pattern") or DEFAULT_CASE),
            "suite_groups": set(case.get("suite_groups") or []),
            "shared": [shared_guard(g) for g in cfg.get("shared_guards") or []],
            "positives": set(cfg.get("misfiled_positives") or []),
            "pre": cfg.get("pre_outcome") or {}}


def shared_guard(g: dict) -> dict:
    """One shared guard: its outcomes, its owner modules, and whether a caller keeps a wiring row."""
    if not g.get("name") or not g.get("outcomes") or not g.get("owners"):
        raise ValueError(f"a shared guard needs name, outcomes and owners: {g}")
    return {"name": g["name"], "outcomes": set(g["outcomes"]), "owners": set(g["owners"]),
            "wiring": bool(g.get("wiring_row", True))}


def parse_outcome(row: dict, cell: str, hooks: dict) -> None:
    """An Outcome cell: refusal names (or the invariant ID a row with no named outcome guards), a HOOK-nn alone,
    or empty, when the row is keyed by its invariant."""
    tokens = [t.strip() for t in cell.split(",") if t.strip() not in EMPTY]
    bad = [t for t in tokens if not TOKEN.match(t)]
    if bad:
        raise TestSetError(f"{row['id']}: Outcome '{cell}' holds {bad}, which are not outcome names")
    if any(HOOK_ID.match(t) for t in tokens):
        if len(tokens) > 1 or tokens[0] not in hooks:
            raise TestSetError(f"{row['id']}: Outcome '{cell}' must be one HOOK-nn that section 7 holds")
        row["hook"] = tokens[0]
        return
    row["names"] = sorted(set(tokens))


def vocabulary(pre: dict, s1_text: str) -> tuple:
    """(names, prefixes) a pre-Outcome row's Expected rejection is read against."""
    voc = pre.get("vocabulary") or {}
    names = (set(S1_NAME.findall(s1_text)) | set(voc.get("add") or [])) - set(voc.get("drop") or [])
    return names, tuple(voc.get("prefixes") or ())


def derive_outcome(row: dict, voc: tuple, hook: tuple) -> None:
    """A pre-Outcome row: the names its Expected rejection gives from the vocabulary; else, when the config's hook
    pattern matches it, the §7 HOOK row it names; else keyed by its invariant. A row worded as a hook's that names
    no HOOK row stays in the cover: LedgerCore V2 cut three such rows to hooks that did not guard them (K7 round 12)."""
    names, prefixes = voc
    pattern, ids, hooks = hook
    row["names"] = sorted({n for n in NAME.findall(row["exp"]) if n in names or n.startswith(prefixes)})
    if not row["names"] and pattern and pattern.search(row["exp"]):
        row["hook"] = named_hook(row["inv"] + " " + row["exp"], ids, hooks)


def named_hook(text: str, ids: re.Pattern | None, hooks: dict) -> str | None:
    """The §7 HOOK row a row's text names: a HOOK-nn §7 holds, else the first HOOK row whose Condition carries a
    hook check ID (the config's hook_ids) the text cites. None when it names none."""
    cited = sorted(t for t in re.findall(r"\bHOOK-[0-9]{2,}\b", text) if t in hooks)
    if cited or ids is None:
        return cited[0] if cited else None
    checks = {m.group(0) for m in ids.finditer(text)}
    return next((h for h, cond in hooks.items() if checks & {m.group(0) for m in ids.finditer(cond)}), None)


def outcomes(rows: list, has_column: bool, cfg: dict, hooks: dict, s1_text: str) -> None:
    """Set each row's names and hook, from the Outcome column or, before it, as the config supplies them."""
    pre = cfg["pre"]
    voc = vocabulary(pre, s1_text)
    hook = (re.compile(pre["hook_pattern"], re.I) if pre.get("hook_pattern") else None,
            re.compile(pre["hook_ids"]) if pre.get("hook_ids") else None, hooks)
    given = pre.get("outcomes") or {}
    for r in rows:
        r.update(names=[], hook=None)
        if has_column or r["id"] in given:
            parse_outcome(r, given.get(r["id"], r["outcome"] or ""), hooks)
        else:
            derive_outcome(r, voc, hook)


def invariant_key(row: dict) -> str:
    return "§" + re.split(r" —|;|,", row["inv"])[0].strip()


def annotate(rows: list, cfg: dict) -> None:
    """Each row's S1 cases, whether it rests on none, its guard elements and its first class."""
    for r in rows:
        r["cases"] = sorted(set(cfg["case"].findall(r["inv"])))
        r["derived"] = "derived" in (r["inv"] + r["exp"]).lower() or not r["cases"]
        key = [r["hook"]] if r["hook"] else [invariant_key(r)]
        r["elems"] = [(r["mod"], n) for n in r["names"] or key]
        r["cls"] = "positive" if r["id"] in cfg["positives"] else ("hook" if r["hook"] else None)


def cover(rows: list) -> None:
    """A minimal cover of the guard elements, greedily: the row covering most of what is left, then one with an S1
    case, then the lowest ID. Every other candidate is a variant."""
    cand = [r for r in rows if r["cls"] is None]
    left = {e for r in cand for e in r["elems"]}
    chosen = set()
    while left:
        best = max(cand, key=lambda r: (len(set(r["elems"]) & left), not r["derived"], -ref_number(r)))
        chosen.add(best["id"])
        left -= set(best["elems"])
    for r in cand:
        r["cls"] = "critical" if r["id"] in chosen else "variant"


def ref_number(row: dict) -> int:
    digits = re.sub(r"\D", "", row["id"])
    return int(digits) if digits else 0


def shared_group(row: dict, groups: list) -> dict | None:
    """The shared guard a critical row in a calling module re-tests, if any."""
    for g in groups:
        if row["names"] and set(row["names"]) <= g["outcomes"] and row["mod"] not in g["owners"]:
            return g
    return None


def apply_shared(rows: list, groups: list) -> None:
    """A calling module's first critical row on a shared guard is its wiring row; the rest are cut."""
    wired = set()
    for r in rows:
        g = shared_group(r, groups) if r["cls"] == "critical" else None
        if g is None:
            continue
        if g["wiring"] and (r["mod"], g["name"]) not in wired:
            wired.add((r["mod"], g["name"]))
            r["cls"] = "wiring"
        else:
            r["cls"], r["group"] = "shared", g["name"]


def s1_floor(rows: list, suites: set) -> list:
    """Restore the only carrier of an S1 test group no kept row cites. Returns [(REF, groups)]."""
    kept = {t for r in rows if r["cls"] in KEPT for t in r["cases"]}
    restored = []
    for r in rows:
        if r["cls"] in ("variant", "hook", "shared"):
            lone = [t for t in r["cases"] if t not in kept and t not in suites]
            if lone:
                r["cls"] = "restored"
                kept |= set(r["cases"])
                restored.append((r["id"], lone))
    return restored


def label(row: dict, suites: set) -> str:
    if row["cls"] == "restored":
        return "critical (restored: only carrier of " + ", ".join(t for t in row["cases"] if t not in suites) + ")"
    if row["cls"] == "shared":
        return f"cut: shared guard tested at its owner ({row['group']})"
    if row["cls"] == "hook":
        return f"cut: covered by its HOOK row ({row['hook']})"
    return LABELS[row["cls"]]


def kind(row: dict) -> str:
    """keep, variant, hook, shared or positive: the Result table's line for this row."""
    return "keep" if row["cls"] in KEPT else row["cls"]


def owner_covers(e: tuple, kept: set, groups: list) -> bool:
    """Whether a shared guard's owner module keeps a row on this element's outcome."""
    mod, name = e
    return any(name in g["outcomes"] and mod not in g["owners"]
               and any((o, name) in kept for o in g["owners"]) for g in groups)


def elements_of(rows: list, classes: set) -> set:
    """The guard elements of the rows whose class is one of `classes`."""
    return {e for r in rows if r["cls"] in classes for e in r["elems"]}


def uncovered(rows: list, groups: list) -> list:
    """Guard elements no kept row, shared-guard owner or HOOK row covers: what the dedupe would drop."""
    kept = elements_of(rows, set(KEPT))
    covered = kept | elements_of(rows, {"hook"})
    guarded = elements_of(rows, {r["cls"] for r in rows} - {"positive"})
    return sorted(e for e in guarded - covered if not owner_covers(e, kept, groups))


def analyse(s3: Path, cfg: dict, s1_text: str) -> dict:
    """Every row's disposition, the counts, and what would be dropped (nothing, or exit 1)."""
    rows, hooks, has_column = read_s3(s3)
    unknown = sorted(cfg["positives"] - {r["id"] for r in rows})
    if unknown:
        raise TestSetError(f"misfiled_positives names {unknown}, which section 5 does not hold")
    outcomes(rows, has_column, cfg, hooks, s1_text)
    annotate(rows, cfg)
    cover(rows)
    apply_shared(rows, cfg["shared"])
    restored = s1_floor(rows, cfg["suite_groups"])
    for r in rows:
        r["final"] = label(r, cfg["suite_groups"])
    return {"rows": rows, "restored": restored, "has_column": has_column, "dropped": uncovered(rows, cfg["shared"])}


def guard_text(row: dict) -> str:
    if row["names"]:
        return ", ".join(row["names"])
    return row["hook"] or row["inv"].split(" —")[0]


def counts(rows: list) -> dict:
    c = collections.Counter(kind(r) for r in rows)
    return {k: c.get(k, 0) for _, k in RESULT} | {"no_s1_case": sum(kind(r) == "keep" and r["derived"] for r in rows)}


def module_line(mod: str, rows: list) -> str:
    rs = [r for r in rows if r["mod"] == mod]
    c = counts(rs)
    vals = [len(rs), c["keep"], c["variant"], c["hook"], c["shared"], c["positive"], c["no_s1_case"]]
    return f"| {mod} | " + " | ".join(map(str, vals)) + " |"


def in_view(result: dict, shown: list) -> tuple:
    """(guard elements, dropped ones) of the modules shown: a stretch's report counts its own."""
    mods = {r["mod"] for r in shown}
    elems = {e for r in shown if r["cls"] != "positive" for e in r["elems"]}
    return len(elems), [e for e in result["dropped"] if e[0] in mods]


def report(s3: Path, result: dict, shown: list, source: str) -> str:
    """The Markdown report: result, per module, then every shown row's disposition."""
    c, n = counts(shown), len(shown)
    elements, dropped = in_view(result, shown)
    out = [f"# Test set: {s3.name}", "",
           f"*Produced by `tools/test-set.py` (Amendment S-1) from §5 of `{s3.name}`. Analysis only: §5 is not "
           f"edited. Outcome {source}.*", "", "## Result", "", "| | Rows |", "|---|---|"]
    out += [f"| {text} | {c[k]} |" for text, k in RESULT] + [f"| **Total in §5** | **{n}** |", ""]
    out += [f"**Guard elements:** {elements}. "
            + (f"**Dropped: {len(dropped)}** (exit 1)." if dropped
               else "None is dropped: each is covered by a kept row in its module, by its shared guard's owner, "
                    "or by its HOOK row."),
            "", f"**Kept rows with no S1 case:** {c['no_s1_case']}.",
            "", "**Restored by the S1 floor:** " + (", ".join(f"{i} ({', '.join(t)})" for i, t in result["restored"])
                                                     or "none") + ".", ""]
    out += ["## Per module", "", "| MOD | §5 rows | Critical path | Variants cut | Hook dup cut | Shared-guard cut "
            "| Positive suite | Kept rows with no S1 case |", "|---|---|---|---|---|---|---|---|"]
    out += [module_line(m, shown) for m in sorted({r["mod"] for r in shown})]
    out += ["", "## Appendix: disposition of every §5 row", "",
            "| REF | MOD | Guard (outcome or invariant) | S1 case | Disposition |", "|---|---|---|---|---|"]
    out += [f"| {r['id']} | {r['mod']} | {guard_text(r)} | {', '.join(r['cases']) or '— (derived)'} | {r['final']} |"
            for r in shown]
    return "\n".join(out) + "\n"


def as_json(s3: Path, result: dict, shown: list) -> str:
    elements, dropped = in_view(result, shown)
    return json.dumps({"s3": s3.name, "outcome_column": result["has_column"], "counts": counts(shown),
                       "guard_elements": elements, "dropped": [list(e) for e in dropped],
                       "restored": [{"ref": i, "groups": t} for i, t in result["restored"]],
                       "rows": [{"id": r["id"], "mod": r["mod"], "guard": guard_text(r), "s1_cases": r["cases"],
                                 "disposition": r["final"]} for r in shown]}, indent=2) + "\n"


def parse_args(argv: list | None) -> argparse.Namespace:
    ap = argparse.ArgumentParser(description="The frozen test set: §5's critical path, by set cover.")
    ap.add_argument("s3", help="the Phase 3 document (CLAUDE_..._Phase3.md)")
    ap.add_argument("--config", help="the run's JSON config, approved by the lead")
    ap.add_argument("--s1", help="the S1 document: its UPPER_SNAKE names are the outcome vocabulary "
                                 "for an S3 emitted before the Outcome column")
    ap.add_argument("--modules", default="", help="list only these modules (a Phase 4 stretch)")
    ap.add_argument("--out", help="write the report here instead of stdout")
    ap.add_argument("--json", action="store_true")
    return ap.parse_args(argv)


def emit(args: argparse.Namespace, s3: Path, result: dict) -> None:
    mods = {m for m in args.modules.split(",") if m}
    shown = [r for r in result["rows"] if not mods or r["mod"] in mods]
    source = ("from the Outcome column" if result["has_column"]
              else "supplied by the config (this S3 was emitted before the Outcome column)")
    text = as_json(s3, result, shown) if args.json else report(s3, result, shown, source)
    if args.out:
        Path(args.out).write_bytes(text.encode("utf-8"))
    else:
        sys.stdout.buffer.write(text.encode("utf-8"))


def main(argv: list | None = None) -> int:
    args = parse_args(argv)
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(errors="backslashreplace")  # a message never crashes a console
    s3 = Path(args.s3)
    try:
        cfg = load_config(Path(args.config) if args.config else None)
        s1_text = Path(args.s1).read_text(encoding="utf-8") if args.s1 else ""
        result = analyse(s3, cfg, s1_text)
    except (OSError, ValueError, re.error) as exc:
        print(f"test-set: {exc}", file=sys.stderr)
        return 2
    except TestSetError as exc:
        print(f"test-set: {exc}", file=sys.stderr)
        return 1
    emit(args, s3, result)
    for mod, name in result["dropped"]:
        print(f"test-set: {mod} {name.lstrip('§')} would be dropped: no kept row, shared-guard owner or HOOK "
              f"row covers it", file=sys.stderr)
    return 1 if result["dropped"] else 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")      # every tool writes UTF-8 (2.8.0)
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
