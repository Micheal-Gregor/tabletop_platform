# K7-R — THE DISTINCT REVIEW OF THE R-1a PHYSICS FAMILY (I-109…I-113)

**Scope:** R-1a (1add656) · R-1a2 (ac905c5) · R-1a3 (88c2588) · R-1a4 (8506745) ·
R-1a5 (0db0c62). **Reviewer:** fresh session, no builder context; the real repo strictly
read-only (the owner's battery was running against it); all mutation work in a disposable
scratch, restored byte-identical after. RAPIER executed headless in node — the physics
claims were verified BY EXECUTION, not by reading.

## Runnable tier at HEAD
tsc 0 · size 30 ≤300 (table-draw 299, die 298) · tiers OK · gate-surface 91 keys ·
vitest 279/279 · esbuild clean.

## What is PROVEN SOUND (executed)

**THE RECONCILE LAW — the family's soul — holds, structurally.** 80 executed rolls
(40 honest + 40 forced-mismatch drill) with ZERO displayed≠target cases, plus 28 on an
alternate rect including an edge-tilted rest. The proof is algebraic: `offset·n_T = n_F`
⇒ mesh `M = Q_sim·offset` ⇒ `M·n_T = Q_sim·n_F` = the argmax ⇒ `dieUpFace()` returns the
displayed target no matter how the die lands. Every offset is a genuine cube symmetry.
The drill path traced and executed: the offset maps the LIE up; truth wins at the verdict;
the committed path unchanged. **Reconciled by construction, never corrected.**

**The seed streams are byte-identical to K-E/P-1** (verified against
`git show bfa5612:…die.ts` — same draw count, same positions). **The I-109 tuning
numbers reproduce EXACTLY** from the shipped constants: spreadX 600 · spreadZ 472 ·
reconcile 5/6 · settle ≤34 · all contained · all flat. **The cap is airtight**: raw
3.2/8/15/30/60/200 m/s all collapse to eff 3.20, contained, including rail-pinned and
corner starts; CCD is genuinely load-bearing.

## FINDINGS (blocking: none; the law holds — the checking layer does not)

**MAJOR-1 · The deck tap no longer nudges the TOP card — I-112 silently regressed the
owner-ruled I-110/111 law.** `settleBack()` runs before `nudgeStack`; the real top box is
still scene-parented at that moment, so `slice(-5)` takes idx 30–34 — the tapped card
never moves, and on tap 3 the neat column is one card short by up to ~2.05u. The gate
samples the same window and passes on a 0.45u accident of the `amp = 0.18` constant.
No register row, no supersession.

**MAJOR-2 · The flip-direction leg is a proven tautology (mutant EXECUTED, survived).**
`flipDir` initializes to 1 in grabStart; delete the assignment and unsign the rotations —
`drawFlipDir()` still returns 1 and `fd === 1` passes. And the LEFT flick — half the
owner's ruling — has zero coverage anywhere.

**MAJOR-3 · The `faceUpAtEnd` leg recorded by I-113 DOES NOT EXIST** (one grep hit: the
ledger row itself; the actual gate diff is five lines). The end-pose fix's math is
CORRECT (verified: ±π about the flip axis both map the underside face to world-up), but
restoring the I-112 bug gives zero signal. Recorded-but-unwritten coverage is a
first-class record defect in this program.

**MAJOR-4 · A real human/touch click on the die may NOT roll it.** The tap fall-through
computes `hypot` between the POINTER's plane point and the DIE'S CENTRE — two different
reference frames, not travel. Any click >~6u off the centre axis (the die is 45u wide;
parallax adds more) that emits one pointermove is treated as a drag → a weak flick, no
seeded roll. Touch essentially always emits that move (touch is a recorded owner
requirement). Also: no grab offset — the die teleports under the cursor on the first
drag move. **Playwright clicks emit no intervening pointermove, so
`die-grab-click-falls-through` is structurally blind — a green battery is COMPATIBLE
with this bug.**

**MAJOR-5 · The hard-flick kill is timing-dependent.** An executed 4→300 m/s sweep of
the uncapped mutant shows CONTAINED bands (30/40/52/60/68/80/84 m/s) plausibly overlapping
the drive's achieved speed; nothing asserts the achieved speed, `homeOk` is always true
(the guard sends everything home), and `flightTrace` is never cleared — check 3b can read
check 3's stale gentle trace.

**MAJOR-6 · A pre-ready click burns an LCG position and reports the I-107 lie.**
`rollDie` advances the count and consumes both draws BEFORE the readiness refusal; the
caller's status says 'rolling the die' unconditionally while nothing rolls — the exact
class S-1c closed, reopened. VG8r's readiness wait tests a gate-surface key that exists
from construction, not physics readiness (`dicePhysicsReady` is not on the surface).

**MINORS:** the escape's 3-frame off-board hold + Y-snap into the glide (a "no teleport"
blemish) · every toss opens with an orientation snap (the sim never seeds from the mesh
pose) · live-sim pace is 2× the replay's registered ½ · the responsiveness clamp band is
pinned at the floor for all vel <1.0 px/ms and untested at either end · `nudgeCount` is
module-global under a "generic" contract · a rebuild during 'grabbing' double-renders
transiently (self-heals) · `scene.attach` shear under the non-uniform table scale
(pre-existing class) · the routed traveler leaks geometry/materials (the M11 carry; the
swapped face IS disposed everywhere; the shared sideMat is NEVER disposed — verified
safe) · orphan-tag hygiene COMPLETE (all exits traced, no defect).

**RECORD DEFECTS RA-1…6:** the unwritten faceUpAtEnd leg · I-110's nudge constants
contradict the shipped code (±0.05 rad/±4u world, not ±0.04/±1.5) · I-109's 40-roll
histogram is a stale pre-tuning figure (the 600/472 figures ARE current) · "refuses with
a status" vs the actual lying status · I-110's lane column "die.ts (none?)" while the
commit touched die.ts · "exactly 300" vs the gate's 299.

**LANE:** 15 files across the family, all in the bench lane; engine/presentation/packs/
game.ts/spike3d.ts untouched. Omissions: I-110's lane column (components/die.ts,
package-lock) · I-112's (table-oracles.ts, a new export) · ARCHITECTURE.md never gained
the RAPIER dependency note (the D17 lesson, missed).

**SIZE-GATE ASSESSMENT: an extraction is OWED.** The repeated header trims traded law
rationale for line budget (the reveal-order rationale, "through the same doors", an
owner-verbatim quote). table-draw.ts at 299 and die.ts at 298 cannot take R-1b's first
line. The natural seams: the gesture cluster · the theater tick · the routing helpers;
die.ts's grab-flick block as `die-grab.ts`.

## SCORES
Fidelity **6** · Falsifiability **4** · Lane **8** · Record accuracy **6**.
**Two dimensions below 7 — both block.**

## VERDICT: RETURN — `k7-pass-r1a` does not ride

The closure order (cheapest first, and the two cheapest are owner-facing):
1. M1 — the real top card must nudge (reattach-before-nudge or nudge the attached box);
   re-arm the check to assert the TRUE top moved.
2. M4 — pointer-frame travel + preserved grab offset; a VG8r leg driving a click WITH an
   intervening pointermove (the VG8q synthetic-pointer pattern).
3. M2/M3 — the LEFT-drag leg (fd === −1) and the faceUpAtEnd quaternion leg I-113
   already recorded.
4. M5 — assert the achieved flick speed (or liveSeen) in the hard-flick check; clear the
   trace per session.
5. M6 — draws behind the readiness check; the honest status; `dicePhysicsReady` on the
   surface; a real readiness wait.
6. RA-1…6 — supersede on the record.
7. The owed extraction before R-1b touches either file.

**Carries into R-1b:** K7-S's undischarged MAJOR-3 (gate-surface grammar — `phase` and
`card` are now live oracle names, exactly as warned) · MINOR-4/6 · M9 · M11/D10 (+1
traveler per draw) · the three feel minors, to be SHOWN at playtest, not discovered.

## COULD NOT VERIFY
No Chromium — every browser-gate claim is source analysis + node-executed physics,
labelled as such. Unmeasured: the camera's world-per-pixel (M4's trip distance) and the
hard-flick drive's achieved m/s. **What the owner's 88/88 proves:** the reconcile law
live · the identity law · the recenter · cap+guard bring the die home · no regressions
in what the checks test. **What it does NOT prove:** direction response (M2's mutant
passes) · the face-up end pose (M3's mutant passes) · that a human/touch click rolls
(M4 is invisible to synthetic pointers) · that the TOP card nudges (M1 is outside the
sampling window) · that removing the cap would be caught (M5 is a timing coin flip).
**A green 88/88 is fully compatible with all five behavioral MAJORs standing.** The
owner's feel pass is the live instrument: tap the deck and watch the TOP card; click the
die off-centre, and on a touchscreen.
