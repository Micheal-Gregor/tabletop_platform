# K7 EXTERNAL AUDIT — F5 Mechanics Library (report 4B)

**Auditor:** independent K7 session, no builder context. **Date:** 2026-07-30.
**Attestation:** `git fetch --tags && git pull` → HEAD `b2fc773`; tags `k7-pass-f5` and
`resolution-run-4` present locally. PASSED — audited tree matches the pinned handoff.
**Scope:** F5 increment `4985beb..2eb46a9`, end to end — `packages/engine/src/library/`
(ledger, ventures, outfit, timedfx, closing, wire), the kernel supersession door
(`core.supersedeIntent` + `Guard.supersede`), tests f5-fixture/f5-library/f5-minimal-game/
f5-k7-closures, the V-1 vector (`vectors/scenarios.ts computeV1` + `vectors/V-1.json`), and
the F5 records (DF5-1..12, I-33..40, GX-25..30, GBC-33..40, completion-ledger F5).
**Process:** all mutation and probe work done in a throwaway `git clone` under scratch; the
audited tree was never modified. Pristine baseline re-proved at close (204/204, tree clean).

**Baseline:** `npm install` OK · `npx vitest run` **204/204** · `node tools/check-tiers.mjs`
→ `HK-6 tier boundary: OK` · `npx tsc -p packages/engine/tsconfig.json --noEmit` → exit 0.

---

## VERDICT: RETURN (narrow)

One finding of the project's signature class — **the seventh "closure narrower than its
claim."** The `venture:spawn` door's **deadline / portion.work / portion.party** validation
legs are unfalsifiable at BOTH `checkSpecShape` (wire.ts) and the module (ventures.ts):
deleting either copy leaves the full suite green. DF5-2 claims "HK-4-style validation at
every F5 door refusing typed+unlogged"; the D6 suite proves that claim for *payoff* bricks
only. The shipped guards are present and correct (I verified the bricks ARE refused and the
state stays hashable), so this is a **CC-6 falsifiability / base-case-coverage gap, not a
live invariant hole** — but by the project's own load-bearing doctrine (RD-8; roster §5 "do
not accept presence-of-calls + green tests as hook wiring"), an unfalsifiable guard is
unproven. Internal K7 RETURNed on directly-analogous survivors (DF5-4, DF5-6); consistency
requires the same here. Base-case-support drops below 7 on **M10/M11** and **library/wire**
→ teeth → RETURN. Closure is trivial (three falsifying tests). Everything else PASSES.

---

## Per-CC verdicts

| CC | Verdict | Evidence |
|---|---|---|
| CC-1 Code-trace | **PASS** | Every F5 src file is in `object-model-and-parameters.md`: M13 ledger.ts (l.62), M10/M11 ventures.ts (l.63), M12a/b outfit.ts (l.64), M14 timedfx.ts (l.65), M15 closing.ts (l.66), library/wire.ts (l.67). Kernel supersession door row present (l.15, NEW-4). No orphan src. |
| CC-2 Carried-rule | **PASS** | GX-25..30 honored in running code (ledger balanced-or-throw, venture lifecycle, one-crew-one-portion, TFX tick-once, reckon gate). GBC-40 minimal game replays byte-identical; arithmetic ties to stage-2b (A 0, B +3). |
| CC-3 Fidelity | **PASS (w/ minor register gap)** | Behaviors trace to registered I-33..40. Minor: ventures module-side redundant guards (payoff-amount/payoff-to/portions-len) are masked-by-a-tested-door survivors NOT registered in I-40 (which enumerates only the timedfx masking, I-40b). See FA-2. |
| CC-4 Refusal-execution | **PASS** | Bricks are genuinely refused typed+unlogged on the shipped tree: NaN/0 deadline, work 0/NaN, NaN/Infinity tfx charge, GHOST payoff seat, malformed debts, NaN/neg overhead — all `refused`, state hash stable, still hashable (probed directly). |
| CC-5 Vector-discharge | **PASS** | computeV1 re-derives from the SAME fixture GBC-40 uses (`wireMinimal`/`minimalGenesis`) — no re-implementation drift (SP-5). Independent rebuild of the pinned V-1.json row → `b773bf95ff085494` (matches pinned finalHash), champion B, ranking B:3/A:0, 22 moves. `DISCHARGE=1` is the only write path; the test asserts the law before the pin. |
| CC-6 Hook-wiring | **FAIL (narrow)** | 44 mutations killed on-path; supersession + weave + doors + unloaded-fallback all proven falsifiable and divergence-injection catches every illegal tamper. BUT the venture:spawn deadline/work/party validation legs survive at both doors (FA-1). |
| CC-7 Drift-score | **RETURN** | M10/M11 and library/wire score 6 on base-case support (FA-1). All other modules ≥ 7. Table below. |

---

## Mutation-test log (throwaway copy; each mutation reverted before the next)

**KILLED — guard proven falsifiable (44):**
- Ledger: sum-check, loaded-check, non-finite-leg, bank-collision.
- Ventures module: dup-id, route-non-open, lapse-deadline-filter, lapse-crew-release.
- Ventures door (checkSpecShape): payoff-amount, payoff-to, portions-len.
- Outfit: busy-check, outfit-match, unassigned-work, work-non-open.
- TimedFx: dup-id, tick-charge-gt0, tick-expire-filter, tick-decrement.
- Weave (turn:end): open-window rule leg, HK-5 call, on-round-wrap dispatch, TFX-tick call,
  lapse call, per-round reset, wrap-condition.
- Upkeep: overhead-args, unloaded-wages leg (I-39), unloaded-debt leg (I-39), debt-remove.
- Reckon: status gate, trailing-first sort.
- unknownKeys doors (NEW-1/D9): spec, portion, payoff, debt, tfx — all five.
- Supersession: wire turn:pass rule leg (kills D1), core named-ground check (kills D1b).

**SURVIVORS — REGISTERED (not findings):**
- `core.supersedeIntent` existing-registration check & `Guard.supersede` existing-reg check
  — the redundant pair registered in **I-40(a)** (each masks the other; deleting one stays
  green). Confirmed.
- `turn:pass` applier `throw` — registered defense-in-depth (I-37 comment; the rule leg
  refuses first). Low: no divergence-injection test reaches it (unlike HK-5's D2). Noted.

**SURVIVORS — UNREGISTERED, no killing test at any door (the finding, FA-1):**
- `spec.deadline` positive-integer check — **module AND door both survive.**
- `portion.work` positive-integer check — **module AND door both survive.**
- `portion.party` known-seat check — **module AND door both survive.**
- (No test in the suite submits a non-positive deadline, bad work, or unknown portion.party;
  the only GHOST test targets `payoff.to`.)

**SURVIVORS — UNREGISTERED, but behavior covered by a tested door (minor, FA-2):**
- Ventures module-side payoff-amount / payoff-to / portions-len — masked by the door legs,
  which ARE killed by D6d/D6e/GBC-34c. Belt-and-suspenders; same class as I-40(b) but for
  ventures, not registered.

**SURVIVORS — minor untested guards (FA-3/FA-4):**
- Outfit portion-exists (out-of-range index) and portion-already-done — shipped code refuses
  cleanly; deletion degrades to a raw TypeError (portion-exists) or a silent re-assign
  (portion-done). No test.
- Weave per-turn slot reset — GBC-39 exercises per-round reset only.

---

## Adversarial probes (charter mandatory checks)

- **Supersession door reachability (check 2):** `passSeat` is called only by the `turn:end`
  weave (wire.ts:207) and the F2 `turn:pass` applier (packloader.ts:284), which
  `wireLibrary` supersedes to a typed refusal (rule leg killed by D1). `core.supersedeIntent`
  is called only by `wireLibrary`. Contributions dispatch through EFX (no pass member);
  packs register a fixed intent set (deck:draw, window:resolve, turn:advance, turn:pass) and
  supply no appliers — **no pack/contribution path re-registers turn:pass, re-supersedes it,
  or reaches passSeat.** turn:pass cannot be re-superseded back to a raw pass. *Residual
  observation:* the door constrains provenance (existing registration + named ground) but
  not the replacement applier's fidelity — a trusted assembler could supersede `turn:end`
  with a no-op. This equals the trust already vested in `registerIntent` and is unreachable
  by content; unregistered as such but not exploitable. Low.
- **Brick hunt (check 3):** NO committing brick found. `__proto__`/`constructor` as
  venture/tfx ids are accepted but stored in arrays (no prototype pollution; state stays
  hashable). Self-debt (A owes A) settles net-zero and clears. Duplicate identical debts both
  settle. Payoff to an eliminated seat commits and replays deterministically (elimination
  estate = registered pack-policy territory, I-12). Nothing breaks hashState/replay.
- **V-1 discharge (check 4):** verified — see CC-5. Arithmetic independently reconciled to
  `governance/upstream/stage-2b-worked-example.md` §3 (A: −1−1−2+4 = 0; B: −1+3−1+2 = +3).
- **Unloaded-Ledger I-39 (check 5):** D7 exercises both fallback legs; mutating the unloaded
  wages leg OR the unloaded debt-settle leg kills D7 (debt would be deleted unpaid / wages
  skipped). effects.ts `levy scope:'table'` charges each living seat, matching the loaded
  post's per-seat debit — upkeep/tick/reckon are coherent unloaded. No asymmetric skip/throw.
- **Record fidelity (check 6):** completion-ledger F5 is honest — M10/M11/M12/M13/M14/M15
  "BUILT — awaiting K7", library/wire "satisfied-CLAIMED — binds to next K7 entry"; **no
  false COMPLETE.** Phantom tokens T2/T3/T6 appear only in correction notes (excised per
  DF5-7); RC-A′/RC-E resolve in stage-2b-worked-example.md. Object-model complete incl. the
  supersession-door row.
- **Divergence injection (check 7):** tampering a persisted V-1 move into an ILLEGAL one —
  route→GHOST seat, crew:work→unknown crew, debt amount→negative, spawn spec + unknown key,
  a deleted move, a reordered reckon — throws `DivergenceError` in every case, no partial
  state. (Tampering to a *legal* alternative value replays to a different valid state with no
  throw — correct; log tamper-evidence is a registered production concern, S3 §8.)

---

## Drift-score table (per module · four dimensions · worst named)

| Module | obj-model | axiom | base-case | extensibility | worst |
|---|---|---|---|---|---|
| M13 Ledger | 9 | 9 | 9 | 8 | 8 — **PASS** |
| M10/M11 Venture+Routing | 8 | 8 | **6** | 8 | **6 base-case (FA-1) — RETURN** |
| M12a/b Outfit+Crew | 9 | 8 | 7 | 8 | 7 — PASS (FA-3 minor) |
| M14 TimedEffects | 9 | 9 | 9 | 8 | 8 — **PASS** |
| M15 ClosingRound | 9 | 9 | 8 | 8 | 8 — **PASS** |
| library/wire (weave + doors) | 8 | 8 | **6** | 8 | **6 base-case (FA-1) — RETURN** |
| kernel supersession door | 9 | 8 | 8 | 8 | 8 — **PASS** |

---

## Severity-ordered defect list (with minimal closures)

1. **FA-1 — MODERATE (RETURN by teeth).** venture:spawn deadline / portion.work /
   portion.party validation is unfalsifiable at both `checkSpecShape` (wire.ts) and
   spawnVenture (ventures.ts) — mutation survives at both doors, no test refuses those
   bricks. DF5-2's "validation at every F5 door" is proven for payoff bricks only. Guards are
   present and correct in shipped code (bricks refused, hash stable), so no live hole — a
   falsifiability gap. *Closure:* add three falsifying door tests (deadline 0/NaN, work
   0/NaN, portion.party unknown-seat) asserting typed refusal + stable hash; re-run the
   deletion to confirm each now fails.

2. **FA-2 — MINOR.** Ventures module-side redundant guards (payoff-amount, payoff-to,
   portions-len) survive because the tested door masks them — an unregistered
   expected-survivor class; I-40 registers only the timedfx equivalent (I-40b). *Closure:*
   extend I-40 to cover the ventures module-door masking, or add direct-module assertions
   (D9e-style) that spawnVenture itself refuses these.

3. **FA-3 — MINOR.** Outfit portion-exists (out-of-range index) and portion-already-done
   guards untested; deletion degrades portion-exists to a raw TypeError. *Closure:* add
   crew:assign refusal tests for an out-of-range portion index and an already-done portion.

4. **FA-4 — MINOR.** Weave per-turn slot reset (`resetSlots(...,'per-turn',...)`) untested;
   GBC-39 exercises per-round only. *Closure:* declare a per-turn slot in a weave test and
   assert it clears after a non-wrapping turn:end.

**Observations (non-findings):** turn:pass applier throw has no divergence-injection test
reaching it (registered defense-in-depth, low); supersedeIntent constrains provenance but not
replacement fidelity (equals registerIntent trust, content-unreachable).

---

## What passed cleanly (for the record)

- The weave (turn:end): HK-5 on-path (D2 suborned-guard), on-round-wrap dispatch, TFX tick,
  venture lapse + crew release, per-round reset, and the wrap condition all mutation-killed.
- The kernel supersession door: turn:pass superseded (rule leg killed by D1), reachability
  closed, I-40(a) expected-survivor pair confirmed, named-ground check killed by D1b.
- unknownKeys / NEW-1 doors (D9): all five legs on-path and falsifiable.
- Ledger balanced-or-throw, bank-collision, non-finite-leg; TFX tick-once/expire; reckon
  status gate and trailing-first order — all killed.
- V-1 single-source discharge, replay byte-equality, and divergence-on-illegal-tamper —
  independently reproduced.

**Overall: RETURN** — close FA-1 (and, at the builder's discretion, FA-2..FA-4), then
re-enter K7 for the deadline/work/party door-leg re-verify. No blocking (state-breaking)
defect found; the S5 boundary, the weave, the supersession door, and V-1 are sound.
