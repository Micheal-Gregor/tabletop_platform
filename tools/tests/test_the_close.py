"""2.8.0 (roster v0.14, RD-33 and RD-34): the close, and the cuts.

The last module is built; ui/interface-contract.md is written; the final K7 review runs; seal.py check sweeps; the
owner gives one approval, which seals the library and merges phase4 into main with --no-ff. The approval closes the
final review: no closed-by-owner tag is asked for. Its findings become Phase 5 gaps, and the sweep carries the open owner
gates and the object standard's exceptions. The builder's battery receipt is cut.

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
import manifests  # noqa: E402
import precommit  # noqa: E402
import receipts  # noqa: E402
import seal  # noqa: E402

CFG = {"source_glob": "src/**"}
OWNER = "owner, 2026-10-31"
FINDING = {"check_id": "CC-2", "module": "MOD-01", "required_change": "refuse a | in the name"}


def git(repo: Path, *args: str) -> str:
    """One git command in `repo`, as a fixed author."""
    return subprocess.run(["git", "-C", str(repo), "-c", "user.name=T", "-c", "user.email=t@example.invalid", *args],
                          check=True, capture_output=True, encoding="utf-8").stdout.strip()


class Close(unittest.TestCase):
    """A build on phase4, cut from main, whose last module is built."""

    def setUp(self) -> None:
        self.repo = Path(tempfile.mkdtemp(prefix="the-close-"))
        self.addCleanup(shutil.rmtree, self.repo, True)
        for d in ("src", "tools", ".metaframework", "INSTRUMENTS", "governance/contracts", "governance/S3"):
            (self.repo / d).mkdir(parents=True)
        for tool in ("state.py", "reopen.py"):
            shutil.copy(TOOLS / tool, self.repo / "tools" / tool)
        (self.repo / "governance" / "contracts" / "CLAUDE-phase5.md").write_text("## Phase 5\n", encoding="utf-8")
        (self.repo / "STATE.json").write_text(json.dumps({"concept": "Probe", "phase": 4}), encoding="utf-8")
        git(self.repo, "init", "-q", "-b", "main")
        git(self.repo, "config", "user.name", "T")                 # seal.py commits and tags as the repo's user
        git(self.repo, "config", "user.email", "t@example.invalid")
        self.commit("main before the build")
        git(self.repo, "checkout", "-q", "-b", "phase4")
        (self.repo / "governance" / "S3" / "spec.md").write_text("# S3\n", encoding="utf-8")
        self.commit("the anchor")
        git(self.repo, "tag", "s3-anchor-v1.0")
        (self.repo / "src" / "a.py").write_text("x = 1\n", encoding="utf-8")
        self.commit("the last module")

    def commit(self, msg: str) -> str:
        git(self.repo, "add", "-A")
        git(self.repo, "commit", "-q", "--allow-empty", "-m", msg)
        return git(self.repo, "rev-parse", "HEAD")

    def verdict(self, n: int, kind: str, verdict: str = "RETURN", blocking=(FINDING,), scope=()) -> None:
        """Round n of `kind`, reviewing HEAD, committed."""
        sha = git(self.repo, "rev-parse", "HEAD")
        (self.repo / "INSTRUMENTS" / f"k7-verdict-{n}.json").write_text(json.dumps({
            "round": n, "verdict": verdict, "blocking": list(blocking),
            "reviewed": {"commit_sha": sha, "kind": kind, "scope": list(scope)}}), encoding="utf-8")
        self.commit(f"verdict {n}")

    def step(self, name: str) -> dict:
        found = {"reviewed": seal.reviewed_step, "full-review": seal.full_review_step}[name](self.repo, CFG)
        return found


class ReviewedByTheFinalReview(Close):
    def test_no_final_review_fails_the_step(self) -> None:
        self.verdict(1, "checkpoint", "PASS", ())
        found = self.step("reviewed")
        self.assertEqual(found["status"], "fail")
        self.assertIn("k7-run.py --final", found["detail"])

    def test_a_returned_final_review_covers_the_code_with_no_tag(self) -> None:
        self.verdict(1, "final")
        found = self.step("reviewed")
        self.assertEqual(found["status"], "pass", found["detail"])
        self.assertIn("final review, round 1 (RETURN); the owner's approval closes it", found["detail"])
        self.assertEqual(git(self.repo, "tag", "-l", "closed-by-owner*"), "")

    def test_code_changed_after_the_final_review_fails_the_step(self) -> None:
        self.verdict(1, "final")
        (self.repo / "src" / "a.py").write_text("x = 2\n", encoding="utf-8")
        self.commit("worked after the final review")
        found = self.step("reviewed")
        self.assertEqual(found["status"], "fail")
        self.assertIn("src/a.py", found["detail"])

    def test_a_round_the_owner_ordered_after_it_covers_its_fix(self) -> None:
        self.verdict(1, "final")
        (self.repo / "src" / "a.py").write_text("x = 2\n", encoding="utf-8")
        self.commit("the ordered fix")
        self.verdict(2, "round", "PASS", ())
        found = self.step("reviewed")
        self.assertEqual(found["status"], "pass", found["detail"])
        self.assertIn("last reviewed in round 2", found["detail"])

    def test_the_final_reviews_full_scope_is_what_the_approval_closes(self) -> None:
        self.verdict(1, "final", scope=[{"module": "MOD-01", "mode": "full", "manifest": "d1"},
                                        {"module": "MOD-02", "mode": "credited", "manifest": "d2"}])
        self.assertEqual(seal.approved_full(self.repo), {"MOD-01": "d1"})


class Backstop(unittest.TestCase):
    """manifests.backstop counts the approved content as concluded (2.8.0)."""

    def test_approved_content_is_no_gap_and_other_content_still_is(self) -> None:
        built = {"MOD-01": {"digest": "d1"}, "MOD-02": {"digest": "d2"}}
        with mock.patch.object(manifests, "build", return_value=built), \
                mock.patch.object(manifests, "history", return_value={"credited": {}, "full": {}, "base": {}}):
            gaps = manifests.backstop(Path("."), {}, Path("."), {"MOD-01": "d1", "MOD-02": "old"})
        self.assertEqual([g.split(":")[0] for g in gaps], ["MOD-02"])


class Carried(Close):
    def test_findings_open_gates_and_exceptions_go_to_phase_5(self) -> None:
        self.verdict(1, "final")
        (self.repo / "INSTRUMENTS" / "RESOLUTION_RECORD.md").write_text(
            "# R\n\n| Gate | Disposition (human decision, dated) | Operationalized as |\n|---|---|---|\n"
            "| OG-1 rate rounding | | |\n| OG-2 ledger order | open: asked 30 Oct | |\n"
            "| OG-3 kept | ruled 30 Oct: half-even | code |\n", encoding="utf-8")
        cfg = {**CFG, "object_standard": {"allow": {"src/a.py": ["OS-3"]}}}
        carried = seal.carried_items(self.repo, cfg, {})
        self.assertIn("final review finding (round 1) — MOD-01 CC-2: refuse a | in the name [a Phase 5 gap]", carried)
        self.assertIn("open owner gate — OG-1 rate rounding", carried)
        self.assertIn("open owner gate — OG-2 ledger order", carried)
        self.assertFalse(any("OG-3" in c for c in carried))
        self.assertTrue(any(c.startswith("known issue — object_standard.allow src/a.py: OS-3") for c in carried))


class OneApproval(Close):
    """seal.py apply: the seal, the gaps, and phase4 merged into main with --no-ff."""

    def apply(self) -> tuple[int, str]:
        out = io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(io.StringIO()):
            code = seal.cmd_apply(self.repo, CFG, OWNER, accept_failures=True)
        return code, out.getvalue()

    def test_the_approval_seals_writes_the_gaps_and_merges_into_main(self) -> None:
        self.verdict(1, "final")
        code, said = self.apply()
        self.assertEqual(code, 0, said)
        self.assertEqual(git(self.repo, "rev-parse", "--abbrev-ref", "HEAD"), "main")
        merge = git(self.repo, "log", "-1", "--format=%P %s", "main")
        self.assertEqual(len(merge.split(" ", 2)[:2]), 2, "a merge commit: --no-ff")
        self.assertIn("seal-1: merge phase4 into main", merge)
        self.assertEqual(git(self.repo, "rev-parse", "main^2"), git(self.repo, "rev-parse", "seal-1^{commit}"))
        gaps = (self.repo / "ui" / "gaps.md").read_text(encoding="utf-8")
        self.assertIn("| K7-1-1 | (from the final review) | MOD-01 CC-2: refuse a / in the name |", gaps)
        self.assertIn("merged into main", said)

    def test_a_build_not_on_phase4_is_sealed_and_told(self) -> None:
        git(self.repo, "checkout", "-q", "-b", "elsewhere")
        self.verdict(1, "final")
        code, said = self.apply()
        self.assertEqual(code, 0, said)
        self.assertIn("not phase4: nothing merged", said)
        self.assertEqual(git(self.repo, "rev-parse", "--abbrev-ref", "HEAD"), "elsewhere")


class FrozenAsFrozen(Close):
    """precommit's frozen check passes a file staged exactly as it was frozen: the seal's merge stages every one."""

    def staged_findings(self) -> list[dict]:
        staged = git(self.repo, "diff", "--cached", "--name-only").splitlines()
        return precommit.check_frozen(precommit.Commit(self.repo, self.repo, staged, {}))

    def test_a_merge_bringing_frozen_files_unchanged_passes_and_an_edit_does_not(self) -> None:
        git(self.repo, "tag", "seal-1")
        git(self.repo, "checkout", "-q", "main")
        git(self.repo, "merge", "--no-ff", "--no-commit", "phase4")
        self.assertEqual(self.staged_findings(), [])
        (self.repo / "src" / "a.py").write_text("x = 9\n", encoding="utf-8")
        (self.repo / "governance" / "S3" / "spec.md").write_text("# S3, edited\n", encoding="utf-8")
        git(self.repo, "add", "-A")
        self.assertEqual(sorted(x["rule"] for x in self.staged_findings()), ["s3_frozen", "sealed"])


class ExtensionExport(FrozenAsFrozen):
    """2.8.1: after a seal the owner commits an extension's Phase 3 export under governance/S3/, once, and
    begin-extension reads it there. In 2.6.17 to 2.8.0 the frozen check refused it (LedgerCore V2's ext-1)."""

    EXPORT = "governance/S3/CLAUDE_Probe_Ext1_Phase3.md"

    def stage_export(self, text: str = "# Ext-1\n") -> list[str]:
        (self.repo / self.EXPORT).write_text(text, encoding="utf-8")
        git(self.repo, "add", "-A")
        return [x["rule"] for x in self.staged_findings()]

    def test_before_a_seal_a_new_s3_file_is_refused(self) -> None:
        self.assertEqual(self.stage_export(), ["s3_frozen"])

    def test_after_a_seal_the_export_passes_once_then_is_held(self) -> None:
        git(self.repo, "tag", "seal-1")
        self.assertEqual(self.stage_export(), [])
        self.commit("the extension's Phase 3 export")
        self.assertEqual(self.stage_export("# Ext-1, edited\n"), ["s3_frozen"])
        git(self.repo, "reset", "-q", "--hard")
        git(self.repo, "rm", "-q", self.EXPORT)
        self.assertEqual([x["rule"] for x in self.staged_findings()], ["s3_frozen"])
        git(self.repo, "reset", "-q", "--hard")
        (self.repo / "governance" / "S3" / "spec.md").write_text("# S3, edited\n", encoding="utf-8")
        git(self.repo, "add", "-A")
        self.assertEqual([x["rule"] for x in self.staged_findings()], ["s3_frozen"])

    def test_begin_extension_starts_from_the_committed_export(self) -> None:
        git(self.repo, "tag", "seal-1")
        (self.repo / "governance" / "contracts" / "phase4-contract.md").write_text("## Phase 4\n", encoding="utf-8")
        self.assertEqual(self.stage_export(), [])
        self.commit("the extension's Phase 3 export")
        git(self.repo, "tag", "s3-anchor-ext-1")
        with contextlib.redirect_stdout(io.StringIO()) as said:
            self.assertEqual(seal.cmd_begin_extension(self.repo, CFG, self.EXPORT, None), 0)
        self.assertIn("extension started over seal-1", said.getvalue())


class RevisionExport(FrozenAsFrozen):
    """2.8.2: before a seal, F's superseding Phase 3 export comes in through anchor-s3.py --revision, into the next
    revision's folder. In 2.6.17 to 2.8.1 the frozen check refused it (Tessera-build's revision 1)."""

    def stage(self, rel: str, text: str = "# S3, revised\n") -> list[str]:
        (self.repo / rel).parent.mkdir(parents=True, exist_ok=True)
        (self.repo / rel).write_text(text, encoding="utf-8")
        git(self.repo, "add", "-A")
        return [x["rule"] for x in self.staged_findings()]

    def test_the_next_revisions_folder_passes_once_then_is_held(self) -> None:
        self.assertEqual(self.stage("governance/S3/v1.1/spec.md"), [])
        self.commit("revision 1")
        self.assertEqual(self.stage("governance/S3/v1.1/spec.md", "# S3, revised again\n"), ["s3_frozen"])
        git(self.repo, "reset", "-q", "--hard")
        git(self.repo, "tag", "s3-anchor-v1.1")
        self.assertEqual(self.stage("governance/S3/v1.1/other.md"), ["s3_frozen"])
        git(self.repo, "reset", "-q", "--hard")
        self.assertEqual(self.stage("governance/S3/v1.2/spec.md"), [])

    def test_only_the_next_revision_and_only_new_files_pass(self) -> None:
        for rel in ("governance/S3/v1.2/spec.md", "governance/S3/v1.0/spec.md", "governance/S3/spec-2.md",
                    "governance/S3/r1/spec.md"):
            with self.subTest(rel=rel):
                self.assertEqual(self.stage(rel), ["s3_frozen"])
                git(self.repo, "reset", "-q", "--hard")
                git(self.repo, "clean", "-q", "-fd")

    def test_a_revision_never_carries_an_edit_to_an_anchored_file(self) -> None:
        (self.repo / "governance" / "S3" / "spec.md").write_text("# S3, edited\n", encoding="utf-8")
        self.assertEqual(self.stage("governance/S3/v1.1/spec.md"), ["s3_frozen"])
        self.assertEqual(self.staged_findings()[0]["file"], "governance/S3/spec.md")


class NoBatteryReceipt(unittest.TestCase):
    """RD-34: the builder's battery point is cut from the receipts."""

    def test_setup_admits_no_battery_rubric_and_no_battery_command_remains(self) -> None:
        root = Path(tempfile.mkdtemp(prefix="receipts-setup-"))
        self.addCleanup(shutil.rmtree, root, True)
        cfg = {"pipelinegate_command": "pg --store .pipelinegate"}
        with mock.patch.object(receipts, "decider_specs", return_value={"k7": "k.json", "owner-triage": "o.json"}):
            lines = receipts.setup_commands(root, cfg, "owner")
        self.assertFalse(any("battery" in x for x in lines))
        self.assertNotIn("battery", receipts.POINTS)
        self.assertNotIn("battery", receipts.COMMANDS)
        k7 = importlib.util.spec_from_file_location("k7_run_close", TOOLS / "k7-run.py")
        module = importlib.util.module_from_spec(k7)
        k7.loader.exec_module(module)
        self.assertFalse(hasattr(module, "battery_gate"))


if __name__ == "__main__":
    unittest.main()
