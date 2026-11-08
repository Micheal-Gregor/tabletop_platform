"""The frozen test set (Amendment S-1): tools/test-set.py, §5's Outcome column in emission-check, and K7's
proposed_tests reaching the test-intake log.

S-1's acceptance criterion, in the shape T-1 used: the dedupe never drops a guard element, and cut rows stay on
record. Every §5 row of the fixture keeps one disposition; the cover, the shared-guard rule (a wiring row, or none),
the hook-duplicate rule, a misfiled positive and the S1 floor each decide one of them; a config that would leave a
guard element uncovered is exit 1. The same rows without the Outcome column reach the same dispositions when the
config supplies the outcome, and a row worded as a hook's is cut only to the HOOK row it names. LedgerCore V2's 172 of
238 is reproduced from its own S3 and config, outside this suite (the plugin README's 2.6.23 entry).

Run from the repository root: python -m unittest discover -s tools/tests
"""
import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from test_gate_reach import plugin_template

TOOLS = Path(__file__).resolve().parents[1]
TEST_SET = TOOLS / "test-set.py"
EMISSION = TOOLS / "emission-check.py"
sys.path.insert(0, str(TOOLS))


def load_tool(name: str, file: str):
    """A tool loaded from this tools/ directory, registered in sys.modules before it runs."""
    spec = importlib.util.spec_from_file_location(name, TOOLS / file)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


TS = load_tool("test_set_tool", "test-set.py")
K7 = load_tool("k7_run_intake", "k7-run.py")

# (ID, MOD, Invariant, Expected rejection, Outcome). The rejection text is what a pre-Outcome S3 is read from.
ROWS = [
    ("REF-01", "MOD-01", "INV-01 — S1: T-01", "`REFUSE(LEASE_NOT_HELD)`", "LEASE_NOT_HELD"),
    ("REF-02", "MOD-01", "INV-01 — S1: T-01", "`REFUSE(LEASE_NOT_HELD)`, store unchanged", "LEASE_NOT_HELD"),
    ("REF-03", "MOD-01", "INV-02 — derived", "`REFUSE(EXISTS)`", "EXISTS"),
    ("REF-04", "MOD-02", "INV-01 — S1: T-02", "`REFUSE(LEASE_NOT_HELD)`", "LEASE_NOT_HELD"),
    ("REF-05", "MOD-02", "INV-03 — derived", "`REFUSE(WRONG_ENTITY)`", "WRONG_ENTITY"),
    ("REF-06", "MOD-02", "INV-03 — S1: T-03", "`REFUSE(WRONG_ENTITY)`; nothing appended", "WRONG_ENTITY"),
    ("REF-07", "MOD-03", "AU-1 — S1: T-04", "`REFUSE(NOT_ASSIGNED)`", "NOT_ASSIGNED"),
    ("REF-08", "MOD-04", "AU-1 — S1: T-04", "`REFUSE(NOT_ASSIGNED)`", "NOT_ASSIGNED"),
    ("REF-09", "MOD-04", "INV-05 — S1: T-01", "hook rejects the code commit", "HOOK-01"),
    ("REF-10", "MOD-01", "INV-01 — S1: T-07", "`REFUSE(LEASE_NOT_HELD)` after takeover", "LEASE_NOT_HELD"),
    ("REF-11", "MOD-04", "INV-06 — S1: T-01", "the build fails", "INV-06"),
    ("REF-12", "MOD-02", "INV-07 — S1: T-08", "the export is written", "EXPORTED"),
]
EXPECTED = {
    "REF-01": "critical",
    "REF-02": "cut: variant of a kept row",
    "REF-03": "critical",
    "REF-04": "critical (wiring row: proves the call)",
    "REF-05": "cut: variant of a kept row",
    "REF-06": "critical",
    "REF-07": "critical",
    "REF-08": "cut: shared guard tested at its owner (AU-1)",
    "REF-09": "cut: covered by its HOOK row (HOOK-01)",
    "REF-10": "critical (restored: only carrier of T-07)",
    "REF-11": "critical",
    "REF-12": "positive suite",
}
CONFIG = {
    "shared_guards": [
        {"name": "LS-1", "outcomes": ["LEASE_NOT_HELD"], "owners": ["MOD-01"], "wiring_row": True},
        {"name": "AU-1", "outcomes": ["NOT_ASSIGNED"], "owners": ["MOD-03"], "wiring_row": False,
         "why": "a hook proves every caller is wrapped"},
    ],
    "misfiled_positives": ["REF-12"],
}
HEADINGS = ["1. Disambiguation header", "2. Resolved partition", "3. Object-to-module map", "4. Seam contracts",
            "5. Refusal tests (CT-4)", "6. Golden vectors (CT-5)", "7. Hook manifest (CT-6)",
            "8. Production concerns", "9. Open decision gates", "10. Build order", "11. Module completion checklist"]


def table(cols: list, rows: list) -> list:
    return ["| " + " | ".join(cols) + " |", "|" + "---|" * len(cols)] + ["| " + " | ".join(r) + " |" for r in rows]


def section(heading: str, with_outcome: bool, rows: list) -> list:
    mods = sorted({r[1] for r in rows})
    if heading.startswith("2."):
        return table(["ID", "Module", "File", "Owns OBJ", "Status"],
                     [[m, m, f"src/{m}.py", "OBJ-01", "ACTIVE"] for m in mods])
    if heading.startswith("4."):
        return table(["ID", "Source MOD", "Target MOD", "Transferred value", "Dependency requirement",
                      "Validation rule"], [[f"SEAM-{i:02d}", m, mods[0], "v", "d", "r"] for i, m in enumerate(mods, 1)])
    if heading.startswith("5."):
        cols = ["ID", "MOD", "Invariant", "Forbidden input", "Expected rejection", "Test name"]
        return table(cols + ["Outcome"] * with_outcome,
                     [[i, m, inv, "x", exp, f"tests/test_{i}.py"] + [out] * with_outcome
                      for i, m, inv, exp, out in rows])
    if heading.startswith("7."):
        return table(["ID", "MOD", "Trigger", "Condition", "Block action", "Registered at"],
                     [["HOOK-01", "MOD-04", "pre-commit", "every act is wrapped (HK-01; INV-05)", "reject",
                       "hooks/h.py"]])
    return ["(none)"]


def phase3(directory: Path, with_outcome: bool = True, rows: list = ROWS) -> Path:
    """A Phase 3 document whose §5 holds `rows`, with or without the Outcome column."""
    lines = ["# Fixture build instruction", ""]
    for h in HEADINGS:
        lines += [f"## {h}", ""] + section(h, with_outcome, rows) + [""]
    path = directory / "CLAUDE_Fixture_Phase3.md"
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


class Case(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp(prefix="mf-test-set-"))
        self.addCleanup(shutil.rmtree, self.dir, True)

    def config(self, cfg: dict) -> Path:
        path = self.dir / "test-set.json"
        path.write_text(json.dumps(cfg), encoding="utf-8")
        return path

    def run_tool(self, script: Path, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run([sys.executable, "-B", str(script), *map(str, args)], capture_output=True,
                              text=True, encoding="utf-8", errors="replace")

    def analyse(self, s3: Path, cfg: dict, *extra: str) -> dict:
        done = self.run_tool(TEST_SET, s3, "--config", self.config(cfg), "--json", *extra)
        self.assertEqual(done.returncode, 0, done.stderr)
        return json.loads(done.stdout)


class FrozenSet(Case):
    """S-1's acceptance criterion over the Outcome column."""

    def test_every_rule_decides_its_row_and_no_guard_element_is_dropped(self):
        result = self.analyse(phase3(self.dir), CONFIG)
        self.assertEqual({r["id"]: r["disposition"] for r in result["rows"]}, EXPECTED)
        self.assertEqual(result["dropped"], [])
        self.assertEqual(result["guard_elements"], 8)
        self.assertEqual(result["counts"], {"keep": 7, "variant": 2, "hook": 1, "shared": 1, "positive": 1,
                                            "no_s1_case": 1})
        self.assertEqual(result["restored"], [{"ref": "REF-10", "groups": ["T-07"]}])

    def test_cut_rows_stay_on_record(self):
        result = self.analyse(phase3(self.dir), CONFIG)
        self.assertEqual([r["id"] for r in result["rows"]], [r[0] for r in ROWS])

    def test_an_s1_case_decides_which_row_covers_an_element(self):
        """REF-05 has the lower ID but no S1 case, so REF-06 covers (MOD-02, WRONG_ENTITY)."""
        rows = {r["id"]: r for r in self.analyse(phase3(self.dir), CONFIG)["rows"]}
        self.assertEqual(rows["REF-06"]["disposition"], "critical")
        self.assertEqual(rows["REF-05"]["s1_cases"], [])

    def test_a_shared_guard_whose_owner_keeps_no_row_is_dropped_and_exit_1(self):
        cfg = json.loads(json.dumps(CONFIG))
        cfg["shared_guards"][1]["owners"] = ["MOD-02"]
        done = self.run_tool(TEST_SET, phase3(self.dir), "--config", self.config(cfg))
        self.assertEqual(done.returncode, 1)
        self.assertIn("MOD-04 NOT_ASSIGNED would be dropped", done.stderr)
        self.assertIn("**Dropped: ", done.stdout)

    def test_a_stretch_lists_only_its_modules(self):
        result = self.analyse(phase3(self.dir), CONFIG, "--modules", "MOD-02")
        self.assertEqual([r["id"] for r in result["rows"]], ["REF-04", "REF-05", "REF-06", "REF-12"])
        self.assertEqual(result["counts"]["keep"], 2)
        self.assertEqual(result["guard_elements"], 2)

    def test_the_markdown_report_writes_where_it_is_told(self):
        out = self.dir / "frozen.md"
        done = self.run_tool(TEST_SET, phase3(self.dir), "--config", self.config(CONFIG), "--out", out)
        self.assertEqual(done.returncode, 0, done.stderr)
        text = out.read_text(encoding="utf-8")
        self.assertIn("| Critical path (gates COMPLETE) | 7 |", text)
        self.assertIn("| REF-09 | MOD-04 | HOOK-01 | T-01 | cut: covered by its HOOK row (HOOK-01) |", text)


class Refusals(Case):
    """What test-set.py will not guess."""

    def refused(self, rows: list, cfg: dict, code: int, words: str) -> None:
        done = self.run_tool(TEST_SET, phase3(self.dir, rows=rows), "--config", self.config(cfg))
        self.assertEqual(done.returncode, code, done.stdout + done.stderr)
        self.assertIn(words, done.stderr)

    def test_a_hook_section_7_does_not_hold(self):
        rows = ROWS[:8] + [("REF-09", "MOD-04", "INV-05 — S1: T-01", "hook rejects", "HOOK-99")]
        self.refused(rows, {"shared_guards": CONFIG["shared_guards"]}, 1, "one HOOK-nn that section 7 holds")

    def test_an_outcome_that_is_not_a_name(self):
        rows = [("REF-01", "MOD-01", "INV-01 — S1: T-01", "refused", "lease not held")]
        self.refused(rows, {}, 1, "not outcome names")

    def test_a_positive_section_5_does_not_hold(self):
        self.refused(ROWS, {"misfiled_positives": ["REF-99"]}, 1, "REF-99")

    def test_a_config_key_it_does_not_read(self):
        self.refused(ROWS, {"shared_guard": []}, 2, "shared_guard")

    def test_a_shared_guard_with_no_owners(self):
        self.refused(ROWS, {"shared_guards": [{"name": "X", "outcomes": ["EXISTS"]}]}, 2, "owners")

    def test_the_shipped_config_reads(self):
        cfg = TS.load_config(plugin_template() / ".metaframework" / "test-set.json")
        self.assertEqual((cfg["shared"], cfg["positives"]), ([], set()))


class PreOutcome(Case):
    """An S3 emitted before the Outcome column: the config supplies the outcome (governance/test-set.md)."""

    HOOK_ROW = ("REF-09", "MOD-04", "INV-05 — S1: T-01", "hook rejects the code commit (HK-01)", "HOOK-01")

    def dispositions(self, rows: list, **pre) -> dict:
        s1 = self.dir / "CLAUDE_Fixture.md"
        s1.write_text("Refusals: LEASE_NOT_HELD, WRONG_ENTITY, NOT_ASSIGNED, SEND_AS_IS.\n", encoding="utf-8")
        cfg = {**CONFIG, "misfiled_positives": [p for p in CONFIG["misfiled_positives"] if p in {r[0] for r in rows}],
               "pre_outcome": {"vocabulary": {"add": ["EXISTS"], "drop": ["SEND_AS_IS"]},
                               "hook_pattern": "hook rejects|static check",
                               "outcomes": {"REF-11": "INV-06"}, **pre}}
        result = self.analyse(phase3(self.dir, with_outcome=False, rows=rows), cfg, "--s1", s1)
        self.assertFalse(result["outcome_column"])
        self.assertEqual(result["dropped"], [])
        return {r["id"]: r["disposition"] for r in result["rows"]}

    def test_the_same_rows_reach_the_same_dispositions(self):
        rows = [self.HOOK_ROW if r[0] == "REF-09" else r for r in ROWS]
        self.assertEqual(self.dispositions(rows, hook_ids="HK-[0-9]+"), EXPECTED)

    def test_a_row_worded_as_a_hooks_that_names_no_hook_row_stays_in_the_cover(self):
        """LedgerCore V2 K7 round 12: REF-119 named no hook, REF-152 only an invariant its module's hook also cites."""
        rows = [self.HOOK_ROW,
                ("REF-13", "MOD-04", "INV-08 — S1: T-01", "static check fails the build", "INV-08"),
                ("REF-14", "MOD-04", "INV-05 — S1: T-01", "no such callable; static check fails", "INV-05")]
        self.assertEqual(self.dispositions(rows, hook_ids="HK-[0-9]+"),
                         {"REF-09": "cut: covered by its HOOK row (HOOK-01)", "REF-13": "critical",
                          "REF-14": "critical"})

    def test_without_hook_ids_only_a_cited_hook_names_one(self):
        rows = [self.HOOK_ROW,
                ("REF-13", "MOD-04", "INV-08 — S1: T-01", "the hook rejects the code commit (HOOK-01)", "HOOK-01")]
        self.assertEqual(self.dispositions(rows), {"REF-09": "critical",
                                                   "REF-13": "cut: covered by its HOOK row (HOOK-01)"})


class OutcomeColumn(Case):
    """emission-check: the Outcome column is checked where present and noted where absent."""

    def check(self, s3: Path) -> dict:
        return json.loads(self.run_tool(EMISSION, s3, "--json").stdout)

    def rules(self, result: dict) -> set:
        return {v["rule"] for v in result["violations"]}

    def test_a_well_formed_column_passes_without_a_note(self):
        result = self.check(phase3(self.dir))
        self.assertFalse(self.rules(result) & {"outcome_value", "id_unknown_reference", "column_mismatch"})
        self.assertFalse([n for n in result["notes"] if "Outcome" in n])

    def test_an_older_document_is_noted_not_failed(self):
        result = self.check(phase3(self.dir, with_outcome=False))
        self.assertNotIn("column_mismatch", self.rules(result))
        self.assertTrue([n for n in result["notes"] if "before the Outcome column" in n])

    def test_an_empty_or_malformed_outcome_fails(self):
        rows = [ROWS[0][:4] + ("",), ROWS[1][:4] + ("not a name",), ROWS[2][:4] + ("HOOK-99",)]
        result = self.check(phase3(self.dir, rows=rows))
        found = [(v["rule"], v["detail"].split(")")[0]) for v in result["violations"]
                 if v["rule"] in ("outcome_value", "id_unknown_reference") and v["detail"].startswith("§5")]
        self.assertEqual(found, [("outcome_value", "§5 row 1 (REF-01"), ("outcome_value", "§5 row 2 (REF-02"),
                                 ("id_unknown_reference", "§5 row 3 (REF-03")])


class Proposals(Case):
    """K7's proposed_tests: schema-valid, and appended to the test-intake log, pending."""

    PROPOSAL = {"module": "MOD-02", "guard_element": "WRONG_ENTITY", "test": "B's batch | into A",
                "why": "the kept row commits one record; a batch of two is untested"}

    def test_the_shipped_log_is_the_one_the_runner_writes(self):
        shipped = (plugin_template() / "INSTRUMENTS" / "test-intake-log.md").read_text(encoding="utf-8")
        self.assertEqual(shipped, K7.INTAKE_LOG)

    def test_proposals_append_pending_under_the_last_frozen_stretch(self):
        log = self.dir / K7.INTAKE
        log.write_text(K7.INTAKE_LOG.replace("|---|---|---|---|---|---|\n",
                                             "|---|---|---|---|---|---|\n| S-1 | MOD-01, MOD-02 | 9 | r | d | o |\n"),
                       encoding="utf-8")
        self.assertEqual(K7.log_proposals(self.dir, 4, [self.PROPOSAL, self.PROPOSAL]), 2)
        self.assertEqual(K7.log_proposals(self.dir, 5, [self.PROPOSAL]), 1)
        rows = [ln for ln in log.read_text(encoding="utf-8").splitlines() if ln.startswith("| TP-")]
        self.assertEqual([r.split(" | ")[0] for r in rows], ["| TP-01", "| TP-02", "| TP-03"])
        self.assertIn("| TP-03 | S-1 | K7 round 5 | MOD-02 | WRONG_ENTITY | B's batch \\| into A |", rows[2])
        self.assertTrue(rows[2].endswith("| — | pending |"))
        self.assertTrue(log.read_text(encoding="utf-8").endswith(rows[2] + "\n"))

    def test_no_proposal_writes_nothing(self):
        self.assertEqual(K7.log_proposals(self.dir, 1, []), 0)
        self.assertFalse((self.dir / K7.INTAKE).exists())

    def test_a_missing_log_starts_from_the_template(self):
        K7.log_proposals(self.dir, 1, [self.PROPOSAL])
        text = (self.dir / K7.INTAKE).read_text(encoding="utf-8")
        self.assertTrue(text.startswith(K7.INTAKE_LOG))
        self.assertIn("| TP-01 | — | K7 round 1 |", text)

    def test_the_verdict_schema_takes_proposed_tests_naming_a_guard_element(self):
        try:
            import jsonschema
        except ImportError:
            self.skipTest("jsonschema is not installed")
        schema = json.loads((plugin_template() / "governance" / "k7-verdict.schema.json").read_text(encoding="utf-8"))
        part = {"type": "object", "properties": {"proposed_tests": schema["properties"]["proposed_tests"]}}
        jsonschema.validate({"proposed_tests": [self.PROPOSAL]}, part)
        unnamed = {k: v for k, v in self.PROPOSAL.items() if k != "guard_element"}
        with self.assertRaises(jsonschema.ValidationError):
            jsonschema.validate({"proposed_tests": [unnamed]}, part)


if __name__ == "__main__":
    unittest.main()
