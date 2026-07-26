# K7 EXTERNAL AUDIT — ROUND 2 · Facet F2 (Play Engine)

**Repository:** tabletop_platform @ tag `k7-pass-f2` (HEAD `8493a59`)
**Auditor role:** Independent K7 reviewer (read · run · mutate · never fix, never commit).
**Scope:** `packages/engine/src/play/` — `effects.ts`, `windows.ts`, `turn.ts`, `deck.ts`, `packloader.ts` — and the F2 test set. F1 not re-audited (external round-1 PASS archived at `governance/audits/K7_AUDIT_REPORT-1.md`); F1 guarantees checked only for F2 regressions. F3–F7 unbuilt (absence = N/A).
**Method:** designed an independent mutation + adversarial-content battery in a throwaway copy (never the audited tree); cross-checked afterward against the internal reviewer's list (DF2-1..17). Original repo verified byte-clean after the run (`git status` empty, still at `k7-pass-f2`).

## Baseline (reproduced myself)

- `npm install` — clean (5 npm-audit advisories in dev deps; not F2 code).
- `npm test` (Vitest) — **76 passed / 76**, 16 files.
- `node tools/check-tiers.mjs` — `HK-6 tier boundary: OK` (exit 0).

## OVERALL VERDICT: **RETURN**

One blocking defect (a validating pack with **no path to decision** — a GX-8 game-brick in a window shape NEW-1/DF2-16 never covered), plus three moderate defects and one theater survivor. M8 PackLoader scores < 7 on two dimensions → drift teeth bite → F2 may not be certified this round.

---

## 1 · Per-CC verdicts

### CC-1 Code-trace — **PASS**
Every `play/` module appears in `INSTRUMENTS/object-model-and-parameters.md` (M5/M6/M7/M8/M9 rows, "F2 Play Engine, build slot 2") and traces to an S3/S2 node. No file in `src/play/` is absent from the instrument; nothing extraneous. `index.ts` re-exports match the object model (per-descriptor mutators withheld — see CC-6/R-24).

### CC-2 Carried-rule — **PASS (with the CC-3/CC-6 exceptions below)**
GX-7 (sole applier, sealed EFX) — `effects.ts:18-26,51-58,169-197`, executed. GX-9 (wrap-once) — `turn.ts:35-41,78`, executed. GX-11/R-17 depth-1 — `effects.ts:148-152`, executed on **both** resolve and auto paths (`windows.ts:87,117`; confirmed by mutation ME3 killing the D3 auto-trap test). GX-12 (deck streams + order) — `deck.ts`, executed. GX-8 (windows gate; decisions never skipped) — enforced for the shapes tested, **but demonstrably incomplete** (Defect F2-R2-1): a window can exist for which neither the decider nor auto can ever take a decision.

### CC-3 Fidelity — **FAIL (minor)**
Two behaviors exceed the registered I-8..I-18 + I-8′ set:
- The `gated` flag is read straight from untrusted content (`effects.ts:159`, `d['gated'] ?? true`) and is **not validated** by HK-4. No I-* registers content-controlled gating. A `gated:false` window opens, does **not** block advance, and is left open silently (Defect F2-R2-5). Unregistered invention.
- Numeric-overflow committal (Defect F2-R2-2) is a behavior no I-* sanctions: HK-4's own docstring claims "a pack that validates can never commit an illegal value (NaN cash)" (`packloader.ts:50-52`), yet it can.

### CC-4 Refusal-execution — **PASS**
Every F2-owned refusal test runs and passes on genuine forbidden input with non-vacuous assertions (state-hash-unchanged / log-length-unchanged where applicable): R-2 (`r2-pack-load.test.ts`), R-3 (`r3-r24-effects.test.ts`), R-6/R-7 (`r6-r7-windows.test.ts`), R-8 (`r8-turnwrap.test.ts`), R-17 engine side (`r3-r24-effects.test.ts` GBC-16 + `f2-k7-closures` D3), R-24 structural (`r3-r24-effects.test.ts`). All survived my mutation pass (Section 2) — i.e., each is falsifiable.

### CC-5 Vector-discharge — **PASS**
No hard-coded expected values in F2 tests: grep for 16-hex literals and `getStateHash().toBe('…')` returns nothing. Replay tests compute hashes from the implementation and compare live-vs-rebuild (`f2-replay.test.ts:50-51`). V-2 and V-3 remain **DEFERRED-UNDISCHARGED** in `completion-ledger.md` (lines 12, 31, 36) with no hand-written pins; `vectors/` holds only `README.md`. Correctly blocking their owning modules by rule.

### CC-6 Hook-wiring — **FAIL (one blocking, one theater)**
Mutation-tested each F2 hook in a throwaway copy (full log Section 2). HK-3, HK-4-membership, HK-5, HK-9-membership, the R-6/R-24/R-17 guards, and both legs of the both-check law all **die** under deletion — genuinely load-bearing. Divergence-injection reproduced: the suborned-Guard D1 path (HK-5) and the check-tiers gate (four inversion forms, all caught — Section 3).
**Two hooks are NOT fully falsifiable:**
- **HK-4 (the "no path to decision" leg) — blocking gap.** A window whose sole option's fx is itself `open_window` validates cleanly and then can never be closed (Defect F2-R2-1). HK-4's zero-option guard (NEW-1) does not generalize to the single-recursing-option shape.
- **wirePack's own seal — theater.** Deleting `freezeDeep(structuredClone(rawPack))` at `packloader.ts:201` leaves the suite **green** (mutation MP6). D8 only exercises `loadPack`'s seal; the public direct-call `wirePack(core, rawPack)` seal is unproven. I confirmed it is genuinely load-bearing there: with the seal removed a post-`wirePack` tamper leaks (`A.cash = 999999` vs sealed `2`) — a reopened content-TOCTOU on a public API surface (Defect F2-R2-4).

### CC-7 Drift-score — see Section 4. M8 < 7 on two dimensions → **RETURN**.

---

## 2 · Mutation-test log (my own battery; survivors are the findings)

Throwaway copy only. Each row = restore pristine → apply one exact-string edit → `vitest run` → record. "KILLED" = a named test failed. "SURVIVOR" = suite stayed green (patch-applied verified by diff).

| ID | File | Mutation | Result |
|---|---|---|---|
| ME1 | effects.ts:52 | neuter HK-9 membership check (`if(false)`) | KILLED (HK-9 unit + R-3 ×2) |
| ME2 | effects.ts:55 | remove HK-9 `Object.isFrozen` check | **SURVIVOR** (dead defensive — see obs) |
| ME3 | effects.ts:149 | depth-1 `>=1` → `>=2` | KILLED (GBC-16 ×2 + D3 auto path) |
| ME4 | effects.ts:119 | levy charges eliminated seats too | KILLED (GBC-10 "levy skips eliminated") |
| ME5 | effects.ts:77 | remove mapSeat unknown-seat throw | **SURVIVOR** (unreachable from validated content) |
| MW1 | windows.ts:43 | neuter HK-5 block | KILLED (HK-5 unit + D1 real-path) |
| MW2 | windows.ts:80 | remove resolveWindow I-16 check | KILLED (D12) |
| MW3 | windows.ts:99 | remove auto usurp-live-decider check | KILLED (R-7 "may not usurp") |
| MW4 | windows.ts:110 | auto out-of-range silently → option 0 | KILLED (D6) |
| MW5 | windows.ts:77 | remove resolveWindow non-decider check | KILLED (R-6 non-decider) |
| MW6 | windows.ts:57 | nonexistent decider treated as present | KILLED (D5 runtime) |
| MT1 | turn.ts:78 | remove passSeat HK-3 call | KILLED (D2) |
| MT2 | turn.ts:36 | HK-3 predicate `>=` → `>` | KILLED (D2 + R-8 ×2) |
| MT3 | turn.ts:97 | remove forceRoundWrap HK-3 call | KILLED (R-8 forced-wrap) |
| MP1 | packloader.ts:83 | remove HK-4 pay amount-finite check | KILLED (D4 ×2) |
| MP2 | packloader.ts:117 | remove NEW-1 options≥1 check | KILLED (D5 NEW-1) |
| MP3 | packloader.ts:101 | weaken deck_inject catalog check | KILLED (D7 load) |
| MP4 | packloader.ts:219 | uncataloged draw → silent no-op | KILLED (D7 runtime) |
| MP5 | packloader.ts:200 | remove wirePack HK-4 validate call | KILLED (D11) |
| MP6 | packloader.ts:201 | remove wirePack seal (`= rawPack`) | **SURVIVOR** → Defect F2-R2-4 |
| MP7 | packloader.ts:245 | disable turn:pass R-6 guard-rule leg | KILLED (R-6 + R-7 + HK-5 defense-in-depth) |
| MP8 | packloader.ts:111 | weaken open_window decider-in-seats check | KILLED (D5 nonexistent decider) |

**Both-check law (R-6 / HK-5) — each leg mutated independently:** MP7 (Guard-rule leg) and MW1/MP6-path (HK-5 applier leg) each fail distinct named tests. Confirmed not co-dependent — deleting one still leaves the other's test asserting.

**Survivors:** ME2, ME5, MP6. MP6 is a real defect (Section 5). ME2/ME5 are unreachable defensive asserts (see Observations).

### Adversarial-content probes (crafted packs that pass HK-4)

| Probe | Construction | Result |
|---|---|---|
| PROBE-1 | window whose **sole** option's fx = `open_window` (live decider) | **VALIDATES**, then unclosable: pass refused forever, resolve throws (depth-1), auto throws → **game bricked**. Defect F2-R2-1. |
| PROBE-2 | window option `fx: 5` (non-array); also top-level `card.fx: 7` | HK-4 throws raw **`TypeError: number 5 is not iterable`**, not a named `PackLoadRefusal`. Defect F2-R2-3. |
| NUM-OVERFLOW | two `pay amount: 1.5e308` on one seat | load passes (each finite); `deck:draw` **commits `cash: Infinity` and logs the move**; only a later `getStateHash()` throws. Defect F2-R2-2. |
| PROBE-3 | `open_window … gated:false` | validates; pass proceeds past an **open** window; window left open silently. Defect F2-R2-5. |
| PROBE-4 | all seats `eliminated:true` | validates; passes wrap without crash — degenerate but stable (observation; F5/I-12 territory). |
| ADV-REPLAY | windows + auto(eliminated decider) + deck_inject + wrap; rebuild ×2 | **byte-equal** (`e33c850802c1f336` ×3); row carries `packRef` (SUP-1); auto decision present in the row (R-7). PASS. |

---

## 3 · Divergence-injection (CC-6 tail) — check-tiers gate

Injected four import-inversion forms into `packages/engine/src/`; `check-tiers.mjs` caught **all four** (exit 1):
1. bare side-effect import `import '@tabletop/presentation'` → caught (forbidden pkg).
2. relative escape `export * from '../../patterns/src/index.js'` → caught (relative escape).
3. dynamic `import('../../../packs/evil.js')` → caught (relative escape **and** content-imported-by-nothing).
4. dynamic `import('@tabletop/presentation')` → caught (forbidden pkg).

HK-6 tier gate: **PASS** (no F2 regression to the F1 guarantee).

---

## 4 · Drift-score table (0–10; worst dimension named; < 7 blocks)

| Module | Object-model fidelity | Axiom coverage | Base-case support | Extensibility | Worst |
|---|---|---|---|---|---|
| M5 TurnMachine (turn.ts) | 8 | 8 | 8 | 8 | 8 — clean |
| M6 Deck (deck.ts) | 8 | 8 | 8 | 8 | 8 — clean |
| M7 WindowManager (windows.ts) | 8 | 7 | 7 | 8 | **7** — GX-8 "path to decision" gap surfaces here; closure owned at M8 |
| M8 PackLoader (packloader.ts) | 6 | **5** | **5** | 7 | **5 — RETURN**: validates-but-bricks (F2-R2-1), unnamed defect (F2-R2-3), lazy finiteness (F2-R2-2), untested seal (F2-R2-4) |
| M9 EffectEngine (effects.ts) | 8 | 7 | 7 | 8 | 7 — no finiteness invariant at apply (F2-R2-2 engine side); two dead/unreachable defensive asserts |

M8 < 7 on **axiom coverage** and **base-case support** → teeth bite; no new work on M8 (and the F2 R-gate / V-2·V-3 discharge) until raised.

---

## 5 · Defects, severity-ordered (each with a one-line minimal closure)

**F2-R2-1 · BLOCKING — a validating pack can produce a window with no path to decision (GX-8 brick).**
A gated window whose sole option's fx is `open_window` (or whose auto-target option is) passes HK-4, then can never be closed: `resolveWindow` applies at depth 1 → `EffectRefusal` (`effects.ts:148-152`); `autoResolveWindow` hits the same depth wall (or "decider present"); `turn:pass` stays blocked by HK-5 forever. This is the exact "no path to decision (GX-8)" failure NEW-1/DF2-16 closed for the **zero-option** shape only (`packloader.ts:117`). The `trap` fixture (`f2-fixture.ts:35-58`) is itself this pattern, and `f2-replay.test.ts:33-38` routes *around* it — the suite treats the depth refusal as success and never checks the game can still advance.
*Closure:* in `checkFx`'s `open_window` option loop (`packloader.ts:123-129`), push a defect if any inner descriptor's `fx === 'open_window'` — a window option that opens a window is statically dead (depth-1) and leaves no path to decision.

**F2-R2-2 · MAJOR — finite amounts overflow to a non-finite committed, logged state; HK-4's "no illegal value" claim is falsified; the finiteness guard is lazy.**
HK-4 checks each amount is finite (`packloader.ts:83` etc.) but not that arithmetic results stay finite. Two `pay 1.5e308` on one seat make `fxPay` (`effects.ts:87`) produce `cash: Infinity`; `core.submit` freezes, stores, and **logs** it — no hash on the happy path. `canonicalJson` only throws later at `getStateHash()` (`statetree.ts:24-27`), so the illegal state is exposed and the row is written before anything objects; replaying that row throws at the hash step.
*Closure:* guard finiteness at application — in `mapSeat`/the numeric mutators (`effects.ts:75-123`) throw `EffectRefusal` when a result is non-finite — so the illegal value is refused at the mutation, not lazily at hash time.

**F2-R2-3 · MODERATE — HK-4 breaks its "names defects" contract on non-array fx.**
A window option `fx` that is a non-array, non-iterable (`fx: 5`), or a top-level `card.fx` that is a number, makes `for (const inner of (o?.fx …) ?? [])` (`packloader.ts:126`, and `card.fx ?? []` at `:137`) throw a raw `TypeError` instead of a `PackLoadRefusal`. GX-10/R-2 promise a load refusal *naming* the defect; the caller instead gets an unnamed crash.
*Closure:* before the `for…of`, `need(Array.isArray(o?.fx) || o?.fx === undefined, '"fx" must be an array')` (and likewise guard `card.fx`), so malformed shapes are named, not thrown raw.

**F2-R2-4 · MODERATE — wirePack's own seal is unfalsifiable (theater); direct-call content-TOCTOU reopens.**
Deleting the seal at `packloader.ts:201` keeps the suite green (mutation MP6); D8 (`f2-k7-closures.test.ts:252-268`) only exercises `loadPack`'s seal (`:289`), never the public `wirePack(core, rawPack)` door. Confirmed load-bearing: with the seal removed, a post-`wirePack` tamper of the caller's pack leaks into the applier (`A.cash` 2 → 999999). The builder's docstring (`packloader.ts:193-198`) claims this seal — untested.
*Closure:* add a direct-`wirePack` TOCTOU regression (build genesis from a separate copy, mutate `rawPack` after `wirePack`, assert the applied value is the sealed one) — the DF2-8/OBS-B test the internal reviewer wrote for `packGenesis` but not for `wirePack`.

**F2-R2-5 · MINOR — content controls the unvalidated `gated` flag (unregistered; CC-3).**
`fxOpenWindow` reads `gated: d['gated'] ?? true` (`effects.ts:159`); HK-4's `open_window` case validates `kind`/`decider`/`options`/`auto` but never `gated`. A `gated:false` window opens, does not block advance (`openGatedWindows` filters on `w.gated`, `windows.ts:32-33`), and is left open silently. No I-* registers content-supplied gating, and `?? true` only defaults on nullish, so `gated:0` also slips through as a distinct falsy value.
*Closure:* either `need(d['gated'] === undefined || typeof d['gated'] === 'boolean', …)` in HK-4 and register the content-gated interpretation, or drop `gated` from the descriptor and set it by rule.

### Observations (non-blocking; listed per CC-6 "survivors are findings")

- **OBS-1 (ME2 survivor):** the `Object.isFrozen(EFX_V1_1_1)` leg of HK-9 (`effects.ts:55-57`) is dead — EFX is frozen at definition and nothing unfreezes it; its deletion cannot be observed. Harmless, but not falsifiable. Either drop it or add a test that unfreezes-and-applies in a copy.
- **OBS-2 (ME5 survivor):** the mapSeat unknown-seat throw (`effects.ts:77-79`) is unreachable from validated content (HK-4 constrains every seat ref; no fx removes a seat). Defensive only; survival is expected, not theater.
- **OBS-3 (PROBE-4):** a pack with **all** seats eliminated loads (HK-4 requires ≥1 seat, not ≥1 living seat) and wraps rounds without crashing. Degenerate; plausibly F5/I-12 territory, but worth a registered note or a load-time "≥1 living seat" check.

---

## 6 · Coverage cross-check vs the internal reviewer (DF2-1..17)

My battery independently re-killed the guards behind DF2-1 (MW1/MP7), DF2-2 (MT1/MT2), DF2-3 (ME3), DF2-4 (MP1), DF2-5 (MW6/MP8), DF2-6 (MW4), DF2-7 (MP3/MP4), DF2-9 (ME4), DF2-12 (MW2), DF2-16/NEW-1 (MP2), and R-24/HK-9 (ME1). **What both the builder and the internal reviewer missed:** F2-R2-1 (single-recursing-option brick — the sibling NEW-1 left open), F2-R2-2 (overflow committal), F2-R2-3 (unnamed non-array crash), F2-R2-4 (wirePack seal proven only via `loadPack`), F2-R2-5 (unvalidated `gated`). DF2-8's TOCTOU closure and DF2-16's NEW-1 closure are each **narrower than their own stated claim** — the seal was proven on one door of two, and "no path to decision" was closed for one window shape of two.

---

## 7 · What holds (so the fixes stay scoped)

Replay byte-equality (windows + auto + inject + wrap, rebuilt twice); row carries `packRef` (SUP-1); R-7 auto decision lands in the log; depth-1 law on **both** resolve and auto paths; R-24 structural (no `fx*` mutator exported, EFX frozen and un-pushable, docket `spawn_venture`/`draw_card`/`form_relation` absent from EFX and refused at HK-9); both-check law legs independent; HK-6 tier gate catches all four inversion forms; all 24-of-scope refusal + hook tests falsifiable under deletion. V-2/V-3 correctly deferred, un-pinned.

**Hand back to the build session. No repository modifications were made (verified clean at `k7-pass-f2`).**
