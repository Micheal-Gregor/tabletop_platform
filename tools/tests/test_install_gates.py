"""2.6.21: the install covers fast-forward merges, git am and app-made worktrees, and the checks are read as UTF-8.
2.6.24: the install writes a git hook the template manifest records and the checkout lacks.

Each test builds a small repo from the template's gate files alone (this checkout's tools/*.py and git hooks, the
plugin template's project.json, 2.7.0) and runs real git: a merge that could fast-forward, a patch applied with
`git am`, a worktree set up the way Claude Desktop sets one up, a project hook that writes a dash, an adoption that
brings a new hook.

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

TEMPLATE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(TEMPLATE / "tools"))
from basis import file_sha256                                              # noqa: E402
from gatecheck import GATE_FILES, GIT_HOOKS, hooks_installed, problems   # noqa: E402
from test_gate_reach import plugin_template                                # noqa: E402

_SPEC = importlib.util.spec_from_file_location("install_gates", TEMPLATE / "tools" / "install-gates.py")
INSTALL_GATES = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(INSTALL_GATES)

OS1_SOURCE = "class Clock:\n    def __init__(self, source=None):\n        self.s = source\n"
SAYS = "refused — a dash → an arrow"


def git(repo: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(["git", "-C", str(repo), "-c", "user.name=T", "-c", "user.email=t@example.invalid",
                           "-c", "core.autocrlf=false", *args], check=check, capture_output=True)


def out(ran: subprocess.CompletedProcess) -> str:
    return ran.stdout.decode("utf-8", "replace").strip()


def err(ran: subprocess.CompletedProcess) -> str:
    return ran.stderr.decode("utf-8", "replace")


def make_repo(root: Path) -> Path:
    """The template's gate files, and nothing else, committed on main; the gates are not installed yet."""
    for src in [*(TEMPLATE / "tools").glob("*.py"), *(TEMPLATE / ".githooks" / name for name in GIT_HOOKS)]:
        dest = root / src.relative_to(TEMPLATE)
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
    cfg = json.loads((plugin_template() / ".metaframework" / "project.json").read_text(encoding="utf-8"))
    (root / ".metaframework").mkdir()
    (root / ".metaframework" / "project.json").write_text(json.dumps({**cfg, "source_glob": "src/**/*.py"}),
                                                          encoding="utf-8")
    git(root, "init", "-q", "-b", "main")
    git(root, "add", "-A")
    git(root, "commit", "-q", "-m", "gate files")
    return root


def install(root: Path) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, str(root / "tools" / "install-gates.py"), "--root", str(root)],
                          capture_output=True, text=True, timeout=120)


class Repo(unittest.TestCase):
    """A fresh repo per test, path with a space, gates installed."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="mf21-"))
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.root = make_repo(self.tmp / "my repo")
        install(self.root)

    def head(self) -> str:
        return out(git(self.root, "rev-parse", "HEAD"))

    def commit_unchecked(self, branch: str, rel: str, text: str) -> None:
        """A commit on a new branch made with the hooks off, as a clone that never ran install-gates makes one."""
        git(self.root, "checkout", "-q", "-b", branch, "main")
        (self.root / rel).parent.mkdir(parents=True, exist_ok=True)
        (self.root / rel).write_text(text, encoding="utf-8")
        git(self.root, "add", rel)
        no_hooks = self.tmp / "no-hooks"
        no_hooks.mkdir(exist_ok=True)
        git(self.root, "-c", f"core.hooksPath={no_hooks}", "commit", "-q", "-m", f"{rel}, unchecked")
        git(self.root, "checkout", "-q", "main")


class FastForward(Repo):
    """A merge that could fast-forward makes a merge commit instead, so pre-merge-commit checks what it lands."""

    def test_the_install_turns_fast_forward_merges_off(self):
        self.assertEqual((out(git(self.root, "config", "merge.ff", check=False)),
                          out(git(self.root, "config", "pull.ff", check=False))),
                         ("false", "only"))
        self.assertNotIn("fast_forward_allowed", [p["rule"] for p in problems(self.root)])

    def test_a_branch_committed_with_the_hooks_off_cannot_fast_forward_in(self):
        self.commit_unchecked("side", "src/clock.py", OS1_SOURCE)
        before = self.head()
        merged = git(self.root, "merge", "side", "-m", "merge side", check=False)          # no --no-ff
        self.assertNotEqual(merged.returncode, 0, out(merged))
        self.assertIn("OS-1", err(merged))
        self.assertEqual(self.head(), before)

    def test_gatecheck_reports_a_setting_missing_or_changed(self):
        git(self.root, "config", "--unset", "merge.ff", check=False)
        git(self.root, "config", "pull.ff", "true")
        details = [p["detail"] for p in problems(self.root) if p["rule"] == "fast_forward_allowed"]
        self.assertEqual(len(details), 2, details)
        self.assertIn("merge.ff is unset, not false", details[0])
        self.assertIn("pull.ff is true, not only", details[1])
        install(self.root)
        self.assertNotIn("fast_forward_allowed", [p["rule"] for p in problems(self.root)])


class GitAm(Repo):
    """git am writes the patch into the index, then runs pre-applypatch, which runs the commit checks on it."""

    def patch(self, rel: str, text: str) -> Path:
        self.commit_unchecked("side", rel, text)
        path = self.tmp / "side.patch"
        path.write_bytes(git(self.root, "format-patch", "-1", "--stdout", "side").stdout)
        return path

    def test_the_hook_is_part_of_the_install(self):
        self.assertIn(".githooks/pre-applypatch", GATE_FILES)
        self.assertEqual(hooks_installed(self.root), "")
        (self.root / ".githooks" / "pre-applypatch").unlink()
        self.assertIn(".githooks/pre-applypatch is missing", hooks_installed(self.root))

    def test_a_patch_that_breaks_a_check_is_not_committed(self):
        before = self.head()
        refused = git(self.root, "am", str(self.patch("src/clock.py", OS1_SOURCE)), check=False)
        self.assertNotEqual(refused.returncode, 0, out(refused))
        self.assertIn("OS-1", err(refused))
        self.assertEqual(self.head(), before)
        git(self.root, "am", "--abort")

    def test_a_clean_patch_applies(self):
        applied = git(self.root, "am", str(self.patch("notes.txt", "hello\n")), check=False)
        self.assertEqual(applied.returncode, 0, err(applied))
        self.assertEqual(out(git(self.root, "log", "-1", "--format=%s")), "notes.txt, unchecked")


class AppWorktree(Repo):
    """A worktree as Claude Desktop makes one: worktreeConfig on, its hooks path the main checkout's, absolute."""

    def app_worktree(self) -> Path:
        wt = self.root / ".claude" / "worktrees" / "brave otter"
        git(self.root, "worktree", "add", "-q", "-b", "claude/brave-otter", str(wt))
        git(self.root, "config", "extensions.worktreeConfig", "true")
        git(wt, "config", "--worktree", "core.hooksPath", str(self.root / ".githooks"))
        return wt

    def test_another_checkouts_hooks_are_a_problem(self):
        wt = self.app_worktree()
        self.assertIn("core.hooksPath", hooks_installed(wt))
        self.assertEqual(hooks_installed(self.root), "")

    def test_install_gates_in_the_worktree_points_it_at_its_own_hooks(self):
        wt = self.app_worktree()
        install(wt)
        self.assertEqual(out(git(wt, "config", "--worktree", "--get", "core.hooksPath")), ".githooks")
        self.assertEqual((hooks_installed(wt), hooks_installed(self.root)), ("", ""))
        (wt / "src").mkdir()
        (wt / "src" / "clock.py").write_text(OS1_SOURCE, encoding="utf-8")
        git(wt, "add", "src/clock.py")
        self.assertIn("OS-1", err(git(wt, "commit", "-q", "-m", "clock", check=False)))

    def test_an_absolute_path_to_this_checkouts_own_hooks_is_accepted(self):
        for value in (str(self.root / ".githooks"), (self.root / ".githooks").as_posix()):
            with self.subTest(value=value):
                git(self.root, "config", "core.hooksPath", value)
                self.assertEqual(hooks_installed(self.root), "")


class ChildOutput(Repo):
    """What a check writes reaches the refusal as written, not decoded in the console's code page."""

    def setUp(self):
        super().setUp()
        (self.root / "hooks").mkdir()
        (self.root / "hooks" / "say.py").write_text(f"print({SAYS!r})\nraise SystemExit(1)\n", encoding="utf-8")
        cfg_path = self.root / ".metaframework" / "project.json"
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
        cfg_path.write_text(json.dumps({**cfg, "project_hooks": ["hooks/say.py"]}), encoding="utf-8")
        (self.root / "notes.txt").write_text("x\n", encoding="utf-8")
        git(self.root, "add", "notes.txt")

    def hook_said(self, env: dict) -> str:
        ran = subprocess.run([sys.executable, str(self.root / "tools" / "precommit.py"), "--root", str(self.root),
                              "--json"], capture_output=True, env=env, timeout=300)
        return " ".join(x["detail"] for x in json.loads(ran.stdout)["violations"] if x["rule"] == "project_hook")

    def test_a_hooks_words_arrive_as_written_from_any_console(self):
        plain = {k: v for k, v in os.environ.items() if k not in ("PYTHONIOENCODING", "PYTHONUTF8")}
        for shell, env in (("a plain terminal", plain), ("the router", {**plain, "PYTHONIOENCODING": "utf-8"})):
            with self.subTest(shell=shell):
                self.assertIn(SAYS, self.hook_said(env))


class HooksPlaced(Repo):
    """2.6.24: a session may not write .githooks/, so install-gates writes the hook a release adds (LedgerCore V2
    adopting 2.6.21: pre-applypatch recorded in the manifest, absent on disk, until the owner copied it by hand)."""

    def manifest(self, digests: dict) -> None:
        (self.root / ".metaframework" / "template-manifest.json").write_text(json.dumps(digests), encoding="utf-8")

    def template_digests(self) -> dict:
        return {f".githooks/{name}": file_sha256(TEMPLATE / ".githooks" / name) for name in GIT_HOOKS}

    def test_the_hooks_it_carries_are_the_templates_byte_for_byte(self):
        for name in GIT_HOOKS:
            with self.subTest(hook=name):
                self.assertEqual(INSTALL_GATES.hook_text(name).encode("utf-8"),
                                 (TEMPLATE / ".githooks" / name).read_bytes())

    def test_a_hook_the_adoption_brings_is_written(self):
        self.manifest(self.template_digests())
        hook = self.root / ".githooks" / "pre-applypatch"
        hook.unlink()
        ran = install(self.root)
        self.assertIn("wrote .githooks/pre-applypatch", ran.stdout)
        self.assertEqual(hook.read_bytes(), (TEMPLATE / ".githooks" / "pre-applypatch").read_bytes())
        self.assertEqual(hooks_installed(self.root), "")
        self.assertNotIn("template_drift", [p["rule"] for p in problems(self.root)])

    def test_a_hook_that_is_not_the_recorded_one_is_replaced(self):
        self.manifest(self.template_digests())
        hook = self.root / ".githooks" / "pre-commit"
        hook.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
        install(self.root)
        self.assertEqual(hook.read_bytes(), (TEMPLATE / ".githooks" / "pre-commit").read_bytes())

    def test_a_current_hook_is_left_alone(self):
        self.manifest(self.template_digests())
        self.assertNotIn("wrote", install(self.root).stdout)

    def test_a_manifest_from_another_release_writes_nothing(self):
        self.manifest({**self.template_digests(), ".githooks/pre-applypatch": "0" * 64})
        hook = self.root / ".githooks" / "pre-applypatch"
        hook.unlink()
        ran = install(self.root)
        self.assertFalse(hook.exists())
        self.assertIn("hook_not_placed: .githooks/pre-applypatch", ran.stdout)
        self.assertEqual(ran.returncode, 1, ran.stdout)


if __name__ == "__main__":
    unittest.main()
