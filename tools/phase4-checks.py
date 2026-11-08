#!/usr/bin/env python3
"""
phase4-checks — the five gates buildable today, against Phase 4 instruments
whose columns are already fixed. No S3 parsing required.

  rosters   Governance copies in the repo match the authoritative skill rosters.
            Catches the stale-template class: repo copies missing RD-9..16 and
            A-1..A-4 while CLAUDE.md instructs every session to read them.
  modules   CC-1, for real. Every module in object-model-and-parameters.md has
            its File on disk, and every source file is claimed by a module.
  tags      Every k7-pass-N tag has a verdict whose reviewed.tree_sha equals the
            tree that tag points at. Makes tags evidence instead of assertion.
  scaffold  RD-14: no scaffold markers survive into committed artifacts.
  seal      After a seal: files present at the latest seal-* tag are unchanged
            (unless an owner ruling reopened it: tools/reopen.py), and the seal
            has its section in INSTRUMENTS/seal-record.md.
  objects   Object Writing Standard OS-1..OS-12, statically: no ambient reads
            inside the library (OS-2), no decider imported where the seam says
            INJECTED (OS-3), no bucket module names (OS-9), an isolation test per
            module (OS-12). A scanner, not a proof — OS-12's test is the proof.
  gates     2.6.17: the gate install is present and current — settings wire gate.py on every
            writing tool and fail closed, git runs .githooks/pre-commit, the machinery equals
            the template, every project hook is listed, code-gates resolves when declared
            (tools/gatecheck.py). C4 does not close, no build step starts and K7 does not run
            while it fails.

Usage:
    phase4-checks.py [--root .] [--json] [rosters modules tags scaffold seal objects gates]
Exit codes: 0 pass, 1 violations, 2 bad invocation.
"""

import argparse
import ast
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path


def php_support():
    """tools/php_support.py, loaded from beside this file: the PHP readers every tool shares (G-C7)."""
    here = str(Path(__file__).resolve().parent)
    if here not in sys.path:
        sys.path.insert(0, here)
    import php_support as module
    return module


sys.path.insert(0, str(Path(__file__).resolve().parent))
from source_scan import code_only, glob_to_regex, os1_findings, protocol_stubs, signatures  # shared: gate.py, seal.py

# Assembled at runtime rather than written literally: this file would otherwise
# match its own patterns. Any tool that scans for markers must not contain them.
DEFAULT_MARKERS = [
    r"<!--\s*SET" + r"UP", r"DELETE" + r" THIS", r"TODO\(scaff" + r"old\)",
    r"<Con" + r"cept>", r"repo-" + r"template", r"XXX-PLACE" + r"HOLDER",
]

# The checker cannot audit itself. Tooling lives here and is excluded by default.
# The emission contract is also exempt: its job is to document filename patterns
# like CLAUDE_<Concept>_Phase3.md, so the placeholder is content, not leakage.
# governance/S3/ is NOT exempt — an unsubstituted placeholder there is a real bug.
# IMPLEMENTATION_GUIDE.md and the emission contract are exempt for the same reason:
# their job is to DESCRIBE the templates ("copy this into <concept>-build/"), so the
# placeholder is subject matter, not leakage. SETUP.md is exempt because it is the
# scaffold and is deleted at C4 rather than substituted.
# The roster copy is exempt for the same reason, and cannot be substituted anyway:
# its digest is pinned by roster-manifest.json.
DEFAULT_EXEMPT = [".metaframework/", "tools/",
                  "governance/S2-S3-emission-contract.md",
                  "governance/Phase4_Conformance_Build_Roster.md",
                  "IMPLEMENTATION_GUIDE.md", "SETUP.md", "HARNESS.md"]


def git(root: Path, *args: str) -> str:
    try:
        r = subprocess.run(["git", "-C", str(root), *args],
                           capture_output=True, encoding="utf-8", errors="replace", check=True)
        return r.stdout
    except (OSError, subprocess.CalledProcessError):
        return ""


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def v(rule: str, detail: str, file: str = "") -> dict:
    return {"file": file, "rule": rule, "detail": detail}


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def text_of(path: Path) -> str | None:
    """The file's UTF-8 text, or None where it cannot be read."""
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return None


def heading_index(lines: list[str], section: str) -> int:
    """The first '## ' heading line that contains `section`, or 0 when none does."""
    for i, ln in enumerate(lines):
        if ln.strip().startswith("## ") and section in ln:
            return i
    return 0


def rows_below(lines: list[str], i: int) -> list[dict]:
    """The rows of the table whose header is lines[i]; lines[i + 1] is its separator."""
    cols = [c.strip() for c in lines[i].strip().strip("|").split("|")]
    rows = []
    j = i + 2
    while j < len(lines) and lines[j].strip().startswith("|"):
        vals = [c.strip() for c in lines[j].strip().strip("|").split("|")]
        if len(vals) == len(cols):
            rows.append(dict(zip(cols, vals)))
        j += 1
    return rows


def md_rows(path: Path, section: str | None = None) -> list[dict]:
    """Rows of the first markdown table in a file (optionally after a heading)."""
    if not path.is_file():
        return []
    lines = path.read_text(encoding="utf-8").splitlines()
    start = heading_index(lines, section) if section else 0
    for i in range(start, len(lines) - 1):
        if lines[i].strip().startswith("|") and \
                re.match(r"^\|[\s\-:|]+\|$", lines[i + 1].strip()):
            return rows_below(lines, i)
    return []


# --------------------------------------------------------------------------- #

def check_rosters(root: Path, cfg: dict) -> list[dict]:
    """Compare governance copies against recorded authoritative digests."""
    manifest = load_json(root / ".metaframework" / "roster-manifest.json")
    if manifest is None:
        return [v("roster_manifest_missing",
                  ".metaframework/roster-manifest.json absent. Without it a stale "
                  "governance copy is undetectable — this is the defect that let "
                  "pre-amendment rosters ship in the repo template.")]
    out = []
    for rel, expected in manifest.items():
        p = root / rel
        if not p.is_file():
            out.append(v("roster_missing", f"declared in manifest, absent on disk", rel))
        elif sha256(p) != expected:
            out.append(v("roster_stale",
                         f"sha256 {sha256(p)[:12]} != expected {expected[:12]}; "
                         f"repo copy has diverged from the authoritative roster", rel))
    return out


def check_modules(root: Path, cfg: dict) -> list[dict]:
    """CC-1: module <-> source tree, both directions."""
    inst = root / "INSTRUMENTS" / "object-model-and-parameters.md"
    rows = md_rows(inst)
    if not rows:
        return [v("object_model_unreadable",
                  "INSTRUMENTS/object-model-and-parameters.md has no parseable "
                  "table; CC-1 cannot run", str(inst.name))]

    out, declared = module_files(root, rows)
    glob = cfg.get("source_glob")
    if not glob:
        out.append(v("source_glob_undeclared",
                     "project.json has no source_glob; the reverse direction of "
                     "CC-1 (source not claimed by any module) cannot run"))
        return out

    rx = glob_to_regex(glob)
    tracked = [p for p in git(root, "ls-files").splitlines() if p.strip() and rx.match(p)]
    for p in sorted(set(tracked) - declared):
        out.append(v("unclaimed_source",
                     f"{p} is tracked but claimed by no module; "
                     f"'module not in Object Model -> build fails'"))
    return out


def module_files(root: Path, rows: list[dict]) -> tuple[list[dict], set]:
    """CC-1's forward direction: (each module with no File or a File not on disk, the Files declared)."""
    out, declared = [], set()
    for n, row in enumerate(rows, 1):
        f = row.get("File", "").strip()
        mod = row.get("Module", f"row {n}")
        if not f or f.startswith("—"):
            out.append(v("module_without_file", f"{mod}: File column empty"))
            continue
        declared.add(f)
        if not (root / f).is_file():
            out.append(v("module_file_absent", f"{mod} declares {f}, not on disk"))
    return out, declared


def check_tags(root: Path, cfg: dict) -> list[dict]:
    out = []
    tags = [t for t in git(root, "tag", "-l", "k7-pass-*").splitlines() if t.strip()]
    if not tags:
        return out
    for tag in tags:
        m = re.search(r"k7-pass-(\d+)$", tag)
        if not m:
            out.append(v("tag_malformed", f"{tag} does not match k7-pass-<N>"))
            continue
        tree = git(root, "rev-parse", f"{tag}^{{tree}}").strip()
        verdict_path = root / "INSTRUMENTS" / f"k7-verdict-{m.group(1)}.json"
        verdict = load_json(verdict_path)
        if verdict is None:
            out.append(v("tag_without_verdict",
                         f"{tag} exists but {verdict_path.name} is absent or unreadable; "
                         f"the tag asserts a review that cannot be produced"))
            continue
        claimed = (verdict.get("reviewed") or {}).get("tree_sha", "")
        if claimed != tree:
            out.append(v("tag_verdict_mismatch",
                         f"{tag} points at tree {tree[:12]} but "
                         f"{verdict_path.name} reviewed {claimed[:12] or '(absent)'}"))
    return out


def check_scaffold(root: Path, cfg: dict) -> list[dict]:
    # `or` not `get(k, default)`: an explicit null in project.json means "use the
    # defaults", and get() would hand back None because the key does exist.
    markers = [re.compile(p, re.I) for p in (cfg.get("scaffold_markers") or DEFAULT_MARKERS)]
    exempt = cfg.get("scaffold_exempt") or DEFAULT_EXEMPT
    out = []
    for rel in git(root, "ls-files").splitlines():
        if not rel.strip() or any(rel.startswith(e) for e in exempt):
            continue
        text = text_of(root / rel)
        if text is not None:
            out.extend(scaffold_lines(rel, text, markers))
    return out


def scaffold_lines(rel: str, text: str, markers: list) -> list[dict]:
    """RD-14 in one file: each line that matches a marker, once, under the first marker it matches."""
    out = []
    for i, line in enumerate(text.splitlines(), 1):
        for rx in markers:
            if rx.search(line):
                out.append(v("scaffold_marker",
                             f"line {i} matches /{rx.pattern}/ — RD-14: a scaffold "
                             f"banner must not survive into the artifact", rel))
                break
    return out


def reopened(root: Path, tag: str) -> bool:
    """Whether an owner ruling reopened `tag` (tools/reopen.py, where this repository has it). Its sealed files
    change under that ruling until the next seal closes it, so they are not violations."""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    try:
        from reopen import reopen_record
    except ImportError:
        return False
    return reopen_record(root, tag) is not None


def changed_sealed(root: Path, cfg: dict, tag: str) -> list[str]:
    """The files sealed at `tag` that have changed since: none while an owner ruling has `tag` reopened."""
    if reopened(root, tag):
        return []
    globs = cfg.get("sealed_globs") or [cfg.get("source_glob") or "src/**", "tests/**"]
    rx = [glob_to_regex(g) for g in globs]
    sealed = {f for f in git(root, "ls-tree", "-r", "--name-only", tag).splitlines()
              if any(r.match(f) for r in rx)}
    changed = set(git(root, "diff", "--name-only", tag).splitlines())
    changed |= {f for f in sealed if not (root / f).exists()}
    return sorted(changed & sealed)


def check_seal(root: Path, cfg: dict) -> list[dict]:
    tags = git(root, "tag", "-l", "seal-*", "--sort=-v:refname").split()
    if not tags:
        return []
    tag = tags[0]
    out = [v("sealed_file_changed", f"sealed at {tag}; the library is read-only", f)
           for f in changed_sealed(root, cfg, tag)]
    rec = root / "INSTRUMENTS" / "seal-record.md"
    text = rec.read_text(encoding="utf-8") if rec.is_file() else ""
    for t in tags:
        if f"## {t} " not in text and f"## {t}\n" not in text:
            out.append(v("seal_without_record", f"{t} has no section in seal-record.md; "
                         f"seal with tools/seal.py apply, never by hand", "INSTRUMENTS/seal-record.md"))
    return out


AMBIENT = [
    # (regex, rule, what to do instead) — tune per language in project.json.
    (r"process\.env\b", "OS-2", "hand the value in at construction"),
    (r"\bos\.environ\b", "OS-2", "hand the value in at construction"),
    (r"\bDate\.now\(|new Date\(\)", "OS-2", "inject a clock provider"),
    (r"\bdatetime\.now\(|\btime\.time\(", "OS-2", "inject a clock provider"),
    (r"\bMath\.random\(|\brandom\.(random|randint|choice)\(", "OS-2",
     "inject an id or randomness provider"),
    (r"\bglobalThis\b|\bwindow\.|\bdocument\.", "OS-2", "the library is not the browser"),
    (r"\bgetInstance\(\)|\bsingleton\b", "OS-2", "inject the instance"),
    (r"^\s*(let|var)\s+\w+\s*=", "OS-2", "module-level mutable state — make it an input"),
]
BUCKETS = ["helpers", "helper", "utils", "util", "common", "misc", "shared", "stuff"]


def _public_ops(rel: str, text: str) -> dict:
    """{operation: params} over the file's classes, less a typing.Protocol's stubs (2.6.20): a consumer-owned
    Protocol declares what its collaborator answers, and the declaring class has nothing there to test."""
    stubs = protocol_stubs(rel, text)
    ops = {}
    for cls, members in signatures(rel, text).items():
        for name, params in members.items():
            if name not in ("__init__", "constructor", "__construct") and (cls, name) not in stubs:
                ops[name] = params
    return ops


def _contract_invariants(root: Path, cfg: dict) -> dict:
    """{operation: {inputs it legitimately ignores}} from ui/interface-contract.md."""
    f = root / (cfg.get("ui_root") or "ui") / "interface-contract.md"
    if not f.is_file():
        return {}
    text = text_of(f)
    if text is None:
        return {}
    out = {}
    for row in contract_rows(text.splitlines()):
        op = row.get("Operation", "").split("(")[0].strip().split(".")[-1]
        inv = row.get("Invariant to", "")
        if op and inv:
            out[op] = {x for x in re.findall(r"[A-Za-z_$][\w$]*", inv)}
    return out


def contract_rows(lines: list[str]) -> list[dict]:
    """Rows under the first table header that has an Operation column, separator rows and odd widths skipped."""
    out, cols = [], None
    for ln in lines:
        if not ln.startswith("|"):
            continue
        cells = [c.strip() for c in ln.strip().strip("|").split("|")]
        if cols is None:
            if "Operation" in cells:
                cols = cells
            continue
        if len(cells) != len(cols) or set("".join(cells)) <= set("-: "):
            continue
        out.append(dict(zip(cols, cells)))
    return out


DIFFERS = re.compile(r"not\.toBe|not\.toEqual|notEqual|assertNotEqual|assertNotSame|!==|\bassert[^\n]*!=")


def check_isolation_tests(root: Path, cfg: dict, files: list, std: dict) -> list[dict]:
    """OS-12: the test must CALL every public operation, and prove an input changes the
    answer. A construct-and-assert test is a failure, not a pass."""
    pat = std.get("isolation_test_pattern", "tests/**/*{stem}*.isolation.*")
    if not pat:
        return []
    # PHPUnit loads a test class from the file named after it, so a PHP class's isolation test is
    # tests/**/<Class>IsolationTest.php (new-object.py writes it there) unless the project sets a pattern.
    php_pat = std.get("isolation_test_pattern", "tests/**/{stem}IsolationTest.php")
    # Tracked and untracked (not ignored) tests (2.6.24): a test not yet staged was invisible, so `objects` said a
    # module had none (LedgerCore V2, INT-185). precommit runs this in a checkout of the staged tree, which has no
    # untracked file, so a commit is still judged on the tests it records.
    out, tests = [], git(root, "ls-files", "--cached", "--others", "--exclude-standard", "tests").splitlines()
    invariant = _contract_invariants(root, cfg)
    for rel in files:
        ops = module_ops(root, rel)
        if not ops:
            continue
        matched = isolation_tests(rel, (pat, php_pat), tests)
        if not matched:
            out.append(v("OS-12_no_isolation_test", "construct it with its declared inputs and "
                         "nothing else, then call every public operation", rel))
            continue
        body = "".join(filter(None, (text_of(root / t) for t in matched)))
        props = property_names(rel, text_of(root / rel) or "")
        out.extend(operation_findings(ops, body, invariant, matched[0], props))
        out.extend(difference_findings(ops, body, invariant, matched[0]))
    return out


def module_ops(root: Path, rel: str) -> dict:
    """The public operations of source file `rel`: none for an index or types file, or one that cannot be read."""
    if Path(rel).stem.lower() in ("index", "types"):
        return {}
    text = text_of(root / rel)
    return {} if text is None else _public_ops(rel, text)


def isolation_tests(rel: str, patterns: tuple, tests: list) -> list:
    """The tracked tests that `patterns` (the pattern, the PHP pattern) names as `rel`'s isolation test."""
    pat, php_pat = patterns
    rx = glob_to_regex((php_pat if rel.endswith(".php") else pat).replace("{stem}", Path(rel).stem))
    return [t for t in tests if rx.match(t)]


def invariant_to(invariant: dict, op: str, params) -> bool:
    """Whether the interface contract says `op`'s answer legitimately ignores every one of `params`."""
    return bool(invariant.get(op) and (set(params) <= invariant[op] or "all" in invariant[op]))


def property_names(rel: str, text: str) -> set[str]:
    """A Python file's properties (2.6.22): a test reads one, never calls it, so OS-12 counts the read
    (LedgerCore V2 INT-49)."""
    tree = _py_tree(text) if rel.endswith(".py") else None
    if tree is None:
        return set()
    return {fn.name for fn in ast.walk(tree) if isinstance(fn, ast.FunctionDef)
            and any(_name_of(d) in ("property", "cached_property") for d in fn.decorator_list)}


def reads_of(op: str, body: str) -> int:
    """How often the test reads attribute `op`: each `.op` not called and not assigned to."""
    return len(re.findall(rf"\.{re.escape(op)}\b(?!\s*\()(?!\s*=(?!=))", body))


def operation_findings(ops: dict, body: str, invariant: dict, test: str, props=frozenset()) -> list[dict]:
    """Each operation the isolation test never calls, or calls once though it declares an input. Reading a
    property is its call."""
    out = []
    for op, params in ops.items():
        calls = calls_of(op, body) + (reads_of(op, body) if op in props else 0)
        if calls == 0:
            out.append(v("OS-12_operation_untested", f"'{op}' is never called by the "
                         f"isolation test — construct-and-assert is a failure, not a pass",
                         test))
        elif params and calls < 2 and not invariant_to(invariant, op, params):
            out.append(v("OS-12_input_not_varied", f"'{op}' is called once; call it twice, "
                         f"differing in one declared input, and assert the answers differ",
                         test))
    return out


def calls_of(op: str, body: str) -> int:
    """How often the test calls `op`: each `op(` or `.op(`, less each line that defines an `op` (a double's `def`,
    `function` or method head), which names it without calling it (2.6.20)."""
    o = re.escape(op)
    named = len(re.findall(rf"\.{o}\s*\(|\b{o}\s*\(", body))
    defined = len(re.findall(rf"\b(?:def|function)\s+{o}\s*\(|^[ \t]*(?:(?:async|static|public|private|protected)"
                             rf"\s+)*{o}\s*\([^)\n]*\)\s*(?::[^{{\n]*)?\{{", body, re.M))
    return max(0, named - defined)


def difference_findings(ops: dict, body: str, invariant: dict, test: str) -> list[dict]:
    """The missing assertion that two calls differing in one input differ, unless no input can change an answer."""
    if all(invariant_to(invariant, o, p) for o, p in ops.items() if p) or DIFFERS.search(body):
        return []
    return [v("OS-12_no_difference_assertion", "no assertion that two calls differing "
              "in one input return different answers — that assertion is what proves "
              "the input is declared, not hidden", test)]

def table_cells(line: str) -> list[str]:
    return [x.strip().strip("`") for x in line.strip().strip("|").split("|")]


def s3_partition(text: str) -> dict[str, str]:
    """{MOD-nn: File} from S3 §2 only. §11's checklist rows also start with MOD-; read from anywhere they
    overwrote every File with PASS, and OS-3 compared nothing (LedgerCore V2 issue I-2)."""
    mods, in_s2 = {}, False
    for line in text.splitlines():
        if line.startswith("## "):
            in_s2 = bool(re.match(r"^##\s+2[.\s]", line))
        elif in_s2 and line.startswith("|"):
            c = table_cells(line)
            if len(c) >= 3 and re.fullmatch(r"MOD-\d+", c[0]):
                mods[c[0]] = c[2]
    return mods


SEAM_TARGET = re.compile(r"([A-Za-z_$][\w$]*)\s*\.\s*[A-Za-z_$][\w$]*\s*\(")
JS_IMPORT = re.compile(r"^\s*import\s+([\s\S]*?)\s+from\s+['\"]([^'\"]+)['\"]", re.M)
JS_WHOLE = re.compile(r"(?:^\s*import\s+|(?<![\w$.])(?:require|import)\s*\(\s*)['\"]([^'\"]+)['\"]", re.M)
PY_DYNAMIC = re.compile(r"(?<![\w$])(?:import_module|__import__)\s*\(\s*['\"]([^'\"]+)['\"]")
IDENT = re.compile(r"[A-Za-z_$][\w$]*")
OPERATION = re.compile(r"`([A-Za-z_$][\w$]*)|([A-Za-z_$][\w$]*)\s*\(")
INHERITS = re.compile(r"\b(?:inherits|extends|subclass(?:es)?|is-a)\b", re.I)
DECLARED = re.compile(r"^\s*(?:export\s+)?(?:default\s+)?(?:(?:abstract|final|readonly)\s+)*"
                      r"(?:class|interface|trait|enum|type|function)\s+([A-Za-z_$][\w$]*)", re.M)
EXTENDS = re.compile(r"\bextends\s+\\?([\w$\\]+)")


def injected_seams(text: str) -> list[tuple[str, str, str, str]]:
    """(SEAM-nn, source MOD, target MOD, what it hands in) for every S3 §4 seam bound INJECTED. The last is the cell
    as written; seam_classes reads it against the target's file."""
    rows = (table_cells(line) for line in text.splitlines() if line.startswith("|"))
    return [(c[0], c[1], c[2], c[3]) for c in rows
            if len(c) >= 7 and c[0].startswith("SEAM-") and c[6].upper() == "INJECTED"]


def seam_class(cell: str) -> str:
    m = SEAM_TARGET.search(cell)
    return m.group(1) if m else ""


def seam_classes(cell: str, declared: set, bases: set, methods: dict | None = None, plain=frozenset()) -> list[str]:
    """The classes an INJECTED seam hands in (2.6.22): the one its cell calls (`Clock.now()`), else each name in the
    cell that the target's file declares (`LeaseDecider.holds`, `LocalityGuard` instance), and the class that answers
    the most operations the cell names (`latest_locked()`, `state`). None for a value (Φ's `path`, an instant `t`):
    the seam is then taken only by importing the target's module whole. A class the cell says the source inherits,
    and the source file subclasses, is not handed in: subclassing needs the import. Nor is a `plain` class, one an S2
    or object-model row calls a value or Decides NO (2.7.0): V2's SEAM-97 "Outcome domain" refused `controls.py`
    importing the value `Outcome` (INT-310). Before 2.6.22 a cell without the `Cls.op(` form named no class, and any
    import from the target's file was refused (LedgerCore V2 INT-47, SEAM-17); 96 of V2's 102 INJECTED seams were
    read that way."""
    called = seam_class(cell)
    names = [called] if called else [n for n in dict.fromkeys(IDENT.findall(cell)) if n in declared]
    names += [n for n in answering(cell, methods or {}) if n not in names]
    skip = set(plain) | (bases if INHERITS.search(cell) else set())
    return [n for n in names if n not in skip]


def plain_names(root: Path, cfg: dict) -> set[str]:
    """The classes an S2 §2 row or an object-model row calls a value (Kind) or Decides NO (2.7.0): OS-3 lets such a
    plain utility be imported directly. An object-model Module cell is read without its `MOD-nn` prefix."""
    s2 = md_rows(root / cfg["s2_document"], "Expressed Object Model") if cfg.get("s2_document") else []
    om = md_rows(root / "INSTRUMENTS" / "object-model-and-parameters.md")
    rows = [(r.get("Node", ""), r) for r in s2] + [(re.sub(r"^MOD-\d+\s+", "", r.get("Module", "")), r) for r in om]
    return {name.strip("` ") for name, r in rows if name.strip("` ") and (
        re.match(r"value\b", r.get("Kind", ""), re.I) or r.get("Decides", "").upper() == "NO")}


def answering(cell: str, methods: dict) -> list[str]:
    """The classes that answer the most of the operations a cell names, in backticks or as `op(`."""
    ops = {a or b for a, b in OPERATION.findall(cell)}
    counts = {cls: len(ops & names) for cls, names in methods.items()}
    best = max(counts.values(), default=0)
    return [cls for cls, n in counts.items() if n and n == best]


def class_methods(rel: str, text: str) -> dict[str, set[str]]:
    """{class: its public methods} for a Python file's top-level classes; empty for any other file."""
    tree = _py_tree(text) if rel.endswith(".py") else None
    if tree is None:
        return {}
    return {c.name: {f.name for f in c.body if isinstance(f, (ast.FunctionDef, ast.AsyncFunctionDef))
                     and not f.name.startswith("_")} for c in tree.body if isinstance(c, ast.ClassDef)}


def _py_tree(text: str):
    """The file's syntax tree, or None when it does not parse."""
    try:
        return ast.parse(text)
    except SyntaxError:
        return None


def _name_of(node) -> str:
    """A base class or decorator written as a name, an attribute or a subscript: its last name."""
    node = node.value if isinstance(node, ast.Subscript) else node
    return getattr(node, "id", None) or getattr(node, "attr", None) or ""


def declared_names(rel: str, text: str) -> set[str]:
    """The classes and functions a file declares at its top level: what a seam's cell can name in it."""
    tree = _py_tree(text) if rel.endswith(".py") else None
    if tree is None:
        return set(DECLARED.findall(text))
    return {n.name for n in tree.body if isinstance(n, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef))}


def base_names(rel: str, text: str) -> set[str]:
    """The classes that the file's own classes subclass."""
    tree = _py_tree(text) if rel.endswith(".py") else None
    if tree is None:
        return {m.split("\\")[-1] for m in EXTENDS.findall(text)}
    return {_name_of(b) for c in ast.walk(tree) if isinstance(c, ast.ClassDef) for b in c.bases} - {""}


def module_is(spec: str, stem: str) -> bool:
    """Whether an import specifier ('./store_kernel.js', 'pkg.store_kernel', '../a/store_kernel') names `stem`."""
    return re.split(r"[/\\.]", re.sub(r"\.(?:m?[jt]sx?|py|php)$", "", spec))[-1] == stem


def imports_injected(rel: str, body: str, stem: str, cls: str) -> bool:
    """OS-3: does `body` take the seam's target by import rather than as a handed-in input? It does when it imports
    the target's module whole, or imports, requires, uses or constructs the injected class (2.6.20). Plain values
    imported by name from the same file pass: OS-3 lets "a plain utility" be imported directly. With no class (a
    seam that hands in a value), only the module whole counts (2.6.22). Import keywords count only at the start of a
    statement, so `_require(self.clock)` or "from the clock" in prose is not an import."""
    if rel.endswith(".php"):
        n = re.escape(cls or stem)                   # PHP: a use, a new, or a static call
        return bool(re.search(rf"(^\s*use\s[^\n]*\\{n}\b|\bnew\s+\\?[\w\\]*\b{n}\s*\(|\b{n}::)", body, re.M))
    if rel.endswith(".py"):
        taken = py_takes(body, stem, cls)
        if taken is not None:
            return taken
    return js_takes(body, stem, cls)


def py_takes(body: str, stem: str, cls: str) -> bool | None:
    """A Python file's imports, read from its syntax tree; None when it does not parse."""
    try:
        tree = ast.parse(body)
    except SyntaxError:
        return None
    if any(module_is(m, stem) for m in PY_DYNAMIC.findall(body)):
        return True
    return any(py_import_takes(n, stem, cls) for n in ast.walk(tree) if isinstance(n, (ast.Import, ast.ImportFrom)))


def py_import_takes(node, stem: str, cls: str) -> bool:
    """`import pkg.stem`, `from pkg import stem` and `from …stem import *` take the module whole, and `from … import
    Cls` the class. With no class named, a name imported from the module is a plain value (2.6.22)."""
    names = [a.name for a in node.names]
    if isinstance(node, ast.Import):
        return any(module_is(n, stem) for n in names)
    if stem in names or (cls and cls in names):
        return True
    return module_is(node.module or "", stem) and "*" in names


def js_takes(body: str, stem: str, cls: str) -> bool:
    """JS/TS, and any file that will not parse: a `new` of the class, a bare, required or dynamic import of the
    target's module, or an `import … from` that names the class or takes the module whole."""
    if cls and re.search(rf"(?<![\w$])new\s+{re.escape(cls)}\s*\(", body):
        return True
    if any(module_is(m, stem) for m in JS_WHOLE.findall(body)):
        return True
    return any(js_import_takes(names, module_is(mod, stem), cls) for names, mod in JS_IMPORT.findall(body))


def js_import_takes(names: str, from_stem: bool, cls: str) -> bool:
    """One `import <names> from '<module>'`: the class named anywhere in it; from the target's module, a default or
    namespace import (the module whole). With no class named, a `{ name }` import is a plain value (2.6.22)."""
    names = re.sub(r"^\s*type\s+", "", names)
    if cls and re.search(rf"(?<![\w$]){re.escape(cls)}(?![\w$])", names):
        return True
    return from_stem and not names.lstrip().startswith("{")


def check_os3(root: Path, cfg: dict, allowed) -> list[dict]:
    """OS-3: a seam declared INJECTED is handed in, never imported by the source module."""
    s3 = root / (cfg.get("s3_document") or "")
    if not cfg.get("s3_document") or not s3.is_file():
        return []
    text = s3.read_text(encoding="utf-8")
    mods, plain = s3_partition(text), plain_names(root, cfg)
    found = (seam_finding(root, mods, seam, allowed, plain) for seam in injected_seams(text))
    return [f for f in found if f]


def seam_finding(root: Path, mods: dict, seam: tuple, allowed, plain=frozenset()) -> dict | None:
    """One INJECTED seam's OS-3 violation, or None when its source file takes the target only as a handed-in input."""
    sid, src_mod, tgt_mod, cell = seam
    sfile, tfile = mods.get(src_mod), mods.get(tgt_mod)
    if not sfile or not tfile or not (root / sfile).is_file() or allowed(sfile, "OS-3"):
        return None
    taken = taken_from(root, sfile, tfile, cell, plain)
    if not taken:
        return None
    return v("OS-3_decider_imported", f"{sid} declares {tgt_mod} INJECTED, but this file imports "
             f"{', '.join(taken)} directly — hand it in", sfile)


def taken_from(root: Path, sfile: str, tfile: str, cell: str, plain=frozenset()) -> list[str]:
    """What `sfile` imports of what the seam hands in: the injected classes it imports, else the target's module
    when it imports it whole, else nothing."""
    body = (root / sfile).read_text(encoding="utf-8", errors="ignore")
    stem, target = Path(tfile).stem, text_of(root / tfile) or ""
    classes = seam_classes(cell, declared_names(tfile, target), base_names(sfile, body),
                           class_methods(tfile, target), plain)
    taken = [c for c in classes if imports_injected(sfile, body, stem, c)]
    return taken or ([stem] if imports_injected(sfile, body, stem, "") else [])


def check_gates(root: Path, cfg: dict) -> list[dict]:
    """2.6.17: this checkout's gate install is present and current (tools/gatecheck.py)."""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from gatecheck import problems
    return [v(p["rule"], p["detail"], p["file"]) for p in problems(root, cfg)]


def check_objects(root: Path, cfg: dict) -> list[dict]:
    """OS-2, OS-3, OS-9, OS-12, as far as a scanner can see."""
    std = cfg.get("object_standard") or {}
    if std.get("skip"):
        return []
    ambient, buckets = object_patterns(std)
    allow = std.get("allow") or {}          # {path_prefix: [rule, ...]}
    files = source_files(root, cfg)
    out = []

    def allowed(rel, rule):
        return any(rel.startswith(k) and rule in vals for k, vals in allow.items())

    for rel in files:
        out.extend(bucket_findings(rel, buckets, allowed))
        text = text_of(root / rel)
        if text is None:
            continue
        out.extend(ambient_findings(rel, text, ambient, allowed))
        out.extend(php_ambient_findings(rel, text, std, allowed))

    # OS-3: a seam declared INJECTED must not be a direct import.
    out.extend(check_os3(root, cfg, allowed))

    # OS-1: nothing a method uses may arrive undeclared.
    out.extend(os1_violations(root, files, allowed))

    # OS-12: the isolation test must call every operation and vary a declared input.
    out.extend(check_isolation_tests(root, cfg, [f for f in files if not allowed(f, "OS-12")], std))
    return out


def object_patterns(std: dict) -> tuple[list, list]:
    """(the ambient-read patterns, compiled; the bucket names) the object standard sets, else the defaults."""
    ambient = [(re.compile(p, re.M), rule, fix) for p, rule, fix
               in (std.get("ambient_patterns") or AMBIENT)]
    return ambient, std.get("bucket_names") or BUCKETS


def source_files(root: Path, cfg: dict) -> list[str]:
    """The tracked files the project's source_glob matches (src/** when it declares none)."""
    src_rx = glob_to_regex(cfg.get("source_glob") or "src/**")
    return [f for f in git(root, "ls-files").splitlines() if src_rx.match(f)]


def bucket_findings(rel: str, buckets: list, allowed) -> list[dict]:
    """OS-9: a module named for a bucket, or inside a bucket folder, unless allowed."""
    stem = Path(rel).stem.lower()
    bucket = stem in buckets or any(f"/{b}/" in "/" + rel.lower() for b in buckets)
    if not bucket or allowed(rel, "OS-9"):
        return []
    return [v("OS-9_bucket_module", "a bucket module has no owner and no "
              "contract; name the module for what it owns", rel)]


def ambient_findings(rel: str, text: str, ambient: list, allowed) -> list[dict]:
    """OS-2: the first match of each ambient pattern in the file's code, unless its rule is allowed there. Comments and
    docstrings are not code (2.6.24)."""
    out, code = [], code_only(rel, text)
    for rx, rule, fix in ambient:
        m = rx.search(code)
        if m and not allowed(rel, rule):
            line = code[:m.start()].count("\n") + 1
            out.append(v(f"{rule}_ambient_read", f"line {line}: /{rx.pattern}/ — an object "
                         f"may not reach outside its declared inputs; {fix}", rel))
    return out


def php_ambient_findings(rel: str, text: str, std: dict, allowed) -> list[dict]:
    """OS-2 for PHP's own reads, unless the project sets its own ambient patterns or allows OS-2 there."""
    if not rel.endswith(".php") or std.get("ambient_patterns") or allowed(rel, "OS-2"):
        return []
    hit = php_support().ambient(text)         # PHP's own reads, on code without comments or strings
    if not hit:
        return []
    pat, line, fix = hit
    return [v("OS-2_ambient_read", f"line {line}: /{pat}/ — an object may not reach "
              f"outside its declared inputs; {fix}", rel)]


def os1_violations(root: Path, files: list, allowed) -> list[dict]:
    """OS-1 in each source file that does not allow it."""
    out = []
    for rel in files:
        if allowed(rel, "OS-1"):
            continue
        text = text_of(root / rel)
        if text is None:
            continue
        for rule, line, detail in os1_findings(rel, text):
            out.append(v(rule, f"line {line}: {detail}", rel))
    return out


CHECKS = {"rosters": check_rosters, "modules": check_modules,
          "tags": check_tags, "scaffold": check_scaffold, "seal": check_seal,
          "objects": check_objects, "gates": check_gates}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("checks", nargs="*",
                    help=f"one or more of: {', '.join(CHECKS)} (default: all)")
    ap.add_argument("--root", default=".")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    unknown = [c for c in args.checks if c not in CHECKS]
    if unknown:
        print(f"phase4-checks: unknown check(s): {', '.join(unknown)}; "
              f"choose from {', '.join(CHECKS)}", file=sys.stderr)
        return 2

    root = Path(args.root).resolve()
    if not (root / ".git").exists():
        print(f"phase4-checks: {root} is not a git repository", file=sys.stderr)
        return 2

    cfg = load_json(root / ".metaframework" / "project.json") or {}
    selected = args.checks or list(CHECKS)
    violations = run_checks(root, cfg, selected)

    result = {"status": "fail" if violations else "pass",
              "checks_run": selected, "violations": violations}

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print_violations(violations, selected)
    return 1 if violations else 0


def run_checks(root: Path, cfg: dict, selected: list[str]) -> list[dict]:
    """Every violation of the selected checks, in the order they ran, each tagged with its check."""
    violations = []
    for name in selected:
        violations.extend({**x, "check": name} for x in CHECKS[name](root, cfg))
    return violations


def print_violations(violations: list[dict], selected: list[str]) -> None:
    """The text report: one line per violation, then the count or the pass line."""
    for x in violations:
        loc = f"{x['file']}: " if x["file"] else ""
        print(f"[{x['check']}] {loc}{x['rule']}: {x['detail']}")
    print(f"\n{len(violations)} violation(s)." if violations
          else f"phase4-checks: {', '.join(selected)} — pass")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")      # every tool writes UTF-8 (2.8.0)
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
