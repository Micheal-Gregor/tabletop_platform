# BRIEF — spinner (the foundry's PILOT piece)

*Stage A of the RECIPE — DRAFT, awaiting owner approval. The pilot's job is double:
build the generic spinner AND find what the RECIPE gets wrong before it runs ten more
times. Nothing below is built until the owner approves this brief; the concept images
(Stage B) are the owner's pick, committed here as `concept-*.png` BEFORE the loops.*

## The object

The classic board-game spinner: a fixed base disc partitioned into N wedges, a pointer
(arrow) on a center spindle. GENERIC: wedge count and wedge labels/colors are
parameters; games skin them (a 4-wedge movement spinner, a 6-wedge weather spinner —
same archetype).

- `N` wedges, equal angles by default (weighted wedge angles = a later parameter,
  registered when a game needs it — not built speculatively).
- Wedge `i` spans `[i·2π/N, (i+1)·2π/N)` measured at the pointer's tip, wedge 0
  starting at the base's 12-o'clock, clockwise from the viewer's overhead look.

## Affordances

- **Click** the spinner → the SEEDED spin (the viewer's verb; the die's `rollDie` twin).
- **Grab-flick** the pointer → a live fidget spin (the die's grab-flick twin: pure
  theater, reconciles to its own deterministic result, no engine verb, no HK-11).
- The base never moves; only the pointer rotates. No translation, no free tumble.

## Outcome semantics

The settled state means: the wedge index under the pointer's tip at rest.
Read from pose: `wedge = floor(N · θ_rest / 2π) mod N` where θ_rest is the pointer's
final yaw. **Landing on a boundary line:** θ_rest exactly on a wedge edge resolves to
the wedge the pointer entered last (i.e. the floor above — the interval is half-open).
A real spinner's "on the line, spin again" house rule is a GAME rule, not the
archetype's; the archetype always reports a wedge.

## Engine binding

- Click emits the spin intent through IntentEmitter only (R-23 discipline), the same
  door shape as the die's roll.
- The seeded truth: one draw from the piece's stream, `target = draw mod N`. Truth is
  chosen BEFORE a single frame renders (the die's law, verbatim).
- The effect that moves game state consumes `target`; the pointer is theater.

## Theater contract (the reconcile point)

One invisible sim per spin (fresh state per spin, determinism by construction):
1-DOF damped rotation of the pointer about the spindle — NOT a free rigid body. The
sim returns a recording of θ(t) and the sim's natural rest angle θ_sim.

Reconcile = an ANGULAR OFFSET, the spinner's cube-symmetry analog:
`offset = center(target wedge) − θ_sim`, composed on every replayed frame. The motion
character (decay, wobble) is the sim's; the landing wedge is the engine's. Offset is a
rotation of the WHOLE recording, so the pointer's relative motion is untouched —
physics animates, never decides (I-82e).

Forced-mismatch drill (HK-11): under the drill the replay lands on the lie's wedge;
the verdict flags it and truth wins — the pointer re-settles to the seeded wedge.

## Physics scenario (Stage C oracles)

Model: θ'' = −(c·θ' + f_dry·sign(θ')) — viscous bearing + Coulomb dry friction (the
dry term is what makes a real spinner STOP instead of decaying forever). Seeded launch:
ω₀ uniform in a tuned window (a healthy flick spins ~3–8 full turns). Step at the
bench's 60Hz tick.

- **settle** ≤ K steps for every seeded spin (K tuned; target ≈ 3–5 s of theater max)
- **resting**: ω ≡ 0 at rest (exact — the dry-friction term guarantees a true stop),
  θ_rest finite and normalized to [0, 2π)
- **contained**: trivially true (1-DOF) — the check asserts the DOF discipline instead:
  the pointer's position never leaves the spindle
- **histogram**: over ~10k seeded sims, wedge outcomes uniform within χ² (α=.001) —
  the SIM's plausibility; actual fairness is the stream's (the die's caveat, verbatim)
- **F-1's lesson applied from birth**: rest is SUSTAINED (the criterion holds
  SLEEP_STREAK consecutive steps), never single-sampled — even though a monotone decay
  can't apex-freeze, the discipline is now the default, not a retrofit.

## Camera poses (for `shot.mjs`)

`overview` + one close pose over the spinner's board region (named when the adapter
places it; the BRIEF's Stage-E judging set is those two).

## Dress plan

Procedural archetype dress first: base disc + N wedge sectors + arrow pointer + spindle
cap, wedge colors and labels bound as skin tokens (R-21/R-22). A generated dress
(ComfyUI/TRELLIS.2 — e.g. a carved wooden base) is a LATER swap at the archetype's
attachment points; not part of the pilot's definition of done.

## Definition of done (Stage F)

Four oracles green · adapter + one registry line in · HK-11 twin test passing ·
VG-spinner layout group self-seeding · this BRIEF + owner-picked concepts + the visual
loop's round log committed.

## Open questions for the owner (answer at Stage-A approval)

1. Default N for the generic archetype's showcase: 6?
2. Does the pilot spinner join the LIVE game3d scene (a real board region) or a
   showcase/spike page first? (The die pattern suggests the live scene; a spike page
   is lower-risk for the pilot's Stage E.)
3. Pointer spins on the base, or the whole disc spins under a fixed pointer? (Classic
   board games do both; the BRIEF above assumes pointer-spins. Flip it if your games
   need the other.)
