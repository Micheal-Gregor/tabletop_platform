# TABLETOP · Extension G-1 — physics decides a Randomizer's outcome (S1, Phase 1)

> **Extension of the sealed TABLETOP library (`seal-1`, `fca9e10`).** This file is the Phase 1 handoff for gap G-1
> only (`ui/gaps.md`). It never merges with `governance/S3/v1.3/CLAUDE_TABLETOP_Phase3.md` or with any other concept's
> file. Sealed objects are cited by identifier and reached only through their existing interfaces; nothing present at
> `seal-1` is written. The owner's ruling behind it: I-260 ("physics decides, for the die and the spinner"). The full
> package is `S1-G1-final-package.md` beside this file; the step files are its record.

## What this project does

Adds a library-tier physics module to the sealed engine. Two new intents, `die:throw` and `spinner:spin`, carry the
seat's measured throw or flick as integers. The Guard refuses, before any draw and without logging, every throw it can
judge from the input alone: malformed, out of turn, below the no-throw floor, or a flick below the spinner's floor
x_min, which is set so that every jitter value clears it. Inside the sealed synchronous `submit`, the roll's applier
draws one value from the component's own seeded stream, applies it symmetrically (to the spinner's flick; to the die's
velocity and spin, never its release position), builds a fresh world on a pinned Rapier build from integers, pinned
literals and the component's last recorded rest pose, steps it at a fixed dt until it settles or hits the step cap,
and reads the outcome through ordered refusal gates. A VALUE writes the kind's sealed field (Die.face, Spinner.sector)
and a settle record (rest pose as a quaternion, input, jitter, step count, a pure-JS snapshot hash). A refused outcome
("re-roll", "re-spin") writes the settle record only, is logged, and leaves the roll owed. (seed, seats, log) replays
every outcome bit-for-bit on any machine. The engine is loaded before the game is hosted. Offline tools fit presets
from filmed data, each value tagged measured, published or assumed, and a dyno on the measured population admits a
preset for play.

## Architecture

- X1 PhysicsHost — load the pinned build; give `host`/`resume`/`rebuild` a `wire` closing over the ready solver — ready for design
- X2 Presets — physical values with provenance; G-0a structural admission, G-0b admission for play (the dyno record); preset hash — ready for design
- X3 RollIntents — Guard specs (G-1, with the spinner's x_min); appliers: one draw → X4 → X5 → state; start from the last rest quaternion — ready for design (units, pin location implementation-dependent)
- X4 Simulator — the one roll function: fresh world, fixed insertion order, fixed dt, settle rule, Θ accumulated per step, pure-JS snapshot hash — ready for design
- X5 OutcomeReaders — gates G-F non-finite → G-2 unsettled → G-3 escaped → G-4 no-tumble (die) or the spinner's defect hook → G-5 cocked; the spinner's sector by sign tests — ready for design
- X6 SettleRecords — σ; the last σ per component; the replay comparison — ready for design
- X7 Trajectory — poses derived per read from σ, never stored — requires human review (needs ODG-g9)
- X8 Dyno — the hand's claim (measured population, outcome relative to the start, χ²) and the jitter's claim (aim advantage A), both on accepted outcomes with the acceptance rate — ready for design
- X9 Dataset — sources by hash, time base verified in clip, fits, held-out Θ and T residuals — conceptual (until the owner's films)
- X10 ClosedFormOracle — the spinner's exact model for vectors and analysis, never a decider — quasi-coded

Logic flow of one roll: Guard (G-1, no draw) → one draw (MOD-04) → x_eff → X4 roll → X5 gates → X6 σ → the apply returns
the next state → `submit` logs it (HOOK-02).

## Interfaces and seams

- SX-01 X1 → Rapier — the pinned build, initialised — build SHA-256 = π.build
- SX-02 X1 → MOD-27 `host`/`resume`, MOD-02 `rebuild` — a `wire` closing over the ready solver — only after the load resolves
- SX-03 X1 → MOD-02 `registerIntent` — the two intents' specs and appliers — one registration per type
- SX-04 X3 → MOD-02 Guard — intent → LEGAL or intent refusal — pure; no draw; REF-01 semantics; the spinner's x ≥ x_min here
- SX-05 X3 → MOD-04 stream(component).next() — u, one per attempt, after LEGAL — XH-04
- SX-06 X3 → X4 — (π, P, x_eff, s0) — x_eff = x ⊙ (1 + ε·(2u − 1)) on the flick, or the die's velocity and spin; s0 a quaternion
- SX-07 X4 → Rapier — build, step, snapshot, free — fresh world, fixed order, fixed dt
- SX-08 X4 → X5 — the RollRun (rest summary, n* or UNSETTLED, H, Θ accumulated or the up-face sequence) — gate order fixed, G-F first
- SX-09 X5 → X6 — O, rest quaternion, n*, H — σ complete and finite before return
- SX-10 X3 → state via the apply return — VALUE: kind field + σ; REFUSE: σ only — no effect-owned field written
- SX-11 X3 → MOD-03 via `submit` — every attempt that drew, logged after success — HOOK-02
- SX-12 X6 → X3 — s0 = last σ rest quaternion, or the canonical pose — never from intent args
- SX-13 MOD-02 `rebuild` → X6 — rebuilt σ against the original run's reference H — ODG-g11; live peers already get each move's state hash (`MoveListener`)
- SX-14 X7 → X4 — σ re-simulated to poses — RX-1; last pose ≡ σ.rest
- SX-15 X7 → MOD-33 SeatView — σ visible to a view — needs K7-1-11's fix (ODG-g9)
- SX-16 MOD-34 TheaterSync ← X7 — displayed ≡ decided — HOOK-11 read as "engine-decided"
- SX-17 physics package → MOD-29 — imports point down; Rapier at library tier only — needs K7-1-3's path fix and new RULES rows in `tools/check-tiers.mjs` (ODG-g8)
- SX-18 X3 ⇸ MOD-09 — no effects — REF-24's detector, once built, names X3's writes (ODG-g10)
- SX-19 X2 → X8 — the preset for both claims — the measured population for play
- SX-20 X9 → X2 — fitted values with κ — κ = measured only with an in-clip time base and a time-dependent residual
- SX-21 X10 → X4 (tests) — Θ_closed against Θ_engine — tolerance on Θ, at least ω_eff·dt/2
- SX-22 X2 → X3, X4 — presets admitted for play, hashed into the pin record — XH-09

## Reusability contracts

- RX-1 RollFunction — build, step loop, settle, hash — live roll, rebuild, X7, X8, vectors (rejects only structurally invalid presets, so the dyno can run before admission for play)
- RX-2 UnitsToBinary64 — integers ÷ exact unit scales — X3, X8, X2
- RX-3 OutcomeReaders — G-F, G-2..G-5 in order — X3, X8, X7's check, vectors
- RX-4 PinMatch — loaded build = π — X1, X3's hook
- RX-5 SettleRule — squared speeds under thresholds for K steps; cap N — inside RX-1
- RX-6 JitterApply — x ⊙ (1 + ε·(2u − 1)) on the flick, or the die's velocity and spin — X3, X8
- RX-7 ProvenanceCheck — κ present; measured needs a verified time base and held-out residuals — X2, X9
- RX-8 FairnessStatistics — χ² (relative to the start where starts chain) and aim advantage A, on accepted outcomes — X8, vectors

## Scalability constraints

- SC-x1 Presets are data — sector widths, boundary directions, face labels, floors (x_min, T_f, no-throw), α, thresholds, ε, dt — they vary per component and dataset
- SC-x2 One attempt, one world — no shared world — history must not leak between rolls
- SC-x3 Bounded work per submit — N is preset data — `submit` is synchronous
- SC-x4 One σ per component in state — earlier σ derive from the log — derived values are never stored
- SC-x5 Versions side by side — the pin is per game — old games replay on their own build
- SC-x6 The dyno is offline — N, populations and its seeds are inputs — fairness is never computed at play time

## Elegance rules

- EL-1 One roll function — a second simulation path for the view, dyno or replay
- EL-2 Only the exactly specified `Math` functions (`abs`, `ceil`, `clz32`, `floor`, `fround`, `imul`, `max`, `min`, `round`, `sign`, `trunc`) in building inputs or deciding; no clock, no `random` — `Math.sin` in a rail position; `Math.sqrt` for a speed
- EL-3 No world outlives an attempt — a module-level or cached world
- EL-4 No wall-clock or frame-driven step — dt from a frame callback
- EL-5 Inputs logged as integers, never re-rounded — a float in intent args
- EL-6 Refuse, never repair — nudging a cocked die flat; rounding Θ up to a turn
- EL-7 No kind field without σ; no σ without a logged attempt — Die.face written by a view or the dyno
- EL-8 No physics import below library tier — a kernel file importing the physics package
- EL-9 The seed never chooses an outcome — `nextInt(6)` for a face; a seed-generated throw
- EL-10 No stored trajectory — trajectory frames in state
- EL-11 A solver exists ready or not at all — a "loading" branch inside an applier

## Verification obligations

- **Refusal and positive tests** (step 7 §10.1, carried in full in the package): XP-01 to XP-17 and XR-01 to XR-33 (XR-18
  reserved for an on-the-line rule if adopted; XR-22 folded into XR-01). At least one refusal per guard: G-H (XR-01,
  XR-02), G-0 (XR-03 to XR-08), G-1 (XR-09 to XR-11, XR-15, XR-28), the draw (XR-12), G-F (XR-32), G-2 (XR-13), G-3
  (XR-14), G-4 (XR-16, XR-33), G-5 (XR-17), the write (XR-19, XR-20), replay (XR-21), construction (XR-23), the world
  (XR-24), theater (XR-25), tiers (XR-26), the solver (XR-27, XR-30), preset wiring (XR-31), data (XR-29). Mutation-test
  each guard: delete the guarded call and the named test must fail.
- **Golden vectors:** XV-07 (the component stream's draws, computed from the sealed RNGStream) and XV-08 (the closed-form
  oracle on G-1's example, computed) are pinned; XV-01's oracle side is computed (Θ 16.0, 36.0, 64.0 rad at 8, 12,
  16 rad/s). DEFERRED, each with its discharge condition: XV-01 engine side, XV-02, XV-03 (cross-platform replay on two
  JavaScript engines or operating systems; no die module counts complete without it), XV-04, XV-05, XV-06, XV-09,
  XV-10. **Every deferred vector is computed from the implementation and re-derived before its module counts
  complete.** None is hand-written.
- **Hooks:** XH-01 (only exact `Math` functions; no clock or `random`; fail commit), XH-02 (build = pin at
  host/resume/rebuild; UNCOMPUTABLE), XH-03 (solver = pin inside the applier; load-bearing, since `registerIntent` and
  `supersedeIntent` are public), XH-04 (one draw, after LEGAL), XH-05 (world freed per attempt), XH-06 (write shape; no
  effect-owned field), XH-07 (rebuilt σ.H = reference; DivergenceError), XH-08 (tier boundary by resolved path, with
  RULES rows for the physics package and Rapier; needs ODG-g8), XH-09 (only presets admitted for play are wired), XH-10
  (displayed ≡ decided, last pose ≡ σ.rest; needs ODG-g9), XH-11 (no non-finite value recorded).
- **Production concerns (developer-owned):** XPC-01 latency of a synchronous simulation in `submit`; XPC-02 WASM size and
  load time; XPC-03 several pinned builds side by side; XPC-04 scripted aimers (with ODG-g6); XPC-05 dyno compute;
  XPC-06 films kept out of the synced repo, cited by hash; XPC-07 an accessible input that is still the seat's own,
  never seed-generated; XPC-08 re-roll telemetry.

## Open decision gates

- ODG-g5 ε, x_min, A_max and the dyno pass rule per component — non-blocking for Phases 2–3; blocking for admitting a preset for play — the owner at R5
- ODG-g6 trust model against scripted aimers (a sealed seed-model change) — non-blocking — the owner, at Phase 5's security review or the first networked game
- ODG-g7 the pinned build and where the pin record lives (in the pack, or a setup intent) — non-blocking for Phases 2–3; blocking for Phase 4 — the owner (version), Phase 2 (placement)
- ODG-g8 K7-1-3: HOOK-06 by path containment, plus RULES rows naming the physics package and Rapier in `tools/check-tiers.mjs` (sealed) — blocking for Phase 4's merge — the owner (`seal.py reopen`); placement alone cannot discharge it
- ODG-g9 K7-1-11: the SeatView carries component state and σ — blocking for X7's view use, HOOK-11's extension and R6; not for R3–R4 — the owner (`seal.py reopen`)
- ODG-g10 K7-1-1/K7-1-10: REF-24's write-resolving detector names X3's writes — non-blocking (XR-20 guards X3) — the owner
- ODG-g11 where the replay check's reference hash is held (beside the row, or the peers' `MoveListener` hashes) — non-blocking for Phases 2–3; blocking for VC-1 in production — Phase 2/3 with the developer
- AE-c19 settle numbers and floors (dataset, R5) · AE-c20 input units (Phase 2) · AE-c26 τ/b mapping and tolerance (Phase 4's first vector) · AE-c28 several dice per throw (first such content) · AE-c29 the on-the-line rule (the owner at R5) — all non-blocking

## Traceability

- X1 → SX-01, SX-02, SX-03 → P-1 EnginePin
- X2 → SX-19, SX-22 → P-2 Preset, P-11 Provenance
- X3 → SX-04, SX-05, SX-06, SX-10, SX-11, SX-12 → P-3 RollInput, P-4 StartState, P-5 JitterDraw
- X4 → SX-07, SX-08, SX-21 → P-6 Roll
- X5 → SX-08, SX-09 → P-7 OutcomeReader
- X6 → SX-09, SX-12, SX-13 → P-8 SettleRecord, P-9 ReplayCheck
- X7 → SX-14, SX-15, SX-16 → (derived) Trajectory, GX-52
- X8 → SX-19 → P-10 Dyno
- X9 → SX-20 → P-11 Provenance with Dataset
- X10 → SX-21 → (contextual) ClosedForm Φ

Axioms GX-40 to GX-52; base cases GBC-65 to GBC-87 (`step-3-base-case-reduction.md` §11).

## Do not

- Do not write any file present at `seal-1`; a sealed object that must change is the owner's (`seal.py reopen`), never this extension's.
- Do not let the seed choose an outcome, and do not steer a result toward one (the bench's replay-plus-offset retires).
- Do not simulate on any build but the game's pin; never fall back to another build or to a seeded roll.
- Do not use a `Math` function outside the exact list, a clock or `random` to build inputs or decide; do not log a float input.
- Do not recover an angle with `atan2` or `acos` to decide; read sectors by sign tests and accumulate Θ per step.
- Do not reuse a world across attempts, or step by wall-clock or frame rate.
- Do not repair a throw: no nudging, re-dropping or rounding; refuse it.
- Do not test a floor the input can decide after the draw: a refusal that depends on u lets an aimer select on u.
- Do not draw more than once per attempt, or before the Guard's LEGAL; do not let an applier throw after its draw.
- Do not collapse the two refusals: an intent refusal is unlogged and drawless; an outcome refusal is drawn and logged.
- Do not write an effect-owned field from a roll, and do not route a roll through EFX.
- Do not record a non-finite value; refuse it.
- Do not store a trajectory; derive it from σ.
- Do not import the physics package or Rapier from the platform tier.
- Do not take a start pose from the intent; start where the component last rested.
- Do not jitter the die's release position.
- Do not admit a preset for play on an assumed population, judge fairness by a χ² over chained starts, or call a value measured without an in-clip time base.
- Do not let a closed form decide; it is an oracle for tests.
- Do not hand-write a golden vector; compute it or defer it with its discharge condition.
