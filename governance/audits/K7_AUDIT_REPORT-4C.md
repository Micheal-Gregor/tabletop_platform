# K7 EXTERNAL AUDIT — F5 narrow re-verify (report 4C)

**Auditor:** same independent K7 seat that issued 4B (RETURN, FA-1..FA-4). No builder context.
**Date:** 2026-07-30. **Scope:** the four 4B findings ONLY — nothing else reopened.
**Attestation:** `git fetch --tags && git pull` → HEAD `48aad9a` (as required). The closure
diff `b2fc773..48aad9a` is test-and-record only (f5-k7-closures D10/D11/D12, drift-ledger
I-40 + EXT4B row, completion-ledger) — no src change, correct for findings that were
falsifiability gaps over guards already present and correct.
**Process:** throwaway `git clone` under scratch; audited tree never modified. Pristine
baseline re-proved at close.

**Baseline:** `npx vitest run` → **209/209** · `npx tsc -p packages/engine/tsconfig.json
--noEmit` → exit 0.

---

## VERDICT: PASS — the F5 external audit is SIGNED OFF.

All four findings closed and independently re-verified by live mutation. The two held
modules (M10/M11, library/wire) clear the base-case-support teeth. No finding reopened; no
new finding in scope.

---

## Finding-by-finding re-verification

### FA-1 (MODERATE) — venture:spawn door legs now falsifiable · CLOSED
Deleted each `checkSpecShape` leg (wire.ts) live, one at a time; each is now killed by the
named, leg-specific D10 test:

| Mutation (leg deleted) | Killing test | Assertions in that test |
|---|---|---|
| `spec.deadline` positive-int leg | D10 · "deadline 0 / NaN → refused typed, hash stable (**kills FA-1a**)" | `'refused' in res` · detail `/deadline/` · hash == pre-hash — over `[0, NaN, -1, 1.5]` |
| `portion.work` positive-int leg | D10 · "portion.work 0 / NaN → refused typed, hash stable (**kills FA-1b**)" | `'refused' in res` · detail `/work/` · hash stable — over `[0, NaN, -2, 0.5]` |
| `portion.party` known-seat leg | D10 · "portion.party unknown seat → refused typed, hash stable (**kills FA-1c**)" | `'refused' in res` · detail `/party.*GHOST/` · hash stable |

The three D10 tests assert **typed refusal AND stable hash**, exactly the closure I
prescribed in 4B. Confirmed live: with the door leg present the suite is green; delete it and
precisely the matching D10 test fails. The FA-1 falsifiability gap is closed at the door.

### FA-2 (MINOR) — ventures module-side masking now registered · CLOSED
I-40(b) (drift-ledger.md:127) is extended from "timedfx charge/scope" to also enumerate the
ventures module legs: **payoff-amount, payoff-to, portions-len, deadline, work, party** —
the full set I named — with the correct rationale: "the D9e/D10 door tests kill the door
copies, the module copies remain belt-and-suspenders." The unregistered-expected-survivor
gap is closed; the ventures module-side redundancy is now a registered, TESTED-door-backed
defense-in-depth, not theater.

### FA-3 (MINOR) — outfit edge refusals now falsifiable · CLOSED
Deleted each guard live; D11 ("crew assignment edge refusals") fails each time:
- delete `if (!portion)` (out-of-range index) → D11 fails (asserts `/no portion 9/`).
- delete `if (portion.done)` (already-done portion) → D11 fails (asserts `/already done/`).

### FA-4 (MINOR) — per-turn slot reset now falsifiable · CLOSED
Deleted `resetSlots(next, 'per-turn', declMap(registry))` in the turn:end weave → D12 ("a
per-turn slot clears after a NON-wrapping turn:end") fails. D12 seeds a per-turn slot at
genesis (`ruleSlots: {'turn-scratch': {t: 5}}`), advances A→B without a wrap, and asserts the
slot is swept — a genuine on-path exercise of the previously-untested weave leg.

---

## Mutation log (this re-verify)

| Mutation | File | Result | Killing test |
|---|---|---|---|
| FA-1a delete deadline leg | wire.ts | **KILLED** | D10 (kills FA-1a) |
| FA-1b delete work leg | wire.ts | **KILLED** | D10 (kills FA-1b) |
| FA-1c delete party leg | wire.ts | **KILLED** | D10 (kills FA-1c) |
| FA-3a delete portion-exists | outfit.ts | **KILLED** | D11 |
| FA-3b delete portion-done | outfit.ts | **KILLED** | D11 |
| FA-4 delete per-turn reset | wire.ts | **KILLED** | D12 |

Zero survivors in scope. (The module-side copies of the FA-1 legs remain masked by their now-
TESTED door — registered defense-in-depth per the extended I-40(b), not a finding.)

---

## Re-scored dimensions (the two held modules)

| Module | base-case support (4B → 4C) | all four dims now |
|---|---|---|
| M10/M11 Venture+Routing | 6 → **8** (spawn door refusal legs falsifiable: GBC-34 + D6 + D10) | ≥ 7 — **teeth released** |
| library/wire (weave + doors) | 6 → **8** (checkSpecShape legs via D10; per-turn sweep via D12) | ≥ 7 — **teeth released** |
| M12a/b Outfit+Crew | 7 → **8** (D11 edge refusals) | ≥ 7 |

All other F5 modules were already ≥ 7 in 4B and are unchanged.

---

## Process discipline

- Audited tree never modified; all mutation work in a throwaway clone; every mutation
  reverted before the next.
- Pristine baseline re-proved: audit-copy `git status` clean, **209/209**.
- Original tree confirmed at `48aad9a`, no source modifications (only untracked prior audit
  reports present).

---

## Overall: PASS

Every 4B finding (FA-1..FA-4) is closed and independently confirmed by live mutation against
the named D10/D11/D12 tests; FA-2's register extension is present and accurate. The two held
modules clear the base-case-support teeth. No new or reopened findings.

**The F5 external audit (increment 4985beb..2eb46a9, verified at HEAD 48aad9a) is SIGNED
OFF.** The S5 boundary, the weave, the kernel supersession door, the unloaded-Ledger
fallback, and the V-1 discharge — all sound as established in 4B — stand.
