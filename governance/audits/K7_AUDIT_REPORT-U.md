# K7-U — DISTINCT BATCH CONFORMANCE REVIEW · cebcd24..HEAD (R-1b2 · R-1c · A5 · A8 · L-1/2/3 · P-3 · L-4 · L-5 · L-5b · L-5c; register rows I-125…I-134)

> Provenance: the VERBATIM output of the distinct K7-U session (agent a81bef0dddbcf6556,
> 2026-08-04, Read/Grep/Glob only — no shell, no Write). Transcribed unchanged by the
> builder. The B-1/M-1 closures and the M-2 register entry (I-135) landed in the
> transcription commit; the execution residuals are owed at the battery + the next K7.

**Session constraints, stated first (honesty over theater):** this K7 session was granted **Read/Grep/Glob only — no Bash, no Write**. Consequences: (1) `/tmp/k7r2` was unreachable; nothing there was used or touched; (2) every EXECUTE item — vitest, the CI guards, all five mutation experiments, the 36-draw probe, the shuffle executions, the visual battery — was verified by **static predicate analysis and hand re-derivation, not execution**; each residual is named below; (3) the report file could not be written by the session — this document is its reply, verbatim. The repo was not modified by the session.

---

## Per-CC verdicts

**CC-1 Code-trace — PASS.** Every touched module traces to a live row: `discard-play.ts` (I-125) · `die-physics.ts` (I-126) · `projector.ts` + `seats.ts` (I-128) · `components/windows-prompt.ts` (I-129/I-130) · `layouts.ts` + `components/medal.ts` (I-130) · `pack.ts` + `seat-rows.ts` + `tests/seat-rows.test.ts` + `components/seat-play.ts` (I-131) · `seats.ts` + `components/ledger.ts` + `box.ts` (I-132) · `stage.ts` + `camera.ts` + `game3d.ts` (I-133). New components registered with order rationale. No orphan code found.

**CC-2 Carried-rule — PASS (one latent seam, M-2).** Purity: slide/floor/prompt-render/planner/medal are engine-untouched; the decide path is a REAL verb through emit→submit. S-6: every new render reads `ctx.projection()` only; the A5 widening is a truth-declaration over an already-flowing public field. Frozen `game.ts` untouched by construction. HK-6: RAPIER stays bench-side. AX-4: `shuffledDeckFor` is a pure function of (seed, seat) — replays hold by construction. The latent seam: **`submitVerb` stamps every verb's actor as the ACTIVE seat, while the prompt's clickability gates on decider ≡ viewSeat** — coherent today (decider=moe=viewer=active in every exercised path), structurally wrong the day a viewer-decider window opens on another seat's turn. See M-2.

**CC-3 Fidelity — PASS with notes.** Registered and honored: STALE_MS 150 (I-125, the die's stale-window roll deliberately NOT gated); FLICK_FLOOR 1.6 with floor<cap ordering and spin flooring via the components (I-126); medal-as-placeholder under D-1; MID_Z derived (`470 + 130·sin45° ≈ 562` — "derived, not magic" verified true); box gap 170 (I-132); pairs-staged-at-zero (I-131). Unregistered leftovers: the K7-T m-8 spin `(vx − vz) * 3` still unregistered; `planSeatRows` silently accepts >7 trades/equipment against the owner's cap-7 ruling (n-1).

**CC-4 Refusal-execution — PASS-static, execution residual.** No new engine refusal surface; the batch's refusal-shaped behaviors have named checks (stale-window drop-dead; not-mine options never clickable; unknown-preset throw). The HK-4 poisoned-fx twin and the 36-draw regression stand in `w1-pack6-wiring.test.ts` and are order-agnostic under P-3 — the committed test IS the 36-shuffled-draws probe. **Residual: not executed.**

**CC-5 Vector-discharge — RETURN (one pin, B-1).** No golden vectors owned. "EVERY card pin derives" is true for every CARD pin (`DRAW[0]`, `DRAW[1]`, `DRAW[1+extraDrawsA8]`) — **but a COUNT pin was left hand-written and stale: `dFid.count === 2` (pete's pre-P-3 deck) ten lines after the same deck asserted `=== 36`, with invariance asserted between. `VG8j/state-change-recheck` was structurally unsatisfiable — the batch battery WOULD have failed there by name regardless of correct behavior.** Hand re-derivations: FULL_DECK = 3 + 33 = 36 (counted from cards-q1.ts); the recorded order (rtm-referral · iwn-settle window-opener · crossroads@5) family-coherent with every VG8j pile assert. **Residual: independent execution of `shuffledDeckFor` — a 36-swap Fisher-Yates chain is not honestly hand-computable.**

**CC-6 Hook-wiring / falsifiability — PASS-static with one citation defect; execution residual on all mutations.** (a) STALE_MS removal → the stale window still carries the moving samples' velocity → slide launches → trace rewritten → `discard-stop-release-drops-dead` fails by name; reachability verified (planePts appends only on pointermove). (b) FLICK_FLOOR removal → eff ≡ raw < 1.59 → deterministic fail; floor arithmetic hand-verified (the 1.59 wall absorbs the FP edge); the `raw > 1e-9` guard is dead-safe (the flick branch requires ≥6u travel). (c) Planner mutants — each named vitest law fails by predicate. (e) K7-T residual: `slideTrace` written at exactly ONE site — the toss-slides kill holds after R-1b2. **Citation defect (M-1): the comment in discard-play.ts recited I-122(a) VERBATIM — the exact text I-124 superseded as false — shipped inside the closure increment itself.** VG8c/SEAT_YAWS: the gate's want uses the identical IEEE expression chain as mapPreset for seat-0; the seat-4 sin(π) drift (~7e-14 wu) lands inside every wall; no gate compares exact IEEE where the new trig introduces noise.

**CC-7 Off-nominal hunt.** Decide-leg cap 34 exactly fits the remaining cards; moves accounting exact. Prompt quads claim nothing but options — no structural shadowing; a visible MUTED prompt is click-THROUGH (n-6). Medal userData never carries `region` — the count law holds both sides. `windows` truly absent by extendLayout's structural suppress (an unknown suppress throws at import). Seat frames: signs hold for all six seats, corner-by-corner. Hand at ownDiscard<3: lawful; belowBooks vacuous-true at hand 0 (disclosed). Session cards: viewer-derived, viewer-rendered — no lost render; the walk keeps counting. Ledger fallback unreachable by registry order. mapPreset non-seat branch byte-identical. SEAT_YAWS index: camera falls back `?? 0`; seats non-null-asserts — a 7th seat NaNs silently (n-3).

**Lane check — PASS.** I-128's presentation excursion named by path; I-130/I-131 packs excursions named in substance, not path (n-8, cosmetic). Everything else normal-lane; engine untouched; frozen files untouched.

**Record accuracy (grep-falsified):** "single yaw truth" — TRUE (SEAT_YAWS the only yaw list; VG8g3's degree wants are lawful independent gate pins). "byte-identical for mids by trigonometry" — strictly FALSE for seat-4's x (~7e-14 drift); materially harmless, an over-claim (n-4). "derived, not magic" — TRUE. "the pins derive" — TRUE for cards, FALSE for the pete count pin (B-1). `discard-multi-card`'s `count === 2` is seed-conditional, not derived (n-9).

---

## K7-T carried minors — current status

m-1 dead guard **CLOSED** (I-125) · m-2 slideTrace singleton **OPEN — now load-bearing** (the stop-release check depends on its persistence, n-7) · m-3 bare awaits **OPEN, class grew** (the decide-leg wait joins, n-5) · m-4 thin slide margin **OPEN** · m-5 `as never` casts **OPEN** · m-6 y-snap **OPEN** · m-7 roadmap cells **CLOSED** · m-8 spin formula **OPEN**.

## Defects

**B-1 (BLOCKING)** — `VG8j/state-change-recheck` structurally unsatisfiable (the stale `count === 2` pin). *Closed in the transcription commit: both asserts derive from `deckOrder('pete').length`; detail text follows.*
**M-1 (MAJOR)** — the falsified I-122(a) text as a live comment in discard-play.ts. *Closed in the transcription commit: rewritten to the live I-125 law.*
**M-2 (MAJOR, latent)** — the decide actor seam (submitVerb stamps ACTIVE; the prompt gates on decider ≡ viewSeat). *Registered at I-135; resolution at the turn-cycling drill (recorded trigger).*
**MINOR (9 new):** n-1 planner accepts >7 (cap-7 unenforced) · n-2 handInfo hardcodes seat-0 as the viewer · n-3 SEAT_YAWS index NaN at seat count ≠ 6 · n-4 the byte-identical over-claim · n-5 the decide-leg bare await · n-6 muted-prompt click-through · n-7 the stop-release check's undocumented singleton dependence · n-8 excursions named in substance not path · n-9 discard-multi-card's seed-conditional count.

## Drift scores

fidelity 8 · axioms 9 · base-case 7 · extensibility 8 · **falsifiability 6 (B-1 — blocks)** · lane 9 · **record 6 (worst, tied — blocks)**. Both 6s rise with the B-1/M-1 closures; the re-verifying K7 confirms.

## Execution residuals (owed at the battery / next K7)

vitest 289 · the ci guards · mutations (a)–(e) live · the 36-draw probe · shuffledDeckFor determinism + order confirmation · the full visual battery · the K7-T B-1 live stop-release reconstruction · the B-1 (this report) live reconstruction: end-turn → pete's deck count → fidget-click.

**The pending owner battery exercises:** B-1 (now closed — would have redded), n-5 (a missed drive aborts VG8j), m-4's margin, the seed-conditional pins. It does NOT exercise M-2 (needs turn-cycling) or the belowBooks geometry (needs cards in hand).

**VERDICT: RETURN — narrow, gate/record-side; the behavior code of all ten increments conformant as built. Closure order: B-1 (✓ landed) → M-1 (✓ landed) → M-2 (✓ registered) → the battery + the execution residuals.**

**End · K7_AUDIT_REPORT-U.md**
