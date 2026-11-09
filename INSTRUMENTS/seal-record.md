# Seal record

One section per seal. Each lists the sweep result, what the owner accepted, and what is carried forward to Phase 5's latency / scale / security review.

## seal-1 — 2026-11-09 — approved by owner, 2026-11-09

Sealed paths: files matching packages/*/src/**/*.ts, tests/** present at this tag.

| Step | Result | Detail |
|---|---|---|
| worktree-clean | pass |  |
| reviewed | pass | final review, round 1 (RETURN); the owner's approval closes it |
| full-review | pass | every module's final content has had a full review |
| full-suite | pass | exit 0 |
| rederive-all | pass | exit 0 |
| isolation-tests | pass | exit 0 (OS-12, env cleared) |
| phase4-checks | fail | tags:tag_malformed ; tags:tag_malformed ; tags:tag_malformed ; tags:tag_malformed ; tags:tag_malformed ; tags:tag_malformed  |
| structure-check | pass |  |
| emission-check | pass |  |
| s3-coverage | pass | every specified module is built |
| interface-contract | pass | written |
| declarations-match | pass | signatures, object model and contract agree |

**Accepted as known issues (owner triage, see RESOLUTION_RECORD.md):** phase4-checks

**Carried forward:**

- PC-01 (MOD-03) production concern — persistence medium for rows and logs [production; owner developer; target Phase 5 review]
- PC-02 (MOD-27) production concern — transport infrastructure (realtime, presence, host election) [production; owner developer; target Phase 5 review]
- PC-03 (MOD-08) production concern — pack distribution, versioning and integrity, and content moderation for user-authored packs [production; owner developer; target Phase 5 review]
- PC-04 (MOD-27) production concern — identity and auth [production; owner developer; target Phase 5 review]
- PC-05 () production concern — billing and storefront [production; owner developer; target Phase 5 review]
- PC-06 (MOD-29) production concern — per-platform packaging [production; owner developer; target Phase 5 review]
- PC-07 (MOD-32) production concern — the E-2 asset pipeline and skin distribution [production; owner developer; target Phase 5 review]
- PC-08 () production concern — telemetry [production; owner developer; target Phase 5 review]
- PC-09 (MOD-03) production concern — tamper-evidence on the log [production; owner developer; target Phase 5 review]
- kernel/types completion status BUILT — awaiting K7
- M1 StateTree completion status BUILT — awaiting K7
- M2 Guard completion status BUILT — awaiting K7
- M3 IntentLog completion status BUILT — blocked on V-1/V-2
- M4 RNGStreams completion status BUILT — awaiting K7
- kernel/core completion status BUILT — awaiting K7
- final review finding (round 1) — MOD-09 CC-4: REF-24's frozen test must be able to fail on a genuine bypass. Today 'R-24 · sole applier' (r3-r24-effects.test.ts:43-51) only checks that no export name matches /^fx[A-Z]/. Mutation in .k7/wt: levyCost (library/wire.ts:223) rewritten as a direct seat.cash write. R-24 and all 821 tests stayed green; restored by reset. The property that must hold: no module other than play/effects.ts produces an EFX-typed mutation of seats' cash, favor, assets or sueRights, of decks' draw order, or of windows. It needs a detector that resolves writes to those fields in every engine source file (not a name scan), or an on-path test that fails when a module-native move does not go through EffectEngine.apply. The owner must also reconcile I-137's direct seat.assets writes (outfit.ts:119-180, a capitalize-shaped mutation outside the EffectEngine) with REF-24, on the record. [a Phase 5 gap]
- final review finding (round 1) — MOD-22 CC-2: With the Ledger loaded, every library-mediated cost (crew:hire and outfit:buy, through levyCost at library/wire.ts:221-224) must move as a balanced Ledger post, so that cash ≡ derivedBalances (RC-D, drift-ledger.md:133) and an unbalanced move throws (REF-05). The test that must fail on the current tree: Ledger loaded, a second hire at nonzero cost, then assert seat cash equals derivedBalances and a ledger entry exists. On the current tree this gives cash -7 against derived 0. [a Phase 5 gap]
- final review finding (round 1) — MOD-29 CC-6: HOOK-06's condition 'platform < library' is not enforced. tools/check-tiers.mjs:11-15 treats packages/engine as one tier, so an injected packages/engine/src/kernel/k7probe.ts importing '../library/ledger.js' still passed 'the clean tree passes' (restored by reset). The checker must decide, by resolved path containment, that no file under the platform directories (kernel, play, ontology, rules, transport) imports from packages/engine/src/library. REF-04's suite needs a case that injects exactly that import and must fail. [a Phase 5 gap]
- final review finding (round 1) — MOD-30 CC-2: SEAM-43 requires the booklet to render the RulesetView in full. renderBooklet (render.ts:36-41) must render every vocabulary (name, version, members) and every contribution field the view model exposes (bearer, trigger, condition, effects, slotWrites, slots), with no type-erasing cast. The test that must fail on the current tree: render a registry with one contribution whose condition, effects and declared slots are non-trivial, then assert each field and each vocabulary member appears. [a Phase 5 gap]
- final review finding (round 1) — MOD-11 CC-2: REF-11 / EX-2 leg (b): role binding must be own-key membership in the closed role set. roles.ts:30 currently admits 'constructor' and returns an empty binding for 'toString'. The test that must fail on the current tree: admission of a kind whose roles include a prototype key ('constructor', 'toString', '__proto__') is refused naming the role, and usableBinding on such a key throws RoleRefusal. [a Phase 5 gap]
- final review finding (round 1) — MOD-05 CC-6: The frozen REF-08 test 'R-8 · wrap-once' must fail when the real-path HK-3 call in passSeat (play/turn.ts:78) is deleted. Mutation in .k7/wt: that call removed. select "R-8" stayed green (4/4); only the non-frozen 'D2 · HK-3 on the REAL passSeat path' failed; restored by reset. R-8's forbidden case must drive the orchestrated pass path, not the test-support function forceRoundWrap (turn.ts:94-102). That function's place in production code needs a register row or must leave src. [a Phase 5 gap]
- final review finding (round 1) — MOD-02 CC-5: Every pinned vector (vectors/V-1..V-9.json, owned by MOD-02, MOD-03, MOD-09, MOD-13, MOD-14, MOD-15, MOD-28, MOD-34) lacks impl_sha provenance, so the records cannot show they were computed rather than hand-written. The values themselves re-derive: the suite is green, and V-3 rows 0 and 5 matched an independent hand derivation (own canonical JSON and FNV-1a-64: 462977f6437ccb23, bd4dc98942785f47). Provenance must be recorded and checked by a declared re-derive command. [a Phase 5 gap]
- final review finding (round 1) — MOD-22 CC-2: With the Ledger loaded, every library-mediated cash move must post a balanced Ledger entry. The crew:hire and outfit:buy cost levy must follow the settlement precedent I-137 names, so that cash ≡ derivedBalances after a nonzero-cost hire or buy. Failing test that must exist and pass: under a loaded Ledger with a nonzero-cost pool card, outfit:buy and a second crew:hire each leave the seat's cash equal to derivedBalances and append exactly one balanced entry. [a Phase 5 gap]
- final review finding (round 1) — MOD-02 CC-2: The S-2 row's packRef and seats must be fixed at EngineCore construction and immune to mutation of the objects the caller passed in or received from toRow(). The Guard's seat authority must not move with them. Failing test: host a LockstepController (or EngineCore) with a mutable seats array and packRef, mutate both afterwards (and mutate a returned row), and assert row() and the Guard's seat verdicts are unchanged. [a Phase 5 gap]
- final review finding (round 1) — MOD-09 CC-4: REF-24's frozen test must present a genuine forbidden input: an effect-owned mutation (cash, favor, assets, sueRights, windows, deck inject) applied outside effects.ts, which the check refuses. Use a detector that resolves where those writes occur, not an export-name scan; the name scan may stay as a supplement. Writes the owner admitted (I-137/I-170 asset moves) must be named in the detector's allowance by register row, not slip past it silently. [a Phase 5 gap]
- final review finding (round 1) — MOD-34 CC-1: SEAM-44 must be built: the seeded result HOOK-11 compares against must come from the projected SeatView (MOD-33), not from a caller-supplied string. Failing test: a flourish whose claimed seeded value is absent from or differs from the view's seeded result is refused or flagged, and V-9 re-derives its die from engine state through project(). [a Phase 5 gap]
- final review finding (round 1) — MOD-30 CC-2: The booklet must render the RulesetView in full: vocabularies with members, and each contribution's bearer, trigger, condition, effects, slot writes and declared slots. Failing test: for a registry with a conditioned, slot-writing contribution, every field of renderRuleset(registry) appears in renderBooklet's output. [a Phase 5 gap]
- open owner gate — STATE.json blocked_on: owner: the single seal approval (seal.py apply --approved-by "<owner, date>" --accept-failures, the 36 legacy tags as known issues), or an owner-ordered fix round (owner-round-1) on the final review's twelve findings
- known issue — object_standard.allow packages/engine/src/kernel/rng-stream.ts: OS-2 (an SR-1 entry or a documented exception; K7 confirms the file meets the rule by hand)
- known issue — object_standard.allow packages/engine/src/kernel/rng.ts: OS-2 (an SR-1 entry or a documented exception; K7 confirms the file meets the rule by hand)
- known issue — object_standard.allow packages/engine/src/kernel/statetree.ts: OS-2 (an SR-1 entry or a documented exception; K7 confirms the file meets the rule by hand)
- known issue — object_standard.allow packages/engine/src/library/ledger.ts: OS-2 (an SR-1 entry or a documented exception; K7 confirms the file meets the rule by hand)
- known issue — object_standard.allow packages/engine/src/ontology/relations.ts: OS-2 (an SR-1 entry or a documented exception; K7 confirms the file meets the rule by hand)
- known issue — object_standard.allow packages/engine/src/play/effects.ts: OS-2 (an SR-1 entry or a documented exception; K7 confirms the file meets the rule by hand)
- known issue — object_standard.allow packages/engine/src/play/turn.ts: OS-2 (an SR-1 entry or a documented exception; K7 confirms the file meets the rule by hand)
- known issue — object_standard.allow packages/engine/src/rules/hookbus.ts: OS-2 (an SR-1 entry or a documented exception; K7 confirms the file meets the rule by hand)
