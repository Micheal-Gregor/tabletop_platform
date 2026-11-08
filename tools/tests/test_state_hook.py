"""tools/state.py's SessionStart hook writes only its own checkout's STATE.json (RD-29).

K7's reviewer runs in a throwaway worktree with the reviewed commit's settings. Where those hooks name state.py by
its absolute path, this checkout's copy runs for the reviewer's session, which must leave this checkout's STATE.json
as it was: the review runner refuses a round that changed the repository under review.

Run from the repository root: python -m unittest discover -s tools/tests
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

STATE = Path(__file__).resolve().parents[1] / "state.py"


def session_start(root: Path, project: Path) -> subprocess.CompletedProcess:
    """The SessionStart hook for checkout `root`, in a session started in `project`."""
    env = {**os.environ, "CLAUDE_PROJECT_DIR": str(project)}
    return subprocess.run([sys.executable, "-B", str(STATE), "hook-session-start", "--root", str(root)],
                          input='{"source": "startup"}', capture_output=True, text=True, env=env, timeout=60)


class SessionStartHook(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix="mf-state-"))
        self.addCleanup(shutil.rmtree, self.root, True)
        self.before = (json.dumps({"concept": "Probe", "next_action": "kept"}, indent=2) + "\n").encode("utf-8")
        (self.root / "STATE.json").write_bytes(self.before)

    def test_a_session_started_in_another_checkout_changes_nothing_here(self):
        other = Path(tempfile.mkdtemp(prefix="mf-worktree-"))
        self.addCleanup(shutil.rmtree, other, True)
        ran = session_start(self.root, other)
        self.assertEqual((ran.returncode, ran.stdout), (0, ""))
        self.assertEqual((self.root / "STATE.json").read_bytes(), self.before)

    def test_this_checkouts_session_is_refreshed_and_given_its_state(self):
        ran = session_start(self.root, self.root)
        self.assertEqual(ran.returncode, 0, ran.stderr)
        context = json.loads(ran.stdout)["hookSpecificOutput"]["additionalContext"]
        self.assertIn("NEXT ACTION    kept", context)
        self.assertEqual(json.loads((self.root / "STATE.json").read_bytes())["updated_by"], "session-start:startup")


class PhaseFiveBanner(unittest.TestCase):
    """2.6.21: the Phase 5 banner names the folder project.json's ui_root declares (FirmOS works in web/)."""

    def banner(self, project: dict | None) -> str:
        root = Path(tempfile.mkdtemp(prefix="mf-state-"))
        self.addCleanup(shutil.rmtree, root, True)
        (root / "STATE.json").write_text(json.dumps({"concept": "Probe", "phase": 5}), encoding="utf-8")
        if project is not None:
            (root / ".metaframework").mkdir()
            (root / ".metaframework" / "project.json").write_text(json.dumps(project), encoding="utf-8")
        ran = session_start(root, root)
        self.assertEqual(ran.returncode, 0, ran.stderr)
        return json.loads(ran.stdout)["hookSpecificOutput"]["additionalContext"]

    def test_the_banner_names_the_declared_ui_root(self):
        context = self.banner({"ui_root": "web/"})
        self.assertIn("Work in web/. Start from web/surface-map.md and web/gaps.md.", context)
        self.assertNotIn("ui/", context)

    def test_undeclared_it_is_ui(self):
        for project in (None, {"ui_root": None}):
            with self.subTest(project=project):
                self.assertIn("Work in ui/. Start from ui/surface-map.md and ui/gaps.md.", self.banner(project))


if __name__ == "__main__":
    unittest.main()
