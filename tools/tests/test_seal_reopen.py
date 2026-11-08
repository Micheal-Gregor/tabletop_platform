"""Tests for a seal reopened by an owner ruling, and the next seal that closes it (tools/reopen.py).

`seal.py reopen` writes .metaframework/reopen.json naming the latest seal. While it does, gate.py freezes nothing,
`seal.py verify` reports the seal as reopened, the seal sweep's prior-seal-intact step passes and names the ruling,
phase4-checks reports no sealed_file_changed, and `seal.py apply` may run in phase 5. The seal that closes the reopen
retires the record in its own commit. With no reopen, or a reopen of another tag, all of them refuse as before.

Each test builds a throwaway git repository; nothing here touches this one.
Run from the repository root: python -m unittest discover -s tools/tests
"""
import argparse
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

TOOLS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS))
import seal  # noqa: E402


def load_tool(name: str, file: str):
    """A tool whose file name is not a module name, loaded from this tools/ directory."""
    spec = importlib.util.spec_from_file_location(name, TOOLS / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


P4 = load_tool("phase4_checks", "phase4-checks.py")
GATE = load_tool("gate", "gate.py")
CFG = {"source_glob": "src/**"}
OWNER = "owner, 2026-10-16"


def git(repo: Path, *args: str) -> str:
    """One git command in `repo`, as a fixed author."""
    return subprocess.run(["git", "-C", str(repo), "-c", "user.name=T", "-c", "user.email=t@example.invalid", *args],
                          check=True, capture_output=True, text=True).stdout


class ReopenedSeal(unittest.TestCase):
    """A library sealed at seal-1 whose sealed file has since changed."""

    def setUp(self) -> None:
        self.repo = Path(tempfile.mkdtemp(prefix="seal-reopen-"))
        self.addCleanup(shutil.rmtree, self.repo, True)
        (self.repo / "src").mkdir()
        (self.repo / "src" / "a.py").write_text("x = 1\n", encoding="utf-8")
        (self.repo / ".metaframework").mkdir()
        git(self.repo, "init", "-q")
        git(self.repo, "add", "-A")
        git(self.repo, "commit", "-q", "-m", "seed")
        git(self.repo, "tag", "seal-1")
        (self.repo / "src" / "a.py").write_text("x = 2\n", encoding="utf-8")
        git(self.repo, "commit", "-q", "-am", "the sealed file changed")

    def reopen(self, tag: str) -> None:
        record = {"seal": tag, "ruling": "GOV-9", "approved_by": OWNER}
        (self.repo / ".metaframework" / "reopen.json").write_text(json.dumps(record), encoding="utf-8")

    def test_a_changed_seal_with_no_reopen_is_still_broken(self) -> None:
        step = seal.prior_seal_step(self.repo, CFG, "seal-1")
        self.assertEqual(step["status"], "fail")
        self.assertIn("src/a.py", step["detail"])
        self.assertEqual(P4.changed_sealed(self.repo, CFG, "seal-1"), ["src/a.py"])

    def test_the_seal_that_closes_a_reopen_finds_the_prior_seal_intact(self) -> None:
        self.reopen("seal-1")
        step = seal.prior_seal_step(self.repo, CFG, "seal-1")
        self.assertEqual(step["status"], "pass")
        self.assertIn("reopened by GOV-9", step["detail"])
        self.assertIn("1 sealed file(s) changed", step["detail"])
        self.assertEqual(P4.changed_sealed(self.repo, CFG, "seal-1"), [])

    def test_a_reopen_of_another_seal_reopens_nothing_here(self) -> None:
        self.reopen("seal-0")
        self.assertEqual(seal.prior_seal_step(self.repo, CFG, "seal-1")["status"], "fail")
        self.assertEqual(P4.changed_sealed(self.repo, CFG, "seal-1"), ["src/a.py"])

    def test_phase_5_refuses_a_seal_unless_the_latest_seal_is_reopened(self) -> None:
        self.assertIn("already sealed", seal.phase5_refusal(self.repo, {"phase": 5}))
        self.assertEqual(seal.phase5_refusal(self.repo, {"phase": 4}), "")
        self.reopen("seal-1")
        self.assertEqual(seal.phase5_refusal(self.repo, {"phase": 5}), "")

    def test_the_gate_freezes_nothing_while_reopened(self) -> None:
        self.assertEqual(GATE.seal_context(self.repo), ("seal-1", {"src/a.py"}))
        self.reopen("seal-1")
        self.assertEqual(GATE.seal_context(self.repo), ("seal-1", set()))

    def test_verify_reports_a_reopen_and_passes(self) -> None:
        self.assertEqual(self.verify()[0], 1)
        self.reopen("seal-1")
        code, out = self.verify()
        self.assertEqual(code, 0)
        self.assertEqual((out["status"], out["ruling"], out["changed"]), ("reopened", "GOV-9", ["src/a.py"]))

    def verify(self) -> tuple[int, dict]:
        """`seal.py verify --json` on the working tree: its exit code and its report."""
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            code = seal.run_verify(self.repo, CFG, argparse.Namespace(json=True, ref=None))
        return code, json.loads(buf.getvalue())


class ReopenCommand(unittest.TestCase):
    """`seal.py reopen`: the owner's recorded ruling reopens the latest seal, once."""

    def setUp(self) -> None:
        self.repo = Path(tempfile.mkdtemp(prefix="seal-reopen-cmd-"))
        self.addCleanup(shutil.rmtree, self.repo, True)
        (self.repo / "INSTRUMENTS").mkdir()
        (self.repo / ".metaframework").mkdir()
        (self.repo / "INSTRUMENTS" / "RESOLUTION_RECORD.md").write_text(
            "| ID | Ruling |\n|---|---|\n| GOV-20 | reopen for the retrofit |\n", encoding="utf-8")
        (self.repo / "INSTRUMENTS" / "seal-record.md").write_text("# Seal record\n\n## seal-1 — x\n",
                                                                  encoding="utf-8")
        git(self.repo, "init", "-q")
        git(self.repo, "add", "-A")
        git(self.repo, "commit", "-q", "-m", "seed")

    def reopen(self, ruling: str) -> int:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return seal.cmd_reopen(self.repo, OWNER, ruling)

    def test_with_no_seal_there_is_nothing_to_reopen(self) -> None:
        self.assertEqual(self.reopen("GOV-20"), 1)
        self.assertFalse((self.repo / ".metaframework" / "reopen.json").exists())

    def test_a_recorded_ruling_reopens_the_latest_seal_and_says_so_in_the_seal_record(self) -> None:
        git(self.repo, "tag", "seal-1")
        self.assertEqual(self.reopen("GOV-20"), 0)
        record = json.loads((self.repo / ".metaframework" / "reopen.json").read_text(encoding="utf-8"))
        self.assertEqual((record["seal"], record["ruling"], record["approved_by"]), ("seal-1", "GOV-20", OWNER))
        self.assertIn("## Reopened · seal-1", (self.repo / "INSTRUMENTS" / "seal-record.md").read_text("utf-8"))
        self.assertEqual(self.reopen("GOV-20"), 1)            # already reopened

    def test_a_ruling_must_be_recorded_whole(self) -> None:
        git(self.repo, "tag", "seal-1")
        self.assertFalse(seal.ruling_recorded(self.repo, "GOV-2"))       # only GOV-20 is recorded
        self.assertEqual(self.reopen("GOV-2"), 1)
        self.assertFalse((self.repo / ".metaframework" / "reopen.json").exists())


class SealClosesReopen(unittest.TestCase):
    """`seal.py apply` over a reopened seal-1 in phase 5: seal-2 closes the reopen and retires its record."""

    def setUp(self) -> None:
        self.repo = Path(tempfile.mkdtemp(prefix="seal-close-"))
        self.addCleanup(shutil.rmtree, self.repo, True)
        for d in ("src", "tools", ".metaframework", "INSTRUMENTS", "governance/contracts"):
            (self.repo / d).mkdir(parents=True)
        for tool in ("state.py", "reopen.py"):
            shutil.copy(TOOLS / tool, self.repo / "tools" / tool)
        (self.repo / "src" / "a.py").write_text("x = 1\n", encoding="utf-8")
        (self.repo / "governance" / "contracts" / "CLAUDE-phase5.md").write_text("## Phase 5\n", encoding="utf-8")
        (self.repo / "INSTRUMENTS" / "seal-record.md").write_text("# Seal record\n\n## seal-1 — x\n",
                                                                  encoding="utf-8")
        (self.repo / "STATE.json").write_text(json.dumps({"concept": "Probe", "phase": 5}), encoding="utf-8")
        git(self.repo, "init", "-q")
        git(self.repo, "config", "user.name", "T")                 # seal.py commits and tags as the repo's user
        git(self.repo, "config", "user.email", "t@example.invalid")
        git(self.repo, "add", "-A")
        git(self.repo, "commit", "-q", "-m", "seed")
        git(self.repo, "tag", "seal-1")

    def change_under(self, record: dict | None) -> None:
        """Change the sealed file, with `record` as the reopen (None: no reopen), and commit."""
        (self.repo / "src" / "a.py").write_text("x = 2\n", encoding="utf-8")
        if record:
            (self.repo / ".metaframework" / "reopen.json").write_text(json.dumps(record), encoding="utf-8")
        git(self.repo, "add", "-A")
        git(self.repo, "commit", "-q", "-m", "the ruled change")

    def apply(self) -> int:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return seal.cmd_apply(self.repo, CFG, OWNER, accept_failures=True)

    def test_the_seal_that_closes_a_reopen_retires_the_record_in_its_own_commit(self) -> None:
        self.change_under({"seal": "seal-1", "ruling": "GOV-9", "approved_by": OWNER})
        self.assertEqual(self.apply(), 0)
        self.assertIn("D\t.metaframework/reopen.json", git(self.repo, "show", "--name-status", "--format=", "seal-2"))
        self.assertFalse((self.repo / ".metaframework" / "reopen.json").exists())
        section = (self.repo / "INSTRUMENTS" / "seal-record.md").read_text(encoding="utf-8").split("## seal-2")[1]
        self.assertIn("seal-1 reopened by GOV-9", section)
        self.assertEqual(json.loads((self.repo / "STATE.json").read_text(encoding="utf-8"))["reopened"], "")

    def test_the_seal_commit_holds_state_naming_the_new_seal_and_leaves_the_tree_clean(self) -> None:
        """Seal-run #6: STATE.json in the seal's own commit names the tag apply cuts and the latest K7 round."""
        (self.repo / "INSTRUMENTS" / "k7-verdict-7.json").write_text("{}", encoding="utf-8")
        self.change_under({"seal": "seal-1", "ruling": "GOV-9", "approved_by": OWNER})
        self.assertEqual(self.apply(), 0)
        st = json.loads(git(self.repo, "show", "seal-2:STATE.json"))
        self.assertEqual({k: st[k] for k in ("seal_tag", "last_gate_tag", "k7_round", "phase", "reopened", "dirty")},
                         {"seal_tag": "seal-2", "last_gate_tag": "seal-2", "k7_round": 7, "phase": 5, "reopened": "",
                          "dirty": False})
        self.assertEqual(git(self.repo, "status", "--porcelain"), "")

    def test_a_reopen_shows_in_state_until_the_seal(self) -> None:
        self.change_under({"seal": "seal-1", "ruling": "GOV-9", "approved_by": OWNER})
        ran = subprocess.run([sys.executable, "-B", str(self.repo / "tools" / "state.py"), "refresh",
                              "--root", str(self.repo)], capture_output=True, text=True, timeout=60)
        self.assertIn("REOPENED by GOV-9", ran.stdout)
        self.assertEqual(json.loads((self.repo / "STATE.json").read_text(encoding="utf-8"))["reopened"],
                         f"GOV-9 ({OWNER})")

    def test_with_no_reopen_phase_5_refuses_and_nothing_is_tagged(self) -> None:
        self.change_under(None)
        self.assertEqual(self.apply(), 1)
        self.assertEqual(git(self.repo, "tag", "-l", "seal-2"), "")


if __name__ == "__main__":
    unittest.main()
