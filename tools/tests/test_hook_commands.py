"""The hooks in .claude/settings.json find their scripts, and guard the project, from any folder the session is in.

In 2.6.10 the hooks ran `python3 tools/gate.py` relative to the shell's folder. After a `cd ui` the gate could not be
found and every tool call was blocked until the turn ended (two Story Factory Phase 5 sessions). The commands now
name "$CLAUDE_PROJECT_DIR/tools/...". gate.py also reads the repo from its own checkout, not from the payload's cwd:
from ui/ that cwd would show no seal and no project.json, and the gate would have frozen nothing.

Each test copies this template into a throwaway project whose path holds a space, and runs the hook commands exactly
as settings.json writes them, through bash, from the project's ui/ folder. In a build the copy is the build's template
part only (2.6.21): its own folders, worktrees, installs and history stay behind. Since 2.7.0 the copy is the plugin's
template with the build's tools laid over it (test_gate_reach.template_project).

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

from test_gate_reach import copy_template, make_project, plugin_template, template_project

BASH = shutil.which("bash")
# What a build has and a template project does not (2.6.21): FirmOS's worktrees, installs and history among them.
BUILD_ONLY = (".git/HEAD", ".claude/worktrees/wt1/tools/gate.py", "node_modules/x/index.js", "ui/node_modules/y/a.js",
              ".venv/pyvenv.cfg", "venv/lib/x.py", "dist/app.js", "ui/build/app.js", "out/x.txt", "web/index.html",
              ".pipelinegate/acts.jsonl", "tools/__pycache__/gate.cpython-313.pyc", ".k7/wt/x.txt")


def hook_commands(settings: Path) -> dict:
    """{event: command} from a settings.json."""
    hooks = json.loads(settings.read_bytes().decode("utf-8"))["hooks"]
    return {event: entries[0]["hooks"][0]["command"] for event, entries in hooks.items()}


def git(repo: Path, *args: str) -> None:
    subprocess.run(["git", "-C", str(repo), "-c", "user.name=T", "-c", "user.email=t@example.invalid",
                    "-c", "core.autocrlf=false", *args], check=True, capture_output=True)


@unittest.skipUnless(BASH and subprocess.run([BASH, "-c", "command -v python3"], capture_output=True).returncode == 0,
                     "bash with python3 on its PATH is needed to run the hook commands as Claude Code does")
class HookCommandsFromUi(unittest.TestCase):
    def setUp(self):
        self.project = Path(tempfile.mkdtemp(prefix="mf6-")) / "my project"
        self.addCleanup(shutil.rmtree, self.project.parent, True)
        template_project(self.project)
        (self.project / "src" / "a.ts").write_text("export const a = 1;\n", encoding="utf-8")
        git(self.project, "init", "-q")
        git(self.project, "add", "-A")
        git(self.project, "commit", "-q", "-m", "seed")
        git(self.project, "tag", "seal-1")                     # src/a.ts is sealed (source_glob src/**/*.ts)
        self.commands = hook_commands(self.project / ".claude" / "settings.json")

    def run_hook(self, command: str, payload: dict) -> subprocess.CompletedProcess:
        env = {**os.environ, "CLAUDE_PROJECT_DIR": self.project.as_posix()}
        return subprocess.run([BASH, "-c", command], cwd=self.project / "ui", env=env, capture_output=True,
                              input=json.dumps(payload).encode("utf-8"), timeout=120)

    def tool_call(self, tool: str, tool_input: dict) -> subprocess.CompletedProcess:
        return self.run_hook(self.commands["PreToolUse"], {"hook_event_name": "PreToolUse", "tool_name": tool,
                                                           "tool_input": tool_input, "cwd": str(self.project / "ui")})

    def test_the_gate_allows_an_ordinary_call_from_ui(self):
        ran = self.tool_call("Bash", {"command": "ls"})
        self.assertEqual(ran.returncode, 0, ran.stderr.decode("utf-8", "replace"))

    def test_the_gate_still_freezes_the_sealed_library_from_ui(self):
        ran = self.tool_call("Write", {"file_path": str(self.project / "src" / "a.ts"), "content": "x"})
        said = (ran.stdout + ran.stderr).decode("utf-8", "replace")     # gate.py prints in the console's code page
        self.assertEqual(ran.returncode, 2, said)
        self.assertIn("is sealed at seal-1", said)

    def test_a_relative_path_resolves_against_the_folder_the_tool_acts_in(self):
        ran = self.tool_call("Edit", {"file_path": "../src/a.ts", "old_string": "1", "new_string": "2"})
        self.assertEqual(ran.returncode, 2, ran.stderr.decode("utf-8", "replace"))

    def test_the_state_hooks_run_from_ui_and_write_the_projects_state(self):
        for event, payload, by in (("SessionStart", {"source": "startup"}, "session-start:startup"),
                                   ("PreCompact", {"trigger": "manual"}, "precompact:manual")):
            ran = self.run_hook(self.commands[event], payload)
            self.assertEqual(ran.returncode, 0, ran.stderr.decode("utf-8", "replace"))
            state = json.loads((self.project / "STATE.json").read_bytes())
            self.assertEqual((state["updated_by"], state["seal_tag"]), (by, "seal-1"))
        self.assertFalse((self.project / "ui" / "STATE.json").exists())

    def test_a_command_relative_to_the_shells_folder_is_not_found_from_ui(self):
        """Why the commands are anchored: 2.6.10's form, run from ui/."""
        ran = self.run_hook("python3 tools/gate.py", {"tool_name": "Bash", "tool_input": {"command": "ls"}})
        self.assertNotEqual(ran.returncode, 0)
        self.assertIn("can't open file", ran.stderr.decode("utf-8", "replace"))


def write_files(root: Path, rels) -> None:
    for rel in rels:
        (root / rel).parent.mkdir(parents=True, exist_ok=True)
        (root / rel).write_text("x\n", encoding="utf-8")


def files_under(root: Path) -> set[str]:
    return {p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file()}


class TemplatePartOfABuild(unittest.TestCase):
    """2.6.21: the tool tests copy what a template project is, never a whole build."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="mf21-"))
        self.addCleanup(shutil.rmtree, self.tmp, True)

    def test_a_builds_own_folders_worktrees_installs_and_history_stay_behind(self):
        build = self.tmp / "a build"
        kept = {"tools/gate.py", ".claude/settings.json", "src/a.py", "ui/a.html", "STATE.json"}
        write_files(build, kept | set(BUILD_ONLY))
        copy_template(build, self.tmp / "copy")
        self.assertEqual(files_under(self.tmp / "copy"), kept)

    def test_the_gate_tests_project_is_the_template_part_too(self):
        build = self.tmp / "a build"
        template_project(build)
        write_files(build, BUILD_ONLY)
        root = make_project(self.tmp, build)
        tracked = subprocess.run(["git", "-C", str(root), "ls-files"], check=True, capture_output=True, text=True)
        self.assertIn("tools/gate.py", tracked.stdout.splitlines())
        copied = [rel for rel in BUILD_ONLY if (root / rel).exists() and not rel.startswith(".git/")]   # its own .git
        self.assertEqual(copied, [])


class ToolTestsInABuild(unittest.TestCase):
    """2.6.21: HARNESS.md's command runs these tests in a build whose own tests/ is a package (LedgerCore V2)."""

    def test_the_documented_command_runs_where_tests_is_a_package(self):
        stated = "`python -m unittest discover -s tools/tests` and no `-t`"
        harness = (plugin_template() / "HARNESS.md").read_bytes().decode("utf-8")
        self.assertTrue(stated in harness, f"HARNESS.md: {stated}")
        build = Path(tempfile.mkdtemp(prefix="mf21-")) / "a build"
        self.addCleanup(shutil.rmtree, build.parent, True)
        template_project(build)
        (build / "tests" / "__init__.py").write_text("", encoding="utf-8")
        command = [sys.executable, "-B", "-m", "unittest", "discover", "-s", "tools/tests",
                   "-p", "test_state_hook.py"]
        ran = subprocess.run(command, cwd=build, capture_output=True, text=True, timeout=300)
        self.assertEqual(ran.returncode, 0, ran.stderr)
        self.assertRegex(ran.stderr, r"Ran [1-9]")
        rooted = subprocess.run(command + ["-t", "."], cwd=build, capture_output=True, text=True, timeout=300)
        self.assertIn("Start directory is not importable", rooted.stderr)


if __name__ == "__main__":
    unittest.main()
