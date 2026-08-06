# K7-V — Distinct Code-Conformance Review (batch I-124…I-171)

*Reviewer: distinct K7 session (no builder context), 2026-08-05. Transcribed verbatim by
the builder session per the reviewer's constraint record; landing this file is the sole
builder involvement. Session constraints on the record: (1) the reviewer instance ran
read-only (no bash/write) — every kill below was established by deterministic code-trace
arithmetic, not by run; execution residuals owed at re-verification: vitest 316, the gate
battery, check-tiers/check-gate-surface, live reconstruction of B-1/B-2. (2) this file
was written by the builder from the reviewer's returned output, verbatim.*

**VERDICT: RETURN (BLOCKED)** — behavior code broadly conformant as built; the batch
fails on the falsifiability/record layer (the K7-U lesson, repeated).

**Drift scores** (worst dimension: **falsifiability 5** — blocks new work on the
pools/outfit module until closed):

| Dimension | Score |
|---|---|
| object-model fidelity | 8 |
| axiom coverage | 8 |
| base-case support | 7 |
| extensibility | 8 |
| falsifiability | **5** |
| record | 6 |

## BLOCKERS

- **B-1 — The free-first-hire law (I-152) is unfalsifiable as instrumented:** every pool
  card cost is 0 (`packs/boty/src/pack.ts:151-161`), so deleting the `firstHire` branch
  (`packages/engine/src/library/outfit.ts:94,100`) yields `cost = 0` → no levy →
  `a16-pools.test.ts:33-42` and VG8s/pile-click-hires' cash-unchanged pin both stay
  green; the I-152 register claim "kill the firstHire branch → the free pin fails" is
  false-as-written (the I-122(a)/K7-T class). The EffectEngine levy path in
  `crew:hire`/`outfit:buy` (`wire.ts:191,230`) is dead in every fixture. Closure: a
  nonzero-cost pool fixture pinning both directions + supersede the I-152 kill wording.
- **B-2 — releaseCrew's assigned-crew refusal is guard-without-test:** `outfit.ts:109`
  is drilled nowhere — `a16-pools.test.ts:44` *titles* "assigned crew refuses" but only
  drills unknown-crew (line 53); no test assigns then releases, so deleting line 109
  passes everything. I-157/roadmap claim "GX-31 refusals incl. assigned crew" as
  drilled. Closure: hire → spawn → assign → release must throw GX-31, kill-first.

## MAJORS

- **M-1 — Settle-snap deletion is uncaught; the I-166 kill claim is false:** dropping
  `ledger-spread.ts:180-190` leaves residual lerp error ≤ ~0.03° (1−ease(0.999) ≈
  3×10⁻⁶ of 90°), far under VG8n/ledger-upright's 2° pin (`VG8n.gate.mjs:98`); no
  vitest covers the file; the headingErr half of `spreadUpright()` is self-referential
  (measures against the same `spreadYaw` that `displayPose` consumes — a wrong yaw feed
  passes). Closure: tighten the pin or assert exact-pose equality post-settle +
  independent yaw derivation in the gate.
- **M-2 — chainIntegrity's socket check is positive-only:** deleting
  `ui-object.ts:80-82` leaves `ui-object.test.ts:11-13` green (the library is clean, so
  `{ok:true}` either way); no synthetic-dangling-def negative case exists, so the CHAIN
  law (I-169 "checkable") is unverified. Closure: a negative-case unit probe.
- **M-3 — Instrument desync:** `INSTRUMENTS/object-model-and-parameters.md` ends at the
  I-137 rows (still "building"); no rows exist for `crew:release`/`outfit:sell` (I-157),
  `pool:draw` (I-139), `crew:attach`/`detach` (I-170), or the hand slot/`hand:play`/
  `ownHand`+`handCount` projection (I-171) — engine-lane additions written before their
  object-model rows, against the CLAUDE.md instrument law. Closure: append the rows +
  status refresh.

## Minors (6)

seat-grid.test.ts:49 tautology · ui-object.test.ts:31-35 vacuous scripts-split
assertion · bounds law tested for 3 of 9 objects · `seat-play-oracles.ts:110` hardcodes
`2*108` instead of deriving `cellD()` · hand:play/attach/detach no-levy is deliberate
only by the broad I-138 deferral — `wire.ts:210` lacks the explicit note `wire.ts:198`
carries · `anchorsWithinRadius` measures from the unsnapped center while generating
from the snapped one (off-grid-center edge).

## What passed

Grouped-sort mutation genuinely kills seat-grid.test:22-29; the flick drills (VG8s/p/q)
wait on state, clocks used only as gesture input-shaping; engine has zero
presentation/bench imports; redaction is honest (`projector.ts:85,93` — handCount
public, ownHand viewer-ids-only); all levies route through EffectEngine (R-24); all
sampled gate-surface keys resolve; all 8 sampled trace citations
(I-149/152/154/156/157/159/164/170/171) match live register rows; seat-rows.ts
retirement is recorded (I-164), the file is gone.
