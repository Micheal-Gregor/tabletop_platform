# Gap log

Engine gaps found while surfacing the library. The test: does the feature need the engine to
decide, record, or enforce something it doesn't already? If it only changes how something is
shown, it is not a gap — build it in the view.

A claim needs evidence, not absence of memory: name the interface-contract entries checked and
the compositions tried, and why each fails. States: `noticed` → `withdrawn` (it existed; name
the operation) or `shaped` → `ready`. An entry is `ready` when all three hold: no composition of
existing operations covers it; it came up in more than one walk, or it blocks a chosen job; the
owner agrees the shaped behaviour is the real need. Ready entries go to a Phase 1–4 extension
run, batched with related entries.

| ID | User job | Engine must decide / record / enforce | Walk it came from | Lookup evidence | State |
|---|---|---|---|---|---|
| K7-1-1 | (from the final review) | MOD-09 CC-4: REF-24's frozen test must be able to fail on a genuine bypass. Today 'R-24 · sole applier' (r3-r24-effects.test.ts:43-51) only checks that no export name matches /^fx[A-Z]/. Mutation in .k7/wt: levyCost (library/wire.ts:223) rewritten as a direct seat.cash write. R-24 and all 821 tests stayed green; restored by reset. The property that must hold: no module other than play/effects.ts produces an EFX-typed mutation of seats' cash, favor, assets or sueRights, of decks' draw order, or of windows. It needs a detector that resolves writes to those fields in every engine source file (not a name scan), or an on-path test that fails when a module-native move does not go through EffectEngine.apply. The owner must also reconcile I-137's direct seat.assets writes (outfit.ts:119-180, a capitalize-shaped mutation outside the EffectEngine) with REF-24, on the record. | K7 round 1, final review before seal-1 | INSTRUMENTS/k7-verdict-1.json | noticed |
| K7-1-2 | (from the final review) | MOD-22 CC-2: With the Ledger loaded, every library-mediated cost (crew:hire and outfit:buy, through levyCost at library/wire.ts:221-224) must move as a balanced Ledger post, so that cash ≡ derivedBalances (RC-D, drift-ledger.md:133) and an unbalanced move throws (REF-05). The test that must fail on the current tree: Ledger loaded, a second hire at nonzero cost, then assert seat cash equals derivedBalances and a ledger entry exists. On the current tree this gives cash -7 against derived 0. | K7 round 1, final review before seal-1 | INSTRUMENTS/k7-verdict-1.json | noticed |
| K7-1-3 | (from the final review) | MOD-29 CC-6: HOOK-06's condition 'platform < library' is not enforced. tools/check-tiers.mjs:11-15 treats packages/engine as one tier, so an injected packages/engine/src/kernel/k7probe.ts importing '../library/ledger.js' still passed 'the clean tree passes' (restored by reset). The checker must decide, by resolved path containment, that no file under the platform directories (kernel, play, ontology, rules, transport) imports from packages/engine/src/library. REF-04's suite needs a case that injects exactly that import and must fail. | K7 round 1, final review before seal-1 | INSTRUMENTS/k7-verdict-1.json | noticed |
| K7-1-4 | (from the final review) | MOD-30 CC-2: SEAM-43 requires the booklet to render the RulesetView in full. renderBooklet (render.ts:36-41) must render every vocabulary (name, version, members) and every contribution field the view model exposes (bearer, trigger, condition, effects, slotWrites, slots), with no type-erasing cast. The test that must fail on the current tree: render a registry with one contribution whose condition, effects and declared slots are non-trivial, then assert each field and each vocabulary member appears. | K7 round 1, final review before seal-1 | INSTRUMENTS/k7-verdict-1.json | noticed |
| K7-1-5 | (from the final review) | MOD-11 CC-2: REF-11 / EX-2 leg (b): role binding must be own-key membership in the closed role set. roles.ts:30 currently admits 'constructor' and returns an empty binding for 'toString'. The test that must fail on the current tree: admission of a kind whose roles include a prototype key ('constructor', 'toString', '__proto__') is refused naming the role, and usableBinding on such a key throws RoleRefusal. | K7 round 1, final review before seal-1 | INSTRUMENTS/k7-verdict-1.json | noticed |
| K7-1-6 | (from the final review) | MOD-05 CC-6: The frozen REF-08 test 'R-8 · wrap-once' must fail when the real-path HK-3 call in passSeat (play/turn.ts:78) is deleted. Mutation in .k7/wt: that call removed. select "R-8" stayed green (4/4); only the non-frozen 'D2 · HK-3 on the REAL passSeat path' failed; restored by reset. R-8's forbidden case must drive the orchestrated pass path, not the test-support function forceRoundWrap (turn.ts:94-102). That function's place in production code needs a register row or must leave src. | K7 round 1, final review before seal-1 | INSTRUMENTS/k7-verdict-1.json | noticed |
| K7-1-7 | (from the final review) | MOD-02 CC-5: Every pinned vector (vectors/V-1..V-9.json, owned by MOD-02, MOD-03, MOD-09, MOD-13, MOD-14, MOD-15, MOD-28, MOD-34) lacks impl_sha provenance, so the records cannot show they were computed rather than hand-written. The values themselves re-derive: the suite is green, and V-3 rows 0 and 5 matched an independent hand derivation (own canonical JSON and FNV-1a-64: 462977f6437ccb23, bd4dc98942785f47). Provenance must be recorded and checked by a declared re-derive command. | K7 round 1, final review before seal-1 | INSTRUMENTS/k7-verdict-1.json | noticed |
| K7-1-8 | (from the final review) | MOD-22 CC-2: With the Ledger loaded, every library-mediated cash move must post a balanced Ledger entry. The crew:hire and outfit:buy cost levy must follow the settlement precedent I-137 names, so that cash ≡ derivedBalances after a nonzero-cost hire or buy. Failing test that must exist and pass: under a loaded Ledger with a nonzero-cost pool card, outfit:buy and a second crew:hire each leave the seat's cash equal to derivedBalances and append exactly one balanced entry. | K7 round 1, final review before seal-1 | INSTRUMENTS/k7-verdict-1.json | noticed |
| K7-1-9 | (from the final review) | MOD-02 CC-2: The S-2 row's packRef and seats must be fixed at EngineCore construction and immune to mutation of the objects the caller passed in or received from toRow(). The Guard's seat authority must not move with them. Failing test: host a LockstepController (or EngineCore) with a mutable seats array and packRef, mutate both afterwards (and mutate a returned row), and assert row() and the Guard's seat verdicts are unchanged. | K7 round 1, final review before seal-1 | INSTRUMENTS/k7-verdict-1.json | noticed |
| K7-1-10 | (from the final review) | MOD-09 CC-4: REF-24's frozen test must present a genuine forbidden input: an effect-owned mutation (cash, favor, assets, sueRights, windows, deck inject) applied outside effects.ts, which the check refuses. Use a detector that resolves where those writes occur, not an export-name scan; the name scan may stay as a supplement. Writes the owner admitted (I-137/I-170 asset moves) must be named in the detector's allowance by register row, not slip past it silently. | K7 round 1, final review before seal-1 | INSTRUMENTS/k7-verdict-1.json | noticed |
| K7-1-11 | (from the final review) | MOD-34 CC-1: SEAM-44 must be built: the seeded result HOOK-11 compares against must come from the projected SeatView (MOD-33), not from a caller-supplied string. Failing test: a flourish whose claimed seeded value is absent from or differs from the view's seeded result is refused or flagged, and V-9 re-derives its die from engine state through project(). | K7 round 1, final review before seal-1 | INSTRUMENTS/k7-verdict-1.json | noticed |
| K7-1-12 | (from the final review) | MOD-30 CC-2: The booklet must render the RulesetView in full: vocabularies with members, and each contribution's bearer, trigger, condition, effects, slot writes and declared slots. Failing test: for a registry with a conditioned, slot-writing contribution, every field of renderRuleset(registry) appears in renderBooklet's output. | K7 round 1, final review before seal-1 | INSTRUMENTS/k7-verdict-1.json | noticed |
| G-1 | Throw a die or flick a spinner, and the result is the move (the Physics Bench; "play it" on BOTY's table) | Decide a Randomizer's outcome (the Die's face; the Spinner's sector and resting angle) by physical simulation of the seat's own logged throw or flick; record that input so (seed, seats, log) replays the same outcome on any machine; refuse, never repair, a throw that does not settle cleanly. The owner's ruling, 2026-11-08 (I-260, reversing I-82(e)): physics decides, for the die and the spinner | No walk yet: the owner's ruling (I-260) and `docs/reentry-2026-11-08.md` §2 step 5 and §3. It blocks a chosen job, the Physics Bench (§4) | `ui/interface-contract.md`: the only randomness is `RNGStream.next` / `nextInt`, deterministic per (gameSeed, name, call count), and no seat intent is a throw or a spin. `kinds.ts:138,141`: Die {face} and Spinner {sector}, role Randomizer; `roles.ts:22` binds Randomizer to RNGStreams (M4). `effects.ts:19`: EFX v1.1.1 is closed (pay, capitalize, grant_favor, levy, deck_inject, grant_sue_right, open_window), and none sets a Randomizer. BOTY's `eco-demand-roll` (`cards-q1.ts:62`) says "roll for it" with `fx: []`. Compositions tried: (a) `nextInt` for the face, physics drawn afterwards: the seed decides and the physics is theater, the shape I-260 reversed (the bench's replay plus offset, I-109); (b) simulate in the view and submit the result: engine logic in the view, and nothing records the throw, so the log cannot replay it | shaped |

## Shaped detail

(For each `shaped` or `ready` entry: inputs, outputs, rules, and a worked example taken from the
simulation. Describe the need, not a class design — Phase 1 derives the component.)

### G-1 · physics decides a Randomizer's outcome

**Inputs.** A die throw: position, velocity and spin from the gesture, rounded to integers in the intent. A spinner
flick: ω0 (tangential speed ÷ grab radius) and the start angle, as integers. The seed supplies only a jitter u, so the
input in effect is ω0·(1 + ε·u); ε is the owner's, per component (with ε > 0 no player can aim).

**Outputs.** The settled outcome (the Die's face; the Spinner's sector and resting angle), written as the kind's state;
the trajectory the view plays; and the settled world's snapshot hash, which is the replay check.

**Rules.**
- The simulation of the logged input decides. The seed never decides alone, and nothing steers the result (the bench's
  offset retires).
- Replay is exact: (seed, seats, log) rebuilds the same outcome and hash on any machine. The physics engine's version is
  pinned and recorded with the ruleset; the time step is fixed; each roll gets a fresh world; starting values come from
  deterministic operations only.
- Refusal, never repair: no throw, less than one turn, a die cocked against a wall, or one not settled within a stated
  number of steps gives "re-roll" or "re-spin". A spinner with no friction is refused at admission (it must stop).
- Fairness is measured, not assumed: 10,000 simulated throws per preset, chi-square against the faces or the sector
  widths. Each parameter says where it came from: measured, published or assumed.
- What the view shows equals the decided outcome (HOOK-11; truth wins).
- Left to Phase 1: how a physics engine that loads asynchronously meets the engine's synchronous submit, and whether a
  refused roll is logged.

**Worked example** (hand-computed from the closed form in the re-entry doc §3, not from a simulation; Phase 1
re-derives it). A spinner wheel: I = 0.002 kg·m², bearing friction τ = 0.004 N·m, no drag, 8 equal sectors, start
angle 0. A flick of ω0 = 12 rad/s turns Θ = Iω0²/2τ = 36.0 rad (5.73 turns) in T = Iω0/τ = 6.0 s and rests at
4.584 rad: sector 5, counting from 0. With ε = 0.05 and u = 0.5 the input in effect is 12.3 rad/s: Θ = 37.82 rad,
resting at 0.123 rad, sector 0. The 2.5% jitter moves the result by more than two sectors, while aiming at one sector
needs ω0 within 0.13 rad/s (about 1.1%), so the jitter, not the hand, decides the sector.
