# K7 EXTERNAL AUDIT — ROUND 3B · Targeted re-verify (Facet F4)

**Repository:** tabletop_platform · **HEAD:** `2cea884` ("External audit 3 (F4) closures
EXT3-A..D") · **Reviewer:** independent K7. **Scope:** live reconstruction of my round-3
findings F4-3-A..D against closures EXT3-A..D (drift ledger lines 56–59); mutation-test the
new guards; spot regression of the round-3 battery; re-score MR3/MR4; final verdict.
**Charter:** read/run/mutate, never fix, never commit. **Baseline reproduced:**
`npm test` → **165 / 165**; `check-tiers` OK. **Repo after audit:** unmodified (`git
status` clean; all work in a throwaway copy).

---

## 1 · Finding-by-finding reconstruction (live, throwaway copy)

### (A) F4-3-A — null/undefined element → NAMED refusal on BOTH doors — **CLOSED (functional)**
Guards added at `contributions.ts:57–59` and `packloader.ts:78–80`
(`if (d === null || typeof d !== 'object' || typeof d.fx !== 'string') → push named defect`).

| Probe | Door | Result |
|---|---|---|
| `effects:[null]` | `validateContribution` | **`ContributionRefusal`** "effect must be an object with a string fx" |
| `effects:[undefined]` | `validateContribution` | **`ContributionRefusal`** (named) |
| option `fx:[null]` / `[undefined]` | `validateContribution` | **`ContributionRefusal`** (named) |
| card `fx:[null]` | `hookHk4ValidatePack` | **`PackLoadRefusal`** "card 'c': effect must be an object…" |
| option `fx:[null]` | `hookHk4ValidatePack` | **`PackLoadRefusal`** (named) |

No raw `TypeError` on either door. **Functionally closed.** (Falsifiability caveat below — §2.)

### (B) F4-3-B — increment on a non-numeric slot → refused — **CLOSED (reported vector); residual sibling**
Guard at `registry.ts:106–108` throws `EffectRefusal` "increment on non-numeric slot … —
refused, not coerced".
- Reported probe (`set "hi"` then `increment 5`): **refused** ✔.
- **Residual sibling (increment BY a non-number):** `slotWrite {increment:"5"}` on a
  *numeric* slot still yields `"05"` (string); `{increment:true}` yields `1`. The guard
  checks the **slot's** type, not the increment **value's** type — the coercion branch
  (`registry.ts:109`) is still reachable with a malformed `increment` value (which
  `validateContribution` does not type-check). Same class as F4-3-B, minor.

### (C) F4-3-C — UniqueDef register-parity — **CLOSED (dup); residual sibling**
Dedup at `contributions.ts:190` refuses duplicate contribution ids.
- Duplicate-ids probe: **`ContributionRefusal` "duplicate contribution ids in UniqueDef"** ✔.
- **Residual sibling (the null-crash I flagged in F4-3-C):** `validateUniqueDef` with
  `contributions:[null]` still **raw-crashes** — `TypeError: Cannot read properties of
  null (reading 'id')` at the dedup `.map(c => c.id)` (`contributions.ts:189`), before
  `validateContribution` runs. The "names defects, never raw" doctrine still has a hole at
  the UniqueDef contribution-element level. Minor.

### (D) F4-3-D — relationType validated against the five — **CLOSED**
Guard at `contributions.ts:137–139`. `relationType:"Bogus"` + `on-turn-start` →
**`ContributionRefusal` "…is not one of the five relations"** ✔; a real type
(`Attachment` + `on-form:Attachment`) still validates (no false-positive) ✔.

---

## 2 · Mutation-test log (new guards must die; round-3 guards must still die)

Each guard deleted (`if (…)` → `if (false && …)`) in the throwaway copy; full suite run
(my probe files excluded). **Survivor = finding.**

| Mutation | Guard / file:line | Result | Killing test |
|---|---|---|---|
| EXT3-A **contrib** null-guard | contributions.ts:57 | **DIED** (1/164) | f4-k7-closures › EXT3 › A |
| **EXT3-A packloader null-guard** | packloader.ts:78 | **SURVIVED — 165 green** | *(none)* |
| EXT3-B increment-non-numeric | registry.ts:106 | **DIED** | f4-k7-closures › EXT3 › B |
| EXT3-C UniqueDef dedup | contributions.ts:190 | **DIED** | f4-k7-closures › EXT3-C |
| EXT3-D relationType∈five | contributions.ts:137 | **DIED** | f4-k7-closures › EXT3 › D |
| REG M-order (round-3) | registry.ts:93 | **DIED** | f4-rules › GBC-28 (order) |
| REG M-activation (round-3) | registry.ts:83 | **DIED** | f4-rules › GBC-29 (MUT-3) |
| REG M-HK9-MR1 (round-3) | registry.ts:25 | **DIED** | f4-rules › GBC-30 (HK-9) |

**Finding — EXT3-A packloader-door guard is unfalsifiable (theater).** Deleting the
null-element guard in `hookHk4ValidatePack.checkFx` leaves the suite **fully green** — no
named test exercises a null/undefined element at the pack door. The guard *functions*
(§1(A) shows a real `PackLoadRefusal`), but per charter CC-6a ("delete the guarded call;
named tests MUST fail — if the suite stays green, the hook is theater") it lacks its
falsifying test. The ledger's EXT3-A wording ("guard at BOTH doors … tests") is broader
than the evidence: only the **contribution** door is test-backed. *(The three round-3
regression mutations all still die — no regression to the round-3 battery.)*

---

## 3 · Re-score (MR3, MR4) — round-3 teeth released

Round-3 set MR3 base-case = **6** (teeth) on the contribution-door raw-crash. That crash is
now a NAMED, mutation-falsifiable `ContributionRefusal` → the gap is closed.

| Module | Obj-model | Axiom | Base-case | Extensib. | Worst — reason (Δ vs round-3) |
|---|:--:|:--:|:--:|:--:|---|
| **MR3 ContributionLoader** (contributions.ts) | 9 | 8 | **7** | 8 | **7** ▲ (was 6) — contrib-door null NAMED + falsifiable; relationType + dedup falsifiable; **residual:** null *contribution* element in `validateUniqueDef` still raw-crashes |
| **MR4 StateSlotManager** (slots.ts) | 9 | 9 | **8** | 8 | **8** ▲ (was 7) — increment-on-non-numeric-slot refused (falsifiable); residual coercion lives in MR1 dispatch, not MR4 |

Both ≥ 7 → **round-3 drift teeth on MR3/MR4 are released.** (For reference, the three
minor residuals sit at: MR3 base-case = 7 (null-contribution element); MR1 dispatch
`registry.ts:109` = increment-by-value coercion; M8 PackLoader `checkFx` = the untested
guard — M8 is F2 and not re-scored here, but the EXT3-A closure's pack-door leg is not
test-backed.)

---

## 4 · Severity-ordered residual defects (one-line closures)

1. **EXT3-A-pack — moderate (falsifiability / CC-6) — `packloader.ts:78`.**
   The pack-door null-element guard has no named test (mutation survives). *Closure:* add a
   `hookHk4ValidatePack` test with a `null`/`undefined` card-`fx` element (and an
   option-`fx` null) asserting a named `PackLoadRefusal` — literally my §1(A) pack probe.
2. **EXT3-B-residual — minor — `registry.ts:106–109`.**
   `increment` by a non-numeric *value* still coerces (`"5"→"05"`, `true→1`). *Closure:*
   also refuse when `typeof w.increment !== 'number'` (or when the sum is non-numeric)
   before `writeSlot`.
3. **EXT3-C-residual — minor — `contributions.ts:189`.**
   `validateUniqueDef` raw-crashes on a `null` contribution element (the piece F4-3-C
   flagged as "inherits the null-crash"). *Closure:* guard each element
   (`c == null || typeof c !== 'object'` → named refusal) before the `.map(c=>c.id)` dedup.

None is a functional invariant / determinism / S5 breach; each is one line.

---

## 5 · Overall verdict — **RETURN (narrow)**

The functional substance of all four round-3 findings is **closed**: null/undefined
elements are NAMED on both doors, increment refuses a non-numeric slot, UniqueDef dedups,
and relationType is validated against the five — each verified live, and (except the
pack-door leg) each dies under mutation. The MR3/MR4 drift teeth from round 3 are released.

The RETURN is **narrow** and rests on the recurrence of this audit chain's signature
pattern — *closures slightly broader than their evidence*:
- EXT3-A claims guards + tests at **both** doors, but the **pack-door guard is
  unfalsifiable** (no named test — CC-6a theater, the one item of moderate weight);
- EXT3-B "refused, not coerced" is true for the slot but **not for the increment value**;
- EXT3-C "names defects" is true for dup ids but a **null contribution element still raw
  crashes**.

All three closures are one line each. Recommend the builder add the pack-door falsifying
test (clears the CC-6 theater finding) and close the two minor residuals, then this can be
signed off without another external round. **No functional regression, no invariant
breach; F4's dispatch spine remains sound.**

*Reviewer held the pen only on this report; the repository was not modified, and no commit
was made.*
