#!/usr/bin/env python3
"""spend: the spend ledger (Amendment T-1: TE-1, TE-7, TE-8), mechanically.

    python tools/spend.py add --stage STAGE --measured [--agent ID] [--session-id ID[,ID...] | --transcript PATH]
                              [--session LABEL] [--model TIER] [--usd X] [--note TEXT] [--date YYYY-MM-DD]
    python tools/spend.py add --stage STAGE --model TIER --usd X [--session LABEL] [--note TEXT] [--date ...]
    python tools/spend.py measure [--session-id ID[,ID...] | --transcript PATH] [--agent ID]
    python tools/spend.py forecast --units N --unit-kind KIND [--unit-cost X] [--measure usd|tokens]
    python tools/spend.py status --budget B [--units N --unit-kind KIND] [--unit-cost X]
                                 [--measure usd|tokens]

Every command takes --ledger PATH (default .metaframework/spend-ledger.md). Phases 1 to 3 run
before a build repo exists, so they run the plugin's copy of this file against their working
directory's ledger; add creates the ledger on its first row.

One row per stage: a session, a sub-agent, or a K7 round. A Stage named "kind:id detail"
(module:MOD-03 build, module:MOD-03 K7) is unit `id` of `kind`. forecast prices N more units
from the units the ledger already holds (TE-8); status adds that forecast to the spend so far
and compares the total with the budget (TE-1). A cell nobody knows is "-": unknown, and an
unknown cost is never counted as zero.

Measured tokens (2.8.1). A token count is never typed: add --measured reads it from the session's
own record, its Claude Code transcript, and measure prints the same counts without writing.
  - The session is CLAUDE_CODE_SESSION_ID, which Claude Code sets in every command a session runs,
    so the right one is found when several sessions share a folder. --session-id names another
    (a K7 reviewer's; several, comma-separated, for one round), --transcript a file.
  - Its transcript is <config>/projects/*/<id>.jsonl, where <config> is CLAUDE_CONFIG_DIR or else
    ~/.claude. A sub-agent's is <that folder>/<id>/subagents/**/agent-<agent id>.jsonl.
  - Each assistant reply's message.usage gives four kinds, kept apart: uncached input
    (input_tokens), cache writes (cache_creation_input_tokens), cache reads
    (cache_read_input_tokens) and output (output_tokens). A reply with usage.iterations counts
    every iteration (a fallback attempt is one).
  - One reply is often several lines: one per content block, a streaming partial, a copy in a
    resumed session's file. It is counted once, by its message id, and each kind is the largest
    any of its lines carries.
  - Without --agent a row is the lead's own replies; with --agent ID, that sub-agent's. Either way
    only the replies no earlier row counted, so a row holds the usage since the last one. Each
    reply a row counted is listed in <ledger stem>.measured.jsonl beside the ledger.
  - The Weighted cell weighs each reply's four kinds by their API price against one fresh input
    token (the owner, 2 Nov 2026): uncached input 1, a cache write 1.25 (the 5-minute cache) or 2
    (the 1-hour cache, from usage.cache_creation's split), output 5, and a cache read 0.1, or less
    for the models the pricing reference prices lower (CACHE_READ_LOWER). The ratios are the
    claude-api skill's pricing reference's; the four raw counts stay in their own cells.
  - --measure tokens compares the Weighted cells of every measured row, and forecasts on them;
    the output shows the raw counts beside them. Rows written before measuring (the first table
    of a ledger older than 2.8.1) hold no measured tokens: the measure leaves them out, and status
    says how many. --measure usd totals the USD cells, which only a per-token bill fills: a cloud
    or API run's /cost. Elsewhere USD is "-".

Exit: 0 when the answer is stated; 1 when status finds spend plus forecast over the budget;
2 for a usage error, an unreadable ledger or transcript, a row that would record nothing, or an
unknown cost the answer would rest on.
Standard library only.
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path

LEDGER = Path(".metaframework") / "spend-ledger.md"
COLUMNS = ("Stage", "Session", "Model", "Uncached in", "Cache write", "Cache read", "Tokens out", "Weighted", "USD",
           "Output", "Date")
BEFORE = ("Stage", "Session", "Model", "Tokens in", "Tokens out", "USD", "Output", "Date")     # a ledger before 2.8.1
KINDS = ("uncached in", "cache write", "cache read", "out")
USAGE = ("input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "output_tokens")
TIERS = ("opus", "sonnet", "haiku", "fable")

# Each kind's API price against one fresh input token: the claude-api skill's pricing reference (shared/prompt-caching.md,
# "Economics"; shared/model-migration.md, each model's Pricing line), as the owner ruled on 2 Nov 2026. The ratios hold
# for every model the reference prices, except a cache read, which it prices lower for the models named here.
FRESH, WRITE_5M, WRITE_1H, OUT = 1.0, 1.25, 2.0, 5.0
CACHE_READ = 0.1
CACHE_READ_LOWER = {"claude-opus-5-5": 0.05, "claude-fable-5-1": 0.025, "claude-mythos-5-1": 0.025}
UNKNOWN = "-"
UNIT = re.compile(r"^([a-z][a-z0-9-]*):(\S+)")
SESSION_ID = re.compile(r"^[0-9A-Za-z][0-9A-Za-z_-]{7,63}$")
MEASURES = ("usd", "tokens")

TABLE = "| " + " | ".join(COLUMNS) + " |\n" + "|---" * len(COLUMNS) + "|\n"

# The template ships this text as .metaframework/spend-ledger.md; tests/test_spend.py holds the two equal.
HEADER = """# Spend ledger

Amendment T-1 (`governance/token-economy.md`, TE-7). One row per stage: a session, a sub-agent,
or a K7 round. Append with `tools/spend.py add --measured`; read with `spend.py forecast` and
`spend.py status`. The four token counts are measured from the session's own record, never typed:
uncached input, cache writes, cache reads, output. Weighted weighs them by API price against one
fresh input token, and is what a tokens budget compares (TE-1). USD is a per-token bill's figure
(a cloud or API run's `/cost`), else `-`. A cell nobody knows is `-`: unknown, never zero. A Stage
named `kind:id detail` (`module:MOD-03 build`) is one unit of that kind for TE-8's forecast.

""" + TABLE

# Written once below a ledger older than 2.8.1, whose own table stays as it was.
MEASURED_SECTION = """
## Measured rows (plugin 2.8.1)

The rows above were recorded before tokens were measured and stay as they were. The rows below
are measured from each session's own record (`spend.py add --measured`); Weighted weighs their
four counts by API price against one fresh input token.

""" + TABLE


class LedgerError(Exception):
    """A ledger or transcript this tool cannot read, or a cost it would have to guess."""


@dataclass(frozen=True)
class Row:
    """One stage's spend, as the ledger records it: every cell is text, `-` where unknown.

    `tokens` holds the four measured cells (uncached in, cache write, cache read, out) and `weighted`
    their Weighted cell; a row written before 2.8.1, whose tokens were never measured, holds its two
    cells (Tokens in, Tokens out) and no weighted figure."""

    stage: str
    session: str
    model: str
    tokens: tuple[str, ...]
    weighted: str
    usd: str
    output: str
    date: str

    @classmethod
    def of(cls, cells: list[str]) -> Row:
        if len(cells) == len(BEFORE):
            return cls(*cells[:3], tuple(cells[3:5]), UNKNOWN, *cells[5:])
        return cls(*cells[:3], tuple(cells[3:7]), *cells[7:])

    def unit(self) -> tuple[str, str] | None:
        """(kind, id) for a Stage named 'kind:id ...', else None."""
        found = UNIT.match(self.stage)
        return (found.group(1), found.group(2)) if found else None

    def measured(self) -> bool:
        """A row of the current table: its four token cells are what the measure counts."""
        return len(self.tokens) == len(KINDS)

    def counts(self) -> tuple[float, ...]:
        """The four measured counts. LedgerError when one is unknown."""
        if not self.measured() or UNKNOWN in self.tokens:
            raise LedgerError(f"{self.stage!r} has no measured tokens; an unknown cost is not zero. "
                              f"Measure it, or measure in the other unit.")
        return tuple(number(cell, self.stage, "tokens") for cell in self.tokens)

    def cost(self, measure: str) -> float:
        """This row's spend in dollars or weighted tokens. LedgerError when it is unknown."""
        if measure == "tokens":
            self.counts()
            return number(self.weighted, self.stage, "weighted")
        if self.usd == UNKNOWN:
            raise LedgerError(f"{self.stage!r} has no usd figure; an unknown cost is not zero. "
                              f"Fill the cell, or measure in the other unit.")
        return number(self.usd, self.stage, "usd")


def number(text: str, stage: str, measure: str) -> float:
    try:
        return float(text.replace(",", "").lstrip("$"))
    except ValueError:
        raise LedgerError(f"{stage!r} has a {measure} cell that is not a number: {text!r}") from None


def read_rows(path: Path) -> list[Row]:
    """Every row of every spend table in the ledger, in order: a ledger older than 2.8.1 keeps its
    first table as it was, and its measured rows follow in a table of their own."""
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError as exc:
        raise LedgerError(f"cannot read {path}: {exc}") from exc
    rows, tables, at = [], 0, 0
    while at < len(lines):
        head = tuple(split_cells(lines[at]))
        at += 1
        if head not in (COLUMNS, BEFORE):
            continue
        tables, at = tables + 1, at + 1                        # the header, then its |---| line
        while at < len(lines) and lines[at].lstrip().startswith("|"):
            found = split_cells(lines[at])
            if len(found) != len(head):
                raise LedgerError(f"{path}:{at + 1} has {len(found)} cells, not {len(head)}")
            rows.append(Row.of(found))
            at += 1
    if not tables:
        raise LedgerError(f"{path} has no spend table headed | {' | '.join(COLUMNS)} |")
    return rows


def last_table(path: Path) -> tuple[str, ...]:
    """The header of the ledger's last spend table: rows are appended under it."""
    heads = [tuple(split_cells(line)) for line in path.read_text(encoding="utf-8").splitlines()]
    return [head for head in heads if head in (COLUMNS, BEFORE)][-1]


def split_cells(line: str) -> list[str]:
    """A Markdown table line's cells, stripped; [] for a line that is not one."""
    line = line.strip()
    if not (line.startswith("|") and line.endswith("|")):
        return []
    return [cell.strip() for cell in line[1:-1].split("|")]


def priced(rows: list[Row], measure: str) -> tuple[list[Row], list[Row]]:
    """(the rows a measure counts, the rows it leaves out). Dollars count every row. Tokens count the
    measured rows: a row from before 2.8.1 holds no measured tokens, so it is left out, not zero."""
    if measure == "usd":
        return rows, []
    return [row for row in rows if row.measured()], [row for row in rows if not row.measured()]


def unit_cost(rows: list[Row], kind: str, measure: str, default: float | None) -> tuple[float, list[str]]:
    """TE-8: what one more unit of `kind` costs, and the ids of the measured units that price rests on.

    `rows` is the whole ledger: row.unit() gives (kind, id) or None, and row.cost(measure) the
    row's spend, raising LedgerError when its cell is unknown. `default` is the owner's
    --unit-cost, or None. The ids come back in the order the ledger first names them ([] when
    the price is the owner's estimate). Raise LedgerError when no honest price can be stated.

    The price is the plain average per distinct unit: the kind's total over its units, so a
    module's build and K7 rows are one module. The owner's estimate prices a kind only until
    one of its units is measured; after that the ledger's figure replaces it (owner, 24 Oct 2026).
    In tokens only measured rows price a unit (2.8.1).
    """
    totals: dict[str, float] = {}
    for row in priced(rows, measure)[0]:
        unit = row.unit()
        if unit and unit[0] == kind:
            totals[unit[1]] = totals.get(unit[1], 0.0) + row.cost(measure)
    if totals:
        return sum(totals.values()) / len(totals), list(totals)
    if default is None:
        raise LedgerError(f"no {kind} unit is measured yet; give the owner's estimate with --unit-cost")
    return default, []


def forecast(rows: list[Row], kind: str, units: int, measure: str,
             default: float | None) -> tuple[float, float, list[str]]:
    """(total, per unit, measured ids) for `units` more units of `kind`."""
    per_unit, measured = unit_cost(rows, kind, measure, default)
    return units * per_unit, per_unit, measured


def money(value: float, measure: str) -> str:
    """A figure as the owner reads it: $1,234.56 or 1,234,567 weighted tokens."""
    sign = "-" if value < 0 else ""
    return f"{sign}${abs(value):,.2f}" if measure == "usd" else f"{value:,.0f} weighted tokens"


def shares(rows: list[Row]) -> str:
    """The rows' raw tokens and the four kinds' shares of them: a single total hides that most are cache reads."""
    totals = [sum(kind) for kind in zip(*(row.counts() for row in rows))] or [0.0] * len(KINDS)
    whole = sum(totals) or 1.0
    return f"{sum(totals):,.0f} raw tokens: " + ", ".join(
        f"{name} {value:,.0f} ({100 * value / whole:.1f}%)" for name, value in zip(KINDS, totals))


def figure(text: str | None, kind: type, name: str) -> str:
    """A non-negative number as its ledger cell; `-` when none was given."""
    if text is None:
        return UNKNOWN
    try:
        value = kind(text.replace(",", "").lstrip("$"))
    except ValueError:
        raise LedgerError(f"{name} {text!r} is not a number") from None
    if value < 0:
        raise LedgerError(f"{name} {text!r} is negative")
    return f"{value:.2f}" if kind is float else str(value)


def cell(text: str | None, name: str) -> str:
    """Free text as a ledger cell. A pipe or a line break would split the table."""
    if not text:
        return UNKNOWN
    if "|" in text or "\n" in text or "\r" in text:
        raise LedgerError(f"{name} {text!r} holds a pipe or a line break, which would split the table")
    return text.strip()


# --- The record: a session's Claude Code transcript (2.8.1) --------------------------------------------------------

def read_weight(model: str) -> float:
    """A cache read's weight for the model that gave a reply: the reference's lower rate where it names one."""
    return next((weight for name, weight in CACHE_READ_LOWER.items() if re.search(re.escape(name) + r"(?!\d)", model)),
                CACHE_READ)


@dataclass(frozen=True)
class Reply:
    """One API reply's usage: its key (the message id), the four kinds, the model that gave it, and how
    many of its cache writes went to the 1-hour cache."""

    key: str
    counts: tuple[int, ...]
    model: str
    hour: int = 0

    def joined(self, other: Reply) -> Reply:
        """The same reply read from another line: each kind is the larger (a streaming partial or a
        zeroed copy carries less than the reply's own line), and the cache writes split as the line
        that wrote the most of them says."""
        model = self.model if self.model not in ("", "<synthetic>") else other.model
        widest = max((self, other), key=lambda reply: (reply.counts[1], reply.hour))
        return Reply(self.key, tuple(max(a, b) for a, b in zip(self.counts, other.counts)), model, widest.hour)

    def weighted(self) -> float:
        """The reply's four kinds, each weighed by its API price against one fresh input token."""
        uncached, written, read, out = self.counts
        return (uncached * FRESH + (written - self.hour) * WRITE_5M + self.hour * WRITE_1H
                + read * read_weight(self.model) + out * OUT)


@dataclass(frozen=True)
class Source:
    """Whose replies a row measures: a session's lead (agent None), or one of its sub-agents."""

    session: str
    agent: str | None
    files: tuple[Path, ...]


def config_root() -> Path:
    """Where Claude Code keeps its transcripts' folder: CLAUDE_CONFIG_DIR, else ~/.claude."""
    configured = os.environ.get("CLAUDE_CONFIG_DIR")
    return Path(configured) if configured else Path.home() / ".claude"


def session_files(session: str) -> list[Path]:
    """Every file named for the session: one, unless a copy of it sits in another project folder."""
    if not SESSION_ID.match(session):
        raise LedgerError(f"session id {session!r} is not a Claude Code session id")
    return sorted((config_root() / "projects").glob(f"*/{session}.jsonl"))


def agent_files(main: Path) -> dict[str, list[Path]]:
    """A session's sub-agent transcripts by agent id: <session>/subagents/**/agent-<id>.jsonl (a
    workflow's agents sit a folder or two deeper)."""
    found: dict[str, list[Path]] = {}
    folder = main.with_suffix("") / "subagents"
    for path in sorted(folder.rglob("agent-*.jsonl")) if folder.is_dir() else []:
        found.setdefault(path.stem[len("agent-"):], []).append(path)
    return found


READ: dict[tuple[Path, int, int], tuple[list[dict], int]] = {}     # one parse per file as it stands, per run


def entries(path: Path) -> tuple[list[dict], int]:
    """A transcript's entries, and how many lines could not be read (a line still being written)."""
    try:
        stat = path.stat()
        key = (path, stat.st_size, stat.st_mtime_ns)
        if key not in READ:
            READ[key] = parsed(path.read_bytes().decode("utf-8", errors="replace"))
    except OSError as exc:
        raise LedgerError(f"cannot read the transcript {path}: {exc}") from exc
    return READ[key]


def parsed(text: str) -> tuple[list[dict], int]:
    found, bad = [], 0
    for line in text.splitlines():
        if not line.strip():
            continue
        try:
            entry = json.loads(line)
        except ValueError:
            bad += 1
            continue
        if isinstance(entry, dict):
            found.append(entry)
    return found, bad


def parts(usage: dict) -> list[dict]:
    """A reply's usage as the API billed it: each iteration, when the reply lists them, else the usage itself."""
    listed = usage.get("iterations")
    found = [part for part in listed if isinstance(part, dict)] if isinstance(listed, list) else []
    return found or [usage]


def usage_counts(usage: dict) -> tuple[int, ...]:
    """The four kinds of one reply's usage: every iteration's, when the reply lists its iterations.
    A kind the reply leaves out is none of it (the API omits a cache it did not touch)."""
    return tuple(sum(whole(part.get(field)) for part in parts(usage)) for field in USAGE)


def hour_writes(usage: dict) -> int:
    """Of a reply's cache writes, those to the 1-hour cache: usage.cache_creation's split, in every
    iteration. A write the usage does not split went to the 5-minute cache, the API's default."""
    found = 0
    for part in parts(usage):
        split = part.get("cache_creation")
        if isinstance(split, dict):
            found += min(whole(split.get("ephemeral_1h_input_tokens")), whole(part.get("cache_creation_input_tokens")))
    return found


def whole(value: object) -> int:
    return value if isinstance(value, int) and not isinstance(value, bool) and value > 0 else 0


def reply_of(entry: dict) -> Reply | None:
    """The reply an entry carries: an assistant line with usage and a key (its message id, else its
    request id or line id). None for any other line."""
    message = entry.get("message")
    if entry.get("type") != "assistant" or not isinstance(message, dict):
        return None
    usage = message.get("usage")
    key = message.get("id") or entry.get("requestId") or entry.get("uuid")
    if not isinstance(usage, dict) or not key:
        return None
    return Reply(str(key), usage_counts(usage), str(message.get("model") or ""), hour_writes(usage))


def merge(into: dict[str, Reply], reply: Reply) -> None:
    """One more line of a reply: a new key, or the larger of each kind for a key already read."""
    into[reply.key] = into[reply.key].joined(reply) if reply.key in into else reply


def replies(found: list[dict], keep) -> dict[str, Reply]:
    """The replies among `found` entries that `keep` accepts, one per message id."""
    out: dict[str, Reply] = {}
    for entry in filter(keep, found):
        reply = reply_of(entry)
        if reply:
            merge(out, reply)
    return out


def lead(entry: dict) -> bool:
    return entry.get("isSidechain") is not True


def session_ids(args: argparse.Namespace) -> list[str]:
    """--session-id's ids, else this session's own. Never a guess: none is a refusal."""
    given = args.session_id or os.environ.get("CLAUDE_CODE_SESSION_ID") or ""
    ids = [one.strip() for one in given.split(",") if one.strip()]
    if not ids:
        raise LedgerError("no session to measure: CLAUDE_CODE_SESSION_ID is not set (Claude Code sets it in "
                          "every command a session runs). Name it with --session-id, or --transcript PATH.")
    return ids


def main_files(args: argparse.Namespace) -> list[tuple[str, list[Path]]]:
    """(session id, its main transcript files) for each session named."""
    if args.transcript:
        return [(Path(args.transcript).stem, [Path(args.transcript)])]
    mains = [(one, session_files(one)) for one in session_ids(args)]
    missing = [one for one, files in mains if not files]
    if missing:
        raise LedgerError(f"no transcript for session {', '.join(missing)} under "
                          f"{config_root() / 'projects'}; name the file with --transcript PATH")
    return mains


def sources(args: argparse.Namespace) -> list[Source]:
    """The sources a row or a measure reads, from --transcript, --session-id or the session's own id."""
    mains = main_files(args)
    if not args.agent:
        return [Source(session, None, tuple(files)) for session, files in mains]
    if len(mains) != 1:
        raise LedgerError("--agent names a sub-agent of one session; give one --session-id")
    session, files = mains[0]
    found = [path for main in files for path in agent_files(main).get(args.agent, [])]
    return [Source(session, args.agent, tuple(found + files))]


def keeper(source: Source, path: Path):
    """Which of a file's lines are the source's: the lead's are a main file's own lines; an agent's
    are the whole of its own file, or its sidechain lines in an older main file."""
    if source.agent is None:
        return lead
    if path.name.startswith("agent-"):
        return lambda entry: True
    return lambda entry: entry.get("isSidechain") is True and entry.get("agentId") == source.agent


def read_source(source: Source) -> tuple[dict[str, Reply], int]:
    """A source's replies, and the lines that could not be read."""
    out: dict[str, Reply] = {}
    bad = 0
    for path in source.files:
        found, unread = entries(path)
        bad += unread
        for reply in replies(found, keeper(source, path)).values():
            merge(out, reply)
    return out, bad


def side_agents(session: str, files: tuple[Path, ...]) -> dict[str, Source]:
    """Every sub-agent the session's record holds, by id: its own files, else its sidechain lines."""
    found: dict[str, list[Path]] = {}
    for main in files:
        for agent, paths in agent_files(main).items():
            found.setdefault(agent, []).extend(paths)
        for entry in entries(main)[0]:
            if entry.get("isSidechain") is True and entry.get("agentId"):
                found.setdefault(str(entry["agentId"]), [])
    return {agent: Source(session, agent, tuple(paths + list(files))) for agent, paths in found.items()}


def agent_meta(source: Source) -> dict:
    """What Claude Code wrote beside a sub-agent's transcript (its type, its description, whether it
    finished), or {} when nothing readable is there."""
    for path in source.files:
        if path.name.startswith("agent-"):
            try:
                meta = json.loads(path.with_suffix(".meta.json").read_bytes().decode("utf-8"))
                return meta if isinstance(meta, dict) else {}
            except (OSError, ValueError):
                return {}
    return {}


def record_of(ledger: Path) -> Path:
    """The measured record beside a ledger: spend-ledger.md -> spend-ledger.measured.jsonl."""
    return ledger.with_suffix(".measured.jsonl")


def counted(record: Path) -> set[str]:
    """Every reply a measured row has already counted. A record that cannot be read refuses: what it
    holds cannot be known, and guessing would count a reply twice or never."""
    if not record.is_file():
        return set()
    try:
        lines = record.read_bytes().decode("utf-8").splitlines()
    except (OSError, UnicodeDecodeError) as exc:
        raise LedgerError(f"cannot read the measured record {record}: {exc}") from exc
    keys: set[str] = set()
    for number_, line in enumerate(lines, 1):
        if not line.strip():
            continue
        try:
            keys.update(str(key) for key in json.loads(line)["replies"])
        except (ValueError, KeyError, TypeError):
            raise LedgerError(f"{record}:{number_} is not a measured row's record; which replies are counted "
                              f"cannot be known, so nothing is measured") from None
    return keys


def totals(found: dict[str, Reply]) -> tuple[int, ...]:
    return tuple(sum(kind) for kind in zip(*(reply.counts for reply in found.values()))) or (0,) * len(KINDS)


def weighed(found: dict[str, Reply]) -> int:
    """The replies' weighted tokens, to the nearest token: the Weighted cell."""
    return round(sum(reply.weighted() for reply in found.values()))


def tiers(found: dict[str, Reply]) -> str:
    """The model tiers that gave the replies, the busiest first: 'sonnet', or 'opus, haiku'."""
    seen: dict[str, int] = {}
    for reply in found.values():
        if reply.model and reply.model != "<synthetic>":
            name = next((tier for tier in TIERS if tier in reply.model.lower()), reply.model)
            seen[name] = seen.get(name, 0) + 1
    return ", ".join(sorted(seen, key=lambda name: -seen[name])) or UNKNOWN


def counts_text(found: dict[str, Reply]) -> str:
    counts = totals(found)
    return ("  ".join(f"{name} {value:,}" for name, value in zip(KINDS, counts))
            + f"  = {sum(counts):,} raw, {weighed(found):,} weighted")


@dataclass(frozen=True)
class Taken:
    """What one measured row takes from the record: the new replies, and the record's line for them."""

    found: dict[str, Reply]
    sources: list[Source]
    notes: list[str]

    def line(self, stage: str) -> str:
        counts = dict(zip(("uncached", "cache_write", "cache_read", "out"), totals(self.found)))
        counts.update(cache_write_1h=sum(reply.hour for reply in self.found.values()), weighted=weighed(self.found))
        return json.dumps({
            "schema": 1, "time": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "stage": stage, "sessions": sorted({source.session for source in self.sources}),
            "agent": self.sources[0].agent, "counts": counts, "replies": sorted(self.found)}) + "\n"

    def label(self) -> str:
        """The Session cell when no --session is given: the session's first eight characters, an agent's too."""
        source = self.sources[0]
        if source.agent:
            return f"{source.session[:8]} agent-{source.agent[:8]}"
        return ", ".join(sorted({source.session[:8] for source in self.sources}))


def about(source: Source) -> str:
    """A sub-agent as its record describes it: '(builder: Build MOD-01 RegisterGuard)'."""
    meta = agent_meta(source)
    return f"({meta.get('agentType', '?')}: {meta.get('description', '?')})"


def new_replies(chosen: list[Source], already: set[str]) -> tuple[dict[str, Reply], list[str]]:
    """The sources' replies no earlier row counted, and a note for each record with unreadable lines."""
    found: dict[str, Reply] = {}
    notes: list[str] = []
    for source in chosen:
        read, bad = read_source(source)
        if bad:
            notes.append(f"{bad} line(s) of {source.session[:8]}'s record could not be read and are not counted "
                         f"(a line still being written is one)")
        for reply in read.values():
            if reply.key not in already:
                merge(found, reply)
    return found, notes


def unfinished(source: Source) -> list[str]:
    """A note when a sub-agent's record says it has not finished: its row holds its usage so far."""
    meta = agent_meta(source)
    if not meta or meta.get("finished") is True:
        return []
    return [f"sub-agent {source.agent}'s record does not say it finished: this row holds its usage so far, and a "
            f"later row for it would add the rest"]


def uncounted_agents(chosen: list[Source], already: set[str]) -> list[str]:
    """A note for each sub-agent of the sessions with replies no row has counted: each gets a row of its own."""
    notes = []
    for source in chosen:
        for agent, side in side_agents(source.session, source.files).items():
            left = [key for key in read_source(side)[0] if key not in already]
            if left:
                notes.append(f"not in any row yet: sub-agent {agent} {about(side)}, {len(left)} replies; it gets a "
                             f"row of its own with --agent {agent}")
    return notes


def take(args: argparse.Namespace, ledger: Path) -> Taken:
    """The replies this row measures: the source's replies no earlier row counted."""
    chosen = sources(args)
    already = counted(record_of(ledger))
    found, notes = new_replies(chosen, already)
    if not found:
        whose = f"sub-agent {args.agent}" if args.agent else "the lead"
        raise LedgerError(f"the record holds no reply of {whose} that the ledger has not already counted: "
                          f"this row would record nothing")
    notes += unfinished(chosen[0]) if args.agent else uncounted_agents(chosen, already)
    return Taken(found, chosen, notes)


def refusal(args: argparse.Namespace) -> str:
    """Why add refuses these options, or ''."""
    rules = (
        (args.tokens_in is not None or args.tokens_out is not None,
         "token counts are measured, never typed (2.8.1): give --measured, and add reads them from the session's "
         "own record"),
        (not args.measured and bool(args.agent or args.session_id or args.transcript),
         "--agent, --session-id and --transcript name what --measured reads; give --measured"),
        (not args.measured and not args.model, "--model is required without --measured"),
    )
    return next((why for broken, why in rules if broken), "")


def who(args: argparse.Namespace, taken: Taken | None) -> list[str]:
    """The Session and Model cells. A measured row's model is the record's; a --model that says
    otherwise is noted, not written."""
    if taken is None:
        return [cell(args.session, "--session"), cell(args.model, "--model")]
    model = tiers(taken.found)
    if args.model and args.model.lower() != model:
        print(f"spend: note: the record's model is {model!r}, not {args.model!r}; the Model cell takes the record's")
    return [cell(args.session or taken.label(), "--session"), cell(model, "the record's model")]


def checked(args: argparse.Namespace, path: Path) -> None:
    """Before anything is measured: the options add refuses, the stage note, and a ledger that reads."""
    refused = refusal(args)
    if refused:
        raise LedgerError(refused)
    if not UNIT.match(args.stage):
        print(f"spend: note: stage {args.stage!r} is not 'kind:id ...', so no forecast will price it")
    if path.is_file():
        read_rows(path)


def cmd_add(args: argparse.Namespace) -> int:
    path = Path(args.ledger)
    checked(args, path)
    taken = take(args, path) if args.measured else None
    usd = figure(args.usd, float, "--usd")
    if taken is None and usd == UNKNOWN:
        raise LedgerError("a row with no tokens and no dollars records nothing; give --measured, or --usd from a "
                          "per-token bill")
    counts = [str(n) for n in (*totals(taken.found), weighed(taken.found))] if taken else [UNKNOWN] * (len(KINDS) + 1)
    row = [cell(args.stage, "--stage"), *who(args, taken), *counts, usd, cell(args.note, "--note"),
           cell(args.date or datetime.date.today().isoformat(), "--date")]
    write_row(path, "| " + " | ".join(row) + " |\n", taken.line(row[0]) if taken else "")
    print_added(path, row[0], taken)
    return 0


def print_added(path: Path, stage: str, taken: Taken | None) -> None:
    if taken is None:
        print(f"spend: added {stage} to {path}")
        return
    for note in taken.notes:
        print(f"spend: note: {note}")
    print(f"spend: added {stage} to {path} ({counts_text(taken.found)}, {len(taken.found)} replies)")


def write_row(path: Path, row: str, record_line: str) -> None:
    """Append the row, below a measured table, and its record line. The record goes first; if the
    ledger cannot then be written, the record is put back, so no reply is marked counted without a row."""
    if path.is_file():
        text = path.read_bytes().decode("utf-8")
        text += "" if text.endswith("\n") else "\n"
        if last_table(path) != COLUMNS:
            text += MEASURED_SECTION
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        text = HEADER
    record = record_of(path)
    before = record.read_bytes() if record.is_file() else None
    if record_line:
        with record.open("ab") as fh:
            fh.write(record_line.encode("utf-8"))
    try:
        path.write_bytes((text + row).encode("utf-8"))
    except OSError:
        if record_line:
            record.unlink() if before is None else record.write_bytes(before)
        raise


def show(one: Source) -> dict[str, Reply]:
    """One line of `measure`: a lead's or a sub-agent's replies, four counts, weighted and tier; its replies back."""
    read, bad = read_source(one)
    name, described = (f"agent {one.agent}", f"  {about(one)}") if one.agent else ("lead", "")
    print(f"  {name:<26} {len(read):>5} replies  {counts_text(read)}  [{tiers(read)}]{described}")
    if bad:
        print(f"  {'':<26} {bad} line(s) could not be read and are not counted")
    return read


def cmd_measure(args: argparse.Namespace) -> int:
    """`measure`: the record's four counts for the lead and each sub-agent, and how many replies the
    ledger has already counted. Writes nothing."""
    ledger = Path(args.ledger)
    already = counted(record_of(ledger))
    every: dict[str, Reply] = {}
    for source in sources(args):
        print(f"measure: session {source.session}")
        for path in source.files:
            print(f"  transcript {path}")
        shown = [source] if source.agent else [source, *side_agents(source.session, source.files).values()]
        for one in shown:
            every.update(show(one))
    print(f"  {'all':<26} {len(every):>5} replies  {counts_text(every)}")
    if already:
        print(f"  already in {ledger}'s rows: {len(set(every) & already)} of {len(every)} replies")
    return 0


def cmd_forecast(args: argparse.Namespace) -> int:
    rows = read_rows(Path(args.ledger))
    total, per_unit, measured = forecast(rows, args.unit_kind, args.units, args.measure, args.unit_cost)
    basis = f"{len(measured)} measured: {', '.join(measured)}" if measured else "the owner's estimate"
    print(f"forecast: {args.units} {args.unit_kind} units x {money(per_unit, args.measure)} per unit "
          f"({basis}) = {money(total, args.measure)}")
    if measured and args.measure == "tokens":
        units = [row for row in priced(rows, "tokens")[0] if row.unit() and row.unit()[0] == args.unit_kind]
        print(f"          those units: {shares(units)}")
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    rows = read_rows(Path(args.ledger))
    counted_rows, left_out = priced(rows, args.measure)
    spent = sum(row.cost(args.measure) for row in counted_rows)
    ahead = 0.0
    if args.units:
        ahead, per_unit, _ = forecast(rows, args.unit_kind, args.units, args.measure, args.unit_cost)
    headroom = args.budget - spent - ahead
    print(f"spent:    {money(spent, args.measure)} of {money(args.budget, args.measure)} ({len(counted_rows)} rows)")
    if args.measure == "tokens":
        print(f"          {shares(counted_rows)}")
    if left_out:
        print(f"          not in this total: {len(left_out)} rows from before measuring (2.8.1), whose tokens "
              f"were never measured")
    if args.units:
        print(f"forecast: {money(ahead, args.measure)} ({args.units} {args.unit_kind} units x "
              f"{money(per_unit, args.measure)})")
    print(f"headroom: {money(headroom, args.measure)}")
    if headroom < 0:
        print(f"status: OVER BUDGET by {money(-headroom, args.measure)}. Halt for the owner's decision (TE-1): "
              "raise the budget, narrow the scope, or stop.")
        return 1
    print("status: within budget")
    return 0


def measuring(one: argparse.ArgumentParser) -> None:
    """The options that name what --measured, and measure, read."""
    one.add_argument("--session-id", help="the session(s) to measure, comma-separated (default: this session, "
                                          "CLAUDE_CODE_SESSION_ID)")
    one.add_argument("--transcript", help="a session's transcript file, named directly")
    one.add_argument("--agent", help="one sub-agent of the session, by its agent id (the Agent result's agentId)")


def parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(prog="spend.py", description="The spend ledger (Amendment T-1), its tokens "
                                                              "measured from the session's own record (2.8.1).")
    sub = ap.add_subparsers(dest="command", required=True)
    add = sub.add_parser("add", help="append one stage's spend")
    add.add_argument("--stage", required=True, help="kind:id detail, e.g. 'module:MOD-03 build'")
    add.add_argument("--measured", action="store_true",
                     help="read the four token counts from the record: the replies since the last row")
    measuring(add)
    add.add_argument("--model", help="the tier that ran it: opus, sonnet, script (with --measured, the record's)")
    add.add_argument("--session", help="a label for the Session cell (default: the session id's first 8)")
    add.add_argument("--usd", help="dollars from a per-token bill (a cloud or API run's /cost); never an estimate")
    add.add_argument("--note", help="what the stage produced (the Output column)")
    add.add_argument("--date", help="YYYY-MM-DD (default today)")
    add.add_argument("--tokens-in", help=argparse.SUPPRESS)          # refused: tokens are measured (2.8.1)
    add.add_argument("--tokens-out", help=argparse.SUPPRESS)
    measure = sub.add_parser("measure", help="print the record's four counts, writing nothing")
    measuring(measure)
    for name, helptext in (("forecast", "price N more units of a kind (TE-8)"),
                           ("status", "spend so far, the forecast, and the headroom (TE-1)")):
        one = sub.add_parser(name, help=helptext)
        if name == "status":
            one.add_argument("--budget", type=float, required=True, help="the phase or run budget")
        one.add_argument("--units", type=int, required=(name == "forecast"), help="units still to run")
        one.add_argument("--unit-kind", required=(name == "forecast"), help="the Stage kind: module, facet, ...")
        one.add_argument("--unit-cost", type=float, help="the owner's estimate per unit, for a kind not yet measured")
        one.add_argument("--measure", choices=MEASURES, default="usd",
                         help="dollars (default) or tokens: every measured row's Weighted cell, its four kinds "
                              "weighed by API price against one fresh input token")
    for one in sub.choices.values():
        one.add_argument("--ledger", default=str(LEDGER), help=f"the ledger (default {LEDGER.as_posix()})")
    return ap


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    if args.command in ("forecast", "status") and (args.units or 0) < 0:
        print("spend: --units cannot be negative", file=sys.stderr)
        return 2
    if args.command == "status" and (args.units is None) != (args.unit_kind is None):
        print("spend: --units and --unit-kind go together", file=sys.stderr)
        return 2
    try:
        return {"add": cmd_add, "measure": cmd_measure, "forecast": cmd_forecast,
                "status": cmd_status}[args.command](args)
    except LedgerError as exc:
        print(f"spend: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")      # every tool writes UTF-8 (2.8.0)
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
