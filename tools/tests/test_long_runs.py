"""2.8.0 (roster v0.14, RD-35): long runs are gated.

LedgerCore V2's K7 round 18 ran in the background of a session, the app restarted and lost it, and its verdict sat
unread for three hours. tools/run.py starts a long run detached, keeps its record on disk (schema 1) with a heartbeat,
and writes the result; readers derive interrupted and stalled; the gate refuses k7-run.py, seal.py check and the full
suite started any other way; state.py's hooks print each run's change of state to every session and log turn ends.

Run from the repository root: python -m unittest discover -s tools/tests
"""
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

from test_gate_reach import Reach21

TOOLS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS))
import run as RUN  # noqa: E402
from gate_reach import segments  # noqa: E402

SCHEMA_KEYS = {"schema", "run_id", "build", "kind", "label", "cmd", "pid", "launcher_pid", "started", "heartbeat",
               "timeout_s", "log_path", "result_path", "launched_by", "state", "exit_code", "ended"}


class Build(unittest.TestCase):
    """A throwaway build holding this checkout's run.py and state.py."""

    def setUp(self) -> None:
        self.root = Path(tempfile.mkdtemp(prefix="mf-runs "))
        self.addCleanup(shutil.rmtree, self.root, True)
        (self.root / "tools").mkdir()
        for tool in ("run.py", "state.py", "reopen.py"):
            shutil.copy(TOOLS / tool, self.root / "tools" / tool)

    def launch(self, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run([sys.executable, str(self.root / "tools" / "run.py"), *args], capture_output=True,
                              encoding="utf-8", errors="replace", timeout=120, cwd=str(self.root))

    def records(self) -> list[dict]:
        return RUN.records(self.root)

    def record(self, **fields) -> dict:
        """A record as the supervisor writes it, written to this build; the fields given replace the defaults."""
        rec = {"schema": 1, "run_id": fields.pop("run_id", "20261031T040000Z-k7-abcd"), "build": self.root.name,
               "kind": "k7", "label": "K7 final", "cmd": ["python", "tools/k7-run.py", "--final"], "pid": 1,
               "launcher_pid": os.getpid(), "started": RUN.utc(), "heartbeat": RUN.utc(), "timeout_s": 3600,
               "log_path": ".metaframework/runs/x.log", "result_path": None, "launched_by": None, "state": "running",
               "exit_code": None, "ended": None, **fields}
        self.assertTrue(RUN.write_record(self.root, rec))
        return rec


class Launch(Build):
    """The launch: detached, the record written by the supervisor alone, the result at the end."""

    def test_a_run_keeps_its_record_and_its_result(self) -> None:
        done = self.launch("--kind", "suite", "--label", "the suite", "--wait", "--", sys.executable, "-c",
                           "print('ran Φ'.encode('ascii', 'replace').decode())")
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertIn("ran", done.stdout)
        [rec] = self.records()
        self.assertEqual(set(rec), SCHEMA_KEYS)
        self.assertRegex(rec["run_id"], r"^\d{8}T\d{6}Z-suite-[0-9a-f]{4}$")
        self.assertEqual((rec["schema"], rec["build"], rec["kind"], rec["state"], rec["exit_code"]),
                         (1, self.root.name, "suite", "completed", 0))
        self.assertNotEqual(rec["launcher_pid"], os.getpid(), "the supervisor is a process of its own")
        self.assertTrue((self.root / rec["log_path"]).is_file())
        self.assertIsNotNone(rec["ended"])
        self.assertEqual(list((self.root / RUN.RUNS).glob("*.tmp")), [], "every write was renamed over the record")

    def test_a_failed_command_is_failed_with_its_code(self) -> None:
        done = self.launch("--kind", "other", "--wait", "--result", "INSTRUMENTS/out.json", "--", sys.executable, "-c",
                           "import sys; sys.exit(3)")
        self.assertEqual(done.returncode, 1)
        [rec] = self.records()
        self.assertEqual((rec["state"], rec["exit_code"], rec["result_path"]), ("failed", 3, "INSTRUMENTS/out.json"))

    def test_one_argument_with_a_space_runs_through_the_shell(self) -> None:
        done = self.launch("--wait", "--", "echo one && echo two")
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertIn("two", done.stdout)

    def test_without_wait_the_launch_returns_and_the_run_lands_on_its_own(self) -> None:
        started = self.launch("--kind", "k7", "--", sys.executable, "-c", "import time; time.sleep(2)")
        self.assertEqual(started.returncode, 0, started.stderr)
        self.assertIn("started, detached", started.stdout)
        deadline = time.time() + 60
        while self.records()[0]["state"] == "running" and time.time() < deadline:
            time.sleep(0.5)
        self.assertEqual(self.records()[0]["state"], "completed")

    def test_nothing_after_the_separator_is_a_bad_call(self) -> None:
        self.assertEqual(self.launch("--kind", "k7").returncode, 2)


class Derived(Build):
    """What a reader works out, writing nothing (schema 1)."""

    def gone(self) -> int:
        """The pid of a process that has exited."""
        p = subprocess.Popen([sys.executable, "-c", "pass"])
        p.wait()
        return p.pid

    def test_a_stale_heartbeat_with_its_supervisor_gone_is_interrupted(self) -> None:
        rec = self.record(heartbeat=RUN.utc(time.time() - 600), launcher_pid=self.gone())
        self.assertEqual(RUN.derived(self.root, rec), "interrupted")
        self.assertEqual(RUN.read_record(RUN.record_path(self.root, rec["run_id"]))["state"], "running")

    def test_a_stale_heartbeat_with_its_supervisor_alive_is_still_running(self) -> None:
        rec = self.record(heartbeat=RUN.utc(time.time() - 600))
        self.assertEqual(RUN.derived(self.root, rec), "running")

    def test_past_its_timeout_or_a_quiet_log_is_stalled(self) -> None:
        log = self.root / ".metaframework" / "runs" / "x.log"
        log.parent.mkdir(parents=True)
        log.write_text("out\n", encoding="utf-8")
        self.assertEqual(RUN.derived(self.root, self.record()), "running")
        self.assertEqual(RUN.derived(self.root, self.record(started=RUN.utc(time.time() - 7200))), "stalled")
        os.utime(log, (time.time() - 1000, time.time() - 1000))
        self.assertEqual(RUN.derived(self.root, self.record()), "stalled")

    def test_an_ended_run_is_its_own_state(self) -> None:
        self.assertEqual(RUN.derived(self.root, self.record(state="failed", exit_code=1, ended=RUN.utc())), "failed")


class Unwrapped(unittest.TestCase):
    """Which simple commands are long runs started outside tools/run.py."""

    SUITE = "python -m unittest discover -s tests"

    def hit(self, command: str, suite: str | None = SUITE) -> str:
        return RUN.unwrapped(segments(command), suite, segments)[0]

    def test_the_three_long_runs_are_named(self) -> None:
        for command, what in (("python tools/k7-run.py --final", "tools/k7-run.py"),
                              ("cd x && py -3 tools/k7-run.py --checkpoint", "tools/k7-run.py"),
                              ("python3 tools/seal.py check --json", "tools/seal.py check"),
                              ("& python tools/seal.py --root . check", "tools/seal.py check"),
                              (self.SUITE, "the full suite (test_command)"),
                              (self.SUITE + " -v", "the full suite (test_command)"),
                              (f'bash -c "{self.SUITE}"', "the full suite (test_command)")):
            with self.subTest(command=command):
                self.assertEqual(self.hit(command), what)

    def test_reads_scoped_runs_and_wrapped_runs_pass(self) -> None:
        for command in ("grep -n round tools/k7-run.py", "python tools/seal.py apply --approved-by x",
                        "python -m unittest tests.test_one", "python tools/run.py --kind k7 -- python tools/k7-run.py",
                        f"python tools/run.py --kind suite -- {self.SUITE}", "python tools/run.py --list"):
            with self.subTest(command=command):
                self.assertEqual(self.hit(command), "")

    def test_a_suite_with_an_and_in_it_is_matched_on_its_runner(self) -> None:
        self.assertEqual(self.hit("cd web && npx vitest run", "cd web && npx vitest run"),
                         "the full suite (test_command)")
        self.assertEqual(self.hit("cd web && npx vitest run src/a.test.ts", "cd web && npx vitest run"), "")


class GateRefusesUnwrapped(Reach21):
    """The gate's rule, end to end: refused with the run.py command to use instead; wrapped, allowed."""

    def test_long_runs_start_through_run_py(self) -> None:
        cfg_path = self.root / ".metaframework" / "project.json"
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
        cfg_path.write_text(json.dumps({**cfg, "test_command": "python -m unittest discover -s tests"}),
                            encoding="utf-8")
        self.each_denied(["python tools/k7-run.py --final"], "long run", "tools/run.py --kind k7")
        self.each_denied(["python tools/seal.py check"], "--kind seal-check", tool="PowerShell")
        self.each_denied(["python -m unittest discover -s tests"], "--kind suite")
        self.each_allowed(['python tools/run.py --kind k7 --label "K7 final" -- python tools/k7-run.py --final',
                           "python -m unittest tests.test_one", "python tools/seal.py list"])


class Hooks(Build):
    """state.py's hooks: each run's change of state printed once to each session; a line per turn end."""

    def hook(self, event: str, session: str) -> subprocess.CompletedProcess:
        payload = {"session_id": session, "hook_event_name": event, "source": "startup"}
        env = {**os.environ, "CLAUDE_PROJECT_DIR": str(self.root)}
        sub = {"SessionStart": "hook-session-start", "UserPromptSubmit": "hook-prompt", "Stop": "hook-stop",
               "SubagentStop": "hook-subagent-stop"}[event]
        return subprocess.run([sys.executable, "-B", str(self.root / "tools" / "state.py"), sub], capture_output=True,
                              input=json.dumps(payload).encode("utf-8"), env=env, timeout=120)

    def context(self, ran: subprocess.CompletedProcess) -> str:
        self.assertEqual(ran.returncode, 0, ran.stderr)
        out = ran.stdout.decode("utf-8")
        return json.loads(out)["hookSpecificOutput"]["additionalContext"] if out.strip() else ""

    def test_a_prompt_hears_of_each_change_once(self) -> None:
        self.record(run_id="20261031T040000Z-k7-0001")
        first = self.context(self.hook("UserPromptSubmit", "s1"))
        self.assertIn("K7 final (20261031T040000Z-k7-0001): running since", first)
        self.assertEqual(self.context(self.hook("UserPromptSubmit", "s1")), "", "seen: nothing to say")
        self.record(run_id="20261031T040000Z-k7-0001", state="completed", exit_code=0, ended=RUN.utc())
        self.assertIn("completed at", self.context(self.hook("UserPromptSubmit", "s1")))
        self.assertIn("completed at", self.context(self.hook("UserPromptSubmit", "s2")), "each session hears it")

    def test_a_session_start_names_the_runs_still_going(self) -> None:
        self.record(run_id="20261031T040000Z-suite-0002", kind="suite", label="the suite")
        self.context(self.hook("UserPromptSubmit", "s1"))
        started = self.context(self.hook("SessionStart", "s1"))
        self.assertIn("RUNS still going:", started)
        self.assertIn("the suite", started)

    def test_an_old_run_is_not_news_to_a_new_session(self) -> None:
        self.record(run_id="20261020T040000Z-suite-0003", state="completed", exit_code=0,
                    ended=RUN.utc(time.time() - 3 * 86400))
        self.assertEqual(self.context(self.hook("UserPromptSubmit", "s9")), "")

    def test_each_turn_end_is_one_line(self) -> None:
        self.assertEqual(self.hook("Stop", "lead-1").returncode, 0)
        self.assertEqual(self.hook("SubagentStop", "lead-1").returncode, 0)
        lines = [json.loads(x) for x in (self.root / ".metaframework" / "session-events.jsonl")
                 .read_text(encoding="utf-8").splitlines()]
        self.assertEqual([(x["agent"], x["event"], x["session_id"], x["schema"]) for x in lines],
                         [("lead", "turn_end", "lead-1", 1), ("subagent", "turn_end", "lead-1", 1)])
        self.assertEqual(set(lines[0]), {"schema", "time", "session_id", "agent", "event"})
        self.assertRegex(lines[0]["time"], r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$")


class Utf8Output(Build):
    """2.8.0: every template tool writes stdout and stderr as UTF-8. LedgerCore V2's seal.py check died on 'Φ' in
    print_sweep under cp1252 after every step had run (31 Oct 2026)."""

    def test_every_tool_with_an_entry_point_writes_utf8(self) -> None:
        for tool in sorted(TOOLS.glob("*.py")):
            text = tool.read_text(encoding="utf-8")
            if 'if __name__ == "__main__":' not in text:
                continue
            main = text.split('if __name__ == "__main__":', 1)[1]
            with self.subTest(tool=tool.name):
                self.assertIn('sys.stdout.reconfigure(encoding="utf-8"', main)
                self.assertIn('sys.stderr.reconfigure(encoding="utf-8"', main)

    def test_a_symbol_prints_to_a_pipe_in_the_windows_code_page(self) -> None:
        self.record(label="K7 final Φ ρ", state="completed", exit_code=0, ended=RUN.utc())
        env = {k: v for k, v in os.environ.items() if k not in ("PYTHONIOENCODING", "PYTHONUTF8")}
        ran = subprocess.run([sys.executable, str(self.root / "tools" / "run.py"), "--list"], capture_output=True,
                             env={**env, "PYTHONUTF8": "0"}, timeout=60)
        self.assertEqual(ran.returncode, 0, ran.stderr)
        self.assertIn("K7 final Φ ρ", ran.stdout.decode("utf-8"))


class Settings(unittest.TestCase):
    """The template wires the hooks and ignores what they write."""

    def test_the_hooks_are_wired_and_their_files_ignored(self) -> None:
        template = TOOLS.parent
        hooks = json.loads((template / ".claude" / "settings.json").read_text(encoding="utf-8"))["hooks"]
        for event, sub in (("SessionStart", "hook-session-start"), ("UserPromptSubmit", "hook-prompt"),
                           ("Stop", "hook-stop"), ("SubagentStop", "hook-subagent-stop")):
            with self.subTest(event=event):
                [entry] = hooks[event]
                self.assertNotIn("matcher", entry, "every source")
                self.assertTrue(entry["hooks"][0]["command"].endswith(f"tools/state.py\" {sub}"))
        ignored = (template / ".gitignore").read_text(encoding="utf-8").splitlines()
        self.assertIn(".metaframework/runs/", ignored)
        self.assertIn(".metaframework/session-events.jsonl", ignored)


if __name__ == "__main__":
    unittest.main()
