# BRIEF — <piece>

*Stage A of the foundry RECIPE. Fill every section BEFORE code; commit alongside 1–3
owner-approved `concept-*.png` targets before the loops start.*

## Affordances
What a hand can do to it: grab / flick / spin / flip / draw / …

## Outcome semantics
What the settled state MEANS and how it is READ from pose (e.g. top face from the
resting quaternion; wedge index from the pointer's final angle). If nothing is read —
pure fidget theater, like the card slide — say so (HK-11 vacuous, no reconcile).

## Engine binding
- Intents the interaction emits (through IntentEmitter only — R-23).
- Effects that move the piece (through the engine seam — view-never-owns).
- Where the seeded truth comes from (which RNGStreams draw).

## Theater contract
The reconcile point: how the replayed recording is composed to land on the seeded
result (die: yaw-compose the settle offset; spinner: scale the spin-down to the drawn
wedge).

## Physics scenario
Arena (felt + rails? spindle? tray?), launch parameter windows, settle criterion,
resting-pose validity test, outcome partition for the histogram.

## Camera poses (for `shot.mjs`)
Named `__GAME3D__` presets (or custom pose notes) the visual loop judges from,
e.g. `overview, seat-0`.

## Dress plan
Procedural, or generated (concept → TRELLIS.2 → GLB → `asset-lint`)? Attachment point
on the archetype; skin tokens it binds.
