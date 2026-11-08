#!/usr/bin/env python3
"""
run — a long run kept on disk, where a crash cannot lose it (2.8.0).

LedgerCore V2, 31 Oct 2026: a coordinator ran K7 round 18 in the background, the desktop app restarted at 9:20 PM and
lost track of the run, and the lead ended its turn with nothing watching. The verdict landed at 9:46 PM and sat unread
for three hours. A session's judgement does not survive a crash, so a long run starts here instead:

    python tools/run.py [--kind k7|seal-check|suite|other] [--label TEXT] [--timeout SECONDS] [--result PATH]
                        [--wait] -- COMMAND [ARG ...]
    python tools/run.py --list

  - The command runs under a supervisor started detached from the session's process tree (a new detached process
    group on Windows, setsid on POSIX), so a desktop crash or an app restart kills neither.
  - The supervisor keeps the run record, .metaframework/runs/<run_id>.json, rewrites its heartbeat every 30 seconds
    until the command exits, then writes the result. Nothing else writes the record, and every write is a temp file
    renamed over it. The command's output goes to .metaframework/runs/<run_id>.log.
  - One argument after -- that holds a space runs through the shell, as seal.py runs a declared command; more than one
    is the command's own argv.
  - Without --wait the launch prints where the record is and returns. With --wait it follows the log until the run ends
    and exits with the command's code; stopping it stops the following, never the run.
  - --list prints every run with the state a reader derives.

The record, schema 1 (Projects/StatusBoard reads it; keep the shape). The supervisor writes only running, completed
(exit 0) and failed:

    {"schema": 1, "run_id": "<yyyymmddTHHMMSSZ>-<kind>-<4 hex>", "build": "<repo folder name>", "kind": "k7"|
     "seal-check"|"suite"|"other", "label": "...", "cmd": [...], "pid": <child pid>, "launcher_pid": <supervisor pid>,
     "started": "<ISO-8601 UTC>", "heartbeat": "<ISO-8601 UTC>", "timeout_s": <int>, "log_path": "<repo-relative>",
     "result_path": "<repo-relative or null>", "launched_by": "<Claude session id or null>", "state": "running"|
     "completed"|"failed", "exit_code": <int or null>, "ended": "<ISO-8601 UTC or null>"}

A reader derives two more states and writes nothing: interrupted (running, the heartbeat older than 120 s, and the
launcher not alive) and stalled (running, the heartbeat fresh, and past timeout_s or the log unchanged for 15 minutes).
state.py's hooks print each run whose state a session has not seen yet; tools/gate_reach.py refuses k7-run.py, seal.py
check and the declared full suite (test_command) started any other way (unwrapped, below).

Exit: 0 started, or with --wait the command exited 0; 1 the run could not start, or with --wait it failed or was
interrupted; 2 a bad call.
"""

import argparse
import json
import os
import re
import secrets
import shlex
import subprocess
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = 1
RUNS = ".metaframework/runs"
SEEN = ".metaframework/runs/seen"          # each session's last look at the runs (state.py's hooks); not a run record
KINDS = ("k7", "seal-check", "suite", "other")
TERMINAL = ("completed", "failed")
HEARTBEAT_S = 30
STALE_S = 120
QUIET_S = 15 * 60
DEFAULT_TIMEOUT_S = 4 * 3600
RECENT_S = 24 * 3600                       # a session's first look shows the runs that ended within this
STAMP = "%Y-%m-%dT%H:%M:%SZ"
# Windows process creation flags (subprocess names them only on Windows).
DETACHED_PROCESS, CREATE_NEW_PROCESS_GROUP = 0x00000008, 0x00000200
CREATE_BREAKAWAY_FROM_JOB, CREATE_NO_WINDOW = 0x01000000, 0x08000000
# What the gate refuses unless it starts here: (the script's file name, its subcommand or '', what it is, its kind).
LONG_RUNS = (("k7-run.py", "", "tools/k7-run.py", "k7"), ("seal.py", "check", "tools/seal.py check", "seal-check"))
INTERPRETER = re.compile(r"^(?:python(?:\d+(?:\.\d+)*)?w?|py)(?:\.exe)?$", re.I)
VALUED_OPTIONS = ("-X", "-W", "--root")


# --------------------------------------------------------------------------- the record

def utc(t: float | None = None) -> str:
    return datetime.fromtimestamp(time.time() if t is None else t, timezone.utc).strftime(STAMP)


def seconds(stamp) -> float | None:
    """An ISO-8601 UTC stamp as epoch seconds; None for anything else."""
    try:
        return datetime.strptime(stamp, STAMP).replace(tzinfo=timezone.utc).timestamp()
    except (TypeError, ValueError):
        return None


def record_path(root: Path, run_id: str) -> Path:
    return root / RUNS / f"{run_id}.json"


def read_record(path: Path) -> dict | None:
    try:
        rec = json.loads(path.read_bytes().decode("utf-8"))
    except (OSError, ValueError):
        return None
    return rec if isinstance(rec, dict) and rec.get("run_id") else None


def write_record(root: Path, rec: dict, tries: int = 40) -> bool:
    """Write the record atomically: a temp file renamed over it. On Windows a reader (or a sync client) holding the
    record open makes the rename fail for a moment, so it is retried; False when it never went through."""
    path = record_path(root, rec["run_id"])
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f"{path.name}.{os.getpid()}.tmp")
    tmp.write_bytes((json.dumps(rec, indent=2) + "\n").encode("utf-8"))
    for _ in range(tries):
        try:
            os.replace(tmp, path)
            return True
        except PermissionError:
            time.sleep(0.25)
    return False


def records(root: Path) -> list[dict]:
    """Every readable run record, oldest first."""
    found = (read_record(p) for p in (root / RUNS).glob("*.json"))
    return sorted((r for r in found if r), key=lambda r: (r.get("started") or "", r["run_id"]))


# --------------------------------------------------------------------------- what a reader derives

def _alive_nt(pid: int) -> bool:
    import ctypes
    from ctypes import wintypes
    k32 = ctypes.WinDLL("kernel32", use_last_error=True)
    handle = k32.OpenProcess(0x1000, False, pid)              # PROCESS_QUERY_LIMITED_INFORMATION
    if not handle:
        return ctypes.get_last_error() == 5                   # access denied: it exists, it is not ours
    code = wintypes.DWORD()
    try:
        return bool(k32.GetExitCodeProcess(handle, ctypes.byref(code))) and code.value == 259    # STILL_ACTIVE
    finally:
        k32.CloseHandle(handle)


def alive(pid) -> bool:
    """Is process `pid` running?"""
    if not isinstance(pid, int) or isinstance(pid, bool) or pid <= 0:
        return False
    if os.name == "nt":
        return _alive_nt(pid)
    try:
        os.kill(pid, 0)
    except PermissionError:
        return True
    except OSError:
        return False
    return True


def overdue(root: Path, rec: dict, now: float) -> bool:
    """Past its timeout, or its log unchanged for 15 minutes."""
    started, timeout = seconds(rec.get("started")), rec.get("timeout_s")
    if started is not None and isinstance(timeout, int) and now - started > timeout:
        return True
    try:
        return now - (root / (rec.get("log_path") or "")).stat().st_mtime > QUIET_S
    except OSError:
        return False


def derived(root: Path, rec: dict, now: float | None = None) -> str:
    """The run's state as a reader reads it: the record's own, or interrupted or stalled (schema 1)."""
    if rec.get("state") != "running":
        return rec.get("state") or "unknown"
    now = time.time() if now is None else now
    beat = seconds(rec.get("heartbeat"))
    if beat is None or now - beat > STALE_S:
        return "running" if alive(rec.get("launcher_pid")) else "interrupted"
    return "stalled" if overdue(root, rec, now) else "running"


def when(stamp) -> str:
    """A record's stamp, with the local time beside it."""
    t = seconds(stamp)
    return f"{stamp} ({datetime.fromtimestamp(t).strftime('%H:%M')} local)" if t is not None else "(unknown)"


STATE_WORDS = {
    "running": lambda r: f"running since {when(r.get('started'))}",
    "completed": lambda r: f"completed at {when(r.get('ended'))}, exit 0",
    "failed": lambda r: f"FAILED at {when(r.get('ended'))}, exit {r.get('exit_code')}",
    "interrupted": lambda r: (f"INTERRUPTED: last heartbeat {when(r.get('heartbeat'))} and its supervisor is gone; the "
                              f"command may not have finished. Read the log, then start it again through tools/run.py"),
    "stalled": lambda r: (f"STALLED: started {when(r.get('started'))}, past its {r.get('timeout_s')} s timeout or its "
                          f"log quiet for 15 minutes; read the log"),
}


def describe(rec: dict, state: str) -> str:
    """One line for a run: what it is, its state with the time, and where its log and result are."""
    said = STATE_WORDS.get(state, lambda r: state)(rec)
    result = f"; result {rec['result_path']}" if rec.get("result_path") else ""
    return f"{rec.get('label') or rec.get('kind')} ({rec['run_id']}): {said}; log {rec.get('log_path')}{result}"


def seen_path(root: Path, session: str) -> Path:
    return root / SEEN / (re.sub(r"[^\w.-]", "_", session or "unknown") + ".json")


def first_look(rec: dict, state: str, now: float) -> bool:
    """A session that has seen nothing is shown every run still going, and every run that ended in the last day."""
    ended = seconds(rec.get("ended"))
    return state not in TERMINAL or ended is None or now - ended <= RECENT_S


def changes(root: Path, session: str) -> list[str]:
    """Each run whose state this session has not seen, described; the session has now seen every run."""
    path, now = seen_path(root, session), time.time()
    last = read_json(path)
    states = {r["run_id"]: (r, derived(root, r, now)) for r in records(root)}
    out = [describe(r, st) for rid, (r, st) in states.items()
           if (first_look(r, st, now) if last is None else last.get(rid) != st)]
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(json.dumps({rid: st for rid, (_, st) in states.items()}).encode("utf-8"))
    except OSError:
        pass
    return out


def still_running(root: Path) -> list[str]:
    """Every run a reader reads as running or stalled, described."""
    now = time.time()
    return [describe(r, st) for r in records(root) if (st := derived(root, r, now)) in ("running", "stalled")]


def read_json(path: Path) -> dict | None:
    try:
        data = json.loads(path.read_bytes().decode("utf-8"))
    except (OSError, ValueError):
        return None
    return data if isinstance(data, dict) else None


# --------------------------------------------------------------------------- what the gate refuses

def words(text: str) -> list[str]:
    """A simple command's words, unquoted; split on blanks when its quotes do not balance."""
    try:
        return shlex.split(text, posix=True)
    except ValueError:
        return text.split()


def base(word: str) -> str:
    return word.replace("\\", "/").rsplit("/", 1)[-1].lower()


def after_prefix(ws: list[str]) -> int:
    """Where the program starts: past VAR=value assignments, env, PowerShell's call operator and cmd's call."""
    i = 0
    while i < len(ws) and (re.match(r"^\w+=", ws[i]) or base(ws[i]) in ("env", "&", "call")):
        i += 1
    return i


def script_at(ws: list[str], i: int) -> int:
    """The index of the script an interpreter at ws[i] runs, past its options; -1 for -m, -c or none."""
    i += 1
    while i < len(ws) and ws[i].startswith("-"):
        if ws[i] in ("-m", "-c"):
            return -1
        i += 2 if ws[i] in VALUED_OPTIONS else 1
    return i if i < len(ws) else -1


def script_of(ws: list[str]) -> tuple[str, list[str]]:
    """(the file name of the Python script a simple command runs, its arguments); ('', []) when it runs none."""
    i = after_prefix(ws)
    if i < len(ws) and INTERPRETER.match(base(ws[i])):
        i = script_at(ws, i)
    elif i < len(ws) and not base(ws[i]).endswith(".py"):
        i = -1
    return (base(ws[i]), ws[i + 1:]) if 0 <= i < len(ws) else ("", [])


def positionals(args: list[str]) -> list[str]:
    out, skip = [], False
    for a in args:
        if skip or a.startswith("-"):
            skip = not skip and a in VALUED_OPTIONS
            continue
        out.append(a)
    return out


def long_run(ws: list[str]) -> tuple[str, str]:
    """(what it is, its kind) when the words run k7-run.py or seal.py check; ('', '') otherwise."""
    script, args = script_of(ws)
    for name, sub, what, kind in LONG_RUNS:
        if script == name and (not sub or positionals(args)[:1] == [sub]):
            return what, kind
    return "", ""


def full_suite(ws: list[str], suite: list[str]) -> bool:
    """The declared test_command's words, followed by options only: the whole suite, however many flags it takes."""
    return bool(suite) and ws[:len(suite)] == suite and all(w.startswith("-") for w in ws[len(suite):])


def hit_in(ws: list[str], suite: list[str]) -> tuple[str, str]:
    """A long run these words start, or one a quoted argument holds (bash -c "...", powershell -Command "...")."""
    for cand in [ws] + [words(w) for w in ws[1:] if " " in w]:
        what, kind = long_run(cand)
        if what:
            return what, kind
        if full_suite(cand, suite):
            return "the full suite (test_command)", "suite"
    return "", ""


def unwrapped(segments: list[str], test_command: str | None, split) -> tuple[str, str, str]:
    """(what it is, its kind, the simple command) for the first long run among `segments` that does not start through
    tools/run.py; ('', '', '') when there is none. `split` cuts a command into its simple commands, as the gate does:
    a declared test_command with && in it is matched on its last one, the runner."""
    suite = words(split(test_command)[-1]) if test_command and split(test_command) else []
    for seg in segments:
        ws = words(seg)
        script, args = script_of(ws)
        if script == "run.py" and "--" in args:
            continue
        what, kind = hit_in(ws, suite)
        if what:
            return what, kind, seg
    return "", "", ""


# --------------------------------------------------------------------------- the supervisor

def start_child(cmd: list[str], root: Path, out) -> subprocess.Popen:
    """The command, its output into the log; through the shell when it is one argument with a space in it."""
    shell = len(cmd) == 1 and " " in cmd[0]
    return subprocess.Popen(cmd[0] if shell else cmd, shell=shell, cwd=str(root), stdin=subprocess.DEVNULL,
                            stdout=out, stderr=subprocess.STDOUT,
                            creationflags=CREATE_NO_WINDOW if os.name == "nt" else 0)


def new_record(root: Path, a: argparse.Namespace) -> dict:
    return {"schema": SCHEMA, "run_id": a.supervise, "build": root.name, "kind": a.kind, "label": a.label,
            "cmd": list(a.command), "pid": None, "launcher_pid": os.getpid(), "started": utc(), "heartbeat": utc(),
            "timeout_s": a.timeout, "log_path": f"{RUNS}/{a.supervise}.log", "result_path": a.result or None,
            "launched_by": a.launched_by or None, "state": "running", "exit_code": None, "ended": None}


def beat_until_exit(root: Path, rec: dict, child: subprocess.Popen) -> int:
    """Wait for the command, rewriting the heartbeat every 30 seconds; its exit code."""
    while True:
        try:
            return child.wait(timeout=HEARTBEAT_S)
        except subprocess.TimeoutExpired:
            rec["heartbeat"] = utc()
            write_record(root, rec)


def finish(root: Path, rec: dict, code: int | None) -> int:
    rec.update(state="completed" if code == 0 else "failed", exit_code=code, heartbeat=utc(), ended=utc())
    deadline = time.time() + 300
    while not write_record(root, rec) and time.time() < deadline:
        time.sleep(1)
    return 0 if code == 0 else 1


def supervise(root: Path, a: argparse.Namespace) -> int:
    """The detached half: start the command, keep its record until it exits, write the result."""
    rec = new_record(root, a)
    log = root / rec["log_path"]
    log.parent.mkdir(parents=True, exist_ok=True)
    with log.open("ab") as out:
        try:
            child = start_child(rec["cmd"], root, out)
        except OSError as exc:
            out.write(f"run: could not start {shlex.join(rec['cmd'])}: {exc}\n".encode("utf-8"))
            return finish(root, rec, None)
        rec["pid"] = child.pid
        write_record(root, rec)
        try:
            code = beat_until_exit(root, rec, child)
        except Exception:                                   # noqa: BLE001 - the record must still be closed
            out.write(traceback.format_exc().encode("utf-8"))
            code = None
    return finish(root, rec, code)


# --------------------------------------------------------------------------- the launch

def spawn_detached(argv: list[str], root: Path) -> subprocess.Popen:
    """The supervisor, in a process tree of its own. Windows: a detached process group, out of the session's job
    where the job allows it; POSIX: a session of its own (setsid)."""
    common = dict(cwd=str(root), stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                  close_fds=True)
    if os.name != "nt":
        return subprocess.Popen(argv, start_new_session=True, **common)
    try:
        return subprocess.Popen(argv, creationflags=DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP |
                                CREATE_BREAKAWAY_FROM_JOB, **common)
    except OSError:                                         # a job that forbids breaking away
        return subprocess.Popen(argv, creationflags=DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP, **common)


def supervisor_argv(a: argparse.Namespace, run_id: str) -> list[str]:
    flags = ["--supervise", run_id, "--kind", a.kind, "--label", a.label, "--timeout", str(a.timeout),
             "--launched-by", os.environ.get("CLAUDE_CODE_SESSION_ID") or ""]
    return [sys.executable, str(Path(__file__).resolve()), *flags, *(["--result", a.result] if a.result else []),
            "--", *a.command]


def await_record(root: Path, run_id: str, proc: subprocess.Popen, wait_s: float = 20) -> dict | None:
    """The record once the supervisor has written it; None if it exits or times out first."""
    deadline = time.time() + wait_s
    while time.time() < deadline:
        rec = read_record(record_path(root, run_id))
        if rec and (rec.get("pid") is not None or rec.get("state") != "running"):
            return rec
        if proc.poll() is not None and not rec:
            return None
        time.sleep(0.2)
    return read_record(record_path(root, run_id))


def echo_log(path: Path, pos: int) -> int:
    """Print what the log gained since `pos`; the new position."""
    try:
        with path.open("rb") as f:
            f.seek(pos)
            data = f.read()
    except OSError:
        return pos
    if data:
        sys.stdout.write(data.decode("utf-8", errors="replace"))
        sys.stdout.flush()
    return pos + len(data)


def follow(root: Path, run_id: str) -> int:
    """--wait: the log as it grows, until the run ends; the command's code (1 when it failed or was interrupted)."""
    pos = 0
    while True:
        rec = read_record(record_path(root, run_id)) or {"run_id": run_id, "state": "unknown"}
        pos = echo_log(root / (rec.get("log_path") or f"{RUNS}/{run_id}.log"), pos)
        state = derived(root, rec)
        if state in TERMINAL + ("interrupted", "unknown"):
            print(f"run: {describe(rec, state)}")
            return 0 if state == "completed" else 1
        time.sleep(2)


def repo_relative(root: Path, path: str) -> str:
    """`path` relative to the repo, as the record holds it; refused when it lies outside."""
    p = Path(path)
    try:
        return (p if p.is_absolute() else root / p).resolve().relative_to(root).as_posix()
    except ValueError:
        raise SystemExit(f"run: --result {path} is outside the repo") from None


def launch(root: Path, a: argparse.Namespace) -> int:
    if not a.command:
        return say("run: nothing to run; put the command after --", 2)
    if a.result:
        a.result = repo_relative(root, a.result)
    run_id = f"{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}-{a.kind}-{secrets.token_hex(2)}"
    try:
        proc = spawn_detached(supervisor_argv(a, run_id), root)
    except OSError as exc:
        return say(f"run: the supervisor could not start ({exc})", 1)
    rec = await_record(root, run_id, proc)
    if rec is None:
        return say(f"run: the supervisor for {run_id} wrote no record; nothing was started", 1)
    print(f"run: {run_id} started, detached ({a.kind}{': ' + a.label if a.label else ''}). Record "
          f"{RUNS}/{run_id}.json, log {rec.get('log_path')}. Every session's hooks print it when it lands.")
    return follow(root, run_id) if a.wait else 0


def say(msg: str, code: int) -> int:
    print(msg, file=sys.stderr)
    return code


def show(root: Path) -> int:
    now = time.time()
    for rec in records(root):
        print(describe(rec, derived(root, rec, now)))
    return 0


def parse(argv: list[str]) -> argparse.Namespace:
    command = argv[argv.index("--") + 1:] if "--" in argv else []
    own = argv[:argv.index("--")] if "--" in argv else argv
    ap = argparse.ArgumentParser(description="start a long run detached, its record on disk (2.8.0)")
    ap.add_argument("--kind", choices=KINDS, default="other")
    ap.add_argument("--label", default="")
    ap.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT_S, help="seconds before a reader calls it stalled")
    ap.add_argument("--result", default="", help="the file the command writes its result to, repo-relative")
    ap.add_argument("--wait", action="store_true", help="follow the log until the run ends")
    ap.add_argument("--list", action="store_true", help="print every run with its derived state")
    ap.add_argument("--supervise", default="", help=argparse.SUPPRESS)
    ap.add_argument("--launched-by", default="", help=argparse.SUPPRESS)
    a = ap.parse_args(own)
    a.command = command
    return a


def main() -> int:
    a = parse(sys.argv[1:])
    root = Path(__file__).resolve().parents[1]
    if a.list:
        return show(root)
    if a.supervise:
        return supervise(root, a)
    return launch(root, a)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
