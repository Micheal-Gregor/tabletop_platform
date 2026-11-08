"""Tests for K7's saved passes (2.9.0; SR-2, Projects/CLAUDE.md rule 13): each pass kept the moment its reviewer exits,
reused on the next run of the round, filed with --refile, and repaired by a script held to the objective test (every
judgement identical before and after). And the two K7 fixes carried from PipelineGate: the scratch tool finds the
repository from inside the round's worktree (GOV-18), and the reviewer's grant names the worktree absolutely (GOV-19).

Each test builds a throwaway git repository; nothing here touches this one or starts a reviewer.
Run from the repository root: python -m unittest discover -s tools/tests
"""
import contextlib
import importlib.util
import io
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

TOOLS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS))
SPEC = importlib.util.spec_from_file_location("k7_run_passes", TOOLS / "k7-run.py")
K7 = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(K7)
KP = K7.kp
SCHEMA = json.loads((TOOLS.parent / "governance" / "k7-verdict.schema.json").read_text(encoding="utf-8"))

S3_FACETS = """# CLAUDE_Demo_Phase3

## 2. Resolved partition

| ID | Module | File | Owns OBJ | Status | Decides |
|---|---|---|---|---|---|
| MOD-01 | Clock (facet FA) | `src/clock.py` | OBJ-01 | ACTIVE | YES |
| MOD-02 | Ledger (facet FB) | `src/ledger.py` | OBJ-02 | ACTIVE | NO |
"""
# Round 19's shape: a RETURN with its deductions written negative, which the schema refuses.
NEGATIVE = {"checks": {"CC-1": {"status": "fail", "mechanical": False, "rationale": "untraced"}},
            "drift_score": {"value": 5, "basis": [{"check_id": "CC-1", "finding": "untraced", "deduction": -4},
                                                  {"check_id": "CC-1", "finding": "no refusal", "deduction": -1}]},
            "verdict": "RETURN", "blocking": [{"check_id": "CC-1", "module": "MOD-02", "required_change": "trace it"}],
            "next_action": "Fix MOD-02."}
SIGN_FIX = """import json, sys
v = json.load(sys.stdin)
for b in v["drift_score"]["basis"]:
    b["deduction"] = abs(b["deduction"])
print(json.dumps(v))
"""
OVERRULE = """import json, sys
v = json.load(sys.stdin)
v["verdict"] = "PASS"
print(json.dumps(v))
"""


def git(repo: Path, *args: str) -> str:
    author = ["-c", "user.name=T", "-c", "user.email=t@example.invalid", "-c", "core.autocrlf=false"]
    return subprocess.run(["git", "-C", str(repo), *author, *args], check=True, capture_output=True,
                          text=True).stdout.strip()


class FormOnly(unittest.TestCase):
    """SR-2's objective test: a repair may change how the review is written, never what it says."""

    def check(self, after: dict) -> tuple[list[str], list[str]]:
        return KP.form_changes(NEGATIVE, after, SCHEMA)

    def edited(self, edit) -> dict:
        v = json.loads(json.dumps(NEGATIVE))
        edit(v)
        return v

    def test_a_deductions_sign_is_form(self) -> None:
        changes, faults = self.check(self.edited(lambda v: [b.update(deduction=abs(b["deduction"]))
                                                            for b in v["drift_score"]["basis"]]))
        self.assertEqual(faults, [])
        self.assertEqual(len(changes), 2)

    def test_a_number_written_as_text_and_a_verdicts_case_are_form(self) -> None:
        def edit(v):
            v["drift_score"]["value"] = "5"
            v["verdict"] = "return"
        self.assertEqual(self.check(self.edited(edit))[1], [])

    def test_a_key_the_schema_does_not_allow_may_go(self) -> None:
        noted = self.edited(lambda v: v["blocking"][0].update(note="see FI.md"))
        changes, faults = KP.form_changes(noted, NEGATIVE, SCHEMA)
        self.assertEqual(faults, [])
        self.assertIn("blocking/0/note: left out", changes[0])

    def test_a_misnamed_key_may_be_renamed_with_its_value(self) -> None:
        misnamed = self.edited(lambda v: v["drift_score"]["basis"][0].update(deductions=v["drift_score"]["basis"][0]
                                                                             .pop("deduction")))
        changes, faults = KP.form_changes(misnamed, NEGATIVE, SCHEMA)
        self.assertEqual(faults, [])
        self.assertIn("renamed deduction", changes[0])

    def test_every_judgement_change_is_refused(self) -> None:
        for edit in (lambda v: v.update(verdict="PASS"),
                     lambda v: v["drift_score"].update(value=6),
                     lambda v: v["drift_score"].update(value=-5),
                     lambda v: v["checks"]["CC-1"].update(status="pass"),
                     lambda v: v["drift_score"]["basis"][0].update(deduction=3),
                     lambda v: v["blocking"][0].update(required_change="nothing"),
                     lambda v: v["blocking"].pop(),
                     lambda v: v["checks"].pop("CC-1"),
                     lambda v: v["checks"].update({"CC-6": {"status": "pass", "mechanical": False, "rationale": "x"}}),
                     lambda v: v["checks"]["CC-1"].update(mechanical=True)):
            with self.subTest(edit=edit):
                self.assertNotEqual(self.check(self.edited(edit))[1], [])


class Fixture(unittest.TestCase):
    """A final review of two facets and the seams, over a throwaway repository, with the reviewer stubbed."""

    def setUp(self) -> None:
        self.repo = Path(tempfile.mkdtemp(prefix="k7-passes-"))
        self.addCleanup(shutil.rmtree, self.repo, True)
        self.inst = self.repo / "INSTRUMENTS"
        self.inst.mkdir()
        git(self.repo, "init", "-q")
        (self.repo / "governance" / "S3").mkdir(parents=True)
        (self.repo / "governance" / "S3" / "s3.md").write_text(S3_FACETS, encoding="utf-8")
        mods = ["MOD-01", "MOD-02"]
        scope = [{"module": m, "mode": "full", "manifest": m.lower() * 8, "base": None, "base_round": None,
                  "credit_round": None, "unresolved": [], "deps": [], "importers": []} for m in mods]
        self.rd = K7.Round(self.repo, {"s3_document": "governance/S3/s3.md"}, self.inst, 19, "1" * 40, "2" * 40, [],
                           None, {m: {"rows": []} for m in mods}, mods, scope, {}, True, "", "final")
        self.ran = []
        patches = (mock.patch.object(K7, "dirty_paths", return_value=""), mock.patch.object(K7, "print_lines"))
        for p in patches:
            p.start()
            self.addCleanup(p.stop)

    def saved(self, **kw) -> "K7.Saved":
        opts = {"fresh": False, "refile": False, "repair": None, **kw}
        return K7.Saved(KP.round_dir(self.repo, 19), "sha256:charter", opts["fresh"], opts["refile"], opts["repair"],
                        SCHEMA, {}, {}, [])


class Round(Fixture):
    """Each pass saved as it ends, reused, re-filed and repaired."""

    def reviewer(self, *, fail_on: str = "", verdict: dict = NEGATIVE):
        """A stub reviewer: the pass's verdict, or a timeout with partial output on the pass named fail_on."""
        def run(rd, cmd, prompt, timeout):
            name = "seams" if "SEAMS pass" in prompt else prompt.split('pass "')[1].split('"')[0]
            self.ran.append(name)
            if name == fail_on:
                t = K7.TimedOut("half a review", "")
                t.started = t.completed = "2026-11-03T14:00:00+00:00"
                raise t
            return (subprocess.CompletedProcess(cmd, 0, json.dumps(verdict), ""), "2026-11-03T14:00:00+00:00",
                    "2026-11-03T14:30:00+00:00")
        return mock.patch.object(K7, "run_reviewer", side_effect=run)

    def review(self, saved, **kw):
        with self.reviewer(**kw), contextlib.redirect_stdout(io.StringIO()) as out:
            result = K7.review(self.rd, ["reviewer"], 60, saved)
        return result, out.getvalue()

    def test_a_timeout_keeps_the_finished_passes_and_its_own_partial_output(self) -> None:
        with self.assertRaises(K7.Refused) as stop:
            self.review(self.saved(), fail_on="FB")
        self.assertIn("not a seam fault", str(stop.exception))
        folder = KP.round_dir(self.repo, 19)
        fa = json.loads((folder / "pass-FA.json").read_text(encoding="utf-8"))
        fb = json.loads((folder / "pass-FB.json").read_text(encoding="utf-8"))
        self.assertEqual((fa["status"], fb["status"], fb["stdout"]), ("finished", "timeout", "half a review"))
        self.ran.clear()
        (supplied, *_), said = self.review(self.saved())
        self.assertEqual(self.ran, ["FB", "seams"])                  # FA is not run again
        self.assertIn("pass FA: reused", said)
        self.assertEqual(supplied["verdict"], "RETURN")

    def test_refile_files_the_saved_review_with_its_repair_and_runs_nothing(self) -> None:
        self.review(self.saved())
        self.ran.clear()
        fix = self.repo / "fix.py"
        fix.write_text(SIGN_FIX, encoding="utf-8")
        saved = self.saved(refile=True, repair=fix)
        (supplied, *_), said = self.review(saved)
        self.assertEqual(self.ran, [])
        self.assertTrue(all(b["deduction"] >= 0 for b in supplied["drift_score"]["basis"]))
        self.assertEqual(set(saved.reused), {"FA", "FB", "seams"})
        self.assertEqual(len(saved.changes["FA"]), 2)
        K7.record_passes(self.rd, saved)
        record = json.loads((self.inst / "k7-round-19-passes.json").read_text(encoding="utf-8"))
        self.assertEqual(record["repair"]["script"], "INSTRUMENTS/k7-repair-19.py")
        self.assertTrue(all(p["reused"] for p in record["passes"]))

    def test_a_repair_that_changes_the_verdict_is_refused(self) -> None:
        self.review(self.saved())
        overrule = self.repo / "overrule.py"
        overrule.write_text(OVERRULE, encoding="utf-8")
        with self.assertRaises(K7.Refused) as stop:
            self.review(self.saved(refile=True, repair=overrule))
        self.assertIn("goes to the owner", str(stop.exception))

    def test_refile_refuses_a_pass_with_no_finished_review(self) -> None:
        with self.assertRaises(K7.Refused):
            self.review(self.saved(), fail_on="seams")
        with self.assertRaises(K7.Refused) as stop:
            self.review(self.saved(refile=True))
        self.assertIn("--refile: pass seams", str(stop.exception))

    def test_a_changed_output_a_changed_module_or_fresh_is_run_again(self) -> None:
        self.review(self.saved())
        folder = KP.round_dir(self.repo, 19)
        fa = json.loads((folder / "pass-FA.json").read_text(encoding="utf-8"))
        fa["stdout"] = fa["stdout"].replace('"RETURN"', '"PASS"')
        (folder / "pass-FA.json").write_text(json.dumps(fa), encoding="utf-8")
        self.rd.scope[1]["manifest"] = "changed"
        self.ran.clear()
        _, said = self.review(self.saved())
        self.assertEqual(self.ran, ["FA", "FB", "seams"])
        self.assertIn("was changed after the review", said)
        self.ran.clear()
        self.review(self.saved(fresh=True))
        self.assertEqual(self.ran, ["FA", "FB", "seams"])

    def test_a_review_its_transcript_does_not_hold_is_not_reused(self) -> None:
        self.review(self.saved())
        self.ran.clear()
        with mock.patch.object(KP, "transcript_text", return_value="something else entirely"):
            self.review(self.saved())
        self.assertEqual(self.ran, ["FA", "FB", "seams"])


class Resume(Fixture):
    """A pass that times out resumes in its own reviewer session, which keeps its reading and findings: at once, up to
    k7_resumes times, and on the next run of the same command. (Probed live on 3 Nov 2026: a killed `claude -p`
    session resumed with its context, its agent charter and its grant's denials, under the same session id.)"""

    def setUp(self) -> None:
        super().setUp()
        self.rd = K7.Round(self.repo, {"s3_document": "governance/S3/s3.md"}, self.inst, 19, "1" * 40, "2" * 40, [],
                           None, self.rd.om, self.rd.modules, self.rd.scope, {}, True, "", "round")
        self.calls = []

    def reviewer(self, *, times_out: int):
        """A stub Claude Code reviewer that times out on its first `times_out` calls, then returns the verdict."""
        def run(rd, cmd, prompt, timeout):
            self.calls.append((cmd, prompt))
            if len(self.calls) <= times_out:
                t = K7.TimedOut("", "")
                t.started = t.completed = "2026-11-03T14:00:00+00:00"
                raise t
            return (subprocess.CompletedProcess(cmd, 0, json.dumps(NEGATIVE), ""), "2026-11-03T14:00:00+00:00",
                    "2026-11-03T15:00:00+00:00")
        return mock.patch.object(K7, "run_reviewer", side_effect=run)

    def go(self, times_out: int):
        with self.reviewer(times_out=times_out), contextlib.redirect_stdout(io.StringIO()):
            return K7.review(self.rd, ["claude", "-p"], 60, self.saved())

    def saved_record(self) -> dict:
        return json.loads(KP.pass_file(KP.round_dir(self.repo, 19), "round").read_text(encoding="utf-8"))

    def test_a_timed_out_pass_resumes_in_its_own_session(self) -> None:
        (supplied, *_) = self.go(times_out=1)
        (first, _), (second, prompt) = self.calls
        session = first[first.index("--session-id") + 1]
        self.assertEqual(second[-2:], ["--resume", session])
        self.assertNotIn("--session-id", second)
        self.assertIn("Continue the same review from where you", prompt)
        self.assertEqual((supplied["verdict"], self.saved_record()["status"], self.saved_record()["resumed"]),
                         ("RETURN", "finished", 1))

    def test_past_its_resumes_the_pass_is_kept_and_the_next_run_resumes_it(self) -> None:
        self.rd.cfg["k7_resumes"] = 0
        with self.assertRaises(K7.Refused) as stop:
            self.go(times_out=1)
        self.assertIn("resumes this pass in its session", str(stop.exception))
        kept = self.saved_record()
        self.assertEqual(kept["status"], "timeout")
        self.calls.clear()
        self.go(times_out=0)
        ((argv, prompt),) = self.calls
        self.assertEqual(argv[-2:], ["--resume", kept["session"]])
        self.assertIn("Continue the same review", prompt)

    def test_a_reviewer_with_no_session_is_refused_at_its_timeout(self) -> None:
        with self.reviewer(times_out=1), contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaises(K7.Refused):
                K7.review(self.rd, ["reviewer"], 60, self.saved())
        self.assertEqual(len(self.calls), 1)


class Import(Fixture):
    """2.9.1: a review kept before 2.9.0 (k7-raw-<n>.txt from a schema refusal) imported as the round's saved passes and
    filed by --refile: each pass's output found in its reviewer's transcript, its fingerprint from the content at the
    commit the run reviewed. (Tried read-only on LedgerCore V2's round 19: five passes, each found in its transcript;
    the run's start gives commit 1630203.)"""
    RUN = "20261103T145442Z-k7-2585"

    def setUp(self) -> None:
        super().setUp()
        git(self.repo, "add", "-A")
        git(self.repo, "commit", "-q", "-m", "the reviewed content")
        sessions = {"FA": "a" * 8, "FB": "b" * 8, "seams": "c" * 8}
        passes = K7.passes(self.rd)
        raw = "\n".join(K7.pass_output(self.rd, p, json.dumps(NEGATIVE) + f"\n<!-- {p.name} -->", "") for p in passes)
        log = "".join(f"k7-run: final review, pass {p.name}: x\nk7-run: reviewer session {sessions[p.name]}\n"
                      for p in passes) + 'k7-run: this round\'s tokens: python tools/spend.py add --stage "k7:round-19 ' \
                                         'final" --measured\n'
        runs = self.repo / ".metaframework" / "runs"
        runs.mkdir(parents=True)
        (runs / f"{self.RUN}.log").write_text(log, encoding="utf-8")
        (runs / f"{self.RUN}.json").write_text(json.dumps({"started": "2099-01-01T00:00:00Z",
                                                            "ended": "2099-01-01T02:30:00Z"}), encoding="utf-8")
        (self.inst / "k7-raw-19.txt").write_text(raw, encoding="utf-8")
        self.now = {e["module"]: e["manifest"] for e in self.rd.scope}
        self.said = raw
        for p in (mock.patch.object(KP, "content_then", side_effect=lambda *_: (self.now, "sha256:charter")),
                  mock.patch.object(KP, "transcript_text", side_effect=lambda _: self.said)):
            p.start()
            self.addCleanup(p.stop)

    def file_it(self, *, refile: bool = True) -> tuple:
        args = K7.argparse.Namespace(from_raw="INSTRUMENTS/k7-raw-19.txt", refile=refile, run=self.RUN)
        saved = self.saved(refile=True)
        ran = []
        with mock.patch.object(K7, "run_reviewer", side_effect=lambda *a: ran.append(a)), \
                contextlib.redirect_stdout(io.StringIO()):
            K7.import_kept(self.rd, saved, args)
            result = K7.review(self.rd, ["reviewer"], 60, saved)
        return result, saved, ran

    def test_a_kept_review_is_filed_without_a_reviewer(self) -> None:
        (supplied, *_), saved, ran = self.file_it()
        self.assertEqual((ran, supplied["verdict"], set(saved.reused)), ([], "RETURN", {"FA", "FB", "seams"}))
        record = json.loads(KP.pass_file(saved.folder, "FB").read_text(encoding="utf-8"))
        self.assertEqual((record["session"], record["imported"]["run"]), ("b" * 8, self.RUN))

    def test_a_module_changed_since_the_review_is_not_filed(self) -> None:
        self.now = {**self.now, "MOD-02": "changed since"}
        with self.assertRaises(K7.Refused) as stop:
            self.file_it()
        self.assertIn("--refile: pass FB has no saved review to file (it reviewed other content", str(stop.exception))

    def test_output_its_reviewer_did_not_say_imports_nothing(self) -> None:
        self.said = "something else"
        with self.assertRaises(K7.Refused) as stop:
            self.file_it()
        self.assertIn("is not what reviewer session", str(stop.exception))
        self.assertFalse(KP.round_dir(self.repo, 19).exists())

    def test_another_rounds_review_or_no_refile_is_refused(self) -> None:
        log = self.repo / ".metaframework" / "runs" / f"{self.RUN}.log"
        log.write_text(log.read_text(encoding="utf-8").replace("round-19", "round-18"), encoding="utf-8")
        with self.assertRaises(K7.Refused) as stop:
            self.file_it()
        self.assertIn("is not this round", str(stop.exception))
        with self.assertRaises(K7.Refused):
            self.file_it(refile=False)

    def test_an_unlabelled_raw_is_the_rounds_one_pass(self) -> None:
        raw = "--- stdout ---\n{\"verdict\": \"PASS\"}\n--- stderr ---\nwarn\n"
        self.assertEqual(KP.split_raw(raw, "checkpoint"), {"checkpoint": ('{"verdict": "PASS"}', "warn")})
        self.assertEqual(KP.run_sessions("k7-run: reviewer session s1\n", "checkpoint"), {"checkpoint": "s1"})


class ContentThen(unittest.TestCase):
    """The import reads the reviewed commit's content from a throwaway worktree of it, then removes the worktree."""

    def test_the_content_is_read_at_the_reviewed_commit(self) -> None:
        repo = Path(tempfile.mkdtemp(prefix="k7-then-"))
        self.addCleanup(shutil.rmtree, repo, True)
        git(repo, "init", "-q")
        (repo / ".gitignore").write_text(".k7/\n", encoding="utf-8")
        (repo / ".metaframework").mkdir()
        (repo / ".metaframework" / "project.json").write_text("{}", encoding="utf-8")
        (repo / "src.txt").write_text("then", encoding="utf-8")
        git(repo, "add", "-A")
        git(repo, "commit", "-q", "-m", "then")
        then = git(repo, "rev-parse", "HEAD")
        (repo / "src.txt").write_text("now", encoding="utf-8")
        git(repo, "commit", "-q", "-am", "now")
        build = lambda root, cfg: {"MOD-01": {"digest": (root / "src.txt").read_text(encoding="utf-8")}}  # noqa: E731
        with mock.patch.object(K7.mf, "build", side_effect=build):
            digests, _ = KP.content_then(repo, then, ".claude/agents/k7-reviewer.md")
        self.assertEqual(digests, {"MOD-01": "then"})
        self.assertFalse((repo / ".k7" / "import").exists())


class Grant(unittest.TestCase):
    """GOV-19: the reviewer's write grant names the worktree absolutely as well, so a `cd` does not move it."""

    def test_the_grant_names_the_worktree_absolutely(self) -> None:
        root = Path(tempfile.gettempdir()).resolve()
        cmd, refusal = K7.reviewer_command({}, ".claude/agents/k7-reviewer.md", root)
        self.assertEqual(refusal, "")
        self.assertIn("Edit(.k7/**)", cmd)
        self.assertIn(f"Edit({K7.rule_path(root / '.k7')}/**)", cmd)
        self.assertTrue(K7.rule_path(root).startswith("//"))
        if sys.platform == "win32":
            self.assertEqual(K7.rule_path(Path("C:/x/y")), "//c/x/y")


class Repository(unittest.TestCase):
    """The clean-tree check leaves out the gate's live log and the run records; the scratch tool finds the repository
    from the worktree's own copy (GOV-18)."""

    def setUp(self) -> None:
        self.repo = Path(tempfile.mkdtemp(prefix="k7-repo-"))
        self.addCleanup(shutil.rmtree, self.repo, True)
        git(self.repo, "init", "-q")
        (self.repo / "tools").mkdir()
        shutil.copy(TOOLS / "k7-scratch.py", self.repo / "tools" / "k7-scratch.py")
        (self.repo / ".gitignore").write_text(".k7/\n", encoding="utf-8")
        git(self.repo, "add", "-A")
        git(self.repo, "commit", "-q", "-m", "tools")
        self.addCleanup(subprocess.run, ["git", "-C", str(self.repo), "worktree", "remove", "--force", ".k7/wt"],
                        capture_output=True)

    def test_the_gate_log_and_the_run_records_do_not_dirty_the_tree(self) -> None:
        (self.repo / ".metaframework" / "runs" / "k7-round-1").mkdir(parents=True)
        (self.repo / ".metaframework" / "runs" / "k7-round-1" / "pass-x.json").write_text("{}", encoding="utf-8")
        (self.repo / ".metaframework" / "gate-live.jsonl").write_text("{}\n", encoding="utf-8")
        self.assertEqual(K7.dirty_paths(self.repo, {}), "")
        (self.repo / "stray.txt").write_text("x", encoding="utf-8")
        self.assertIn("stray.txt", K7.dirty_paths(self.repo, {}))

    def test_the_worktrees_copy_of_the_scratch_tool_acts_on_the_same_worktree(self) -> None:
        git(self.repo, "worktree", "add", "-q", "--detach", ".k7/wt", "HEAD")
        r = subprocess.run([sys.executable, str(self.repo / ".k7" / "wt" / "tools" / "k7-scratch.py"), "status"],
                           cwd=str(self.repo / ".k7" / "wt"), capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertNotIn("no worktree", r.stderr)


if __name__ == "__main__":
    unittest.main()
