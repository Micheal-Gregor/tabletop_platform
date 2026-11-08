"""The OS-3 and OS-12 scanners in phase4-checks.py read what the standard says (2.6.20, LedgerCore V2 step 2).

OS-3 judges the class a seam injects and a whole-module import, not every name in the target's file: OS-3 lets a plain
value be imported directly. Its import keywords count only where a statement starts. OS-12 leaves a typing.Protocol's
stubs out of the operations a test must call, and does not count a double's `def` line as a call.

2.6.24: OS-1's JS method head, OS-2 on code only, OS-12 reading a test not yet staged.

2.7.0: OS-3 skips a class a seam's cell names when its S2 or object-model row calls it a value or Decides NO.

Run: python -m unittest discover -s tools/tests
"""
import importlib.util
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1]


def load_tool(name: str, file: str):
    spec = importlib.util.spec_from_file_location(name, TOOLS / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


P4 = load_tool("phase4_checks", "phase4-checks.py")
SCAN = load_tool("source_scan", "source_scan.py")

PORTS = '''from typing import Protocol

from .store_kernel import CommitBatch, Record, TraceNotWritten


class AuthorityDecider(Protocol):
    def authorize(self, actor, act) -> bool:
        """Whether `actor` may take `act`."""
        ...


class LeaseDecider(Protocol):
    def holds(self, lease) -> bool: ...


class Ranked(Protocol):
    def rank(self, items) -> list:
        return sorted(items)


class Act:
    def __init__(self, store, decider):
        self._store, self._decider = store, decider

    def execute(self, actor, records):
        return self._store.commit(CommitBatch(records))
'''


V2_SEAMS = """# S3

## 2. Partition

| MOD | Name | File |
|---|---|---|
| MOD-25 | StoreKernel | src/store_kernel.py |
| MOD-05 | EntityStore | src/entity_store.py |
| MOD-01 | FirmRegistry | src/firm_registry.py |

## 4. Seams

| Seam | Source | Target | What | When | Rule | Binding |
|---|---|---|---|---|---|---|
| SEAM-02 | MOD-05 | MOD-25 | `LocalityGuard` instance, path | at construction | not synced | INJECTED |
| SEAM-03 | MOD-05 | MOD-25 | inherits OBJ-06 AppendOnlyStore | at definition | is-a | INJECTED |
| SEAM-17 | MOD-01 | MOD-25 | Φ's `path` | at construction | not synced | INJECTED |
"""

KERNEL = """class AppendOnlyStore:
    def commit(self, batch):
        return batch


class LocalityGuard:
    def check(self, path):
        return path


class CommitBatch:
    pass


class StoreMissing(Exception):
    pass
"""

ENTITY = """from .store_kernel import AppendOnlyStore
from .store_kernel import StoreMissing


class EntityFile(AppendOnlyStore):
    def __init__(self, path, guard):
        self._path, self._guard = path, guard
"""

FIRM = """from .store_kernel import CommitBatch, StoreMissing


class FirmRegistry:
    def __init__(self, path):
        self._path = path
"""


V2_ACT_SEAMS = """# S3

## 2. Partition

| MOD | Name | File |
|---|---|---|
| MOD-24 | ActProtocol | src/act_protocol.py |
| MOD-16 | Controls | src/controls.py |

## 4. Seams

| Seam | Source | Target | What | When | Rule | Binding |
|---|---|---|---|---|---|---|
| SEAM-97 | MOD-16 | MOD-24 | Outcome domain; RC-09 wrapper | at construction | first non-PASS | INJECTED |
| SEAM-98 | MOD-16 | MOD-24 | `ActPrecondition` instance | at construction | caller gate | INJECTED |
"""

V2_S2 = """# S2

## 2. Expressed Object Model

| ID | Node | Kind | Tag | Traces to | Status | Decides |
|---|---|---|---|---|---|---|
| OBJ-01 | Act | Abstract base | — | GX-01 | ACTIVE | NO |
| OBJ-02 | ActPrecondition | Guard | — | GX-01 | ACTIVE | YES |
| OBJ-03 | Outcome | Value | — | GX-12 | ACTIVE | NO |
"""

V2_OM = """# Object Model

## Modules

| Module | File | Traces to | Responsibility | Declared inputs (OS-1) | Decides | Status |
|---|---|---|---|---|---|---|
| MOD-24 ActProtocol | src/act_protocol.py | MOD-24 | the act protocol | precondition | YES | BUILT |
| Outcome | src/act_protocol.py | MOD-24 | the outcome value | kind, arg | NO | BUILT |
"""

ACT_PROTOCOL = """class Act:
    def __init__(self, precondition):
        self._precondition = precondition


class ActPrecondition:
    def check(self, request):
        return request


class Outcome:
    def __init__(self, kind, arg):
        self.kind, self.arg = kind, arg
"""

CONTROLS = """from .act_protocol import Act, Outcome


class LockAct(Act):
    def guard(self, figures):
        return Outcome("PASS", figures)
"""


class OS3(unittest.TestCase):
    def takes(self, body: str, rel: str = "src/act_protocol.py", stem: str = "store_kernel",
              cls: str = "AppendOnlyStore") -> bool:
        return P4.imports_injected(rel, body, stem, cls)

    def test_the_seam_names_the_injected_class(self):
        self.assertEqual(P4.seam_class("`Clock.now()`"), "Clock")
        self.assertEqual(P4.seam_class("target `AppendOnlyStore.commit(batch)`"), "AppendOnlyStore")
        self.assertEqual(P4.seam_class("a store"), "")

    def test_plain_values_from_the_targets_file_pass(self):
        self.assertFalse(self.takes("from .store_kernel import CommitBatch, Record, TraceNotWritten\n"))
        self.assertFalse(self.takes("import { CommitBatch } from './store_kernel.js';\n", "src/act.ts"))

    def test_the_injected_class_or_the_whole_module_is_refused(self):
        for body in ("from .store_kernel import (\n    CommitBatch,\n    AppendOnlyStore,\n)\n",
                     "import ledgercore.store_kernel\n", "from ledgercore import store_kernel\n",
                     "from .store_kernel import *\n", "from elsewhere import AppendOnlyStore\n",
                     "import importlib\nk = importlib.import_module('ledgercore.store_kernel')\n"):
            with self.subTest(body=body):
                self.assertTrue(self.takes(body))
        for body in ("import { AppendOnlyStore } from './store_kernel.js';\n", "import * as k from './store_kernel';\n",
                     "import Store from './store_kernel';\n", "const k = require('./store_kernel');\n",
                     "const s = new AppendOnlyStore(path);\n"):
            with self.subTest(body=body):
                self.assertTrue(self.takes(body, "src/act.ts"))

    def test_a_word_is_not_an_import(self):
        body = 'class Act:\n    def go(self):\n        """Read the time from the clock."""\n' \
               '        self._require(self.clock, "clock")\n'
        self.assertFalse(self.takes(body, stem="clock", cls="Clock"))
        self.assertFalse(self.takes("this._require(this.clock);\n", "src/act.ts", "clock", "Clock"))
        self.assertTrue(self.takes("from clock import Clock\n", stem="clock", cls="Clock"))

    def test_a_seam_naming_no_class_takes_only_the_whole_module(self):
        self.assertFalse(self.takes("from .store_kernel import CommitBatch, AppendOnlyStore\n", cls=""))
        self.assertFalse(self.takes("import { CommitBatch } from './store_kernel.js';\n", "src/act.ts", cls=""))
        for body in ("import ledgercore.store_kernel\n", "from ledgercore import store_kernel\n",
                     "from .store_kernel import *\n"):
            with self.subTest(body=body):
                self.assertTrue(self.takes(body, cls=""))
        self.assertTrue(self.takes("import * as k from './store_kernel';\n", "src/act.ts", cls=""))

    def test_the_seam_names_the_classes_its_target_declares(self):
        declared = {"AppendOnlyStore", "LocalityGuard", "LeaseDecider", "CommitBatch"}
        self.assertEqual(P4.seam_classes("`Clock.now()`", set(), set()), ["Clock"])
        self.assertEqual(P4.seam_classes("LeaseDecider.holds` / `holds_now", declared, set()), ["LeaseDecider"])
        self.assertEqual(P4.seam_classes("LocalityGuard` instance, path", declared, set()), ["LocalityGuard"])
        self.assertEqual(P4.seam_classes("Φ's `path", declared, set()), [], "a value: no class is handed in")
        self.assertEqual(P4.seam_classes("the act / sign-in instant `t", declared, set()), [])

    def test_a_cells_operations_name_the_class_that_answers_them(self):
        """V2 SEAM-29 names PeriodState only by its operations."""
        methods = {"PeriodState": {"state", "earliest_open", "latest_locked", "place"},
                   "PeriodPlacement": {"place", "compare"}, "PeriodOrdinal": {"rank"}}
        cell = "latest_locked()`, `state`, `earliest_open`; \"is effective(X) in a locked period?\""
        self.assertEqual(P4.seam_classes(cell, set(methods), set(), methods), ["PeriodState"])
        self.assertEqual(P4.seam_classes("`place` in the calendar", set(methods), set(), methods),
                         ["PeriodState", "PeriodPlacement"], "a tie names every class that answers")
        self.assertEqual(P4.seam_classes("the period's state", set(methods), set(), methods), [], "a word is not one")
        self.assertEqual(P4.class_methods("src/p.py", "class P:\n    def place(self, x):\n        return x\n\n"
                                                      "    def _hidden(self):\n        return 1\n"), {"P": {"place"}})

    def test_a_class_the_seam_says_is_inherited_is_not_handed_in(self):
        declared = {"AppendOnlyStore", "LocalityGuard"}
        cell = "inherits OBJ-06 AppendOnlyStore"
        self.assertEqual(P4.seam_classes(cell, declared, {"AppendOnlyStore"}), [])
        self.assertEqual(P4.seam_classes(cell, declared, set()), ["AppendOnlyStore"], "not subclassed: still a class")
        self.assertEqual(P4.seam_classes("LocalityGuard` instance, path", declared, {"LocalityGuard"}),
                         ["LocalityGuard"], "only a seam that says it inherits")

    def test_ledgercore_v2_stores_pass_and_an_imported_guard_is_refused(self):
        """INT-47 (MOD-05) and SEAM-17 (MOD-01): the seams to MOD-25 hand in a guard, a path and a base class."""
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "src").mkdir()
            (root / "S3.md").write_text(V2_SEAMS, encoding="utf-8")
            (root / "src" / "store_kernel.py").write_text(KERNEL, encoding="utf-8")
            (root / "src" / "entity_store.py").write_text(ENTITY, encoding="utf-8")
            (root / "src" / "firm_registry.py").write_text(FIRM, encoding="utf-8")
            cfg, allowed = {"s3_document": "S3.md"}, (lambda file, rule: False)
            self.assertEqual(P4.check_os3(root, cfg, allowed), [])
            (root / "src" / "entity_store.py").write_text(
                ENTITY.replace("import AppendOnlyStore", "import AppendOnlyStore, LocalityGuard"), encoding="utf-8")
            found = P4.check_os3(root, cfg, allowed)
            self.assertEqual([(f["rule"], f["file"]) for f in found], [("OS-3_decider_imported", "src/entity_store.py")])
            self.assertIn("LocalityGuard", found[0]["detail"])

    def test_a_seam_cell_naming_a_value_or_a_decides_no_class_hands_in_no_decider(self):
        """2.7.0 (LedgerCore V2 SEAM-97, INT-310): "Outcome domain" names the value Outcome (OBJ-03, Decides NO)."""
        declared = {"Outcome", "ActPrecondition"}
        self.assertEqual(P4.seam_classes("Outcome domain; RC-09 wrapper", declared, set()), ["Outcome"])
        self.assertEqual(P4.seam_classes("Outcome domain; RC-09 wrapper", declared, set(), None, {"Outcome"}), [])
        self.assertEqual(P4.seam_classes("`ActPrecondition` instance", declared, set(), None, {"Outcome"}),
                         ["ActPrecondition"], "a decider is still handed in")

    def test_ledgercore_v2_controls_import_the_value_and_an_imported_decider_is_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "src").mkdir()
            (root / "S3.md").write_text(V2_ACT_SEAMS, encoding="utf-8")
            (root / "src" / "act_protocol.py").write_text(ACT_PROTOCOL, encoding="utf-8")
            (root / "src" / "controls.py").write_text(CONTROLS, encoding="utf-8")
            cfg, allowed = {"s3_document": "S3.md"}, (lambda file, rule: False)
            found = P4.check_os3(root, cfg, allowed)
            self.assertEqual([f["rule"] for f in found], ["OS-3_decider_imported"], "no row says Outcome is a value")
            (root / "S2.md").write_text(V2_S2, encoding="utf-8")
            self.assertEqual(P4.check_os3(root, dict(cfg, s2_document="S2.md"), allowed), [], "S2: a Value, NO")
            (root / "INSTRUMENTS").mkdir()
            (root / "INSTRUMENTS" / "object-model-and-parameters.md").write_text(V2_OM, encoding="utf-8")
            self.assertEqual(P4.check_os3(root, cfg, allowed), [], "the object model's row: Decides NO")
            (root / "src" / "controls.py").write_text(
                CONTROLS.replace("import Act, Outcome", "import Act, ActPrecondition, Outcome"), encoding="utf-8")
            found = P4.check_os3(root, dict(cfg, s2_document="S2.md"), allowed)
            self.assertEqual([(f["rule"], f["file"]) for f in found], [("OS-3_decider_imported", "src/controls.py")])
            self.assertIn("ActPrecondition", found[0]["detail"])
            self.assertNotIn("Outcome", found[0]["detail"])

    def test_php_keeps_its_use_new_and_static_reading(self):
        self.assertTrue(self.takes("<?php\nuse App\\Records\\Ledger;\n", "src/Act.php", "Ledger", "Ledger"))
        self.assertFalse(self.takes("<?php\nuse App\\Records\\Entry;\n", "src/Act.php", "Ledger", "Ledger"))


class OS12(unittest.TestCase):
    def test_a_protocols_stubs_are_not_operations(self):
        ops = P4._public_ops("src/act_protocol.py", PORTS)
        self.assertNotIn("authorize", ops)
        self.assertNotIn("holds", ops)
        self.assertIn("rank", ops, "a Protocol method with a body is code the class answers")
        self.assertEqual(ops["execute"], ["actor", "records"])

    def test_a_def_line_is_not_a_call(self):
        self.assertEqual(P4.calls_of("authorize", "class Double:\n    def authorize(self, actor, act):\n"
                                                  "        return True\n"), 0)
        self.assertEqual(P4.calls_of("px1", "    async def px1(self, port):\n        return None\n"), 0)
        self.assertEqual(P4.calls_of("holds", "class D {\n  holds(lease) {\n    return true;\n  }\n}\n"), 0)
        self.assertEqual(P4.calls_of("holds", "const d = {\n  holds(lease): boolean {\n    return true;\n  }\n};\n"), 0)
        self.assertEqual(P4.calls_of("execute", "act.execute(a, r1)\nassert act.execute(b, r1) != x\n"), 2)

    def test_a_real_operation_named_only_by_a_double_is_never_called(self):
        found = P4.operation_findings({"execute": ["actor", "records"]},
                                      "class Fake:\n    def execute(self, actor, records):\n        pass\n", {}, "t.py")
        self.assertEqual([f["rule"] for f in found], ["OS-12_operation_untested"])

    def test_a_property_is_found(self):
        text = ("class Store:\n    @property\n    def schema_version(self):\n        return self._v\n\n"
                "    @functools.cached_property\n    def header(self):\n        return self._h\n\n"
                "    def read(self, as_of):\n        return as_of\n")
        self.assertEqual(P4.property_names("src/store.py", text), {"schema_version", "header"})
        self.assertEqual(P4.property_names("src/store.ts", "class S {\n  get v() { return 1; }\n}\n"), set())

    def test_reading_a_property_is_its_call(self):
        """INT-49: a @property is read, never called with parentheses."""
        ops, props = {"schema_version": []}, {"schema_version"}
        self.assertEqual(P4.operation_findings(ops, "assert store.schema_version == 3\n", {}, "t.py", props), [])
        for body in ("store.schema_version = 3\n", "assert store.schema_version_old == 3\n"):
            with self.subTest(body=body):
                found = P4.operation_findings(ops, body, {}, "t.py", props)
                self.assertEqual([f["rule"] for f in found], ["OS-12_operation_untested"])
        found = P4.operation_findings({"read": []}, "assert store.read == f\n", {}, "t.py", props)
        self.assertEqual([f["rule"] for f in found], ["OS-12_operation_untested"], "a method is still called")


WALL = """export class FirmWall {
  wall(input: EdgeInput, named: NamedOwn | null = null): DacApiResult | null {
    if (named !== null) {
      requireText(named.firm, "named.firm");
    }
    for (const firm of [...this.#places, ...this.#offered]) {
      this.#seen.add(firm);
    }
    return this.#lock.lock(input, named);
  }
}
"""


class OS1JsHeads(unittest.TestCase):
    """2.6.24 (FirmOS, src/app/dac-firm-wall.ts): a control line is not a method head, and a head with a return type
    is one. The scan read `if (named !== null) {` as a method with a default and missed the default before `): T {`."""

    def findings(self, text: str) -> list[tuple[str, int]]:
        return [(rule, line) for rule, line, _ in SCAN.os1_findings("src/app/dac-firm-wall.ts", text)]

    def test_the_default_before_a_return_type_is_found_and_no_control_line_is_read(self):
        self.assertEqual(self.findings(WALL), [("OS-1_default_argument", 2)])

    def test_modifiers_and_a_generic_return_type_are_read(self):
        text = "class A {\n  private static async load(a: number = 1): Promise<Map<string, number>> {\n  }\n}\n"
        self.assertEqual(self.findings(text), [("OS-1_default_argument", 2)])

    def test_comparisons_are_not_defaults(self):
        text = "class A {\n  same(a: number, b: number): boolean {\n    return a === b || a >= b;\n  }\n}\n"
        self.assertEqual(self.findings(text), [])

    def test_the_literal_return_test_keeps_to_untyped_heads(self):
        self.assertEqual(self.findings("class A {\n  kind() {\n    return 'x';\n  }\n}\n"),
                         [("OS-1_undeclared_input", 2)])
        self.assertEqual(self.findings("class A {\n  realise(): R {\n    return { ref: this.#ref };\n  }\n}\n"), [])


DOC_SINGLETON = '''class Configuration:
    """Reads one version.

    Every query is a singleton read (`basis_at`), never a range."""

    def basis_at(self, t):
        # getInstance() is never called here; os.environ is not read.
        return self._basis[t]
'''


class OS2CodeOnly(unittest.TestCase):
    """2.6.24 (LedgerCore V2, configuration.py:904): OS-2 reads code. A docstring or comment that says "singleton" is
    prose, and was refused as an ambient read."""

    def ambient(self, rel: str, text: str) -> list[str]:
        patterns, _ = P4.object_patterns({})
        return [f["detail"].split(":")[0] for f in P4.ambient_findings(rel, text, patterns, lambda *_: False)]

    def test_docstrings_and_comments_are_not_read(self):
        self.assertEqual(self.ambient("src/configuration.py", DOC_SINGLETON), [])

    def test_code_is_still_read_on_its_own_line(self):
        planted = DOC_SINGLETON + "\n\nREGISTRY = Registry.getInstance()\n"
        self.assertEqual(self.ambient("src/configuration.py", planted), ["line 11"])

    def test_a_js_comment_is_blank_and_a_string_holding_slashes_is_not_a_comment(self):
        self.assertEqual(self.ambient("src/a.ts", "/** a singleton */\n// process.env is not read\nconst a = 1;\n"),
                         [])
        self.assertEqual(self.ambient("src/a.ts", 'const u = "http://x"; const e = process.env.HOME;\n'), ["line 1"])

    def test_the_gate_reads_code_only_too(self):
        root = Path(tempfile.mkdtemp(prefix="mf-os2-"))
        self.addCleanup(shutil.rmtree, root, True)
        (root / ".metaframework").mkdir()
        (root / ".metaframework" / "project.json").write_text('{"source_glob": "src/**"}', encoding="utf-8")
        gate = load_tool("gate", "gate.py")
        self.assertIsNone(gate.ambient_hit(root, "src/configuration.py",
                                           DOC_SINGLETON.replace("singleton read", "getInstance() read")))
        self.assertIsNotNone(gate.ambient_hit(root, "src/configuration.py", "x = Registry.getInstance()\n"))


class OS12Untracked(unittest.TestCase):
    """2.6.24 (LedgerCore V2, INT-185): an isolation test written but not yet staged is read; an ignored one is not."""

    def test_an_untracked_isolation_test_is_read(self):
        root = Path(tempfile.mkdtemp(prefix="mf-os12-"))
        self.addCleanup(shutil.rmtree, root, True)
        for rel, text in (("src/posting.py", "class Posting:\n    def post(self, line):\n        return line\n"),
                          ("tests/test_posting_isolation.py", "assert Posting().post(1) != Posting().post(2)\n")):
            (root / rel).parent.mkdir(parents=True, exist_ok=True)
            (root / rel).write_text(text, encoding="utf-8")
        subprocess.run(["git", "init", "-q", str(root)], check=True)
        std = {"isolation_test_pattern": "tests/**/test_{stem}_isolation.py"}
        self.assertEqual(P4.check_isolation_tests(root, {}, ["src/posting.py"], std), [])
        (root / ".gitignore").write_text("tests/\n", encoding="utf-8")
        found = P4.check_isolation_tests(root, {}, ["src/posting.py"], std)
        self.assertEqual([f["rule"] for f in found], ["OS-12_no_isolation_test"])


if __name__ == "__main__":
    unittest.main()
