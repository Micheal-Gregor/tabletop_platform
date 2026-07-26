# F Backflow — Supersession Proposals to Phase 3 · TABLETOP

Each proposal supersedes upstream via the Phase 3 chat project — S3 is never patched in place.

## SP-1 · MoveLogRow pack-ref (from I-1 — latent)

**Target:** Phase 3 spec F1/F7 + S-2 seam wording; transitively S1 v2.0's log-as-truth
statement. **Defect:** "(seed, seats, log) rebuilds byte-identical" is well-defined only
against a fixed ContentPack; the row schema `{seed, seats, moves}` names no pack.
**Superseding text:** the persisted row is `{packRef(id, version, hash), seed, seats,
moves}`; AX-4 reads "(packRef, seed, seats, log) rebuilds byte-identical." Replay,
Transport self-heal, and V-2 all depend on it. **Status: EXECUTED — owner-approved
2026-07-25; supersession record SUP-1 committed to governance/S3/ (s3-anchor-v1.1);
I-1 SANCTIONED → RESOLVED; packRef-mismatch-at-rebuild = F7 obligation.**

## SP-2 · Placeholder Skin doctrine (from D-1, owner addition — pending the C4 ruling)

**Target:** Phase 3 spec F6 + CLAUDE §5 (HK-12 adjacency) + S1 v2.0 presentation model.
**Addition:** the platform ships a built-in complete skin — every visual token bound to
alt-text, every sound token bound to a transient self-removing caption. Satisfies
R-21/R-22 by completeness (no guard weakened); establishes frames-before-assets as
platform doctrine; doubles as the MP9 accessibility floor. **Status:** queued at C4 gate.

## SP-3 · Flourish library (from D-2, owner addition — pending the C4 ruling)

**Target:** Phase 3 spec F6/F7 (pattern tier). **Addition:** reusable experience presets
(dice throw, card flip/reveal, chip slide, …) as presentation-tier presets bound to
kind/join contracts; opt-in per game; pack-local flourishes promotable to the library by
the same proven-pattern path as Ventures. Animations remain theater (HK-11 governs).
**Status:** queued at C4 gate.

## SP-4 · Ontology-mutation authority (from I-24 / K7-F3 probe 8 — model question)

**Target:** Phase 3 spec F3/F4 seam wording; the EFX docket's `form_relation` entry.
**Question (not a defect):** the build makes relation formation a first-class PLAYER
intent (turn-disciplined, I-24), while the S2 payload's V-8 and the docket's
`form_relation` treat formation as something content triggers through the vocabulary.
Both can be true (player intents AND a docketed effect), but the record should SAY who
may reshape ontology and when. **Proposed wording:** "Ontology mutation flows through
S-1 intents under turn discipline; content-TRIGGERED formation awaits the docketed
form_relation member via its ExtensionContract cycle." **Status: EXECUTED as SUP-2 (owner-approved 2026-07-25); P13 folded in; I-20 resolved by SUP-3 (11 kinds, pre-merge artifact).**
