#!/usr/bin/env python3
"""
k7-run — spawns the K7 review as a SUBPROCESS and writes a schema-valid verdict.

The separation is the point. The reviewer runs in its own process with its own
context; the only channel between builder and reviewer is the filesystem. This is
the two-session workflow with the courier automated, which is what worked before
it was collapsed into an in-session agent.

The reviewer writes only in the runner's worktree (RD-29). Each round gets a
throwaway git worktree of the reviewed commit at .k7/wt, removed when the round
ends however it ends. For a Claude Code reviewer the runner composes the grant
itself: Write and Edit on .k7/**, tools/k7-scratch.py as the whole shell (the
declared commands, run in the worktree), user and local settings not loaded, and
a permission mode that denies anything else. A reviewer_command that would widen
that grant (skip permissions, its own allow list, extra settings or directories,
an inline agent or system prompt) is refused. A repository left dirty after
review is a refusal: no verdict, no receipt, the raw output kept for the owner.
The verdict is read from the reviewer's output without a greedy match (MF-33):
the whole output if it is one object, else the last verdict-shaped object in it;
whenever it cannot be read, the raw output is kept, not discarded.

The runner owns every field that asserts independence — reviewed.*, reviewer.*,
preflight.*, progress. The reviewer supplies only checks, drift_score, verdict,
blocking, next_action. Anything the reviewer says about the other fields is
discarded, because a party cannot certify its own independence.

The close's order (2.8.0, roster v0.14; the owner, 31 Oct 2026: "Cut them").
Owner triage after every round, and RD-9's cap with it, are cut. The foundation
checkpoint gets one fix pass, with no re-check and no triage, so after a
checkpoint the next round is the final review. The final review goes to the
close (the interface contract, seal.py check, the owner's one approval), and
nothing more is reviewed before the seal. Any other round needs the owner's
order: an owner-round-<n> tag (2.6.21) at or after the last reviewed commit buys
exactly one, and the round that uses it spends it. Rounds before the latest
seal do not count, so an extension build starts again. The no-progress HALT
below still applies.

After a seal: K7 reviews extension modules only (--modules is required), the
sealed files must be unchanged, and in Phase 5 the runner refuses outright —
Phase 5 does not run K7. While an owner ruling has the latest seal reopened
(tools/reopen.py), K7 reviews the reopened library for the next seal: Phase 5
does not stop it, any module may be named, and the changed sealed files are
the point.

Credited review (the F1 design, stage 1; tools/manifests.py). Each module in
scope gets a mode, written into the verdict's reviewed.scope:
  credited  its content's fingerprint was in scope of a concluded round:
            not reviewed again
  diff      reviewed on what changed since its base (the reviewed commit of
            the newest concluded round that had it in scope) and the
            unchanged code that change depends on or that calls it
  full      never concluded, or --full
A round whose modules are all credited is not spent: nothing is spawned and
no verdict is written. The seal's backstop (seal.py) asks for one full review
of every module's final content.

The frozen test set (Amendment S-1). CC-4 checks the stretch's frozen set. A
guard element that set does not cover is a CC-4 failure, so it is blocking; a
further test for a covered element is a proposal, in the verdict's optional
proposed_tests. The runner appends each proposal to
INSTRUMENTS/test-intake-log.md, pending. It gates nothing and changes no
verdict; the end-of-stretch dedupe and the owner's batch ruling are cut (2.8.0),
so a proposal stays logged until the owner schedules it.

RD-32 (2.7.0): no K7 per step. Two rounds review the build, in the order
the close above keeps:
  --checkpoint  the foundation checkpoint, once the modules the rest of the
                library calls are built: correctness only (CC-1, CC-2, CC-4;
                hook hardening out of scope), each module reviewed whole. Its
                modules are --modules, or the "Foundation modules" line of
                INSTRUMENTS/C4-anchor-record.md. It credits nothing and appends
                no receipt: the final review is the full one.
  --final       the final deep review, every module built: --full, one pass per
                facet (the facet each S3 §2 Module cell names, "(facet FB)"),
                then one pass across the seams, each a reviewer of its own in
                the round's worktree, one after another. The round's verdict is
                the worst pass's, with every finding, check and proposal kept.
                RD-31 applies strictly: a way around a hook is a known issue
                unless a builder would plausibly write that form.
From 2.8.0 the checkpoint's findings get one fix pass, and the final review's
become Phase 5 gaps at the seal (the close above); a fix pass runs only on the
owner's order.

Start it through tools/run.py (2.8.0; the gate refuses it otherwise), so a crash
cannot lose the round: python tools/run.py --kind k7 --label "K7 final" --
python tools/k7-run.py --final. While a reviewer works it prints a line every
five minutes, so its log stays fresh.

A finished review is never run twice (2.9.0; SR-2, Projects/CLAUDE.md rule 13).
Each pass is saved the moment its reviewer exits (tools/k7_passes.py), before
anything reads it. Run the same command again and every saved pass whose
reviewed content is unchanged is reused; only the passes still missing run.
--fresh discards the saved passes. When the review finished and the filing
refused it (the schema, a sign, a stray key), that is a seam fault: repair it
with a script, never by hand, and file it without a reviewer:
    k7-run.py <the round's flags> --refile --repair fix.py
The script gets each pass's verdict object as JSON on stdin and prints the
repaired object. The runner refuses a repair that changes any judgement (the
verdict, a check's status, a finding, a score), keeps the script as
INSTRUMENTS/k7-repair-<n>.py and records every change in
INSTRUMENTS/k7-round-<n>-passes.json. A pass that times out is saved, then
resumed in its own reviewer session, which keeps its reading and findings: at
once, up to project.json's k7_resumes times (default 1), and again by the next
run of the same command. The per-pass timeout is --timeout, else project.json's
k7_timeout, else 1800 seconds. A review kept before 2.9.0 saved its passes (a
schema refusal's INSTRUMENTS/k7-raw-<n>.txt) is filed the same way, imported
first (2.9.1): --refile --from-raw <that file> --run <the run.py run id>. Each
pass's output must be found in its reviewer's own transcript, and the modules
must be unchanged since the commit the run reviewed.

Usage:
    k7-run.py [--root .] [--modules MOD-01,MOD-02] [--full | --checkpoint | --final] [--timeout N] [--dry-run]
              [--fresh | --refile [--from-raw RAW --run RUN_ID]] [--repair SCRIPT]
Exit: 0 verdict written (any verdict), or nothing to review; 1 preflight/validation
failure, 2 usage.
"""

import argparse
import hashlib
import json
import os
import re
import shlex
import subprocess
import sys
import tempfile
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import basis                                                 # noqa: E402  the review basis (2.6.17)
import k7_passes as kp                                       # noqa: E402  each pass kept as it ends (2.9.0)
import manifests as mf                                       # noqa: E402  credited review
import receipts as rc                                        # noqa: E402  the gates as receipts (RD-28)
import reopen as ro                                          # noqa: E402  a seal reopened by an owner ruling
from gatecheck import problems as gate_problems              # noqa: E402  the gate install (2.6.17)
from source_scan import glob_to_regex                        # noqa: E402  the shared source readers (2.6.19)

RUNNER_OWNED = ("reviewed", "reviewer", "preflight", "progress", "schema_version")
PROPOSAL_KEYS = ("module", "guard_element", "test", "why")    # a proposed_tests entry's fields, and no others
CLOSER = re.compile(r"\s*[}\]]")                              # what a trailing comma stands before

# RD-29: the reviewer's only writable place. Gitignored, and inside the repo so that dependencies (node_modules, a
# local package) resolve from the copy exactly as they do from the original.
SCRATCH = ".k7/wt"
SCRATCH_TOOL = "tools/k7-scratch.py"
OWNER_ORDER = "owner-round-*"                                # the owner's order for one more round (2.6.21)
PROGRESS_S = 300                                             # a still-running line while the reviewer works (2.8.0)
TIMEOUT_S = 1800                                             # a pass's limit when neither --timeout nor k7_timeout says
DEFAULT_REVIEWER = "claude -p --agent k7-reviewer --output-format text"
# A reviewer command that already names its session, or keeps none (2.8.1): its session is left as it says.
SESSION_FLAGS = ("--session-id", "--resume", "-r", "--continue", "-c", "--fork-session", "--no-session-persistence")
# Flags that would widen the runner's grant or replace the charter whose digest the rubric pins.
WIDENING = ("--dangerously-skip-permissions", "--allow-dangerously-skip-permissions", "--permission-mode",
            "--allowedTools", "--allowed-tools", "--permission-prompt-tool", "--settings", "--setting-sources",
            "--add-dir", "--agents", "--system-prompt", "--system-prompt-file", "--append-system-prompt",
            "--append-system-prompt-file")

# Amendment S-1: where a verdict's proposed_tests go. The template ships INTAKE_LOG as INSTRUMENTS/test-intake-log.md;
# tests/test_test_set.py holds the two equal.
C4_RECORD = "C4-anchor-record.md"
CHECKPOINT_CHECKS = ("CC-1", "CC-2", "CC-4")
SEVERITY = kp.SEVERITY
# What each kind of pass is told to run (RD-32). The charter (.claude/agents/k7-reviewer.md) defines the checks; with
# a receipts store its digest is pinned, so a pass's scope is the runner's prompt, never a changed charter.
BATTERY = "Run the CC-1..CC-7 battery defined in your agent file against the reviewed commit."
CHECKPOINT_BATTERY = """\
This round is the FOUNDATION CHECKPOINT (RD-32): the modules the rest of the library calls,
reviewed for correctness before the rest is built on them. Run CC-1, CC-2 and CC-4 only, as
your agent file defines them: does the code trace to the spec, honour its carried rules, and
refuse what S3 §5 says it refuses, on the declared full suite. Hook hardening is OUT OF SCOPE:
CC-3, CC-5, CC-6 and CC-7 are not run, and a way around a code hook is not a finding. Report
checks with exactly the keys CC-1, CC-2 and CC-4, and score drift_score from them alone."""
FACET_BATTERY = """\
This is pass "{facet}" of the FINAL REVIEW (RD-32): run the CC-1..CC-7 battery defined in your
agent file on this facet's modules, each in full. Other facets have passes of their own, and one
more pass reviews the seams between modules. RD-31 applies strictly: a way around a code hook is
a known issue, not a finding, unless a builder would plausibly write that form."""
SEAMS_BATTERY = """\
This is the SEAMS pass of the FINAL REVIEW (RD-32). Each facet's modules had a pass of their own;
this one reviews what passes between modules: every S3 §4 seam, read from both ends (what the
source hands over, how, and what the target does with it), and every injection seam the object
model names. Run the CC-1..CC-7 battery defined in your agent file as it bears on the seams; a
module's interior is out of scope unless a seam leads you into it. A defect found at a seam is a
finding against the module whose code holds it. RD-31 applies strictly: a way around a code hook
is a known issue, not a finding, unless a builder would plausibly write that form."""
INTAKE = "test-intake-log.md"
PROPOSALS_HEADER = ("| ID | Stretch | Proposed by | Module | Guard element | Proposed test | Why | Covered by "
                    "| Disposition |")
PROPOSALS_RULE = "|---|---|---|---|---|---|---|---|---|"
INTAKE_LOG = f"""# Test-intake log

The frozen test set (Amendment S-1, `governance/test-set.md`; roster v0.10). Before each build
stretch the lead fixes that stretch's critical path with `tools/test-set.py` and records it
under Frozen sets. Only that set gates COMPLETE (the completion ledger's CT-4 box) and CC-4.
Cut rows stay in S3 §5 as the record: they are not written and they gate nothing, unless the
owner schedules them.

Everyone else proposes: a sub-agent, a sub-session, K7. A proposal is one row under Proposals,
naming the guard element it claims to cover and why. It is not written, run or counted during
the stretch unless it blocks the build, and it waits here until the owner schedules it: the
end-of-stretch dedupe and the owner's batch ruling are cut (roster v0.14, RD-34).

## Frozen sets

One row per stretch. Report is the `test-set.py` output for the stretch's modules, committed
with the row.

| Stretch | Modules | Critical rows | Report | Frozen at | Approved by |
|---|---|---|---|---|---|

## Proposals

`tools/k7-run.py` appends a K7 verdict's `proposed_tests` here; any other proposal is added by
hand. Disposition stays `pending` until the owner schedules (`admitted`) or rejects a proposal;
Covered by is filled when one is admitted.

{PROPOSALS_HEADER}
{PROPOSALS_RULE}
"""


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def scratch_up(root: Path, commit: str) -> str:
    """A fresh detached worktree of the reviewed commit; '' on success, else git's complaint."""
    scratch_down(root)
    r = subprocess.run(["git", "-C", str(root), "worktree", "add", "--detach", SCRATCH, commit],
                       capture_output=True, encoding="utf-8", errors="replace")
    return "" if r.returncode == 0 else (r.stderr or r.stdout).strip()


def scratch_down(root: Path) -> None:
    """Remove the worktree, whatever state the reviewer left it in (a crashed round's included)."""
    subprocess.run(["git", "-C", str(root), "worktree", "remove", "--force", SCRATCH], capture_output=True)
    subprocess.run(["git", "-C", str(root), "worktree", "prune"], capture_output=True)


def rule_path(path: Path) -> str:
    """An absolute path in Claude Code's permission-rule form: `//` and the POSIX path, a Windows drive as its lowercase
    letter (C:\\x is //c/x). Unlike a relative rule, it does not move when the reviewer's shell changes directory: a
    reviewer that ran `cd .k7/wt` found `.k7/**` naming `.k7/wt/.k7/**` and every write denied (PipelineGate GOV-19;
    the plugin's frame-gate findings log, row 29)."""
    posix = path.resolve().as_posix()
    if len(posix) > 1 and posix[1] == ":":
        posix = "/" + posix[0].lower() + posix[2:]
    return "/" + posix


def reviewer_command(cfg: dict, agent: str, root: Path | None = None) -> tuple[list[str], str]:
    """The command that starts the reviewer, with the runner's grant (RD-29). Returns (argv, refusal)."""
    # `or` not a get() default: an explicit null means "use the default".
    # replace(), not format(): a command holding literal braces (inline JSON) must reach the checks below, not crash.
    cmd = shlex.split((cfg.get("reviewer_command") or DEFAULT_REVIEWER).replace("{agent_file}", agent))
    if Path(cmd[0]).name.lower() not in ("claude", "claude.exe"):
        # Not Claude Code: there is no permission system to grant into. The dirty-tree refusal still holds.
        return cmd, ""
    widening = sorted({a.split("=", 1)[0] for a in cmd[1:] if a.split("=", 1)[0] in WIDENING})
    if widening:
        return [], (f"reviewer_command carries {', '.join(widening)}, which would widen the reviewer's grant or replace "
                    f"its charter (RD-29). The runner composes the grant itself; remove them. K7 not spawned.")
    # An Edit(path) rule covers every file-editing tool, Write included; a Write(path) rule is not matched at all.
    # Bash and PowerShell both: a Windows reviewer has PowerShell and no Bash.
    shell = [f"{tool}({py} {SCRATCH_TOOL}:*)" for tool in ("Bash", "PowerShell") for py in ("python", "python3")]
    folder = SCRATCH.split('/')[0]
    grant = [f"Edit({folder}/**)"] + ([f"Edit({rule_path(root / folder)}/**)"] if root is not None else [])
    return cmd + ["--setting-sources", "project", "--permission-mode", "dontAsk",
                  "--allowedTools", *grant, *shell], ""


def extract_verdict(raw: str) -> dict | None:
    """The reviewer's verdict object out of its output (MF-33).

    A greedy brace match ran from the FIRST brace in the output to the last, so prose that merely mentions a set
    before the verdict ('{}', '{c1}', as any review of a vector table does) failed to parse and the whole review was
    discarded (the Frame Gate trial, K7 round 10's first attempt; its IR-67 is this fix). Now: the whole output if it
    is one JSON object; otherwise every '{' from the LAST backwards, and the first verdict-shaped object wins."""
    try:
        whole = json.loads(raw)
        if isinstance(whole, dict):
            return whole
    except json.JSONDecodeError:
        pass
    starts = list(reversed([k for k, ch in enumerate(raw) if ch == "{"]))
    found = verdict_from(raw, starts, lambda text, i: (text, i))
    if found is None:
        # LedgerCore V2 K7 round 10: a whole review discarded for two trailing commas. Read as they plainly mean.
        found = verdict_from(raw, starts, lambda text, i: (without_trailing_commas(text[i:]), 0))
        if found is not None:
            print("k7-run: the reviewer's verdict object had trailing commas; read without them", file=sys.stderr)
    return found


def verdict_from(raw: str, starts: list[int], view) -> dict | None:
    """The first verdict-shaped object that parses at one of `starts`, read through `view` (text, start)."""
    decoder = json.JSONDecoder()
    for i in starts:
        try:
            obj, _ = decoder.raw_decode(*view(raw, i))
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict) and "verdict" in obj and "checks" in obj:
            return obj
    return None



def without_trailing_commas(text: str) -> str:
    """The text with each comma that directly precedes a closing brace or bracket removed, outside strings."""
    out, quoted, escaped = [], False, False
    for i, ch in enumerate(text):
        if quoted:
            quoted = escaped or ch != '"'
            escaped = not escaped and ch == "\\"
        elif ch == '"':
            quoted = True
        elif ch == "," and CLOSER.match(text, i + 1):
            continue
        out.append(ch)
    return "".join(out)


def keep(inst: Path, name: str, text: str) -> Path:
    """Evidence for the owner, written before a refusal so an unusable verdict costs a re-read, not a re-review."""
    stem, ext = os.path.splitext(name)
    p, n = inst / name, 1
    while p.exists():                       # a refused round leaves no verdict, so its number comes round again
        n += 1
        p = inst / f"{stem}-{n}{ext}"
    p.write_bytes(text.replace("\r\n", "\n").encode("utf-8"))
    return p


def md_cell(text: str) -> str:
    """A value as one Markdown table cell: one line, its pipes escaped."""
    return " ".join(str(text).split()).replace("|", "\\|")


def table_span(lines: list[str], heading: str) -> tuple[int, int] | None:
    """(header index, index after the last row) of the first table under `heading`, or None."""
    if heading not in lines:
        return None
    i = lines.index(heading) + 1
    while i < len(lines) and not lines[i].startswith(("|", "## ")):
        i += 1
    if i >= len(lines) or not lines[i].startswith("|"):
        return None
    end = i
    while end < len(lines) and lines[end].startswith("|"):
        end += 1
    return i, end


def last_stretch(lines: list[str]) -> str:
    """The stretch the lead froze last: the Frozen sets table's last row, or '—' before any."""
    span = table_span(lines, "## Frozen sets")
    if not span or span[1] - span[0] < 3:
        return "—"
    return lines[span[1] - 1].strip().strip("|").split("|")[0].strip() or "—"


def log_proposals(inst: Path, rnd: int, proposals: list[dict]) -> int:
    """Append a verdict's proposed_tests to the test-intake log, pending (Amendment S-1). Returns how many."""
    if not proposals:
        return 0
    path = inst / INTAKE
    lines = (path.read_text(encoding="utf-8") if path.is_file() else INTAKE_LOG).splitlines()
    span = table_span(lines, "## Proposals")
    if span is None:                        # a log reshaped by hand: the table goes back at its end
        lines += ["", "## Proposals", "", PROPOSALS_HEADER, PROPOSALS_RULE]
        span = (len(lines) - 2, len(lines))
    taken = [int(m.group(1)) for ln in lines if (m := re.match(r"^\| TP-(\d+) \|", ln))]
    first, stretch = max(taken, default=0) + 1, last_stretch(lines)
    lines[span[1]:span[1]] = [
        f"| TP-{first + i:02d} | {stretch} | K7 round {rnd} | {md_cell(p['module'])} | {md_cell(p['guard_element'])} "
        f"| {md_cell(p['test'])} | {md_cell(p['why'])} | — | pending |" for i, p in enumerate(proposals)]
    path.write_bytes(("\n".join(lines) + "\n").encode("utf-8"))
    return len(proposals)


def report_proposals(inst: Path, rnd: int, verdict: dict, verdict_name: str) -> None:
    """Log the verdict's proposed_tests and say so. A log that cannot be written never costs the round its
    receipts: the proposals stay in the verdict file."""
    try:
        logged = log_proposals(inst, rnd, verdict.get("proposed_tests") or [])
    except OSError as exc:
        print(f"k7-run: WARNING the proposed tests were not logged ({exc}); they stay in {verdict_name}", file=sys.stderr)
        return
    if logged:
        print(f"k7-run: {logged} proposed test(s) logged, pending, in INSTRUMENTS/{INTAKE}")


def halt_without_progress(verdict: dict) -> None:
    """A round that changed neither the tree nor the failing set is a HALT (RD-19); the schema requires it."""
    if verdict.get("progress") and not verdict["progress"]["changed"]:
        verdict["verdict"] = "HALT"
        if not verdict.setdefault("blocking", []):
            verdict["blocking"] = [{
                "check_id": "progress", "module": "(all)",
                "required_change": "Round changed neither the tree nor the failing "
                                   "set. Loop is not converging; owner triage."}]


def write_verdict(inst: Path, rnd: int, verdict: dict) -> Path:
    """INSTRUMENTS/k7-verdict-<round>.json, replaced atomically. Bytes: a text-mode write turns every \\n into
    \\r\\n on Windows (F7, the Frame Gate trial)."""
    out = inst / f"k7-verdict-{rnd}.json"
    with tempfile.NamedTemporaryFile("wb", dir=str(inst), delete=False) as tmp:
        tmp.write((json.dumps(verdict, indent=2) + "\n").encode("utf-8"))
        tmp.flush()
        os.fsync(tmp.fileno())
        tmp_name = tmp.name
    os.replace(tmp_name, out)
    return out


def git(root: Path, *a: str) -> str:
    r = subprocess.run(["git", "-C", str(root), *a],
                       capture_output=True, encoding="utf-8", errors="replace")
    return r.stdout.strip() if r.returncode == 0 else ""


def die(msg: str, code: int = 1) -> int:
    print(f"k7-run: {msg}", file=sys.stderr)
    return code


def run_tool(root: Path, script: str, *args: str) -> dict:
    """Run a checker with --json and return its result object."""
    p = root / "tools" / script
    if not p.is_file():
        return {"status": "fail", "violations": [
            {"file": script, "rule": "checker_absent",
             "detail": f"tools/{script} not found; preflight cannot run"}]}
    r = subprocess.run([sys.executable, str(p), *args, "--json"],
                       capture_output=True, encoding="utf-8", errors="replace", cwd=str(root))
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        return {"status": "fail", "violations": [
            {"file": script, "rule": "checker_unparseable",
             "detail": (r.stderr or r.stdout or "no output")[:300]}]}


def next_round(inst: Path) -> int:
    ns = [int(m.group(1)) for p in inst.glob("k7-verdict-*.json")
          if (m := re.search(r"k7-verdict-(\d+)\.json$", p.name))]
    return max(ns) + 1 if ns else 1


def load_prior(inst: Path, rnd: int) -> dict | None:
    if rnd <= 1:
        return None
    p = inst / f"k7-verdict-{rnd - 1}.json"
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def state_phase(root: Path) -> str:
    """The phase STATE.json records, "4" when it cannot be read."""
    try:
        return str(json.loads((root / "STATE.json").read_text(encoding="utf-8")).get("phase", 4))
    except (OSError, json.JSONDecodeError):
        return "4"


def reopened_note(seal: str, record: dict) -> str:
    """The prompt's note while the latest seal is reopened for the next seal's review."""
    return (f"Reopened library: {seal} is reopened by {record.get('ruling')} ({record.get('approved_by')}) for\n"
            f"the next seal's review. The ruled change to the sealed library is IN scope. Where\n"
            f"INSTRUMENTS/F-supersession-proposals.md records a supersession ruled under\n"
            f"{record.get('ruling')} of an S3 signature, rule or object-model declaration, the\n"
            f"superseding text governs: a difference from the S3 it records is not drift;\n"
            f"anything it does not record is.\n\n")


def sealed_guard(root: Path, cfg: dict, seal: str, modules_given: bool) -> tuple[str, str]:
    """An extension's guard over a sealed library: (refusal, '') or ('', seal_note)."""
    if not modules_given:
        return (f"the library is sealed at {seal}; K7 reviews extension modules only. "
                f"Pass --modules with the new MOD ids."), ""
    globs = cfg.get("sealed_globs") or [cfg.get("source_glob") or "src/**", "tests/**"]
    rx = [glob_to_regex(g) for g in globs]
    sealed = {f for f in git(root, "ls-tree", "-r", "--name-only", seal).splitlines()
              if any(r.match(f) for r in rx)}
    broken = sorted(set(git(root, "diff", "--name-only", seal).splitlines()) & sealed)
    if broken:
        return (f"files sealed at {seal} have changed ({', '.join(broken[:5])}); an "
                f"extension may not modify sealed code. K7 not spawned."), ""
    return "", (f"Sealed library: {seal}. Files present at that tag are frozen, verified\n"
                f"unchanged by the runner, and OUT OF SCOPE. Review only the modules listed\n"
                f"above and their seams into the sealed library.\n\n")


def seal_guard(root: Path, cfg: dict, modules_given: bool) -> tuple[str, str]:
    """('', seal_note) when K7 may run on this tree; (refusal, '') when it may not.

    While the latest seal is reopened by an owner ruling (tools/reopen.py), K7 reviews the reopened library for the
    next seal: Phase 5 does not stop it, any module may be named, and its changed sealed files are the point.
    Otherwise Phase 5 runs no K7, and over a sealed library K7 reviews extension modules only."""
    seals = git(root, "tag", "-l", "seal-*", "--sort=-v:refname").splitlines()
    record = ro.reopen_record(root, seals[0]) if seals else None
    if record:
        return "", reopened_note(seals[0], record)
    if state_phase(root) == "5":
        return ("STATE.json says phase 5. Phase 5 does not run K7: the library is sealed "
                f"and the UI is not a library module. An engine gap goes to {cfg.get('ui_root') or 'ui'}/gaps.md "
                "and, when ready, to an extension run (tools/seal.py begin-extension)."), ""
    return sealed_guard(root, cfg, seals[0], modules_given) if seals else ("", "")


def owner_orders(root: Path) -> list[str]:
    """The commits the owner's orders for one more round (owner-round-* tags) sit on, one per tag (2.6.21)."""
    commits = (git(root, "rev-list", "-n", "1", t) for t in git(root, "tag", "-l", OWNER_ORDER).splitlines())
    return [c for c in commits if c]


def spend_order(root: Path, orders: list[str], before: str, reviewed: str) -> None:
    """Strike the order a round used: one at or after the round before it and at or before its own reviewed commit,
    one not on that commit first (that one could still be an order for the round after it)."""
    fits = [o for o in orders if mf.is_ancestor(root, before, o) and mf.is_ancestor(root, o, reviewed)]
    if fits:
        orders.remove(min(fits, key=lambda o: o == reviewed))


def owner_ordered(root: Path, chain: list[str]) -> bool:
    """An owner order no round has spent sits at or after the last reviewed commit. `chain` is the reviewed commits
    from the round that closed the door to the newest; every round after the first spent one order, so each order
    opens exactly one round."""
    orders = owner_orders(root)
    for before, reviewed in zip(chain, chain[1:]):
        spend_order(root, orders, before, reviewed)
    return any(mf.is_ancestor(root, chain[-1], o) for o in orders)


def door(rounds: list[tuple[int, dict]], kind: str) -> tuple[int, dict] | None:
    """The round after which a round of `kind` needs the owner's order: the newest final review (nothing is reviewed
    after it), else for any round but the final the newest checkpoint (it gets no re-check); None when neither."""
    for wanted in ("final",) + (() if kind == "final" else ("checkpoint",)):
        found = [(n, v) for n, v in rounds if mf.round_kind(v) == wanted]
        if found:
            return found[-1]
    return None


DOOR_REFUSALS = {
    "final": ("the final review has run (round {n}). Its findings go to Phase 5 at the seal ({ui}/gaps.md), and "
              "nothing more is reviewed before it unless the owner orders it (roster v0.14). Next: write "
              "{ui}/interface-contract.md, run `python tools/run.py --kind seal-check -- python tools/seal.py check`, "
              "and take the sweep to the owner, whose one approval seals the library."),
    "checkpoint": ("the foundation checkpoint has run (round {n}). It gets one fix pass, with no re-check and no "
                   "triage (roster v0.14); the next round is the final review, `k7-run.py --final`, once every "
                   "module is built."),
}


def order_refusal(root: Path, inst: Path, kind: str, ui: str = "ui") -> str:
    """'' while the close's order allows a round of `kind`; else the refusal. The owner's order (an owner-round-<n>
    tag at or after the last reviewed commit) opens one round past either door."""
    rounds = mf.rounds_toward_seal(root, inst)
    closed = door(rounds, kind)
    if closed is None:
        return ""
    n, v = closed
    chain = [mf.reviewed_commit(v)] + [mf.reviewed_commit(w) for m, w in rounds if m > n]
    if all(chain) and owner_ordered(root, chain):
        return ""
    return (DOOR_REFUSALS[mf.round_kind(v)].format(n=n, ui=ui) + " Any other round needs the owner's order: an "
            "`owner-round-<n>` tag at or after the last reviewed commit buys exactly one. No round spent.")


def failing(verdict: dict) -> list[str]:
    return sorted(k for k, v in (verdict.get("checks") or {}).items()
                  if v.get("status") == "fail")


PROMPT = """\
You are the K7 conformance reviewer. You are running in a separate process from
the builder. You have not seen the builder's conversation and must not ask for it.

Repository root: {root}
Frozen S3:       {s3}
Round:           {rnd}
Modules in scope: {modules}

Review basis: the documents every builder was briefed with (tools/brief.py stamps a brief with these
digests). Review against the same documents; a rule outside them is not one the builder was held to.
{basis}

{scope_text}
{battery}

A throwaway worktree of the reviewed commit is at {scratch} (RD-29). It is the ONLY
place you may write: every mutation experiment runs there, never in the repository.
Your shell runs one tool, which runs the declared commands in that worktree:
  python {scratch_tool} suite            full suite:     {test_command}
  python {scratch_tool} select "<name>"  single test:    {test_select}
  python {scratch_tool} rederive         re-derive all:  {rederive_all}
  python {scratch_tool} reset            restore the worktree to the reviewed commit
  python {scratch_tool} status           what is mutated in the worktree now
Read the repository freely. The runner removes the worktree when this round ends.
Keep your shell at the repository root and run every command from there: never
`cd`, not even with a read-only command. Edit and Write files in the worktree by
their paths under {scratch}.

{seal_note}The repository itself must be left byte-identical: a verdict that leaves it
dirty is refused, not recorded.

Return ONE JSON object and nothing else, strict JSON (no trailing commas), with exactly these keys:
  checks       object; one entry per check id. Each: {{"status": "pass"|"fail"|
               "not_applicable", "mechanical": bool, and either "evidence":
               {{"command": str, "exit_code": int}} when mechanical is true, or
               "rationale": str when it is false}}
  drift_score  {{"value": 1-10, "basis": [{{"check_id", "finding", "deduction"}}]}}
               A bare number is rejected. Every deduction names a check and a
               specific finding. deduction is a whole number from 0 to 9: the
               points taken off, written positive (4, never -4).
  verdict      "PASS" | "RETURN" | "HALT"
  blocking     array of {{"check_id", "module", "required_change"}}; required
               non-empty unless verdict is PASS
  next_action  one imperative sentence
  proposed_tests  optional; array of {{"module", "guard_element", "test", "why"}},
               each entry exactly these four keys and no others:
               a further test for a guard element the frozen set already covers.
               The runner logs it in INSTRUMENTS/test-intake-log.md; it blocks
               nothing. A guard element the frozen set does not cover is a CC-4
               failure: it goes in blocking, never here.

Do not emit reviewed, reviewer, preflight, progress, or schema_version. The
runner computes those and will discard yours.
"""


def seams(om: dict, m: str) -> tuple[list[str], list[str]]:
    """(the modules m's object-model rows name, the modules whose rows name m)."""
    # Injection seams (OS-3) are not imports. The object model names them: "injected into MOD-05" on MOD-12's row
    # sends MOD-12's reviewer to MOD-05's call path (the DR-37 case), so both directions are listed.
    names = sorted(x for x in om if x != m and any(re.search(rf"\b{x}\b", r) for r in om[m]["rows"]))
    named_by = sorted(x for x, rec in om.items() if x != m and any(re.search(rf"\b{m}\b", r) for r in rec["rows"]))
    return names, named_by


def credited_line(e: dict) -> str:
    """A CREDITED module's line: why it is not reviewed on its own."""
    how = (f"has an ACCEPT receipt at k7 or owner-triage" if e.get("credit") == "receipt"
           else f"was reviewed in concluded round {e['credit_round']}")
    return f"  {e['module']}  CREDITED: its content (manifest {e['manifest'][:12]}) {how}. Do not review it on its own."


def mode_lines(root: Path, e: dict) -> list[str]:
    """What a FULL or CHECKPOINT module is given (the whole module), or a DIFF module (what changed since its base)."""
    m = e["module"]
    if e["mode"] == "full":
        return [f"  {m}  FULL: review the whole module."]
    if e["mode"] == "checkpoint":
        return [f"  {m}  CHECKPOINT: review the whole module, for CC-1, CC-2 and CC-4 only."]
    changed = git(root, "diff", "--stat", e["base"], "HEAD", "--",
                  *e["files"]) or "(no change in its own files: a dependency or its object-model row changed)"
    return ([f"  {m}  DIFF from base {e['base'][:7]} (round {e['base_round']}, concluded). Changed:"]
            + [f"        {ln}" for ln in changed.splitlines()])


def related_lines(e: dict, names: list[str], named_by: list[str]) -> list[str]:
    """What a reviewed module's code is tied to: imports both ways, injection seams both ways, unresolved imports."""
    rel = []
    if e["deps"]:
        rel.append(f"it imports {', '.join(e['deps'])}")
    if e["importers"]:
        rel.append(f"imported by {', '.join(e['importers'])}")
    if names:
        rel.append(f"its object-model rows name {', '.join(names)} (an injection seam, OS-3: read the code it is handed to)")
    if named_by:
        rel.append(f"named in the object model by {', '.join(named_by)} (an injection seam, OS-3)")
    lines = [f"        Related: {'; '.join(rel)}."] if rel else []
    if e["unresolved"]:
        lines.append(f"        Imports the runner could not resolve (read them yourself): {'; '.join(e['unresolved'][:6])}")
    return lines


def module_lines(root: Path, e: dict, om: dict) -> list[str]:
    """One module's part of the scope section: its mode, what it is given, and what it is tied to."""
    names, named_by = seams(om, e["module"])
    if e["mode"] == "credited":
        return [credited_line(e)]
    return mode_lines(root, e) + related_lines(e, names, named_by)


def seams_text(scope: list[dict], om: dict) -> str:
    """The seams pass's scope (RD-32): every module, by what its code is tied to; no module's interior."""
    lines = ["Scope of this pass: the seams between these modules (S3 §4, and the injection seams the object model",
             "names), each read from both ends:"]
    for e in scope:
        lines += [f"  {e['module']}"] + related_lines(e, *seams(om, e["module"]))
    return "\n".join(lines + [""])


def scope_text(root: Path, scope: list[dict], om: dict) -> str:
    """The prompt's scope section: each module's mode, what it is given, and the diff-mode rules."""
    lines = ["Scope of this round (computed by the runner from each module's content; credited review):"]
    for e in scope:
        lines += module_lines(root, e, om)
    lines += [
        "",
        "Rules for this scope:",
        "- A DIFF module is reviewed on its changes since its base AND the unchanged code those changes depend on",
        "  or that calls them, following imports and injection seams (the object model names what each class is",
        "  handed). Read that code in full. A defect found there is a finding against the module whose code holds it.",
        "- Mechanical checks run as declared, the full suite included. A judgement check that passed at the base is",
        "  re-assessed only where the changes touch what it reads; say which checks you carried and why.",
        "- A CREDITED module is out of scope unless the scope above leads you into its code.",
        "",
    ]
    return "\n".join(lines)


def dirty_paths(root: Path, cfg: dict) -> str:
    """`git status --porcelain` of what review must not change.

    STATE.json is excluded: the SessionStart hook rewrites it on every session, so counting it would make the tree
    permanently dirty and block every review. It is session bookkeeping, not reviewed content. The PipelineGate
    store (RD-28) is excluded likewise: it is append-only and verified by its own chain, and the runner itself
    appends the pending k7 receipts before the reviewer starts. The scratch worktree (RD-29) is excluded too, in
    case a repo's .gitignore lacks it, and so are the run records the saved passes live in (2.9.0). The gate's live
    log is excluded as STATE.json is (2.9.0): every builder probe appends to it, so after any brief.py step the tree
    was dirty and the round refused (LedgerCore V2 ext-1, run 20261103T004934Z-k7-e3a1)."""
    store = re.search(r"--store\s+(\"[^\"]+\"|'[^']+'|\S+)", cfg.get("pipelinegate_command") or "")
    store_rel = store.group(1).strip("\"'") if store else ".pipelinegate"
    return git(root, "status", "--porcelain", "--", ".", ":(exclude)STATE.json", f":(exclude){store_rel}",
               f":(exclude){SCRATCH.split('/')[0]}", f":(exclude){kp.RUNS}",
               ":(exclude).metaframework/gate-live.jsonl")


def structure(root: Path, cfg: dict) -> dict:
    """structure-check, and emission-check on the S3 (with the S2) when project.json declares it."""
    struct = run_tool(root, "structure-check.py", "--root", str(root))
    s3_doc, p2_doc = cfg.get("s3_document") or "", cfg.get("s2_document") or ""
    if not s3_doc:
        return struct
    em = run_tool(root, "emission-check.py", s3_doc, *(["--phase2", p2_doc] if p2_doc else []))
    return {"status": "fail" if "fail" in (struct["status"], em["status"]) else "pass",
            "violations": struct["violations"] + em["violations"]}


def print_lines(lines: list[str]) -> None:
    for line in lines:
        print(f"  {line}", file=sys.stderr)


def preflight(root: Path, cfg: dict) -> tuple[bool, dict, str]:
    """(was the tree clean, the structure-check result, '' or the refusal). 2.6.17: the gate install comes first,
    since a round reviewing work built where the gate did not reach reviews rules nobody was held to."""
    gates = gate_problems(root, cfg)
    if gates:
        print_lines([f"{p['rule']}: {p['detail']}" for p in gates[:10]])
        return False, {}, "the gate install is incomplete (lines above; python3 tools/phase4-checks.py gates). K7 not spawned."
    dirty, struct = dirty_paths(root, cfg), structure(root, cfg)
    if dirty:
        print_lines(dirty.splitlines()[:20])
        return False, struct, ("working tree is dirty (lines above); K7 reviews a committed tree only. A kept raw "
                               "output or a prior verdict is evidence: commit it, or discard it, then re-run.")
    if struct["status"] == "fail":
        print_lines([f"{v.get('file','')}: {v.get('rule')}: {v.get('detail')}" for v in struct["violations"][:10]])
        return True, struct, f"preflight failed with {len(struct['violations'])} violation(s); K7 not spawned"
    return True, struct, ""


class Refused(Exception):
    """A round that stops: main says why (die) and exits with the code, 1 for a refusal, 2 for a bad call."""

    def __init__(self, msg: str, code: int = 1) -> None:
        super().__init__(msg)
        self.code = code


class TimedOut(Exception):
    """A reviewer stopped at the pass's limit, with everything it had written (2.9.0: kept, never discarded)."""

    def __init__(self, stdout: str, stderr: str) -> None:
        super().__init__("the reviewer exceeded its time")
        self.stdout, self.stderr = stdout, stderr
        self.started = self.completed = ""


Saved = kp.Saved


@dataclass(frozen=True)
class Round:
    """What the runner fixes before the reviewer starts. Every field here is the runner's: none is the reviewer's."""
    root: Path
    cfg: dict
    inst: Path
    rnd: int
    tree: str
    commit: str
    anchor: list
    prior: dict | None
    om: dict
    modules: list
    scope: list
    struct: dict
    clean_before: bool
    seal_note: str
    kind: str = "round"


@dataclass(frozen=True)
class Pass:
    """One reviewer run inside a round (RD-32): its name, the scope it is handed, what it is told to run, and the
    prompt's scope section."""
    name: str
    scope: list
    battery: str
    scope_text: str


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--modules", default="")
    kind = ap.add_mutually_exclusive_group()
    kind.add_argument("--full", action="store_true",
                      help="review every module in scope in full (the owner's call, or the seal's backstop)")
    kind.add_argument("--checkpoint", action="store_true",
                      help="RD-32's foundation checkpoint: CC-1, CC-2 and CC-4 on the foundation modules")
    kind.add_argument("--final", action="store_true",
                      help="RD-32's final review: every module in full, one pass per facet, then one across the seams")
    ap.add_argument("--timeout", type=int, default=None,
                    help=f"seconds per reviewer pass; else project.json's k7_timeout, else {TIMEOUT_S}")
    ap.add_argument("--dry-run", action="store_true",
                    help="run preflight and print the prompt; spawn nothing")
    saved = ap.add_mutually_exclusive_group()
    saved.add_argument("--fresh", action="store_true",
                       help="run every pass again, discarding the passes this round has saved")
    saved.add_argument("--refile", action="store_true",
                       help="file the round from its saved passes only; spawn no reviewer (SR-2)")
    ap.add_argument("--repair", default="",
                    help="a script run on each pass's verdict object (JSON in, JSON out) before filing (SR-2)")
    ap.add_argument("--from-raw", default="",
                    help="with --refile and --run: a review kept before 2.9.0 (INSTRUMENTS/k7-raw-<n>.txt) to file")
    ap.add_argument("--run", default="", help="the run.py run id that produced --from-raw's review")
    return ap.parse_args()


def read_json(path: Path):
    """A file's JSON; a file that cannot be read is a bad call."""
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        raise Refused(f"cannot read {path}: {e}", 2)


def inputs(root: Path) -> tuple:
    """(project.json, the verdict schema). A root that is no repository, or no jsonschema, is a bad call."""
    if not (root / ".git").exists():
        raise Refused(f"{root} is not a git repository", 2)
    try:
        import jsonschema  # noqa: F401  validate_verdict uses it
    except ImportError:
        raise Refused("jsonschema not installed (pip install jsonschema). A gate "
                      "that cannot validate its own output is not a gate.", 2)
    cfg = read_json(root / ".metaframework" / "project.json")
    return cfg, read_json(root / "governance" / "k7-verdict.schema.json")


def guard_round(root: Path, cfg: dict, inst: Path, args: argparse.Namespace) -> tuple[bool, dict, str]:
    """The phase and seal guard, the close's order (2.8.0), then preflight: (clean before, structure check, seal
    note)."""
    refusal, seal_note = seal_guard(root, cfg, bool(args.modules))
    if refusal:
        raise Refused(refusal)
    order = order_refusal(root, inst, round_kind(args), cfg.get("ui_root") or "ui")
    if order:
        raise Refused(order)
    clean_before, struct, refusal = preflight(root, cfg)
    if refusal:
        raise Refused(refusal)
    return clean_before, struct, seal_note


def round_kind(args: argparse.Namespace) -> str:
    return "checkpoint" if args.checkpoint else "final" if args.final else "round"


def foundation_modules(inst: Path) -> list[str]:
    """The modules C4 named as the foundation (RD-32): the anchor record's "Foundation modules" line."""
    try:
        text = (inst / C4_RECORD).read_bytes().decode("utf-8")
    except OSError:
        return []
    line = re.search(r"Foundation modules\b[^\n]*", text)
    return sorted(set(re.findall(r"\bMOD-\d+\b", line.group(0))), key=lambda m: int(m[4:])) if line else []


def round_modules(args: argparse.Namespace, inst: Path, om: dict) -> list[str]:
    """The modules a round reviews: --modules; for a checkpoint, else the foundation C4 named; else every module."""
    named = [m for m in args.modules.split(",") if m]
    if named or not args.checkpoint:
        return named or sorted(om)
    found = foundation_modules(inst)
    if not found:
        raise Refused(f"a checkpoint reviews the foundation modules: name them with --modules, or on the \"Foundation "
                      f"modules\" line of INSTRUMENTS/{C4_RECORD} (C4, from the S3's build order)", 2)
    return found


def fix_round(root: Path, cfg: dict, args: argparse.Namespace) -> Round:
    """The round: its guards, the commit it reviews, and each module's mode (credited review; RD-32's checkpoint and
    final review take every module in scope whole)."""
    inst = root / "INSTRUMENTS"
    inst.mkdir(exist_ok=True)
    clean_before, struct, seal_note = guard_round(root, cfg, inst, args)
    tree = git(root, "rev-parse", "HEAD^{tree}")
    commit = git(root, "rev-parse", "HEAD")
    anchor = git(root, "tag", "-l", "s3-anchor-*").splitlines()
    rnd = next_round(inst)
    prior = load_prior(inst, rnd)
    om = mf.object_model(root, set(git(root, "ls-files").splitlines()))
    modules = round_modules(args, inst, om)
    unknown = [m for m in modules if m not in om]
    if unknown:
        raise Refused(f"{', '.join(unknown)} not in INSTRUMENTS/object-model-and-parameters.md (with a File "
                      f"the repo tracks); a module enters the object model before it is reviewed")
    kind = round_kind(args)
    scope = mf.scope(root, cfg, inst, modules, args.full or kind != "round")
    if kind == "checkpoint":
        scope = [{**e, "mode": "checkpoint"} for e in scope]
    return Round(root, cfg, inst, rnd, tree, commit, anchor, prior, om, modules, scope, struct, clean_before, seal_note,
                 kind)


def facets(rd: Round) -> dict[str, list[str]]:
    """{facet: its modules} for the final review: the facet each S3 §2 Module cell names, "(facet FB)". Modules that
    name none form one group of their own."""
    import brief                                       # the S3 readers the builder's brief uses
    named = {}
    for _, _, rows in brief.tables(brief.sections(brief.read(rd.root, rd.cfg.get("s3_document") or "")).get("2", [])):
        for c in map(brief.cells, rows):
            m = re.search(r"\(facet\s+([^)]+)\)", c[1]) if len(c) > 1 else None
            if m:
                named[c[0]] = m.group(1).strip()
    groups: dict[str, list[str]] = {}
    for m in rd.modules:
        groups.setdefault(named.get(m) or ("other" if named else "all"), []).append(m)
    return groups


def passes(rd: Round) -> list[Pass]:
    """The reviewer runs a round is made of: one, or for the final review one per facet and one across the seams."""
    if rd.kind != "final":
        return [Pass(rd.kind, rd.scope, CHECKPOINT_BATTERY if rd.kind == "checkpoint" else BATTERY,
                     scope_text(rd.root, rd.scope, rd.om))]
    out = []
    for facet, mods in facets(rd).items():
        scope = [e for e in rd.scope if e["module"] in mods]
        out.append(Pass(facet, scope, FACET_BATTERY.format(facet=facet), scope_text(rd.root, scope, rd.om)))
    return out + [Pass("seams", rd.scope, SEAMS_BATTERY, seams_text(rd.scope, rd.om))]


def credited_note(scope: list[dict]) -> str:
    """Why a round whose every module is credited spends nothing."""
    return ("k7-run: every module in scope is credited (its content was reviewed in a concluded round): "
            + ", ".join(f"{e['module']} by " + (f"round {e['credit_round']}" if e.get("credit") == "verdict" else "its receipts")
                        for e in scope)
            + ". Nothing to review; no round spent. Pass --full to review anyway.")


def store_inputs(rd: Round) -> tuple[dict, str]:
    """RD-28, when the repo declares its PipelineGate store: (each module built, the reviewer's charter digest); ({},
    '') with no store. The builder's battery, and the refusal of content without its receipt, are cut (2.8.0)."""
    root, cfg = rd.root, rd.cfg
    if not rc.enabled(cfg):
        return {}, ""
    try:
        return mf.build(root, cfg), rc.charter(root, cfg)
    except rc.PgError as exc:
        raise Refused(f"the PipelineGate store could not answer: {exc}")


def compose_prompt(rd: Round, p: Pass) -> str:
    """The reviewer's prompt for one pass of this round."""
    cfg = rd.cfg
    return PROMPT.format(
        root=rd.root, s3=cfg.get("s3_document") or "(governance/S3)", rnd=rd.rnd, basis=basis.listing(rd.root, cfg),
        scratch=SCRATCH, scratch_tool=SCRATCH_TOOL,
        modules=", ".join(e["module"] for e in p.scope),
        scope_text=p.scope_text, battery=p.battery,
        test_command=cfg.get("test_command") or "(undeclared)",
        test_select=cfg.get("test_select") or "(undeclared)",
        rederive_all=cfg.get("rederive_all") or "(undeclared)",
        seal_note=rd.seal_note)


def reviewer_agent(cfg: dict) -> str:
    return cfg.get("reviewer_agent") or ".claude/agents/k7-reviewer.md"


def reviewer_argv(cfg: dict, root: Path) -> list[str]:
    """The reviewer's command line with the runner's grant, or the refusal of a command that would widen it."""
    cmd, refusal = reviewer_command(cfg, reviewer_agent(cfg), root)
    if refusal:
        raise Refused(refusal)
    return cmd


def pending_receipts(rd: Round, reviewing: list[dict], built: dict, agent_def: str) -> None:
    """The pending receipts: one per module handed to the reviewer. The engine refuses a reviewer whose charter is not
    the one the pinned k7_verdict pins (DECIDER_NOT_IN_RUBRIC): caught here, before a round is spent."""
    for e in reviewing:
        try:
            ans = rc.k7(rd.root, rd.cfg, built[e["module"]]["manifest"], rc.Review(agent_def))
        except rc.PgError as exc:
            raise Refused(f"the k7 receipt for {e['module']} could not be appended: {exc}")
        if rc.nu(ans) != "LATENT":
            raise Refused(f"the engine answered {rc.nu(ans)} for {e['module']} at k7, not a pending review. A charter "
                          f"whose digest ({agent_def[:19]}…) is not the one the pinned k7_verdict pins refuses as "
                          f"DECIDER_NOT_IN_RUBRIC: the owner admits a new version (tools/receipts.py setup). K7 not spawned.")


def reviewer_process(cmd: list[str], prompt: str, timeout: int, root: Path) -> subprocess.CompletedProcess:
    """The reviewer's run, its output read as UTF-8, not the locale: on Windows a cp1252 read of the reviewer's output
    lost K7 round 12 whole. While it runs, one line every PROGRESS_S seconds (2.8.0): started through tools/run.py, a
    pass longer than a quarter of an hour would otherwise leave the log quiet and be read as stalled."""
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            encoding="utf-8", errors="replace", cwd=str(root),
                            env={**os.environ, "CLAUDE_NO_RESUME": "1"})
    begun, given = time.monotonic(), prompt
    while True:
        left = timeout - (time.monotonic() - begun)
        try:
            out, err = proc.communicate(given, timeout=max(1.0, min(PROGRESS_S, left)))
            return subprocess.CompletedProcess(cmd, proc.returncode, out, err)
        except subprocess.TimeoutExpired:
            given = None                             # the prompt went in with the first call
            if time.monotonic() - begun >= timeout:
                proc.kill()
                out, err = proc.communicate()        # everything it wrote: a retried communicate loses nothing
                raise TimedOut(out or "", err or "")
            print(f"k7-run: the reviewer is still running ({int((time.monotonic() - begun) // 60)} min)", flush=True)


def run_reviewer(rd: Round, cmd: list[str], prompt: str, timeout: int) -> tuple[subprocess.CompletedProcess, str, str]:
    """The reviewer, run in its own worktree (RD-29), which goes however the run ends: (process, started, completed)."""
    problem = scratch_up(rd.root, rd.commit)
    if problem:
        raise Refused(f"the reviewer's worktree could not be made at {SCRATCH}: {problem}. K7 not spawned.")
    started = now()
    try:
        proc = reviewer_process(cmd, prompt, timeout, rd.root)
    except FileNotFoundError:
        raise Refused(f"reviewer command not found: {cmd[0]}. Set reviewer_command "
                      f"in project.json.", 2)
    except TimedOut as t:
        t.started, t.completed = started, now()
        raise
    finally:
        scratch_down(rd.root)
    return proc, started, now()


def kept_refusal(rd: Round, output: str, why: str) -> Refused:
    """The refusal of an unusable review, its raw output kept first for the owner."""
    kept = keep(rd.inst, f"k7-raw-{rd.rnd}.txt", output)
    return Refused(f"{why} Raw output kept at {kept.relative_to(rd.root).as_posix()}.")


def clean_after_review(rd: Round, output: str) -> bool:
    """RD-29: the reviewer can write, so a repository changed by review is a reviewer that changed what it reviewed.
    Refused whatever the verdict says: no verdict file, no receipt."""
    clean_after = dirty_paths(rd.root, rd.cfg) == ""
    if not clean_after:
        lines = dirty_paths(rd.root, rd.cfg).splitlines()
        refusal = kept_refusal(rd, output, "the reviewer left the repository dirty (lines above): verdict REFUSED "
                                           "(RD-29). No verdict written, no receipt appended.")
        print_lines(lines[:20])
        raise refusal
    return clean_after


def supplied_verdict(rd: Round, stdout: str, output: str) -> dict:
    """The reviewer's verdict object, stripped of every field the runner owns."""
    supplied = extract_verdict(stdout.strip())
    if supplied is None:
        raise kept_refusal(rd, output, "the reviewer's output holds no readable verdict object; no verdict written. "
                                       "Read it first: a review written in a form the runner cannot read is the "
                                       "owner's (SR-2: a repair needs a readable verdict to hold to). A reviewer "
                                       "that stopped before writing one is the transient case: the same command "
                                       "runs this pass again and reuses every finished one.")
    # The reviewer does not get to certify its own independence.
    for k in RUNNER_OWNED:
        supplied.pop(k, None)
    trim_proposals(supplied)
    return supplied


def trim_proposals(supplied: dict) -> None:
    """Each proposed_tests entry keeps its four fields only. A proposal blocks nothing, and a note the reviewer adds
    beside one (LedgerCore V2 rounds 10 and 12: module_note, proposed_by_note) cost a whole review at the schema."""
    entries = supplied.get("proposed_tests")
    for n, entry in enumerate(entries if isinstance(entries, list) else []):
        extra = sorted(set(entry) - set(PROPOSAL_KEYS)) if isinstance(entry, dict) else []
        for k in extra:
            entry.pop(k)
        if extra:
            print(f"k7-run: proposed_tests[{n}]: left out {', '.join(extra)} (an entry is "
                  f"{', '.join(PROPOSAL_KEYS)})", file=sys.stderr)


def progress(rd: Round, supplied: dict) -> dict | None:
    """Whether this round changed the tree or the failing set since the prior one; None for the first round."""
    prior = rd.prior
    if prior is None:
        return None
    return {
        "prior_round": prior.get("round", rd.rnd - 1),
        "prior_tree_sha": (prior.get("reviewed") or {}).get("tree_sha", "0" * 40),
        "prior_failing_checks": failing(prior),
        "changed": not ((prior.get("reviewed") or {}).get("tree_sha") == rd.tree
                        and failing(prior) == failing(supplied)),
    }


merged = kp.merged                 # the final review's verdict from its passes (RD-32), with the passes (2.9.1)


def compose_verdict(rd: Round, timing: tuple[str, str], clean_after: bool, supplied: dict,
                    facet_runs: list | None = None) -> dict:
    """The verdict: the fields the runner owns, then the reviewer's. RD-32: the round's kind, and the final review's
    passes."""
    started, completed = timing
    reviewed = {
        "tree_sha": rd.tree, "commit_sha": rd.commit,
        "s3_anchor_tag": rd.anchor[-1] if rd.anchor else "s3-anchor-v1.0",
        "modules": rd.modules,
        "scope": [{k: e[k] for k in ("module", "mode", "manifest", "base", "base_round", "credit_round",
                                     "unresolved", "deps", "importers")} for e in rd.scope],
        "kind": rd.kind,
    }
    if facet_runs:
        reviewed["facets"] = facet_runs
    return {
        "schema_version": "1.0",
        "concept": rd.cfg.get("concept") or rd.root.name,
        "round": rd.rnd,
        "reviewed": reviewed,
        "reviewer": {
            "agent": "k7-reviewer", "invocation": "subprocess",
            "builder_transcript_seen": False,
            "started_at": started, "completed_at": completed,
        },
        "preflight": {
            "structure_check": rd.struct,
            "worktree_clean_before": rd.clean_before,
            "worktree_clean_after": clean_after,
        },
        "progress": progress(rd, supplied),
        **supplied,
    }


def validate_verdict(rd: Round, verdict: dict, schema: dict, output: str) -> None:
    """The verdict against governance/k7-verdict.schema.json; a non-conforming one is refused, its raw output kept."""
    import jsonschema
    try:
        jsonschema.validate(verdict, schema)
    except jsonschema.ValidationError as e:
        path = "/".join(str(p) for p in e.absolute_path) or "(root)"
        raise kept_refusal(rd, output, f"verdict failed schema at {path}: {e.message}\n"
                                       f"No verdict written. The review finished and every pass is saved: this is a "
                                       f"seam fault (SR-2), so do not run the review again. Write a script that "
                                       f"repairs the form (a pass's verdict object as JSON on stdin, the repaired "
                                       f"object on stdout) and file the round with it: k7-run.py <this round's "
                                       f"flags> --refile --repair <script>.")


def accept_receipts(rd: Round, e: dict, manifest: dict, agent_def: str, transcript: str) -> None:
    """The reviewer's ACCEPT at k7 on a module it passed, and at full-review when it reviewed the module in full."""
    ans = rc.k7(rd.root, rd.cfg, manifest, rc.Review(agent_def, transcript, "ACCEPT"))
    print(f"k7-run: {e['module']} k7 receipt: {rc.nu(ans)}")
    if e["mode"] == "full":       # the seal's backstop, as a receipt the verdict file cannot fake
        ans = rc.k7(rd.root, rd.cfg, manifest, rc.Review(agent_def, transcript, "ACCEPT", "full-review"))
        print(f"k7-run: {e['module']} full-review receipt: {rc.nu(ans)}")


def pass_receipts(rd: Round, reviewing: list[dict], built: dict, agent_def: str, stdout: str) -> None:
    """A PASS's receipts for every module the reviewer was handed."""
    transcript = "sha256:" + hashlib.sha256(stdout.encode("utf-8")).hexdigest()
    for e in reviewing:
        try:
            accept_receipts(rd, e, built[e["module"]]["manifest"], agent_def, transcript)
        except rc.PgError as exc:          # the verdict stands; without the receipt the module is simply not credited
            print(f"k7-run: WARNING the k7 ACCEPT for {e['module']} was not appended ({exc}); it will be reviewed "
                  f"again rather than credited", file=sys.stderr)


def with_session(cmd: list[str]) -> tuple[list[str], str]:
    """A Claude Code reviewer's command with a session id of its own (2.8.1), so the round's tokens are measured from
    its transcript (tools/spend.py add --measured --session-id): (argv, the id). A command that is not Claude Code,
    or that names its session or keeps none, comes back as it is, with no id."""
    if Path(cmd[0]).name.lower() not in ("claude", "claude.exe") or any(
            a.split("=", 1)[0] in SESSION_FLAGS for a in cmd[1:]):
        return cmd, ""
    session = str(uuid.uuid4())
    return cmd + ["--session-id", session], session


def pass_output(rd: Round, p: Pass, stdout: str, stderr: str) -> str:
    """A pass's output as the runner keeps it on a refusal."""
    label = "" if rd.kind != "final" else f"--- pass {p.name} ---\n"
    return f"{label}--- stdout ---\n{stdout}\n--- stderr ---\n{stderr}\n"


def pass_verdict(rd: Round, stdout: str, output: str) -> dict:
    """A pass's verdict object as the round files it. A checkpoint's checks are CC-1, CC-2 and CC-4 only."""
    supplied = supplied_verdict(rd, stdout, output)
    if rd.kind == "checkpoint" and isinstance(supplied.get("checks"), dict):
        supplied["checks"] = {k: v for k, v in supplied["checks"].items() if k in CHECKPOINT_CHECKS}
    return supplied


def reviewer_call(rd: Round, cmd: list[str], p: Pass, saved: Saved, fp: str) -> tuple[list[str], str, str]:
    """(argv, session, prompt) for a pass's reviewer. A pass this round saved as timed out, with its session, resumes
    in that session (2.9.0): its reading and findings carry over. Any other starts a session of its own (2.8.1)."""
    resume = "" if saved.fresh else kp.timed_out(saved.folder, p.name, fp)
    if resume:
        print(f"k7-run: pass {p.name}: resuming reviewer session {resume}, which timed out", flush=True)
        return cmd + ["--resume", resume], resume, kp.CONTINUE.format(scratch=SCRATCH)
    argv, session = with_session(cmd)
    if session:
        print(f"k7-run: reviewer session {session}", flush=True)     # in the run's log before the pass can fail
    return argv, session, compose_prompt(rd, p)


def attempts(rd: Round, call: tuple, timeout: int, saved: Saved, base: dict) -> tuple:
    """The reviewer run, call being (the reviewer command, this run's argv, its prompt); after each timeout, the same
    session resumed, up to k7_resumes times (2.9.0; default k7_passes.RESUMES). Each timeout is saved before anything
    else. A pass that still times out is refused, its session kept for the next run of the same command to resume."""
    cmd, argv, prompt = call
    left = int(rd.cfg.get("k7_resumes", kp.RESUMES))
    while True:
        try:
            return run_reviewer(rd, argv, prompt, timeout)
        except TimedOut as t:
            kept = kp.save(saved.folder, base["pass"], kp.record(**base, started=t.started, completed=t.completed,
                                                                 status="timeout", exit_code=None, stdout=t.stdout,
                                                                 stderr=t.stderr))
            if left <= 0 or not base["session"]:
                raise Refused(timeout_refusal(rd, base, timeout, kept))
        left, base["resumed"] = left - 1, base["resumed"] + 1
        print(f"k7-run: pass {base['pass']}: the reviewer reached {timeout}s; resuming its session "
              f"{base['session']}", flush=True)
        argv, prompt = cmd + ["--resume", base["session"]], kp.CONTINUE.format(scratch=SCRATCH)


def timeout_refusal(rd: Round, base: dict, timeout: int, kept: Path) -> str:
    return (f"pass {base['pass']}: the reviewer exceeded {timeout}s ({base['resumed']} resumed); no verdict written. Its "
            f"session ({base['session'] or 'none'}) and partial output are kept at "
            f"{kept.relative_to(rd.root).as_posix()}, and every finished pass is saved. A timeout is not a seam fault: "
            f"raise k7_timeout in .metaframework/project.json (or pass --timeout), then the same command resumes this "
            f"pass in its session and runs only the passes still missing.")


def run_pass(rd: Round, cmd: list[str], p: Pass, timeout: int, saved: Saved) -> tuple[dict, str, str, str, str, str]:
    """One reviewer run in its own worktree, saved the moment it ends (2.9.0), before anything reads it: (its verdict
    object, its stdout, the output kept on a refusal, started, completed, the reviewer's session id or "")."""
    fp = kp.fingerprint(rd.kind, p.name, p.scope, saved.charter)
    argv, session, prompt = reviewer_call(rd, cmd, p, saved, fp)
    if session and session not in saved.sessions:
        saved.sessions.append(session)
    base = {"round": rd.rnd, "kind": rd.kind, "pass": p.name, "modules": [e["module"] for e in p.scope],
            "fingerprint": fp, "commit": rd.commit, "tree": rd.tree, "session": session, "resumed": 0}
    proc, started, completed = attempts(rd, (cmd, argv, prompt), timeout, saved, base)
    status = "finished" if dirty_paths(rd.root, rd.cfg) == "" else "dirty"     # RD-29: a dirty one is never reused
    kp.save(saved.folder, p.name, kp.record(**base, started=started, completed=completed, status=status,
                                            exit_code=proc.returncode, stdout=proc.stdout, stderr=proc.stderr))
    output = pass_output(rd, p, proc.stdout, proc.stderr)
    clean_after_review(rd, output)
    return pass_verdict(rd, proc.stdout, output), proc.stdout, output, started, completed, session


def saved_pass(rd: Round, p: Pass, saved: Saved) -> tuple | None:
    """The finished review this round saved for the pass (2.9.0), standing for it as run_pass's result; None when the
    pass must run. With --refile a pass that cannot be reused stops the round: --refile spawns no reviewer."""
    if saved.fresh:
        return None
    rec, why = kp.reusable(saved.folder, p.name, kp.fingerprint(rd.kind, p.name, p.scope, saved.charter),
                           extract_verdict)
    if rec is None:
        if saved.refile:
            raise Refused(f"--refile: pass {p.name} has no saved review to file ({why}). --refile files finished "
                          f"reviews only; without it the same command runs the passes still missing.")
        if why != "none saved":
            print(f"k7-run: pass {p.name}: the saved run is not reused ({why}); running it", flush=True)
        return None
    output = pass_output(rd, p, rec["stdout"], rec.get("stderr") or "")
    supplied = pass_verdict(rd, rec["stdout"], output)
    saved.reused[p.name] = rec
    print(f"k7-run: pass {p.name}: reused the review saved {rec.get('completed')} (reviewer session "
          f"{rec.get('session') or 'none'}, commit {str(rec.get('commit'))[:12]}); not run again", flush=True)
    return supplied, rec["stdout"], output, rec.get("started") or "", rec.get("completed") or "", rec.get("session") or ""


def repaired(rd: Round, p: Pass, supplied: dict, saved: Saved) -> dict:
    """SR-2: the repair script's object in place of the pass's, when what it changed is form only (2.9.0)."""
    try:
        fixed = kp.run_repair(saved.repair, supplied, rd.root)
    except kp.RepairRefused as exc:
        raise Refused(f"pass {p.name}: {exc}. No verdict written; the saved passes are kept.")
    changes, faults = kp.form_changes(supplied, fixed, saved.schema)
    if faults:
        print_lines(faults[:20])
        raise Refused(f"pass {p.name}: the repair changes what the review says (lines above), so this is not a seam "
                      f"fault: under SR-2 it goes to the owner. No verdict written; the saved passes are kept.")
    saved.changes[p.name] = changes
    for c in changes:
        print(f"k7-run: pass {p.name}, repaired: {c}")
    return fixed


def take_pass(rd: Round, cmd: list[str], p: Pass, timeout: int, saved: Saved) -> tuple:
    """One pass of the round as review() keeps it, (the pass, then run_pass's fields): reused when this round saved
    it, else run; repaired when --repair names a script."""
    if rd.kind == "final":
        print(f"k7-run: final review, pass {p.name}: {', '.join(e['module'] for e in p.scope)}")
    run = saved_pass(rd, p, saved) or run_pass(rd, cmd, p, timeout, saved)
    return (p, repaired(rd, p, run[0], saved) if saved.repair else run[0], *run[1:])


def print_spend_line(rd: Round, sessions: list[str]) -> None:
    """The command that adds the tokens of the reviewer sessions this run started (TE-7, 2.8.1), printed however the
    round ends (2.9.0): a pass reused from an earlier run is that run's spend."""
    if sessions:
        print(f'k7-run: this round\'s tokens: python tools/spend.py add --stage "k7:round-{rd.rnd} {rd.kind}" '
              f"--measured --session-id {','.join(sessions)}")


def review(rd: Round, cmd: list[str], timeout: int, saved: Saved) -> tuple[dict, str, str, tuple[str, str], list]:
    """Every pass of the round, one after another, each reused when this round saved it before: (the round's verdict
    object, the stdouts, the outputs kept on a refusal, (started, completed), the final review's facet runs)."""
    runs = []
    try:
        for p in passes(rd):
            runs.append(take_pass(rd, cmd, p, timeout, saved))
    finally:
        print_spend_line(rd, saved.sessions)
    timing = (runs[0][4], runs[-1][5])
    stdout, output = "\n".join(r[2] for r in runs), "\n".join(r[3] for r in runs)
    if rd.kind != "final":
        return runs[0][1], stdout, output, timing, []
    facet_runs = [{"facet": p.name, "modules": [e["module"] for e in p.scope], "verdict": s.get("verdict")}
                  for p, s, *_ in runs]
    return merged([(p.name, s) for p, s, *_ in runs]), stdout, output, timing, facet_runs


def pass_timeout(args: argparse.Namespace, cfg: dict) -> int:
    """Seconds per reviewer pass: --timeout, else project.json's k7_timeout (2.9.0), else TIMEOUT_S. A final review's
    facet pass outgrew a fixed 1800 (LedgerCore V2 ext-1, run 20261103T142110Z-k7-971b)."""
    return args.timeout or int(cfg.get("k7_timeout") or TIMEOUT_S)


def saved_for(rd: Round, schema: dict, args: argparse.Namespace) -> Saved:
    """This run's handling of the round's saved passes (2.9.0)."""
    repair = Path(args.repair).resolve() if args.repair else None
    if repair is not None and not repair.is_file():
        raise Refused(f"--repair {args.repair}: no such file", 2)
    return Saved(kp.round_dir(rd.root, rd.rnd), kp.charter_digest(rd.root, reviewer_agent(rd.cfg)), args.fresh,
                 args.refile, repair, schema, {}, {}, [])


def import_kept(rd: Round, saved: Saved, args: argparse.Namespace) -> None:
    """--from-raw (2.9.1): a review kept before 2.9.0 saved its passes, imported as this round's saved passes for
    --refile to file. Each pass must be found in its reviewer's transcript (k7_passes.import_raw)."""
    if not args.from_raw:
        return
    if not (args.refile and args.run):
        raise Refused("--from-raw files a kept review: give it with --refile and --run <the run.py run id>", 2)
    try:
        names = kp.import_raw(rd.root, {"rnd": rd.rnd, "kind": rd.kind, "agent": reviewer_agent(rd.cfg)},
                              [(p.name, p.scope) for p in passes(rd)], saved,
                              kp.Source((rd.root / args.from_raw).resolve(), args.run))
    except kp.ImportRefused as exc:
        raise Refused(f"--from-raw: {exc}. Nothing imported, no verdict written.")
    print(f"k7-run: imported pass {', '.join(names) or '(none)'} from {args.from_raw} (run {args.run}), each found in "
          f"its reviewer's transcript", flush=True)


def record_passes(rd: Round, saved: Saved) -> None:
    """SR-2's record, beside the verdict, when a pass was reused or repaired (2.9.0): each pass's reviewer session,
    the commit it reviewed and the digest of its output; and the repair script, kept, with every change it made."""
    if not (saved.reused or saved.repair):
        return
    path = kp.record_round(saved, rd.root, rd.inst, {"round": rd.rnd, "kind": rd.kind, "filed_at": now(),
                                                     "filed_at_commit": rd.commit}, [p.name for p in passes(rd)])
    print(f"k7-run: the round's passes, reused and repaired, recorded in {path.name}: commit it with the verdict")


def dry_run(rd: Round, cmd: list[str]) -> int:
    """--dry-run: every pass's prompt, and the command that would start the reviewer; nothing spawned."""
    print("\n\n".join(compose_prompt(rd, p) for p in passes(rd)))
    print("k7-run: reviewer command: " + shlex.join(cmd), file=sys.stderr)
    return 0


def run_round(args: argparse.Namespace) -> int:
    """One round, from its guards to its receipts. A round that stops raises Refused."""
    root = Path(args.root).resolve()
    cfg, schema = inputs(root)
    rd = fix_round(root, cfg, args)
    if all(e["mode"] == "credited" for e in rd.scope):
        print(credited_note(rd.scope))
        return 0
    reviewing = [e for e in rd.scope if e["mode"] != "credited"]
    built, agent_def = store_inputs(rd)
    cmd = reviewer_argv(cfg, root)
    if args.dry_run:
        return dry_run(rd, cmd)
    saved = saved_for(rd, schema, args)
    import_kept(rd, saved, args)
    receipted = rc.enabled(cfg) and rd.kind != "checkpoint"     # a checkpoint credits nothing (RD-32)
    if receipted:
        pending_receipts(rd, reviewing, built, agent_def)
    supplied, stdout, output, timing, facet_runs = review(rd, cmd, pass_timeout(args, cfg), saved)
    verdict = compose_verdict(rd, timing, True, supplied, facet_runs)
    halt_without_progress(verdict)
    validate_verdict(rd, verdict, schema, output)
    out = write_verdict(rd.inst, rd.rnd, verdict)
    print(f"k7-run: round {rd.rnd} ({rd.kind}) -> {verdict['verdict']} "
          f"(drift {verdict['drift_score']['value']}) written to {out.name}")
    record_passes(rd, saved)
    report_proposals(rd.inst, rd.rnd, verdict, out.name)
    if receipted and verdict["verdict"] == "PASS":
        pass_receipts(rd, reviewing, built, agent_def, stdout)
    return 0


def main() -> int:
    args = parse_args()
    try:
        return run_round(args)
    except Refused as r:
        return die(str(r), r.code)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")      # every tool writes UTF-8 (2.8.0)
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
