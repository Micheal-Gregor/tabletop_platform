# Operations Pack — TABLETOP bench (derived from the model, not invented)

**Run:** `node utilization/bench/build.mjs` then serve `utilization/bench/` statically
(any host; `node utilization/bench/run-target-check.mjs` self-serves for verification).

**HALT handling (a production HALT is a HaltAwait surrender to a named human — the
owner):** the ⛔ banner names the law that fired (PersistHalt/Divergence/…). DO NOT
clear-and-retry blind. Export the row (the banner never blocks export of a live table;
a corrupt SAVE is quarantined in localStorage — copy it out before clearing). Every
halt = a drift-ledger row; post-closure ambiguity = an open decision gate.

**Incident = halt + open gate, never a silent patch.** A hash-lineage flag means the
save was tampered or the build superseded the pack — verify packRef first; a genuine
mismatch on an untouched pack is a BLOCKING engine defect → F-backflow.

**Monitoring (the hooks stay live):** refusals surface in the status line (expected,
not incidents); listenerFaults() is the fan-out health surface; the in-target battery
(`run-target-check.mjs`, BATTERY 21/21 · DRILLS 5/5) is the deployment health check —
run it after EVERY rebuild and before distributing a bundle.

**The visual gate is part of the health check (K7-vg D2):** `npm run gate:target` AND
`npm run gate:visual` (rebuild + in-Chromium: DOM-vs-law, computed scene pins, camera
purity, a11y floor) — a green build that skipped the visual gate is NOT green. The
gate's own aliveness is proven only by K7 mutation rounds (the M-E self-verification
boundary, on the record at I-57): the comparator cannot test itself.

**Upgrade path (PR-6):** change = a new commit + rebuild (supersession); rollback = a
further commit restoring prior content (superseding back). NEVER rewrite history; saved
rows carry packRef — a pack-version supersession makes old rows refuse loudly at resume
(correct: divergence, not silent migration). Migration, if ever wanted, is a NEW
decision at a gate.

**The drift ledger does not close.** Production drift is drift; the instruments outlive
the pipeline. Secrets: none exist at this target; if any ever do — env/custody only.
