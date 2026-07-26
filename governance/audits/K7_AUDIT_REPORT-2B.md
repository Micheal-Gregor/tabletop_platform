# K7 EXTERNAL AUDIT — ROUND 2 RE-VERIFICATION · Facet F2 (Play Engine)

**Repository:** tabletop_platform @ HEAD `8a30f2c` ("External audit 2 (F2) closures EXT2-1..6").
**Predecessor:** my round-2 report, now archived at `governance/audits/K7_AUDIT_REPORT-2.md`.
**Role:** independent K7 reviewer — read · run · mutate · never fix, never commit.
**Task:** falsify each claimed closure adversarially. The diff is not proof; every closure was re-probed with my own reconstructed inputs **and** mutation-tested (delete the new guard → the named test must fail). Original repo verified byte-clean after the run (`git status` empty, still at `8a30f2c`).

## Baseline (reproduced)
- `npm install` clean; `npm test` → **85 passed / 85** (17 files) — matches the builder's claim.
- `node tools/check-tiers.mjs` → `HK-6 tier boundary: OK`.
- Diff `8493a59..8a30f2c` touches **only** `effects.ts` (+48/−8) and `packloader.ts` (+25). `windows.ts`, `turn.ts`, `deck.ts`, and `tools/check-tiers.mjs` are **unchanged** — my round-2 PASS verdicts for those modules and the HK-6 gate carry forward unre-litigated.

## OVERALL: **PASS** — all six findings (F2-R2-1..5 + OBS-1/3) verified genuinely closed and falsifiable.

---

## Per-finding re-verification

Two evidence types per finding: **(P)robe** = my own crafted input passing against the fixed code; **(M)utation** = I deleted the new guard in a throwaway copy and confirmed named tests fail (green-after-mutation would be the finding).

### F2-R2-1 (was BLOCKING) — statically-dead nested windows → **CLOSED**
Fix at `packloader.ts:137-148`: inside the window-option fx loop, `inner?.fx === 'open_window'` pushes a `"statically dead under the depth-1 law (no path to decision)"` defect. Trap content moved out of `F2_PACK` into engine-side `forgedTrapGenesis` (`f2-fixture.ts:46-69`) so runtime R-17 stays on-path.
- **(P)** My three reconstructed packs all load-refuse with `/statically dead/`: (a) sole-recursing-option; (b) multi-option where only option[1] recurses; (c) **the auto-target option recurses (option[0] safe, auto=1)** — a case neither the builder's tests nor my round-1 probe covered; still caught. A legal single-window control pack still loads.
- **(M) M-DEAD** (neuter the check): **KILLED** — 5 named tests fail (builder's 2 + my 3).
- **(M) M-DEPTH1** (runtime depth-1 `>=1`→`>=2`, my ME3): **KILLED** — GBC-16 unit **and** the two on-path-through-`core.submit` tests: GBC-16 end-to-end (forged-genesis `window:resolve`) and D3 (forged-genesis `window:auto`). Both resolve and auto legs still die. The refactor to forged genesis preserved runtime falsifiability.

### F2-R2-2 (was MAJOR) — finite-in ≠ finite-out overflow → **CLOSED**
Fix at `effects.ts:60-66` (`assertFiniteResult`) called at every numeric mutation: `fxPay` both legs (`:97,:103`), `fxGrantFavor` (`:125`), `fxLevy` table + scoped (`:142,:149`). Refuses at application, not lazily at hash time.
- **(P)** Two separate `1.5e308` draws: first commits + logs (log length 1, state hashable); the **second draw refuses** with `EffectRefusal … "seat \"A\" cash overflowed to a non-finite value"`; state hash **unchanged** and still computable; log **still length 1**. Single-card-two-pays variant: whole draw refused, **log length 0**, state hashable. I additionally rebuilt the post-refusal row twice → byte-equal (`fe397f74d63919a4`): **no lazily-poisoned rows can exist**.
- **(M) M-FINITE** (neuter `assertFiniteResult`): **KILLED** — builder's R2-2 + both my overflow probes fail.

### F2-R2-3 (was MODERATE) — non-array fx → unnamed TypeError → **CLOSED**
Fix at `packloader.ts:158-159` (card.fx) and `:133-136` (option fx): array-shape checked and **named** before any `for…of`.
- **(P)** `card.fx: 7` → `PackLoadRefusal` naming `junk`; option `fx: 5` → `PackLoadRefusal` naming `option 0`. Extra probe the builder didn't write — option `fx: "abc"` (iterable-but-wrong string, my round-1 concern that it would char-iterate into `fx∉EFX` noise): now a clean `"fx" must be an array, got "abc"`. **No raw TypeError on any shape.**
- **(M) M-NONARR-CARD** and **M-NONARR-OPT** (neuter each): both **KILLED** (raw TypeError returns → tests asserting `PackLoadRefusal` fail).

### F2-R2-4 (was MODERATE, theater) — wirePack's own seal unfalsifiable → **CLOSED**
Same seal code (`packloader.ts:226`) but now a **direct-wirePack TOCTOU regression** exists (`f2-ext2-closures.test.ts:119-138`): genesis built from a separate copy so only wirePack's door is under test; post-`wirePack` tamper asserted inert.
- **(M) M-SEAL** (delete the seal → `const pack = rawPack`) — in round 2 this **SURVIVED**; now **KILLED** by the new direct-call regression (tampered `999999` leaks vs sealed `3`). The seal is now load-bearing *and* proven.

### F2-R2-5 (was MINOR, unregistered) — content-controlled `gated` → **CLOSED** (I-19 registered)
Fix: `packloader.ts:117` refuses any content-declared `gated` (`"gated" is engine-reserved`); `effects.ts:190-193` hard-codes `gated: true` in `fxOpenWindow`. I-19 registered in the drift ledger (line 66).
- **(P)** `gated:false` → load refusal `/engine-reserved/`; **`gated:true` also refused** (the check rejects the *presence* of the field, not just the value — correct); at runtime the opened window carries `gated:true` and blocks pass.
- **(M) M-GATED** (neuter the load check): **KILLED**.

### OBS-1 — dead `isFrozen` leg in HK-9 → **REMOVED & CONFIRMED**
`effects.ts:55-57`: the unobservable `Object.isFrozen` branch is gone (a frozen array cannot be unfrozen in JS). The vocabulary seal is still proven independently: `EFX_V1_1_1` is `Object.freeze`d at definition (`:18`), `push('spawn_venture')` throws, and the docket members `spawn_venture`/`draw_card`/`form_relation` are absent from EFX — all re-asserted by my probe and by the retained R-24 structural test. HK-9's membership gate itself remains falsifiable (round-2 ME1 unaffected). OBS-2 (mapSeat defensive throw) correctly **retained** and registered as expected-survivor defensive depth (EXT2-6) — unreachable from validated content, so its survival is not theater.

### OBS-3 — all-eliminated pack loadable → **CLOSED**
`packloader.ts:63-66`: a pack whose seats are all `eliminated:true` is refused (`"no LIVING seat"`).
- **(P)** all-eliminated → refusal `/LIVING seat/`; a single-living-seat pack still loads (not over-refused).
- **(M) M-NOLIVE** (neuter the check): **KILLED**.

---

## Mutation-test log (throwaway copy; green-after-mutation = finding)

| Mutation | Target | Result |
|---|---|---|
| M-DEAD | R2-1 statically-dead check (`packloader.ts:141`) | KILLED (5 tests) |
| M-DEPTH1 | R-17 depth-1 `>=1`→`>=2` (`effects.ts:178`) | KILLED (GBC-16 unit + resolve on-path + auto on-path) |
| M-FINITE | R2-2 `assertFiniteResult` (`effects.ts:63`) | KILLED (3 tests) |
| M-NONARR-CARD | R2-3 card.fx array check (`packloader.ts:158`) | KILLED (2 tests) |
| M-NONARR-OPT | R2-3 option.fx array check (`packloader.ts:133`) | KILLED (3 tests, incl. my string probe) |
| M-SEAL | R2-4 wirePack seal (`packloader.ts:226`) | KILLED (round-2 survivor now dies) |
| M-GATED | R2-5 gated engine-reserved (`packloader.ts:117`) | KILLED (3 tests) |
| M-NOLIVE | OBS-3 no-living-seat (`packloader.ts:63`) | KILLED (2 tests) |

**Zero survivors.** Every new guard is load-bearing and falsifiable.

## Regression check on prior guarantees
- Depth-1 refactor to forged genesis did **not** weaken the runtime R-17 proof — both resolve and auto legs still die under M-DEPTH1, on-path through `core.submit`.
- The R2-1 static check is complete for content (open_window is the only fx carrying nested fx; a nested open_window is caught at the option level before recursion) and does not over-reject legal single-window packs.
- Replay byte-equality, `packRef` on the row, R-7 auto-in-log, R-24 structural, both-check law, HK-6 tier gate (unchanged tool) — all still hold from round 2.

## Drift-score movement (F2)
| Module | Round-2 worst | Now | Note |
|---|---|---|---|
| M8 PackLoader | **5 (RETURN)** | **8** | HK-4 now names non-array defects, rejects statically-dead windows, engine-reserves gating, refuses no-living-seat; seal falsifiable |
| M9 EffectEngine | 7 | **8** | finiteness enforced at application; dead isFrozen leg removed |
| M5 / M6 / M7 | 8 / 8 / 7 | 8 / 8 / 7 | unchanged (files untouched) |

All F2 dimensions now ≥ 7 — the teeth release.

## Verdict: **PASS**
All six round-2 findings are genuinely closed: each fix is present, each is falsifiable (its deletion fails named tests), and my independent reconstructed probes — including three cases beyond the builder's own tests (auto-target-recursing window, string-typed option fx, `gated:true` rejection) — all behave correctly. No new F2 defect surfaced during re-verification. Standing carry-forwards unchanged: V-2/V-3 discharge at the owner's R gate; packRef-mismatch-at-rebuild remains an F7 obligation.

**No repository modifications were made (verified clean at `8a30f2c`).**
