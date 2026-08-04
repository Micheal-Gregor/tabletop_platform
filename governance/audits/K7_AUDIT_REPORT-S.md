# K7-S — THE DISTINCT CONFORMANCE REVIEW OF THE K7-Q CLOSURE PROGRAM

**Scope:** I-101 (G-1, ba12531) · I-102 (G-1b, eedbd08) · I-103 (S-1, f18fc67) · I-104
(S-1b, 747f062) · I-105 (the owner battery record: 78/78 ALL GREEN).
**Reviewer:** a fresh session, no builder context, adversarial by charter.
**Refusal-not-repair held: zero files edited in the real repo.** All mutation work ran in
a disposable scratch copy and was reverted (verified byte-identical after).

## 1 · Runnable tier — actual numbers at 747f062

tiers OK · size 28 ≤ 300 OK · gate-surface 84 keys OK · tsc exit 0 · **vitest 279/279** ·
esbuild clean.

## 2 · Closure verification — the adversarial question first

**Did any G-1 gate edit LOWER the bar? No.** Every touched check's predicate was diffed
against `ba12531~1`: each is identical or strictly stronger (`draw-theater-hk11` and
`discard-multi-card` byte-identical; `forced-mismatch-truth-wins` identical PLUS a new
idle wait; `slot-partition-law` += renderOk · `discard-toss-return` += glided ·
`discard-fidget-animates` += trulyMoved · `seatplay-grab-reset` += glided ·
`assets-count-true` strengthened to a pinned zero). The single loosening in the program
is `posEq` 1e-9 → 1e-6 — disclosed on I-101(4), still ~6 orders below real pose deltas.

| K7-Q item | Verdict |
|---|---|
| B2 (dead drill) | **CLOSED, nothing dropped** — the real drag, repositioned; assertion set identical |
| B3 (contaminated window) | **CLOSED** — captured right after the route; still catches a close that draws |
| M1 (construction-true partition) | **PARTIALLY closed** (MINOR-4: global/session legs are 0≡0 at the exercised state) |
| M2 (def tautology) | **CLOSED** — the oracle walks the render; the revert-mutant arithmetic executed (v1 x=8 vs ≤4) |
| M3 (freeze-on-throw) | **CLOSED for onGrabEnd; OPEN for onGrabMove** (MAJOR-1) |
| M4 (rebuild safety, both halves) | **CLOSED** — the 'grabbing' skip PROVEN exact by order-of-operations trace in grabEnd |
| M5 (counter on refusal) | **CLOSED IN CODE, ZERO TEST** (MAJOR-2) |
| M6/M8 (hollow motion checks) | **CLOSED** — identity-tween and snap-home kills verified from source |
| M7 (vacuous assets) | **CLOSED, honestly labelled** DEFERRED-at-zero |
| M10 (drags above threshold) | **CLOSED arithmetically** — 143.2 px/≥810 ms = 0.177 · 165.5/≥810 = 0.204, re-derived through the sample array |
| D9 (wheel) | **CLOSED** — gated, not dead code, not over-broad; read-mode never suppressed on a normal path |
| G-1b (count law) | **CLOSED, every number exact** — 10 + 6×12 + 2×6 = 94, executed against the real defs |
| S-1b (dropped keys) | **CLOSED, kill RUN** — exactly five restored; key parity reproduced independently (only `orphanGrabMeshes` new) |

## 3 · The spine, line by line

No claim leak through: an unclaimed pointerup · a second pointerdown on a claimed id ·
a throw path leaving `releasing` set. `setPointerCapture` cannot break read-mode pan or
Phase 0/2 (the pointer path never reads `ev.target`). VG8q's five checks all carry real
kills (the single-grabber mutant → both===1; dropping the buildScene loop → after===1;
dropping only the abort → a 60 s timeout + `orphan 1@grabbing`; the ungated wheel →
`zoomState().dist` moves; dropping the finally → claimsAfter===1).

## 4 · Mutations run

(b) delete `onionState` from table.ts → **gate-surface exits 1 naming it; tsc stays 0** —
the I-104 guard is genuinely load-bearing and types genuinely cannot catch the class.
(a) delete the buildScene abort → nothing runnable fails (browser-only kill, verified
from source). (c) `startFidgetTween` returns true unconditionally → **nothing catches
it anywhere** (MAJOR-2). (d) revert expectedFromDefs → browser-only, arithmetic verified.
(e1) guard false-pass probe → **13 fabricated keys accepted** (MAJOR-3). (e2) audit of
all 84 live keys → **zero weakly provided** — nothing is masked today.

## 5 · Findings

**BLOCKING — none.**

**MAJOR-1 · M3 closed for `onGrabEnd` only: a throwing `onGrabMove` strands the
component permanently.** `game3d.ts:173` releases the claim but never calls
`onGrabAbort`; the deck's phase sticks at 'grabbing', `grabStart` refuses forever, and
`resetDraw` deliberately skips 'grabbing' — not even a rebuild recovers it. The window
is strictly narrower than pre-S-1 (hence not blocking), the contract text documents the
scope, but the ledger's "one throw can never freeze input" is unqualified and no check
covers the path. **R-1's physics will add move-time computation — exactly where a throw
will originate. Carry: close the path + VG8q check #6.**

**MAJOR-2 · M5's code fix has ZERO falsifying coverage in the 78-check battery.** The
refusal branch fires only when `tween || held || pool.length`, and G-1 deliberately
normalizes/drains those states before every fidget block. The unconditional-true mutant
passes everything, browser included. Violates "do not ship a guard without its failing
test." **Carry: a check that drives a REFUSED fidget click.**

**MAJOR-3 · `check-gate-surface`'s grammar is text-level, demonstrably false-passable**
(13 fabricated keys accepted — `phase`, `card`, `family`, … — via type members, userData
literals, comments). Load-bearing today (kill (b) ran; all 84 live keys strongly
provided), but `phase`/`card` are precisely R-1's names. The false-pass class is now on
the record; consider requiring providers inside gate() objects.

**MINOR-4** M1's global/session teeth are 0≡0 until a seedable non-zero state exists.
**MINOR-5** `releasing` reset to null, not save/restored — nested synthetic releases
could mis-scope a rebuild abort (`const prev` form recommended).
**MINOR-6** `onGrabAbort` optional in the interface — the "obligation" is documentation;
a pairing check would enforce it (both grab-bearing components pair correctly today).
**MINOR-7** `resetDraw` can close an onion a discard flick-read re-opened (errs safe).
**MINOR-8** a cancelled pointer's later pointerup can still reach Phase 0/2 (synthetic
only).
**MINOR-9 · RECORD** I-101's "<42% of FLICK_T" is false — actual 50.6% / 58.3% of T
(the margin is ~49%; the row inverted the sense).
**MINOR-10 · RECORD** I-103's "table.ts 247" — actual 246 at f18fc67; 258 at HEAD.
**MINOR-11 · RECORD/LANE** I-103's lane column omits ARCHITECTURE.md (named in the
body; a records area).

**Notes:** the single `dragFrom`/`dragMoved` is a REGISTERED interpretation scoped to
R-1 (correctly carried) · a claim surviving into read mode fails safe · the
refused-fidget stack leak is pre-existing K7-P D10/M11 debt · `game3d.ts` sits at
296/300 — 4 lines of headroom, and R-1 builds on it.

## 6 · Lane + record accuracy

Every commit's files named in its row (one omission — MINOR-11). G-1's "ZERO behavior
change" claim VERIFIED by diff (the only non-oracle line is `tableRoot = t;`). Nine
independent numeric claims verified TRUE (84 keys · 28 files · five keys · the parity ·
82→94 · both drag velocities · the M2 arithmetic · 73+5=78). Three verified FALSE
(MINOR-9/10 + MAJOR-1's unqualified headline). The roadmap's "R-1's entry gate MET
pending K7-S" was correctly conditional — good register discipline.

## 7 · Scores

Fidelity **8** · Falsifiability **7** (up from K7-Q's 3) · Lane conformance **9** ·
Record accuracy **8**. **No dimension below 7 — nothing blocks.**

## 8 · VERDICT: PASS

- **The k7-pass tags RIDE:** `k7-pass-g1` (ba12531 + eedbd08) · `k7-pass-s1`
  (f18fc67 + 747f062).
- **R-1's entry gate is MET**, with two named carries into R-1's first row: MAJOR-1
  (the onGrabMove throw path + VG8q #6) and MAJOR-2 (the refused-fidget check).
- Non-blocking next-touches: MAJOR-3's grammar note · MINOR-4's seedable state ·
  MINOR-5's save/restore · MINOR-6's pairing check · MINOR-9/10/11's record amendments
  (superseded on the record at I-106, never rewritten).

## 9 · Could not verify

No Chromium in the sandbox (I-83). All 78 browser checks are source-derived kill
analysis, not execution. The owner's 78/78 proves the checks evaluate true against the
live target; it is SILENT on kill strength — that axis rests on this review's source
analysis, and it does not refute MAJOR-2 (mutation (c) would leave the battery green).
Outside scope and still open: M9 (wrong-seat session attribution) · M11/K7-P D10
(disposal; one more undisposed path found at `discard-play.ts:151`, pre-existing). The
owner's feel-playtest of the cancel-glide and the refusal status rides the next session.
