# owner_triage@1 — a judged rubric (RD-28)

**Artifact:** a module's content manifest (`tools/manifests.py`), as canonical JSON.

**Point:** `owner-triage`.

**Decider:** the owner, a Person. The rubric pins the digest of the owner's principal at admission.

**Verdict:**
- When the owner closes a gate on triage (RD-9: fix now, known issue, won't fix, recorded in `RESOLUTION_RECORD.md`),
  the owner's ACCEPT is appended for each module of the closed round, at the content being closed:
  `python tools/receipts.py owner-close --round N --person <principal>`.
- For a module the closed round reviewed in FULL, the owner's ACCEPT is also appended at `full-review`, judged under
  this rubric.
- It is run only on the owner's explicit, live word, with the principal the owner names.
- `gate.py` refuses the `closed-by-owner-N` tag until those receipts exist.

**Reading:** `standing(manifest, owner-triage) == ACCEPT` means the owner closed a gate on this exact content. Credited
review counts it as concluded.
