"""2.7.0: base cases first, enforced. The owner's ruling "Gate refuses early" (29 Oct 2026).

`brief.py red --nonce N` runs each test the step's new base-case rows name, on its own, against the module's current
code, and logs the run only when every one fails or errors. In a Python build the gate refuses a builder's Write or Edit
to its module's S3 §2 File until that line exists, and `brief.py verify` refuses a nonce without one, or whose red test
changed after it. LedgerCore V2 built MOD-13, MOD-10 and MOD-19 code first; their tests pinned what the code did.

Run from the repository root: python -m unittest discover -s tools/tests
"""
import json
import subprocess
import sys
import unittest

from test_gate_reach import Repo, git

STUB = "class Ledger:\n    def __init__(self, clock):\n        self.clock = clock\n\n    def post(self, amount):\n" \
       "        raise NotImplementedError\n"
BUILT = "class Ledger:\n    def __init__(self, clock):\n        self.clock = clock\n\n    def post(self, amount):\n" \
        "        if amount < 0:\n            raise ValueError(amount)\n        return amount\n"
TESTS = """import unittest

from src.ledger import Ledger


class LedgerTests(unittest.TestCase):
    def test_negative(self):
        with self.assertRaises(ValueError):
            Ledger(None).post(-1)

    def test_positive(self):
        self.assertEqual(Ledger(None).post(2), 2)

    def test_holds_its_clock(self):
        self.assertEqual(Ledger("c").clock, "c")
"""
ROW = "- **BC-02.1 —** *Given* a negative amount, *when* it is posted, *then* `REFUSE(NEGATIVE)`.\n" \
      "  *(REF-01; test: `tests/test_ledger.py` `{test}`)*\n"


class PythonBuild(Repo):
    """The template's project as a Python build (the preset's commands), MOD-02's stub and tests committed."""

    def setUp(self):
        super().setUp()
        cfg_path = self.root / ".metaframework" / "project.json"
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
        cfg.update({"test_command": 'python -m unittest discover -s tests -p "test_*.py"',
                    "test_select": 'python -m unittest discover -s tests -p "test_*.py" -k {test_name}'})
        cfg_path.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
        self.put("src/ledger.py", STUB)
        self.put("tests/test_ledger.py", TESTS)
        git(self.root, "add", "-A")
        git(self.root, "commit", "-q", "-m", "MOD-02 stub and its tests")

    def put(self, rel: str, text: str) -> None:
        (self.root / rel).parent.mkdir(parents=True, exist_ok=True)
        (self.root / rel).write_bytes(text.encode("utf-8"))

    def add_row(self, test: str = "test_negative", row: str = ROW) -> None:
        with (self.root / "INSTRUMENTS" / "axioms-and-base-cases.md").open("a", encoding="utf-8") as fh:
            fh.write("\n" + row.format(test=test))

    def tool(self, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run([sys.executable, str(self.root / "tools" / "brief.py"), *args, "--root", str(self.root)],
                              capture_output=True, text=True, encoding="utf-8", timeout=600)

    def nonce(self, module: str = "MOD-02") -> str:
        ran = self.tool(module)
        self.assertEqual(ran.returncode, 0, ran.stderr)
        return ran.stdout.split()[2].split("=")[1]

    def probe(self, nonce: str, agent: str = "agent-7") -> None:
        self.gate("Write", {"file_path": str(self.root / ".metaframework" / "gate-probe"), "content": f"nonce={nonce}"},
                  cwd=self.root, project=self.root, agent_id=agent, agent_type="builder")

    def builder_writes(self, rel: str, agent: str = "agent-7", text: str = BUILT) -> subprocess.CompletedProcess:
        extra = {"agent_id": agent, "agent_type": "builder"} if agent else {}
        return self.gate("Write", {"file_path": str(self.root / rel), "content": text}, cwd=self.root,
                         project=self.root, **extra)

    def red_lines(self) -> list[dict]:
        log = self.root / ".metaframework" / "red-log.jsonl"
        return [json.loads(x) for x in log.read_text(encoding="utf-8").splitlines()] if log.is_file() else []


class RedRun(PythonBuild):
    def test_a_red_run_is_logged_when_every_named_test_fails_on_its_own(self):
        nonce = self.nonce()
        self.add_row()
        ran = self.tool("red", "--nonce", nonce)
        self.assertEqual(ran.returncode, 0, ran.stderr)
        (line,) = self.red_lines()
        self.assertEqual((line["module"], line["rows"], list(line["tests"])), ("MOD-02", ["BC-02.1"], ["test_negative"]))
        self.assertEqual((line["tests"]["test_negative"]["ran"], line["tests"]["test_negative"]["errors"]), (1, 1))
        self.assertEqual(list(line["test_files"]), ["tests/test_ledger.py"])
        self.assertEqual(len(line["digests"]["test_negative"]), 64)

    def test_no_red_without_a_new_row_a_named_test_or_a_failure(self):
        nonce = self.nonce()
        cases = (("", "no base-case row added"),
                 ("- **BC-02.1 —** *Given* a negative amount, *then* refused. *(REF-01)*\n", "names no test"),
                 (ROW.replace("{test}", "test_missing"), "no def or class of that name"),
                 (ROW.replace("{test}", "test_holds_its_clock"), "passed against the current code"))
        for row, said in cases:
            with self.subTest(said=said):
                git(self.root, "checkout", "-q", "--", "INSTRUMENTS/axioms-and-base-cases.md")
                if row:
                    self.add_row(row=row)
                ran = self.tool("red", "--nonce", nonce)
                self.assertEqual(ran.returncode, 1, ran.stdout)
                self.assertIn(said, ran.stderr)
        self.assertEqual(self.red_lines(), [])

    def test_a_test_file_that_does_not_import_is_no_red(self):
        nonce = self.nonce()
        self.add_row()
        self.put("tests/test_broken.py", "import no_such_module\n")
        ran = self.tool("red", "--nonce", nonce)
        self.assertEqual(ran.returncode, 1, ran.stdout)
        self.assertIn("does not import", ran.stderr)

    def test_a_nonce_the_brief_never_issued_runs_nothing(self):
        self.add_row()
        self.assertIn("never issued", self.tool("red", "--nonce", "ab" * 8).stderr)

    def test_the_brief_tells_the_builder_to_run_it(self):
        text = self.tool("MOD-02").stdout
        self.assertIn("python tools/brief.py red --nonce", text)
        self.assertIn("subagent_type: builder", text)


class GateWaitsForRed(PythonBuild):
    def test_a_builder_writes_its_modules_file_only_after_its_red_run(self):
        nonce = self.nonce()
        self.assertDenied(self.builder_writes("src/ledger.py", agent="agent-9"), "your first call is the probe")
        self.probe(nonce)
        self.assertDenied(self.builder_writes("src/ledger.py"), "MOD-02's file", f"brief.py red --nonce {nonce}")
        self.assertAllowed(self.builder_writes("tests/test_ledger.py", text=TESTS))       # its tests come first
        self.assertAllowed(self.builder_writes("docs/notes.md", text="n\n"))
        self.assertAllowed(self.builder_writes("src/ledger.py", agent=""))                # the lead is not a builder
        self.add_row()
        self.assertEqual(self.tool("red", "--nonce", nonce).returncode, 0)
        self.assertAllowed(self.builder_writes("src/ledger.py"))

    def test_the_red_log_is_the_tools_alone(self):
        log = str(self.root / ".metaframework" / "red-log.jsonl")
        self.assertDenied(self.gate("Write", {"file_path": log, "content": "{}"}, cwd=self.root), "written by the gate")
        self.assertDenied(self.gate("Bash", {"command": "echo {} >> .metaframework/red-log.jsonl"}, cwd=self.root),
                          "written by the gate")

    def test_a_build_red_cannot_run_in_is_not_held_to_it(self):
        cfg_path = self.root / ".metaframework" / "project.json"
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
        cfg_path.write_text(json.dumps({**cfg, "test_select": "npx vitest run -t {test_name}"}), encoding="utf-8")
        nonce = self.nonce()
        self.probe(nonce)
        self.assertAllowed(self.builder_writes("src/ledger.py"))


class VerifyNeedsRed(PythonBuild):
    def verify(self, nonce: str) -> subprocess.CompletedProcess:
        return self.tool("verify", "--nonce", nonce)

    def test_a_step_is_accepted_on_its_red_run_and_an_unchanged_red_test(self):
        nonce = self.nonce()
        self.probe(nonce)
        self.assertIn("no red run for this nonce", self.verify(nonce).stderr)
        self.add_row()
        self.assertEqual(self.tool("red", "--nonce", nonce).returncode, 0)
        self.put("src/ledger.py", BUILT)
        self.assertEqual(self.verify(nonce).returncode, 0, self.verify(nonce).stderr)
        self.put("tests/test_ledger.py", TESTS.replace("Ledger(None).post(2), 2", "Ledger(None).post(3), 3"))
        self.assertEqual(self.verify(nonce).returncode, 0, "a neighbour changed, not the red test")
        self.put("tests/test_ledger.py", TESTS.replace("assertRaises(ValueError)", "assertRaises(Exception)"))
        ran = self.verify(nonce)
        self.assertEqual(ran.returncode, 1)
        self.assertIn("red test test_negative changed after its red run (tests/test_ledger.py)", ran.stderr)


if __name__ == "__main__":
    unittest.main()
