# K7 EXTERNAL AUDIT — ROUND 3 · Facet F4 (Rule System)

**Repository:** tabletop_platform (Micheal-Gregor) · **HEAD:** `34de34f` (HANDOFF; tag
`k7-pass-f4` at `d21566c`) · **Reviewer:** independent K7, no builder context.
**Scope:** F4 only — `packages/engine/src/rules/` (vocabularies, contributions, slots,
registry, hookbus, extension, rulesetview, wire) + `kernel/discipline.ts`; F4 touches to
`play/packloader.ts` (clone-first reorder) and `play/effects.ts` (`fxCapitalize` finite
check). F1/F2/F3 not re-audited (prior certs stand); any F4 regression to them was
hunted and none found. **Charter:** AUDITOR_CHARTER.md — read/run/mutate, never fix,
never commit. **Repo state after audit:** unmodified (`git status` clean on tracked
files; all mutation work done in a throwaway copy).

---

## 0 · Environment & baseline (reproduced by the reviewer)

| Step | Result |
|---|---|
| `npm install` | clean (exit 0) |
| `npx vitest run` | **161 / 161 passed**, 25 files |
| `node tools/check-tiers.mjs` | `HK-6 tier boundary: OK` (exit 0) |
| `vectors/` contents | `V-2.json V-3.json V-5.json V-6.json` + `scenarios.ts` — **V-7 / V-8 absent** (correct: deferred, MR1 NOT-COMPLETE by rule) |
| Hand-written hashes in f4 tests | **none** — `f4-*.test.ts` carry no hash literals; V-2/3/5/6 recomputed from the impl and compared to pins (`vectors.test.ts`) |

Throwaway copy: full tree copied to a scratch dir with `node_modules` junctioned; suite
re-run there **161/161** before any mutation. All mutations applied there and reverted.

---

## 1 · Per-CC verdicts

### CC-1 Code-trace — **PASS**
All eight F4 modules appear in `INSTRUMENTS/object-model-and-parameters.md` (F4 rows,
lines 45–56) and trace to S3 F4 components (MR1–MR6 + GovernedVocabulary + wire). Nothing
in `src/rules/` is absent from the instrument; nothing in the instrument is unbuilt.

### CC-2 Carried-rule — **PASS**
GX-19 (sole dispatcher), GX-20/21 (bounded meta, static+runtime), GX-22 (declared slots),
GX-23 (governed growth), GX-24 (derived activation) are honored in the running code and
exercised on-path (`f4-rules.test.ts`, `f4-onpath.test.ts`). The S5 boundary law holds
(see §5 appendix): every state EFFECT flows through `EffectEngine.applyAll`
(`registry.ts:101`); the only other writes from `rules/` are the R-18-guarded `writeSlot`
(`registry.ts:108`, `slots.ts:19`), the bounded `resetSlots` lifecycle (`slots.ts:40`),
and the registered `relationEventsProcessed` cursor (`hookbus.ts:23`, I-32).

### CC-3 Fidelity — **FAIL (moderate + minor, non-blocking-to-safety)**
Three behaviors are not covered by a registered interpretation and go beyond the spec:
- **F4-3-A (moderate):** a `null`/`undefined` element inside an `effects` array (or an
  `open_window` option's `fx` array) raw-crashes `checkEffectShape`
  (`contributions.ts:55–58`, inner loop `:82–88`) with `TypeError: Cannot read properties
  of null (reading 'fx')` **instead of a named `ContributionRefusal`**. This falsifies the
  builder's stated closures DF4-7 ("malformed shapes … all NAMED") and EXT2-3 ("non-array
  fx named") — a closure narrower than its claim, on the **real** `register()` door and on
  `validateUniqueDef`.
- **F4-3-B (minor):** `slotWrite {increment}` on a slot currently holding a non-number
  silently coerces (`registry.ts:106–107`): a `set:"hi"` then `increment:5` yields the
  string `"hi5"`; a boolean-set slot `increment`s to a number. Unregistered beyond I-32;
  can silently disable a later `gte/lte` gate (which requires `typeof v === 'number'`).
- **F4-3-D (minor/observation):** `bearer.relationType` is validated only as a string
  (`contributions.ts:129–131`), never against `RELATION_TYPES`. A relation-borne
  contribution on a nonexistent type **with a valid turn-hook trigger** validates and is
  silently inert (dead rule). Adjacent to I-30 but not explicitly registered for
  `relationType` (I-30 names "seat/deck refs").

All other observed behavior maps to a registered I-* entry (I-24…I-32′) — see §6.

### CC-4 Refusal-execution — **PASS**
`npm install && npm test` green (161/161). R-15/R-16(static)/R-17(MR1 & M9)/R-18 and the
duplicate-id refusal all run with genuine forbidden inputs and non-vacuous assertions
(state/typed-refusal), and **every one dies under mutation** (§2). HK-9 halts on unknown
hooks both MR1-side (`registry.ts:24`) and M9-side (`effects.ts:51`).

### CC-5 Vector-discharge — **PASS**
V-2/V-3/V-5/V-6 are computed from the implementation (`vectors/scenarios.ts` via
`computeV2/3/5/6`) and compared to pinned JSON; `DISCHARGE=1` is the only writer
(`vectors.test.ts:21,35,52,64`). **V-7/V-8 remain deferred with no files**, and the
completion ledger marks MR1 NOT-COMPLETE by rule (ledger line 110). No hand-written
expected hashes in the F4 suite.

### CC-6 Hook-wiring — **PASS (zero theater)**
Every F4 guard was mutation-tested in the throwaway copy; **all 14 DIE-expected mutations
were killed by a named test** (§2). Divergence path: HK-1's malformed-verdict rejection
(`core.ts:49`) still gates the `rules:pump` applier; a lying guard cannot mutate. HK-6 /
`check-tiers.mjs` green; no cross-tier or presentation-seam import in `rules/`.

### CC-7 Drift-score — see §4. Worst dimension: **MR3 base-case support = 6** (F4-3-A) →
teeth engage on MR3.

---

## 2 · Mutation-test log (throwaway copy; survivors are findings)

**Guard mutations — expected to DIE (guard is load-bearing). All 14 died.**

| # | Mutation | Guard / file:line | Result | Killing test |
|---|---|---|---|---|
| M-R15-trigger | disable `trigger ∈ HookPoints` | R-15 · contributions.ts:138 | **DIED** | GBC-25 |
| M-R15-fx | disable `fx ⊆ EFX` (recursive) | R-15 · contributions.ts:57 | **DIED** | GBC-25 + D1/P3 |
| M-R15-efxver | disable EFX-version check | R-15 · contributions.ts:132 | **DIED** | GBC-25 |
| M-R15-zeroopt | allow zero-option window | R-15 · contributions.ts:70 | **DIED** | D1/P1 + NEW-2 |
| M-R15-nestedwin | allow nested `open_window` | R-15 · contributions.ts:83 | **DIED** | D1/P2 |
| M-R16-static | disable bounded-meta path check | R-16 · contributions.ts:163 | **DIED** | GBC-26 |
| M-R18-writeSlot | allow undeclared-slot write | R-18 · slots.ts:26 | **DIED** | GBC-27 |
| M-HK9-MR1 | dispatch on any hook name | HK-9 · registry.ts:25 | **DIED** | GBC-30 |
| M-R17-MR1 | drop incoming `windowDepth` (force 0) | R-17 · registry.ts:101 | **DIED** | GBC-30 (depth-1) |
| M-order | reverse bearer-entry-seq | GX-19 · registry.ts:93 | **DIED** | GBC-28 (order) |
| M-activation | `isActive → true` always | GX-24 · registry.ts:83 | **DIED** | GBC-29 (MUT-3) |
| M-dedup | allow duplicate contribution id | registry.ts:69 | **DIED** | GBC-28 (dup) |
| M-HK9-M9 | disable descriptor ∈ EFX | HK-9 · effects.ts:52 | **DIED** | f2-hooks + R-3 |
| M-R17-M9 | disable depth-1 engine guard | R-17 · effects.ts:179 | **DIED** | GBC-16 + GBC-30 + D3 |

**Registered expected-survivors — expected to SURVIVE (documented as such). All survived.**

| # | Mutation | Registration | Result |
|---|---|---|---|
| M-cap-finite | remove `fxCapitalize` finite check (effects.ts:114) | **I-32′** (unreachable behind validated doors) | SURVIVED ✓ |
| M-bank-hasOwn | `hasOwn` bank lookup → `?? {}` (registry.ts:99) | **I-32′** | SURVIVED ✓ |
| M-runtime-hasOwn-walk | drop `hasOwn` in path walk (registry.ts:36) | **I-32** (defensive depth) | SURVIVED ✓ |
| M-snapshot | perturb per-firing snapshot (registry.ts:93) | **I-32** (structural; no reentrant path until F5) | SURVIVED ✓ |

The four survivors are exactly the ones the ledger predicts (I-32 / I-32′). None is a new
finding — each is registered defensive depth or a structural guarantee, correctly noted as
becoming falsifiable only at the F5 weave. **Net theater findings: 0.**

---

## 3 · Adversarial probe log (independent battery, throwaway copy)

| Probe | Input | Outcome | Verdict |
|---|---|---|---|
| P1a/b | `effects:[null]`, option `fx:[null]`, `effects:[undefined]` | **raw `TypeError`**, not `ContributionRefusal` | **FINDING F4-3-A** |
| P1c | `effects:[42/"x"/[]]` | named `ContributionRefusal` (fx ∉ EFX) | ok |
| P2 | slot `set:"hi"` then `increment:5` | → `"hi5"` (string); `set:true` then `+2` → `3` | **FINDING F4-3-B** |
| P3a | `relationType:"Bogus"` + `on-turn-start` | **VALIDATES** (inert at dispatch) | **FINDING F4-3-D** |
| P3b | `relationType:"Bogus"` + `on-form:Bogus` | refused (trigger ∉ HookPoints) | ok (trigger catches this case) |
| P4 | Unicode/RTL id + `スロット` slot, id `"0"`, id `" "` | round-trips correctly via hasOwn banks | clean |
| P5 | depth-50 and/or nest w/ one out-of-bounds leaf | refused (bounded); depth-30 valid nest evaluates | clean |
| P6 | two contributions, same slot name | banks isolated (A.x=100, B.x=1) — no cross reach | clean |
| P7 | multi-contribution + relation event + slot writes, rebuilt twice | JSON **byte-equal** | clean (determinism) |
| P8 | `validateUniqueDef` w/ duplicate contribution ids | **VALIDATES** (no dup check; register() would catch at F5); null element → raw TypeError | **FINDING F4-3-C** |
| P9 | `ne` on unresolved `slots.count` | fires | ok (**I-32** registered) |

**S5 boundary — direct attempt:** enumerated every state-mutating export from `rules/`
(`src/index.ts:66–78`): `writeSlot` (R-18-guarded), `resetSlots` (bounded to `ruleSlots`,
per declared reset class), and dispatch/pump (effects via `EffectEngine.applyAll`, slots
via `writeSlot`, plus the registered cursor). **No exported `rules/` API mutates
seats/decks/windows/relations/components without passing `EffectEngine.applyAll` or the
R-18 `writeSlot`.** Per-descriptor mutators remain module-private (`effects.ts:68–198`;
only `EffectEngine.apply/applyAll` exported). Every interpretation I observed maps to
I-24…I-32′ — no unregistered *dispatch* behavior found.

**ExtensionContract / docket seal (charter obligation):** all three vocabulary member
arrays are frozen — `EFX` (via `EFX_V1_1_1 = Object.freeze` `effects.ts:18`), `HookPoints`,
`VerbSets` (`vocabularies.ts:29,35`). Reviewer verified `EFX_GOVERNED.members` is frozen
(the one array assigned by reference, `vocabularies.ts:41`) and that pushing a docket
member (`spawn_venture`/`draw_card`) is inert **both** directly and through the
`renderRuleset` view path. `approve()` records a ruling only, never mutating a vocabulary
(`extension.ts:56–63`). Docket (`extension.ts:11`) is unreachable as a member by any
runtime path; propose/approve cycles never touch the sealed vocabularies. **PASS.**

---

## 4 · Drift-score table (eight F4 modules × four dimensions)

Anchored: 9–10 conforms/no gaps · 7–8 registered-interp/cosmetic · 5–6 invariant gap or
unregistered invention (RETURN) · ≤4 structural divergence.

| Module (file) | Obj-model | Axiom | Base-case | Extensib. | Worst — reason |
|---|:--:|:--:|:--:|:--:|---|
| vocabularies.ts | 9 | 9 | 9 | 9 | 9 — sealed, frozen, docket unreachable |
| MR1 RuleRegistry (registry.ts) | 9 | 9 | 8 | 8 | 8 — order/activation/HK-9/R-17/R-24 all live; F4-3-B coercion value computed here |
| MR2 HookBus (hookbus.ts) | 9 | 9 | 8 | 8 | 8 — cursor registered (I-32); drain replay-deterministic |
| **MR3 ContributionLoader (contributions.ts)** | 9 | 8 | **6** | 8 | **6 — F4-3-A: null/undef element raw-crashes; "names defects" narrower than DF4-7/EXT2-3 claim; F4-3-C UniqueDef dup gap** |
| MR4 StateSlotManager (slots.ts) | 9 | 9 | 7 | 8 | 7 — R-18 live; F4-3-B: `writeSlot` value not type-checked before increment |
| MR5 ExtensionContract (extension.ts) | 9 | 9 | 9 | 9 | 9 — governed growth; sealed vocab never mutated |
| MR6 RulesetView (rulesetview.ts) | 9 | 9 | 8 | 8 | 8 — total exposure verified; frozen members exposed by ref (safe) |
| rules/wire (wire.ts) | 9 | 9 | 8 | 8 | 8 — `rules:pump` turn-disciplined (shared `discipline.ts`, I-29) |

**Teeth:** MR3 base-case = 6 (< 7) → **no new work on MR3 until F4-3-A/C are closed.** All
other modules ≥ 7.

---

## 5 · Severity-ordered defects (with one-line minimal closures)

1. **F4-3-A — moderate — MR3 `contributions.ts:55–58, 82–88.**
   `null`/`undefined` element in an `effects`/option-`fx` array raw-crashes
   `checkEffectShape` (raw `TypeError`) instead of a named `ContributionRefusal`, on the
   real `register()` and `validateUniqueDef` doors — falsifies DF4-7 / EXT2-3 ("shapes all
   NAMED"). *Closure:* at the top of `checkEffectShape` (and before the inner `for…of`),
   `if (d === null || typeof d !== 'object') { defects.push(\`${where}: effect must be an
   object\`); return; }`.

2. **F4-3-B — minor — MR1/MR4 `registry.ts:106–107`, `slots.ts:19–37`.**
   `increment` on a non-numeric slot silently coerces (`"hi5"`, `true→3`), which can
   disable a later numeric gate. *Closure:* in the increment branch refuse when
   `typeof current !== 'number'` (or have `writeSlot` reject a non-number `increment`
   result), or register the coercion explicitly as an interpretation.

3. **F4-3-C — minor — MR3 `contributions.ts:177–183`.**
   `validateUniqueDef` does not detect duplicate contribution ids (parity gap vs
   `register()`, `registry.ts:69`) and inherits F4-3-A. *Closure:* dedupe
   `u.contributions` by id before the per-contribution loop (or document that dedup is
   `register()`'s job at the F5 catalog-registration weave).

4. **F4-3-D — minor/observation — MR3/MR1 `contributions.ts:129–131`.**
   `bearer.relationType` never checked against `RELATION_TYPES`; a relation-borne
   contribution on a nonexistent type with a valid turn-hook trigger validates and is
   silently inert. *Closure:* refuse an unknown `relationType` at validation, or extend
   I-30 to explicitly name `relationType` as F5-bound (matching seat/deck refs).

**Out-of-scope sibling (not scored against F4):** `play/packloader.ts:138` `checkFx` has
the identical null-element raw-crash pattern as F4-3-A. It is pre-existing F2 code (the F4
touch to packloader was the clone-first reorder at `:227/:312`, not `checkFx`), so it is
**not** an F4 regression — but the builder should fix both together, since EXT2-3 claimed
the packloader door closed too.

---

## 6 · Registered-interpretation coverage check (I-24…I-32′)

Confirmed each observed F4 behavior is either legitimate-because-registered or a finding:
- **I-30** — effect args validated to membership + finite depth; seat/deck binding at F5.
  ✔ Covers the *value* deferral; does **not** cover F4-3-D's `relationType` existence.
- **I-31** — relation-borne activation derived. ✔ (M-activation mutation confirms it live.)
- **I-32** — condition DSL (incl. `ne` fires on unresolved — P9 ✔), `SlotWrite set/increment`
  (names the ops, does **not** sanction F4-3-B coercion), `relationEventsProcessed` cursor
  ✔, per-firing snapshot structural until F5 ✔ (M-snapshot survives as predicted), runtime
  `hasOwn` walk defensive ✔ (M-runtime-hasOwn survives as predicted).
- **I-32′** — `fxCapitalize` finite check + dispatch-bank `hasOwn` = expected survivors ✔
  (M-cap-finite, M-bank-hasOwn both survive as predicted — **not** reported as findings).
- **I-28** — HookPoints v1.0 = 23 members (7 turn + 6 lifecycle + 5×2 relation). ✔
  (`vocabularies.ts:26–30`; GBC-32 asserts 23.)

No unregistered *dispatch/effect* invention found. The findings above are validation-door
fidelity gaps, not dispatch-law inventions.

---

## 7 · Overall verdict — **RETURN**

No blocking defect, no theater hook, no S5 breach, no determinism or vector defect: the
F4 dispatch spine is sound and every guard is falsifiable. The RETURN is driven by
**F4-3-A** — a moderate, real-door breach of the module's own "refusal NAMES defects"
contract that falsifies the builder's DF4-7 / EXT2-3 closures (the "closure narrower than
its claim" pattern this audit exists to catch), dropping MR3 base-case support to 6 and
engaging the drift teeth on MR3. F4-3-B/C/D ride along as minor closures. Recommend the
builder close F4-3-A (+ its packloader sibling) and F4-3-C to clear the teeth, address
F4-3-B/D, then return for a targeted re-verify (reviewer will reconstruct P1/P8 and re-run
the null-element crash live). Everything else in F4 is certified by this round.

*Reviewer held the pen only on this report; the repository was not modified, and no commit
was made.*
