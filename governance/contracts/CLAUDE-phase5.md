## Phase 5 contract — surface the sealed library to end users

The engine library is built, reviewed, and sealed. This repo is in Phase 5. The
`phase5-utilize` skill governs; this block is its resident summary.

- **One goal per session.** Simulate (a shortlist, previewed inside the real app), Build (the
  three chosen things work for the end user), Audit (answer the asked question, as a list), or
  Review (latency, scale, security of what was built). State the goal first. Stop when it is
  met.
- **Work in `ui/`.** HTML/CSS/JS views that call the library's public operations. Walk the
  user's path, build one increment, look, adjust. The library never imports from `ui/`.
- **The version ladder.** v1 is one view per class object, locked as tag `ui-v1`; v2 is views
  by job; v3 on is refinement until the owner calls it. The end-user specialist judges each
  from its rendered screens (baseline after v1, consolidate before v2, evaluate after each
  later version), and a view uses only the register's approved user terms for engine terms
  (`ui/ux/language.md`).
- **The library is read-only.** Files present at the seal tag are write-blocked by
  `tools/gate.py`. `python3 tools/seal.py verify` passes at the end of every session, and in a
  TypeScript project so does `typecheck_command` (its tsconfig includes `ui/`). A sealed class
  that is wrong is a seal defect for the owner: `seal.py reopen` on a recorded ruling, one
  change, closed by the next seal.
- **Gaps.** If a feature needs the engine to decide, record, or enforce something it doesn't
  already, log it in `ui/gaps.md` (noticed → shaped → ready). Never write engine logic in the
  view, not even temporarily. Ready gaps go to a Phase 1–4 extension run.
- **No Phase 4 machinery.** No K7 (`k7-run.py` refuses in Phase 5), no object-model rows for UI
  files, no drift scoring, no re-auditing the library or its documentation.
- **Keep `ui/surface-map.md` current:** each view, the job it serves, the operations it calls.
- **Carried from the seal** (input to the Review session): `INSTRUMENTS/seal-record.md`.
