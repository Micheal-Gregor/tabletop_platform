#!/usr/bin/env python3
"""
basis — the review basis: the documents a builder is briefed with and K7 reviews against (2.6.17).

Attempt 1 of LedgerCore V2 briefed its builders from hand-written prompts that never cited the Object Writing
Standard or the object model, while K7 reviewed against both; six K7 rounds followed. One list, read by both
sides, closes that: tools/brief.py stamps a brief with these digests, tools/gate.py refuses a sub-agent launch
whose stamp is stale, and tools/k7-run.py hands the reviewer the same list.

Roles: roster, std (the standard), s3, s2 (when project.json declares s2_document) and om (the object model).
The roster and the standard are also pinned by .metaframework/roster-manifest.json; the S3, S2 and object model
change as the build proceeds, so their digests are read live, never recorded.

A digest is the sha256 of the file with CRLF read as LF, so a Windows checkout and a Linux one agree.
"""

import hashlib
import json
import re
from pathlib import Path

FIXED = (("roster", "governance/Phase4_Conformance_Build_Roster.md"),
         ("std", "governance/Object_Writing_Standard.md"),
         ("om", "INSTRUMENTS/object-model-and-parameters.md"))
STAMP = re.compile(r"^MF-BRIEF\s+(MOD-\d+)\s+(.*)$", re.M)


def file_sha256(path: Path) -> str:
    """The file's sha256 with CRLF read as LF; '' when it cannot be read."""
    try:
        return hashlib.sha256(path.read_bytes().replace(b"\r\n", b"\n")).hexdigest()
    except OSError:
        return ""


def project(root: Path) -> dict:
    try:
        return json.loads((root / ".metaframework" / "project.json").read_bytes().decode("utf-8"))
    except (OSError, ValueError):
        return {}


def documents(root: Path, cfg: dict | None = None) -> dict[str, str]:
    """{role: repo-relative path}, in a fixed order."""
    cfg = project(root) if cfg is None else cfg
    docs = dict(FIXED[:2])
    for role, key in (("s3", "s3_document"), ("s2", "s2_document")):
        if cfg.get(key):
            docs[role] = str(cfg[key]).replace("\\", "/")
    docs["om"] = FIXED[2][1]
    return docs


def digests(root: Path, cfg: dict | None = None) -> dict[str, str]:
    """{role: first 12 hex of the live digest}; 'missing' for a file that is not there."""
    return {role: (file_sha256(root / rel)[:12] or "missing") for role, rel in documents(root, cfg).items()}


def stamp(module: str, nonce: str, dg: dict[str, str]) -> str:
    return f"MF-BRIEF {module} nonce={nonce} " + " ".join(f"{k}={v}" for k, v in dg.items())


def stamps(text: str) -> list[dict]:
    """Every MF-BRIEF line in `text`, as {"module", "nonce", role: digest, ...}."""
    found = []
    for module, rest in STAMP.findall(text or ""):
        fields = dict(kv.split("=", 1) for kv in rest.split() if "=" in kv)
        found.append({"module": module, **fields})
    return found


def stale_roles(fields: dict, dg: dict[str, str]) -> list[str]:
    """The roles whose stamped digest differs from the live one (a role missing on either side counts)."""
    roles = (set(fields) - {"module", "nonce"}) | set(dg)
    return sorted(r for r in roles if fields.get(r) != dg.get(r))


def listing(root: Path, cfg: dict | None = None) -> str:
    """The basis as K7's prompt shows it: one line per document with its live digest."""
    dg = digests(root, cfg)
    return "\n".join(f"  {role:<7}{rel}  sha256 {dg[role]}" for role, rel in documents(root, cfg).items())
