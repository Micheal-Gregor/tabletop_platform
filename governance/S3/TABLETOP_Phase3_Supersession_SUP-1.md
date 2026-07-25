# TABLETOP Phase 3 — Supersession Record SUP-1

*Owner-approved 2026-07-25 ("do the supersession for SP-1") · Origin: Phase 4 C4 anchor
probe (I-1, latent), K7-confirmed round 1 · Channel: F backflow, SP-1 · Discipline:
supersede-never-rewrite — the superseded documents remain the permanent record; THIS
record + them = the operative S3.*

## Target

TABLETOP_Phase3_Specification.md §2 (F1 IntentLog, F7 Transport row) and
CLAUDE_TABLETOP_Phase3.md §4 (V-2 rule) · transitively, S1 v2.0's log-as-truth wording
("the persisted game = (seed, seats, log)").

## Defect

The replay law "(seed, seats, log) rebuilds byte-identical" is well-defined ONLY against
a fixed ContentPack: the same log replayed under a different pack (or pack version) is a
different game, and divergence would be undetectable at the row level. The row schema
`{seed, seats, moves}` names no pack. V-2, Transport self-heal, and any persistence or
takeover path were underdetermined.

## Superseding text

1. **The persisted row is `{packRef, seed, seats, moves}`**, where
   `packRef = (id, version, integrity hash)`.
2. **AX-4 (the rebuild law) reads:** "(packRef, seed, seats, log) rebuilds byte-identical
   state." Rebuild against a row whose packRef does not match the loaded pack (id,
   version, or hash) is a DIVERGENCE — refused whole, never patched (R-9 unchanged).
3. **V-2's rule, restated independently:** two rebuilds from the same
   {packRef, seed, seats, moves} row hash identically to the live final state.
4. S-2's seam contract wording inherits the row shape; no other seam is touched.

## Status of the built artifact

Phase 4 code was built to THIS rule from the start via registered interpretation I-1
(GameRow carries packRef — kernel/types.ts, K7-verified round 2). This supersession
SANCTIONS I-1: the interpretation is no longer ahead of its spec. I-1 closes RESOLVED;
packRef-mismatch-at-rebuild becomes an F7 obligation (Transport/persistence consume it).

*Nothing else in the Phase 3 pair is altered by this record.*
