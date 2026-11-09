# Extension G-1 · Phase 1 · Step 1 — Intake

Run R2 (`docs/reentry-2026-11-08.md` §5). Written 2026-11-08 by the lead (Opus) under `metaframework:phase1-meta`,
Amendment E-1 (extension runs). The library is sealed at `seal-1` (`fca9e10`); this run writes nothing present at the
seal. HEAD at intake: `7807eb3`.

## 0. Declarations

| Declaration | Value | Ground |
|---|---|---|
| Run mode | **builder** | One gap entry to elaborate, not a body to reduce (SR-3: builder unless several concepts' documents) |
| Gate handling | **standing approval** | SR-3. Trace-through gates batch with an audit note. The five load-bearing gates halt regardless: the Minimal Worked Example determination, an open AE at the Consistency Gate, a blocking decision gate, a proposed object removal, and Final Package Assembly. A `spend.py status` exit of 1 also halts |
| Run type | **extension** | Gap G-1 (`ui/gaps.md`), state `ready` on the owner's word, 2026-11-09: "Yes, mark it ready" (commit `7807eb3`) |
| Budget (TE-1) | **8M weighted tokens** for R2 (Phase 1 only), measure: tokens weighted by API price against one fresh input token (TE-7) | Set by the R2 plan (`docs/reentry-2026-11-08.md` §5). The ledger is the build's own, `.metaframework/spend-ledger.md`, which already holds R1's 65 rows (20,554,010 weighted). R2's rows are appended to it; R2's headroom is read with `spend.py status --budget 28554010 --measure tokens` (R1's total plus R2's 8M), so the tool's exit-1 halt applies to R2 exactly |

**Forecast, with how it was got.** About **5.0M weighted** (range 4.3M to 5.8M). Measured so far, at this intake:
0.94M for 31 replies of reading (mostly cache reads of about 150k context). Each remaining step writes about 300 to
500 lines: about 20k output tokens (×5 weight = 0.1M) plus 10 to 15 replies re-reading a 150k to 250k context
(×0.1 weight = 0.15M to 0.35M) and cache writes (about 0.05M), so 0.3M to 0.5M per step for seven steps (2.1M to
3.5M). Add the Minimal Worked Example's computation scripts (0.1M), the one independent adversarial pass at Final
Package (TE-6, a sub-agent, about 0.5M) and the Final Package plus CLAUDE.md assembly (about 0.4M). Headroom against
8M: about 3M.

## Inputs (cited by content hash, never re-derived)

| Input | Path | SHA-256 |
|---|---|---|
| The gap entry G-1 and its shaped detail | `ui/gaps.md` | `db0bbf61…1538359` |
| The re-entry plan, §3 (die, spinner, engine, Phase 2–3 drafts) and §5 (runs, budgets) | `docs/reentry-2026-11-08.md` | `00e2c55d…600f1fa4` |
| The owner's ruling I-260 ("PHYSICS DECIDES — I-82(e) reversed") | `INSTRUMENTS/RESOLUTION_RECORD.md` row 57 | (ledger; cited by row) |
| The sealed Phase 1/2 anchor (S1 v2.0, the library's `CLAUDE_<Concept>_Phase2` input) | `governance/upstream/CLAUDE_TABLETOP_v2.md` | `408c52da…0e3eb5` |
| The sealed Phase 3 build instruction, revision v1.3 | `governance/S3/v1.3/CLAUDE_TABLETOP_Phase3.md` | `9b10495b…485f4` |
| Its companion specification | `governance/S3/v1.3/TABLETOP_Phase3_Specification.md` | `ff4cecd2…773822` |
| The library's axioms GX-1..GX-39 and base cases GBC-1..GBC-64 | `INSTRUMENTS/axioms-and-base-cases.md` | `0620b7f3…795786` |
| The interface contract (what a caller may do) | `ui/interface-contract.md` | `c3c3dd86…1c2` |

**Dataset evidence received from the owner during intake (2026-11-08).** The owner answered the run's one question:
they have **both** real spinners and dice with a felt tray to film. They also sent three dice videos and one spinner
link. Each is cited by hash; none is copied into the repo.

| ID | Source | What it shows (from an 8-frame contact sheet) | Stream | SHA-256 |
|---|---|---|---|---|
| D-1 | `Downloads/7344541-uhd_3840_2160_25fps.mp4` | Wooden alphabet cubes dropped onto pink paper, shot from above, heavy motion blur | 2560×1440, 25 fps playback, 14.96 s | `dd62d611…331c5f` |
| D-2 | `Downloads/14757485_1920_1080_25fps.mp4` | Red sharp-cornered acrylic dice landing on a white hard surface, side view at table height, shallow focus | 1920×1080, 25 fps, 14.16 s | `c61c1277…d29` |
| D-3 | `Downloads/7102266-hd_1920_1080_30fps.mp4` | One translucent round-cornered die tumbling to rest on a dark textured mat (felt-like), close-up; the die is still moving 10 s in, so the clip is almost certainly slowed | 1920×1080, 30 fps, 17.53 s | `c30847d9…1f95` |
| D-4 | YouTube `m7FkgWdezCo`, "Custom Game Spinner and Spin Wheel" (channel BoardGamesMaker) | Not viewed or downloaded: a download needs the owner's word, and the platform's terms apply | unknown | — |

D-1 to D-3 look like stock footage: their playback rate (25 or 30 fps) is not their capture rate, so their time base
is unknown. This bears on the dataset plan (AE-c27).

## 1. Restated concept

For a component of kind **Die** or **Spinner** (both `Randomizer`s in the sealed ontology, `kinds.ts:138,141`), the
outcome of a roll is **decided by a physical simulation of the seat's own throw or flick**. The seat's gesture is
measured, rounded to integers and logged as the intent's arguments. The seed supplies only a small jitter on that input.
A pinned physics engine (Rapier's WASM build, reused rather than reinvented, per I-260) simulates the input in a fresh
world at a fixed time step until it settles. The settled state gives the outcome (the Die's face; the Spinner's sector
and resting angle), the trajectory the view plays, and the settled world's snapshot hash, which is the replay check.
Replay is exact: (seed, seats, log) rebuilds the same outcome and hash on any machine. A throw that does not settle
cleanly is refused ("re-roll", "re-spin"), never repaired. Fairness is measured by a dyno (10,000 simulated rolls per
preset, chi-square), and every physical parameter states its source: measured, published or assumed.

The owner's words (I-260): "simulation should have been our goal"; "We don't have to reinvent the wheel if someone else
has solved the problem."

## 2. Scope boundary

**In scope (the gap):**
- Deciding a Die's face and a Spinner's sector and resting angle by simulation of the logged input plus a seeded jitter.
- The determinism conditions the decision rests on, proved rather than assumed: a pinned engine version recorded with
  the ruleset, integer inputs, no transcendental starting values, a fixed step, a fresh world per roll, and the
  snapshot hash as the replay check.
- The base cases, refusals first: no throw, less than one turn, a cocked die, a roll not settled within a stated
  number of steps, a spinner with no friction refused at admission.
- The spinner's closed form, and its use as a vector against the engine.
- Fairness: the dyno, chi-square, the skill index.
- The dataset plan: filmed flicks and throws, fits, held-out checks, each parameter's provenance.
- The two points the gap leaves to Phase 1: how an asynchronously loaded engine meets the synchronous submit, and
  whether a refused roll is logged.
- The sealed library's carried findings this extension depends on: K7-1-3 (the tier check), K7-1-1 and K7-1-10 (REF-24's
  detector), and K7-1-11 (SEAM-44 unbuilt), named as dependencies for the extension's Phase 4.

**Out of scope:**
- Every sealed object, except as a dependency named through its existing interface (E-1). Nothing sealed is removed,
  merged, renamed or re-derived.
- Physics for cards, tokens, pieces and boards: it stays theater (I-260).
- The Dial, which is also a `Randomizer` (`kinds.ts:143`), and the other kinds: not in G-1.
- The view: the Physics Bench is R6. The 3D programme is stopped and only a record (`governance/3D-ROADMAP.md`).
- Content that asks for a roll (BOTY's `eco-demand-roll`, `cards-q1.ts:62`, `fx: []`): wiring a card to a roll is a
  later gap.
- ε's values per component: the owner sets them at R5 (§5 of the plan). Phase 1 states the constraints ε must meet.
- The engine version itself: adopting or upgrading a package is the owner's (SR-3, "downloads and installs").

## 3. Assumption log

| ID | Assumption | Class | Where it is tested |
|---|---|---|---|
| A-1 | Rapier's WASM build is cross-platform deterministic **for the same version and the same initial conditions**, where the same initial conditions means the same parameter values, bodies built the same way, inserted in the same order, from values made by deterministic operations (rapier.rs, "Determinism", JS 0.21 docs, read 2026-11-08). The S1 does not assume it holds: it makes it falsifiable (a replay vector across two platforms) | external, cited | Theoretical Design (GX-46); a deferred vector |
| A-2 | ECMAScript `Number` addition, subtraction, multiplication and division are IEEE 754 binary64, round-ties-to-even, so they give the same bits on every conforming engine; the `Math` library's functions are implementation-approximated | benign (language specification) | Theoretical Design (GX-41) |
| A-3 | Once the WASM module is initialised, building, stepping, snapshotting and freeing a world are synchronous calls (the docs' example calls `world.step()` with no await; the page does not say so outright) | latent | a deferred check at first implementation |
| A-4 | The candidate pin is the version the bench already uses, `@dimforge/rapier3d-compat` 0.19.3 (`package.json:26`, installed). The docs read are for 0.21; the determinism claim is stated per version, never across versions | benign | Implementation Specification (the pin) |
| A-5 | A roll is a seat's intent under turn discipline, like every other intent (GX-1, HOOK-01) | benign | — |
| A-6 | A fair die's target distribution is uniform over its six faces; a spinner's is each sector's width over 2π | benign | Theoretical Design (GX-48) |
| A-7 | The owner can film their own spinners and dice on a felt tray at 240 fps (owner, 2026-11-08: "Both: spinners and dice") | benign | the dataset plan |

## 4. Initial object scan (not yet formalized)

New, for this extension: the engine pin (version and build identity), the preset (geometry, materials and their
provenance), the throw and the flick (integer inputs with declared units), the jitter and the input in effect, the
world build (fresh, fixed insertion order), the step (fixed dt), the settle rule (rest test and step cap), the outcome
(face or sector, or a refusal), the rest pose, the snapshot hash and the replay check, the trajectory, the solver
loader and the ready solver, the spinner's closed form and its energy books, the dyno and its chi-square, the skill
index, the dataset (sources, fits, held-out third), and the provenance tag.

Sealed givens it names (cited, never re-derived): GX-1 to GX-5 (guarded path, refusal-not-repair, log-as-truth,
rebuild-never-patch, stream isolation), GX-14 (Randomizer→RNGStreams), GX-18 (supersede, never respec), GX-34 (tiers),
GX-38 (theater over truth); MOD-02 EngineCore, MOD-03 IntentLog, MOD-04 RNGStreams, MOD-10 KindRegistry, MOD-11
RoleBinder, MOD-27 Lockstep, MOD-29 TierCriterion, MOD-33 SeatProjector, MOD-34 TheaterSync; SEAM-03, SEAM-23,
SEAM-38, SEAM-39, SEAM-44; REF-01, REF-09, REF-20, REF-24; HOOK-02, HOOK-06, HOOK-11; VEC-02, VEC-09.

## 5. Ambiguity register

New identifiers continue above the sealed record's highest (AE-c12).

| ID | Ambiguity | Why it stays visible |
|---|---|---|
| AE-c13 | Where the asynchronous engine load meets the synchronous `submit` (left to Phase 1 by the gap) | Must be decided by the Consistency Gate |
| AE-c14 | Whether a refused roll is logged (left to Phase 1 by the gap) | Must be decided by the Consistency Gate |
| AE-c15 | The jitter's form: u from `RNGStream.next` in [0, 1) as written (ω0·(1 + ε·u)), or a symmetric form; and, for the die, which input components it scales | Changes how much of the outcome the hand controls |
| AE-c16 | Where the pin (engine identity, integration parameters, preset hash) is recorded "with the ruleset" so that (seed, seats, log) covers it | The row's shape is sealed (SUP-1) |
| AE-c17 | Where the rest pose lives: the Spinner kind is sealed as `{sector}` (`kinds.ts:141`), and the gap writes "sector and resting angle" as the kind's state | Changing a sealed kind is not an extension (E-1) |
| AE-c18 | Where a roll starts: the spinner's start angle and the die's start orientation (the last rest pose, a canonical pose, or the throw's own arguments) | A start the player chooses is a lever on the result |
| AE-c19 | The settle rule's numbers: rest thresholds, consecutive steps, the step cap N, the cocked-die angle | Stated numbers are owner- or data-set |
| AE-c20 | The integer inputs' units and scales | Fixes resolution and range |
| AE-c21 | The dyno's acceptance rule: significance level, N, the population of throws it simulates, and what a failed dyno does to a preset | A dyno's verdict depends on the throws it is fed |
| AE-c22 | How the trajectory reaches the view: stored, or derived per read; the sealed projector carries no component state (`projector.ts:173-197`) | The one legal read is sealed (S-6, GX-35) |
| AE-c23 | "Seeded result" in GX-38, SEAM-44, REF-20 and HOOK-11, now that physics decides | Reading it as "the engine-decided result" is an interpretation |
| AE-c24 | Whether writing a Randomizer's outcome is an effect (EFX, the EffectEngine's alone) or the roll intent's own mutation | REF-24's subject; K7-1-1 and K7-1-10 |
| AE-c25 | Whom "no player can aim" protects against: a human hand, or also a client that knows the seed (every lockstep peer has it) | Decides whether the jitter is enough |
| AE-c26 | How the spinner's τ and b map onto the engine's mechanisms (a hinge motor's force limit, angular damping) and the tolerance the vector allows | The closed-form vector is only as good as this mapping |
| AE-c27 | Which sources may make a parameter "measured": the owner's own 240 fps films, or also third-party footage with an unknown time base (D-1 to D-3) | Provenance is a stated claim |
| AE-c28 | A throw of several dice at once: one world for all of them, or one world per die | "A fresh world per roll" reads two ways |

## 6. Conflict and constraint scan

| ID | Between | The conflict |
|---|---|---|
| CF-1 | G-1 × the S1 v2.0 do-not "Do not let a gesture influence a result or an animation carry game meaning" (`CLAUDE_TABLETOP_v2.md`) | G-1 makes the gesture's measured input decide. I-260 reverses I-82(e) for the die and the spinner; it does not name this do-not. Its second half (no animation carries meaning) still holds |
| CF-2 | GX-38 "the seeded result wins" × physics decides | Holds if "seeded" reads as "engine-decided" (AE-c23); I-260's record says "HK-11 holds (shown ≡ computed)" |
| CF-3 | GX-14 Randomizer→RNGStreams × a solver that decides | No conflict if the solver is a deterministic function and the only entropy is still a stream draw (GX-5); recorded so it is shown, not assumed |
| CF-4 | REF-01 / GX-2 / GX-3 (a refused intent is not logged) × the engine's apply context, which offers only shared, advancing streams (`core.ts:31-33,158`) | A refusal decided after the jitter draw advances a stream the replay never advances (AE-c14) |
| CF-5 | HOOK-11 (displayed ≡ decided) × the sealed SeatView, which carries no component state | The decided face cannot reach a view through the one legal read; K7-1-11 records the same defect (AE-c22) |
| CF-6 | Rapier entering a library-tier package × HOOK-06, whose checker treats `packages/engine` as one tier (`tools/check-tiers.mjs:11-15`; K7-1-3) | A platform file importing the physics package would pass today |
| CF-7 | New writes of a Randomizer's state × REF-24's frozen test, which cannot see a write made outside the EffectEngine (K7-1-1, K7-1-10) | Whatever AE-c24 decides, the detector must see these writes |
| CF-8 | The bench's physics × determinism | The bench builds rails and launch velocities with `Math.sin`/`Math.cos` (`utilization/bench/src/die-physics.ts:87-88,140`) and uses 3 g gravity (line 22); both retire (plan §3) |
| CF-9 | "Less than one turn is refused" × "with ε > 0 no player can aim" | Just above one turn, a small ε spreads the result over few sectors (to be shown at the Minimal Worked Example and attacked at the Logic Stress-Test) |

## 7. Risk of misinterpretation

- **Physics as theater again.** Any design where the seed picks the outcome and the simulation is fitted to it is the
  shape I-260 reversed (the bench's replay-plus-offset, I-109). The simulation of the logged input must be the only
  decider.
- **"Deterministic" read as "deterministic on my machine".** One machine's repeat run proves nothing about another's;
  only the cross-platform hash comparison does.
- **"Refusal" read two ways.** An intent the Guard refuses (REF-01: unchanged, not logged) is not the same as a roll the
  physics refuses (the throw happened; it did not settle cleanly). Collapsing them is EV-5's collapse.
- **Fairness read as one number.** A dyno's chi-square depends on the throws it simulates; "fair for a human hand" and
  "the jitter alone defeats aim" are different claims.
- **Stock footage read as measurement.** A slowed clip with an unknown time base gives no speeds or decay rates.

## 8. Recommended Theoretical Design direction

Model the roll as one deterministic function, O = settle(simulate_v(build(P, x ⊗ j(u)))), and give each determinism
condition its own axiom whose necessity is shown by a counterexample (what goes wrong without it) and whose holding is
a guard the build can test. Keep the two kinds of refusal apart from the start. Treat the spinner as the engine's proof
(its closed form is an oracle), and the die as the consumer. Split fairness into two claims, the hand's and the
jitter's. Carry every sealed object as a dependency through its existing interface, and register each place where the
sealed interface does not reach (CF-4, CF-5, CF-6, CF-7) rather than designing around it silently.

## 9. Approval

Under standing approval this gate batches. Audit note: Intake confirms the gap's own statement (`ready`, owner,
2026-11-09) and adds the sealed-interface findings CF-4 to CF-7, read from the sealed code at `seal-1`. No AE is resolved
here. Spend at this gate: see the ledger row "phase1:intake".
