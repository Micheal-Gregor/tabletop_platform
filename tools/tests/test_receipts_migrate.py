"""tools/receipts.py admits the judged rubrics from JSON specs, and migrates a store admitted from Markdown.

The seal-4 engine (the plugin's pipelinegate skill since 2.6.8) routes every judged act through JudgedGuard, which
reads the rubric's spec as canonical JSON: {"refusal_names": [...], "text": "..."}. A store whose k7_verdict and
owner_triage were admitted from governance/rubrics/*.md (plugin 2.6.9 or earlier, under the seal-1 engine) is refused
every judged act with "not one JSON text". `setup` now admits the JSON specs; `migrate` prints the owner's lines that
admit each unreadable judged rubric as its next version from its JSON spec, and the rubric_versions value to declare.

fixtures/seal1-markdown-store.json is such a store, made by the seal-1 face (plugin 2.6.7's skill) as 2.6.9's setup
prints it. The engine run here is the plugin's own skill, found beside this template, or at PIPELINEGATE_FACE. The
rubrics are the plugin template's (2.7.0): in a build, beside the template the build's tests start from.
Each test unpacks a throwaway repository; the test plays the owner and runs the printed lines there.

Run from the repository root: python -m unittest discover -s tools/tests
"""
import importlib.util
import json
import os
import shlex
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from test_gate_reach import PLUGIN_TEMPLATE, plugin_template

TOOLS = Path(__file__).resolve().parents[1]
FIXTURE = json.loads((TOOLS / "tests" / "fixtures" / "seal1-markdown-store.json").read_bytes().decode("utf-8"))
FACE = Path(os.environ.get("PIPELINEGATE_FACE")
            or (PLUGIN_TEMPLATE or TOOLS.parent).parents[2] / "pipelinegate" / "scripts" / "pg.py")
SPECS = ("k7_verdict", "owner_triage")
MANIFEST = {"module": "MOD-01", "files": {}}


def load_receipts():
    sys.path.insert(0, str(TOOLS))
    spec = importlib.util.spec_from_file_location("receipts", TOOLS / "receipts.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


RC = load_receipts()


@unittest.skipUnless(FACE.is_file(), "the plugin's pipelinegate skill is not beside this template; set PIPELINEGATE_FACE")
class Store(unittest.TestCase):
    """A throwaway repository whose pipelinegate_command is the seal-4 face over the store `s`."""

    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix="mf5-"))     # short: the store's line files have long names
        self.addCleanup(shutil.rmtree, self.root, True)
        (self.root / ".claude" / "agents").mkdir(parents=True)
        (self.root / ".claude" / "agents" / "k7-reviewer.md").write_bytes(FIXTURE["charter"].encode("utf-8"))
        (self.root / "governance" / "rubrics").mkdir(parents=True)
        for rid in SPECS:
            for ext in (".md", ".json"):
                shutil.copyfile(plugin_template() / "governance" / "rubrics" / f"{rid}{ext}",
                                self.root / "governance" / "rubrics" / f"{rid}{ext}")
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        subprocess.run(["git", "-C", str(self.root), "-c", "core.autocrlf=false", "add", ".claude"], check=True)
        command = f'"{Path(sys.executable).as_posix()}" -B "{FACE.as_posix()}" --store s'
        self.declare(pipelinegate_command=command)

    def declare(self, **keys):
        path = self.root / ".metaframework" / "project.json"
        path.parent.mkdir(exist_ok=True)
        cfg = {**(json.loads(path.read_bytes()) if path.is_file() else {}), **keys}
        path.write_bytes(json.dumps(cfg, indent=2).encode("utf-8"))
        self.cfg = RC.load_cfg(self.root)

    def unpack_markdown_store(self):
        for rel, text in FIXTURE["files"].items():
            path = self.root / "s" / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(text.encode("utf-8"))

    def printed(self, command: str) -> list[str]:
        ran = subprocess.run([sys.executable, "-B", str(TOOLS / "receipts.py"), "--root", str(self.root), command,
                              "--signer", FIXTURE["signer"]], capture_output=True, timeout=300)
        self.assertEqual(ran.returncode, 0, ran.stderr.decode("utf-8", "replace"))
        return ran.stdout.decode("utf-8").splitlines()

    def sign(self, lines: list[str]) -> None:
        """Run the printed lines, as the owner would."""
        for line in [ln for ln in lines if ln and not ln.startswith("#")]:
            ran = subprocess.run(shlex.split(line), cwd=self.root, capture_output=True, timeout=300)
            answer = json.loads(ran.stdout.decode("utf-8"))
            acts = answer.get("acts") or [answer.get("returned")]
            self.assertTrue(all(isinstance(a, dict) and a.get("nu") == "ACCEPT" for a in acts) or "store" in answer,
                            f"{line}\n{answer}")

    def k7(self, returned=None):
        agent_def = RC.charter(self.root, self.cfg)
        transcript = RC.pg(self.root, self.cfg, "digest", "--text", "the reviewer's output")["returned"]
        return RC.nu(RC.k7(self.root, self.cfg, MANIFEST, RC.Review(agent_def, transcript if returned else None, returned)))


class MarkdownStore(Store):
    def test_the_seal4_engine_refuses_a_judged_act_on_a_markdown_spec(self):
        self.unpack_markdown_store()
        with self.assertRaisesRegex(RC.PgError, "not one JSON text"):
            self.k7()

    def test_migrate_prints_the_next_versions_and_signs_nothing(self):
        self.unpack_markdown_store()
        catalog = (self.root / "s" / "lines" / "636174616c6f67.jsonl").read_bytes()
        lines = self.printed("migrate")
        commands = [ln for ln in lines if not ln.startswith("#")]
        self.assertEqual(len(commands), 2, lines)
        self.assertIn("--id k7_verdict --v 2 --spec governance/rubrics/k7_verdict.json --decider-spec sha256:",
                      commands[0])
        self.assertIn("--id owner_triage --v 2 --spec governance/rubrics/owner_triage.json", commands[1])
        self.assertEqual(lines[-1], '# Then pin them in .metaframework/project.json: '
                                    '"rubric_versions": {"k7_verdict": 2, "owner_triage": 2}')
        self.assertEqual((self.root / "s" / "lines" / "636174616c6f67.jsonl").read_bytes(), catalog)

    def test_once_migrated_and_pinned_a_judged_act_writes_its_receipt(self):
        self.unpack_markdown_store()
        self.sign(self.printed("migrate"))
        self.declare(rubric_versions={"k7_verdict": 2, "owner_triage": 2})
        self.assertEqual(self.k7(), "LATENT")
        self.assertEqual(self.k7("ACCEPT"), "ACCEPT")
        owner = RC.evaluate(self.root, self.cfg, MANIFEST, "owner-triage", "--person", FIXTURE["signer"],
                            returned="ACCEPT")
        self.assertEqual(RC.nu(owner), "ACCEPT")
        self.assertEqual(self.printed("migrate")[-1], "# Nothing to migrate.")

class Versions(unittest.TestCase):
    """Which version each judged rubric moves to, from the catalog's answer alone."""

    def catalog(self, *subjects: str) -> dict:
        return {"line": [{"subject": s, "nu": "ACCEPT"} for s in ("byte_cap@1", "battery_complete@1", *subjects)],
                "skipped": [{"rubric": s, "reason": "malformed"} for s in subjects]}

    def test_a_template_store_moves_each_judged_rubric_to_v2(self):
        notes, moving = RC.migrations(self.catalog("k7_verdict@1", "owner_triage@1"), RC.pins({}))
        self.assertEqual((notes, moving), ([], {"k7": (2, "malformed"), "owner-triage": (2, "malformed")}))

    def test_a_store_already_past_v1_moves_to_the_version_after_its_last(self):
        """PipelineGate's case: k7_verdict@2 admitted from Markdown and pinned by a declaration moves to 3."""
        pinned = RC.pins({"rubric_versions": {"k7_verdict": 2}})
        notes, moving = RC.migrations(self.catalog("k7_verdict@1", "k7_verdict@2", "owner_triage@1"), pinned)
        self.assertEqual(moving, {"k7": (3, "malformed"), "owner-triage": (2, "malformed")})

    def test_a_pinned_version_that_reads_stays(self):
        catalog = self.catalog("k7_verdict@1", "owner_triage@1")
        catalog["line"] += [{"subject": "k7_verdict@2", "nu": "ACCEPT"}, {"subject": "owner_triage@2", "nu": "ACCEPT"}]
        notes, moving = RC.migrations(catalog, RC.pins({"rubric_versions": {"k7_verdict": 2, "owner_triage": 2}}))
        self.assertEqual((notes, moving), (["# k7_verdict@2 reads as a JSON spec",
                                            "# owner_triage@2 reads as a JSON spec"], {}))


class OlderFace(unittest.TestCase):
    def test_migrate_refuses_a_face_that_does_not_report_what_it_cannot_read(self):
        """The seal-1 face admits and reads any spec, so its catalog has no `skipped`: migrate would see nothing."""
        root = Path(tempfile.mkdtemp(prefix="mf5-"))
        self.addCleanup(shutil.rmtree, root, True)
        (root / "face.py").write_text('import json\nprint(json.dumps({"returned": "sha256:0", "line": []}))\n',
                                      encoding="utf-8")
        (root / ".metaframework").mkdir()
        (root / ".metaframework" / "project.json").write_text(json.dumps(
            {"pipelinegate_command": f'"{Path(sys.executable).as_posix()}" face.py --store s'}), encoding="utf-8")
        ran = subprocess.run([sys.executable, "-B", str(TOOLS / "receipts.py"), "--root", str(root), "migrate",
                              "--signer", "owner"], capture_output=True, timeout=60)
        self.assertEqual(ran.returncode, 1)
        self.assertIn("needs the seal-4 engine", ran.stderr.decode("utf-8"))


class FreshStore(Store):
    def test_setup_admits_the_json_specs_and_a_judged_act_writes_its_receipt(self):
        lines = self.printed("setup")
        self.assertTrue(any("--id k7_verdict --v 1 --spec governance/rubrics/k7_verdict.json" in ln for ln in lines))
        shutil.copyfile(plugin_template() / "governance" / "rubrics" / "battery_complete.py",
                        self.root / "governance" / "rubrics" / "battery_complete.py")
        self.sign(lines)
        self.assertEqual(self.k7(), "LATENT")
        self.assertEqual(self.printed("migrate")[-1], "# Nothing to migrate.")


@unittest.skipUnless(FACE.is_file(), "the plugin's pipelinegate skill is not beside this template; set PIPELINEGATE_FACE")
class JsonSpecs(unittest.TestCase):
    def test_each_json_spec_is_its_markdown_text_in_the_engines_canonical_form(self):
        sys.path.insert(0, str(FACE.parents[1] / "lib"))
        from pipelinegate.bodies import JudgedSpec
        from pipelinegate.canonical import encode
        for rid in SPECS:
            text = (plugin_template() / "governance" / "rubrics" / f"{rid}.md").read_bytes().decode("utf-8")
            data = (plugin_template() / "governance" / "rubrics" / f"{rid}.json").read_bytes()
            self.assertEqual(data, encode({"refusal_names": [], "text": text}), f"{rid}.json is stale: regenerate it")
            self.assertEqual(JudgedSpec.of(data).names, frozenset())


if __name__ == "__main__":
    unittest.main()
