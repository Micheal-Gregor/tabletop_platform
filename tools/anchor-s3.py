#!/usr/bin/env python3
"""
anchor-s3 — C4's S3 anchor in one command, from any shell (2.6.21); F's revision of it, before the seal (2.8.2).

LedgerCore V2's restart anchored its S3 with a bash script, and PowerShell 5.1 has no bash on its PATH, so the owner
needed Git Bash's full path. The owner runs this instead, from PowerShell or any shell:

    python tools/anchor-s3.py --from <the folder holding the Phase 3 exports>

It places the exports in governance/S3/, each file by its own name: the one CLAUDE_<Concept>_Phase3.md at the top of
the folder, and every other .md or .docx file there (the Specification docx, and its .md if there is one). Anything
else is listed as not placed: a subfolder, another kind of file, a README.md (governance/S3/ keeps the template's) and
Word's ~$ lock files. Then it stages them, commits them with `git commit`, which runs the pre-commit checks like any
other commit (never --no-verify), and tags the commit s3-anchor-v1.0. It prints each file placed with its sha256, the
commit and the tag.

It refuses, changing nothing, when: an s3-anchor-* tag exists; governance/S3/ holds a file other than its README.md;
git does not run .githooks on commit here (run python tools/install-gates.py first); something is already staged (the
anchor commit holds the exports alone); or the folder has no CLAUDE_<Concept>_Phase3.md, several, or no
specification beside it. When the pre-commit checks refuse the commit, the files it placed are taken back out, so a
second run starts clean.

A revision (2.8.2). F sends a defect in the S3 to the owner's Phase 3 project as a superseding edit, and the revision
run there exports a new CLAUDE_<Concept>_Phase3.md with its specification. Before the seal the owner takes it in with

    python tools/anchor-s3.py --revision <the folder holding the revised exports> --discharges SP-1,SP-4

It places the exports in governance/S3/v1.<n>/, n one past the last s3-anchor-v1.* tag, by the first anchor's rules.
Every file anchored before stays as it is: precommit.py passes a file new to that folder once and holds it from then
on. In the same commit it points project.json's s3_document at the revised CLAUDE file, so brief.py, k7-run.py, the
checks and the seal read the revision from there on, and appends the revision to INSTRUMENTS/C4-anchor-record.md and
the proposals it discharges to INSTRUMENTS/F-supersession-proposals.md. Then it tags the commit s3-anchor-v1.<n>.
A brief made before it is refused, because its basis changed, so each module the revision touches is briefed again.
The lead brings the root CLAUDE.md, which cites the S3, up to the revision. In 2.6.21 to 2.8.1 a revision could not be
anchored at all: this tool refused once any anchor existed, and precommit.py refused every new S3 file before a seal
(Tessera-build's revision 1, 2 Nov 2026).

A revision is refused, changing nothing, when: no s3-anchor-v1.* tag exists (the first anchor is --from); a seal-* tag
exists (after a seal a new export is an extension: seal.py begin-extension); a proposal --discharges names is not in
INSTRUMENTS/F-supersession-proposals.md; the revised CLAUDE file is another concept's than s3_document's;
governance/S3/v1.<n>/ already exists; project.json or either record has uncommitted changes; or, as at the first
anchor, git skips .githooks here, something is staged, or the folder is not one export.

Usage:
    anchor-s3.py --from DIR [--root DIR]                                   the first anchor, s3-anchor-v1.0
    anchor-s3.py --revision DIR --discharges SP-n[,SP-m] [--root DIR]      a revision before the seal, s3-anchor-v1.<n>
    --root defaults to the checkout this file is in
Exit: 0 anchored and tagged, 1 refused (the reason is printed), 2 bad invocation.
"""

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gate                                    # noqa: E402 - the S3 revision rule has one source
from gatecheck import hooks_installed          # noqa: E402

S3 = "governance/S3"
TAG = "s3-anchor-v1.0"
PHASE3 = re.compile(r"^CLAUDE_(.+)_Phase3\.md$")
EXPORT_SUFFIXES = (".md", ".docx")
PROJECT = ".metaframework/project.json"
C4_RECORD = "INSTRUMENTS/C4-anchor-record.md"
F_RECORD = "INSTRUMENTS/F-supersession-proposals.md"
RECORDS = (PROJECT, C4_RECORD, F_RECORD)

C4_NOTE = """
## Revision v1.{n} · {today} (tools/anchor-s3.py --revision)

- **Supersedes** `{old}`, anchored at `{last}`. Every file anchored before stays as it was.
- **Discharges** {discharges} (`INSTRUMENTS/F-supersession-proposals.md`).
- **Placed** in `{folder}/` and tagged `{tag}`:
{listing}
- **s3_document** is now `{new}`: briefs, K7 and the seal read the revision from this commit on.
"""

F_NOTE = """
## Discharged by {tag} · {today}

{discharges}: the Phase 3 revision that supersedes them is anchored in `{folder}/` (tools/anchor-s3.py --revision).
The proposals above stand as written.
"""


def git(root: Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["git", "-C", str(root), *args], capture_output=True, encoding="utf-8", errors="replace")


def tags(root: Path, pattern: str) -> list[str]:
    return git(root, "tag", "-l", pattern).stdout.split()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def why_not_placed(path: Path) -> str:
    """'' for a Phase 3 export, else why the file stays where it is."""
    if not path.is_file():
        return "a folder: only the files at the top of the folder are placed"
    if path.name.lower() == "readme.md":
        return "governance/S3/ keeps the template's README.md"
    if path.name.startswith("~$"):
        return "a Word lock file"
    return "" if path.suffix.lower() in EXPORT_SUFFIXES else "not a .md or .docx export"


def exports(src: Path) -> tuple[list[Path], list[str]]:
    """(the files to place, a line for each other entry saying why it is not placed), from the top of `src`."""
    entries = sorted(src.iterdir(), key=lambda p: p.name)
    left = [f"{p.name}: {why_not_placed(p)}" for p in entries if why_not_placed(p)]
    return [p for p in entries if not why_not_placed(p)], left


def export_problem(files: list[Path]) -> str:
    """'' when the files are an S3 export: one Phase 3 build instruction and a specification beside it."""
    found = [p.name for p in files if PHASE3.match(p.name)]
    if len(found) != 1:
        return (f"the folder holds {len(found)} CLAUDE_<Concept>_Phase3.md files ({', '.join(found) or 'none'}); "
                "the anchor takes exactly one")
    return "" if len(files) > 1 else "the folder holds no specification (.docx or .md) beside the CLAUDE file"


def instruction(files: list[Path]) -> Path:
    """The export's one CLAUDE_<Concept>_Phase3.md (export_problem has passed)."""
    return next(p for p in files if PHASE3.match(p.name))


def anchored(root: Path) -> str:
    found = tags(root, "s3-anchor-*")
    return (f"the S3 is already anchored ({', '.join(found)}): never re-anchor. F's revision of it comes in with "
            "--revision" if found else "")


def s3_held(root: Path) -> str:
    folder = root / S3
    held = sorted(p.name for p in folder.iterdir() if p.name != "README.md") if folder.is_dir() else []
    return f"governance/S3/ already holds {', '.join(held)}: an anchor is there or was begun by hand" if held else ""


def staged(root: Path) -> str:
    names = git(root, "diff", "--cached", "--name-only").stdout.split("\n")
    names = [n for n in names if n]
    return (f"{len(names)} file(s) already staged ({', '.join(names[:5])}): the anchor commit holds the exports "
            "alone, so commit or unstage them first") if names else ""


REPO_CHECKS = (anchored, s3_held, hooks_installed, staged)


def unanchored(root: Path) -> str:
    found = [t for t in tags(root, "s3-anchor-v1.*") if gate.REVISION_TAG.match(t)]
    return "" if found else "no s3-anchor-v1.* tag: there is no S3 to revise yet, and the first anchor is --from"


def sealed(root: Path) -> str:
    found = tags(root, "seal-*")
    return (f"the library is sealed ({', '.join(found)}): after a seal a new Phase 3 export is an extension, "
            "committed under governance/S3/ and begun with seal.py begin-extension") if found else ""


def records_dirty(root: Path) -> str:
    dirty = [line[3:] for line in git(root, "status", "--porcelain", "--", *RECORDS).stdout.splitlines() if line]
    return (f"{', '.join(dirty)}: uncommitted changes. The revision commit writes these files, so commit or set the "
            "changes aside first") if dirty else ""


REVISION_CHECKS = (unanchored, sealed, hooks_installed, staged, records_dirty)


def proposals_missing(root: Path, discharges: list[str]) -> str:
    """'' when F's record names every proposal the revision discharges, each as a whole ID: SP-1 is not in SP-10."""
    path = root / F_RECORD
    text = path.read_text(encoding="utf-8") if path.is_file() else ""
    missing = [sp for sp in discharges if not re.search(rf"(?<![\w-]){re.escape(sp)}(?![\w-])", text)]
    return (f"{', '.join(missing)} not in {F_RECORD}: a revision discharges the proposals F recorded"
            if missing else "")


def current_s3(root: Path) -> str:
    try:
        return json.loads((root / PROJECT).read_text(encoding="utf-8")).get("s3_document") or ""
    except (OSError, ValueError):
        return ""


def concept_problem(root: Path, files: list[Path]) -> str:
    """'' when the revised build instruction is the anchored concept's."""
    s3 = current_s3(root)
    have = PHASE3.match(Path(s3).name)
    if not have:
        return f"{PROJECT} names no CLAUDE_<Concept>_Phase3.md as s3_document ({s3 or 'none'})"
    new = PHASE3.match(instruction(files).name).group(1)
    return "" if new == have.group(1) else f"the folder's build instruction is {new}'s, the anchored S3 {have[1]}'s"


def place(root: Path, files: list[Path], folder: str = S3) -> list[str]:
    """Copy each export into `folder` under its own name; the repo-relative paths, in order."""
    (root / folder).mkdir(parents=True, exist_ok=True)
    for path in files:
        shutil.copyfile(path, root / folder / path.name)
        print(f"anchor-s3: placed {folder}/{path.name} (sha256 {sha256(path)[:12]})")
    return [f"{folder}/{path.name}" for path in files]


def commit(root: Path, rels: list[str], message: str) -> bool:
    """Stage the files by name, then commit them through git's hooks; True when the commit was made."""
    if git(root, "add", "--", *rels).returncode:
        return False
    return subprocess.run(["git", "-C", str(root), "commit", "-q", "-m", message]).returncode == 0


def take_back(root: Path, rels: list[str]) -> None:
    """Unstage and remove the files this run placed; the originals stay in the exports folder."""
    git(root, "rm", "-q", "--cached", "--ignore-unmatch", "--", *rels)
    for rel in rels:
        (root / rel).unlink(missing_ok=True)


def first_refusal(root: Path, checks: tuple) -> str:
    """The first of `checks` that refuses this checkout, '' when none does."""
    return next((r for r in (check(root) for check in checks) if r), "")


def refuse(reason: str) -> int:
    print(f"anchor-s3: refused, nothing changed: {reason}", file=sys.stderr)
    return 1


def print_left(left: list[str]) -> None:
    print("\n".join(f"anchor-s3: not placed {line}" for line in left) or "anchor-s3: nothing else in the folder")


def anchor(root: Path, files: list[Path], left: list[str]) -> int:
    refused = first_refusal(root, REPO_CHECKS) or export_problem(files)
    if refused:
        return refuse(refused)
    concept = PHASE3.match(instruction(files).name).group(1)
    rels = place(root, files)
    print_left(left)
    if not commit(root, rels, f"S3 anchor: the Phase 3 exports of {concept}, placed by tools/anchor-s3.py"):
        take_back(root, rels)
        print("anchor-s3: the commit was refused (the reason is above); the placed files were taken back out of "
              "governance/S3/, so nothing is anchored", file=sys.stderr)
        return 1
    return tag_head(root, TAG)


def tag_head(root: Path, tag: str) -> int:
    head = git(root, "rev-parse", "--short", "HEAD").stdout.strip()
    if git(root, "tag", tag).returncode:
        print(f"anchor-s3: committed {head}, but could not tag it: run git tag {tag} {head}", file=sys.stderr)
        return 1
    print(f"anchor-s3: committed {head} through the pre-commit checks and tagged it {tag}")
    return 0


def append(path: Path, text: str) -> None:
    """Add `text` after the file's last line, in the file's own line endings; no earlier line is touched."""
    old = path.read_bytes() if path.is_file() else b""
    eol = "\r\n" if b"\r\n" in old else "\n"
    lead = "" if not old or old.endswith(b"\n") else "\n"
    path.write_bytes(old + (lead + text).replace("\n", eol).encode("utf-8"))


def point_s3(root: Path, s3: str) -> None:
    """project.json's s3_document set to `s3`, every other key and the file's line endings kept."""
    path = root / PROJECT
    old = path.read_bytes()
    data = json.loads(old.decode("utf-8"))
    data["s3_document"] = s3
    eol = "\r\n" if b"\r\n" in old else "\n"
    path.write_bytes((json.dumps(data, indent=2, ensure_ascii=False) + "\n").replace("\n", eol).encode("utf-8"))


def write_records(root: Path, n: int, files: list[Path], discharges: list[str]) -> str:
    """Point s3_document at revision n and append it to the C4 and F records; the new s3_document."""
    folder, tag, old = f"{S3}/v1.{n}", f"s3-anchor-v1.{n}", current_s3(root)
    new = f"{folder}/{instruction(files).name}"
    point_s3(root, new)
    fields = {"n": n, "today": date.today().isoformat(), "old": old, "last": f"s3-anchor-v1.{n - 1}", "tag": tag,
              "folder": folder, "new": new, "discharges": ", ".join(discharges),
              "listing": "\n".join(f"  - `{p.name}` sha256 `{sha256(p)}`" for p in files)}
    append(root / C4_RECORD, C4_NOTE.format(**fields))
    append(root / F_RECORD, F_NOTE.format(**fields))
    return new


def revision_refusal(root: Path, files: list[Path], discharges: list[str], folder: str) -> str:
    """Why this revision cannot be anchored, '' when it can."""
    taken = f"{folder}/ already exists: a revision was begun by hand, or its tag is missing"
    return (first_refusal(root, REVISION_CHECKS) or export_problem(files) or proposals_missing(root, discharges)
            or concept_problem(root, files) or (taken if (root / folder).exists() else ""))


def take_back_revision(root: Path, rels: list[str], kept: dict[str, bytes], folder: str) -> None:
    """Undo a refused revision: the placed files out, its folder gone, and each record as it was."""
    take_back(root, rels)
    git(root, "reset", "-q", "--", *RECORDS)
    for rel in RECORDS:
        if rel in kept:
            (root / rel).write_bytes(kept[rel])
        else:
            (root / rel).unlink(missing_ok=True)
    shutil.rmtree(root / folder, ignore_errors=True)


def revise(root: Path, files: list[Path], left: list[str], discharges: list[str]) -> int:
    n = gate.next_revision(tags(root, "s3-anchor-*"))
    folder, tag = f"{S3}/v1.{n}", f"s3-anchor-v1.{n}"
    refused = revision_refusal(root, files, discharges, folder)
    if refused:
        return refuse(refused)
    kept = {rel: (root / rel).read_bytes() for rel in RECORDS if (root / rel).is_file()}
    rels = place(root, files, folder)
    print_left(left)
    new = write_records(root, n, files, discharges)
    concept = PHASE3.match(instruction(files).name).group(1)
    message = (f"S3 revision v1.{n}: the superseding Phase 3 export of {concept}, discharging {', '.join(discharges)}; "
               "placed by tools/anchor-s3.py --revision")
    if not commit(root, rels + list(RECORDS), message):
        take_back_revision(root, rels, kept, folder)
        print(f"anchor-s3: the commit was refused (the reason is above); the placed files were taken back out and "
              f"{', '.join(RECORDS)} restored, so nothing is anchored", file=sys.stderr)
        return 1
    if tag_head(root, tag):
        return 1
    print(f"anchor-s3: s3_document is now {new}. Next, the lead brings the root CLAUDE.md's S3 citation up to {tag} "
          "and briefs again each module the revision touches: a brief made before this commit is refused")
    return 0


def parse() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description="place the Phase 3 exports in governance/S3/, commit and tag the anchor")
    what = ap.add_mutually_exclusive_group(required=True)
    what.add_argument("--from", dest="source", help="the folder holding the Phase 3 exports: the first anchor")
    what.add_argument("--revision", help="the folder holding F's revised Phase 3 exports: a revision before the seal")
    ap.add_argument("--discharges", default="", help="with --revision: the F proposals it discharges, e.g. SP-1,SP-4")
    ap.add_argument("--root", default=str(Path(__file__).resolve().parents[1]))
    return ap.parse_args()


def main() -> int:
    args = parse()
    discharges = [x.strip() for x in args.discharges.split(",") if x.strip()]
    if bool(args.revision) != bool(discharges):
        print("anchor-s3: --discharges goes with --revision, which names the F proposals it discharges",
              file=sys.stderr)
        return 2
    root, source = Path(args.root).resolve(), Path(args.source or args.revision).expanduser().resolve()
    if not source.is_dir() or git(root, "rev-parse", "--git-dir").returncode:
        print(f"anchor-s3: {source} is not a folder, or {root} is not a git checkout", file=sys.stderr)
        return 2
    files, left = exports(source)
    return revise(root, files, left, discharges) if args.revision else anchor(root, files, left)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")      # every tool writes UTF-8 (2.8.0)
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
