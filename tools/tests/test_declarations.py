"""The declarations check compares per class, and the source readers it shares give the same answer every run (2.6.21).

Until 2.6.21 seal.py held every class in a file to the file's one object-model "Declared inputs" cell and read only a
written-out constructor, so a file whose classes take different inputs could not pass, and a dataclass under a `none`
cell passed while comparing nothing (LedgerCore V2 INT-08, INT-11). The JS OS-1 scanner named whichever module constant
a set gave it first, which followed the hash seed.

2.6.24: a dataclass's constructor takes its inherited fields first, and a contract finding names the file read.

2.7.0: a JS/TS file's signatures cover every class in it, not the first only.

Run: python -m unittest discover -s tools/tests
"""
import importlib.util
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1]


def load_tool(name: str, file: str):
    spec = importlib.util.spec_from_file_location(name, TOOLS / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SCAN = load_tool("source_scan", "source_scan.py")
SEAL = load_tool("seal", "seal.py")
P4 = load_tool("phase4_checks", "phase4-checks.py")

FIELDS = '''import dataclasses
from dataclasses import InitVar, KW_ONLY, dataclass, field
from typing import ClassVar
import typing


@dataclass(frozen=True)
class Entry:
    key: str
    limit: ClassVar[int] = 3
    kind: typing.ClassVar[str] = "entry"
    label: "ClassVar[str]" = "x"
    amount: int
    cache: dict = field(init=False, default_factory=dict)
    seen: list = dataclasses.field(init=False, default_factory=list)
    _: KW_ONLY
    when: str = field(default="now")
    seed: InitVar[int] = 0

    def total(self, rate):
        return self.amount * rate


@dataclasses.dataclass
class Bare:
    one: int


@dataclass
class Written:
    one: int

    def __init__(self, other):
        self.one = other


@dataclass(init=False)
class NoInit:
    one: int


class Plain:
    one: int
'''

STORE = '''from dataclasses import dataclass


class AppendOnlyStore:
    def __init__(self, path, clock):
        self._path, self._clock = path, clock


@dataclass(frozen=True)
class LocalityGuard:
    locality: str


class StoreRefused(Exception):
    pass
'''

GUARD = '''from dataclasses import dataclass


@dataclass(frozen=True)
class LocalityGuard:
    locality: str
    region: str
'''

ONE = '''class Ledger:
    def __init__(self, clock, store):
        self._clock, self._store = clock, store
'''

CONTRACT = """# Interface contract

## Actions

| Operation | Module | What it does | Inputs | Returns | Refusals | Side effects | Determinism | Invariant to |
|---|---|---|---|---|---|---|---|---|
| Unused.op | MOD-99 | x | none | x | none | none | yes | — |
"""

MIX = """const ALPHA = 1;
const BRAVO = 2;
const CHARLIE = 3;
const DELTA = 4;
const ECHO = 5;

export class Mix {
  total() {
    return ECHO + DELTA + CHARLIE + BRAVO + ALPHA;
  }
}
"""

# A child interpreter with the hash seed set: -I and -E would ignore PYTHONHASHSEED, so neither is passed.
NAMED = ("import sys; sys.path.insert(0, sys.argv[1]); import source_scan; "
         "print(*[d.split(chr(39))[1] for r, _, d in source_scan.os1_findings('src/mix.js', sys.stdin.read()) "
         "if r == 'OS-1_module_constant'])")


class DataclassSignatures(unittest.TestCase):
    def test_a_dataclass_s_fields_are_its_constructor_inputs_in_order(self):
        sig = SCAN.signatures("src/entry.py", FIELDS)
        self.assertEqual(sig["Entry"]["__init__"], ["key", "amount", "when", "seed"])
        self.assertEqual(sig["Entry"]["total"], ["rate"])
        self.assertEqual(sig["Bare"]["__init__"], ["one"])

    def test_a_written_constructor_wins_and_init_false_writes_none(self):
        sig = SCAN.signatures("src/entry.py", FIELDS)
        self.assertEqual(sig["Written"]["__init__"], ["other"])
        self.assertNotIn("__init__", sig["NoInit"])
        self.assertNotIn("__init__", sig["Plain"])

    def test_os12_operations_still_leave_the_constructor_out(self):
        self.assertEqual(P4._public_ops("src/entry.py", FIELDS), {"total": ["rate"]})


class PerClassDeclarations(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix="mf-decl-"))
        (self.root / "ui").mkdir()
        (self.root / "ui" / "interface-contract.md").write_text(CONTRACT, encoding="utf-8")

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def problems(self, source: str, cell: str, rel: str = "src/kernel.py") -> list[str]:
        """The declarations check's details for `rel` under one object-model row with `cell`."""
        (self.root / "src").mkdir(exist_ok=True)
        (self.root / rel).write_text(source, encoding="utf-8")
        (self.root / "INSTRUMENTS").mkdir(exist_ok=True)
        (self.root / "INSTRUMENTS" / "object-model-and-parameters.md").write_text(
            "| Module | File | Traces to | Responsibility | Declared inputs (OS-1) | Decides | Status |\n"
            "|---|---|---|---|---|---|---|\n"
            f"| MOD-01 Kernel | {rel} | x | x | {cell} | NO | BUILT |\n", encoding="utf-8")
        return [p["detail"] for p in SEAL.check_declarations(self.root, {})]

    def test_each_class_is_compared_to_its_own_part_of_the_cell(self):
        self.assertEqual(self.problems(STORE, "AppendOnlyStore: path, clock; LocalityGuard: locality"), [])

    def test_a_class_the_cell_does_not_name_takes_the_plain_part(self):
        self.assertEqual(self.problems(STORE, "path, clock; LocalityGuard: locality; StoreRefused: none"), [])
        self.assertEqual(self.problems(STORE, "path, clock; LocalityGuard: locality"), [
            "StoreRefused: object model declares ['clock', 'path'], not in the constructor signature"])

    def test_a_per_class_part_still_finds_a_missing_and_an_extra_input(self):
        self.assertEqual(self.problems(STORE, "AppendOnlyStore: path, ledger; LocalityGuard: locality"), [
            "AppendOnlyStore: constructor takes ['clock'], absent from the object-model Declared inputs cell",
            "AppendOnlyStore: object model declares ['ledger'], not in the constructor signature"])

    def test_a_class_the_cell_does_not_name_takes_nothing_when_there_is_no_plain_part(self):
        self.assertEqual(self.problems(STORE, "AppendOnlyStore: path, clock"), [
            "LocalityGuard: constructor takes ['locality'], absent from the object-model Declared inputs cell"])

    def test_a_none_cell_over_a_dataclass_is_refused_by_name(self):
        for cell in ("none", "-", "—"):
            self.assertEqual(self.problems(GUARD, cell), [
                f"LocalityGuard: the object-model Declared inputs cell says '{cell}', but the constructor takes "
                f"['locality', 'region'] — declare them"])
        self.assertEqual(self.problems(GUARD, "locality, region"), [])

    def test_a_none_part_over_a_class_that_takes_inputs_is_refused(self):
        self.assertEqual(self.problems(STORE, "AppendOnlyStore: path, clock; LocalityGuard: none"), [
            "LocalityGuard: the object-model Declared inputs cell says 'none', but the constructor takes "
            "['locality'] — declare them"])

    def test_a_plain_cell_over_several_input_taking_classes_asks_for_the_per_class_form(self):
        found = self.problems(STORE, "path, clock, locality")
        self.assertEqual(len(found), 1)
        self.assertIn("2 classes in this file take constructor inputs", found[0])
        self.assertIn("`AppendOnlyStore: path, clock; LocalityGuard: locality`", found[0])
        self.assertEqual(self.problems(STORE, "none"), found)

    def test_a_plain_cell_keeps_its_meaning_for_one_class(self):
        self.assertEqual(self.problems(ONE, "clock, store"), [])
        self.assertEqual(self.problems(ONE, "clock"), [
            "Ledger: constructor takes ['store'], absent from the object-model Declared inputs cell"])

    def test_a_second_class_in_a_js_or_ts_file_is_compared(self):
        """2.7.0: the JS/TS reader read the first class only, which took the file's last constructor."""
        for rel in ("src/kernel.ts", "src/kernel.js"):
            with self.subTest(rel=rel):
                self.assertEqual(self.problems(TWO_JS, "Store: path, clock; Guard: locality", rel), [])
                self.assertEqual(self.problems(TWO_JS, "Store: path, clock", rel), [
                    "Guard: constructor takes ['locality'], absent from the object-model Declared inputs cell"])
                found = self.problems(TWO_JS, "path, clock", rel)
                self.assertEqual(len(found), 1)
                self.assertIn("`Store: path, clock; Guard: locality`", found[0])


TWO_JS = """// The class below holds the path; this comment's words are not a class.
export class Store {
  constructor(path, clock) {
    this.path = path;
    this.clock = clock;
  }
}

export class Guard {
  constructor(locality) {
    this.locality = locality;
  }
}
"""


class JsEveryClass(unittest.TestCase):
    """2.7.0: a JS/TS file's signatures cover every class, each with its own method heads."""

    def test_each_class_reads_its_own_heads(self):
        text = ("export class Store {\n  constructor(path, clock) {\n  }\n\n  commit(batch) {\n    return batch;\n  }\n}\n"
                "\nexport class Guard {\n  constructor(locality) {\n  }\n\n  check(path) {\n    return path;\n  }\n}\n")
        self.assertEqual(SCAN.signatures("src/kernel.ts", text), {
            "Store": {"constructor": ["path", "clock"], "commit": ["batch"]},
            "Guard": {"constructor": ["locality"], "check": ["path"]}})
        self.assertEqual(P4._public_ops("src/kernel.ts", text), {"commit": ["batch"], "check": ["path"]},
                         "OS-12 reads the same operations as before")
        self.assertEqual(SCAN.signatures("src/kernel.ts", "const make = () => class extends Base {\n};\n"), {})


KERNEL = '''from dataclasses import dataclass, field


@dataclass(frozen=True, eq=False)
class AppendOnlyStore:
    path: str
    header_id: str
    locality: object
    home: str
    cache: dict = field(init=False, default_factory=dict)
'''

ENTITY = '''from dataclasses import dataclass

from ledger.store_kernel import AppendOnlyStore


@dataclass(frozen=True, eq=False)
class EntityFile(AppendOnlyStore):
    lease: object
    open_proposal_probe: object
    checks: tuple
    schema_version: int
'''

V2_CELL = "EntityFile: path, home, locality, header_id, lease, open_proposal_probe, checks, schema_version"


class InheritedFields(unittest.TestCase):
    """2.6.24: a dataclass's __init__ takes the fields it inherits first (LedgerCore V2, EntityFile(AppendOnlyStore),
    28 Oct 2026: the true cell was refused for the base's fields, and only an untrue one passed)."""

    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix="mf-inherit-"))
        self.addCleanup(shutil.rmtree, self.root, True)

    def put(self, rel: str, text: str) -> None:
        (self.root / rel).parent.mkdir(parents=True, exist_ok=True)
        (self.root / rel).write_text(text, encoding="utf-8")

    def ctor(self, rel: str, cls: str, root=None) -> list[str]:
        return SCAN.signatures(rel, (self.root / rel).read_text(encoding="utf-8"), root)[cls]["__init__"]

    def test_a_base_in_the_same_file_gives_its_fields_first(self):
        self.put("src/kernel.py", KERNEL + ENTITY.split("\n\n\n", 1)[1])
        self.assertEqual(self.ctor("src/kernel.py", "EntityFile"), [
            "path", "header_id", "locality", "home", "lease", "open_proposal_probe", "checks", "schema_version"])

    def test_a_base_imported_from_a_file_under_root_is_read_with_the_root(self):
        self.put("src/ledger/store_kernel.py", KERNEL)
        self.put("src/ledger/entity_store.py", ENTITY)
        self.assertEqual(self.ctor("src/ledger/entity_store.py", "EntityFile", self.root)[:4],
                         ["path", "header_id", "locality", "home"])
        self.assertEqual(self.ctor("src/ledger/entity_store.py", "EntityFile"),
                         ["lease", "open_proposal_probe", "checks", "schema_version"], "without a root, own only")

    def test_a_relative_import_and_a_re_export_are_followed(self):
        self.put("src/ledger/store_kernel.py", KERNEL)
        self.put("src/ledger/__init__.py", "from .store_kernel import AppendOnlyStore as Store\n")
        self.put("src/ledger/entity_store.py", ENTITY.replace("from ledger.store_kernel import AppendOnlyStore",
                                                              "from . import Store as AppendOnlyStore"))
        self.assertEqual(len(self.ctor("src/ledger/entity_store.py", "EntityFile", self.root)), 8)

    def test_a_field_declared_again_keeps_its_place_and_init_false_drops_it(self):
        self.put("src/kernel.py", KERNEL + "\n\n@dataclass\nclass Child(AppendOnlyStore):\n    home: str = 'F_E'\n"
                 "    locality: object = field(init=False, default=None)\n    lease: object = None\n")
        self.assertEqual(self.ctor("src/kernel.py", "Child"), ["path", "header_id", "home", "lease"])

    def test_the_v2_cell_passes_the_declarations_check_and_an_untrue_one_does_not(self):
        self.put("src/ledger/store_kernel.py", KERNEL)
        self.put("src/ledger/entity_store.py", ENTITY)
        (self.root / "ui").mkdir()
        (self.root / "ui" / "interface-contract.md").write_text(CONTRACT, encoding="utf-8")

        def problems(cell: str) -> list[str]:
            self.put("INSTRUMENTS/object-model-and-parameters.md",
                     "| Module | File | Traces to | Responsibility | Declared inputs (OS-1) | Decides | Status |\n"
                     "|---|---|---|---|---|---|---|\n"
                     f"| MOD-05 EntityStore | src/ledger/entity_store.py | x | x | {cell} | YES | BUILT |\n")
            return [p["detail"] for p in SEAL.check_declarations(self.root, {})]
        self.assertEqual(problems(V2_CELL), [])
        self.assertEqual(problems("EntityFile: lease, open_proposal_probe, checks, schema_version"), [
            "EntityFile: constructor takes ['header_id', 'home', 'locality', 'path'], absent from the object-model "
            "Declared inputs cell"])


class ContractNamed(unittest.TestCase):
    """2.6.24: a contract finding names the contract the check reads. It named ui/ under any ui_root, so FirmOS
    (ui_root web) had its ui/ mirror charged at commit and the web/ contract never (fae3afe7)."""

    def test_the_finding_names_the_file_read(self):
        root = Path(tempfile.mkdtemp(prefix="mf-contract-"))
        self.addCleanup(shutil.rmtree, root, True)
        for folder in ("web", "ui"):
            (root / folder).mkdir()
            (root / folder / "interface-contract.md").write_text(
                "## Actions\n\n| Operation | Inputs |\n|---|---|\n| A.op | none |\n", encoding="utf-8")
        for cfg, want in (({"ui_root": "web"}, "web/interface-contract.md"), ({}, "ui/interface-contract.md")):
            with self.subTest(cfg=cfg):
                found = [p["file"] for p in SEAL.check_declarations(root, cfg) if "Actions table" in p["detail"]]
                self.assertEqual(found, [want])


class JsConstantOrder(unittest.TestCase):
    def named(self, seed: int) -> str:
        env = {**os.environ, "PYTHONHASHSEED": str(seed)}
        r = subprocess.run([sys.executable, "-B", "-c", NAMED, str(TOOLS)], input=MIX, capture_output=True,
                           text=True, env=env, timeout=60)
        self.assertEqual(r.returncode, 0, r.stderr)
        return r.stdout.strip()

    def test_the_constant_a_finding_names_is_the_first_in_source_order_under_any_hash_seed(self):
        self.assertEqual({self.named(seed) for seed in range(8)}, {"ALPHA"})


if __name__ == "__main__":
    unittest.main()
