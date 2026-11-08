"""Tests for k7-run.py's seal guard: K7 over a reopened seal (tools/reopen.py), Phase 5, and a sealed library.

Each test builds a throwaway git repository; nothing here touches this one or starts a reviewer.
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

TOOLS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS))
SPEC = importlib.util.spec_from_file_location("k7_run", TOOLS / "k7-run.py")
K7 = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(K7)


def git(repo: Path, *args: str) -> None:
    """One git command in `repo`, as a fixed author."""
    subprocess.run(["git", "-C", str(repo), "-c", "user.name=T", "-c", "user.email=t@example.invalid", *args],
                   check=True, capture_output=True)


class SealGuard(unittest.TestCase):
    """When K7 may run, and what it is told about the seal."""

    def setUp(self) -> None:
        self.repo = Path(tempfile.mkdtemp(prefix="k7-guard-"))
        self.addCleanup(shutil.rmtree, self.repo, True)
        (self.repo / "src").mkdir()
        (self.repo / "src" / "a.py").write_text("x = 1\n", encoding="utf-8")
        (self.repo / ".metaframework").mkdir()
        self.state(4)
        git(self.repo, "init", "-q")
        git(self.repo, "add", "-A")
        git(self.repo, "commit", "-q", "-m", "seed")

    def state(self, phase: int) -> None:
        (self.repo / "STATE.json").write_text(json.dumps({"phase": phase}), encoding="utf-8")

    def seal(self) -> None:
        git(self.repo, "tag", "seal-1")

    def reopen(self, tag: str) -> None:
        record = {"seal": tag, "ruling": "GOV-9", "approved_by": "owner, 2026-10-16"}
        (self.repo / ".metaframework" / "reopen.json").write_text(json.dumps(record), encoding="utf-8")

    def test_a_reopened_seal_admits_k7_with_the_supersession_rule(self) -> None:
        self.seal()
        self.state(5)
        self.reopen("seal-1")
        (self.repo / "src" / "a.py").write_text("x = 2\n", encoding="utf-8")   # a sealed file, changed
        refusal, note = K7.seal_guard(self.repo, {}, False)
        self.assertEqual(refusal, "")
        self.assertIn("seal-1 is reopened by GOV-9", note)
        self.assertIn("F-supersession-proposals.md", note)

    def test_phase_5_runs_no_k7_unless_reopened(self) -> None:
        self.seal()
        self.state(5)
        refusal, _ = K7.seal_guard(self.repo, {}, True)
        self.assertIn("Phase 5 does not run K7", refusal)

    def test_a_reopen_naming_another_seal_reopens_nothing(self) -> None:
        self.seal()
        self.state(5)
        self.reopen("seal-0")
        refusal, _ = K7.seal_guard(self.repo, {}, True)
        self.assertIn("Phase 5 does not run K7", refusal)

    def test_over_a_sealed_library_k7_reviews_named_extension_modules_only(self) -> None:
        self.seal()
        refusal, _ = K7.seal_guard(self.repo, {}, False)
        self.assertIn("extension modules only", refusal)
        refusal, note = K7.seal_guard(self.repo, {}, True)
        self.assertEqual(refusal, "")
        self.assertIn("OUT OF SCOPE", note)

    def test_an_extension_may_not_change_a_sealed_file(self) -> None:
        self.seal()
        (self.repo / "src" / "a.py").write_text("x = 2\n", encoding="utf-8")
        refusal, _ = K7.seal_guard(self.repo, {}, True)
        self.assertIn("src/a.py", refusal)

    def test_an_unsealed_build_has_no_note(self) -> None:
        self.assertEqual(K7.seal_guard(self.repo, {}, False), ("", ""))


if __name__ == "__main__":
    unittest.main()
