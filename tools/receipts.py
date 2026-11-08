#!/usr/bin/env python3
"""
receipts — Phase 4's gates as PipelineGate receipts (RD-28; the F1/F6 design, stage 2).

Each module's content manifest (tools/manifests.py) is a PipelineGate artifact. Two points on its line:
  k7            k7_verdict, judged by the K7 reviewer pinned by its charter's digest: PASS on this content
  owner-triage  owner_triage, judged by the owner: a gate closed on this content
Each is used at version 1 unless `rubric_versions` in .metaframework/project.json declares another, as a store
migrated to JSON specs does. A judged rubric's spec is canonical JSON (governance/rubrics/*.json): the seal-4 engine
reads nothing else, so a store whose judged rubrics were admitted from the Markdown specs refuses every judged act
until `migrate` admits the next versions.
Standing is read from the line on every call and stored nowhere. Credited review counts a module as concluded when its
standing at k7 or owner-triage is ACCEPT; gate.py refuses a closed-by-owner tag without the owner's receipts.
The builder's battery point is cut (2.8.0, roster v0.14): setup admits no battery_complete rubric, and k7-run.py hands
the reviewer content with or without one. A store that already signed battery_complete@1 keeps its lines, and
governance/rubrics/battery_complete.py stays for its catalog to read.

The store is the repo's own (`.pipelinegate/`, its *.jsonl committed). The engine is the plugin's pipelinegate skill,
called through `pipelinegate_command` in .metaframework/project.json, e.g.
    "pipelinegate_command": "python \"<plugin>/skills/pipelinegate/scripts/pg.py\" --store .pipelinegate"
Undeclared, the build runs credited review from the verdict files alone (RD-27) and none of this applies.

    python tools/receipts.py setup --signer P          print the owner's signing commands (never runs them)
    python tools/receipts.py migrate --signer P        print the owner's commands that admit each judged rubric the
                                                       engine cannot read as its next version, from its JSON spec
    python tools/receipts.py manifest MOD-NN           the content's digest, as its receipts name it
    python tools/receipts.py owner-close --round N --person P   only on the owner's explicit, live word
    python tools/receipts.py standing [--modules MOD-01,...]
Exit: 0 answered; 1 refused, or a gate not met; 2 a bad call or no pipelinegate_command.
"""

import argparse
import hashlib
import json
import re
import shlex
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import manifests as mf                                       # noqa: E402

AUTHOR = "builder"                     # the artifact's author: never a decider at k7 or owner-triage (AUTHOR_IS_JUDGE)
REVIEWER = "k7-reviewer"
# full-review: the seal's backstop as a receipt. The reviewer's PASS on a FULL review, or the owner's close of a round
# that reviewed the module in full, appends ACCEPT here too, so an edited verdict file cannot claim a full review.
POINTS = ("k7", "owner-triage", "full-review")
RUBRICS = {"k7": ("k7_verdict", 1), "owner-triage": ("owner_triage", 1)}
# The judged rubrics' specs, as the engine admits them: canonical JSON, {"refusal_names": [], "text": <the .md>}. Both
# rubrics return only ACCEPT, or leave the receipt pending, so they declare no refusal.
JUDGED_SPECS = {"k7": "governance/rubrics/k7_verdict.json", "owner-triage": "governance/rubrics/owner_triage.json"}


class PgError(Exception):
    pass


def load_cfg(root: Path) -> dict:
    try:
        return json.loads((root / ".metaframework" / "project.json").read_bytes().decode("utf-8"))
    except (OSError, ValueError):
        return {}


def enabled(cfg: dict) -> bool:
    return bool(cfg.get("pipelinegate_command"))


def pins(cfg: dict) -> dict:
    """{point: (rubric id, version)}: RUBRICS, at the versions `rubric_versions` in project.json declares."""
    declared = cfg.get("rubric_versions") or {}
    return {point: (rid, int(declared.get(rid, v))) for point, (rid, v) in RUBRICS.items()}


def pg(root: Path, cfg: dict, *args: str) -> dict:
    """One call to the engine's tool face; its JSON answer package."""
    cmd = shlex.split(cfg["pipelinegate_command"]) + list(args)
    d = subprocess.run(cmd, capture_output=True, cwd=str(root))
    try:
        out = json.loads(d.stdout.decode("utf-8"))
    except ValueError:
        raise PgError(f"pipelinegate answered no JSON (exit {d.returncode}): {(d.stderr or d.stdout).decode('utf-8', 'replace')[-300:]}")
    if d.returncode != 0:
        raise PgError(out.get("error") or out.get("usage") or f"exit {d.returncode}")
    return out


def h_of(manifest: dict) -> str:
    """The engine's digest of a manifest's canonical bytes: the artifact's h, and its line."""
    return "sha256:" + hashlib.sha256(mf.canonical(manifest)).hexdigest()


def text_of(manifest: dict) -> str:
    return mf.canonical(manifest).decode("utf-8")


def standing(root: Path, cfg: dict, h: str, point: str) -> str:
    return pg(root, cfg, "standing", "--h", h, "--p", point)["returned"]


def concluded(root: Path, cfg: dict, h: str) -> bool:
    return any(standing(root, cfg, h, p) == "ACCEPT" for p in ("k7", "owner-triage"))


def charter(root: Path, cfg: dict) -> str:
    """The digest of the charter this repo runs the reviewer with: the agent_def the k7 rubric pins."""
    path = cfg.get("reviewer_agent") or ".claude/agents/k7-reviewer.md"
    # The charter as git stores it, not the bytes on disk: a CRLF checkout of the same charter is the same charter, and
    # must not refuse the reviewer (DECIDER_NOT_IN_RUBRIC). The engine digests --text and --file bytes alike.
    return pg(root, cfg, "digest", "--text", mf.stored(root, [path])[path].decode("utf-8"))["returned"]


@dataclass(frozen=True)
class Act:
    """One receipt asked of the engine: the point on the line, the (rubric id, version) that judges it there, the
    decider's flags (and any --ref evidence), and the outcome a judged decider returns (None leaves it pending)."""
    point: str
    rubric: tuple
    flags: tuple = ()
    returned: str | None = None


def receipt(root: Path, cfg: dict, manifest: dict, act: Act) -> dict:
    """The engine's evaluate of this content for one act: its JSON answer package."""
    rid, v = act.rubric
    args = ["evaluate", "--author", AUTHOR, "--text", text_of(manifest), "--p", act.point, "--r", rid, "--v", str(v),
            *act.flags]
    if act.returned:
        args += ["--returned", act.returned]
    return pg(root, cfg, *args)


def evaluate(root: Path, cfg: dict, manifest: dict, point: str, *flags: str, returned: str | None = None) -> dict:
    """A receipt at `point`, judged by the rubric pinned there."""
    return receipt(root, cfg, manifest, Act(point, pins(cfg)[point], flags, returned))


@dataclass(frozen=True)
class Review:
    """The K7 reviewer's side of a receipt: its charter's digest, the transcript it ran (if kept), the outcome it
    returned (None leaves the receipt pending), and the point: k7, or full-review for a full review's PASS."""
    agent_def: str
    transcript: str | None = None
    returned: str | None = None
    point: str = "k7"


def k7(root: Path, cfg: dict, manifest: dict, review: Review) -> dict:
    """The reviewer's receipt at k7 (or, for a full review's PASS, at full-review): judged by the pinned k7_verdict."""
    who = ["--agent", REVIEWER, "--agent-def", review.agent_def]
    who += ["--transcript", review.transcript] if review.transcript else []
    return receipt(root, cfg, manifest, Act(review.point, pins(cfg)["k7"], tuple(who), review.returned))


def fully_reviewed(root: Path, cfg: dict, h: str) -> bool:
    return standing(root, cfg, h, "full-review") == "ACCEPT"


def nu(ans: dict) -> str:
    return (ans.get("returned") or {}).get("nu", "") if isinstance(ans.get("returned"), dict) else str(ans.get("returned"))


def judged_admit(base: str, signer: str, key: tuple, spec: str, decider: str) -> str:
    """The owner's command that admits one judged rubric version from its JSON spec."""
    rid, v = key
    return f"{base} admit --signer {shlex.quote(signer)} --id {rid} --v {v} --spec {spec} --decider-spec {decider}"


def decider_specs(root: Path, cfg: dict, signer: str) -> dict:
    """What each judged rubric pins as its decider: this repo's K7 charter, and the owner's principal."""
    return {"k7": charter(root, cfg), "owner-triage": pg(root, cfg, "digest", "--text", signer)["returned"]}


def setup_commands(root: Path, cfg: dict, signer: str) -> list[str]:
    """The owner's signing acts for this repo's store, as commands. Printed for the owner; never run by the executor."""
    base = cfg["pipelinegate_command"]
    store = re.search(r"--store\s+(\"[^\"]+\"|\S+)", base)
    lines = []
    if store and not (root / store.group(1).strip('"') / "pipelinegate.json").exists():
        chain = cfg.get("concept") or root.name
        lines.append(f"{base} init --chain {shlex.quote(chain)}")
    pinned, deciders = pins(cfg), decider_specs(root, cfg, signer)
    lines.append(f"{base} bootstrap --signer {shlex.quote(signer)}")
    return lines + [judged_admit(base, signer, pinned[p], spec, deciders[p]) for p, spec in JUDGED_SPECS.items()]


def admitted_versions(catalog: dict) -> dict:
    """{rubric id: [version, ...]} for every rubric the catalog line admitted."""
    held: dict = {}
    for rec in catalog.get("line") or []:
        rid, _, v = str(rec.get("subject")).rpartition("@")
        if rec.get("nu") == "ACCEPT" and v.isdigit():
            held.setdefault(rid, []).append(int(v))
    return held


def next_version(key: tuple, held: dict, unread: dict) -> int:
    """The version a judged rubric moves to from its JSON spec; 0 when its pinned version reads, or none is held."""
    rid, v = key
    if not held.get(rid) or (v in held[rid] and f"{rid}@{v}" not in unread):
        return 0
    return max(held[rid]) + 1


def unmoved_note(key: tuple, held: dict) -> str:
    """Why a judged rubric needs no migration."""
    rid, v = key
    return f"# {rid}@{v} " + ("reads as a JSON spec" if held.get(rid) else "is not admitted: run setup")


def migrations(catalog: dict, pinned: dict) -> tuple[list[str], dict]:
    """A note for each judged rubric that stays, and {point: (next version, why)} for each that moves."""
    held = admitted_versions(catalog)
    unread = {s.get("rubric"): s.get("reason") for s in catalog.get("skipped") or []}
    moves = {p: next_version(pinned[p], held, unread) for p in JUDGED_SPECS}
    notes = [unmoved_note(pinned[p], held) for p in moves if not moves[p]]
    return notes, {p: (n, unread.get("%s@%s" % pinned[p], "not admitted")) for p, n in moves.items() if n}


def migrate_commands(root: Path, cfg: dict, signer: str) -> list[str]:
    """The owner's acts that admit each judged rubric the engine cannot read as its next version, from its JSON spec,
    then the rubric_versions declaration that pins them. Printed for the owner; never run by the executor."""
    pinned, catalog = pins(cfg), pg(root, cfg, "catalog")
    if "skipped" not in catalog:     # the seal-1 face reads any spec, so it reports nothing it cannot read
        raise PgError("migrate needs the seal-4 engine's `skipped` report, and this face gives none (a seal-1 copy?). "
                      "Point pipelinegate_command at the plugin's pipelinegate skill, 2.6.8 or later, and run it again.")
    lines, moving = migrations(catalog, pinned)
    if not moving:
        return lines + ["# Nothing to migrate."]
    deciders = decider_specs(root, cfg, signer)
    for p, (n, why) in moving.items():
        rid, v = pinned[p]
        lines += [f"# {rid}@{v} is not read by the engine ({why}): admit {rid}@{n} from its JSON spec.",
                  judged_admit(cfg["pipelinegate_command"], signer, (rid, n), JUDGED_SPECS[p], deciders[p])]
    declared = {**(cfg.get("rubric_versions") or {}), **{pinned[p][0]: n for p, (n, _) in moving.items()}}
    return lines + ["# Then pin them in .metaframework/project.json: "
                    f"\"rubric_versions\": {json.dumps(declared, sort_keys=True)}"]


def built_module(root: Path, cfg: dict, module: str) -> dict | None:
    """The module's built entry, or None (said on stderr) when the object model has no such module."""
    built = mf.build(root, cfg)
    if module not in built:
        print(f"receipts: {module} is not in the object model", file=sys.stderr)
        return None
    return built[module]


def cmd_setup(root: Path, cfg: dict, a: argparse.Namespace) -> int:
    print("# The owner's signing acts for this repo's store (RD-28). Run them yourself, or say so to the "
          "session; the executor never signs.")
    print("\n".join(setup_commands(root, cfg, a.signer)))
    return 0


def cmd_migrate(root: Path, cfg: dict, a: argparse.Namespace) -> int:
    print("# The owner's signing acts that move this store's judged rubrics to JSON specs (plugin 2.6.10). Run them "
          "yourself, or say so to the session; the executor never signs.")
    print("\n".join(migrate_commands(root, cfg, a.signer)))
    return 0


def cmd_manifest(root: Path, cfg: dict, a: argparse.Namespace) -> int:
    entry = built_module(root, cfg, a.module)
    if entry is None:
        return 2
    print(h_of(entry["manifest"]))
    return 0


def round_modules(verdict: dict, built: dict) -> tuple[list, set]:
    """The modules a K7 round reviewed, and the ones it reviewed in full."""
    reviewed = verdict.get("reviewed") or {}
    scope = reviewed.get("scope", [])
    mods = [s["module"] for s in scope] or [m for m in reviewed.get("modules", []) if m in built]
    return mods, {s["module"] for s in scope if s.get("mode") == "full"}


def owner_accepts(root: Path, cfg: dict, manifest: dict, person: str, full: bool) -> tuple[int, str]:
    """The owner's ACCEPT at owner-triage, and at full-review for a module reviewed in full: (refusals, report)."""
    ans = evaluate(root, cfg, manifest, "owner-triage", "--person", person, returned="ACCEPT")
    bad, line = int(nu(ans) != "ACCEPT"), f"owner-triage: {nu(ans)}"
    if full and nu(ans) == "ACCEPT":      # the owner closes a round that reviewed this module in full
        f = receipt(root, cfg, manifest, Act("full-review", pins(cfg)["owner-triage"], ("--person", person), "ACCEPT"))
        bad += nu(f) != "ACCEPT"
        line += f"; full-review: {nu(f)}"
    return bad, line


def cmd_owner_close(root: Path, cfg: dict, a: argparse.Namespace) -> int:
    built = mf.build(root, cfg)
    vf = root / "INSTRUMENTS" / f"k7-verdict-{a.round}.json"
    mods, full = round_modules(json.loads(vf.read_bytes().decode("utf-8")), built)
    bad = 0
    for m in mods:
        refused, line = owner_accepts(root, cfg, built[m]["manifest"], a.person, m in full)
        bad += refused
        print(f"receipts: {m} {line}")
    return 1 if bad else 0


def cmd_standing(root: Path, cfg: dict, a: argparse.Namespace) -> int:
    built = mf.build(root, cfg)
    mods = [m for m in a.modules.split(",") if m] or sorted(built)
    print(f"{'module':8} {'content':14} " + " ".join(f"{p:14}" for p in POINTS))
    for m in mods:
        h = h_of(built[m]["manifest"])
        print(f"{m:8} {h[7:19]:14} " + " ".join(f"{standing(root, cfg, h, p):14}" for p in POINTS))
    return 0


COMMANDS = {"setup": cmd_setup, "migrate": cmd_migrate, "manifest": cmd_manifest, "owner-close": cmd_owner_close,
            "standing": cmd_standing}


def parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(description=__doc__.strip().split("\n\n")[0])
    ap.add_argument("--root", default=".")
    sub = ap.add_subparsers(dest="command", required=True)
    sub.add_parser("setup").add_argument("--signer", required=True)
    sub.add_parser("migrate").add_argument("--signer", required=True)
    sub.add_parser("manifest").add_argument("module")
    s = sub.add_parser("owner-close"); s.add_argument("--round", required=True, type=int); s.add_argument("--person", required=True)
    sub.add_parser("standing").add_argument("--modules", default="")
    return ap


def main() -> int:
    a = parser().parse_args()
    root = Path(a.root).resolve()
    cfg = load_cfg(root)
    if not enabled(cfg):
        print("receipts: pipelinegate_command is not declared in .metaframework/project.json; this build runs credited "
              "review from its verdict files alone (RD-27)", file=sys.stderr)
        return 2
    try:
        return COMMANDS[a.command](root, cfg, a)
    except PgError as e:
        print(f"receipts: the engine refused or failed: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
