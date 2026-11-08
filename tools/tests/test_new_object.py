"""tools/new-object.py scaffolds a JS/TS class that is sealed, documented and Prettier-wide.

Under typescript-code-scorer the 2.6.9 scaffold cost about 0.5 a class: `Object.freeze(this)` in a class anything
could extend (W8), a `//` header and no `@throws` for the constructor's refusals (M3), and lines over 80 columns
(M1). The class now carries a TSDoc comment with `@sealed` and `@throws`, and a `new.target` check before the
freeze: composition roots pass constructors as values, so the constructor stays public (TS standard 5.5). The
Python scaffold is unchanged.

Run from the repository root: python -m unittest discover -s tools/tests
"""
import importlib.util
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1]
NEW_OBJECT = TOOLS / "new-object.py"


def load_tool(name: str, file: str):
    """A tool whose file name is not a module name, loaded from this tools/ directory."""
    spec = importlib.util.spec_from_file_location(name, TOOLS / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


P4 = load_tool("phase4_checks", "phase4-checks.py")


class Scaffolded(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix="mf-new-object-"))
        self.addCleanup(shutil.rmtree, self.root, True)

    def scaffold(self, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run([sys.executable, "-B", str(NEW_OBJECT), *args, "--root", str(self.root)],
                              capture_output=True, text=True, encoding="utf-8", timeout=60)

    def written(self, *args: str) -> str:
        ran = self.scaffold(*args)
        self.assertEqual(ran.returncode, 0, ran.stderr)
        return (self.root / args[args.index("--file") + 1]).read_text(encoding="utf-8")


class TypeScriptClass(Scaffolded):
    def test_the_class_tsdoc_names_its_seal_and_every_refusal(self):
        text = self.written("Spend", "--file", "src/money/spend.ts", "--inputs", "attribution,draws")
        doc, rest = text.split("*/\nexport class Spend {\n", 1)
        self.assertTrue(doc.startswith("/**\n"), "the class comment is TSDoc, not a // header")
        self.assertNotIn("\n//", doc)
        self.assertIn(" * @sealed Enforced at run time by the `new.target` check.", doc)
        self.assertIn(" * @throws TypeError if `attribution` or `draws` is missing, or if a subclass is", doc)

    def test_the_constructor_refuses_a_subclass_before_it_freezes(self):
        text = self.written("Spend", "--file", "src/spend.ts", "--inputs", "clock")
        sealed = text.index("    if (new.target !== Spend)\n      throw new TypeError(")
        self.assertLess(sealed, text.index("    if (clock === undefined)"))
        self.assertLess(sealed, text.index("    Object.freeze(this);"))

    def test_lines_fit_80_columns_as_prettier_breaks_them(self):
        text = self.written("Spend", "--file", "src/spend.ts", "--inputs",
                            "attributionFoldsProvider,unitDrawContextLog,capInForceReader")
        self.assertIn("  constructor({\n    attributionFoldsProvider,\n", text)
        self.assertEqual([ln for ln in text.splitlines() if len(ln) > 80], [])

    def test_a_long_name_breaks_the_refusal_inside_its_call(self):
        text = self.written("ProjectCompositionSettlement", "--file", "src/settlement.ts", "--inputs", "clock")
        self.assertIn('      throw new TypeError(\n        "ProjectCompositionSettlement is sealed and cannot be '
                      'extended",\n      );', text)

    def test_no_inputs_takes_no_parameter_and_throws_only_for_a_subclass(self):
        text = self.written("Clock", "--file", "src/clock.ts", "--no-inputs")
        self.assertIn("  constructor() {\n", text)
        self.assertIn(" * @throws TypeError if a subclass is constructed.\n", text)

    def test_phase4_checks_reads_the_scaffold_as_written(self):
        """The template's own scanners: the class name, its constructor inputs, and no OS-1 finding."""
        text = self.written("Spend", "--file", "src/spend.ts", "--inputs", "attribution,draws")
        self.assertEqual(P4.signatures("src/spend.ts", text), {"Spend": {"constructor": ["attribution", "draws"]}})
        self.assertEqual(P4.os1_findings("src/spend.ts", text), [])

    def test_the_isolation_test_constructs_a_subclass_and_expects_a_type_error(self):
        self.written("Spend", "--file", "src/spend.ts", "--inputs", "clock")
        test = (self.root / "tests" / "spend.isolation.test.ts").read_text(encoding="utf-8")
        self.assertIn("expect(() => new (class extends Spend {})(deps())).toThrow(TypeError);", test)


@unittest.skipUnless(shutil.which("node"), "node is not on PATH")
class JavaScriptBehaviour(Scaffolded):
    PROBE = """
import { Spend } from "./src/spend.js";
const out = [];
const spend = new Spend({ clock: 1 });
out.push(Object.isFrozen(spend));
for (const make of [() => new Spend({}), () => new (class extends Spend {})({ clock: 1 })]) {
  try { make(); out.push("built"); } catch (e) { out.push(e.constructor.name + ": " + e.message); }
}
console.log(JSON.stringify(out));
"""

    def test_the_scaffold_runs_sealed_and_frozen(self):
        self.written("Spend", "--file", "src/spend.js", "--inputs", "clock")
        (self.root / "package.json").write_text('{"type": "module"}\n', encoding="utf-8")
        (self.root / "probe.js").write_text(self.PROBE, encoding="utf-8")
        ran = subprocess.run(["node", "probe.js"], cwd=self.root, capture_output=True, text=True, timeout=60)
        self.assertEqual(ran.returncode, 0, ran.stderr)
        self.assertEqual(ran.stdout.strip(), '[true,"TypeError: Spend requires clock",'
                                             '"TypeError: Spend is sealed and cannot be extended"]')


class PythonClass(Scaffolded):
    def test_the_python_scaffold_is_unchanged(self):
        text = self.written("Ledger", "--file", "src/ledger.py", "--inputs", "clock", "--purpose", "the books")
        self.assertEqual(text, (
            "# Ledger — Object Writing Standard\n"
            "# OS-1  every dependency arrives at construction (below). Nothing is reached for.\n"
            "# OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.\n"
            "# OS-4  the constructor validates and refuses; no half-built instance exists.\n"
            "# OS-5  state is private; expose commands, not setters.\n"
            "# OS-6  every refusal is typed and named in the interface contract.\n"
            "# the books\n"
            "\n\n"
            "class Ledger:\n"
            "    def __init__(self, *, clock):\n"
            "        if clock is None:\n"
            "            raise ValueError('Ledger requires clock')\n"
            "        self._clock = clock\n"
            "\n"
            "    # operations go here. Anything an operation needs that is not above is its own parameter.\n"))

    def test_the_isolation_test_is_unittest_where_the_project_pattern_puts_it(self):
        """2.6.21: the Python preset's pattern, tests/**/test_{stem}_isolation.py, names the file; unittest, not
        pytest, so tools/isolation-run.py and a plain interpreter run it."""
        (self.root / ".metaframework").mkdir()
        (self.root / ".metaframework" / "project.json").write_text(
            '{"object_standard": {"isolation_test_pattern": "tests/**/test_{stem}_isolation.py"}}', encoding="utf-8")
        self.written("Ledger", "--file", "src/ledger.py", "--inputs", "clock", "--operations", "balance")
        test = (self.root / "tests" / "test_ledger_isolation.py").read_text(encoding="utf-8")
        self.assertIn("import unittest", test)
        self.assertNotIn("pytest", test)
        self.assertIn("self.assertNotEqual(a, b)", test)

    def test_with_the_default_pattern_the_isolation_test_keeps_its_name(self):
        self.written("Ledger", "--file", "src/ledger.py", "--inputs", "clock")
        self.assertTrue((self.root / "tests" / "ledger.isolation.test.py").is_file())


if __name__ == "__main__":
    unittest.main()
