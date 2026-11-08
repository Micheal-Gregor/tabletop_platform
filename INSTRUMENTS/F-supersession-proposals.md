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


## SP-6 — EP-1′ and "fidelity = min formula" are unrecoverable (F6, K7-F6 D3)

The S3 F6 Honors line (Specification §2 F6: "Honors: theater-over-truth (TheaterSync),
EP-1′, tokens-only, fidelity = min formula") names two terms with NO recoverable
definition anywhere in the S3 pair or the upstream annexes — only EP-2 (theater-sync,
V-9's rule) is defined. Their meanings were lost in compression upstream of Phase 3.
Phase 4 cannot implement, and must not invent, pinned semantics (RD-2 class). **Proposed
disposition for the Phase 3 revision run:** either (a) supersede the Honors line to
excise the two tokens as compression artifacts, or (b) restore their definitions from
the owner's Phase 1/2 record and hand them back as a bounded F6 increment. **Pending the
owner's ruling, both terms are N/A-BY-UNRECOVERABILITY on the record (never silently
skipped); TheaterSync and tokens-only — the two RECOVERABLE Honors terms — are built and
K7-verified.** Status: OPEN — awaiting the owner's Phase 3 channel.

## SP-7 · Re-emission under the emission contract's headings, content unchanged (R1, I-261)

**Target:** the whole Phase 3 pair as anchored at `s3-anchor-v1.2` (CLAUDE_TABLETOP_Phase3.md + the Specification,
with SUP-1..SUP-3). **Defect:** the S3 predates `governance/S2-S3-emission-contract.md` v1.0: no numbered §1..§11
headings, no IDs, no tables the instruments parse. `emission-check` fails it (19 violations, pre-repair sweep), and
`brief.py`, `manifests.py`, `k7-run.py` and `seal.py` key on `MOD-nn`, `REF-nn`, `VEC-nn` and `HOOK-nn`, so no module
can be briefed, fingerprinted or swept. **Superseding text:** the same S3 re-emitted under the contract's eleven
headings, folding SUP-1..SUP-3 (the operative S3): §2 one `MOD-nn` per module the partition names, each with the
files the object model gives it (build-level files filed under the named module whose rule or seam they carry); §4
the nine seams S-1..S-9 as `SEAM-nn` module-to-module rows; §5 R-1..R-24 as `REF-01..REF-24`, each naming its real
test; §6 V-1..V-9 as `VEC-01..VEC-09`; §7 HK-1..HK-12 as `HOOK-01..HOOK-12` with where each is registered; §8 the
nine production concerns as `PC-01..PC-09`. No rule, refusal, vector rule, hook or gate is added, dropped or
reworded in meaning. Not carried, because Phase 2 never minted them: `OBJ` ids (§3's map stays empty, its join
unchecked), and the `Decides`/`Binding` columns (noted by emission-check, not invented here). **Status: owner-approved
2026-11-08 ("Approve 30M", RESOLUTION_RECORD); anchored by `tools/anchor-s3.py --revision` as `governance/S3/v1.3/`,
tag `s3-anchor-v1.3`.**
