"""Measured tokens (2.8.1): tools/spend.py reads a row's four token counts from the session's own record.

The fixture transcripts are shaped like Claude Code 2.1's, with short session and agent ids so that a build's deep
folder stays inside Windows' 260-character path limit. They ship flat in fixtures/transcripts, and each test lays
them out as Claude Code keeps them (LAYOUT): claude.ai refuses a plugin zip holding a path more than 12 folders deep,
and the workflow agent's own path is six folders below the config folder.
  1111aaaa  the lead: one reply written as three lines (a streaming partial with no cache-write split, the reply,
            a zeroed copy), a reply with a fallback iteration, a synthetic reply, an older sub-agent's sidechain
            lines in the main file, a line still being written, and an Agent result whose own usage figure is not
            a reply; subagents/agent-a0000001 (a builder, finished, one reply on two lines) and
            subagents/workflows/wf1/agent-a0000002 (a workflow's agent, its cache write not split).
  2222bbbb  a session with no usage at all.
  3333cccc  a resumed session whose file copies one of the first session's replies.
The lead's and the resumed session's cache writes go to the 1-hour cache; the builder's first reply writes to the
5-minute one. Each test copies them into a throwaway CLAUDE_CONFIG_DIR. Around them: an unreadable transcript, a
missing session id, a ledger from before 2.8.1, the measured record, the weighted tokens measure, and K7's
reviewer sessions.

Run from the repository root: python -m unittest discover -s tools/tests
"""
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1]
SPEND = TOOLS / "spend.py"
FIXTURES = Path(__file__).resolve().parent / "fixtures" / "transcripts"
LEAD = "1111aaaa"
EMPTY = "2222bbbb"
RESUMED = "3333cccc"
BUILDER, WORKFLOW_AGENT, OLD_AGENT = "a0000001", "a0000002", "a0000009"
LAYOUT = {                                  # fixture file -> where Claude Code keeps it under its config folder
    "1111aaaa.jsonl": "projects/C--fx/1111aaaa.jsonl",
    "1111aaaa.agent-a0000001.jsonl": "projects/C--fx/1111aaaa/subagents/agent-a0000001.jsonl",
    "1111aaaa.agent-a0000001.meta.json": "projects/C--fx/1111aaaa/subagents/agent-a0000001.meta.json",
    "1111aaaa.wf1.agent-a0000002.jsonl": "projects/C--fx/1111aaaa/subagents/workflows/wf1/agent-a0000002.jsonl",
    "2222bbbb.jsonl": "projects/C--fx/2222bbbb.jsonl",
    "3333cccc.jsonl": "projects/C--fx/3333cccc.jsonl",
}

# What the fixtures hold, as (uncached in, cache write, cache read, out), and weighted: uncached 1, a cache write
# 1.25 (5-minute) or 2 (1-hour), a cache read 0.1 (0.05 on claude-opus-5-5, the lead's model), output 5.
LEAD_COUNTS = (9, 1060, 1900, 210)          # msg_A1 (3, 1000, 0, 120) + A2 (2, 50, 1000, 40) + A3's two iterations
LEAD_WEIGHTED = 3274                        # A1 3 + 2000 + 600; A2 2 + 100 + 50 + 200; A3 4 + 20 + 45 + 250
BUILDER_COUNTS = (4, 410, 800, 90)          # msg_B1 once, though written twice, + msg_B2
BUILDER_WEIGHTED = 1054                     # B1 2 + 500 + 150 (5-minute writes); B2 2 + 20 + 80 + 300


def load_tool(name: str, file: str):
    spec = importlib.util.spec_from_file_location(name, TOOLS / file)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


S = load_tool("spend_measured", "spend.py")


class Measured(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix="mf-measured-"))
        self.addCleanup(shutil.rmtree, self.root, True)
        self.config = self.root / "config"
        for name, where in LAYOUT.items():
            (self.config / where).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(FIXTURES / name, self.config / where)
        self.project = self.config / "projects" / "C--fx"
        self.ledger = self.root / "work" / ".metaframework" / "spend-ledger.md"
        self.record = self.ledger.with_name("spend-ledger.measured.jsonl")

    def spend(self, *args: str, session: str | None = LEAD) -> subprocess.CompletedProcess:
        env = {k: v for k, v in os.environ.items() if k != "CLAUDE_CODE_SESSION_ID"}
        env["CLAUDE_CONFIG_DIR"] = str(self.config)
        if session:
            env["CLAUDE_CODE_SESSION_ID"] = session
        return subprocess.run([sys.executable, "-B", str(SPEND), *args, "--ledger", str(self.ledger)],
                              capture_output=True, encoding="utf-8", env=env)

    def add(self, stage: str, *args: str, session: str | None = LEAD) -> subprocess.CompletedProcess:
        done = self.spend("add", "--stage", stage, "--measured", "--date", "2026-11-01", *args, session=session)
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        return done

    def rows(self) -> list:
        return S.read_rows(self.ledger)

    def counts(self, row) -> tuple:
        return tuple(int(cell) for cell in row.tokens)

    # --- duplicates -------------------------------------------------------------------------------------------------

    def test_a_reply_written_as_several_lines_is_counted_once_at_its_largest(self):
        done = self.add("phase4:setup")
        (row,) = self.rows()
        self.assertEqual((self.counts(row), row.weighted), (LEAD_COUNTS, str(LEAD_WEIGHTED)))
        self.assertEqual((row.model, row.usd, row.session), ("opus", "-", LEAD[:8]))
        self.assertIn("4 replies", done.stdout)
        self.assertIn("1 line(s)", done.stdout)                  # the line still being written, said and skipped
        record = [json.loads(line) for line in self.record.read_text(encoding="utf-8").splitlines()]
        self.assertEqual(record[0]["replies"], ["msg_A1", "msg_A2", "msg_A3", "msg_A4"])
        self.assertEqual(record[0]["counts"], {**dict(zip(("uncached", "cache_write", "cache_read", "out"), LEAD_COUNTS)),
                                               "cache_write_1h": 1060, "weighted": LEAD_WEIGHTED})

    def test_a_reply_copied_into_a_resumed_sessions_file_is_not_counted_again(self):
        self.add("phase4:setup")
        self.add("phase4:resumed", session=RESUMED)
        resumed = self.rows()[1]                                     # msg_R1 alone; msg_A2 was counted
        self.assertEqual((self.counts(resumed), resumed.weighted), ((2, 5, 3000, 15), "237"))

    # --- weighing ---------------------------------------------------------------------------------------------------

    def test_each_kind_is_weighed_by_its_api_price_against_fresh_input(self):
        self.assertEqual((S.FRESH, S.WRITE_5M, S.WRITE_1H, S.OUT, S.CACHE_READ), (1.0, 1.25, 2.0, 5.0, 0.1))
        for model, weight in (("claude-opus-5-5", 0.05), ("anthropic.claude-opus-5-5", 0.05), ("claude-fable-5-1", 0.025),
                              ("claude-mythos-5-1", 0.025), ("claude-opus-5", 0.1), ("claude-fable-5", 0.1),
                              ("claude-sonnet-5-5", 0.1), ("<synthetic>", 0.1)):
            self.assertEqual(S.read_weight(model), weight, model)
        hour = S.Reply("m", (0, 100, 0, 0), "claude-sonnet-5-5", 100)
        unsplit = S.Reply("m", (0, 100, 0, 0), "claude-sonnet-5-5")
        self.assertEqual((hour.weighted(), unsplit.weighted(), hour.joined(unsplit).weighted()), (200.0, 125.0, 200.0))

    def test_a_row_holds_the_usage_since_the_last_row(self):
        self.add("phase1:intake")
        refused = self.spend("add", "--stage", "phase1:design", "--measured")
        self.assertEqual(refused.returncode, 2, refused.stdout)
        self.assertIn("would record nothing", refused.stderr)
        reply = {"type": "assistant", "sessionId": LEAD, "uuid": "a-0099", "message": {
            "id": "msg_A9", "model": "claude-opus-5-5",
            "usage": {"input_tokens": 1, "cache_creation_input_tokens": 2, "cache_read_input_tokens": 3,
                      "output_tokens": 4}}}
        with (self.project / f"{LEAD}.jsonl").open("a", encoding="utf-8") as fh:
            fh.write("\n" + json.dumps(reply) + "\n")              # after the torn line, as a live session goes on
        self.add("phase1:design")
        self.assertEqual(self.counts(self.rows()[1]), (1, 2, 3, 4))

    # --- sub-agents -------------------------------------------------------------------------------------------------

    def test_a_sub_agents_usage_is_its_own_row_and_never_the_leads(self):
        lead = self.add("module:MOD-01 lead")
        self.assertIn(f"not in any row yet: sub-agent {BUILDER} (builder: Build MOD-01 Fixture), 2 replies", lead.stdout)
        self.add("module:MOD-01 build", "--agent", BUILDER, "--model", "sonnet")
        again = self.spend("add", "--stage", "module:MOD-01 build", "--measured", "--agent", BUILDER)
        self.assertEqual(again.returncode, 2, again.stdout)
        lead_row, build_row = self.rows()
        self.assertEqual((self.counts(lead_row), lead_row.weighted), (LEAD_COUNTS, str(LEAD_WEIGHTED)))
        self.assertEqual((self.counts(build_row), build_row.weighted), (BUILDER_COUNTS, str(BUILDER_WEIGHTED)))
        self.assertEqual((build_row.model, build_row.session), ("sonnet", f"{LEAD[:8]} agent-{BUILDER[:8]}"))

    def test_a_workflows_agent_and_an_older_sidechain_agent_are_found(self):
        self.add("workflow:wf-1", "--agent", WORKFLOW_AGENT)
        self.add("facet:F-old", "--agent", OLD_AGENT)
        workflow, old = self.rows()                                  # an unsplit cache write is the 5-minute cache's
        self.assertEqual((self.counts(workflow), workflow.weighted, workflow.model), ((1, 100, 200, 10), "196", "haiku"))
        self.assertEqual((self.counts(old), old.weighted, old.model), ((1, 0, 300, 10), "81", "sonnet"))

    def test_measure_reads_the_lead_and_each_sub_agent_and_writes_nothing(self):
        done = self.spend("measure")
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertIn("uncached in 9  cache write 1,060  cache read 1,900  out 210  = 3,179 raw, 3,274 weighted",
                      done.stdout)
        self.assertIn(f"agent {BUILDER}", done.stdout)
        self.assertIn(f"agent {WORKFLOW_AGENT}", done.stdout)
        self.assertIn(f"agent {OLD_AGENT}", done.stdout)
        self.assertRegex(done.stdout, r"\n  all +8 replies  uncached in 15  cache write 1,570  cache read 3,200  out 320"
                                      r"  = 5,105 raw, 4,605 weighted")
        self.assertFalse(self.ledger.parent.exists())

    def test_the_record_names_the_model_and_a_typed_model_that_differs_is_noted(self):
        done = self.add("module:MOD-01 build", "--agent", BUILDER, "--model", "opus")
        self.assertIn("the record's model is 'sonnet', not 'opus'", done.stdout)
        self.assertEqual(self.rows()[0].model, "sonnet")

    # --- no usage, no record, no session ----------------------------------------------------------------------------

    def test_a_session_with_no_usage_records_nothing(self):
        refused = self.spend("add", "--stage", "phase1:intake", "--measured", session=EMPTY)
        self.assertEqual(refused.returncode, 2, refused.stdout)
        self.assertIn("would record nothing", refused.stderr)
        self.assertFalse(self.ledger.exists())
        shown = self.spend("measure", session=EMPTY)
        self.assertEqual(shown.returncode, 0, shown.stderr)
        self.assertIn("0 replies", shown.stdout)

    def test_an_unreadable_transcript_refuses(self):
        (self.project / f"{LEAD}.jsonl").unlink()
        (self.project / f"{LEAD}.jsonl").mkdir()               # a path that is there and cannot be read as a file
        refused = self.spend("add", "--stage", "phase1:intake", "--measured")
        self.assertEqual(refused.returncode, 2, refused.stdout)
        self.assertIn("cannot read the transcript", refused.stderr)
        self.assertFalse(self.ledger.exists())

    def test_a_session_the_record_does_not_hold_refuses(self):
        refused = self.spend("add", "--stage", "phase1:intake", "--measured",
                             session="4444dddd")
        self.assertEqual(refused.returncode, 2, refused.stdout)
        self.assertIn("no transcript for session", refused.stderr)

    def test_without_a_session_id_nothing_is_guessed(self):
        refused = self.spend("add", "--stage", "phase1:intake", "--measured", session=None)
        self.assertEqual(refused.returncode, 2, refused.stdout)
        self.assertIn("CLAUDE_CODE_SESSION_ID is not set", refused.stderr)

    def test_this_session_is_found_among_several_in_one_folder(self):
        self.add("phase3:K6", session=RESUMED)
        self.assertEqual(self.counts(self.rows()[0]), (4, 55, 4000, 55))  # its own file: the copy and msg_R1

    def test_a_typed_token_count_is_refused(self):
        refused = self.spend("add", "--stage", "phase1:intake", "--model", "opus", "--tokens-in", "120000")
        self.assertEqual(refused.returncode, 2, refused.stdout)
        self.assertIn("measured, never typed", refused.stderr)

    def test_an_unreadable_record_refuses_rather_than_count_twice(self):
        self.add("phase1:intake")
        with self.record.open("a", encoding="utf-8") as fh:
            fh.write("not a record\n")
        refused = self.spend("add", "--stage", "phase1:design", "--measured", "--session-id", RESUMED)
        self.assertEqual(refused.returncode, 2, refused.stdout)
        self.assertIn("is not a measured row's record", refused.stderr)

    # --- the ledger and the measure ---------------------------------------------------------------------------------

    def test_a_ledger_from_before_measuring_keeps_its_rows_and_gains_a_measured_table(self):
        old = ("# Spend ledger\n\nAn older preamble.\n\n"
               "| Stage | Session | Model | Tokens in | Tokens out | USD | Output | Date |\n"
               "|---|---|---|---|---|---|---|---|\n"
               "| phase1:intake | p1 | opus | - | - | 3.00 | approved (estimate) | 2026-10-24 |\n"
               "| facet:FA spec | p3-FA | sonnet | 240950 | - | 2.10 | 20 modules | 2026-10-25 |\n")
        self.ledger.parent.mkdir(parents=True)
        self.ledger.write_bytes(old.encode("utf-8"))
        self.add("module:MOD-01 build", "--agent", BUILDER)
        self.add("module:MOD-02 build", "--agent", WORKFLOW_AGENT)
        text = self.ledger.read_bytes().decode("utf-8")
        self.assertTrue(text.startswith(old), "the rows from before measuring are kept byte for byte")
        self.assertEqual(text.count("## Measured rows (plugin 2.8.1)"), 1)
        rows = self.rows()
        self.assertEqual([row.measured() for row in rows], [False, False, True, True])
        self.assertEqual(rows[1].tokens, ("240950", "-"))

        tokens = self.spend("status", "--budget", "5000", "--measure", "tokens")
        self.assertEqual(tokens.returncode, 0, tokens.stdout + tokens.stderr)
        self.assertIn("spent:    1,250 weighted tokens of 5,000 weighted tokens (2 rows)", tokens.stdout)
        self.assertIn("1,615 raw tokens: uncached in 5", tokens.stdout)
        self.assertIn("cache read 1,000 (61.9%)", tokens.stdout)
        self.assertIn("not in this total: 2 rows from before measuring", tokens.stdout)
        dollars = self.spend("status", "--budget", "250")
        self.assertEqual(dollars.returncode, 2, dollars.stdout)     # the measured rows' USD is "-", never zero
        self.assertIn("has no usd figure", dollars.stderr)

    def test_the_tokens_measure_forecasts_from_measured_units_weighted(self):
        self.add("module:MOD-01 build", "--agent", BUILDER)          # 1,304 raw, 1,054 weighted
        self.add("module:MOD-02 build", "--agent", WORKFLOW_AGENT)   # 311 raw, 196 weighted
        done = self.spend("forecast", "--units", "10", "--unit-kind", "module", "--measure", "tokens")
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertIn("10 module units x 625 weighted tokens per unit (2 measured: MOD-01, MOD-02) = 6,250 weighted "
                      "tokens", done.stdout)
        self.assertIn("those units: 1,615 raw tokens: uncached in 5", done.stdout)
        args = ("status", "--units", "10", "--unit-kind", "module", "--measure", "tokens")
        self.assertEqual(self.spend(*args, "--budget", "8000").returncode, 0)   # 1,250 spent + 6,250 ahead
        over = self.spend(*args, "--budget", "7000")
        self.assertEqual(over.returncode, 1, over.stdout)            # though 1,615 raw + 8,075 raw ahead would be more

    def test_a_cloud_runs_dollars_sit_beside_its_measured_tokens(self):
        self.add("phase2:A1", "--usd", "1.25")
        (row,) = self.rows()
        self.assertEqual((self.counts(row), row.usd), (LEAD_COUNTS, "1.25"))
        self.assertEqual(self.spend("status", "--budget", "2").returncode, 0)


class K7Sessions(unittest.TestCase):
    """k7-run.py gives each Claude reviewer pass a session id of its own, so the round can be measured."""

    @classmethod
    def setUpClass(cls):
        sys.path.insert(0, str(TOOLS))
        cls.K7 = load_tool("k7_run_measured", "k7-run.py")

    def test_a_claude_reviewer_gets_a_session_id(self):
        cmd, session = self.K7.with_session(["claude", "-p", "--agent", "k7-reviewer"])
        self.assertEqual(cmd[-2:], ["--session-id", session])
        self.assertRegex(session, r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
        self.assertRegex(session, S.SESSION_ID.pattern)

    def test_a_reviewer_that_names_its_own_session_or_is_not_claude_is_left_alone(self):
        for cmd in (["claude", "-p", "--session-id", "x"], ["claude", "-p", "--no-session-persistence"],
                    [sys.executable, "reviewer.py"]):
            self.assertEqual(self.K7.with_session(cmd), (cmd, ""))


if __name__ == "__main__":
    unittest.main()
