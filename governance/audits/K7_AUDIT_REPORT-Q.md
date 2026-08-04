# K7 AUDIT REPORT Q — the BATCH review of the card-table family (I-88 … I-95)

**Charge:** I-96 carried K7-Q as the next session's first gate item — the Q-1/T-1/Q-2/2b/2c/
Q-3/Q-6/6b family is owner-sealed and was recorded battery-green at c0cb235, but had had NO
distinct adversarial K7. K7-P's D1/D2/D10 probes ride this review.

**Method.** Three DISTINCT reviewers, no builder context, run in parallel over disjoint
scopes (Q-1/T-1 · Q-2/2b/2c · Q-3/Q-6/6b). Each read the record first and derived its
specification from the register rows, not from the builder's account. **Refusal-not-repair
was held: nothing in this review edited a single line of the build.**

**Execution constraint (stated plainly, per the CC-4 discipline).** The three reviewers had
no shell; their findings are source-derived. The *coordinating* session then **independently
re-verified every BLOCKING claim** — one by live execution against the real engine, two by
direct source trace. Chromium is unavailable in the sandbox (the CDN is blocked), so the
browser gates remain owner-side, exactly as the I-83 constraint records. What was executed
and what was not is marked on every finding below.

**Verdict: RETURN.** Three BLOCKING findings, confirmed. The `k7-pass` tags for I-88…I-95
do not ride.

---

## The headline: two independent findings say `VG8j` cannot exit 0 — which contradicts I-96

I-96 records "`npm run gate:visual` ALL GREEN … at c0cb235" on the owner's own run, and the
roadmap seals Q-2/2b/2c and Q-6/6b on it. **Q1-F6 and Q2-D1 (found independently by two
reviewers) and Q3-D1 (found by a third) each independently predict a RED check in `VG8j`.**
Both mechanisms are confirmed by source trace below.

These cannot both be true. Either the recorded ALL-GREEN did not cover `VG8j`, or it was
read from a stale run. **This is the single most important thing to settle, and it is
cheap to settle** — see B2/B3's decisive command. Until it is settled, the green battery
in I-96 cannot be treated as evidence for anything in this family.

---

## BLOCKING FINDINGS

### B1 — The 36-card deck is UNDRAWABLE past card 3. **Reproduced by execution.**

**Claim under test (I-88):** the full deck is instantiated "so the deck stacks true and the
discard is explorable"; "exactly THREE cards carry effects … the other 30 are fx-less INERT
EXHIBITS."

**The defect.** `packs/boty/src/index.ts:67` hard-codes the engine's card catalog:

```ts
wirePack(core, BOTY_PACK);      // ← BOTY_PACK, always
```

while the 3D bench hosts the **6-up variant** — `utilization/bench/src/game3d.ts:32`
`LockstepController.host(BOTY6_REF, BOTY_PACK6.seats, …, botyGenesis6, wire())`. `BOTY_PACK6`
is never passed to `wirePack` anywhere in the repo. So the deck is stocked from PACK6 while
the resolver validates against PACK.

**Executed evidence** (real engine, real doors, sandbox copy of the tracked tree):

```
BOTY_PACK.cards  count = 9
BOTY_PACK6.cards count = 42
deck ids present in PACK6 but ABSENT from the WIRED catalog: 33

SUCCESSFUL DRAWS: 3
HALT: draw #4 THREW EffectRefusal:
  Effect refused [GX-10] descriptor "vnt-project":
  drawn card "vnt-project" absent from the pack catalog — halt
```

Driven exactly as the bench drives it (`emit('draw', active, { deck: active })`, the form at
`table-draw.ts:115`). State is atomic — `kernel/core.ts` throws before `this.state = next` and
before `log.append` — so **nothing corrupts; the deck simply sticks at 33 forever.**

**Impact.** The increment's owner-facing purpose is half-delivered: the stack *height* is
true (36 meshes), but 33 of 36 cards can never reach the discard the owner asked to explore.
And I-88's "exactly THREE cards carry effects" is **false in the running system** — all three
(`rtm-commission`, `eqp-toolbox`, `iwn-settle`) are dead data the engine never sees.

**No repair performed.** Closure is a ruling, not a patch: either wire the 6-up variant
(`wireBoty` takes the pack; `game3d.ts` passes `BOTY_PACK6`) and re-run the battery, or
correct I-88(3) on the record to state that ZERO Q-1 cards bind and file the undrawable
deck as the open item. Not both silently.

*Aggravating, pre-existing, not Q-1's fault:* moe's card #3 is `crossroads`, whose
`open_window` is forced `gated: true`, and `turn:pass` is refused over an open gated window
while the 3D bench has no window UI (A8 is unbuilt). Practical depth today: **2 clean draws
→ soft-lock → hard refusal.**

### B2 — The committed HK-11 forced-mismatch drill is DEAD: it is driven by a click that Q-2b made incapable of drawing.

**Found independently by two reviewers.** Confirmed by source trace.

`utilization/bench/gate/VG8j.gate.mjs:303` drives the truth-wins drill with a plain click:

```js
await page.mouse.click(dxy2.x, dxy2.y);
```

while the *first* draw in the same file (`:91-94`) was correctly reworked by I-91(4) into a
real drag. Under the contract-v2 grab protocol a plain click cannot draw:

1. pointerdown on the deck claims the grab (`components/table.ts:138` → `table-draw.ts:71`).
2. Playwright's `mouse.click` is move → down → up with **no intervening move**, so
   `grabMove` never runs and `samples` holds two entries at the *same* coordinates.
3. `grabEnd` (`table-draw.ts:107-111`): `vel = hypot(0,0) / dt = 0`. `0 >= FLICK_T (0.35)` is
   false → the **weak branch**: `settleBack()`, **no submit** (`:133-137`).
4. `VG8j.gate.mjs:305` `waitForFunction(drawPhase === 'reading')` therefore burns its
   60 000 ms timeout → `f2 = false` → `:311` reports
   `'second flight never landed (timeout)'`.

**Impact.** The R-20 truth-wins drill — the one check proving theater cannot outrun engine
truth, carried from the VG7d precedent with a committed forced-divergence mechanism
(`setForceFlipMismatch`) — no longer executes. `forceMismatch` is dead code on the gate path.
I-91(4) updated the first draw drive and the double-click premise but left the drill on the
retired trigger.

**Closure:** replace `:303` with the same down → 4 fast moves → up drive used at `:91-94`.

### B3 — Q-6b's `discard-multi-card` performs a real draw INSIDE the window three earlier checks assert is state-invariant.

Confirmed by source trace.

`VG8j.gate.mjs:124-126` captures the baselines `d1 = info('deck')` and `hm1 = hashes()`.
The Q-6b block at `:226-231` then executes a **real flick-draw** (down + 4 fast moves + up)
— it must, because `:259` asserts `dM.count === 2`, which requires the second draw to have
landed. Then `:263-265`:

```js
const hmClose = await hashes();
const dClose  = await info('deck');
const consumed = hmClose.m === hm1.m && hmClose.h === hm1.h
              && dClose.count === d1.count && dClose.fidget === d1.fidget;
```

The second draw moves `moveCount`, changes `rowHash`, and drops the deck by one. **`consumed`
is necessarily false** → `VG8j/draw-theater-hk11` (`:266`) fails. The exclusion is airtight
and timing-independent: `discard-multi-card` requires the draw to have happened;
`draw-theater-hk11` requires it not to have. One of the two must fail.

The same contamination reaches `forced-mismatch-truth-wins` (`:310`, asserts
`c2.count === 2 && c2.topFace === 'new-van'`) and `state-change-recheck` (`:352`, same
premise) — both now start from a pile already at 2 with `new-van` consumed.

**Closure:** re-baseline `hm1`/`d1`/`c2`/`c3` after the Q-6b block, or move
`discard-multi-card` into its own gate module with its own seeded `gotoStage` — the pattern
`VG8p` already uses.

---

## MAJOR FINDINGS (must close or be carried with an explicit owner ruling)

**M1 — `slot-partition-law` pins a construction-true identity, never the render.**
`VG8j:155` asserts `pv.global.length + pv.session.length + pv.pile.length === pv.total`, where
`partitionView()` calls the same pure `partition()` that pushes each id to exactly one array.
**True for every possible input.** It counts zero rendered meshes. So I-92's headline
"gate-asserted" exactly-once law has no teeth in any state, driven or not. Compounded by
`components/table.ts:79,93` — `part.global.slice(0, 6)` and `part.session.slice(0, 6)` — cards
7..N render **zero times** while `partitionView()` still counts them. Latent today (4 globals,
5 sessions defined), broken by construction.

**M2 — `VG8j/v2-table-arrangement` is a def-data tautology; the whole T-1 arrangement can be
reverted and the battery stays green.** `tableRegionRects()` (`components/table.ts:198`) returns
`TOWN_TABLE_V2.regions.map(...)` — **the def reporting on itself**. The cited backstop does not
exist: `VG8a-i` is a *count* law only, and the real render≡def law (`domVsLaw`, `run.mjs:64`)
operates on `window.__GAME__`, the **SVG** bench. Reverting `table.ts:64` to
`layoutFace(TOWN_TABLE, …)` still yields 10 region-tagged objects (6 quads + 4 stacks) → both
checks pass while the owner's season block, GLOBAL CARDS band, standings, log and dice spot
silently revert to v1 geometry. The increment's sole owner-visible deliverable has no falsifier.

**M3 — Stuck-grab leak: a throwing `onGrabEnd` permanently freezes all input.**
`game3d.ts:158-159` has no `try/finally`:
```js
const consumed = grabber.onGrabEnd?.(ctx, ev) ?? false;
grabber = null;                       // ← never reached if onGrabEnd throws
```
`draw.grabEnd` calls `ctx.submit` (`table-draw.ts:115`), and `submitVerb` **rethrows** unknown
errors by design (`game3d.ts:76`). The claim stays held, `phase` sticks at `'grabbing'`, and
every later `pointerup` re-enters `grabEnd` → re-submits → throws again. Self-reinforcing
permanent lock: camera dead, all picks dead. **Given B1, the throwing path is not
hypothetical.**

**M4 — The draw theater has no rebuild safety; a rebuild mid-flight double-renders the card.**
`components/table.ts:54` resets the *discard* gesture on every build (the K7-P D2 pattern);
there is **no `resetDraw()`**. `#end-btn` is a DOM button outside the canvas, so it never fires
`consumeClick`: pressing it while `drawPhase === 'reading'` runs `endTurn()` → `buildScene()`,
rebuilding the destination card **visible** while the traveler still flies. Directly violates
I-92's "one card, never two, any destination."

**M5 — The fidget counter advances even when the tween is REFUSED, so the pile SNAPS on the
next rebuild** — reachable in the owner's own multi-card scenario. `components/table.ts:174`
increments `fidget['discard']` unconditionally; `discard-play.ts:130` refuses the tween when
`tween || held || pool.length`. Drag a card loose (I-95's whole point), click the pile:
counter advances, **nothing animates**, the status bar says "the cards move", and the next
rebuild renders the advanced state instantly. That is the "cheap image thing … they do not
teleport around" the owner explicitly ruled out.

**M6 — `discard-fidget-animates` asserts a counter and a boolean; it never asserts a card
moved.** Force every tween pair to `to = from` and the check still passes: `tween` is non-null
for ~13 frames, the flag is observed, `fidget === 1`, `count === 1`. The stated mutant
("instant-apply") dies; the interesting one survives. I-94's "observed over >1 frame" also
overstates the check — the code observes it **once** via `waitForFunction`.

**M7 — `assets-count-true` is vacuous.** `VG8p:31` asserts `ac.want === ac.got` where every seat
is `assets: []` at genesis and no verb in the slice grants assets. Delete the entire asset
render block (`seat-play.ts:65-77`) and it still passes `0 === 0`. It does not even pin the
genesis zero (contrast `crew-rows-true`, which pins `want === 1` and has real teeth).

**M8 — Neither new gesture can distinguish a GLIDE from a TELEPORT.** `seatplay-grab-reset`
(`VG8p:44-51`) and `discard-toss-return` (`VG8j:181`) both read only the *final* position and a
latched boolean. Replace the glide with an instant snap that sets the flag and both pass —
though "GLIDES BACK" is I-93's word and no-teleport is the owner's law.

**M9 — Session cards are attributed to the ACTIVE seat but sourced from the VIEWER's discard.**
`components/table.ts:76` partitions `v.ownDiscard` (the viewer's) while `:87` positions at
`seat-${v.turn.seatIdx}` (the active seat). After moe ends her turn, moe's `svc-*` cards render
in front of pete's board — a false display, unregistered.

**M10 — The two "slow drag" gestures are ARITHMETICALLY above the flick threshold.** Velocity
is total displacement over total duration (`discard-play.ts:99-112`). `discard-toss-return`:
`hypot(130,60)=143.2` over ~350 ms → **v ≈ 0.41 > 0.35**. `discard-multi-card`:
`hypot(150,70)=165.5` over ~350 ms → needs `dt > 473 ms`. Both depend on unmodelled main-thread
latency to stay below the threshold — a clock dependency (I-60f) inside checks that claim to
wait on state. If the arithmetic holds they FLICK instead of going loose and B3's premise
never occurs; if latency saves them, the margin is 15–28% and they are flaky.

**M11 — Resource disposal: `dispose()` appears exactly TWICE in the entire bench source, and
both calls free only a material** (`table-draw.ts:158,176`). `game3d.ts:102` discards the whole
scene graph on every state change with zero disposal; `seat-play.ts:41` drops fresh
`PlaneGeometry` + `MeshBasicMaterial` + per-call CanvasTexture per crew card;
`resetDiscardPlay` disposes nothing; M5's refused-tween path drops a whole stack, repeatably.
**K7-P D10 (`stampSheet`) is still open and the leak surface GREW** — Q-3/Q-6 were the "next
touch" that was supposed to close it.

**M12 — Record accuracy.** (a) I-89 claims "V-9 renders through [TOWN_TABLE]" — false;
`vectors/scenarios.ts:436-479` builds V-9 from `V1_REF`/`minimalGenesis` and never references
`TOWN_TABLE` or the BOTY pack. The hazard analysis reached the right answer by a false premise.
(b) I-93 says the projector "maps state.crew" — it **casts** (`projector.ts:85`), and
`structuredClone` ships an undeclared `assignedTo` field the declared type omits. (c) I-93
implies `assets` is viewer-gated at the law surface — it is not (`projector.ts:77` projects
every seat's assets); the gating is a bench choice. (d) I-94 says the flick onion is "titled
`drawn · discard #k of N`" — that string goes to the **status bar**; the onion is titled with
the raw card id. (e) I-90(2)'s "no false display" is reversed by I-92 but never marked
superseded on the append-only record. (f) I-90/91/92 carry **no verification line at all**,
while their neighbours I-83/I-87/I-89 all do.

---

## WHAT PASSED — stated plainly, because it is the strongest work in the program

- **The REVEAL-ORDER LAW is sound, and stronger than the record claims.** `TILT_MAX = π·0.45`
  (81.0°); the face-swap fires at `pT ≥ 0.5` → `π·0.5` = 90.0°. **Swap ≥ clamp, proven.** And
  the face texture *does not exist on the mesh* during the grab — `grabStart` builds with
  `cardBack()` (`:79`), and `fortuneFaceTexture` is assigned only at `:177`, inside
  `'flipping'`, entered only after `ctx.submit` returned true. A player cannot peek at an
  undrawn card even by freezing the frame. **No truth violation.**
- **HK-11 discipline holds.** The gesture decides *whether* to submit, never *what* is drawn:
  `table-draw.ts:117` seeds from the projection *after* the submit. Velocity reaches only the
  verdict and the animation start. Physics/gesture cannot decide state.
- **Derived-never-stored holds,** and the routing fallback is **total** — `CARD_FAMILY[id] ??
  'discard'`, with `partition` sending any non-global/non-session value to the pile. The
  "a card could vanish" hypothesis is **falsified**.
- **I-95's pool bookkeeping is sound on every traced path:** no double-entry, no stale
  `discardLoose` marker, and `resetDiscardPlay` purges held **and** the whole pool from
  `table.build`, so **no scene-orphan accumulation**. The "pile shrinks mid-return" hazard
  resolves benignly.
- **Registry-order disjointness (I-93 clause 5) — VERIFIED TRUE** by independent tag-domain
  analysis. The reorder is genuinely behavior-neutral.
- **Ledger left-edge derivation is real and its oracle has teeth** — the fallback magic point
  lands right of `min.x` and fails the check. I-84(5a) discharged.
- **Frozen zones are CLEAN.** `packages/engine/`, `TOWN_TABLE`/`TOWN_OVERLAY`, `game.ts`,
  `spike3d.ts`, `visual-pins.json`, `vectors/V-9.json` — untouched. `TOWN_TABLE_V2` is a
  genuinely separate sibling child. The certified `BOTY_PACK`/`botyGenesis` literals are
  unmodified; PACK6 spreads into fresh objects.
- **Lane conformance is genuinely disciplined.** Every touched file is named in a register
  row; the one law-surface excursion (`projector.ts`) has its row. No unnamed excursion found.
- **Size + tiers + tsc + vitest all green:** 27 bench files ≤300 lines, HK-6 OK, tsc clean,
  **279/279** — reproduced in the sandbox, matching the recorded baseline.
- **No gate check asserts pixels (I-57c): PASS** across VG8p and every VG8j addition.

---

## K7-P PROBE VERDICTS (carried per I-96)

| Probe | Verdict |
|---|---|
| **D1** (ledger re-open during the sheets' return glide) | **CLOSED** — confirmed by reading; stage 2 fires only on `pendingAt && isOpen && coverAmt ≥ 0.999 && sheetsHome()`. Not reconstructed live. |
| **D2** (rebuild while a module-managed group is live) | **CLOSED for the ledger; ADEQUATE for Q-3/Q-6, with one gap** — neither new module clears its latching gate surface (`lastReset`, `flickRead`), and `resetDiscardPlay` can leave an onion reading a destroyed mesh. |
| **D10** (`stampSheet` texture disposal) | **OPEN, and WIDER than reported** — see M11. |

---

## SCORES (1–10; any dimension < 7 blocks new work on that module)

| Dimension | Score | Driver |
|---|---:|---|
| Object-model fidelity | **5** | The v2 layout child is exact and the reveal law is exemplary. Undone by B1 (33/36 cards unreachable), M5 (snap on a normal path), M9 (wrong-seat attribution). |
| **Falsifiability** | **3** | **Worst.** Two committed drills cannot pass (B2, B3); the headline partition law is construction-true (M1); the arrangement check is a tautology (M2); M6/M7/M8 are hollow or vacuous. |
| Lane conformance | **8** | Genuinely clean — frozen zones verified, every excursion named, sizes/tiers green. |
| Record accuracy | **4** | Six checkable false or overstated claims (M12), plus B1's "three cards carry effects" which is false in the running system. |

**Worst dimension: falsifiability (3).**

## OVERALL VERDICT: **RETURN**

Blocking: **B1, B2, B3.** Must close or carry with an explicit owner ruling: **M1–M12.**

The roadmap marks Q-2/2b/2c and Q-6/6b **SEALED** on the owner's playtest word ahead of any
K7 pass, and on a gate file that — per B2 and B3 — cannot exit 0 as written. **That seal
should be narrowed to "owner-confirmed BEHAVIOR; gate RETURNED"** until the battery is
re-run and read. The owner's playtest verdicts remain valid for what they tested: how the
thing *feels*. They were never evidence that the checks have teeth.

---

## COULD NOT VERIFY — the owner's decisive runs

Chromium is unavailable in the sandbox (CDN blocked), so **no browser gate was executed by
this review.** B2 and B3 are source-derived; B1 was executed against the real engine.

```powershell
$env:PLAYWRIGHT_CHROMIUM_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
Set-Location "C:\Users\17783\CPA CMA Services\Projects\tabletop_platform"

# ── THE DECISIVE ONE. Settles B2 + B3 and the I-96 ALL-GREEN contradiction in ~2 min. ──
node utilization\bench\gate\run.mjs --check=VG8j
$LASTEXITCODE
# PREDICTION: non-zero. Expect RED on draw-theater-hk11 (close-consumed:false),
# forced-mismatch-truth-wins ('second flight never landed (timeout)', after a 60s stall),
# and state-change-recheck. If it exits 0, B2/B3 are WRONG and I want to know that.

# ── B1 by hand: flick-draw FOUR times as moe on game3d.html ──
# PREDICTION (already reproduced headless): draw 3 opens a gated 'crossroads' window with
# no UI; draw 4 prints
#   refused: Effect refused [GX-10] descriptor "vnt-project": ... absent from the pack catalog
# and the deck count STOPS at 33.

# ── M2: the mutation that must fail and (predicted) will not — in a THROWAWAY copy ──
#   components\table.ts:64  layoutFace(TOWN_TABLE_V2, ...) -> layoutFace(TOWN_TABLE, ...)
node utilization\bench\gate\run.mjs --suite=3d
# PREDICTION: v2-table-arrangement and 3d-stage-regions-vs-law both PASS while the table
# visibly reverts to v1.

# ── M7 / M6 / M8: three more predicted-vacuous checks, throwaway copy each ──
#   delete seat-play.ts:65-77            -> predict assets-count-true STILL PASSES
#   force tween to = from                -> predict discard-fidget-animates STILL PASSES
#   replace the reset glide with a snap  -> predict seatplay-grab-reset STILL PASSES

# ── M10: are the "slow" drags actually below the flick threshold? ──
#   temp probe in a throwaway copy: discard-play.ts:112 console.log('vel', vel)
#   PASS condition: vel < 0.35 with >30% margin on BOTH slow drags.

# ── M11: quantify the leak ──
#   DevTools: renderer.info.memory.{geometries,textures} across 20 end-turns.
#   PREDICTION: monotonically increasing.
```

---

## Is the grab protocol sound enough to carry R-1 physics?

**Not yet — and the gap is in the SPINE, not the leaves.** This is the decision R-1 depends on,
so it is answered directly.

**What is right, and should be kept unchanged.** The *shape* is correct: `onGrabStart`
returning a boolean claim, first-claimer-wins over a nearest→far raycast, move/end routed to
the claimant, `onGrabEnd` returning a consumed flag. It is cheap (≈15 spine lines), and
`table.ts` and `seat-play.ts` already ride it independently without touching each other. The
truth discipline is also right, and it is the hard part: the gesture decides *whether* to
submit, never *what*. A physics program built on this seam **cannot** let a flick choose a die
face. That foundation is sound.

**Four bounded closures before R-1 — not R-1 scope, R-1 *preconditions*:**

1. **Release the claim in a `finally` (M3).** A physics drag is long-lived and throws more
   (solver steps, contact callbacks). Today one throw freezes the bench permanently.
2. **Per-pointer claims.** One global `grabber`, no `pointerId`, no `setPointerCapture`, no
   `pointercancel` listener. Touch — which the owner explicitly wants (phone/tablet) — cancels
   constantly, and two fingers alias onto one claim. **Note the pattern: I-95 already had to fix
   exactly this defect class one layer down (the single-gesture lock in `discard-play`) while
   the spine still carries it.** Fix it once, in the spine, before R-1 rather than after.
3. **Actually suppress the camera.** I-91 says "the camera pan/orbit is suppressed until
   release." The wheel/zoom-ladder listener (`camera.ts:154`, bound to `#stage`) never consults
   `grabber` and can enter READ mode mid-drag, after which the release still submits. Gate the
   wheel on the claim — and the record's sentence becomes true.
4. **Make rebuild safety a protocol obligation (M4).** `discard-play` has it, `table-draw` does
   not, `seat-play` reparents into the scene. Physics bodies will live across rebuilds. Add
   `onGrabAbort(ctx)` to the contract so a component cannot forget.

**Recommendation:** RETURN this family on B1/B2/B3, and treat the four spine closures above as
R-1's entry gate. Ship R-1 on the protocol as it stands and the physics program inherits a
permanent-freeze bug and a multi-touch aliasing bug in its foundation.
