"""k7_passes: a K7 round's reviewer passes kept on disk as each one ends, and the repair of a finished one (2.9.0).

LedgerCore V2, 3 Nov 2026: a final review held every finished pass in memory, so a 30-minute pass that timed out
took the passes before it with it, and round 19 (20 minutes, 9.25M tokens) was refused at the schema because the
reviewer wrote its deductions as negative numbers. The owner: "Each step should be backed up for complex tasks like
k7". SR-2 (Projects/CLAUDE.md rule 13): a seam fault in a finished run is repaired and filed, never re-run.

  - Each pass is written to .metaframework/runs/k7-round-<n>/pass-<name>.json the moment its reviewer exits, before
    anything reads it: its output, the reviewer's session id, the commit it reviewed, and its fingerprint (the round's
    kind, the pass, each module's mode and credited-review manifest as manifests.scope gives them, and the charter's
    digest). The folder is gitignored with the other run records and outside the reviewer's grant.
  - A pass is reused when its fingerprint matches, its output still hashes to the recorded digest, the output appears
    in the reviewer's own Claude Code transcript where that is on this machine, and it holds a readable verdict. The
    fingerprint is the reviewed content, not HEAD, as credited review (RD-27) carries a verdict across commits: a tool
    fix committed after the review does not cost the review.
  - A repair (k7-run.py --repair SCRIPT) is a script the runner runs on each pass's verdict object: the object as JSON
    on its stdin, the repaired object as JSON on its stdout. form_changes() holds it to SR-2's objective test: every
    judgement identical before and after. Anything else is refused as not a seam fault.
  - A review kept before 2.9.0 (2.9.1; LedgerCore V2 ext-1's final review, round 19, refused at the schema on a
    deduction of -1 after 21.3M tokens) has no saved passes, only k7-raw-<n>.txt. import_raw() makes them from it:
    each pass's output from the raw file, its reviewer session from the run's log, the commit it reviewed from the
    run's start, and its fingerprint from the content at that commit. Each pass's output must be found in its
    reviewer's own transcript, or nothing is imported. --refile then reuses them as it reuses any saved pass, so a
    module changed since the review is not filed.
"""
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

RUNS = ".metaframework/runs"
RESUMES = 1                                                  # a timed-out pass's resumes per run, unless k7_resumes says
# What a timed-out reviewer is told when its own session is resumed. Its reading and findings carry over in the session;
# the worktree does not, because the runner rebuilds it for every reviewer run.
CONTINUE = """\
Your time for this pass ran out before you returned the verdict. Continue the same review from where you
stopped; do not start it over. The worktree at {scratch} has been rebuilt at the reviewed commit, so any
mutation you had planted is gone: plant again only what you still need. Then return the ONE JSON object
exactly as your first instructions say."""
# The fields that are the reviewer's judgement: a repair may change how one is written, never what it says.
JUDGEMENT_LAST = ("verdict", "status", "check_id", "module", "required_change", "finding", "next_action",
                  "mechanical", "exit_code", "command", "rationale")
JUDGEMENT_PATHS = (("drift_score", "value"),)


class RepairRefused(Exception):
    """A repair that failed to run, or that changed a judgement: not a seam fault."""


class ImportRefused(Exception):
    """A kept review that cannot be shown to be the reviewer's own output over the content it names (2.9.1)."""


@dataclass(frozen=True)
class Source:
    """A review kept before 2.9.0: its raw output file and the run.py run that produced it."""
    raw: Path
    run: str


@dataclass
class Saved:
    """What one run of a round does with the passes it has saved: reuse them unless --fresh, run none when --refile,
    repair each with --repair; and what it did: the passes reused, the repair's changes, the sessions it started."""
    folder: Path
    charter: str
    fresh: bool = False
    refile: bool = False
    repair: Path | None = None
    schema: dict | None = None
    reused: dict | None = None
    changes: dict | None = None
    sessions: list | None = None


def sha(text: str) -> str:
    return "sha256:" + hashlib.sha256(text.encode("utf-8")).hexdigest()


def round_dir(root: Path, rnd: int) -> Path:
    return root / RUNS / f"k7-round-{rnd}"


def pass_file(folder: Path, name: str) -> Path:
    return folder / f"pass-{re.sub(r'[^A-Za-z0-9_.-]', '_', name)}.json"


def charter_digest(root: Path, agent: str) -> str:
    """The reviewer's charter, by content: a pass reviewed under another charter is not reused."""
    try:
        return "sha256:" + hashlib.sha256((root / agent).read_bytes()).hexdigest()
    except OSError:
        return ""


def fingerprint(kind: str, name: str, scope: list[dict], charter: str) -> str:
    """What a pass reviewed: the round's kind, the pass, each module with its mode and manifest, and the charter."""
    body = {"kind": kind, "pass": name, "charter": charter,
            "scope": [[e.get("module"), e.get("mode"), e.get("manifest")] for e in scope]}
    return sha(json.dumps(body, sort_keys=True))


def save(folder: Path, name: str, record: dict) -> Path:
    """The pass's record, written whole or not at all (a temp file renamed over it)."""
    folder.mkdir(parents=True, exist_ok=True)
    path = pass_file(folder, name)
    fd, tmp = tempfile.mkstemp(dir=folder, prefix=".pass-", suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as f:
        json.dump(record, f, indent=2, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp, path)
    return path


def record(**fields) -> dict:
    """A pass record, schema 1: the fields k7-run gives, and the digest of the output."""
    return {"schema": 1, **fields, "stdout_sha256": sha(fields.get("stdout") or "")}


def record_round(saved: Saved, root: Path, inst: Path, head: dict, names: list[str]) -> Path:
    """SR-2's record, beside the verdict, of a round that reused or repaired a pass: each pass's reviewer session, the
    commit it reviewed and the digest of its output; and the repair script, kept, with every change it made."""
    entries = []
    for name in names:
        rec = json.loads(pass_file(saved.folder, name).read_text(encoding="utf-8"))
        entries.append({"pass": name, "modules": rec.get("modules"), "session": rec.get("session"),
                        "commit": rec.get("commit"), "started": rec.get("started"), "completed": rec.get("completed"),
                        "stdout_sha256": rec.get("stdout_sha256"), "resumed": rec.get("resumed", 0),
                        "reused": name in saved.reused,
                        "repaired": saved.changes.get(name, [])})
    body = {**head, "passes": entries}
    if saved.repair:
        text = saved.repair.read_text(encoding="utf-8").replace("\r\n", "\n")
        script = inst / f"k7-repair-{head['round']}.py"
        script.write_bytes(text.encode("utf-8"))
        body["repair"] = {"script": script.relative_to(root).as_posix(), "sha256": sha(text),
                          "rule": "SR-2 (Projects/CLAUDE.md rule 13)"}
    path = inst / f"k7-round-{head['round']}-passes.json"
    path.write_bytes((json.dumps(body, indent=2, ensure_ascii=False) + "\n").encode("utf-8"))
    return path


def transcript_files(session: str) -> list[Path]:
    """The reviewer's Claude Code transcript files, found as spend.py --measured finds them (2.8.1); [] when none."""
    if not session:
        return []
    try:
        import spend
        return spend.session_files(session)
    except Exception:                                    # noqa: BLE001  no finder is no cross-check, never a crash
        return []


def assistant_text(line: str) -> list[str]:
    """The text blocks of one transcript line, when it is an assistant message."""
    try:
        msg = json.loads(line).get("message") or {}
    except (ValueError, AttributeError):
        return []
    content = msg.get("content") if isinstance(msg, dict) and msg.get("role") == "assistant" else None
    return [b.get("text") or "" for b in (content if isinstance(content, list) else [])
            if isinstance(b, dict) and b.get("type") == "text"]


def transcript_text(session: str) -> str | None:
    """Every assistant text block of the reviewer's transcript; None when it is not on this machine."""
    files = transcript_files(session)
    if not files:
        return None
    return "\n".join(text for f in files for line in f.read_text(encoding="utf-8", errors="replace").splitlines()
                     if line.strip() for text in assistant_text(line))


def squeeze(text: str) -> str:
    """Text without its whitespace: the transcript joins a message's blocks its own way, and a word changed still
    shows."""
    return "".join(text.split())


def why_not(rec: dict, fp: str, extract, path: Path) -> str:
    """Why a saved pass cannot stand for this one; '' when it can."""
    stdout = rec.get("stdout") or ""
    if rec.get("status") != "finished":
        return f"the saved run ended {rec.get('status')}"
    if rec.get("fingerprint") != fp:
        return "it reviewed other content (a module, its mode or the charter has changed)"
    if sha(stdout) != rec.get("stdout_sha256"):
        return f"its output no longer matches its digest: {path.name} was changed after the review"
    said = transcript_text(rec.get("session") or "")
    if said is not None and squeeze(stdout) not in squeeze(said):
        return f"its output is not what reviewer session {rec.get('session')} said"
    if extract(stdout.strip()) is None:
        return "its output holds no readable verdict object"
    return ""


def timed_out(folder: Path, name: str, fp: str) -> str:
    """The reviewer session of a pass this round saved as timed out over the same content, to resume; '' if none."""
    try:
        rec = json.loads(pass_file(folder, name).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return ""
    if rec.get("status") != "timeout" or rec.get("fingerprint") != fp:
        return ""
    return rec.get("session") or ""


def reusable(folder: Path, name: str, fp: str, extract) -> tuple[dict | None, str]:
    """(the saved pass, '') when it can stand for this pass, else (None, why not)."""
    path = pass_file(folder, name)
    try:
        rec = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None, "none saved"
    why = why_not(rec, fp, extract, path)
    return (None, why) if why else (rec, "")


def run_repair(script: Path, obj: dict, cwd: Path) -> dict:
    """The repair script on one verdict object: JSON in, JSON out."""
    try:
        r = subprocess.run([sys.executable, str(script)], input=json.dumps(obj), capture_output=True,
                           encoding="utf-8", errors="replace", cwd=str(cwd), timeout=120)
    except (OSError, subprocess.SubprocessError) as exc:
        raise RepairRefused(f"the repair could not run: {exc}")
    if r.returncode != 0:
        tail = "\n".join((r.stderr or r.stdout).strip().splitlines()[-4:])
        raise RepairRefused(f"the repair exited {r.returncode}: {tail}")
    try:
        out = json.loads(r.stdout)
    except ValueError:
        raise RepairRefused("the repair did not print one JSON object on its stdout")
    if not isinstance(out, dict):
        raise RepairRefused("the repair printed JSON that is not an object")
    return out


def leaves(obj, path: tuple = ()) -> dict[tuple, object]:
    """{path: value} for every scalar in a JSON value; an empty object or list is a leaf of its own."""
    if isinstance(obj, dict) and obj:
        return {p: v for k, child in obj.items() for p, v in leaves(child, path + (k,)).items()}
    if isinstance(obj, list) and obj:
        return {p: v for i, child in enumerate(obj) for p, v in leaves(child, path + (i,)).items()}
    return {path: obj}


def number(v) -> float | None:
    """A number, or a string that is one; never a boolean."""
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    try:
        return float(v.strip()) if isinstance(v, str) else None
    except ValueError:
        return None


def same_meaning(a, b) -> bool:
    """Written differently, saying the same: 5 and "5" and 5.0; "PASS" and "pass"; true and "true"."""
    if number(a) is not None and number(b) is not None:
        return number(a) == number(b)
    words = {"true": True, "false": False}
    if isinstance(a, bool) or isinstance(b, bool):
        return words.get(str(a).strip().lower(), a) == words.get(str(b).strip().lower(), b)
    if isinstance(a, str) and isinstance(b, str):
        return a.strip().casefold() == b.strip().casefold()
    return a == b


def schema_at(schema: dict, path: tuple) -> dict:
    """The schema for the value at `path`, as far as the schema says; {} where it says nothing."""
    s = schema
    for step in path:
        if isinstance(step, int):
            s = s.get("items") if isinstance(s.get("items"), dict) else {}
        elif step in (s.get("properties") or {}):
            s = s["properties"][step]
        else:
            s = s.get("additionalProperties") if isinstance(s.get("additionalProperties"), dict) else {}
    return s


def stray_root(path: tuple, schema: dict) -> tuple | None:
    """The first key along `path` that the schema does not allow where it stands, or None."""
    for i, step in enumerate(path):
        if isinstance(step, str):
            parent = schema_at(schema, path[:i])
            known = parent.get("properties")
            if known is not None and step not in known and not isinstance(parent.get("additionalProperties"), dict):
                return path[:i + 1]
    return None


def is_judgement(path: tuple) -> bool:
    return bool(path) and (path[-1] in JUDGEMENT_LAST or path in JUDGEMENT_PATHS)


def where(path: tuple) -> str:
    return "/".join(map(str, path))


def leaf_ok(path: tuple, old, new) -> bool:
    """A changed leaf: a judgement says the same; any other number keeps its magnitude (a sign or a type); any other
    value says the same."""
    if not is_judgement(path) and number(old) is not None and number(new) is not None:
        return abs(number(old)) == abs(number(new))
    return same_meaning(old, new)


def changed_leaves(b: dict, a: dict) -> tuple[list[str], list[str]]:
    """(form changes, faults) among the leaves both objects have."""
    changes, faults = [], []
    for p in sorted(set(b) & set(a), key=str):
        old, new = b[p], a[p]
        if old == new and type(old) is type(new):
            continue
        (changes if leaf_ok(p, old, new) else faults).append(f"{where(p)}: {json.dumps(old)} -> {json.dumps(new)}")
    return changes, faults


def twin_of(path: tuple, value, removed: dict, schema: dict) -> tuple | None:
    """The removed stray key an added allowed one renames: the same place, the same value."""
    return next((q for q in removed if q[:-1] == path[:-1] and same_meaning(removed[q], value)
                 and stray_root(q, schema) == q and stray_root(path, schema) is None), None)


def added_leaves(added: dict, removed: dict, schema: dict) -> tuple[list[str], list[str]]:
    """(renames, faults) among the leaves only the repair has. A rename takes its twin out of `removed`."""
    changes, faults = [], []
    for p, v in sorted(added.items(), key=lambda kv: str(kv[0])):
        twin = twin_of(p, v, removed, schema)
        if twin is None:
            faults.append(f"{where(p)}: added {json.dumps(v)} (output that was not there)")
            continue
        removed.pop(twin)
        changes.append(f"{where(twin)} renamed {p[-1]}")
    return changes, faults


def removed_leaves(removed: dict, schema: dict) -> tuple[list[str], list[str]]:
    """(stray keys left out, faults) among the leaves only the review had."""
    strays = sorted({stray_root(p, schema) for p in removed} - {None}, key=str)
    return ([f"{where(root)}: left out (the schema has no such key there)" for root in strays],
            [f"{where(p)}: removed {json.dumps(removed[p])}" for p in sorted(removed, key=str)
             if stray_root(p, schema) is None])


def form_changes(before: dict, after: dict, schema: dict) -> tuple[list[str], list[str]]:
    """SR-2's objective test: (each change of form, each change that is not one). A judgement may be written
    differently but must say the same; any other number keeps its magnitude (a sign or a type); a string keeps its
    words; a key the schema does not allow where it stands may go, or be renamed to one it does with its value
    unchanged. Nothing may be added, and no list may grow or shrink."""
    b, a = leaves(before), leaves(after)
    removed = {p: v for p, v in b.items() if p not in a}
    changed = changed_leaves(b, a)
    renamed = added_leaves({p: v for p, v in a.items() if p not in b}, removed, schema)
    left_out = removed_leaves(removed, schema)                 # after the renames have taken their twins
    return changed[0] + renamed[0] + left_out[0], changed[1] + renamed[1] + left_out[1]


SEVERITY = {"PASS": 0, "RETURN": 1, "HALT": 2}


def merged_check(entries: list[tuple[str, dict]]) -> dict:
    """One check's entry across a round's passes: its worst status; the evidence when every pass ran it mechanically,
    else each pass's word."""
    statuses = [c.get("status") for _, c in entries]
    status = "fail" if "fail" in statuses else "pass" if "pass" in statuses else "not_applicable"
    if all(c.get("mechanical") is True for _, c in entries):
        first = next((c for _, c in entries if c.get("status") == status), entries[0][1])
        return {"status": status, "mechanical": True, "evidence": first.get("evidence")}
    return {"status": status, "mechanical": False, "rationale": " | ".join(pass_word(n, c) for n, c in entries)}


def pass_word(name: str, c: dict) -> str:
    """What one pass said of a check: its status, and its rationale or the command it ran."""
    ran = {"command": "?", "exit_code": "?", **(c.get("evidence") or {})}
    return f"{name}: {c.get('status')}, " + (c.get("rationale") or f"{ran['command']} exited {ran['exit_code']}")


def merged_checks(parts: list[tuple[str, dict]]) -> dict:
    """Each check id the passes report, across them."""
    checks: dict[str, list] = {}
    for name, s in parts:
        for cid, c in (s.get("checks") or {}).items():
            checks.setdefault(cid, []).append((name, c if isinstance(c, dict) else {}))
    return {cid: merged_check(entries) for cid, entries in checks.items()}


def merged_drift(parts: list[tuple[str, dict]]) -> dict:
    """The lowest drift any pass scored, with every pass's deductions, each named by its pass."""
    scores = [s.get("drift_score") or {} for _, s in parts]
    basis = [{**b, "finding": f"[{name}] {b.get('finding', '')}"}
             for (name, _), score in zip(parts, scores) for b in score.get("basis") or [] if isinstance(b, dict)]
    return {"value": min(score.get("value", 1) for score in scores), "basis": basis}


def every(parts: list[tuple[str, dict]], key: str) -> list:
    """One list from every pass's list under `key`."""
    return [x for _, s in parts for x in s.get(key) or []]


def merged(parts: list[tuple[str, dict]]) -> dict:
    """The final review's verdict from its passes (RD-32): the worst verdict, the lowest drift with every deduction,
    each check's worst status, every blocking item (a HALT's one only) and every proposal. Moved here from k7-run.py
    with the passes (2.9.1)."""
    worst = max(parts, key=lambda p: SEVERITY.get(p[1].get("verdict"), 3))[1]
    halted = worst.get("verdict") == "HALT"
    out = {"checks": merged_checks(parts), "drift_score": merged_drift(parts), "verdict": worst.get("verdict"),
           "blocking": worst.get("blocking") if halted else every(parts, "blocking"),
           "next_action": " ".join(dict.fromkeys(str(s.get("next_action") or "") for _, s in parts)).strip()}
    proposals = every(parts, "proposed_tests")
    return out | ({"proposed_tests": proposals} if proposals else {})


LABEL = re.compile(r"^--- pass (\S+) ---\n", re.M)
OUTPUT = re.compile(r"--- stdout ---\n(.*?)\n--- stderr ---\n(.*)", re.S)


def split_raw(text: str, kind: str) -> dict[str, tuple[str, str]]:
    """{pass: (stdout, stderr)} from a kept raw output as k7-run wrote it: each pass under its '--- pass X ---' label,
    or one unlabelled pass named by the round's kind."""
    text = text.replace("\r\n", "\n")
    marks = list(LABEL.finditer(text))
    ends = [m.start() for m in marks[1:]] + [len(text)]
    chunks = [(m.group(1), text[m.end():end]) for m, end in zip(marks, ends)] or [(kind, text)]
    found = {name: OUTPUT.search(chunk) for name, chunk in chunks}
    return {name: (m.group(1), m.group(2).rstrip("\n")) for name, m in found.items() if m}


def run_sessions(log: str, kind: str) -> dict[str, str]:
    """{pass: reviewer session} from a k7-run log: each 'reviewer session' line belongs to the pass line before it."""
    out, current = {}, kind
    for line in log.splitlines():
        named = re.match(r"k7-run: final review, pass (\S+):", line)
        session = re.match(r"k7-run: reviewer session (\S+)", line)
        current = named.group(1) if named else current
        if session:
            out[current] = session.group(1)
    return out


def run_files(root: Path, source: Source) -> tuple[str, str, dict]:
    """(the raw output, the run's log, the run's record); a missing one refuses the import."""
    runs = root / RUNS
    try:
        return (source.raw.read_text(encoding="utf-8"), (runs / f"{source.run}.log").read_text(encoding="utf-8"),
                json.loads((runs / f"{source.run}.json").read_text(encoding="utf-8")))
    except (OSError, ValueError) as exc:
        raise ImportRefused(f"the kept review cannot be read: {exc}")


def git_out(root: Path, *args: str) -> str:
    r = subprocess.run(["git", "-C", str(root), *args], capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else ""


def reviewed_commit(root: Path, record: dict) -> str:
    """The commit HEAD named when the run started: the commit its reviewers were handed."""
    commit = git_out(root, "log", "-1", "--format=%H", f"--until={record.get('started') or ''}", "HEAD")
    if not record.get("started") or not commit:
        raise ImportRefused("the run's record gives no start before which a commit can be found")
    return commit


def content_then(root: Path, commit: str, agent: str) -> tuple[dict[str, str], str]:
    """({module: manifest digest}, charter digest) at a commit, read from a throwaway worktree of it with this
    repository's own manifests.py, as the round reads the content now."""
    import manifests                                         # the credited-review fingerprints (RD-27)
    wt = root / ".k7" / "import"
    git_out(root, "worktree", "remove", "--force", str(wt))
    git_out(root, "worktree", "add", "--detach", str(wt), commit)
    if not (wt / ".git").exists():
        raise ImportRefused(f"the reviewed commit {commit[:12]} could not be checked out")
    try:
        cfg = json.loads((wt / ".metaframework" / "project.json").read_text(encoding="utf-8"))
        return {m: b["digest"] for m, b in manifests.build(wt, cfg).items()}, charter_digest(wt, agent)
    finally:
        git_out(root, "worktree", "remove", "--force", str(wt))
        git_out(root, "worktree", "prune")


def checked_output(name: str, stdout: str, session: str) -> None:
    """The import's proof: the pass's output is in its reviewer's own transcript."""
    said = transcript_text(session)
    if said is None:
        raise ImportRefused(f"pass {name}: reviewer session {session}'s transcript is not on this machine, so its "
                            f"output cannot be shown to be the reviewer's")
    if squeeze(stdout) not in squeeze(said):
        raise ImportRefused(f"pass {name}: the kept output is not what reviewer session {session} said")


def import_raw(root: Path, head: dict, passes: list[tuple[str, list]], saved: Saved, source: Source) -> list[str]:
    """This round's passes made from a review kept before 2.9.0 (2.9.1): head names the round ({"rnd", "kind",
    "agent"}), passes the round's (name, scope). Passes the kept review lacks, or this round has already saved
    finished, are left as they are. Returns the passes imported."""
    raw, log, run = run_files(root, source)
    named = re.search(r"k7:round-(\d+) (\S+)\"", log)
    if not named or (int(named.group(1)), named.group(2)) != (head["rnd"], head["kind"]):
        raise ImportRefused(f"run {source.run} is not this round (round {head['rnd']}, {head['kind']}): its log "
                            f"says {named.group(0) if named else 'no round'}")
    commit = reviewed_commit(root, run)
    digests, charter = content_then(root, commit, head["agent"])
    then = {"head": head, "run": run, "source": source, "commit": commit, "digests": digests, "charter": charter,
            "tree": git_out(root, "rev-parse", f"{commit}^{{tree}}")}
    found = (split_raw(raw, head["kind"]), run_sessions(log, head["kind"]))
    return [name for name, scope in passes if import_pass((name, scope), found, saved, then)]


def saved_status(folder: Path, name: str) -> str:
    try:
        return json.loads(pass_file(folder, name).read_text(encoding="utf-8")).get("status") or ""
    except (OSError, ValueError):
        return ""


def import_pass(one: tuple, found: tuple, saved: Saved, then: dict) -> bool:
    """One pass of the kept review saved as this round's, when the review holds it and it is not saved finished. Its
    fingerprint is made from the content at the reviewed commit, so --refile reuses it only if nothing has changed."""
    (name, scope), (outputs, sessions) = one, found
    if name not in outputs or name not in sessions or saved_status(saved.folder, name) == "finished":
        return False
    stdout, stderr = outputs[name]
    checked_output(name, stdout, sessions[name])
    head, run = then["head"], then["run"]
    then_scope = [{"module": e["module"], "mode": e["mode"], "manifest": then["digests"].get(e["module"])}
                  for e in scope]
    save(saved.folder, name, record(**{
        "round": head["rnd"], "kind": head["kind"], "pass": name, "modules": [e["module"] for e in scope],
        "fingerprint": fingerprint(head["kind"], name, then_scope, then["charter"]), "commit": then["commit"],
        "tree": then["tree"], "session": sessions[name], "resumed": 0, "started": run.get("started"),
        "completed": run.get("ended"), "status": "finished", "exit_code": None, "stdout": stdout, "stderr": stderr,
        "imported": {"raw": then["source"].raw.as_posix(), "run": then["source"].run}}))
    return True
