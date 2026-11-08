#!/usr/bin/env python3
"""
state — the session's memory, on disk.

STATE.json holds what a fresh session needs to know and cannot reconstruct:
phase, branch, current module, K7 round, last gate tag, next action, blocker.
Nothing here is derived at read time. Derivation is where variance enters; this
file is read, never re-inferred.

Subcommands:
    show                      print STATE.json
    render                    human-readable block (what the hooks inject)
    refresh                   update git-derived fields, preserve intent fields
    set k=v [k=v ...]         set intent fields (next_action, blocked_on, ...). Setting current_module
                              starts a build step, and is refused while phase4-checks.py gates fails
    hook-session-start        SessionStart hook: inject state, and the gate install's state, into the session; and
                              (2.8.0) the runs tools/run.py keeps whose state this session has not seen, and those
                              still going
    hook-prompt               UserPromptSubmit hook (2.8.0): the runs whose state this session has not seen
    hook-stop                 Stop hook (2.8.0): a turn_end line for the lead in .metaframework/session-events.jsonl
    hook-subagent-stop        SubagentStop hook (2.8.0): the same line for a sub-agent
    hook-precompact           PreCompact hook: checkpoint before context loss

Install in .claude/settings.json:

    {"hooks": {
      "SessionStart": [{"hooks": [{"type": "command",
        "command": "python3 \"$CLAUDE_PROJECT_DIR/tools/state.py\" hook-session-start"}]}],
      "PreCompact":   [{"hooks": [{"type": "command",
        "command": "python3 \"$CLAUDE_PROJECT_DIR/tools/state.py\" hook-precompact"}]}]}}

The template's settings also run hook-prompt (UserPromptSubmit), hook-stop (Stop) and hook-subagent-stop
(SubagentStop). A SessionStart hook with no matcher runs on every source: startup, resume, clear and compact. The run
and turn hooks never block: a Stop or UserPromptSubmit hook that exits 2 would hold the session, so each answers 0.
The session events (schema 1, read by Projects/StatusBoard) are one line per turn end:
    {"schema": 1, "time": "<ISO UTC>", "session_id": "...", "agent": "lead"|"subagent", "event": "turn_end"}

Checkpoint and re-read. Never re-derive.
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

GIT_FIELDS = ("branch", "head", "tree", "dirty", "k7_round", "last_gate_tag", "seal_tag", "reopened")
INTENT_FIELDS = ("phase", "concept", "current_module", "next_action", "blocked_on")
EVENTS = ".metaframework/session-events.jsonl"      # one line per turn end (2.8.0); gitignored

TEMPLATE = {
    "schema_version": "1.0", "concept": "", "phase": 4,
    "branch": "", "head": "", "tree": "", "dirty": False,
    "current_module": "", "k7_round": 0, "last_gate_tag": "", "seal_tag": "", "reopened": "",
    "next_action": "", "blocked_on": None,
    "updated_at": "", "updated_by": "",
}


def write_text_kept(path: Path, text: str) -> None:
    """Write text as UTF-8 bytes. Text mode would turn every \\n into \\r\\n on Windows (F7, the Frame Gate trial),
    so this writes LF, or CRLF only where the file being rewritten already uses it."""
    crlf = path.is_file() and b"\r\n" in path.read_bytes()
    path.write_bytes(text.replace("\r\n", "\n").replace("\n", "\r\n" if crlf else "\n").encode("utf-8"))


def git(root: Path, *a: str) -> str:
    try:
        r = subprocess.run(["git", "-C", str(root), *a],
                           capture_output=True, encoding="utf-8", errors="replace", timeout=15)
        return r.stdout.strip() if r.returncode == 0 else ""
    except (OSError, subprocess.SubprocessError):
        return ""


def load(root: Path) -> dict:
    p = root / "STATE.json"
    try:
        return {**TEMPLATE, **json.loads(p.read_text(encoding="utf-8"))}
    except (OSError, json.JSONDecodeError):
        return dict(TEMPLATE)


def save(root: Path, st: dict, by: str) -> None:
    st["updated_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    st["updated_by"] = by
    write_text_kept(root / "STATE.json", json.dumps(st, indent=2) + "\n")


def refresh(root: Path, st: dict) -> dict:
    """Update only what git knows. Intent fields are never guessed."""
    st["branch"] = git(root, "rev-parse", "--abbrev-ref", "HEAD")
    st["head"] = git(root, "rev-parse", "HEAD")
    st["tree"] = git(root, "rev-parse", "HEAD^{tree}")
    st["dirty"] = git(root, "status", "--porcelain") != ""

    rounds = [int(m.group(1)) for p in (root / "INSTRUMENTS").glob("k7-verdict-*.json")
              if (m := re.search(r"k7-verdict-(\d+)\.json$", p.name))]
    st["k7_round"] = max(rounds) if rounds else 0

    tags = git(root, "tag", "--sort=-creatordate", "-l",
               "k7-pass-*", "resolution-run-*", "closed-by-owner*", "seal-*")
    st["last_gate_tag"] = tags.splitlines()[0] if tags else ""
    seals = git(root, "tag", "-l", "seal-*", "--sort=-v:refname")
    st["seal_tag"] = seals.splitlines()[0] if seals else ""
    st["reopened"] = reopened_by(root, st["seal_tag"])
    return st


def reopened_by(root: Path, tag: str) -> str:
    """The owner ruling that reopened `tag`, or "" when it is not reopened (tools/reopen.py)."""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from reopen import reopen_record
    record = reopen_record(root, tag)
    return f"{record.get('ruling')} ({record.get('approved_by')})" if record else ""


def ui_root(root: Path) -> str:
    """Phase 5's folder, as project.json's ui_root declares it ("ui" when undeclared or unreadable)."""
    try:
        declared = json.loads((root / ".metaframework" / "project.json").read_bytes().decode("utf-8")).get("ui_root")
    except (OSError, ValueError, AttributeError):
        declared = None
    return str(declared or "ui").rstrip("/\\") or "ui"


def working_rules(st: dict, ui: str = "ui") -> list[str]:
    """The banner's rules for where the project stands. Phase 5's name `ui`, the folder project.json's ui_root
    declares (2.6.21: they said ui/ whatever was declared, and FirmOS works in web/)."""
    seal = st.get("seal_tag")
    if st.get("reopened"):
        return [
            f"Reopened: {seal} is REOPENED by {st['reopened']}. Its sealed",
            "files are writable for that ruling's change only, until the next",
            "seal closes the reopen. Make the ruled change, then re-seal",
            "(seal.py check, then seal.py apply on the owner's word).",
        ]
    if str(st.get("phase")) == "5":
        return [
            f"Phase 5: the library is sealed at {seal or '(seal tag missing!)'}.",
            f"Work in {ui}/. Start from {ui}/surface-map.md and {ui}/gaps.md. State this",
            "session's one goal (simulate / build / audit / review) and stop when it",
            "is met. Do not run K7, re-score, or re-audit the library or its docs.",
        ]
    if seal:
        return [
            f"Extension build over {seal}: files present at that tag are",
            "frozen. Build new modules only; K7 runs with --modules. Read governance/",
            "for the extension S3 and the emission contract.",
        ]
    return [
        "Before acting: read governance/ for the frozen S3 and the emission",
        "contract. A step closes on the gates, with no K7 round (RD-32): after",
        "its ledger rows the next action is the next step in S3 §10's order.",
        "K7 runs at the foundation checkpoint (k7-run.py --checkpoint; one fix",
        "pass, no re-check) and the final review (k7-run.py --final).",
        "The close (v0.14): last module built, ui/interface-contract.md, the",
        "final review, seal.py check, then the owner's one approval, which",
        "seals and merges phase4 into main. Nothing is worked between the last",
        "module and the seal unless the owner orders it. Long runs (K7, seal",
        "check, the full suite) start through tools/run.py.",
    ]


def field_lines(st: dict) -> list[str]:
    """The banner's heading and one line per field, as STATE.json holds them."""
    return [
        "=== PROJECT STATE (read from STATE.json — do not re-derive) ===",
        f"concept        {st.get('concept') or '(unset)'}",
        f"phase          {st.get('phase')}",
        f"branch         {st.get('branch') or '(unknown)'}"
        + ("   [WORKING TREE DIRTY]" if st.get("dirty") else ""),
        f"HEAD           {(st.get('head') or '')[:12] or '(unknown)'}",
        f"seal           {st.get('seal_tag') or '(none — library not yet sealed)'}",
        f"current module {st.get('current_module') or '(unset)'}",
        f"K7 round       {st.get('k7_round')}",
        f"last gate tag  {st.get('last_gate_tag') or '(none)'}",
        f"NEXT ACTION    {st.get('next_action') or '(unset — set it before working)'}",
    ]


def render(st: dict, ui: str = "ui") -> str:
    b = st.get("blocked_on")
    lines = field_lines(st)
    if b:
        lines.append(f"BLOCKED ON     {b}")
    lines += [""] + working_rules(st, ui) + [
        "Do not reconstruct project position from memory or from this",
        "conversation — STATE.json is authoritative and was written by a tool.",
        "=" * 62,
    ]
    return "\n".join(lines)


def emit_hook(event: str, context: str) -> None:
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": event, "additionalContext": context}}))


def hook_payload(root: Path) -> dict | None:
    """The hook's payload from stdin, or None when the hook's session belongs to another checkout.

    CLAUDE_PROJECT_DIR is where the session started. K7's reviewer starts in a throwaway worktree of the reviewed
    commit and loads that commit's settings (RD-29); a repository whose hooks name this file by its absolute path
    runs this checkout's copy for the reviewer's session. That session is not this checkout's: nothing is written
    here, which would change the repository under review, and this checkout's state is not handed to it."""
    project = os.environ.get("CLAUDE_PROJECT_DIR")
    if project and os.path.normcase(str(Path(project).resolve())) != os.path.normcase(str(root)):
        return None
    try:
        return json.loads(sys.stdin.buffer.read().decode("utf-8"))   # UTF-8 whatever the code page (2.7.0)
    except (ValueError, OSError):
        return {}


def gates_state(root: Path) -> tuple[bool, str]:
    """(is the gate install complete, tools/gatecheck.py's verdict on it). Unknown counts as incomplete."""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    try:
        from gatecheck import problems, summary
        return not problems(root), summary(root)
    except Exception as exc:                    # noqa: BLE001 - a session start must not fail on this
        return False, f"GATES: could not be checked ({exc}); run python3 tools/phase4-checks.py gates"


def gates_summary(root: Path) -> str:
    return gates_state(root)[1]


def field_value(k: str, val: str):
    if val in ("", "none", "null"):
        return None
    return int(val) if k == "phase" and val.isdigit() else val


def pairs_problem(pairs: list[tuple[str, str]]) -> str:
    if not pairs:
        return "nothing to set (expected k=v)"
    unknown = [k for k, _ in pairs if k not in INTENT_FIELDS]
    return (f"'{unknown[0]}' is git-derived or unknown; settable fields are {', '.join(INTENT_FIELDS)}"
            if unknown else "")


def step_refusal(root: Path, pairs: list[tuple[str, str]]) -> str:
    """Setting current_module starts a build step (2.6.17): refused while the gate install is incomplete, because a
    step built where the gate does not reach is the LedgerCore V2 attempt-1 failure."""
    if not any(k == "current_module" and field_value(k, v) for k, v in pairs):
        return ""
    complete, gates = gates_state(root)
    return "" if complete else f"no build step starts until the gate install is complete.\n{gates}"


def set_fields(root: Path, st: dict, rest: list[str]) -> int:
    """`set k=v ...`."""
    pairs = [a.partition("=")[::2] for a in rest if "=" in a and not a.startswith("--")]
    bad = pairs_problem(pairs)
    if bad:
        return print(f"state: {bad}", file=sys.stderr) or 2
    refused = step_refusal(root, pairs)
    if refused:
        return print(f"state: {refused}", file=sys.stderr) or 1
    st.update({k: field_value(k, v) for k, v in pairs})
    save(root, st, "manual")
    print(render(st, ui_root(root)))
    return 0


def root_arg(rest: list[str]) -> Path:
    """The repo: the checkout this file lives in, or --root when given (the last one wins)."""
    root = Path(__file__).resolve().parents[1]
    for i, a in enumerate(rest):
        if a == "--root" and i + 1 < len(rest):
            root = Path(rest[i + 1]).resolve()
    return root


def refresh_cmd(root: Path, st: dict) -> int:
    """`refresh`."""
    save(root, refresh(root, st), "refresh")
    print(render(load(root), ui_root(root)))
    return 0


def run_lines(root: Path, payload: dict, starting: bool) -> list[str]:
    """The runs tools/run.py keeps (2.8.0) whose state this session has not seen; on a session's start, those still
    going too. A hook must not fail on them, so a failure to read them is said instead."""
    try:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        import run
        changed = run.changes(root, payload.get("session_id") or "")
        going = [x for x in run.still_running(root) if x not in changed] if starting else []
    except Exception as exc:                    # noqa: BLE001 - a hook must not fail on this
        return [f"RUNS: could not be read ({exc}); python tools/run.py --list"]
    return ((["RUNS (tools/run.py), changed since this session last looked:"] + [f"  - {x}" for x in changed]
             if changed else []) + (["RUNS still going:"] + [f"  - {x}" for x in going] if going else []))


def session_start(root: Path, st: dict, payload: dict) -> int:
    """`hook-session-start`: refresh mechanically, then inject. A resumed or post-compaction session gets the same
    block a fresh one does, with the gate install's state under it, and (2.8.0) the runs it has not seen."""
    st = refresh(root, st)
    save(root, st, f"session-start:{payload.get('source', 'unknown')}")
    runs = run_lines(root, payload, True)
    emit_hook("SessionStart", render(st, ui_root(root)) + "\n" + gates_summary(root)
              + ("\n" + "\n".join(runs) if runs else ""))
    return 0


def prompt(root: Path, payload: dict) -> int:
    """`hook-prompt` (UserPromptSubmit, 2.8.0): each run whose state this session has not seen; nothing otherwise."""
    runs = run_lines(root, payload, False)
    if runs:
        emit_hook("UserPromptSubmit", "\n".join(runs))
    return 0


def turn_end(root: Path, payload: dict, agent: str) -> int:
    """`hook-stop` and `hook-subagent-stop` (2.8.0): one turn_end line in the session events. Always 0: a Stop hook
    that exits 2 keeps the session from stopping."""
    line = {"schema": 1, "time": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "session_id": payload.get("session_id"), "agent": agent, "event": "turn_end"}
    try:
        (root / EVENTS).parent.mkdir(parents=True, exist_ok=True)
        with (root / EVENTS).open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(line) + "\n")
    except OSError:
        pass
    return 0


def precompact(root: Path, st: dict, payload: dict) -> int:
    """`hook-precompact`: checkpoint STATE.json and the state log before context loss."""
    st = refresh(root, st)
    save(root, st, f"precompact:{payload.get('trigger', 'unknown')}")
    log = root / "INSTRUMENTS" / "state-log.jsonl"
    try:
        log.parent.mkdir(exist_ok=True)
        with log.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps({"event": "precompact", **st}) + "\n")
    except OSError:
        pass
    emit_hook("PreCompact",
              "Context is about to be compacted. STATE.json has been "
              "checkpointed to disk.\n\n" + render(st, ui_root(root)) +
              "\n\nWhen compacting, preserve verbatim: the NEXT ACTION line, "
              "the current module, any BLOCKED ON entry, the list of files "
              "modified this session, and the exact text of any failing "
              "check. Distinctions are lost before conclusions are — keep "
              "the ones above even at the cost of narrative.")
    return 0


def main() -> int:
    argv = sys.argv[1:]
    if not argv:
        print(__doc__)
        return 2
    cmd, rest = argv[0], argv[1:]

    # The repo is the checkout this file lives in. A hook payload's cwd follows the session's `cd`, so it is not
    # read for the root; hook_payload compares the session's project with this root instead.
    root = root_arg(rest)

    payload = hook_payload(root) if cmd.startswith("hook-") else {}
    if payload is None:
        return 0                              # another checkout's session: nothing written, nothing injected

    st = load(root)
    commands = {
        "show": lambda: print(json.dumps(st, indent=2)) or 0,
        "render": lambda: print(render(st, ui_root(root))) or 0,
        "refresh": lambda: refresh_cmd(root, st),
        "set": lambda: set_fields(root, st, rest),
        "hook-session-start": lambda: session_start(root, st, payload),
        "hook-precompact": lambda: precompact(root, st, payload),
        "hook-prompt": lambda: prompt(root, payload),
        "hook-stop": lambda: turn_end(root, payload, "lead"),
        "hook-subagent-stop": lambda: turn_end(root, payload, "subagent"),
    }
    if cmd in commands:
        return commands[cmd]()

    print(f"state: unknown subcommand '{cmd}'", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
