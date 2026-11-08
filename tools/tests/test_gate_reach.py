"""2.6.17: the gate holds from every session shape, and nothing reaches a commit around it.

LedgerCore V2 Phase 4 attempt 1 built four steps with the gate never firing (its lead session started in another
folder) and with no git hook installed. These tests are the unit rows of the 2.6.17 acceptance criteria: each
payload is what Claude Code hands gate.py from a session shape (R in the repo, X elsewhere, S a sub-agent, W a
worktree), and each commit test runs real git. The live rows (that Claude Code fires the hooks at all) are shown in
a real session at C4.

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

TEMPLATE = Path(__file__).resolve().parents[2]
BASH = shutil.which("bash")
S3 = """# CLAUDE_Demo_Phase3

## 2. Resolved partition

| ID | Module | File | Owns OBJ | Status | Decides |
|---|---|---|---|---|---|
| MOD-01 | Clock | `src/clock.py` | OBJ-01 | ACTIVE | YES |
| MOD-02 | Ledger | `src/ledger.py` | OBJ-02 | ACTIVE | NO |

## 3. Object-to-module map

| OBJ | MOD | Role |
|---|---|---|
| OBJ-01 | MOD-01 | Clock — Guard; Decides YES |
| OBJ-02 | MOD-02 | Ledger — Store; Decides NO |

## 4. Seam contracts

| ID | Source MOD | Target MOD | Transferred value | Dependency requirement | Validation rule | Binding |
|---|---|---|---|---|---|---|
| SEAM-01 | MOD-02 | MOD-01 | `Clock.now()` | at construction | one read per act | INJECTED |

## 5. Refusal tests (CT-4)

| ID | MOD | Invariant | Forbidden input | Expected rejection | Test name |
|---|---|---|---|---|---|
| REF-01 | MOD-02 | INV-1 | a negative amount | `REFUSE(NEGATIVE)` | `tests/test_ledger.py::test_negative` |

## 7. Hook manifest (CT-6)

| ID | MOD | Trigger | Condition | Block action | Registered at |
|---|---|---|---|---|---|
| HOOK-01 | MOD-02 | before-commit | append only | abort | `src/ledger.py` |

## 11. Module completion checklist

| MOD | CT-1 | CT-2 | CT-3 | CT-4 | CT-5 |
|---|---|---|---|---|---|
| MOD-01 | PASS | PASS | PASS | PASS | PASS |
| MOD-02 | PASS | PASS | PASS | PASS | PASS |
"""
S2 = """# CLAUDE_Demo_Phase2

## 2. Expressed Object Model

| ID | Node | Kind | Tag | Traces to | Status | Decides |
|---|---|---|---|---|---|---|
| OBJ-01 | Clock | Guard | — | GBC-1 | ACTIVE | YES |
| OBJ-02 | Ledger | Store | — | GBC-2 | ACTIVE | NO |

### Declared inputs

| ID | Declared inputs |
|---|---|
| OBJ-01 | source |
| OBJ-02 | clock |
"""
S3_REL, S2_REL = "governance/S3/CLAUDE_Demo_Phase3.md", "docs/CLAUDE_Demo_Phase2.md"
OS1_SOURCE = "class Clock:\n    def __init__(self, source=None):\n        self.s = source\n"


def git(repo: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(["git", "-C", str(repo), "-c", "user.name=T", "-c", "user.email=t@example.invalid",
                           "-c", "core.autocrlf=false", *args], check=check, capture_output=True)


# The template's own top-level folders (2.6.21). The tool tests copy these and every top-level file, never a build's
# other folders: copying a whole build before each test (its .claude/worktrees, node_modules and .git) ran a FirmOS
# port past an hour.
TEMPLATE_FOLDERS = frozenset({".claude", ".githooks", ".metaframework", "INSTRUMENTS", "governance", "src", "tests",
                              "tools", "ui", "vectors"})
# Never copied, at any depth: history, the K7 worktree, caches, installs and build output.
NOT_COPIED = frozenset({".git", ".k7", "__pycache__", "node_modules", ".venv", "venv", "dist", "build", "out"})


def outside_template(source: Path, folder: str, names: list[str]) -> set[str]:
    """copytree's ignore: the entries of `folder` that a template project copied from `source` does not have."""
    here = Path(folder)
    if here == source:
        return {n for n in names if n in NOT_COPIED or (n not in TEMPLATE_FOLDERS and (here / n).is_dir())}
    worktrees = {"worktrees"} if here == source / ".claude" else set()
    return {n for n in names if n in NOT_COPIED or n in worktrees}


def copy_template(source: Path, dest: Path) -> None:
    """`source` as a template project: in the plugin the whole template, in a build its template part (2.6.21)."""
    shutil.copytree(source, dest, ignore=lambda folder, names: outside_template(source, folder, names))


# The tool tests start from the plugin's own template, never from the build they run in (2.7.0). In a build the
# template's folders hold the build's state: on LedgerCore V2 its project.json hooks, K7 verdicts, filled ledgers and
# gate-live log gave 21 failures and an error, none a defect. The tools under test stay this checkout's, laid over the
# copy. The template-manifest that pins them needs no laying over: a build's fixture is the template whose manifest is
# the build's own, the release its tools came from.
IN_PLUGIN = ("skills", "phase4-build", "references", "repo-template")
UNDER_TEST = ("tools", ".githooks", ".claude/settings.json")


def manifest_of(folder: Path) -> dict | None:
    try:
        return json.loads((folder / ".metaframework" / "template-manifest.json").read_bytes().decode("utf-8"))
    except (OSError, ValueError):
        return None


def installed_templates() -> list[Path]:
    """The repo templates of the plugins installed on this machine: the desktop app's store, Claude Code's cache and
    its synced folder."""
    tail, home = "/".join(IN_PLUGIN), Path.home() / ".claude" / "plugins"
    stores = [(home, f"cache/*/*/*/{tail}"), (home, f"synced/*/*/{tail}")]
    if os.environ.get("LOCALAPPDATA"):
        stores.append((Path(os.environ["LOCALAPPDATA"]) / "Claude-Data", f"*/rpm/*/*/*/{tail}"))
    return [p for store, pattern in stores for p in sorted(store.glob(pattern))]


def template_source() -> tuple[Path | None, str]:
    """(the template the tests copy their fixture from, why there is none). In the plugin it is this checkout; in a
    build, METAFRAMEWORK_TEMPLATE when it is set, else the installed template whose manifest is the build's."""
    if TEMPLATE.parts[-4:] == IN_PLUGIN:
        return TEMPLATE, ""
    named = os.environ.get("METAFRAMEWORK_TEMPLATE")
    if named:
        return (Path(named), "") if manifest_of(Path(named)) else (None, f"METAFRAMEWORK_TEMPLATE={named} is not "
                                                                         "a repo template")
    own = manifest_of(TEMPLATE)
    found = next((p for p in installed_templates() if own and manifest_of(p) == own), None)
    return (found, "") if found else (None, "no installed metaframework template carries this build's "
                                            ".metaframework/template-manifest.json")


PLUGIN_TEMPLATE, NO_TEMPLATE = template_source()
if PLUGIN_TEMPLATE is None:
    print(f"tool tests: {NO_TEMPLATE}, so the tests that start from the template are skipped. The plugin's own run "
          f"covers them: python -m unittest discover -s tools/tests, in the plugin's {'/'.join(IN_PLUGIN)}.",
          file=sys.stderr)


def plugin_template() -> Path:
    """The plugin's template, or the calling test skipped when this build cannot reach it (2.7.0)."""
    if PLUGIN_TEMPLATE is None:
        raise unittest.SkipTest(NO_TEMPLATE)
    return PLUGIN_TEMPLATE


def template_project(dest: Path) -> None:
    """A fresh template project: the plugin's template, with this checkout's tools under test laid over it (2.7.0)."""
    copy_template(plugin_template(), dest)
    for rel in UNDER_TEST if PLUGIN_TEMPLATE != TEMPLATE else ():
        src, out = TEMPLATE / rel, dest / rel
        if src.is_dir():
            shutil.rmtree(out, ignore_errors=True)
            shutil.copytree(src, out, ignore=shutil.ignore_patterns(*NOT_COPIED))
        elif src.is_file():
            shutil.copy2(src, out)


def make_project(parent: Path, source: Path | None = None) -> Path:
    """The template as a C4-anchored repo, path with a space, S3 and S2 committed, gates NOT yet installed. `source`,
    when given, is a build whose template part is copied instead (2.6.21)."""
    root = parent / "my repo"
    # Not .git: the suite runs from a git-initialised copy of the template, whose history is not the fixture's.
    if source:
        copy_template(source, root)
    else:
        template_project(root)
    for rel, text in ((S3_REL, S3), (S2_REL, S2)):
        (root / rel).parent.mkdir(parents=True, exist_ok=True)
        (root / rel).write_text(text, encoding="utf-8")
    cfg_path = root / ".metaframework" / "project.json"
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    cfg.update({"source_glob": "src/**/*.py", "s3_document": S3_REL, "s2_document": S2_REL})
    cfg_path.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
    git(root, "init", "-q", "-b", "main")
    git(root, "add", "-A")
    git(root, "commit", "-q", "-m", "anchor")
    return root


def install(root: Path) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, str(root / "tools" / "install-gates.py"), "--root", str(root)],
                          capture_output=True, text=True, timeout=120)


class Repo(unittest.TestCase):
    """A fresh project per test, and a folder outside it for the X shape."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="mf17-"))
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.root = make_project(self.tmp)
        self.elsewhere = self.tmp / "elsewhere"
        self.elsewhere.mkdir()

    def gate(self, tool: str, tool_input: dict, cwd: Path | None = None, project: Path | None = None,
             **extra) -> subprocess.CompletedProcess:
        """gate.py on one call, as Claude Code hands it over: X shape (cwd and project elsewhere) by default."""
        payload = {"hook_event_name": "PreToolUse", "tool_name": tool, "tool_input": tool_input,
                   "cwd": str(cwd or self.elsewhere), "session_id": "sess-1", **extra}
        env = {**os.environ, "CLAUDE_PROJECT_DIR": str(project or self.elsewhere)}
        return subprocess.run([sys.executable, str(self.root / "tools" / "gate.py")], capture_output=True,
                              input=json.dumps(payload).encode("utf-8"), env=env, timeout=300)

    def said(self, ran: subprocess.CompletedProcess) -> str:
        return (ran.stdout + ran.stderr).decode("utf-8", "replace")

    def assertDenied(self, ran, *words):
        self.assertEqual(ran.returncode, 2, self.said(ran))
        for w in words:
            self.assertIn(w, self.said(ran))

    def assertAllowed(self, ran):
        self.assertEqual(ran.returncode, 0, self.said(ran))

    def live_lines(self) -> list[dict]:
        log = self.root / ".metaframework" / "gate-live.jsonl"
        return [json.loads(x) for x in log.read_text(encoding="utf-8").splitlines()] if log.is_file() else []


class Probe(Repo):
    def test_a_builders_probe_is_refused_and_logged_with_its_ids(self):
        ran = self.gate("Write", {"file_path": str(self.root / ".metaframework" / "gate-probe"),
                                  "content": "nonce=0123abcd0123abcd"}, agent_id="agent-7", agent_type="builder")
        self.assertDenied(ran, "gate live")
        (line,) = self.live_lines()
        self.assertEqual((line["nonce"], line["session_id"], line["agent_id"], line["agent_type"]),
                         ("0123abcd0123abcd", "sess-1", "agent-7", "builder"))
        self.assertEqual(len(line["gate_sha256"]), 64)
        self.assertFalse((self.root / ".metaframework" / "gate-probe").exists())

    def test_one_probe_seen_by_both_hooks_is_logged_once(self):
        probe = {"file_path": str(self.root / ".metaframework" / "gate-probe"), "content": "nonce=0123abcd0123abcd"}
        for _ in range(2):                                   # the repo's hook and the plugin's router
            self.assertDenied(self.gate("Write", probe, agent_id="agent-7"), "gate live")
        self.assertEqual(len(self.live_lines()), 1)

    def test_a_shell_probe_is_refused_and_logged_too(self):
        ran = self.gate("Bash", {"command": f'echo nonce=feedfacefeedface > "{self.root.as_posix()}/.metaframework/gate-probe"'})
        self.assertDenied(ran, "gate live")
        self.assertEqual([x["nonce"] for x in self.live_lines()], ["feedfacefeedface"])
        self.assertIsNone(self.live_lines()[0]["agent_id"])


class Writes(Repo):
    def test_an_os1_write_by_absolute_path_from_another_folder_is_refused(self):
        ran = self.gate("Write", {"file_path": str(self.root / "src" / "clock.py"),
                                  "content": "class Clock:\n    def __init__(self, source=None):\n        self.s = source\n"})
        self.assertDenied(ran, "OS-1")

    def test_a_shell_write_into_source_is_refused_and_reads_removals_and_git_moves_pass(self):
        src = f'"{self.root.as_posix()}/src/clock.py"'
        for cmd in (f"echo 'x = 1' > {src}", f"cp /tmp/x.py {src}", f"sed -i s/a/b/ {src}", f"tee {src} < /dev/null"):
            self.assertDenied(self.gate("Bash", {"command": cmd}), "through the shell")
        for cmd in (f"cat {src} > /tmp/out.txt", f"rm {src}", f"cd \"{self.root.as_posix()}\" && git mv src/a.py src/b.py",
                    f"grep -n Clock {src}"):
            self.assertAllowed(self.gate("Bash", {"command": cmd}))

    def test_powershell_and_the_terminal_tool_are_held_to_the_same_rule(self):
        target = str(self.root / "src" / "clock.py")
        self.assertDenied(self.gate("PowerShell", {"command": f"Set-Content -Path '{target}' -Value 'x'"}), "through the shell")
        kind = "PowerShell" if os.name == "nt" else "Bash"
        cmd = f"Set-Content -Path '{target}' -Value 'x'" if kind == "PowerShell" else f"echo x > '{target}'"
        self.assertDenied(self.gate("mcp__terminal__run_in_terminal", {"command": cmd}), "through the shell")

    def test_a_builder_may_not_write_the_gates_own_machinery(self):
        for rel in ("tools/gate.py", ".claude/settings.json", ".metaframework/project.json"):
            ran = self.gate("Edit", {"file_path": str(self.root / rel), "old_string": "a", "new_string": "b"},
                            agent_id="agent-7", agent_type="builder")
            self.assertDenied(ran, "may not write")
        self.assertAllowed(self.gate("Edit", {"file_path": str(self.root / "tools" / "gate.py"),
                                              "old_string": "a", "new_string": "b"}))

    def test_the_logs_and_githooks_are_written_by_tools_only(self):
        for rel in (".metaframework/gate-live.jsonl", ".metaframework/brief-log.jsonl", ".githooks/pre-commit"):
            self.assertDenied(self.gate("Write", {"file_path": str(self.root / rel), "content": "{}"}))
        self.assertDenied(self.gate("Bash", {"command": f'rm "{self.root.as_posix()}/.githooks/pre-commit"'}))


class Commits(Repo):
    def commit_call(self, command: str, tool: str = "Bash") -> subprocess.CompletedProcess:
        return self.gate(tool, {"command": command})

    def stage(self, rel: str, text: str) -> None:
        (self.root / rel).parent.mkdir(parents=True, exist_ok=True)
        (self.root / rel).write_text(text, encoding="utf-8")
        git(self.root, "add", rel)

    def test_a_commit_waits_for_the_hooks_to_be_installed(self):
        self.stage("notes.txt", "hello\n")
        ran = self.commit_call(f'git -C "{self.root.as_posix()}" commit -m note')
        self.assertDenied(ran, "install-gates")
        self.assertEqual(install(self.root).returncode, 0, install(self.root).stdout)
        self.assertAllowed(self.commit_call(f'git -C "{self.root.as_posix()}" commit -m note'))

    def test_every_bypass_is_refused_and_reading_the_setting_is_not(self):
        install(self.root)
        r = self.root.as_posix()
        for cmd in (f'git -C "{r}" commit --no-verify -m x', f'cd "{r}" && git commit -n -m x',
                    f'cd "{r}"; git commit -anm "fix -n handling"', f'git -C "{r}" -c core.hooksPath=/dev/null commit -m x',
                    f'git -C "{r}" config core.hooksPath ""', f'git -C "{r}" config --unset core.hooksPath',
                    f'cd "{r}" && GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.hooksPath GIT_CONFIG_VALUE_0=x git commit -m x'):
            self.assertDenied(self.commit_call(cmd))
        self.assertAllowed(self.commit_call(f'git -C "{r}" config --get core.hooksPath'))
        self.assertDenied(self.commit_call(f'git -C "{r}" commit -n -m x', tool="mcp__terminal__run_in_terminal"))

    def test_a_staged_violation_is_refused_by_the_session_and_by_git(self):
        install(self.root)
        self.stage("src/clock.py", "class Clock:\n    def __init__(self, source=None):\n        self.s = source\n")
        self.assertDenied(self.commit_call(f'git -C "{self.root.as_posix()}" commit -m clock'), "pre-commit checks refuse")
        plain = git(self.root, "commit", "-q", "-m", "clock", check=False)      # a plain shell: no session at all
        self.assertNotEqual(plain.returncode, 0)
        self.assertIn("OS-1", plain.stderr.decode("utf-8", "replace"))

    def test_a_worktree_commit_runs_the_same_hook(self):
        install(self.root)
        wt = self.tmp / "wt"
        git(self.root, "worktree", "add", "-q", str(wt))
        (wt / "src").mkdir(exist_ok=True)
        (wt / "src" / "clock.py").write_text("class Clock:\n    def __init__(self, s=1):\n        self.s = s\n",
                                             encoding="utf-8")
        git(wt, "add", "src/clock.py")
        refused = git(wt, "commit", "-q", "-m", "clock", check=False)
        self.assertNotEqual(refused.returncode, 0, refused.stdout)
        (self.root / ".metaframework" / "gate-probe").write_text("x", encoding="utf-8")   # an ungated write
        self.stage("notes.txt", "x\n")
        self.assertIn("probe_left", git(self.root, "commit", "-q", "-m", "n", check=False).stderr.decode())


class StagedSnapshot(Repo):
    """2.6.18: a commit is checked on what it records, never on the files on disk (LedgerCore V2 live test 5b)."""

    def setUp(self):
        super().setUp()
        install(self.root)

    def commit(self, *args: str) -> subprocess.CompletedProcess:
        return git(self.root, "commit", "-q", *args, check=False)

    def test_a_violation_staged_only_in_the_index_is_refused(self):
        """5b's repro: the blob goes straight into the index; nothing is on disk."""
        blob = subprocess.run(["git", "-C", str(self.root), "hash-object", "-w", "--stdin"], check=True,
                              input=OS1_SOURCE.encode(), capture_output=True).stdout.decode().strip()
        git(self.root, "update-index", "--add", "--cacheinfo", f"100644,{blob},src/clock.py")
        self.assertFalse((self.root / "src" / "clock.py").exists())
        refused = self.commit("-m", "index only")
        self.assertNotEqual(refused.returncode, 0)
        self.assertIn("OS-1", refused.stderr.decode("utf-8", "replace"))
        self.assertDenied(self.gate("Bash", {"command": f'git -C "{self.root.as_posix()}" commit -m x'}), "OS-1")

    def test_the_same_holds_in_a_worktree(self):
        """5b ran in a worktree: the snapshot is taken from it, and the commit is refused there too."""
        wt = self.tmp / "wt"
        git(self.root, "worktree", "add", "-q", str(wt))
        blob = subprocess.run(["git", "-C", str(wt), "hash-object", "-w", "--stdin"], check=True,
                              input=OS1_SOURCE.encode(), capture_output=True).stdout.decode().strip()
        git(wt, "update-index", "--add", "--cacheinfo", f"100644,{blob},src/clock.py")
        refused = git(wt, "commit", "-q", "-m", "index only", check=False)
        self.assertNotEqual(refused.returncode, 0)
        self.assertIn("OS-1", refused.stderr.decode("utf-8", "replace"))
        listed = git(self.root, "worktree", "list", "--porcelain", check=False).stdout.decode()
        self.assertNotIn("mf-precommit-", listed, "the snapshot worktree is removed after the check")

    def test_a_violation_staged_then_fixed_on_disk_is_refused(self):
        src = self.root / "src" / "clock.py"
        src.parent.mkdir(exist_ok=True)
        src.write_text(OS1_SOURCE, encoding="utf-8")
        git(self.root, "add", "src/clock.py")
        src.write_text("class Clock:\n    pass\n", encoding="utf-8")
        self.assertIn("OS-1", self.commit("-m", "staged violation").stderr.decode("utf-8", "replace"))

    def test_project_hooks_see_the_staged_copy_not_the_disk(self):
        """A project hook runs in the snapshot: it judges what is staged, whatever the disk holds."""
        hook = self.root / "hooks" / "no_forbidden.py"
        hook.parent.mkdir(exist_ok=True)
        hook.write_text("import sys\nsys.exit(any('FORBIDDEN' in open(p, encoding='utf-8').read() "
                        "for p in sys.argv[1:] if p.endswith('.txt')))\n", encoding="utf-8")
        cfg_path = self.root / ".metaframework" / "project.json"
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
        cfg_path.write_text(json.dumps({**cfg, "project_hooks": ["hooks/no_forbidden.py"]}), encoding="utf-8")
        git(self.root, "add", "hooks/no_forbidden.py", ".metaframework/project.json")
        self.assertEqual(self.commit("-m", "the hook").returncode, 0)
        note = self.root / "note.txt"
        note.write_text("ok\n", encoding="utf-8")
        git(self.root, "add", "note.txt")
        note.write_text("FORBIDDEN\n", encoding="utf-8")                  # disk is bad, the index is fine
        self.assertEqual(self.commit("-m", "clean stage").returncode, 0)
        note.write_text("FORBIDDEN\n", encoding="utf-8")
        git(self.root, "add", "note.txt")
        note.write_text("ok\n", encoding="utf-8")                         # the index is bad, disk is fine
        self.assertIn("project_hook", self.commit("-m", "bad stage").stderr.decode("utf-8", "replace"))

    def test_a_merge_runs_the_same_checks(self):
        """pre-merge-commit (2.6.18): a branch committed with the hooks off cannot be merged in unchecked."""
        git(self.root, "checkout", "-q", "-b", "side")
        (self.root / "src").mkdir(exist_ok=True)
        (self.root / "src" / "clock.py").write_text(OS1_SOURCE, encoding="utf-8")
        git(self.root, "add", "src/clock.py")
        no_hooks = self.tmp / "no-hooks"
        no_hooks.mkdir()
        git(self.root, "-c", f"core.hooksPath={no_hooks}", "commit", "-q", "-m", "hooks off")
        git(self.root, "checkout", "-q", "main")
        merged = git(self.root, "merge", "--no-ff", "side", "-m", "merge side", check=False)
        self.assertNotEqual(merged.returncode, 0, merged.stdout)
        self.assertIn("OS-1", merged.stderr.decode("utf-8", "replace"))


class FrozenByTarget(Repo):
    """2.6.18: the frozen-S3 and sealed shell rules judge what a command writes, not whether it names the path."""

    def run_at_root(self, command: str, tool: str = "Bash") -> subprocess.CompletedProcess:
        return self.gate(tool, {"command": command}, cwd=self.root)

    def test_reading_the_frozen_spec_passes(self):
        for tool, command in (("Bash", f"cp {S3_REL} docs/copy.md"), ("Bash", f"cat {S3_REL} > /tmp/out.md"),
                              ("Bash", f"git diff -- {S3_REL}"), ("PowerShell", f"Copy-Item {S3_REL} docs/c.md")):
            with self.subTest(command=command):
                self.assertAllowed(self.run_at_root(command, tool))

    def test_writing_moving_or_removing_it_is_refused(self):
        r = self.root.as_posix()
        for tool, command in (("Bash", f"cp docs/x.md {S3_REL}"), ("Bash", f"mv {S3_REL} docs/"),
                              ("Bash", f"rm {S3_REL}"), ("Bash", f"echo x >> {S3_REL}"),
                              ("Bash", f"sed -i s/a/b/ {S3_REL}"), ("Bash", f"git checkout -- {S3_REL}"),
                              ("Bash", f"dd if=/dev/zero of={S3_REL}"), ("PowerShell", f"Move-Item {S3_REL} docs/"),
                              ("PowerShell", f"Clear-Content {S3_REL}")):
            with self.subTest(command=command):
                self.assertDenied(self.run_at_root(command, tool), "frozen")
        for command in (f'cd "{r}" && rm {S3_REL}', f'git -C "{r}" rm {S3_REL}'):     # from another folder
            with self.subTest(command=command):
                self.assertDenied(self.gate("Bash", {"command": command}), "frozen")

    def test_the_sealed_library_by_target(self):
        (self.root / "src").mkdir(exist_ok=True)
        (self.root / "src" / "a.py").write_text("A = 1\n", encoding="utf-8")
        git(self.root, "add", "src/a.py")
        git(self.root, "commit", "-q", "-m", "library")
        git(self.root, "tag", "seal-1")
        self.assertAllowed(self.run_at_root("cp src/a.py /tmp/a_copy.py"))
        for command in ("rm src/a.py", "git rm -q src/a.py", "mv src/a.py src/b.py"):
            with self.subTest(command=command):
                self.assertEqual(self.run_at_root(command).returncode, 2, command)
        self.assertDenied(self.run_at_root("rm src/a.py"), "sealed at seal-1")

    def test_a_refusal_reads_cleanly(self):
        """2.6.18: the dash in a reason arrives as a dash, not as "?" or a replacement character."""
        said = self.run_at_root(f"rm {S3_REL}").stderr.decode("utf-8")
        self.assertIn("DENIED —", said)
        self.assertNotIn("�", said)


class Checks(Repo):
    def run_tool(self, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run([sys.executable, *args], cwd=self.root, capture_output=True, text=True, timeout=300)

    def test_os3_reads_the_partition_from_section_2_only(self):
        (self.root / "src").mkdir(exist_ok=True)
        (self.root / "src" / "clock.py").write_text("class Clock:\n    pass\n", encoding="utf-8")
        (self.root / "src" / "ledger.py").write_text("from clock import Clock\n\nclass Ledger:\n    pass\n", encoding="utf-8")
        git(self.root, "add", "-A")
        ran = self.run_tool("tools/phase4-checks.py", "objects", "--root", str(self.root), "--json")
        rules = {(x["rule"], x["file"]) for x in json.loads(ran.stdout)["violations"]}
        self.assertIn(("OS-3_decider_imported", "src/ledger.py"), rules)

    def test_the_install_proves_itself_and_a_step_waits_for_it(self):
        failing = self.run_tool("tools/phase4-checks.py", "gates", "--root", str(self.root))
        self.assertEqual(failing.returncode, 1)
        self.assertIn("commit_hook_not_installed", failing.stdout)
        step = self.run_tool("tools/state.py", "set", "current_module=MOD-01", "--root", str(self.root))
        self.assertEqual(step.returncode, 1, step.stderr)
        self.assertIn("no build step starts", step.stderr)
        self.assertEqual(install(self.root).returncode, 0, install(self.root).stdout)
        self.assertEqual(self.run_tool("tools/phase4-checks.py", "gates", "--root", str(self.root)).returncode, 0)
        self.assertEqual(self.run_tool("tools/state.py", "set", "current_module=MOD-01", "--root", str(self.root)).returncode, 0)

    def test_the_template_manifest_matches_the_machinery(self):
        sys.path.insert(0, str(TEMPLATE / "tools"))
        from gatecheck import MANIFEST, compute_manifest
        recorded = json.loads((TEMPLATE / MANIFEST).read_text(encoding="utf-8"))
        self.assertEqual({k: v for k, v in recorded.items() if not k.startswith("_")}, compute_manifest(TEMPLATE),
                         "tools/ changed without the manifest: regenerate it (the plugin's tools/template_manifest.py)")

    @unittest.skipUnless(BASH, "bash runs the hook command as Claude Code does")
    def test_the_hook_command_fails_closed_when_python_cannot_start(self):
        command = json.loads((self.root / ".claude" / "settings.json").read_text())["hooks"]["PreToolUse"][0]["hooks"][0]["command"]
        ran = subprocess.run([BASH, "-c", command], env={"PATH": str(self.elsewhere), "CLAUDE_PROJECT_DIR": str(self.root)},
                             input=b"{}", capture_output=True, timeout=60)
        self.assertEqual(ran.returncode, 2, ran.stderr)


class Briefs(Repo):
    def brief(self, module: str = "MOD-01") -> str:
        ran = subprocess.run([sys.executable, str(self.root / "tools" / "brief.py"), module, "--root", str(self.root)],
                             capture_output=True, timeout=120)
        self.assertEqual(ran.returncode, 0, ran.stderr)
        return ran.stdout.decode("utf-8")

    def launch(self, prompt: str, subagent: str = "builder") -> subprocess.CompletedProcess:
        return self.gate("Agent", {"prompt": prompt, "subagent_type": subagent, "description": "build"},
                         cwd=self.root, project=self.root)

    def test_a_brief_carries_the_review_basis(self):
        text = self.brief("MOD-02")
        self.assertTrue(text.startswith("MF-BRIEF MOD-02 nonce="))
        for part in ("SEAM-01", "REF-01", "HOOK-01", "OBJ-02", "Declared inputs", "OS-1",
                     "tools/new-object.py Ledger --file src/ledger.py", "gate-probe"):
            self.assertIn(part, text)
        self.assertNotIn("MOD-01 | PASS", text)              # §11's checklist is not the partition

    def test_a_launch_needs_a_current_issued_unused_stamp(self):
        self.assertDenied(self.launch("Build MOD-01 now."), "tools/brief.py")
        self.assertAllowed(self.launch("Build MOD-01 now.", subagent="Explore"))
        text = self.brief()
        self.assertAllowed(self.launch(text))
        self.assertDenied(self.launch(text, subagent="general-purpose"), 'subagent_type "builder"')   # 2.7.0
        forged = text.replace(text.split()[2], "nonce=" + "ab" * 8, 1)
        self.assertDenied(self.launch(forged), "not issued")
        with (self.root / "INSTRUMENTS" / "object-model-and-parameters.md").open("a", encoding="utf-8") as fh:
            fh.write("\n")
        self.assertDenied(self.launch(text), "stale")

    def probe_and_verify(self, **ids) -> subprocess.CompletedProcess:
        nonce = self.brief().split()[2].split("=")[1]
        verify = [sys.executable, str(self.root / "tools" / "brief.py"), "verify", "--nonce", nonce, "--root", str(self.root)]
        self.assertEqual(subprocess.run(verify, capture_output=True).returncode, 1)          # never probed
        self.gate("Write", {"file_path": str(self.root / ".metaframework" / "gate-probe"), "content": f"nonce={nonce}"},
                  **ids)
        return subprocess.run(verify, capture_output=True)

    def test_a_builders_one_probe_accepts_its_step(self):
        self.assertEqual(self.probe_and_verify(agent_id="a-1", agent_type="builder").returncode, 0)

    def test_the_leads_own_probe_accepts_nothing(self):
        ran = self.probe_and_verify()
        self.assertEqual(ran.returncode, 1)
        self.assertIn(b"not a sub-agent", ran.stderr)


class Reach21(Repo):
    """2.6.21's session-side rules. Each case is one call, run from the repo's root unless it says `git -C`."""

    BUILDER = {"agent_id": "agent-7", "agent_type": "builder"}

    def setUp(self):
        super().setUp()
        (self.root / "notes.txt").write_text("n\n", encoding="utf-8")
        self.r = self.root.as_posix()

    def at_root(self, command: str, tool: str = "Bash", **extra) -> subprocess.CompletedProcess:
        return self.gate(tool, {"command": command}, cwd=self.root, **extra)

    def each_denied(self, commands, *words, tool: str = "Bash", **extra):
        for command in commands:
            with self.subTest(command=command):
                self.assertDenied(self.at_root(command, tool, **extra), *words)

    def each_allowed(self, commands, tool: str = "Bash", **extra):
        for command in commands:
            with self.subTest(command=command):
                self.assertAllowed(self.at_root(command, tool, **extra))


class FolderTargets(Reach21):
    """Item 1: a path is read for where it lands; a folder removed, moved or copied takes everything beneath it."""

    def test_a_copy_or_move_into_the_frozen_folder_is_refused(self):
        self.each_denied(["cp docs/x.md governance/S3/", "mv docs/x.md governance/S3", "cp -t governance/S3 docs/x.md",
                          "cp --target-directory=governance/S3 docs/x.md", "ln -s ../x.md governance/S3/"], "frozen")
        self.each_denied(["Copy-Item docs/x.md -Destination governance/S3", "Move-Item docs/x.md governance/S3",
                          "Copy-Item -Destination governance/S3 -Path docs/x.md"], "frozen", tool="PowerShell")

    def test_removing_the_frozen_folder_or_one_above_it_is_refused(self):
        self.each_denied(["rm -r governance/S3", "rm -rf governance", "rmdir governance/S3", "rm -rf *",
                          "git rm -r -q governance/S3", "mv governance/S3 old-s3", "cd governance && rm -rf S3"],
                         "frozen")
        self.each_denied(["Remove-Item governance/S3 -Recurse -Force"], "frozen", tool="PowerShell")
        self.each_denied(["rm -rf .", "rm -rf .."], "name the files you mean")
        self.assertDenied(self.gate("Bash", {"command": f'git -C "{self.r}" rm -r -q governance'}), "frozen")

    def test_copying_out_of_a_protected_folder_is_a_read(self):
        self.each_allowed([f"cp {S3_REL} docs/", "cp -r governance/S3 docs/", f"cp -t docs {S3_REL}",
                           "rm -rf docs/scratch", "cp -r tools docs/tools-copy"])
        self.each_allowed(["Copy-Item governance/S3 -Destination docs -Recurse"], tool="PowerShell")
        self.each_allowed(["cp tools/gate.py docs/"], **self.BUILDER)

    def test_the_sealed_library_and_its_source_by_folder(self):
        (self.root / "src").mkdir(exist_ok=True)
        (self.root / "src" / "a.py").write_text("A = 1\n", encoding="utf-8")
        git(self.root, "add", "src/a.py")
        git(self.root, "commit", "-q", "-m", "library")
        git(self.root, "tag", "seal-1")
        for rel in ("pkg/mod.py", "assets/readme.txt"):
            (self.elsewhere / rel).parent.mkdir(exist_ok=True)
            (self.elsewhere / rel).write_text("x = 1\n", encoding="utf-8")
        away = self.elsewhere.as_posix()
        self.each_denied(["rm -r src", "mv src lib", "git rm -r -q src", f'cp -r "{away}/assets/." src/'],
                         "src/a.py, sealed at seal-1")
        self.each_denied([f'cp "{away}/pkg/mod.py" src/', f'cp -r "{away}/pkg" src/'], "through the shell")

    def test_a_builder_reaches_no_machinery_through_a_folder(self):
        self.each_denied(["rm -rf tools", "cp notes.txt tools/", "mv notes.txt .claude", "cp -r docs .metaframework/"],
                         "may not write", **self.BUILDER)
        self.each_denied(["rm -rf .githooks"], ".githooks/ is installed")
        self.each_denied(["rm -rf .metaframework"], "written by the gate", "name the files you mean")
        self.each_allowed(["cp notes.txt tools/"])

    def test_gits_own_records_change_through_git_only(self):
        self.each_denied(["echo 0 > .git/refs/heads/main", "rm -rf .git"], "git's own record")
        self.assertDenied(self.gate("Write", {"file_path": str(self.root / ".git" / "config"), "content": "x"}),
                          "git's own record")
        self.each_allowed(["cat .git/HEAD"])


class FastForwards(Reach21):
    """Item 2: a fast-forward lands commits without the merge check; the route is fetch, then git merge --no-ff."""

    def test_a_fast_forward_a_pull_and_their_settings_are_refused(self):
        r = self.r
        for command in (f'git -C "{r}" merge --ff-only side', f'cd "{r}" && git merge --ff side', f'git -C "{r}" pull',
                        f'git -C "{r}" pull --no-ff origin main', f'git -C "{r}" fetch origin main:main',
                        f'git -C "{r}" fetch . side:main', f'git -C "{r}" push . side:main',
                        f'git -C "{r}" merge --no-ff --no-verify side', f'git -C "{r}" -c merge.ff=true merge side',
                        f'git -C "{r}" config merge.ff true', f'git -C "{r}" config --unset pull.ff'):
            with self.subTest(command=command):
                self.assertDenied(self.gate("Bash", {"command": command}), "git merge --no-ff")

    def test_fetching_and_a_no_ff_merge_are_not_fast_forwards(self):
        self.each_allowed(["git fetch origin", "git merge --abort", 'git log --oneline --grep "git pull"'])
        self.each_allowed(["git merge --no-ff side"])       # RD-32 (2.7.0): no round blocks it; tests/test_gate_spellings


class HookSkips(Reach21):
    """Item 3 (owner ruling "Refuse in sessions"): no commit lands without the commit check."""

    def test_commands_that_skip_the_commit_hook_are_refused_with_the_checked_route(self):
        self.each_denied(["git cherry-pick abc1234", "git cherry-pick -x abc1234", "git cherry-pick --continue",
                          "git revert HEAD"], "--no-commit, then git commit")
        self.each_denied(["git rebase main", "git rebase --abort", "git branch -f main side", "git branch -M main",
                          "git branch --force main side", "git reset --hard side", "git reset --hard HEAD~1",
                          "git reset --soft side", "git reset side", "git checkout -B main side",
                          "git switch -C main side",
                          "git update-ref refs/heads/main HEAD~1", 'bash -c "git rebase main"'], "git merge --no-ff")
        self.each_denied(["git commit-tree HEAD^{tree} -m x"], "then git commit")
        self.each_denied(["git am --no-verify fix.patch"], "pre-applypatch; never --no-verify")

    def test_the_checked_routes_pass(self):
        self.each_allowed(["git cherry-pick --no-commit abc1234", "git cherry-pick -n abc1234", "git revert -n HEAD",
                           "git cherry-pick --abort", "git reset --hard", "git reset --hard HEAD", "git reset",
                           "git reset -- notes.txt", "git reset HEAD notes.txt", "git reset notes.txt",
                           "git branch side2", "git checkout -b side3", "git am fix.patch", 'echo "git rebase main"',
                           'git log --grep "git rebase"'])
        self.assertAllowed(self.gate("Bash", {"command": f'git -C "{self.elsewhere.as_posix()}" rebase main'}))


class StageThenCommit(Reach21):
    """Item 4: the commit checks run before the call does, so staging and committing take two calls. Item 6: the
    checks' own refusal reads cleanly."""

    def setUp(self):
        super().setUp()
        install(self.root)

    def test_staging_and_committing_in_one_call_is_refused(self):
        said = "stage in one call, commit in the next"
        self.each_denied(["git add notes.txt && git commit -m x", "git add -A; git commit -m x",
                          "git add notes.txt\ngit commit -m x", "git update-index --add notes.txt && git commit -m x",
                          "git restore --staged notes.txt; git commit -m x", "git stash pop; git commit -m x",
                          "git cherry-pick -n abc1234 && git commit -m x",
                          'bash -c "git add notes.txt && git commit -m x"'], said)
        r = self.r
        both = f'git -C "{r}" add notes.txt && git -C "{r}" commit -m x'
        self.assertDenied(self.gate("Bash", {"command": both}), said)
        ps = f"git -C '{r}' add notes.txt; if ($?) {{ git -C '{r}' commit -m x }}"
        self.assertDenied(self.gate("PowerShell", {"command": ps}), said)

    def test_staging_alone_or_after_the_commit_passes(self):
        self.each_allowed(["git add notes.txt", 'git commit -m "git add later"',
                           "git restore notes.txt; git commit -m x"])

    def test_a_refused_commit_reads_its_dash_cleanly(self):
        """The router hands the gate PYTHONIOENCODING=utf-8; the checks' reason arrived as "â€”" before 2.6.21."""
        (self.root / "src").mkdir(exist_ok=True)
        (self.root / "src" / "clock.py").write_text("import os\n\n" + OS1_SOURCE + "        self.e = os.environ\n",
                                                    encoding="utf-8")
        git(self.root, "add", "src/clock.py")
        payload = {"tool_name": "Bash", "tool_input": {"command": f'git -C "{self.r}" commit -m clock'},
                   "cwd": str(self.root), "session_id": "sess-1"}
        env = {**os.environ, "CLAUDE_PROJECT_DIR": str(self.root), "PYTHONIOENCODING": "utf-8", "PYTHONUTF8": "0"}
        ran = subprocess.run([sys.executable, str(self.root / "tools" / "gate.py")], capture_output=True,
                             input=json.dumps(payload).encode("utf-8"), env=env, timeout=300)
        said = ran.stderr.decode("utf-8")
        self.assertDenied(ran, "pre-commit checks refuse")
        self.assertNotIn("â€", said)
        self.assertNotIn("�", said)
        self.assertGreaterEqual(said.count("—"), 2, said)       # the gate's own, and the checks'


class HooksPathReading(Reach21):
    """Item 5: only a real write of a guarded setting is refused, never a message, an echo or a grep that names it."""

    def setUp(self):
        super().setUp()
        install(self.root)

    def test_a_message_or_a_search_that_names_the_setting_passes(self):
        self.each_allowed(['git commit -m "docs: core.hooksPath is set by install-gates"', "git log --grep=hooksPath",
                           "git grep -n hooksPath -- tools", 'echo "git config core.hooksPath x"',
                           "git config core.hooksPath", "git config get core.hooksPath",
                           "git config --list --show-origin"])

    def test_every_real_write_of_a_guarded_setting_is_refused(self):
        self.each_denied(["git config set core.hooksPath x", "git config unset core.hooksPath",
                          "git config --replace-all core.hooksPath x", "git config --add core.hooksPath x",
                          "git config --unset-all core.hooksPath", "git config --local core.hooksPath x",
                          "git config --file .git/config core.hooksPath x", "git config --remove-section core",
                          "git --config-env core.hooksPath=HP commit -m x"], "install-gates.py")
        self.each_denied(["git config include.path /tmp/x.cfg"], "a config include")
        self.each_denied(["$env:GIT_CONFIG_PARAMETERS = \"'core.hooksPath'='x'\"; git commit -m y"],
                         "core.hooksPath is set", tool="PowerShell")


class OperatingRules(Repo):
    """Item 7: with .metaframework/operating-rules.md, a builder's brief carries MF-RULES <its current digest>."""

    brief = Briefs.brief
    launch = Briefs.launch

    def test_a_launch_carries_the_builds_current_operating_rules(self):
        import hashlib
        rules = self.root / ".metaframework" / "operating-rules.md"
        rules.write_bytes(b"# Operating rules\r\n\r\nA builder that cannot pass a check stops and reports.\r\n")
        digest = hashlib.sha256(rules.read_bytes().replace(b"\r\n", b"\n")).hexdigest()[:12]
        text = "\n".join(x for x in self.brief().splitlines() if not x.startswith("MF-RULES"))
        self.assertDenied(self.launch(text), "operating rules", "python tools/brief.py MOD-nn")
        self.assertAllowed(self.launch(f"{text}\nMF-RULES {digest}\n"))
        self.assertDenied(self.launch(f"{text}\nMF-RULES {'0' * 12}\n"), "operating rules")
        rules.write_text("# Operating rules\n\nStop, report, and wait for the lead.\n", encoding="utf-8")
        self.assertDenied(self.launch(f"{text}\nMF-RULES {digest}\n"), "operating rules")


class OwnerTags(Reach21):
    """Item 8: an owner-round tag is placed as closed-by-owner is; a builder places, moves and deletes no tag."""

    def test_a_builder_places_moves_and_deletes_no_tag(self):
        self.each_denied(["git tag owner-round-1", "git tag -d k7-pass-1", "git tag -f seal-1 HEAD",
                          "git tag -a closed-by-owner-1 -m ok", "git push --tags",
                          "git push origin refs/tags/owner-round-1"],
                         "creates, moves and deletes no tag", **self.BUILDER)
        self.assertDenied(self.gate("Bash", {"command": f'git -C "{self.r}" tag owner-round-2'}, **self.BUILDER),
                          "no tag")
        self.each_denied(["git update-ref refs/tags/owner-round-1 HEAD"], "update-ref", **self.BUILDER)
        self.each_allowed(["git tag", 'git tag -l "owner-round-*"'], **self.BUILDER)

    def test_an_owner_round_tag_needs_the_owners_receipt_as_closed_by_owner_does(self):
        self.each_allowed(["git tag owner-round-1", "git tag -l"])               # no receipts store declared
        self.each_denied(["git tag owner-round-next"], "owner-round-<n>")
        cfg_path = self.root / ".metaframework" / "project.json"
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
        cfg_path.write_text(json.dumps({**cfg, "pipelinegate_command": "python pg.py"}), encoding="utf-8")
        self.each_denied(["git tag owner-round-2", f'git -C "{self.r}" tag -a owner-round-2 -m "fix now"',
                          "git tag -l; git tag owner-round-2"],
                         "owner-round-2 orders one more K7 fix round", "k7-verdict-2.json does not exist")
        self.each_denied(["git tag closed-by-owner-2"],
                         "closed-by-owner-2 closes round 2, and INSTRUMENTS/k7-verdict-2.json does not exist.")
        self.each_allowed(["git tag -d owner-round-2"])


if __name__ == "__main__":
    unittest.main()
