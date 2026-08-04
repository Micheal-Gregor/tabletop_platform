# K7-T — DISTINCT CONFORMANCE REVIEW of W-1 (I-121, 0184a43) + R-1b (I-122, 9e2c697)

> Provenance: this file is the VERBATIM output of the distinct K7-T session (agent
> adc740d04fb17a5a8, 2026-08-04, Read/Grep/Glob only — no shell, no Write). The builder
> transcribed it unchanged; the session itself could not write files. The execution
> residual (vitest run, the two mutations, the B-1 live reconstruction) is owed at
> re-verification.

**Session constraints, stated first (honesty over theater):** this K7 session was granted Read/Grep/Glob only — no shell, no browser, no Write tool. Consequences: (1) `/tmp/k7r2` was unreachable — nothing there was verified, used, or touched; (2) the vitest run, the two mutation experiments, and the CI guards were verified by **static predicate analysis and hand re-derivation, not execution** — the execution residual is named per-CC below and is owed at the next battery; (3) the report file was written by the builder from this verbatim output. The repo was not modified by the K7 session in any way.

---

## Per-CC verdicts

**CC-1 Code-trace — PASS.** Every touched module traces to a live register row: `packs/boty/src/index.ts:70` and `utilization/bench/src/game3d.ts:32` cite I-121; `die-physics.ts:130-137`, `discard-play.ts:17,33,50`, `components/table.ts:241`, `VG8j.gate.mjs:295-304` cite I-122. Both rows are live in `INSTRUMENTS/drift-ledger.md`; roadmap rows exist. No orphan code found. All cited resolutions (I-91, I-95, I-101, I-103, I-117) are live rows — no false citations.

**CC-2 Carried-rule — PASS.** Purity: the slide path never touches the engine (no `submit`/`rebuild` in `discard-play.ts`); the gate asserts rowHash/moveCount invariant across the toss (`VG8j.gate.mjs:287-292`). Frozen `game.ts` untouched by construction — its call site (`game.ts:45`) takes the default parameter; every other caller (`main.ts:38`, `boty-slice.test.ts:31,161`) unchanged. R-24/S5 untouched (no effect path). HK-6: rapier stays bench-side. Refusal-not-repair: cold-physics and near-still releases refuse to slide rather than fake one (`die-physics.ts:142`, `discard-play.ts:159-168`).

**CC-3 Fidelity — RETURN (one item, B-1 below).** The Min-combine friction tuning IS registered (roadmap, with headless numbers); HK-11 N/A-by-absence is explicitly registered (I-122 interpretation (c)) and correct — no seeded truth exists for a toss. But I-122's interpretation (a) asserts an off-nominal the code does not implement (B-1), and the spin formula is an unregistered invention (m-8).

**CC-4 Refusal-execution — PASS-static, execution residual.** Not executable this session. Statically: the poisoned-fx HK-4 twin (`w1-pack6-wiring.test.ts:19-27`) feeds a genuine forbidden input (`fx: 'not_a_verb'`) and asserts `PackLoadRefusal` by type; the 36-draw regression asserts per-draw `'ok'` with named draw indices. R-1b adds **no refusal surface** — pure theater, N/A-by-absence stated here, not silent.

**CC-5 Vector-discharge — N/A-by-absence + one hand re-derivation.** No golden vector is owned by either increment; `vectors/`/`visual-pins.json` untouched. The 36-draw pin is computed-from-implementation (the empirical probe, I-121) then committed — the vector discipline's shape. **Hand re-derivation of the mutation claim:** moe's genesis draw is `['job-posting','new-van','crossroads', ...Q1_DECK_ADD]` (`pack.ts:119`); `Q1_DECK_ADD[0] = 'vnt-project'` (`cards-q1.ts:20,74`), absent from `BOTY_PACK.cards` (`pack.ts:19-45`). Rewired to BOTY_PACK, draws 1-3 succeed and **draw #4 must refuse on the catalog (GX-10)** — the claim is arithmetically sound, not hand-waved.

**CC-6 Hook-wiring — PASS-static, execution residual.** Mutation (a) (rewire → w1 test fails): sound per CC-5's re-derivation; not executed. Mutation (b) (delete `beginSlide` → `discard-toss-slides` fails by name): verified against the predicate — `slideTrace` is written **only** inside `beginSlide` (`discard-play.ts:177`); with the call deleted the oracle returns null and `VG8j.gate.mjs:303` (`physReady && !!st && st.steps >= 2 && st.dist > 2`) fails by name. The check's dependence on the **previous check's drive** is honestly documented in the check comment and in I-122. The readiness wait (`VG8j.gate.mjs:272`) waits on real physics state, honoring the I-115/M6 lesson — but it is a bare await (m-3). `wireBoty`'s fresh-registry contract is live at both consumers. Gate-surface guard coherent (93→94, one new key).

**Off-nominal hunt results:** pointercancel mid-slide — no-op by design; coherent. Rebuild mid-slide — `resetDiscardPlay` purges the pool; the fresh stack renders truth; coherent (though `slideTrace` survives the reset — m-2). Re-grab DURING slide — **handled**: the sliding card keeps `discardLoose`, `discardGrabStart` clears `slide` and resets the plane window; coherent. Click fall-through — coherent. slideTrace singleton — real aliasing class, gate-unreachable today (m-2). y-drop at slide start — real one-frame vertical snap (m-6). `feltFrameToWorld` y-anchor — inherited byte-for-byte from the sealed die's rect construction; internally consistent, not R-1b drift. **Drag-STOP-release — the one that bit: see B-1.**

**Lane check — PASS.** W-1's `packs/` excursion is named in I-121 exactly as ARCHITECTURE.md requires; scope matches. R-1b's five files are all normal-lane. No carried K7-R2 minor was silently reopened.

---

## THE BLOCKING FINDING

**B-1 (record/fidelity, I-122 interpretation (a)) — a live register row asserts an off-nominal the code does not implement, and the registered fallback is dead code.**
1. *Dead guard:* `simulateSlide` seeds `frames` with one record then the loop **always** pushes at least one more before any break (`die-physics.ts:164-171`) — every non-null return has `frames.length ≥ 2`. So `beginSlide`'s `res.frames.length < 2` arm (`discard-play.ts:176`) is **structurally unreachable**. The "degenerate ≤1-frame sim" fallback I-122 registers cannot ever fire.
2. *The attributed gesture takes the opposite path:* `planePts` is appended only on pointermove and **never at release**. A fast drag → clean STOP → release therefore computes velocity from the **stale** moving window, passes the ≥40 u/s gate, and launches a capped slide from a motionless hand — while the diluted screen-window velocity routes it into the toss branch. I-122's "(≤1 frame, i.e. a drag-stop-release) falls back to loose-where-dropped" is **false as written** in both mechanism and outcome. This is the exact gesture shape in the owner's sealed drill repertoire (I-119/I-120), so the owner will exercise it.
**Minimal closure (refusal-not-repair):** supersede I-122's interpretation (a) on the record; register the true off-nominal (stale-window slide on drag-stop-release) as benign-or-owner-ruled with an explicit owner drill (drag a discard card, stop, release); the dead guard either becomes real or leaves with the supersession. Whether to time-gate the plane window is the owner's feel ruling (the die's analog was owner-accepted at I-120), not a K7 prescription.

## MAJOR — none code-side.

## MINOR (8)

- **m-1** Dead guard `res.frames.length < 2` at `discard-play.ts:176` (B-1's code face).
- **m-2** `slideTrace` is a module singleton: two concurrent slides alias the oracle, and it is not cleared in `resetDiscardPlay` — a future check reading it after a fallback toss passes on a stale trace (the K7-R M5 class). Unreachable in today's battery order.
- **m-3** `VG8j.gate.mjs:272` readiness wait is a bare `await` (no `.catch`): a cold-RAPIER timeout aborts the whole VG8j file — all later checks unemitted — instead of failing one check by name.
- **m-4** `discard-toss-slides` margin is thin: the drive's ~80-90 px over ~810 ms against capped decel ≈2.9 m/s² predicts dist in roughly a 1-5u band vs the `>2u` assert; 90/90 is single-run evidence. Consider widening the drive or asserting from recorded velocity.
- **m-5** Type discipline at the new W-1 seam: `BOTY_PACK as unknown as ContentPack` and `BOTY_PACK6 as never` at both live call sites — the very parameter W-1 adds is typed away everywhere it is used (runtime HK-4 still guards; if the casts cover a duplicate-type-identity issue between the path-import and the package alias, record that reason).
- **m-6** One-frame vertical snap at slide start (hover → replay) — a small pop against the file's own "never teleported" header; gate-blind; owner-feel item.
- **m-7** Roadmap commit cells still read "pending" after I-123 recorded the battery — the RB-4 class, caught early this time.
- **m-8** `setAngvel({ y: (vx - vz) * 3 })` — a deterministic but axis-asymmetric invented spin (+x flicks spin one way, +z the other), unregistered as a chosen interpretation.

## Drift-score table

| Dimension | Score | Note |
|---|---|---|
| Object-model fidelity | 8 | Structure matches claims; cast noise at the new seam |
| Axiom coverage | 9 | Purity/frozen-file/tier laws all honored in code |
| Base-case support | 7 | Fallback net real, but one registered fallback dead + stale-window path |
| Extensibility | 9 | buildArena shared; generic cuboid + generic frame mapping |
| Falsifiability | 7 | Kills real by analysis; not executed; thin margin; singleton trace |
| Lane | 9 | Excursion registered; everything else in-lane |
| **Record accuracy** | **6 — WORST** | I-122(a) false as written; stale roadmap cells |

Record accuracy < 7 **blocks new work on the R-1b module family (R-1c etc.) until B-1's supersession lands** — the teeth per the roster.

---

**VERDICT: RETURN — narrow, record-side.** The code of both increments is conformant as built; W-1 is clean throughout. The blocker is B-1: supersede I-122's interpretation (a), register the true drag-stop-release behavior, add the owner drill. Re-verification must reconstruct B-1 live (drag-stop-release a discard card and read the trace), plus execute the two mutations and the vitest suite that this session could not run.

**End · K7_AUDIT_REPORT-T.md**
