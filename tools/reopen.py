#!/usr/bin/env python3
"""
reopen — the record that the latest seal is reopened by an owner ruling.

A seal freezes the files present at its tag: tools/gate.py refuses writes to them and
`seal.py verify` reports any change. An owner ruling can reopen the latest seal for one
change that ends in the next seal. `seal.py reopen --approved-by WHO --ruling ID` writes
.metaframework/reopen.json naming that tag; gate.py, seal.py, state.py, phase4-checks.py
and k7-run.py read it here.

The record binds to one tag. The next seal is a new tag, so it closes the reopen even
before anything is deleted; `seal.py apply` then retires the record in the seal's own
commit, so nothing is left that reads as a live reopen. An unreadable record reopens
nothing: the seal stays enforced.
"""

import json
from pathlib import Path

RECORD = Path(".metaframework") / "reopen.json"


def reopen_record(root: Path, tag: str) -> dict | None:
    """The reopen record when it names `tag`, else None."""
    try:
        record = json.loads((root / RECORD).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(record, dict) or not tag or record.get("seal") != tag:
        return None
    return record


def write_reopen(root: Path, record: dict) -> None:
    """Write the record as UTF-8 with LF line ends."""
    text = json.dumps(record, indent=2) + "\n"
    (root / RECORD).write_bytes(text.encode("utf-8"))
