"""2.7.0: session profiles. Every kind of build session starts light and the same way each run (the owner: "Queue it").

The builder profile, .claude/agents/builder.md, gives a builder only the tools it uses; the coordinator profile,
.claude/settings.local.json, turns off every plugin installed on the machine but metaframework and oop-standards, and
a session's builders inherit it. A plugin a claude.ai account syncs loads as `<name>@synced`, and that key turns it
off (measured on the desktop app's Claude Code 2.1.309, 30 Oct 2026). tools/install-gates.py writes both profiles, as
it writes the git hooks; `phase4-checks.py gates` names either when it is missing or changed. Each test reads plugin
stores it writes itself, never this machine's.

Run from the repository root: python -m unittest discover -s tools/tests
"""
import importlib.util
import json
import os
import subprocess
import sys
import unittest
from pathlib import Path

from test_gate_reach import TEMPLATE, Repo, git

SPEC = importlib.util.spec_from_file_location("install_gates_profiles", TEMPLATE / "tools" / "install-gates.py")
INSTALL_GATES = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(INSTALL_GATES)


class Profiles(Repo):
    """A project, and a machine whose plugin stores this test writes."""

    def setUp(self):
        super().setUp()
        self.home, self.local = self.tmp / "home", self.tmp / "local"
        self.desktop = self.local / "Claude-Data" / "acct" / "rpm" / "a" / "b" / "manifest.json"
        self.plugins([("metaframework", "My Uploads"), ("oop-standards", "My Uploads"),
                      ("sales", "knowledge-work-plugins")])
        cli = self.home / ".claude" / "plugins" / "installed_plugins.json"
        cli.parent.mkdir(parents=True)
        cli.write_text(json.dumps({"version": 2, "plugins": {"learning-output-style@claude-plugins-official": []}}),
                       encoding="utf-8")
        synced = self.home / ".claude" / "plugins" / "synced" / "s1" / "brand-voice~g2.meta.json"
        synced.parent.mkdir(parents=True)
        synced.write_text(json.dumps({"marketplace_name": "My Uploads"}), encoding="utf-8")

    def plugins(self, named: list[tuple[str, str]]) -> None:
        self.desktop.parent.mkdir(parents=True, exist_ok=True)
        self.desktop.write_text(json.dumps({"plugins": [{"name": n, "marketplaceName": m} for n, m in named]}),
                                encoding="utf-8")

    def run_tool(self, *args: str) -> subprocess.CompletedProcess:
        env = {**os.environ, "USERPROFILE": str(self.home), "HOME": str(self.home), "LOCALAPPDATA": str(self.local),
               "PYTHONIOENCODING": "utf-8"}
        return subprocess.run([sys.executable, *args, "--root", str(self.root)], capture_output=True, text=True,
                              encoding="utf-8", errors="replace", env=env, timeout=300)

    def install(self) -> subprocess.CompletedProcess:
        return self.run_tool(str(self.root / "tools" / "install-gates.py"))

    def gates(self) -> subprocess.CompletedProcess:
        return self.run_tool(str(self.root / "tools" / "phase4-checks.py"), "gates")


class BuilderProfile(Profiles):
    def test_the_template_ships_the_profile_install_gates_carries(self):
        shipped = (TEMPLATE / ".claude" / "agents" / "builder.md").read_bytes().replace(b"\r\n", b"\n")
        self.assertEqual(shipped, INSTALL_GATES.BUILDER_TEXT.encode("utf-8"))
        head = shipped.decode("utf-8").split("---")[1]
        self.assertIn("name: builder\n", head)
        self.assertIn("tools: Read, Write, Edit, Grep, Glob, Bash, PowerShell\n", head)
        self.assertNotIn("Skill", head)
        self.assertIn("disallowedTools: mcp__*\n", head)

    def test_a_missing_or_changed_profile_is_named_and_install_gates_writes_it(self):
        self.assertEqual(self.install().returncode, 0, self.install().stdout)
        profile = self.root / ".claude" / "agents" / "builder.md"
        for change in (lambda: profile.unlink(), lambda: profile.write_text("---\nname: builder\n---\n", "utf-8")):
            with self.subTest(change=change):
                change()
                ran = self.gates()
                self.assertEqual(ran.returncode, 1)
                self.assertIn(".claude/agents/builder.md", ran.stdout)
                self.assertIn("install-gates.py, which writes the template's copy", ran.stdout)
                self.assertIn("wrote .claude/agents/builder.md", self.install().stdout)
                self.assertEqual(self.gates().returncode, 0, self.gates().stdout)


class CoordinatorProfile(Profiles):
    def enabled(self) -> dict:
        return json.loads((self.root / ".claude" / "settings.local.json").read_text(encoding="utf-8"))["enabledPlugins"]

    def test_every_installed_plugin_is_off_but_the_two_a_build_uses(self):
        (self.root / ".claude" / "settings.local.json").write_text('{"model": "opus"}', encoding="utf-8")
        ran = self.install()
        self.assertEqual(ran.returncode, 0, ran.stdout)
        self.assertEqual(self.enabled(), {"brand-voice@synced": False, "learning-output-style@claude-plugins-official":
                                          False, "metaframework@synced": True, "oop-standards@synced": True,
                                          "sales@synced": False})
        self.assertEqual(json.loads((self.root / ".claude" / "settings.local.json").read_text())["model"], "opus")
        self.assertEqual(git(self.root, "status", "--porcelain", "--", ".claude").stdout, b"",
                         "this machine's list is never committed, and never makes K7's tree dirty")

    def test_a_plugin_installed_later_is_named_until_install_gates_runs(self):
        self.install()
        self.plugins([("metaframework", "My Uploads"), ("oop-standards", "My Uploads"), ("sales", "knowledge-work-plugins"),
                      ("legal", "knowledge-work-plugins")])
        ran = self.gates()
        self.assertEqual(ran.returncode, 1)
        self.assertIn("coordinator_profile_stale", ran.stdout)
        self.assertIn("legal@synced", ran.stdout)
        self.assertEqual(self.install().returncode, 0)
        self.assertFalse(self.enabled()["legal@synced"])


if __name__ == "__main__":
    unittest.main()
