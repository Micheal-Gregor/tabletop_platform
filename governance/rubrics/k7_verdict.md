# k7_verdict@1 — a judged rubric (RD-28)

**Artifact:** a module's content manifest (`tools/manifests.py`), as canonical JSON.

**Point:** `k7`.

**Decider:** the K7 reviewer, a ReviewerAgent named `k7-reviewer`. Its `agent_def` is the digest of the charter this
repo runs it with (`reviewer_agent` in `.metaframework/project.json`, default `.claude/agents/k7-reviewer.md`). The
rubric pins that digest at admission. A changed charter no longer conforms (`DECIDER_NOT_IN_RUBRIC`) until the owner
admits a new version, so a change to the charter is a signed act. The builder is the artifact's author, so it can never
be the decider (`AUTHOR_IS_JUDGE`).

**Verdict:**
- `tools/k7-run.py` appends a pending receipt (LATENT) for each module it hands the reviewer in diff or full mode.
- When the reviewer's verdict for the round is PASS, the runner appends ACCEPT for each of those modules, with the
  digest of the reviewer's output as the transcript.
- A round that returns or halts leaves the receipt pending; its findings stay in `INSTRUMENTS/k7-verdict-<n>.json`.
- On a PASS, a module the reviewer was handed in FULL also gets ACCEPT at the point `full-review`, judged by the same
  reviewer under this rubric. That receipt is the seal's backstop (RD-27), so an edited verdict file cannot claim a full
  review.

**Reading:**
- `standing(manifest, k7) == ACCEPT` means this exact content passed a K7 review.
- `standing(manifest, full-review) == ACCEPT` means it passed a full one.
