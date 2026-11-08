"""The template's 2.6.21 features: the Python isolation runner, the one-command S3 anchor, the language presets, and
the owner's operating rules in every builder brief. 2.6.24: the operating rules' document role, a vector's input path
on Windows, and the seal record's append and shell reads. 2.7.0: the isolation runner starts a TypeScript or PHP
build's own runner, and the presets declare it in place of `env -i`.

Each test works in a throwaway folder holding only the files the tool under test reads, never a copy of the build.

Run from the repository root: python -m unittest discover -s tools/tests
"""
import hashlib
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1]
TEMPLATE = TOOLS.parent
BASH = shutil.which("bash")
HOOK_RUNS = bool(BASH) and subprocess.run([BASH, "-c", "command -v python3"], capture_output=True).returncode == 0
IDENTITY = {"GIT_AUTHOR_NAME": "T", "GIT_AUTHOR_EMAIL": "t@example.invalid",
            "GIT_COMMITTER_NAME": "T", "GIT_COMMITTER_EMAIL": "t@example.invalid"}

sys.path.insert(0, str(TOOLS))
import preset                                                           # noqa: E402
import seal                                                             # noqa: E402
from test_gate_reach import plugin_template                             # noqa: E402


def run_tool(name: str, *args: str, env: dict | None = None) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, "-B", str(TOOLS / name), *args], capture_output=True, text=True,
                          encoding="utf-8", errors="replace", env=env, timeout=600)


def put(root: Path, rel: str, text: str) -> Path:
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(text.encode("utf-8"))
    return path


def scratch(case: unittest.TestCase, prefix: str) -> Path:
    root = Path(tempfile.mkdtemp(prefix=prefix))
    case.addCleanup(shutil.rmtree, root, True)
    return root


def presets() -> Path:
    """The plugin template's presets: the template's content, never a build's copy of it (2.7.0)."""
    return plugin_template() / ".metaframework" / "presets"


def python_preset() -> dict:
    return json.loads((presets() / "python.json").read_bytes())


ENV_PROBE = '''import os
import sys
import time
import unittest


class Environment(unittest.TestCase):
    def test_only_what_python_needs_reaches_the_test(self):
        allowed = {"PATH", "SYSTEMROOT", "TEMP", "TMP", "PYTHONHASHSEED", "TZ", "LC_CTYPE"}
        self.assertEqual(set(os.environ) - allowed, set())

    def test_no_user_site_a_fixed_hash_seed_and_utc(self):
        self.assertEqual((sys.flags.no_user_site, sys.flags.hash_randomization), (1, 0))
        self.assertEqual((os.environ["PYTHONHASHSEED"], os.environ["TZ"], time.timezone), ("0", "UTC0", 0))
'''

NESTED = '''import unittest

from src.thing import Thing


class Nested(unittest.TestCase):
    def test_the_library_imports_from_the_repo_root(self):
        self.assertEqual(Thing().name, "thing")
'''


COMMAND_PROBE = '''import os
import sys

allowed = {"PATH", "SYSTEMROOT", "TEMP", "TMP", "PYTHONHASHSEED", "TZ", "LC_CTYPE"}
print("leaked", ", ".join(sorted(set(os.environ) - allowed)) or "nothing")
sys.exit(int(sys.argv[1]) if len(sys.argv) > 1 else 0)
'''


class IsolationRunner(unittest.TestCase):
    """tools/isolation-run.py: the OS-12 isolation tests of a Python build, the environment cleared."""

    def setUp(self):
        self.root = scratch(self, "mf21-iso-")

    def configure(self, object_standard) -> None:
        put(self.root, ".metaframework/project.json", json.dumps({"object_standard": object_standard}))

    def isolate(self) -> subprocess.CompletedProcess:
        return run_tool("isolation-run.py", "--root", str(self.root), env={**os.environ, "MF_LEAK": "leaked"})

    def test_the_isolation_tests_run_with_only_what_python_needs(self):
        self.configure(python_preset()["object_standard"])
        put(self.root, "tests/test_probe_isolation.py", ENV_PROBE)
        put(self.root, "src/thing.py", "class Thing:\n    name = 'thing'\n")
        put(self.root, "tests/deep/test_thing_isolation.py", NESTED)
        put(self.root, "tests/test_thing.py", "raise SystemExit('not an isolation test: never run here')\n")
        ran = self.isolate()
        self.assertEqual(ran.returncode, 0, ran.stdout + ran.stderr)
        self.assertIn("2 isolation test file(s)", ran.stdout)
        self.assertIn("Ran 3 tests", ran.stderr)

    def test_a_failing_isolation_test_fails_the_run(self):
        self.configure(python_preset()["object_standard"])
        put(self.root, "tests/test_leak_isolation.py",
            "import os\nimport unittest\n\n\nclass Leak(unittest.TestCase):\n"
            "    def test_reaches_for_what_it_was_not_handed(self):\n        os.environ['MF_LEAK']\n")
        ran = self.isolate()
        self.assertEqual(ran.returncode, 1, ran.stdout + ran.stderr)
        self.assertIn("KeyError", ran.stderr)

    def test_no_isolation_test_is_a_failure_not_a_pass(self):
        self.configure(python_preset()["object_standard"])
        ran = self.isolate()
        self.assertEqual(ran.returncode, 1, ran.stderr)
        self.assertIn("nothing to prove", ran.stderr)

    def test_os12_switched_off_is_refused(self):
        self.configure({"isolation_test_pattern": None})
        self.assertEqual(self.isolate().returncode, 2)

    def test_a_test_whose_name_cannot_be_imported_is_named(self):
        self.configure(None)                                          # the built-in tests/**/*{stem}*.isolation.*
        put(self.root, "tests/ledger.isolation.test.py", "")
        ran = self.isolate()
        self.assertEqual(ran.returncode, 2, ran.stderr)
        self.assertIn("tests/ledger.isolation.test.py cannot be imported by name", ran.stderr)

    def test_a_command_after_the_dashes_runs_with_the_same_cleared_environment(self):
        """2.7.0: a TypeScript or PHP build's runner, started as the presets declare it, without env -i."""
        put(self.root, "probe.py", COMMAND_PROBE)
        for argv, code in (([], 0), (["3"], 1)):
            ran = run_tool("isolation-run.py", "--root", str(self.root), "--", sys.executable, "probe.py", *argv,
                           env={**os.environ, "MF_LEAK": "leaked"})
            self.assertEqual(ran.returncode, code, ran.stdout + ran.stderr)
            self.assertIn("the environment cleared to PATH", ran.stdout)
            self.assertIn("leaked nothing", ran.stdout)

    def test_a_runner_under_the_root_is_found_and_started_through_the_shell(self):
        """vendor/bin/phpunit, or npx: a folder's program is read under the root, and Windows' .bat and .cmd run."""
        put(self.root, "vendor/bin/runner", "#!/bin/sh\necho ran \"$@\"\n").chmod(0o755)
        put(self.root, "vendor/bin/runner.bat", "@echo off\r\necho ran %*\r\n")
        cmd = f'"{sys.executable}" "{TOOLS / "isolation-run.py"}" --root "{self.root}" -- vendor/bin/runner --filter It'
        code, tail = seal.run_shell(self.root, cmd)
        self.assertEqual((code, tail.splitlines()[-1]), (0, "ran --filter It"), tail)
        ran = run_tool("isolation-run.py", "--root", str(self.root), "--", "no-such-runner")
        self.assertEqual(ran.returncode, 2, ran.stderr)
        self.assertIn("no-such-runner is not a program on the cleared PATH", ran.stderr)


def git(repo: Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["git", "-C", str(repo), "-c", "core.autocrlf=false", *args], capture_output=True,
                          text=True, env={**os.environ, **IDENTITY})


class AnchorCase(unittest.TestCase):
    """A template checkout whose commits run the hook, and a Phase 3 exports folder beside it."""

    def setUp(self):
        base = scratch(self, "mf21-anchor-")
        self.repo, self.exports = base / "build", base / "exports"
        shutil.copytree(TOOLS, self.repo / "tools", ignore=shutil.ignore_patterns("__pycache__", "tests"))
        for rel, source in ((".githooks", TEMPLATE), (".metaframework", plugin_template())):     # tools, state
            shutil.copytree(source / rel, self.repo / rel, ignore=shutil.ignore_patterns("*.jsonl", "local.json"))
        put(self.repo, "governance/S3/README.md", "# Phase 3 exports land here\n")
        for args in (("init", "-q"), ("add", "-A"), ("commit", "-q", "-m", "template"),
                     ("config", "core.hooksPath", ".githooks")):
            git(self.repo, *args)
        self.fill_exports()

    def fill_exports(self) -> None:
        """The Phase 3 folder: the build instruction, its spec, and what the anchor leaves where it is."""
        shutil.rmtree(self.exports, ignore_errors=True)
        put(self.exports, "CLAUDE_Demo_Phase3.md", "# Demo build instruction\n")
        (self.exports / "Demo_Phase3_Specification.docx").write_bytes(b"PK\x03\x04 a docx\r\n")
        for rel in ("notes.txt", "README.md", "~$mo_Phase3_Specification.docx", "facets/one.md"):
            put(self.exports, rel, "x\n")

    def anchor(self) -> subprocess.CompletedProcess:
        return run_tool("anchor-s3.py", "--from", str(self.exports), "--root", str(self.repo),
                        env={**os.environ, **IDENTITY})


class AnchorS3(AnchorCase):
    """tools/anchor-s3.py: the Phase 3 exports placed by name, committed through the hook and tagged."""

    def assert_unchanged(self, ran: subprocess.CompletedProcess) -> None:
        self.assertEqual(ran.returncode, 1, ran.stdout + ran.stderr)
        self.assertEqual(sorted(p.name for p in (self.repo / "governance" / "S3").iterdir()), ["README.md"])
        self.assertEqual(git(self.repo, "tag", "-l", "s3-anchor-*").stdout, "")
        self.assertEqual(git(self.repo, "diff", "--cached", "--name-only").stdout, "")

    @unittest.skipUnless(HOOK_RUNS, "git's pre-commit hook needs python3 on the shell's PATH")
    def test_the_exports_are_placed_by_name_committed_and_tagged(self):
        ran = self.anchor()
        self.assertEqual(ran.returncode, 0, ran.stdout + ran.stderr)
        committed = git(self.repo, "show", "--name-only", "--format=", "s3-anchor-v1.0").stdout.split()
        self.assertEqual(committed, ["governance/S3/CLAUDE_Demo_Phase3.md",
                                     "governance/S3/Demo_Phase3_Specification.docx"])
        self.assertEqual((self.repo / "governance/S3/Demo_Phase3_Specification.docx").read_bytes(),
                         (self.exports / "Demo_Phase3_Specification.docx").read_bytes())
        for name in ("notes.txt", "README.md", "~$mo_Phase3_Specification.docx", "facets"):
            self.assertIn(f"not placed {name}:", ran.stdout)
        self.assertIn("tagged it s3-anchor-v1.0", ran.stdout)
        self.assertIn("already anchored", self.anchor().stderr)

    @unittest.skipUnless(HOOK_RUNS, "git's pre-commit hook needs python3 on the shell's PATH")
    def test_a_commit_the_hook_refuses_is_taken_back_out(self):
        put(self.repo, ".metaframework/gate-probe", "nonce=00\n")      # precommit refuses every commit beside it
        ran = self.anchor()
        self.assert_unchanged(ran)
        self.assertIn("probe_left", ran.stderr)
        self.assertIn("taken back out", ran.stderr)

    def test_an_existing_anchor_tag_is_refused(self):
        git(self.repo, "tag", "s3-anchor-v1.0")
        ran = self.anchor()
        self.assertIn("already anchored (s3-anchor-v1.0)", ran.stderr)
        self.assertEqual(ran.returncode, 1)

    def test_an_s3_that_already_holds_files_is_refused(self):
        put(self.repo, "governance/S3/CLAUDE_Old_Phase3.md", "# old\n")
        ran = self.anchor()
        self.assertEqual(ran.returncode, 1)
        self.assertIn("already holds CLAUDE_Old_Phase3.md", ran.stderr)

    def test_a_checkout_whose_commits_skip_the_hook_is_refused(self):
        git(self.repo, "config", "--unset", "core.hooksPath")
        ran = self.anchor()
        self.assert_unchanged(ran)
        self.assertIn("install-gates", ran.stderr)

    def test_something_already_staged_is_refused(self):
        put(self.repo, "other.txt", "x\n")
        git(self.repo, "add", "other.txt")
        ran = self.anchor()
        self.assertEqual(ran.returncode, 1)
        self.assertIn("already staged (other.txt)", ran.stderr)

    def test_a_folder_without_one_build_instruction_and_a_spec_is_refused(self):
        for setup in (lambda: (self.exports / "CLAUDE_Demo_Phase3.md").unlink(),
                      lambda: put(self.exports, "CLAUDE_Other_Phase3.md", "# other\n"),
                      lambda: (self.exports / "Demo_Phase3_Specification.docx").unlink()):
            with self.subTest(setup=setup):
                self.fill_exports()
                setup()
                self.assert_unchanged(self.anchor())

    def test_a_missing_folder_is_a_bad_invocation(self):
        ran = run_tool("anchor-s3.py", "--from", str(self.exports / "absent"), "--root", str(self.repo))
        self.assertEqual(ran.returncode, 2)


@unittest.skipUnless(HOOK_RUNS, "git's pre-commit hook needs python3 on the shell's PATH")
class AnchorRevision(AnchorCase):
    """2.8.2: anchor-s3.py --revision takes F's superseding Phase 3 export in before the seal, beside the anchor.
    In 2.6.21 to 2.8.1 the tool refused once any anchor existed (Tessera-build's revision 1, 2 Nov 2026)."""

    RECORDS = (".metaframework/project.json", "INSTRUMENTS/C4-anchor-record.md",
               "INSTRUMENTS/F-supersession-proposals.md")

    def setUp(self):
        super().setUp()
        self.assertEqual(self.anchor().returncode, 0)
        project = self.repo / ".metaframework" / "project.json"
        cfg = json.loads(project.read_bytes())
        project.write_bytes((json.dumps({**cfg, "s3_document": "governance/S3/CLAUDE_Demo_Phase3.md"}, indent=2)
                             + "\n").encode("utf-8"))
        put(self.repo, "INSTRUMENTS/F-supersession-proposals.md", "# F\n\n## SP-1 · one\n\n## SP-10 · ten\n")
        put(self.repo, "INSTRUMENTS/C4-anchor-record.md", "# C4\n\nAnchored at s3-anchor-v1.0.\n")
        git(self.repo, "add", "-A")
        self.assertEqual(git(self.repo, "commit", "-q", "-m", "the C4 record").returncode, 0)
        self.revised = self.exports.parent / "revised"
        self.fill_revision("Demo")

    def fill_revision(self, concept: str) -> None:
        shutil.rmtree(self.revised, ignore_errors=True)
        put(self.revised, f"CLAUDE_{concept}_Phase3.md", "# Demo build instruction, revision 1\n")
        put(self.revised, "revision-1-amendment.md", "# What revision 1 changes\n")
        for rel in ("test-set.json", "harness/run.md"):
            put(self.revised, rel, "x\n")

    def revise(self, *discharges: str) -> subprocess.CompletedProcess:
        return run_tool("anchor-s3.py", "--revision", str(self.revised), "--discharges", ",".join(discharges),
                        "--root", str(self.repo), env={**os.environ, **IDENTITY})

    def held(self) -> dict:
        """What a refused revision must leave as it was."""
        return {"head": git(self.repo, "rev-parse", "HEAD").stdout, "tags": git(self.repo, "tag", "-l").stdout,
                "staged": git(self.repo, "diff", "--cached", "--name-only").stdout,
                **{rel: (self.repo / rel).read_bytes() for rel in self.RECORDS}}

    def test_the_revision_lands_beside_the_anchor_pointed_at_recorded_and_tagged(self):
        ran = self.revise("SP-1")
        self.assertEqual(ran.returncode, 0, ran.stdout + ran.stderr)
        committed = git(self.repo, "show", "--name-only", "--format=", "s3-anchor-v1.1").stdout.split()
        self.assertEqual(sorted(committed), sorted(["governance/S3/v1.1/CLAUDE_Demo_Phase3.md",
                                                    "governance/S3/v1.1/revision-1-amendment.md", *self.RECORDS]))
        self.assertEqual(git(self.repo, "diff", "--name-only", "s3-anchor-v1.0", "HEAD", "--",
                             "governance/S3/CLAUDE_Demo_Phase3.md").stdout, "")
        cfg = json.loads((self.repo / ".metaframework" / "project.json").read_bytes())
        self.assertEqual(cfg["s3_document"], "governance/S3/v1.1/CLAUDE_Demo_Phase3.md")
        c4 = (self.repo / "INSTRUMENTS" / "C4-anchor-record.md").read_text(encoding="utf-8")
        digest = hashlib.sha256((self.revised / "CLAUDE_Demo_Phase3.md").read_bytes()).hexdigest()
        self.assertTrue(c4.startswith("# C4\n\nAnchored at s3-anchor-v1.0.\n\n## Revision v1.1 · "), c4)
        self.assertIn(f"`CLAUDE_Demo_Phase3.md` sha256 `{digest}`", c4)
        f = (self.repo / "INSTRUMENTS" / "F-supersession-proposals.md").read_text(encoding="utf-8")
        self.assertTrue(f.startswith("# F\n\n## SP-1 · one\n\n## SP-10 · ten\n\n## Discharged by s3-anchor-v1.1"), f)
        for name in ("test-set.json", "harness"):
            self.assertIn(f"not placed {name}:", ran.stdout)
        self.assertIn("briefs again each module the revision touches", ran.stdout)
        put(self.revised, "CLAUDE_Demo_Phase3.md", "# Demo build instruction, revision 2\n")
        ran = self.revise("SP-10")
        self.assertEqual(ran.returncode, 0, ran.stdout + ran.stderr)
        cfg = json.loads((self.repo / ".metaframework" / "project.json").read_bytes())
        self.assertEqual(cfg["s3_document"], "governance/S3/v1.2/CLAUDE_Demo_Phase3.md")
        self.assertIn("tagged it s3-anchor-v1.2", ran.stdout)

    def test_each_refusal_changes_nothing(self):
        cases = {"SP-9 not in": (lambda: None, ("SP-9",)),
                 "Other's, the anchored S3 Demo's": (lambda: self.fill_revision("Other"), ("SP-1",)),
                 "sealed (seal-1)": (lambda: git(self.repo, "tag", "seal-1"), ("SP-1",)),
                 "C4-anchor-record.md: uncommitted": (
                     lambda: put(self.repo, "INSTRUMENTS/C4-anchor-record.md", "# C4, edited\n"), ("SP-1",)),
                 "governance/S3/v1.1/ already exists": (
                     lambda: put(self.repo, "governance/S3/v1.1/begun.md", "x\n"), ("SP-1",)),
                 "no s3-anchor-v1.* tag": (lambda: git(self.repo, "tag", "-d", "s3-anchor-v1.0"), ("SP-1",))}
        for said, (setup, discharges) in cases.items():
            with self.subTest(said=said):
                self.fill_revision("Demo")
                setup()
                before = self.held()
                ran = self.revise(*discharges)
                self.assertEqual(ran.returncode, 1, ran.stdout + ran.stderr)
                self.assertIn(said, ran.stderr)
                self.assertEqual(self.held(), before)
                git(self.repo, "tag", "-d", "seal-1")
                git(self.repo, "tag", "s3-anchor-v1.0", "HEAD~1")
                git(self.repo, "checkout", "-q", "--", ".")
                git(self.repo, "clean", "-q", "-fd")

    def test_a_revision_the_hook_refuses_is_taken_back_out(self):
        put(self.repo, ".metaframework/gate-probe", "nonce=00\n")      # precommit refuses every commit beside it
        before = self.held()
        ran = self.revise("SP-1")
        self.assertEqual(ran.returncode, 1, ran.stdout + ran.stderr)
        self.assertIn("probe_left", ran.stderr)
        self.assertEqual(self.held(), before)
        self.assertFalse((self.repo / "governance" / "S3" / "v1.1").exists())

    def test_discharges_go_with_a_revision_and_only_with_one(self):
        for args in (("--revision", str(self.revised)), ("--from", str(self.exports), "--discharges", "SP-1"),
                     ("--from", str(self.exports), "--revision", str(self.revised), "--discharges", "SP-1")):
            with self.subTest(args=args):
                self.assertEqual(run_tool("anchor-s3.py", *args, "--root", str(self.repo)).returncode, 2)


class Presets(unittest.TestCase):
    """tools/preset.py and .metaframework/presets/: a language's settings, written only where the build set none."""

    def setUp(self):
        self.root = scratch(self, "mf21-preset-")
        shutil.copytree(presets(), self.root / ".metaframework" / "presets")
        self.project = put(self.root, ".metaframework/project.json", json.dumps(
            {"_comment": "kept", **preset.SHIPPED, "source_glob": "lib/**/*.py"}, indent=2) + "\n")

    def apply(self, name: str = "python") -> subprocess.CompletedProcess:
        return run_tool("preset.py", name, "--root", str(self.root))

    def test_the_python_preset_fills_what_is_unset_and_keeps_what_the_build_set(self):
        ran = self.apply()
        self.assertEqual(ran.returncode, 0, ran.stderr)
        cfg = json.loads(self.project.read_bytes())
        want = python_preset()
        for key in ("test_command", "test_module", "test_select", "isolation_test_command", "object_standard",
                    "rederive_command", "rederive_all"):
            self.assertEqual(cfg[key], want[key], key)
        self.assertEqual((cfg["source_glob"], cfg["_comment"], "_notes" in cfg), ("lib/**/*.py", "kept", False))
        self.assertIn('kept source_glob = "lib/**/*.py" (set by the build)', ran.stdout)
        self.assertIn('set isolation_test_command = "python tools/isolation-run.py"', ran.stdout)

    def test_a_second_run_sets_nothing_and_leaves_the_file_as_it_was(self):
        self.apply()
        before = self.project.read_bytes()
        ran = self.apply()
        self.assertIn("0 set, 1 kept", ran.stdout)
        self.assertEqual(self.project.read_bytes(), before)

    def test_a_crlf_project_json_stays_crlf(self):
        self.project.write_bytes(self.project.read_bytes().replace(b"\n", b"\r\n"))
        self.apply("php")
        written = self.project.read_bytes()
        self.assertEqual(written.count(b"\n"), written.count(b"\r\n"))
        self.assertEqual(json.loads(written)["test_command"], "vendor/bin/phpunit")

    def test_an_unknown_language_is_a_bad_invocation(self):
        ran = self.apply("cobol")
        self.assertEqual(ran.returncode, 2)
        self.assertIn("php, python, typescript", ran.stderr)

    def test_the_shipped_presets_set_only_the_keys_a_preset_may_fill(self):
        for path in sorted(presets().glob("*.json")):
            keys = {k for k in json.loads(path.read_bytes()) if not k.startswith("_")}
            self.assertLessEqual(keys, set(preset.SHIPPED), path.name)
        self.assertEqual(python_preset()["isolation_test_command"], "python tools/isolation-run.py")
        self.assertTrue((TOOLS / "isolation-run.py").is_file())

    def test_every_presets_isolation_command_starts_through_the_runner(self):
        """2.7.0: `env -i` is a POSIX shell's, and seal.py runs the command through cmd.exe on Windows."""
        for path in sorted(presets().glob("*.json")):
            command = json.loads(path.read_bytes())["isolation_test_command"]
            self.assertTrue(command.startswith("python tools/isolation-run.py"), path.name)
            self.assertNotIn("env -i", command, path.name)

    def test_the_php_preset_is_the_php_guides_setup(self):
        guide = (plugin_template() / "governance" / "languages" / "php.md").read_bytes().decode("utf-8")
        php = json.loads((presets() / "php.json").read_bytes())
        for key in ("test_command", "test_module", "test_select", "isolation_test_command", "source_glob"):
            self.assertIn(f'"{key}": {json.dumps(php[key])}', guide, key)


S3_DOC = "## 2. Modules\n\n| MOD | Name | File |\n|---|---|---|\n| MOD-01 | Ledger | src/ledger.py |\n"


class OperatingRulesInTheBrief(unittest.TestCase):
    """tools/brief.py: the owner's operating rules, whole, then their MF-RULES line, in every builder brief."""

    def setUp(self):
        self.root = scratch(self, "mf21-brief-")
        put(self.root, ".metaframework/project.json", json.dumps({"s3_document": "governance/S3/CLAUDE_D_Phase3.md"}))
        put(self.root, "governance/S3/CLAUDE_D_Phase3.md", S3_DOC)

    def brief(self) -> list[str]:
        ran = run_tool("brief.py", "MOD-01", "--root", str(self.root))
        self.assertEqual(ran.returncode, 0, ran.stderr)
        return ran.stdout.rstrip("\n").split("\n")

    def test_the_rules_close_the_brief_whole_then_their_digest(self):
        rules = "# Rules\r\n\r\n1. **Stop and report.** A builder that cannot pass a check stops.\r\n"
        put(self.root, ".metaframework/operating-rules.md", rules)
        lines = self.brief()
        digest = hashlib.sha256(rules.replace("\r\n", "\n").encode("utf-8")).hexdigest()[:12]
        self.assertEqual(lines[-1], f"MF-RULES {digest}")
        start = lines.index("## 6. The operating rules (.metaframework/operating-rules.md), in full")
        self.assertEqual(lines[start + 2:-2], ["### Rules", "",
                                              "1. **Stop and report.** A builder that cannot pass a check stops."])

    def test_without_the_file_the_brief_has_neither(self):
        text = "\n".join(self.brief())
        self.assertNotIn("MF-RULES", text)
        self.assertNotIn("## 6.", text)


class OperatingRulesRole(unittest.TestCase):
    """2.6.24: the template's doc roles name the operating rules it ships. Without a role, structure-check refused the
    file as unclassified at the first commit of every build and every 2.6.21 adoption (FirmOS, LedgerCore V2)."""

    def test_the_operating_rules_are_frozen(self):
        spec = importlib.util.spec_from_file_location("structure_check", TOOLS / "structure-check.py")
        check = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(check)
        roles = check.load_roles(plugin_template())
        self.assertEqual(check.classify(".metaframework/operating-rules.md", roles), "frozen")
        self.assertEqual(check.check_file(plugin_template(), ".metaframework/operating-rules.md", "frozen"), [])


ECHO_ENTRY = "import sys\nsys.stdout.write(open(sys.argv[1], encoding='utf-8').read())\n"


class RederiveInputPath(unittest.TestCase):
    """2.6.24: the vector's input file reaches the entry whole. The filled command was split with POSIX shlex, which
    dropped a Windows temp path's backslashes and split it at a space (LedgerCore V2, VEC-01: every vector failed)."""

    def test_a_temp_folder_with_a_space_and_its_separators_reaches_the_entry(self):
        root = scratch(self, "mf24-vec-")
        entry = put(root, "src/echo.py", ECHO_ENTRY)
        put(root, ".metaframework/project.json", json.dumps(
            {"rederive_invoke": f'"{Path(sys.executable).as_posix()}" {{entry}} {{input_file}}'}))
        put(root, "INSTRUMENTS/object-model-and-parameters.md",
            "| Module | File |\n|---|---|\n| MOD-01 | src/echo.py |\n")
        put(root, "vectors/VEC-01.json", json.dumps({
            "module": "MOD-01", "state": "COMPUTED", "encoding": "utf8-json", "input": '{"a": 1}',
            "output": '{"a": 1}', "impl_sha": hashlib.sha256(entry.read_bytes()).hexdigest()}))
        temp = root / "temp folder"
        temp.mkdir()
        env = {**os.environ, "TMPDIR": str(temp), "TEMP": str(temp), "TMP": str(temp)}
        ran = run_tool("rederive.py", "--all", "--root", str(root), env=env)
        self.assertEqual(ran.returncode, 0, ran.stdout + ran.stderr)
        self.assertIn("1 vector(s), all re-derived.", ran.stdout)


class SealRecordAndShell(unittest.TestCase):
    """2.6.24 (FirmOS's seal-17 run): an append leaves the record's bytes as they were, and the sweep's shell steps
    read their output as UTF-8."""

    def test_an_append_leaves_a_mixed_ending_record_as_it_was(self):
        root = scratch(self, "mf24-rec-")
        before = b"# Seal record\r\n\r\n## seal-16 \xe2\x80\x94 x\r\n\r\nrow\r\n\n## seal-17 x\nlf one\nlf two\n"
        (root / "INSTRUMENTS").mkdir()
        (root / "INSTRUMENTS" / "seal-record.md").write_bytes(before)
        seal.append_seal_record(root, "\n## seal-18 x\n\nnew\n")
        after = (root / "INSTRUMENTS" / "seal-record.md").read_bytes()
        self.assertEqual(after, before + b"\r\n## seal-18 x\r\n\r\nnew\r\n")

    def test_the_first_seal_starts_the_record(self):
        root = scratch(self, "mf24-rec-")
        seal.append_seal_record(root, "\n## seal-1 x\n")
        text = (root / "INSTRUMENTS" / "seal-record.md").read_bytes().decode("utf-8")
        self.assertTrue(text.startswith("# Seal record\n\n") and text.endswith("\n## seal-1 x\n"), text)

    def test_shell_output_is_read_as_utf8(self):
        root = scratch(self, "mf24-sh-")
        cmd = f'"{sys.executable}" -c "import sys; sys.stdout.buffer.write(bytes([0xe2, 0x80, 0x9d]))"'
        self.assertEqual(seal.run_shell(root, cmd), (0, "”"))


if __name__ == "__main__":
    unittest.main()
