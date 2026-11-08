#!/usr/bin/env python3
"""
gate_reach — the rules 2.6.17 adds to tools/gate.py, so the gate holds from every session shape.

LedgerCore V2 Phase 4 attempt 1 built four steps with the gate never firing: the lead session started in another
folder, its builders wrote into the repo by absolute path, and nothing on the commit path checked anything. The
plugin's router hook now runs this repo's gate.py from any session (hooks/route.py in the plugin); these rules are
what the gate then holds:

  probe      A write to .metaframework/gate-probe is always refused, and the refusal is logged to
             .metaframework/gate-live.jsonl with the nonce, the session and agent ids and gate.py's digest. The hook
             writes the proof, so the proof cannot exist unless the hook ran. tools/brief.py verify reads it.
  protected  The two logs and .githooks/ are written by tools only, and git's own records (.git/) by git commands
             only (2.6.21). A builder (a call with an agent_id) may not write tools/, .githooks/, .claude/ or
             .metaframework/: the gate's own machinery and the exception list.
  shell src  A shell command that writes content into a library source file is refused: the gate reads what Write
             and Edit carry, and cannot read what a shell writes. Removing, moving inside git, or restoring a file
             adds no content and is not refused.
  folders    (2.6.21) A shell path is read for where it lands. A copy or move into a folder (one on disk, one written
             with a trailing slash, cp -t, -Destination) writes <folder>/<source name>; a folder removed, moved or
             copied takes everything beneath it, so `rm -r governance/S3` and `rm -rf .` reach every frozen, sealed
             and protected path under them. Copying out of a protected folder is a read and passes.
  settings   Nothing in a session changes core.hooksPath, or (2.6.21) merge.ff, pull.ff or a config include, by
             `git config`, `git -c` or the environment. Only a real write is judged (2.6.21): a commit message, an
             echo or a grep that names the setting passes.
  history    (2.6.21) Nothing lands commits without the commit or merge check: no fast-forward (--ff, --ff-only, git
             pull, a fetch or push into a local branch), no rebase, commit-tree, update-ref, forced branch or reset
             onto another commit, cherry-pick and revert only with --no-commit, no merge or am with --no-verify.
             The owner runs any of these from their own terminal: the rule is the session gate's.
  staging    (2.6.21) A call that stages and then commits is refused: the checks read the index before it runs.
  tags       (2.6.21) A builder creates, moves and deletes no tag.
  commit     A commit into this repo, however it is spelled (git -C <repo>, cd <repo>; git commit), never skips the
             pre-commit checks (--no-verify, -n), needs the commit hook installed, and runs tools/precommit.py first.
  brief      In Phase 4, a sub-agent launched to work on a module here carries a current MF-BRIEF stamp from
             tools/brief.py: issued, unused, and with every review-basis digest still live; and (2.6.21) when the
             build has .metaframework/operating-rules.md, the MF-RULES line of its current digest; and (2.7.0) it is
             launched as the builder profile, .claude/agents/builder.md.
  red        (2.7.0) In a Python build, a builder writes its module's S3 §2 File with Write or Edit only after
             `tools/brief.py red` has watched the step's new base-case tests fail: .metaframework/red-log.jsonl holds
             a line for its nonce (the agent's nonce from its probe in gate-live.jsonl, the nonce's module from
             brief-log.jsonl). new-object.py's stub is written by the tool and is not refused.
  long runs  (2.8.0) tools/k7-run.py, tools/seal.py check and the declared full suite (test_command, with options
             only) start through tools/run.py, which runs them detached and keeps their record on disk. Read in each
             simple command and in a quoted command a shell is handed (bash -c, powershell -Command).

git is read however it is spelled (2.7.0): git.exe, Git, or a path to either is git to every rule. Archives unpacked
(tar -x, Expand-Archive), folders synced (rsync) and files swept (find -delete) are writes to where they land.

Each rule returns '' to pass or the reason to deny. gate.py runs them before its own.
"""

import glob
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import NamedTuple

import basis
from gatecheck import hooks_installed

PROBE = ".metaframework/gate-probe"
LIVE_LOG = ".metaframework/gate-live.jsonl"
BRIEF_LOG = ".metaframework/brief-log.jsonl"
RED_LOG = ".metaframework/red-log.jsonl"
BUILDER_AGENT = "builder"
HOOK_SESSIONS = ".metaframework/hook-sessions.txt"
RULES_DOC = ".metaframework/operating-rules.md"
BUILDER_OFF_LIMITS = ("tools/", ".githooks/", ".claude/", ".metaframework/")
FILE_KEYS = ("file_path", "notebook_path", "path")
FILE_TOOLS = ("Write", "Edit", "MultiEdit", "NotebookEdit")
AGENT_TOOLS = ("Agent", "Task")
READ_ONLY_AGENTS = ("Explore", "Plan")
SHELLS = {"Bash": "bash", "Monitor": "bash", "PowerShell": "ps",
          "mcp__terminal__run_in_terminal": "ps" if os.name == "nt" else "bash"}

TOKEN = r"\"[^\"]*\"|'[^']*'|[^\s\"';|&<>]+"
QUOTED = re.compile(r"\"[^\"]*\"|'[^']*'")
SEGMENT = re.compile(r"\"[^\"]*\"|'[^']*'|&&|\|\||[;|\n]|[^\"';|&\n]+|&")
REDIRECT = re.compile(r"(?<![0-9&>])>{1,2}(?!&)\s*(" + TOKEN + ")")
CD = re.compile(r"^(?:cd|chdir|pushd|set-location|push-location|sl)\s+(" + TOKEN + r")\s*$", re.I)
GIT = r"\bgit\b((?:\s+(?:-C\s+(?:" + TOKEN + r")|-c\s+\S+|--config-env\s+\S+|--[\w-]+(?:=\S+)?))*)\s+"
# A shell handed a command as a string: bash -c "...", powershell -Command "...", cmd /c "..." (2.6.21).
LAUNCHER = re.compile(r"\b(?:bash|sh|zsh|pwsh|powershell|cmd)(?:\.exe)?(?:\s+-[\w-]+)*?\s+(?:-\w*c|-command|/c)\s*$",
                      re.I)
# Verbs whose every operand is written; verbs whose last operand is (a copy's destination); and moves, whose last
# operand is written and whose other operands are removed.
CONTENT = {"bash": re.compile(r"^(tee|dd|truncate)$"),
           "ps": re.compile(r"^(set-content|add-content|clear-content|out-file|new-item|set-item|tee-object|"
                            r"compress-archive|export-csv|export-clixml|sc|ac|clc|ni|si|tee)$", re.I)}
# git however it is spelled (2.7.0): git.exe, Git, or a path to either, when a git option or word follows. Read as
# plain `git` once, so every rule below sees one spelling.
GIT_SPELLING = re.compile(r"(?<![^\s;&|(){}\"'`])(?:\"[^\"\n]*[/\\]|'[^'\n]*[/\\]|(?:[A-Za-z]:|[/~.])[^\s;&|()\"'`]*"
                          r"[/\\])?git(?:\.exe)?[\"']?(?=\s+[-A-Za-z])", re.I)
# Archives unpacked, folders synced and files swept (2.7.0): each writes, or removes, whatever lies where it lands.
UNPACK = re.compile(r"^(?:tar|bsdtar|gtar|expand-archive)(?:\.exe)?$", re.I)
SWEEP = re.compile(r"^find$")
TAR_DIRECTORY = re.compile(r"^(?:--directory=?|-C)(.*)$")
# A .NET method that writes, moves or deletes the file it is called on: every path in that command counts.
DOTNET_METHOD = re.compile(r"\.(delete|moveto|copyto|replace|create|createtext|appendtext|openwrite)\(|"
                           r"\[(?:system\.)?io\.(?:directory|fileinfo)\]::", re.I)
COPY = re.compile(r"^(cp|ln|copy-item|copy|cpi)$", re.I)
SYNC = re.compile(r"^rsync$")
MOVE = re.compile(r"^(mv|move-item|rename-item|move|mi|ren|rni)$", re.I)
# Where a copy or move lands when it is named (2.6.21): cp/mv/ln -t DIR or --target-directory[=]DIR, always a folder;
# PowerShell's -Destination[:]PATH, a folder or a file.
NAMED_DESTINATION = {"bash": re.compile(r"^(?:--target-directory=?|-[a-zA-Z]*t)(.*)$"),
                     "ps": re.compile(r"^-des[a-z]*:?(.*)$", re.I)}
LANDS = ("last", "move", "gitmove")
WILD = re.compile(r"[*?[]")
# git's own commands that write or remove a path they name; read only for the frozen-S3 and sealed rules (2.6.18),
# because restoring a file from git is how a session repairs .githooks/ and the like.
GIT_WRITES = re.compile(r"^(checkout|restore|rm|mv|apply)$")
EDIT_IN_PLACE = re.compile(r"^(sed|perl)$")
REMOVE = re.compile(r"^(rm|rmdir|unlink|shred|remove-item|del|erase|rd|ri)$", re.I)
DOTNET_WRITE = re.compile(r"\[(?:system\.)?io\.file\]::\w+\(\s*(\"[^\"]*\"|'[^']*')", re.I)
OUTFILE = re.compile(r"\b(?:curl|wget|invoke-webrequest|iwr)\b.*?(?:-outfile|--output|-o|-O)\s+(" + TOKEN + ")", re.I)
SKIP_VERIFY = re.compile(r"--no-verify\b|(?:^|\s)-(?!-)[a-zA-Z]*n[a-zA-Z]*(?=\s|$)")


@dataclass(frozen=True)
class Call:
    """One PreToolUse call, as this repo's gate sees it."""
    root: Path
    cwd: Path
    payload: dict
    source: re.Pattern
    phase: str

    @property
    def tool(self) -> str:
        return self.payload.get("tool_name", "")

    @property
    def ti(self) -> dict:
        return self.payload.get("tool_input") or {}

    @property
    def kind(self) -> str:
        return SHELLS.get(self.tool, "")

    @property
    def command(self) -> str:
        cmd = self.ti.get("command", "")
        return git_spelled(cmd) if isinstance(cmd, str) else ""

    def file_paths(self) -> list[str]:
        return [self.ti[k] for k in FILE_KEYS if isinstance(self.ti.get(k), str)] if self.tool in FILE_TOOLS else []


class Target(NamedTuple):
    """A path a call writes or removes, relative to the repo root ('.' is the root). `tree`: everything beneath it
    goes too, as when a folder is removed, moved or copied (2.6.21)."""
    rel: str
    how: str
    tree: bool = False

    def covers(self, rel: str) -> bool:
        """Does this write reach the path `rel`?"""
        return under(rel, self.rel) if self.tree else rel == self.rel

    def reaches(self, folder: str) -> bool:
        """Does this write reach anything inside `folder`?"""
        return under(self.rel, folder) or (self.tree and under(folder, self.rel))

    @property
    def shown(self) -> str:
        return "the repo root" if self.rel == "." else self.rel


class Verb(NamedTuple):
    """A writing verb's operands, read for where they land (2.6.21): how it writes them, the operands it reads or
    removes, a copy's or move's destination, and whether that destination is a folder whatever is on disk (cp -t)."""
    how: str
    sources: list
    dest: str = ""
    folder: bool = False


class GitCall(NamedTuple):
    """One git subcommand in a call (2.6.21): the folder it acts in, the subcommand, its words unquoted, and git's
    own options before the subcommand."""
    where: Path
    verb: str
    args: list
    opts: str


def git_spelled(cmd: str) -> str:
    """`cmd` with git however spelled (git.exe, Git, a path to either) read as `git` (2.7.0)."""
    return GIT_SPELLING.sub("git", cmd)


def under(rel: str, folder: str) -> bool:
    """Is `rel` the folder itself or beneath it? '.' is the repo root, above everything."""
    return folder == "." or rel == folder or rel.startswith(folder + "/")


def folder_note(t: Target, hit: str) -> str:
    """2.6.21: for a refusal reached through a folder above the protected path, what to do instead."""
    if t.rel == hit or not (t.tree and t.covers(hit)):
        return ""
    through = t.shown if t.rel == "." else f"{t.rel}/"
    return f" The command reaches it through {through}: name the files you mean, never a folder that holds them."


def unquote(token: str) -> str:
    return token[1:-1] if len(token) > 1 and token[0] == token[-1] and token[0] in "\"'" else token


def native(path: str) -> str:
    """Git Bash's /c/... as C:/... on Windows; anything else unchanged."""
    m = re.match(r"^/([A-Za-z])(/|$)", path)
    return f"{m.group(1)}:/{path[3:]}" if m and os.name == "nt" else path


def resolve(base: Path, path: str) -> Path:
    """`path` against `base`, reading Git Bash's /c/... as C:/... on Windows."""
    q = Path(native(unquote(path.strip())))
    return (q if q.is_absolute() else base / q).resolve()


def found_at(base: Path, path: str) -> Path | None:
    """resolve(), or None for a path the system cannot read."""
    try:
        return resolve(base, path)
    except (OSError, ValueError):
        return None


def is_folder(path: Path | None) -> bool:
    try:
        return bool(path) and path.is_dir()
    except OSError:
        return False


def live(token: str) -> bool:
    """A literal path, not a variable or a call ($x, &x), which the gate cannot read."""
    return not unquote(token).startswith(("$", "&"))


def located(call: Call, path: Path | None, how: str, tree: bool = False) -> Target | None:
    """`path` as a Target, or None outside the repo. A folder above the repo, removed or overwritten, takes all of
    it."""
    if path is None:
        return None
    if tree and (path == call.root or path in call.root.parents):
        return Target(".", how, True)
    try:
        return Target(path.relative_to(call.root).as_posix(), how, tree)
    except ValueError:
        return None


def spot(call: Call, base: Path, token: str, how: str, folders: bool = False) -> Target | None:
    """The Target a token names; with `folders`, a folder it names is taken with everything beneath it."""
    path = found_at(base, token)
    return located(call, path, how, folders and is_folder(path))


def segments(cmd: str) -> list[str]:
    """The simple commands in `cmd`, split at ; && || | and newlines outside quotes."""
    out, cur = [], []
    for t in SEGMENT.findall(cmd):
        if t in ("&&", "||", ";", "|", "\n"):
            out.append("".join(cur))
            cur = []
        else:
            cur.append(t)
    out.append("".join(cur))
    return [s.strip() for s in out if s.strip()]


VERB_KINDS = ((COPY, "last"), (MOVE, "move"), (REMOVE, "remove"))


def unpacks(args: list[str]) -> bool:
    """Does a tar with these arguments extract: -x in a short cluster, --extract or --get, or x in its first word?"""
    first = args[0] if args else ""
    return bool(re.match(r"^[A-Za-z]*x[A-Za-z]*$", first)) or any(
        a in ("--extract", "--get") or re.match(r"^-[A-Za-z]*x", a) for a in args)


def verb_kind(words: list[str], i: int, kind: str) -> str:
    """How the verb at words[i] writes its operands: 'content', 'last', 'move', 'gitmove', 'remove', (2.7.0)
    'unpack' (tar), 'expand' (Expand-Archive), 'sync' or 'sweep', or '' (not a writing verb)."""
    w, after = words[i], words[i + 1:]
    if i and words[i - 1] == "git":
        return {"rm": "remove", "mv": "gitmove"}.get(w, "")   # git moves and removes tracked content; it adds none
    if CONTENT[kind].match(w) or (EDIT_IN_PLACE.match(w) and any(x.startswith("-i") for x in after)):
        return "content"
    return landing_kind(w, after) or next((how for rx, how in VERB_KINDS if rx.match(w)), "")


def landing_kind(w: str, after: list[str]) -> str:
    """2.7.0: 'expand' (Expand-Archive), 'unpack' (tar -x), 'sync' (rsync) or 'sweep' (find -delete); '' for any
    other verb."""
    if UNPACK.match(w):
        return "expand" if w.lower().startswith("expand") else "unpack" if unpacks(after) else ""
    if SYNC.match(w):
        return "sync"
    return "sweep" if SWEEP.match(w) and "-delete" in after else ""


def operand(word: str) -> str:
    """The path in an operand: `of=x` and `--output=x` name x."""
    return word.split("=", 1)[1] if re.match(r"^-*\w+=", word) else word


def named_destination(rest: list[str], kind: str) -> tuple[str, list[str]]:
    """(the destination -t, --target-directory or -Destination names, the other words); ('', rest) for none."""
    for i, w in enumerate(rest):
        m = NAMED_DESTINATION[kind].match(w)
        if m:
            value = m.group(1) or "".join(rest[i + 1:i + 2])
            return value, rest[:i] + rest[i + (1 if m.group(1) else 2):]
    return "", rest


def unpacked_at(how: str, rest: list[str]) -> str:
    """Where an archive is unpacked (2.7.0): tar's -C or --directory, Expand-Archive's -DestinationPath or second
    operand, else the folder the command runs in."""
    if how == "expand":
        named, rest = named_destination(rest, "ps")
        ops = [x for x in rest if not x.startswith("-")]
        return named or (ops[1] if len(ops) > 1 else ".")
    for i, w in enumerate(rest):
        m = TAR_DIRECTORY.match(w)
        if m:
            return m.group(1) or "".join(rest[i + 1:i + 2]) or "."
    return "."


def swept(rest: list[str]) -> list[str]:
    """The starting points `find` searches (2.7.0): the words before its first test, after -H, -L, -P, -O and -D."""
    out, i = [], 0
    while i < len(rest) and re.match(r"^-(?:[HLP]|O\d*|D)$", rest[i]):
        i += 2 if rest[i] == "-D" else 1
    for w in rest[i:]:
        if w.startswith(("-", "(", "!", ")")):
            break
        out.append(w)
    return out or ["."]


def landing_verb(how: str, rest: list[str]) -> Verb:
    """2.7.0: an archive lands where it is unpacked, a sweep removes what lies under its starting points, and a sync
    lands at its last operand (rsync's -t keeps times: it names no destination)."""
    if how in ("unpack", "expand"):
        return Verb("unpack", [], unpacked_at(how, rest), True)
    if how == "sweep":
        return Verb(how, swept(rest))
    ops = [x for x in rest if not x.startswith("-")]
    return Verb(how, ops[:-1], ops[-1]) if ops else Verb(how, [])


def read_verb(how: str, rest: list[str], kind: str) -> Verb:
    """The words after a writing verb. A copy or move lands at its named destination, or at its last operand."""
    if how in ("unpack", "expand", "sweep", "sync"):
        return landing_verb(how, rest)
    named, rest = named_destination(rest, kind) if how in LANDS else ("", rest)
    ops = [operand(x) for x in rest if not x.startswith("-") or "=" in x]
    if how not in LANDS:
        return Verb(how, ops)
    if named:
        return Verb(how, ops, named, kind == "bash")
    return Verb(how, ops[:-1], ops[-1]) if ops else Verb(how, [])


def first_verb(words: list[str], kind: str) -> Verb | None:
    """The first writing verb among `words` that names an operand."""
    for i in range(len(words)):
        how = verb_kind(words, i, kind)
        verb = read_verb(how, words[i + 1:], kind) if how else None
        if verb and (verb.sources or verb.dest):
            return verb
    return None


def expanded(base: Path, tokens: list[str]) -> list[str]:
    """Each live token, or the paths its wildcards match on disk, as a shell expands them (2.6.21)."""
    out = []
    for t in (x for x in tokens if live(x)):
        p = native(unquote(t))
        out += (glob.glob(p, root_dir=base) if WILD.search(p) else []) or [t]
    return out


def last_name(token: str) -> str:
    """The name a source takes inside a destination folder: its last component as written ('.' for a folder's
    contents, as in cp -r dir/. dest/)."""
    parts = [x for x in re.split(r"[\\/]", unquote(token)) if x]
    return parts[-1] if parts else "."


def files_under(folder: Path) -> list[str]:
    """Every file beneath `folder`, relative to it."""
    return [Path(d, f).relative_to(folder).as_posix() for d, _, names in os.walk(folder) for f in names]


def arrival(call: Call, src: Path | None, at: Path | None, how: str) -> list[Target]:
    """`src` landing at `at`: the path itself, and for a folder each file beneath it, so the source rule sees them."""
    top = located(call, at, how, is_folder(src))
    if top is None or not top.tree:
        return [top] if top else []
    below = (located(call, at / f, how) for f in files_under(src))
    return [top] + [t for t in below if t]


def landing(call: Call, base: Path, verb: Verb, how: str) -> list[Target]:
    """Where a copy or move puts its sources (2.6.21): <folder>/<source name> when the destination is a folder, else
    the destination itself."""
    dest = found_at(base, verb.dest) if live(verb.dest) else None
    if dest is None:
        return []
    into = verb.folder or unquote(verb.dest).endswith(("/", "\\")) or is_folder(dest)
    out = []
    for s in expanded(base, verb.sources):
        out += arrival(call, found_at(base, s), found_at(dest, last_name(s)) if into else dest, how)
    return out or [t for t in [located(call, dest, how)] if t]


def written(call: Call, base: Path, tokens: list[str]) -> list[Target]:
    """Each live token, as a path written."""
    return [t for t in (spot(call, base, s, "content") for s in tokens if live(s)) if t]


def removed(call: Call, base: Path, tokens: list[str]) -> list[Target]:
    """Each path a removal or a move takes away; a folder goes with everything beneath it (2.6.21)."""
    return [t for t in (spot(call, base, s, "remove", True) for s in expanded(base, tokens)) if t]


def verb_targets(call: Call, base: Path, verb: Verb) -> list[Target]:
    """What a writing verb writes or removes: every operand of a content verb; for a removal or a move, each source
    (with everything beneath a folder); for a copy or move, where it lands."""
    if verb.how == "content":
        return written(call, base, verb.sources)
    if verb.how == "unpack":
        return beneath(call, base, verb, True)
    gone = [] if verb.how in ("last", "sync") else removed(call, base, verb.sources)
    if verb.how in ("remove", "sweep"):
        return gone
    landed = landing(call, base, verb, "remove" if verb.how == "gitmove" else "content") + gone
    return landed + beneath(call, base, verb, False) if verb.how == "sync" else landed


def beneath(call: Call, base: Path, verb: Verb, always: bool) -> list[Target]:
    """2.7.0: everything beneath where a verb lands. An archive's contents are unknown (`always`); a synced folder may
    change all it holds, when the destination is a folder."""
    dest = found_at(base, verb.dest) if live(verb.dest) else None
    into = always or is_folder(dest) or unquote(verb.dest).endswith(("/", "\\"))
    return [t for t in [located(call, dest, "content", True) if into else None] if t]


def segment_targets(call: Call, base: Path, seg: str) -> list[Target]:
    """Every path one simple command may write or remove, read from the folder it runs in."""
    plain = REDIRECT.findall(seg) + DOTNET_WRITE.findall(seg) + OUTFILE.findall(seg)
    if DOTNET_METHOD.search(seg):
        plain += QUOTED.findall(seg)
    found = [t for t in (spot(call, base, x, "content") for x in plain if live(x)) if t]
    verb = first_verb(re.findall(TOKEN, seg), call.kind)
    return found + (verb_targets(call, base, verb) if verb else [])


def targets(call: Call) -> list[Target]:
    """Everything this call writes or removes inside the repo. A shell path is read from the folder its own command
    runs in: after a `cd` earlier on the line, and from `git -C <dir>` (2.6.18); and for where it lands (2.6.21)."""
    found = [spot(call, call.cwd, p, "content") for p in call.file_paths()]
    if call.kind:
        found += [t for where, seg, _ in located_segments(call) for t in segment_targets(call, where, seg)]
    return [t for t in found if t]


def git_paths(seg: str) -> list[str]:
    """The paths a git command that writes them names: checkout, restore, rm, mv and apply."""
    words = [unquote(w) for w in re.findall(TOKEN, seg)]
    if "git" not in words:
        return []
    rest = words[words.index("git") + 1:]
    while rest and rest[0].startswith("-"):
        rest = rest[2:] if rest[0] in ("-C", "-c") else rest[1:]
    return [w for w in rest[1:] if not w.startswith("-")] if rest and GIT_WRITES.match(rest[0]) else []


def frozen_writes(root: Path, cwd: Path, payload: dict) -> list[Target]:
    """Every path a shell call may write, move or remove, git's own writing commands included: what the frozen-S3
    and sealed rules judge (2.6.18). A folder a command names takes everything beneath it (2.6.21). A command that
    only reads a frozen file, a copy out of it say, names nothing here."""
    call = Call(root, cwd, payload, re.compile(r"$^"), "")
    if not call.kind:
        return []
    found = targets(call)
    for where, seg, _ in located_segments(call):
        named = (spot(call, where, p, "content", True) for p in expanded(where, git_paths(seg)))
        found += [t for t in named if t]
    return found


def append_line(path: Path, record: dict) -> bool:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(record, sort_keys=True) + "\n")
        return True
    except OSError:
        return False


def note_hook_session(root: Path, payload: dict) -> None:
    """Record that this repo's own settings ran the gate in this session, so the plugin's router leaves the repo to
    them from then on. Claude Code reads hooks when a session starts: a session that copied the template in after
    it started never loads them, its id never lands here, and the router goes on gating it."""
    sid = payload.get("session_id")
    if not sid or os.environ.get("MF_ROUTED"):
        return
    path = root / HOOK_SESSIONS
    try:
        if sid not in (path.read_text(encoding="utf-8").split() if path.is_file() else []):
            with path.open("a", encoding="utf-8") as fh:
                fh.write(f"{sid}\n")
    except OSError:
        pass


def already_logged(root: Path, record: dict) -> bool:
    """The same probe, from the same session and agent, is logged once (the repo's hook and the router can both run)."""
    keys = ("nonce", "session_id", "agent_id")
    return any(all(x.get(k) == record[k] for k in keys) for x in read_jsonl(root / LIVE_LOG))


def probe_nonce(call: Call) -> str:
    text = call.command or str(call.ti.get("content") or call.ti.get("new_string") or "")
    m = re.search(r"nonce=([0-9a-f]{6,64})", text)
    return m.group(1) if m else ""


def log_probe(call: Call, nonce: str) -> bool:
    """Log the refusal (once per caller) with what tools/brief.py verify checks; False when it cannot be written."""
    p = call.payload
    record = {"nonce": nonce or None, "session_id": p.get("session_id"), "agent_id": p.get("agent_id")}
    return already_logged(call.root, record) or append_line(call.root / LIVE_LOG, {
        **record, "time": datetime.now(timezone.utc).isoformat(timespec="seconds"), "agent_type": p.get("agent_type"),
        "tool": call.tool, "gate_sha256": basis.file_sha256(Path(__file__).with_name("gate.py"))})


def rule_probe(call: Call) -> str:
    if not any(t.rel == PROBE for t in targets(call)):
        return ""
    nonce = probe_nonce(call)
    if not log_probe(call, nonce):
        return f"gate live, but the probe could not be logged to {LIVE_LOG}; the step cannot be accepted until it is."
    return (f"gate live: probe refused and logged in {LIVE_LOG} (nonce {nonce or 'none'}). This refusal is the "
            f"expected answer; carry on with the step.")


def machinery_reason(t: Target) -> str:
    """'' unless `t` reaches the logs (2.7.0: the red log among them), .githooks/ or (2.6.21) git's own records, which
    no session writes."""
    log = next((x for x in (LIVE_LOG, BRIEF_LOG, RED_LOG) if t.covers(x)), None)
    if log:
        return (f"{log} is written by the gate and tools/brief.py only: a step is accepted on what it records."
                + folder_note(t, log))
    if t.reaches(".githooks"):
        return (".githooks/ is installed by tools/install-gates.py and checked by phase4-checks.py gates; a "
                "session does not edit it. Restore it with `git checkout -- .githooks`." + folder_note(t, ".githooks"))
    if t.reaches(".git"):
        return (f"{t.shown} is git's own record of branches, tags and settings: change it through git commands "
                f"(git branch, git tag, git config), which the gate reads, never by writing the file."
                + folder_note(t, ".git"))
    return ""


def builder_reason(call: Call, t: Target) -> str:
    """'' unless a builder's write reaches the gate's own machinery."""
    if not call.payload.get("agent_id") or not any(t.reaches(f.rstrip("/")) for f in BUILDER_OFF_LIMITS):
        return ""
    return (f"a builder ({call.payload.get('agent_type') or 'sub-agent'}) may not write {t.shown}: tools/, "
            f".githooks/, .claude/ and .metaframework/ are the gate's own machinery and its exception list. "
            f"Report what you need to the lead.")


def rule_protected(call: Call) -> str:
    return next((r for t in targets(call) for r in (machinery_reason(t) or builder_reason(call, t),) if r), "")


def rule_shell_source(call: Call) -> str:
    if not call.kind:
        return ""
    hit = next((t.rel for t in targets(call) if t.how == "content" and call.source.match(t.rel)), None)
    return (f"this command writes {hit}, a library source file, through the shell, where the gate cannot read what "
            f"it writes. Write source with Write or Edit, or start a class with tools/new-object.py."
            if hit else "")


def folders_of(text: str, here: Path) -> list[tuple[Path, str]]:
    """(the folder each simple command in `text` runs in, the command), following cd from `here`."""
    out = []
    for seg in segments(text):
        moved = CD.match(seg)
        if moved:
            here = resolve(here, moved.group(1))
            continue
        out.append((here, seg))
    return out


def dash_c(here: Path, opts: str) -> Path:
    """The folder git acts in: `here`, or the one its -C option names."""
    c = re.search(r"-C\s+(" + TOKEN + ")", opts)
    return resolve(here, c.group(1)) if c else here


def located_segments(call: Call) -> list[tuple[Path, str, str]]:
    """(the folder git acts in, the segment, its git options) for each segment, following cd and git -C."""
    out = []
    for here, seg in folders_of(call.command, call.cwd):
        g = re.search(GIT, seg)
        opts = g.group(1) if g else ""
        out.append((dash_c(here, opts), seg, opts))
    return out


def inside(root: Path, where: Path) -> bool:
    return where == root or root in where.parents


def quoted_at(i: int, spans: list[tuple[int, int]]) -> bool:
    return any(a < i < b for a, b in spans)


def bare_git(here: Path, seg: str, spans: list[tuple[int, int]]) -> list[tuple[int, GitCall]]:
    """(where it starts, the call) for each git subcommand outside quoted text: a message that names one runs none."""
    found = [m for m in re.finditer(GIT + r"([\w-]+)", seg) if not quoted_at(m.start(), spans)]
    ends = [m.start() for m in found[1:]] + [len(seg)]
    return [(m.start(), GitCall(dash_c(here, m.group(1)), m.group(2),
                                [unquote(w) for w in re.findall(TOKEN, seg[m.end():end])], m.group(1)))
            for m, end in zip(found, ends)]


def launched_git(here: Path, seg: str, spans: list[tuple[int, int]], depth: int) -> list[tuple[int, GitCall]]:
    """(where it starts, the call) for each git subcommand in a command handed to a shell as a string."""
    if depth >= 2:
        return []
    return [(a, g) for a, b in spans if LAUNCHER.search(seg[:a])
            for h, s in folders_of(seg[a + 1:b - 1], here) for g in git_in(h, s, depth + 1)]


def git_in(here: Path, seg: str, depth: int = 0) -> list[GitCall]:
    """The git subcommands in one simple command, in the order they run."""
    spans = [m.span() for m in QUOTED.finditer(seg)]
    out = bare_git(here, seg, spans) + launched_git(here, seg, spans, depth)
    return [g for _, g in sorted(out, key=lambda x: x[0])]


def git_calls(call: Call) -> list[GitCall]:
    """Every git subcommand the call runs, in order (2.6.21). A commit message or an echo that names one runs
    nothing; a command handed to a shell as a string (bash -c "...") runs what it names."""
    return [g for here, seg in folders_of(call.command, call.cwd) for g in git_in(here, seg)]


def options(args: list[str]) -> list[str]:
    """The words before `--`: after it, every word is a path."""
    return args[:args.index("--")] if "--" in args else args


def short_letters(word: str, takes: str = "") -> str:
    """The letters of a short-option cluster such as -nx, up to the first that takes a value; '' for anything else."""
    m = re.match(r"^-([A-Za-z]+)", word)
    letters = m.group(1) if m else ""
    cut = next((i for i, ch in enumerate(letters) if ch in takes), None)
    return letters if cut is None else letters[:cut + 1]


def has_flag(args: list[str], names: tuple[str, ...], short: str = "", takes: str = "") -> bool:
    """Does `args` carry one of the long options `names`, or one of the `short` letters in a short-option cluster?"""
    return any(a.split("=", 1)[0] in names or set(short_letters(a, takes)) & set(short) for a in options(args))


def positionals(args: list[str], valued: tuple[str, ...] = ()) -> list[str]:
    """The words that are not options, skipping the value after each option in `valued`; after `--`, every word."""
    out, skip = [], False
    for i, a in enumerate(args):
        if skip:
            skip = False
        elif a == "--":
            return out + args[i + 1:]
        elif a in valued:
            skip = True
        elif not a.startswith("-"):
            out.append(a)
    return out


# The settings tools/install-gates.py makes, which a session never changes (2.6.21): a key, or the section that holds
# it (git config --remove-section core); '*' is git config --edit, which can change any of them.
GUARDED = re.compile(r"^(?:core(?:\.hookspath)?|merge(?:\.ff)?|pull(?:\.ff)?|include(?:\.path)?|includeif\..*|\*)$",
                     re.I)
GUARDED_TEXT = re.compile(r"core\.hookspath|(?:merge|pull)\.ff|include(?:if\.\S*?)?\.path", re.I)
HOOKSPATH = ("core.hooksPath is set by tools/install-gates.py and never changed in a session: with it gone, git skips "
             "the commit checks. To put it back, run python tools/install-gates.py.")
SETTING_REASONS = (
    (re.compile(r"^(?:merge|pull)", re.I),
     "merge.ff and pull.ff are set by tools/install-gates.py, so that every merge makes a merge commit and runs the "
     "merge check; a session never changes them. Merge with git merge --no-ff; to put them back, run python "
     "tools/install-gates.py."),
    (re.compile(r"^include", re.I),
     "a config include can override core.hooksPath and the merge settings tools/install-gates.py makes; a session "
     "adds or changes none. Set what you need with git config <key> <value>."),
    (re.compile(r"^\*$"),
     "git config --edit can change any setting, core.hooksPath among them: set what you need with git config <key> "
     "<value>."),
    (re.compile(r""), HOOKSPATH))
CONFIG_VALUED = ("-f", "--file", "--blob", "--type", "--default", "--comment", "--value")
CONFIG_READS = ("--get", "--get-all", "--get-regexp", "--get-urlmatch", "--get-color", "--get-colorbool", "-l",
                "--list")
CONFIG_NAMED = ("--unset", "--unset-all", "--replace-all", "--add", "--rename-section", "--remove-section")
CONFIG_VERBS = {"get": 0, "list": 0, "set": 1, "unset": 1, "rename-section": 1, "remove-section": 1}


def config_writes(args: list[str]) -> list[str]:
    """The keys, or sections, a `git config` call with these arguments writes ('*' for an edit); [] for a read."""
    pos = positionals(args, CONFIG_VALUED)
    if pos and pos[0] in CONFIG_VERBS:
        return pos[1:1 + CONFIG_VERBS[pos[0]]]
    if has_flag(args, ("-e", "--edit")) or pos[:1] == ["edit"]:
        return ["*"]
    if has_flag(args, CONFIG_READS):
        return []
    return pos[:1] if has_flag(args, CONFIG_NAMED) or len(pos) > 1 else []


def setting_writes(g: GitCall) -> list[str]:
    """The guarded settings one git command writes: by `git config`, or for its own run by -c or --config-env."""
    keys = [k for k in config_writes(g.args) if GUARDED.match(k)] if g.verb == "config" else []
    given = re.findall(r"(?:-c|--config-env)[\s=]+(" + TOKEN + ")", g.opts)
    return keys + [m.group(0) for v in given for m in GUARDED_TEXT.finditer(unquote(v))]


def env_settings(seg: str) -> list[str]:
    """The guarded settings a GIT_CONFIG* assignment in this segment names. Quoted text that assigns nothing, a
    commit message say, does not count."""
    bare = QUOTED.sub('""', seg)
    assigns = re.search(r"GIT_CONFIG\w*\s*=|env:GIT_CONFIG", bare, re.I) or re.search(r"[\"']GIT_CONFIG\w*[\"']", seg)
    return [m.group(0) for m in GUARDED_TEXT.finditer(seg)] if assigns else []


def setting_keys(call: Call) -> list[str]:
    """The guarded settings this call writes: by a git command here, or by an environment assignment in a command
    that reaches this repo (it holds for the git that follows)."""
    here = [g for g in git_calls(call) if inside(call.root, g.where)]
    keys = [k for g in here for k in setting_writes(g)]
    if here or any(inside(call.root, where) for where, _, _ in located_segments(call)):
        keys += [k for seg in segments(call.command) for k in env_settings(seg)]
    return keys


def setting_reason(key: str) -> str:
    return next(why for rx, why in SETTING_REASONS if rx.match(key))


def rule_hookspath(call: Call) -> str:
    """Nothing in a session changes core.hooksPath, merge.ff, pull.ff or a config include. Only a real write is
    judged (2.6.21): a commit message, an echo or a grep that names the setting changes nothing."""
    keys = setting_keys(call) if call.kind else []
    return setting_reason(keys[0]) if keys else ""


FAST_FORWARD = ("a fast-forward lands commits without the merge check (pre-merge-commit runs only when a merge commit "
                "is made): fetch, then git merge --no-ff.")
BRANCH_MOVE = ("this moves a branch onto commits no hook checked: make a new branch (git branch <name> <start>) and "
               "merge it with git merge --no-ff.")
ALWAYS = {
    "pull": "git pull can land commits without the merge check (a fast-forward, or a rebase): fetch, then git merge "
            "--no-ff.",
    "rebase": "git rebase writes commits without the commit check: merge with git merge --no-ff instead. The owner "
              "rebases from their own terminal.",
    "commit-tree": "git commit-tree makes a commit without the commit check: stage, then git commit.",
    "update-ref": "git update-ref moves a ref with no check: commit with git commit and merge with git merge --no-ff; "
                  "tags are placed by the tools and the owner.",
    "filter-branch": "rewriting history writes commits without the commit check: the owner runs it from their own "
                     "terminal.",
    "filter-repo": "rewriting history writes commits without the commit check: the owner runs it from their own "
                   "terminal."}
FETCH_VALUED = ("--depth", "--deepen", "--shallow-since", "--shallow-exclude", "-j", "--jobs", "-o", "--server-option",
                "--upload-pack", "--refmap", "--negotiation-tip")
PUSH_VALUED = ("-o", "--push-option", "--receive-pack", "--exec")
RESET_MODES = ("--hard", "--soft", "--mixed", "--keep", "--merge")


def judge_merge(call: Call, g: GitCall) -> str:
    if has_flag(g.args, ("--ff", "--ff-only")):
        return FAST_FORWARD
    if has_flag(g.args, ("--no-verify",)):
        return ("a merge here never skips the merge check (--no-verify): merge with git merge --no-ff and fix what "
                "the check reports.")
    return ""


def into_branch(spec: str) -> bool:
    """Does this refspec write a local branch: src:dst, dst neither a remote-tracking ref nor a tag?"""
    if ":" not in spec or "://" in spec:
        return False
    dst = spec.split(":", 1)[1]
    return bool(dst) and not dst.startswith(("refs/remotes/", "refs/tags/"))


def judge_fetch(call: Call, g: GitCall) -> str:
    if not any(into_branch(s) for s in positionals(g.args, FETCH_VALUED)[1:]):
        return ""
    return ("a fetch into a local branch moves it without the merge check: fetch into the remote-tracking refs "
            "(git fetch <remote>), then git merge --no-ff.")


def judge_push(call: Call, g: GitCall) -> str:
    pos = positionals(g.args, PUSH_VALUED)
    if not pos or (pos[0] != "." and found_at(g.where, pos[0]) not in (call.root, call.root / ".git")):
        return ""
    return "a push into this repository moves its branches without the merge check: git merge --no-ff instead."


def judge_pick(call: Call, g: GitCall) -> str:
    """cherry-pick and revert commit with no pre-commit hook, unless told not to commit."""
    if has_flag(g.args, ("--no-commit", "--abort", "--quit"), "n", "mXS"):
        return ""
    return (f"git {g.verb} commits without the commit check: run git {g.verb} --no-commit, then git commit in the next "
            f"call.")


def judge_branch(call: Call, g: GitCall) -> str:
    return BRANCH_MOVE if has_flag(g.args, ("-f", "--force"), "fMC", "u") else ""


def judge_checkout(call: Call, g: GitCall) -> str:
    return BRANCH_MOVE if has_flag(g.args, (), "B", "bB") else ""


def judge_switch(call: Call, g: GitCall) -> str:
    return BRANCH_MOVE if has_flag(g.args, ("--force-create",), "C", "cC") else ""


def judge_reset(call: Call, g: GitCall) -> str:
    """git reset onto any commit but HEAD moves the branch; with paths, or a lone path, it only unstages."""
    before = options(g.args)
    words = positionals(before)
    if g.args[len(before) + 1:] or len(words) != 1 or words[0] in ("HEAD", "@"):
        return ""
    target = found_at(g.where, words[0])
    if not has_flag(before, RESET_MODES) and target is not None and target.exists():
        return ""
    return ("git reset onto another commit moves the branch onto commits no hook checked: merge with git merge "
            "--no-ff; undo a commit with git revert --no-commit <commit>, then git commit; discard changes with git "
            "reset --hard HEAD or git stash; unstage with git reset -- <paths>.")


def judge_am(call: Call, g: GitCall) -> str:
    if not has_flag(g.args, ("--no-verify",)):
        return ""
    return "the checks run through pre-applypatch; never --no-verify. Apply without it and fix what the checks report."


HISTORY = {"merge": judge_merge, "fetch": judge_fetch, "push": judge_push, "cherry-pick": judge_pick,
           "revert": judge_pick, "branch": judge_branch, "checkout": judge_checkout, "switch": judge_switch,
           "reset": judge_reset, "am": judge_am,
           **{verb: (lambda call, g, why=why: why) for verb, why in ALWAYS.items()}}


def rule_history(call: Call) -> str:
    """2.6.21: nothing here lands commits on a branch without the commit or merge check."""
    here = [g for g in git_calls(call) if g.verb in HISTORY and inside(call.root, g.where)] if call.kind else []
    return next((r for g in here for r in (HISTORY[g.verb](call, g),) if r), "")


TAG_READS = ("-l", "--list", "-v", "--verify", "--contains", "--no-contains", "--merged", "--no-merged", "--points-at")
TAG_VALUED = ("-m", "--message", "-F", "--file", "-u", "--local-user", "--cleanup", "--sort", "--format", "--color",
              "--column", "--trailer")


def tag_names(root: Path) -> set[str]:
    try:
        r = subprocess.run(["git", "-C", str(root), "tag", "-l"], capture_output=True, encoding="utf-8",
                           errors="replace", timeout=15)
        return set(r.stdout.split())
    except (OSError, subprocess.SubprocessError):
        return set()


def pushes_tags(call: Call, g: GitCall) -> bool:
    if has_flag(g.args, ("--tags", "--follow-tags", "--mirror")):
        return True
    specs = positionals(g.args, PUSH_VALUED)[1:]
    names = tag_names(call.root) if specs else set()
    return any("refs/tags/" in s or set(re.split(r"[+:]", s)) & names for s in specs)


def tags_written(call: Call, g: GitCall) -> bool:
    """Does this git command create, move or delete a tag, here or on a remote?"""
    if g.verb == "tag":
        return not has_flag(g.args, TAG_READS) and bool(positionals(g.args, TAG_VALUED))
    return g.verb == "push" and pushes_tags(call, g)


def rule_builder_tags(call: Call) -> str:
    """2.6.21: a builder creates, moves and deletes no tag. Tags are the evidence the tools and the owner place."""
    if not (call.kind and call.payload.get("agent_id")) or not any(tags_written(call, g) for g in git_calls(call)):
        return ""
    return (f"a builder ({call.payload.get('agent_type') or 'sub-agent'}) creates, moves and deletes no tag: tags "
            f"(k7-pass, closed-by-owner, owner-round, seal) are evidence the tools and the owner place. Report what "
            f"you need to the lead.")


# git commands that change the index (2.6.21): a commit after one, in the same call, would be judged on the index as
# it was before the call ran.
STAGES = ("add", "rm", "mv", "update-index", "read-tree", "reset", "checkout", "switch", "merge", "cherry-pick",
          "revert", "am", "pull")


def stages(g: GitCall) -> bool:
    if g.verb in STAGES:
        return True
    if g.verb == "restore":
        return has_flag(g.args, ("--staged",), "S", "s")
    if g.verb == "apply":
        return has_flag(g.args, ("--cached", "--index"))
    return g.verb == "stash" and g.args[:1] in (["pop"], ["apply"])


def rule_staged_commit(call: Call) -> str:
    """2.6.21: the commit checks run before the command does, so a call that stages and then commits is refused."""
    staged = False
    for g in git_calls(call) if call.kind else []:
        if g.verb == "commit" and staged and inside(call.root, g.where):
            return "stage in one call, commit in the next: the checks read the index before this command runs."
        staged = staged or stages(g)
    return ""


def strip_quoted(text: str) -> str:
    return re.sub(r"\"[^\"]*\"|'[^']*'", "\"\"", text)


def run_precommit(root: Path) -> str:
    tool = root / "tools" / "precommit.py"
    if not tool.is_file():
        return "tools/precommit.py is missing; the commit cannot be checked. Failing closed."
    try:
        # precommit.py writes UTF-8 (2.6.21): read in the console code page, its dash arrived as "â€”".
        r = subprocess.run([sys.executable, str(tool), "--root", str(root)], capture_output=True, text=True,
                           encoding="utf-8", errors="replace", timeout=240,
                           env={**os.environ, "PYTHONIOENCODING": "utf-8"})
    except (OSError, subprocess.SubprocessError) as exc:
        return f"tools/precommit.py could not run ({exc}); failing closed."
    tail = "\n".join((r.stdout + r.stderr).strip().splitlines()[-8:])
    return "" if r.returncode == 0 else f"the pre-commit checks refuse this commit:\n{tail}"


def commit_args(call: Call) -> list[str]:
    """The arguments of every `git commit` in this command that commits into this repo."""
    found = []
    for where, seg, _ in located_segments(call):
        m = re.search(GIT + r"commit\b", seg)
        if m and inside(call.root, where):
            found.append(seg[m.end():])
    return found


def stages_as_it_commits(args: str) -> bool:
    """Does this `git commit` stage the tracked files as it commits (-a, --all)? (2.7.0)"""
    words = [unquote(w) for w in re.findall(TOKEN, strip_quoted(args))]
    return has_flag(words, ("--all",), "a", "mFcCtSu")


def rule_commit(call: Call) -> str:
    commits = commit_args(call) if call.kind else []
    if not commits:
        return ""
    if any(SKIP_VERIFY.search(strip_quoted(args)) for args in commits):
        return ("a commit here never skips the pre-commit checks (--no-verify, -n): they are what keeps an "
                "ungated write from landing. Fix what they report.")
    if any(stages_as_it_commits(args) for args in commits):
        return ("git commit -a stages as it commits, after the checks have read the index: stage with git add in one "
                "call, commit in the next.")
    return hooks_installed(call.root) or run_precommit(call.root)


def read_jsonl(path: Path) -> list[dict]:
    try:
        lines = path.read_bytes().decode("utf-8").splitlines()
    except OSError:
        return []
    out = []
    for line in lines:
        try:
            out.append(json.loads(line))
        except ValueError:
            continue
    return [x for x in out if isinstance(x, dict)]


def logged_nonces(path: Path) -> list[str]:
    return [str(x.get("nonce")) for x in read_jsonl(path)]


def spellings(root: Path) -> set[str]:
    """How a prompt may write this repo's path: native, forward slashes, and Git Bash's /c/... form."""
    posix = root.as_posix()
    out = {str(root).lower(), posix.lower()}
    if re.match(r"^[A-Za-z]:/", posix):
        out.add(f"/{posix[0].lower()}{posix[2:].lower()}")
    return out


def names_repo(call: Call, prompt: str) -> bool:
    here = os.environ.get("CLAUDE_PROJECT_DIR")
    local = (here and resolve(call.cwd, here) == call.root) or inside(call.root, call.cwd)
    return any(s in prompt.lower() for s in spellings(call.root)) or bool(local and re.search(r"\bMOD-\d+\b", prompt))


def builder_launch(call: Call, prompt: str) -> bool:
    """Is this a Phase 4 launch of a sub-agent that can write, sent to work in this repo?"""
    return call.tool in AGENT_TOOLS and call.phase == "4" and \
        call.ti.get("subagent_type") not in READ_ONLY_AGENTS and names_repo(call, prompt)


def stamp_problem(root: Path, stamp: dict) -> str:
    """'' when the stamp is current, issued and unused; else why not."""
    stale = basis.stale_roles(stamp, basis.digests(root))
    if stale:
        return f"the brief for {stamp['module']} is stale ({', '.join(stale)} changed since it was stamped): regenerate it."
    if stamp.get("nonce") not in logged_nonces(root / BRIEF_LOG) or stamp.get("nonce") in logged_nonces(root / LIVE_LOG):
        return f"nonce {stamp.get('nonce')} was not issued by tools/brief.py, or has been used: regenerate the brief."
    return ""


def rules_problem(root: Path, prompt: str) -> str:
    """2.6.21: '' unless the build keeps operating rules and the prompt lacks the MF-RULES line of their current
    digest (sha256 with CRLF read as LF, first 12 hex, as tools/brief.py writes it)."""
    path = root / RULES_DOC
    if not path.is_file():
        return ""
    digest = basis.file_sha256(path)[:12]
    if digest and re.search(rf"^\s*MF-RULES\s+{digest}\s*$", prompt, re.M):
        return ""
    return (f"the brief must carry the build's operating rules ({RULES_DOC}, MF-RULES {digest or 'unreadable'}): "
            f"compose it with python tools/brief.py MOD-nn")


def profile_problem(call: Call) -> str:
    """2.7.0: '' when the builder is launched as the builder profile, which starts it with only the tools it uses."""
    if call.ti.get("subagent_type") == BUILDER_AGENT:
        return ""
    return (f"a builder is launched as the builder profile, subagent_type \"{BUILDER_AGENT}\" "
            f"(.claude/agents/{BUILDER_AGENT}.md, written by python tools/install-gates.py): it starts with only the "
            f"tools a builder uses. Launch the brief whole with that subagent_type.")


def rule_brief(call: Call) -> str:
    prompt = str(call.ti.get("prompt") or "")
    if not builder_launch(call, prompt):
        return ""
    found = basis.stamps(prompt)
    if not found:
        return ("a sub-agent launched to work in this build repo carries its brief from `python3 tools/brief.py "
                "MOD-nn`: the MF-BRIEF stamp is missing. The brief holds the S3 rows, the S2 nodes, the object model, "
                "the Object Writing Standard and the gate probe.")
    return (next((p for p in (stamp_problem(call.root, f) for f in found) if p), "")
            or rules_problem(call.root, prompt) or profile_problem(call))


def agent_nonce(root: Path, agent: str) -> str:
    """The nonce this sub-agent's probe carried (gate-live.jsonl); '' before it probed."""
    lines = [x for x in read_jsonl(root / LIVE_LOG) if x.get("agent_id") == agent and x.get("nonce")]
    return str(lines[-1]["nonce"]) if lines else ""


def red_module(root: Path, nonce: str) -> str:
    """The module tools/brief.py issued `nonce` for (brief-log.jsonl)."""
    return next((str(x.get("module")) for x in reversed(read_jsonl(root / BRIEF_LOG)) if x.get("nonce") == nonce), "")


def red_target(written: list[str], nonce: str, module: str, files: dict) -> str:
    """The S3 §2 File a write reaches: its module's, or before the probe any module's; '' for none."""
    own = {f.lower() for f in files.get(module, [])} if nonce else {f.lower() for fs in files.values() for f in fs}
    return next((w for w in written if w.lower() in own), "")


def red_logged(root: Path, nonce: str) -> bool:
    return any(x.get("nonce") == nonce for x in read_jsonl(root / RED_LOG))


def red_problem(call: Call, written: list[str], nonce: str, module: str, files: dict) -> str:
    """'' unless the write reaches the module's S3 §2 File (any module's, before the probe) and no red is logged."""
    hit = red_target(written, nonce, module, files)
    if not hit or (nonce and red_logged(call.root, nonce)):
        return ""
    if not nonce:
        return (f"{hit} is a module's file, written by its builder after the gate probe and the red run: your first "
                f"call is the probe your brief names.")
    return (f"{hit} is {module}'s file, written after its red run: add the step's base-case rows to "
            f"INSTRUMENTS/axioms-and-base-cases.md, each naming its test, write those tests, then run python "
            f"tools/brief.py red --nonce {nonce} (every named test fails on its own). new-object.py's stub is not "
            f"refused.")


def rule_red(call: Call) -> str:
    """2.7.0: in a Python build, a builder writes its module's S3 §2 File with Write or Edit only after its red run."""
    agent = call.payload.get("agent_id")
    if call.tool not in FILE_TOOLS or not agent or call.phase != "4":
        return ""
    import brief                                       # lazily: brief imports this module
    cfg = basis.project(call.root)
    if not brief.red_runs(cfg):
        return ""
    nonce = agent_nonce(call.root, agent)
    module = red_module(call.root, nonce) if nonce else ""
    files = brief.partition_files(brief.sections(brief.read(call.root, cfg.get("s3_document") or "")))
    return red_problem(call, [t.rel for t in targets(call)], nonce, module, files)


def rule_long_runs(call: Call) -> str:
    """2.8.0: k7-run.py, seal.py check and the declared full suite start through tools/run.py: detached, with a record
    on disk that a crash cannot lose and every session's hooks read."""
    if not call.kind:
        return ""
    import run                                         # lazily: only a shell command needs it
    what, kind, seg = run.unwrapped(segments(call.command), basis.project(call.root).get("test_command"), segments)
    if not what:
        return ""
    return (f"{what} is a long run: start it through tools/run.py, detached, so a crash or an app restart cannot lose "
            f"it and every session's hooks print it when it lands: python tools/run.py --kind {kind} --label "
            f"\"<what it is>\" -- {seg}. Add --wait to follow its log in this call.")


RULES = (rule_probe, rule_protected, rule_shell_source, rule_hookspath, rule_history, rule_builder_tags,
         rule_staged_commit, rule_commit, rule_brief, rule_red, rule_long_runs)


def check(root: Path, cwd: Path, payload: dict, source: re.Pattern, phase: str) -> str:
    """The first 2.6.17 rule that denies this call, as its reason; '' when none does."""
    note_hook_session(root, payload)
    call = Call(root, cwd, payload, source, phase)
    return next((reason for reason in (rule(call) for rule in RULES) if reason), "")
