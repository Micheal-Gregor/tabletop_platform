"""Tests for K7's rounds: the close's order (2.8.0; the owner's order for one more round, 2.6.21) in k7-run.py, and a module's own
code hooks in its credited-review fingerprint (manifests.py). And (2.6.23) the reviewer's output read as it was meant:
UTF-8, trailing commas, a note beside a proposed test.

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
SPEC = importlib.util.spec_from_file_location("k7_run_rounds", TOOLS / "k7-run.py")
K7 = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(K7)
MF = K7.mf


def git(repo: Path, *args: str) -> str:
    """One git command in `repo`, as a fixed author; its output."""
    author = ["-c", "user.name=T", "-c", "user.email=t@example.invalid", "-c", "core.autocrlf=false"]
    return subprocess.run(["git", "-C", str(repo), *author, *args], check=True, capture_output=True,
                          text=True).stdout.strip()


class Repo(unittest.TestCase):
    """A throwaway repository with an INSTRUMENTS folder."""

    def setUp(self) -> None:
        self.repo = Path(tempfile.mkdtemp(prefix="k7-rounds-"))
        self.addCleanup(shutil.rmtree, self.repo, True)
        self.inst = self.repo / "INSTRUMENTS"
        self.inst.mkdir()
        git(self.repo, "init", "-q")

    def put(self, rel: str, text: str) -> None:
        p = self.repo / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(text.encode("utf-8"))

    def commit(self, msg: str) -> str:
        """Commit everything; the new commit's sha."""
        git(self.repo, "add", "-A")
        git(self.repo, "commit", "-q", "--allow-empty", "-m", msg)
        return git(self.repo, "rev-parse", "HEAD")


class CloseOrder(Repo):
    """The close's order (2.8.0, roster v0.14): no triage after a round and no cap. After a checkpoint the next round is
    the final review; after the final review nothing is reviewed before the seal. Past either, an owner-round-<n> tag
    (2.6.21) at or after the last reviewed commit buys exactly one round."""

    def round(self, n: int, kind: str = "round", verdict: str = "RETURN") -> str:
        """Round n of `kind` reviews a new commit and returns `verdict`; that commit's sha."""
        sha = self.commit(f"work for round {n}")
        self.put(f"INSTRUMENTS/k7-verdict-{n}.json", json.dumps({"round": n, "verdict": verdict,
                                                                  "reviewed": {"commit_sha": sha, "kind": kind}}))
        return sha

    def tag(self, name: str, at: str = "HEAD") -> None:
        git(self.repo, "tag", name, at)

    def refusal(self, kind: str) -> str:
        return K7.order_refusal(self.repo, self.inst, kind)

    def test_before_any_door_every_round_runs_without_a_cap(self) -> None:
        for n in range(1, 5):
            self.round(n)
        self.commit("four non-PASS rounds: RD-9's cap is cut")
        for kind in ("round", "checkpoint", "final"):
            self.assertEqual(self.refusal(kind), "", kind)

    def test_after_a_checkpoint_only_the_final_review_runs(self) -> None:
        self.round(1, "checkpoint")
        self.commit("the one fix pass")
        self.assertEqual(self.refusal("final"), "")
        for kind in ("round", "checkpoint"):
            said = self.refusal(kind)
            self.assertIn("foundation checkpoint has run (round 1)", said)
            self.assertIn("no re-check and no triage", said)
            self.assertIn("owner-round-<n>", said)

    def test_after_the_final_review_nothing_runs_unordered(self) -> None:
        self.round(1, "checkpoint")
        self.round(2, "final")
        self.commit("the verdict")
        for kind in ("round", "checkpoint", "final"):
            said = self.refusal(kind)
            self.assertIn("final review has run (round 2)", said, kind)
            self.assertIn("ui/gaps.md", said)
            self.assertIn("seal.py check", said)

    def test_an_order_opens_exactly_one_round_past_the_final(self) -> None:
        final = self.round(1, "final")
        self.tag("owner-round-1", final)
        self.assertEqual(self.refusal("round"), "")
        self.round(2)
        self.commit("verdict 2")
        self.assertIn("final review has run", self.refusal("round"))
        self.tag("owner-round-2")
        self.assertEqual(self.refusal("round"), "")

    def test_an_order_before_the_door_opens_nothing(self) -> None:
        self.round(1)
        self.tag("owner-round-1")
        self.round(2, "checkpoint")
        self.commit("verdicts")
        self.assertIn("foundation checkpoint has run", self.refusal("round"))

    def test_a_seal_starts_the_order_again(self) -> None:
        self.round(1, "final")
        self.commit("sealed")
        self.tag("seal-1")
        self.assertEqual(self.refusal("checkpoint"), "", "an extension build's rounds start after the seal")
        self.round(2, "final")
        self.commit("the extension's final review")
        self.assertIn("round 2", self.refusal("round"))

    def test_guard_round_refuses_before_preflight(self) -> None:
        self.put("STATE.json", json.dumps({"phase": 4}))
        self.round(1, "final")
        args = mock.Mock(modules="MOD-01", checkpoint=False, final=False)
        with contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(K7.Refused) as closed:
                K7.guard_round(self.repo, {}, self.inst, args)
            self.tag("owner-round-1")
            with self.assertRaises(K7.Refused) as ordered:
                K7.guard_round(self.repo, {}, self.inst, args)
        self.assertIn("owner-round-<n>", str(closed.exception))
        self.assertNotIn("final review has run", str(ordered.exception))   # past the door: preflight's refusal


S3 = """# CLAUDE_Demo_Phase3

## 2. Resolved partition

| ID | Module | File | Owns OBJ | Status |
|---|---|---|---|---|
| MOD-01 | Acts | `src/acts.py` | OBJ-01 | ADMITTED |

## 7. Hook manifest (CT-6)

| ID | MOD | Trigger | Condition | Block action | Registered at |
|---|---|---|---|---|---|
| HOOK-01 | MOD-01 | pre-commit-code | every act is wrapped | reject the code commit | `hooks/acts_wrapped.py` |
| HOOK-02 | MOD-02 | before-commit | `src/store.py` is append-only | abort | `src/store.py::Store.commit` |

## 8. Production concerns
"""
OM = ("| Module | File | Traces | Purpose | Declared inputs | Decides | Status |\n|---|---|---|---|---|---|---|\n"
      "| MOD-01 Acts | src/acts.py | x | x | none | NO | x |\n"
      "| MOD-02 Store | src/store.py | x | x | none | NO | x |\n")
RUNS_HOOK = 'HOOK = ROOT / "hooks" / "acts_wrapped.py"\n'
CFG = {"s3_document": "governance/S3/CLAUDE_Demo_Phase3.md"}


class HookFingerprint(Repo):
    """A module's own code hooks are part of its fingerprint (2.6.21, LedgerCore V2 HOOK-05)."""

    def setUp(self) -> None:
        super().setUp()
        self.put(CFG["s3_document"], S3)
        self.put("INSTRUMENTS/object-model-and-parameters.md", OM)
        self.put("src/acts.py", "X = 1\n")
        self.put("src/store.py", "Y = 1\n")
        self.put("hooks/acts_wrapped.py", "import sys\nfrom hooks_support import scan\n")
        self.put("hooks_support.py", "def scan():\n    return 0\n")
        self.put("tests/test_hooks.py", RUNS_HOOK)
        self.put("tests/test_hook_import.py", "from hooks.acts_wrapped import scan\n")
        self.put("tests/test_unrelated.py", "import json\n")

    def files(self, cfg: dict, mod: str = "MOD-01") -> list[str]:
        self.commit("build")
        return [f["path"] for f in MF.build(self.repo, cfg)[mod]["manifest"]["files"]]

    def test_the_hook_file_and_the_tests_that_run_or_import_it_are_in_the_fingerprint(self) -> None:
        self.assertEqual(self.files(CFG), ["hooks/acts_wrapped.py", "hooks_support.py", "src/acts.py",
                                           "tests/test_hook_import.py", "tests/test_hooks.py"])

    def test_a_file_a_module_owns_is_not_another_modules_hook_file(self) -> None:
        self.assertEqual(self.files(CFG, "MOD-02"), ["src/store.py"])
        tracked = set(git(self.repo, "ls-files").splitlines())
        mods = MF.object_model(self.repo, tracked)
        self.assertEqual(MF.hook_files(self.repo, CFG, mods, tracked), {"MOD-01": ["hooks/acts_wrapped.py"]})

    def test_without_a_hook_table_the_fingerprint_is_unchanged(self) -> None:
        bare = self.files({})
        self.assertEqual(bare, ["src/acts.py"])
        self.put(CFG["s3_document"], S3.split("## 7.")[0])
        self.assertEqual(self.files(CFG), bare)
        self.assertEqual(self.files({"s3_document": "governance/S3/missing.md"}), bare)

    def test_a_hook_only_change_is_no_longer_credited(self) -> None:
        reviewed = self.commit("reviewed")
        digest = MF.build(self.repo, CFG)["MOD-01"]["digest"]
        self.put("INSTRUMENTS/k7-verdict-1.json", json.dumps({"round": 1, "verdict": "PASS", "reviewed": {
            "commit_sha": reviewed, "scope": [{"module": "MOD-01", "mode": "full", "manifest": digest}]}}))
        self.commit("verdict 1")
        self.assertEqual(MF.scope(self.repo, CFG, self.inst, ["MOD-01"])[0]["mode"], "credited")
        self.put("hooks/acts_wrapped.py", "import sys\nfrom hooks_support import scan\nSTRICT = True\n")
        self.commit("the hook alone")
        entry = MF.scope(self.repo, CFG, self.inst, ["MOD-01"])[0]
        self.assertEqual((entry["mode"], entry["base_round"]), ("diff", 1))
        self.assertIn("hooks/acts_wrapped.py", entry["files"])


PROPOSAL = {"module": "MOD-02", "guard_element": "WRONG_ENTITY", "test": "B's batch into A", "why": "untested"}


class ReviewerOutput(unittest.TestCase):
    """LedgerCore V2 spent rounds 10 (twice) and 12 (twice) on output shape, the content PASS each time (2.6.23)."""

    def read(self, raw: str) -> tuple[dict | None, str]:
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            return K7.extract_verdict(raw), err.getvalue()

    def test_a_verdict_with_trailing_commas_is_read_and_said_so(self) -> None:
        raw = ('Done. Here is my verdict.\n```json\n{"checks": {"CC-1": {"status": "pass",}}, "verdict": "PASS",\n'
               '"proposed_tests": [{"module": "MOD-02", "why": "a list {a, } and \\"q, ]\\" stay",},],\n}\n```\n')
        verdict, said = self.read(raw)
        self.assertEqual(verdict["checks"], {"CC-1": {"status": "pass"}})
        self.assertEqual(verdict["proposed_tests"][0]["why"], 'a list {a, } and "q, ]" stay')
        self.assertIn("trailing commas", said)

    def test_a_strict_verdict_is_read_without_a_word(self) -> None:
        verdict, said = self.read('prose {} first\n{"checks": {}, "verdict": "PASS"}')
        self.assertEqual(verdict, {"checks": {}, "verdict": "PASS"})
        self.assertEqual(said, "")

    def test_a_note_beside_a_proposed_test_is_left_out_and_named(self) -> None:
        supplied = {"proposed_tests": [{**PROPOSAL, "module_note": "x"}, dict(PROPOSAL)], "verdict": "PASS"}
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            K7.trim_proposals(supplied)
        self.assertEqual(supplied["proposed_tests"], [PROPOSAL, PROPOSAL])
        self.assertIn("proposed_tests[0]: left out module_note", err.getvalue())
        self.assertNotIn("proposed_tests[1]", err.getvalue())

    def test_the_reviewers_output_is_read_as_utf8(self) -> None:
        """Round 12: a byte cp1252 has no character for (0x81) lost the whole review on Windows."""
        rd = type("Rd", (), {"root": Path(tempfile.gettempdir()), "commit": "HEAD"})()
        emit = "import sys; sys.stdout.buffer.write('\\u2014 \\u00a7 \\u0081 done'.encode('utf-8'))"
        with mock.patch.object(K7, "scratch_up", return_value=""), mock.patch.object(K7, "scratch_down"):
            proc, _, _ = K7.run_reviewer(rd, [sys.executable, "-c", emit], "", 60)
        self.assertEqual(proc.stdout, "— § \u0081 done")


S3_FACETS = """# CLAUDE_Demo_Phase3

## 2. Resolved partition

| ID | Module | File | Owns OBJ | Status | Decides |
|---|---|---|---|---|---|
| MOD-01 | Clock (facet FA) | `src/clock.py` | OBJ-01 | ACTIVE | YES |
| MOD-02 | Ledger (facet FB) | `src/ledger.py` | OBJ-02 | ACTIVE | NO |
| MOD-03 | Journal (facet FA) | `src/journal.py` | OBJ-03 | ACTIVE | NO |
"""


def check(status: str, mechanical: bool = True) -> dict:
    return ({"status": status, "mechanical": True, "evidence": {"command": "suite", "exit_code": 0}} if mechanical
            else {"status": status, "mechanical": False, "rationale": "read"})


class Rd32Rounds(Repo):
    """RD-32 (2.7.0): the foundation checkpoint reviews CC-1, CC-2 and CC-4 on the modules C4 named; the final review
    is one pass per facet and one across the seams, read back as one verdict."""

    def round(self, kind: str, modules: list[str], mode: str = "full"):
        self.put("governance/S3/s3.md", S3_FACETS)
        scope = [{"module": m, "mode": mode, "manifest": "0" * 64, "base": None, "base_round": None, "credit_round": None,
                  "unresolved": [], "deps": [], "importers": []} for m in modules]
        return K7.Round(self.repo, {"s3_document": "governance/S3/s3.md"}, self.inst, 4, "0" * 40, "0" * 40, [], None,
                        {m: {"rows": []} for m in modules}, modules, scope, {}, True, "", kind)

    def test_the_checkpoint_reviews_the_foundation_c4_named(self) -> None:
        self.put("INSTRUMENTS/C4-anchor-record.md", "**Foundation modules:** MOD-25, MOD-20 and MOD-24 (S3 §10, step 3)\n")
        self.assertEqual(K7.foundation_modules(self.inst), ["MOD-20", "MOD-24", "MOD-25"])
        args = K7.argparse.Namespace(modules="", checkpoint=True, final=False, full=False)
        self.assertEqual(K7.round_modules(args, self.inst, {}), ["MOD-20", "MOD-24", "MOD-25"])
        (self.inst / "C4-anchor-record.md").unlink()
        with self.assertRaises(K7.Refused):
            K7.round_modules(args, self.inst, {})
        (only,) = K7.passes(self.round("checkpoint", ["MOD-02"], "checkpoint"))
        prompt = K7.compose_prompt(self.round("checkpoint", ["MOD-02"], "checkpoint"), only)
        self.assertIn("FOUNDATION CHECKPOINT", prompt)
        self.assertIn("MOD-02  CHECKPOINT: review the whole module, for CC-1, CC-2 and CC-4 only.", prompt)
        self.assertNotIn("Run the CC-1..CC-7 battery", prompt)

    def test_the_final_review_is_a_pass_per_facet_then_the_seams(self) -> None:
        rd = self.round("final", ["MOD-01", "MOD-02", "MOD-03"])
        self.assertEqual(K7.facets(rd), {"FA": ["MOD-01", "MOD-03"], "FB": ["MOD-02"]})
        runs = K7.passes(rd)
        self.assertEqual([(p.name, [e["module"] for e in p.scope]) for p in runs],
                         [("FA", ["MOD-01", "MOD-03"]), ("FB", ["MOD-02"]), ("seams", ["MOD-01", "MOD-02", "MOD-03"])])
        self.assertIn('pass "FA" of the FINAL REVIEW', K7.compose_prompt(rd, runs[0]))
        seams = K7.compose_prompt(rd, runs[2])
        self.assertIn("SEAMS pass", seams)
        self.assertNotIn("FULL: review the whole module", seams)

    def test_the_passes_read_back_as_one_verdict(self) -> None:
        fa = {"checks": {"CC-1": check("pass"), "CC-4": check("pass")}, "verdict": "PASS", "next_action": "Seal.",
              "drift_score": {"value": 9, "basis": [{"check_id": "CC-7", "finding": "tidy", "deduction": 1}]}}
        fb = {"checks": {"CC-1": check("fail", False), "CC-4": check("pass")}, "verdict": "RETURN",
              "drift_score": {"value": 6, "basis": [{"check_id": "CC-1", "finding": "untraced", "deduction": 4}]},
              "blocking": [{"check_id": "CC-1", "module": "MOD-02", "required_change": "trace it"}],
              "next_action": "Fix MOD-02.", "proposed_tests": [PROPOSAL]}
        verdict = K7.merged([("FA", fa), ("FB", fb)])
        self.assertEqual((verdict["verdict"], verdict["drift_score"]["value"]), ("RETURN", 6))
        self.assertEqual(verdict["checks"]["CC-4"], check("pass"))
        self.assertEqual(verdict["checks"]["CC-1"]["status"], "fail")
        self.assertIn("FB: fail, read", verdict["checks"]["CC-1"]["rationale"])
        self.assertEqual([b["finding"] for b in verdict["drift_score"]["basis"]], ["[FA] tidy", "[FB] untraced"])
        self.assertEqual((verdict["blocking"], verdict["proposed_tests"]), (fb["blocking"], [PROPOSAL]))
        halt = {**fb, "verdict": "HALT", "blocking": [{"check_id": "CC-2", "module": "MOD-01", "required_change": "x"}]}
        self.assertEqual(K7.merged([("FB", fb), ("seams", halt)])["blocking"], halt["blocking"])

    def test_a_checkpoint_credits_nothing(self) -> None:
        sha = self.commit("the foundation")
        entry = {"module": "MOD-01", "mode": "checkpoint", "manifest": "a" * 64}
        self.put("INSTRUMENTS/k7-verdict-1.json", json.dumps({"verdict": "PASS", "reviewed": {
            "commit_sha": sha, "modules": ["MOD-01"], "scope": [entry]}}))
        self.assertEqual(MF.history(self.repo, self.inst), {"credited": {}, "full": {}, "base": {}})


if __name__ == "__main__":
    unittest.main()
