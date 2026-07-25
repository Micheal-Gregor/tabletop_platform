# K7 EXTERNAL CONFORMANCE REPORT — 1 (TABLETOP Phase 4, F1 kernel)

*Independent K7 audit · Round 1 of this multi-phase build · 2026-07-25 · Reviewer held no
builder context. Read/ran/mutated only; the repo working tree was never edited (the trace
depends on the reviewer never holding the pen).*

**Scope audited:** the only built facet, **F1 Kernel & Determinism** (`packages/engine` —
kernel/types, M1 StateTree, M2 Guard, M3 IntentLog, M4 RNGStreams, kernel/core). F2–F7
modules are unbuilt; `packages/patterns` and `packages/presentation` are empty `export {}`
scaffold barrels.

**Environment:** `npm install` clean · `npm run ci` → tiers OK, `tsc -b` exit 0,
**Vitest 24/24 green**.

---

## 1 · Per-CC verdict (evidence: file:line)

| CC | Verdict | Evidence |
|---|---|---|
| **CC-1 Code-trace** | **PASS** | All 6 engine modules trace to an S3 F1 node and appear in `object-model-and-parameters.md:10-15`: types→S3 F1/I-1/I-2, M1-M4→`S3 F1·M1-4 ← S2`, core→S-1 seam. No `src/` module is absent from the instrument. *Observation only:* the two empty package barrels (`packages/patterns/src/index.ts`, `packages/presentation/src/index.ts`) are `src/` files with no instrument row — benign scaffold for unopened F6/F7 slots (Stack resolution, `RESOLUTION_RECORD.md:11`), but strictly uninstrumented. |
| **CC-2 Carried-rule** | **PASS** | GX-1..6 honored in *running* code, verified by execution + mutation. GX-1 gate `core.ts:118-125`; GX-2 typed refusal `guard.ts:42-61`; GX-3/4 log-after-success + rebuild `core.ts:134-163`, `intentlog.ts:22-24`; GX-5 stream isolation `rng.ts:32-34` (proven `rng.test.ts:15-24`); GX-6 derived-never-stored / frozen exposure `statetree.ts:11-19`. |
| **CC-3 Fidelity** | **PASS** | Every kernel behavior beyond the S3 text is a **registered** interpretation: I-1 (packRef on row — now *sanctioned* by SUP-1), I-2 (genesis injection), I-4/I-4′ (mulberry32/FNV fold + 32-bit caveat), I-5/I-5′ (FNV-1a hash + non-finite throw), I-6 (applier-misbehavior throw), I-7 (seat-from-row). No unregistered invention found. |
| **CC-4 Refusal-execution** | **PASS** | `npm test` runs the F1-owned refusals with genuine forbidden inputs and **non-vacuous** assertions: R-1 four cases each assert typed code **+ state hash unchanged + log length unchanged** (`r1-refusal.test.ts:22-27`); R-9 divergence throws + no partial state (`r9-divergence.test.ts:52-58`); R-10 deep-freeze throws at root & depth (`r10-structural.test.ts`). R-2..R-8, R-11..R-24 are owned by **unbuilt** facets → **N/A argued from absence** (those modules do not exist; not assumed). |
| **CC-5 Vector-discharge** | **PASS** | F1's vectors V-1, V-2 are **DEFERRED-UNDISCHARGED and correctly block M3** (`completion-ledger.md:12`) — dischargeable only once F2 can run the MINIMAL game. GBC-3 *computes* the hash from the implementation (`r9-divergence.test.ts:35-38`), never asserts a literal. Suspicion grep for pinned 16-hex hashes / long `toBe()` literals across `packages/**` → **none**. |
| **CC-6 Hook-wiring** | **PASS w/ 1 finding** | Both F1 manifest hooks are **load-bearing** under mutation (MUT-A, MUT-B below kill their named tests). `check-tiers.mjs` catches **all five** import-inversion forms. **Finding:** the non-finite hash throw (I-5′/D-6, `statetree.ts:23-27`) is **unfalsifiable** — deleting it leaves the suite 24/24 green (MUT-H). It is not one of the 12 manifest hooks, so not *hook-theater* by the manifest's letter, but it violates the falsifiability doctrine ("a test that cannot fail verifies nothing"). |
| **CC-7 Drift-score** | **PASS** | All built modules ≥ 7 on every dimension (table below). Teeth stay released; F2 may proceed. |

---

## 2 · Mutation-test log (throwaway `cp -r`; ✓ = named test failed as required, ✗ = survived)

| Mut | What I broke | Named test(s) run | Result | Verdict |
|---|---|---|---|---|
| **A** | deleted `hookHk1BeforeMutation(verdict)` call, real path (`core.ts:125`) | hooks.test.ts | **Failed 1** | ✓ HK-1 load-bearing (the on-path K7-recipe test is the true detector — the ghost/no-applier test alone would *not* have caught this; D-1's original theater) |
| **B** | deleted `hookHk2BeforeLogAppend(next)` (`core.ts:135`) | hooks.test.ts | **Failed 1** | ✓ HK-2 load-bearing |
| **C** | forced `Guard.check` → always `{legal:true}` | r1-refusal.test.ts | **Failed 4** | ✓ refusal path real |
| **D** | made `freezeDeep` a no-op (`statetree.ts:11`) | r10-structural.test.ts | **Failed 3** | ✓ R-10 structural half real |
| **E** | removed clone+freeze aliasing sever (`core.ts:114-116`) | gx3-log-integrity.test.ts | **Failed 2** | ✓ D-2 fix real; log truth-stable |
| **F** | made `rebuild` swallow divergence (`core.ts:158-160`) | r9-divergence.test.ts | **Failed 1** | ✓ R-9 all-or-nothing real |
| **G** | deleted seat-legality check (`guard.ts:47-49`) | r1 + gx3 | **Failed 1 + 2** | ✓ I-7 row-seat law real |
| **H** | deleted non-finite hash throw (`statetree.ts:23-27`) | **full suite** | **24/24 GREEN** | **✗ THE FINDING — guard has no falsifying test** |
| check-tiers ×5 | bare import · relative-escape · dynamic `import()` · `require()` of packs · `export…from` | `node tools/check-tiers.mjs` | all **exit 1** | ✓ HK-6 catches every specifier form (D-4 robust) |

The one mutation that did **not** produce a failing test (MUT-H) is the finding — everything else is genuinely wired.

---

## 3 · Drift-score table (0–10 per dimension; worst named). Rubric: 9–10 clean · 7–8 registered-interp/cosmetic · 5–6 invariant gap (RETURN) · ≤4 structural.

| Module | Object-model fidelity | Axiom coverage | Base-case support | Extensibility | **Worst** |
|---|---|---|---|---|---|
| kernel/types | 9 | 9 | 9 | 9 | **9** |
| M1 StateTree | 9 | 8 | **7** ← non-finite invariant untested (MUT-H) | 8 | **7** |
| M2 Guard | 8 | 9 | 9 | 8 | **8** |
| M3 IntentLog | 8 | 8 | 8 *(NOT-COMPLETE by rule: V-1/V-2 deferred — separate from score)* | 8 | **8** |
| M4 RNGStreams | 8 | 9 | 9 | **7** ← 32-bit stream-name fold (I-4′ caveat) | **7** |
| kernel/core | 8 | 8 | 8 *(obs-1 undefined-return, registered)* | 8 | **8** |

**Worst dimensions named:** M1 base-case-support (7, the untested non-finite guard) and M4 extensibility (7, the registered 32-bit fold). **No dimension < 7 → drift teeth stay released.**

---

## 4 · Severity-ordered defect list (each + one-line minimal closure)

1. **[Moderate · non-blocking] Unfalsifiable non-finite hash guard (CC-6 / falsifiability doctrine).** `canonicalJson`'s throw on NaN/Infinity (`statetree.ts:23-27`, the I-5′/D-6 fix that stops a corrupt numeric state from hashing equal to a null state) survives deletion with 24/24 green. → *Closure:* add a test asserting `hashState` **throws** on a state containing a non-finite number, and that such a state's canonical form ≠ a null-bearing state's — one test discharges it.
2. **[Minor · OPEN, builder-registered] obs-1 undefined return.** A verdict `{legal:false}` with a missing `refusal` makes `submit` return `undefined`, outside `SubmitResult` (`core.ts:119-120`). Unreachable via the real Guard; still open in code as a next-touch obligation (`drift-ledger.md:37`). → *Closure:* defensive `throw` when `legal===false` but `refusal` is absent.
3. **[Cosmetic] Stale test count.** `completion-ledger.md:16` states "18/18 tests green"; actual suite is 24/24 (the round-1 count, corrected in the K7 notes below it). → *Closure:* annotate the builder note as superseded (append-only), e.g. "(round-1 count; now 24/24)".
4. **[Cosmetic] Uninstrumented scaffold barrels (CC-1).** `packages/{patterns,presentation}/src/index.ts` (`export {}`) have no object-model row. → *Closure:* one line in the instrument that empty package barrels are ratified scaffold placeholders until their F6/F7 slot opens.

None is a structural divergence, a Guard-bypass, a log-tamper path, a partial-state leak, a hard-coded vector, or a silently-resolved ODG (ODG-4 is on the record, owner-approved at C4 — `RESOLUTION_RECORD.md:7`). Adversarial probes (API-mutation-without-Guard, post-success aliasing, divergence partial-state, hash format/collision faking equality, tier/S-6 breach) all came back clean or covered by a registered interpretation.

---

## 5 · Overall: **PASS**

The F1 kernel conforms. Every manifest hook it owns (HK-1, HK-2) and its tier gate (HK-6)
are demonstrably load-bearing — not green theater; every owned refusal (R-1, R-9, R-10)
executes against genuine forbidden inputs with non-vacuous assertions; replay byte-equality,
structural immutability, and stream isolation hold under mutation; no unregistered invention
and no hand-written vector exists. This independent re-run reproduces the builder's round-2
PASS **and adds one gap it missed** — the unfalsifiable non-finite hash guard (MUT-H) — which
is a coverage defect on a correct, present integrity check, not a live divergence, hence
non-blocking.

**Standing conditions carried forward (not defects):** **M3 remains NOT-COMPLETE by rule**
until V-1/V-2 discharge against F2 — the ledger is working correctly, not failing.
Recommend the builder close punch-list items 1–2 before or alongside F2 so the integrity
guard and the `submit` contract don't rot behind a green suite.

*Report handed back to the build session. No commit, no edit, no "help" — the repo working
tree was clean throughout; all mutation was confined to a discarded /tmp copy.*
