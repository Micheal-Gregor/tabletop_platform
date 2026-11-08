"""tools/spend.py, the spend ledger of Amendment T-1 (TE-1, TE-7, TE-8).

T-1's acceptance criterion: add, then forecast, then status; a ledger with 3 module rows forecasts 13 more modules
within 1 %, and status exits 1 when the forecast exceeds the budget. Around it, the rules the forecast rests on: a
module's build row and its K7 rows are one unit, a kind nobody has measured needs the owner's estimate, an unknown
cost is never counted as zero, and the ledger the template ships is the header add writes. The rows here are dollars
only; measured tokens (2.8.1) are tests/test_measured_tokens.py's.

Run from the repository root: python -m unittest discover -s tools/tests
"""
import importlib.util
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from test_gate_reach import plugin_template

TOOLS = Path(__file__).resolve().parents[1]
SPEND = TOOLS / "spend.py"


def load_tool(name: str, file: str):
    """A tool loaded from this tools/ directory. It is registered in sys.modules before it runs,
    because a dataclass resolves its annotations through its module's entry there."""
    spec = importlib.util.spec_from_file_location(name, TOOLS / file)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


S = load_tool("spend", "spend.py")


class Ledger(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix="mf-spend-"))
        self.addCleanup(shutil.rmtree, self.root, True)
        self.ledger = self.root / ".metaframework" / "spend-ledger.md"

    def spend(self, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run([sys.executable, "-B", str(SPEND), *args, "--ledger", str(self.ledger)],
                              capture_output=True, text=True)

    def add(self, stage: str, *figures: str) -> None:
        done = self.spend("add", "--stage", stage, "--model", "sonnet", "--date", "2026-10-24", *figures)
        self.assertEqual(done.returncode, 0, done.stderr)

    def rows(self) -> list:
        return S.read_rows(self.ledger)

    def test_the_shipped_ledger_is_the_header_add_writes(self):
        shipped = (plugin_template() / ".metaframework" / "spend-ledger.md").read_text(encoding="utf-8")
        self.assertEqual(shipped, S.HEADER)

    def test_add_creates_the_ledger_and_appends_one_row(self):
        self.add("phase1:intake", "--usd", "$3.5", "--note", "Intake approved")
        self.assertEqual(self.rows(), [S.Row("phase1:intake", "-", "sonnet", ("-", "-", "-", "-"), "-", "3.50",
                                             "Intake approved", "2026-10-24")])

    def test_three_modules_forecast_thirteen_more_within_one_percent(self):
        for module, usd in (("MOD-01", "4.00"), ("MOD-02", "5.00"), ("MOD-03", "6.00")):
            self.add(f"module:{module} build", "--usd", usd)
        total, per_unit, measured = S.forecast(self.rows(), "module", 13, "usd", None)
        self.assertAlmostEqual(total, 13 * 5.00, delta=0.01 * 13 * 5.00)
        self.assertEqual(measured, ["MOD-01", "MOD-02", "MOD-03"])

        forecast = self.spend("forecast", "--units", "13", "--unit-kind", "module")
        self.assertEqual(forecast.returncode, 0, forecast.stderr)
        self.assertIn("$65.00", forecast.stdout)
        within = self.spend("status", "--budget", "100", "--units", "13", "--unit-kind", "module")
        self.assertEqual(within.returncode, 0, within.stdout + within.stderr)  # 15 spent + 65 ahead = 80
        over = self.spend("status", "--budget", "70", "--units", "13", "--unit-kind", "module")
        self.assertEqual(over.returncode, 1, over.stdout + over.stderr)
        self.assertIn("OVER BUDGET by $10.00", over.stdout)
        self.assertIn("headroom: -$10.00", over.stdout)

    def test_a_modules_build_and_k7_rows_are_one_unit(self):
        for stage, usd in (("module:MOD-01 build", "3.00"), ("module:MOD-01 K7", "2.00"),
                           ("module:MOD-02 build", "4.00"), ("module:MOD-02 K7", "1.00"), ("phase3:K6", "9.00")):
            self.add(stage, "--usd", usd)
        _, per_unit, measured = S.forecast(self.rows(), "module", 1, "usd", None)
        self.assertAlmostEqual(per_unit, 5.00)
        self.assertEqual(measured, ["MOD-01", "MOD-02"])

    def test_a_kind_nobody_measured_needs_the_owners_estimate(self):
        self.add("phase3:C0", "--usd", "8.00")
        refused = self.spend("forecast", "--units", "16", "--unit-kind", "module")
        self.assertEqual(refused.returncode, 2, refused.stdout)
        priced = self.spend("forecast", "--units", "16", "--unit-kind", "module", "--unit-cost", "4.5")
        self.assertEqual(priced.returncode, 0, priced.stderr)
        self.assertIn("$72.00", priced.stdout)

    def test_a_measured_unit_replaces_the_owners_estimate(self):
        self.add("module:MOD-01 build", "--usd", "6.00")
        done = self.spend("forecast", "--units", "2", "--unit-kind", "module", "--unit-cost", "4.5")
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertIn("$12.00", done.stdout)
        self.assertIn("1 measured: MOD-01", done.stdout)

    def test_an_unknown_cost_is_never_zero(self):
        self.add("phase2:A1", "--usd", "2.00")
        in_dollars = self.spend("status", "--budget", "250")
        self.assertEqual(in_dollars.returncode, 0, in_dollars.stdout + in_dollars.stderr)
        in_tokens = self.spend("status", "--budget", "400000", "--measure", "tokens")
        self.assertEqual(in_tokens.returncode, 2, in_tokens.stdout)  # a dollars-only row has no measured tokens
        self.assertIn("phase2:A1", in_tokens.stderr)
        self.assertIn("an unknown cost is not zero", in_tokens.stderr)
        # Measured rows whose USD is "-" are the same in dollars: tests/test_measured_tokens.py.

    def test_status_without_units_compares_the_spend_alone(self):
        self.add("phase1:intake", "--usd", "12.00")
        self.assertEqual(self.spend("status", "--budget", "20").returncode, 0)
        self.assertEqual(self.spend("status", "--budget", "10").returncode, 1)

    def test_add_refuses_what_would_break_the_table_or_record_nothing(self):
        self.add("phase1:intake", "--usd", "1.00")
        before = self.ledger.read_bytes()
        piped = self.spend("add", "--stage", "phase1:design", "--model", "opus", "--usd", "1", "--note", "a | b")
        empty = self.spend("add", "--stage", "phase1:design", "--model", "opus")
        self.assertEqual((piped.returncode, empty.returncode), (2, 2))
        self.assertEqual(self.ledger.read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
