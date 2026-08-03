# CLAUDE.md — TABLETOP Conformance Build (Phase 4/5 repo)

> **⚠ CONCEPT DISAMBIGUATION.** The authoritative Phase-3 build instruction for
> **TABLETOP** only — anchored to S2-TABLETOP-v2.0 via the Phase 3 partition approved
> 2026-07-25. Never merge with BOTY-repo, ContractLite, GateControl, or any other
> concept's partition, seams, tests, or CLAUDE.md. This file governs the Phase 4 repo
> build; it supersedes nothing — CLAUDE_TABLETOP_v2.md remains the Phase-1/2 anchor and
> permanent record. Where this file and the Specification sheet differ, HALT and escalate;
> they were approved together and may not drift apart.

**Anchor chain:** S1-Phase1-TABLETOP-v2.0 → S2-TABLETOP-v2.0 → THIS partition (7 facets /
9 seams, ODG-A resolved). **Spine:** four-tier law · closed governed vocabularies · rules
are data · scoped purity · log-as-truth · theater over truth · refusal-not-repair.

## 1 · Partition (fixed — the build's unit of work)

| Facet | Modules | Seams touched |
|---|---|---|
| F1 Kernel & Determinism | M1 StateTree · M2 Guard · M3 IntentLog · M4 RNGStreams | supplies S-1, S-2 |
| F2 Play Engine | M5 TurnMachine · M6 Deck · M7 WindowManager · M8 PackLoader · M9 EffectEngine | S-3 (applier) · S-5 (load) · S-8 |
| F3 Ontology | ME1–ME5 + Component family (12 kinds) + Relation family (5) + Surfaces | S-4 (emit) · S-5 |
| F4 Rule System | MR1–MR6 + EFX/HookPoints/VerbSets + GovernedVocabulary + UniqueDef (catalog) | S-3 (contributions) · S-4 · S-7 |
| F5 Mechanics Library | M10 Venture · M11 Routing · M12a Outfit · M12b Crew · M13 Ledger · M14 TimedEffects · M15 ClosingRound | S-3 (module-native) · S-8 · S-9 |
| F6 Presentation (separate package) | MP1–MP9 | S-6 ONLY |
| F7 Edges & Content Tiers | M16 Transport (lockstep controller, AE-c6-CF shape) · M17 PatternLibrary · TierCriterion | S-2 · S-9 |

**The S5 boundary law (R-24's ground):** RuleRegistry is the sole dispatcher of
CONTRIBUTIONS; EffectEngine is the sole applier of EFFECTS — fed by both registry
dispatch and module-native library behavior. One vocabulary (EFX v1.1.1) at the effect
level; dispatch source is not the law's subject.

## 2 · Build order (violating it is a defect, not a preference)

**F1 → F2 → F3 → F4 → F5 → F7 → F6.** Kernel first; registry (F4) before any dispatch
consumer; presentation LAST and as its OWN package, touching the engine only through
SeatProjector (reads) + IntentEmitter (intents). F6 in the engine package = an S-6 breach
at the repo level. Transport (F7) consumes only the S-2 row contract and its declared
consumer interface (subscribe, submit, resume); UX orchestration is out-of-platform.

## 3 · Refusal tests (24 — every guard: forbidden input → expected rejection)

| # | Test | Owner (facet) |
|---|---|---|
| R-1 | illegal intent → typed refusal, state byte-unchanged, NOT logged | M2 (F1) |
| R-2 | pack with fx ∉ EFX → load refusal naming the descriptor | M8 (F2) |
| R-3 | runtime unknown descriptor → dispatch refusal, halt-not-skip | M9 (F2) |
| R-4 | upward dependency (content defining behavior; library importing content) → build refusal | TierCriterion (F7) |
| R-5 | unbalanced resource move with Ledger loaded → post throws | M13 (F5) |
| R-6 | advance past an open gated window → refused | M7 (F2) |
| R-7 | skipped eliminated-decider window → refused; auto-policy decides AND logs | M7 (F2) |
| R-8 | second wrap-tick in one round → refused | M5 (F2) |
| R-9 | replay divergence → full rebuild, never partial patch | M3 (F1) |
| R-10 | mutation bypassing Guard → structurally impossible; any path found is a defect | M2 (F1) |
| R-11 | unbindable role → load refusal | ME2 (F3) |
| R-12 | write through a Representation relation → refused (view-never-owns) | ME3 (F3) |
| R-13 | relation without formation predicate → refused | ME3 (F3) |
| R-14 | respecification of an admitted node → refused (supersede on the record) | ME1/ME5 (F3) |
| R-15 | contribution with unknown hook/effect/version → load refusal | MR3 (F4) |
| R-16 | meta-rule reaching beyond declared fields → refused (bounded meta) | MR1 (F4) |
| R-17 | open_window from inside a window (depth > 1) → refused | MR1/M7 (F4) |
| R-18 | write to an undeclared rule-state slot → refused | MR4 (F4) |
| R-19 | render read outside SeatProjector → refused (projection breach) | MP5 (F6) |
| R-20 | animation result ≠ seeded result → theater-mismatch flagged, truth wins | MP8 (F6) |
| R-21 | skin with unbound token → bind refusal naming the missing tokens | MP4 (F6) |
| R-22 | raw value in a presentation contract (non-token) → refused | MP1/MP4 (F6) |
| R-23 | presentation emitting anything but an intent → refused | MP3 (F6) |
| **R-24** | **any effect application bypassing EffectEngine → refused** *(authored at K6 CT-4 — the S5 boundary's guard)* | M9 + MR1 (F2/F4) |

Doctrine: tests are falsifiable — mutation-test each guard (delete the guarded call; the
named test MUST fail). A test that cannot fail verifies nothing.

## 4 · Golden vectors (9 — ALL DEFERRED; compute from the implementation, re-derive before the owning module counts complete; NEVER hand-write)

| # | Vector | The rule, stated independently of the vector | Owner |
|---|---|---|---|
| V-1 | MINIMAL micro-game end-to-end (σ=7, two seats, three cards, ten steps) → final state hash + B-wins-at-+3W | the Stage-2b script + ranking law | F1/F2 |
| V-2 | replay byte-equality | AX-4: (seed, seats, log) rebuilds byte-identical state, twice | M3 (F1) |
| V-3 | EFX dispatch table | EFX v1.1.1 closure: each descriptor → its typed mutation, nothing else | M9 (F2) |
| V-4 | pattern-preset fidelity | VK-8: each preset reproduces its inventory-documented behavior | M17 (F7) |
| V-5 | admissibility decision table | EX-2: the admission predicate decides, per kind | ME5 (F3) |
| V-6 | composed-Surface integrity | ER-e3: composed tiles FORM a Surface (recursion constitutive) | ME4 (F3) |
| V-7 | rule-dispatch order | precedence law: per-firing snapshot, total order (hook, bearer-entry-seq, …) | MR1 (F4) |
| V-8 | the monster room | ER1-4 × EX-5: a contribution registers when its bearer's relation FORMS; effects apply only through EFX | F3×F4 |
| V-9 | the die-tile-page scene | EP-2 theater-sync: displayed result ≡ seeded result across kinds and joins | F6 |

No pinned value is recoverable only from its vector — each rule above stands alone (SP-5).

## 5 · Hook manifest (12 — consolidated per the CT-6 obligation; trigger → condition → block; owners bound)

| # | Trigger | Condition | Block | Owner |
|---|---|---|---|---|
| HK-1 | before any mutation | Guard verdict LEGAL | block | M2 (F1) |
| HK-2 | before log append | intent succeeded | block | M3 (F1) |
| HK-3 | at round wrap | wrap flag unset this round | block + flag | M5 (F2) |
| HK-4 | at pack/contribution load | fx ⊆ EFX ∧ schema valid ∧ all versions known | refuse load | M8 + MR3 (F2/F4) |
| HK-5 | before seat advance | no open gated window (or auto-resolved) | block | M7 (F2) |
| HK-6 | CI import boundary | platform < library < patterns < content | fail build | TierCriterion (F7) |
| HK-7 | before kind admission | EX-2 predicate holds | refuse | ME5 (F3) |
| HK-8 | before relation form | formation predicate holds | refuse | ME3 (F3) |
| HK-9 | before rule dispatch | registry integrity: snapshot taken, contributions only via registry, **no effect path bypassing EffectEngine (R-24's live twin)** | halt | MR1 + M9 (F4/F2) |
| HK-10 | before render read | access through SeatProjector | block | MP5 (F6) |
| HK-11 | at animation complete | displayed result ≡ seeded result | flag mismatch, truth wins | MP8 (F6) |
| HK-12 | before skin bind | token completeness | refuse, name missing | MP4 (F6) |

**Consolidation record (15 named triggers → 12 hooks, on the record, not silent):**
E-1's *pre-load version* folded into HK-4 (same trigger point, one load gate); E-3's
*before representation-write* and E-1's *pre-write declared slot* folded into HK-1 (both
are illegal writes refused at the single mutation gate). Their refusal TESTS remain
separate and separately owned (R-12, R-15, R-18) — the fold merges trigger points, never
obligations. Every hook is load-bearing and must be falsifiable (mutation-tested).

## 6 · Module-completion checklist (a module counts COMPLETE only when ALL hold)

1. Its facet's carried rules cited and honored in code (cite-or-admit — no uncited law).
2. Every refusal test it owns passes AND survives mutation testing.
3. Every deferred vector it owns is computed from the implementation and re-derived once.
4. Every hook it owns is live, wired, and falsifiable.
5. Its seam contracts are exercised by at least one cross-facet test (the seam governs).
6. No open-interior gate was silently resolved (ODGs stay open behind their interfaces).
7. The handoff log's "governed by" column names this file for the work.

## 7 · Open gates (carried — all non-blocking; resolve ONLY at their recorded triggers)

**ODG-4 BOTY migration** (greenfield vs refactor) — decided at the Phase 4 **C4 anchor**,
on the record, never by momentum · ODG-3 pattern-catalog shape — at M17 design · ODG-5 +
ODG-SE-01/02 abstract/code boundaries — at implementation · AE-c12-CF simultaneity —
first universe needing it · ODG-e1 Clock seam — TimeSource binding · the EFX docket
(spawn_venture, draw_card, form_relation) — ExtensionContract cycles only · ODG-p1
realization technique · ODG-p2 second-bridge validation (second universe's skin).
**RESOLVED this run:** ODG-A (partition) · AE-c6-CF (Transport shape) · the S5
contradiction (precondition disjointness + R-24).

## 8 · Production concerns (developer-owned; enumerated, never resolved here)

Persistence medium for rows/logs · transport infrastructure (realtime, presence, host
election) · pack distribution/versioning/integrity + content moderation for user-authored
packs · identity/auth · billing/storefront · per-platform packaging · the E-2 asset
pipeline + skin distribution · telemetry · tamper-evidence on the log.

## 9 · Do not

- Do not build across the partition — one facet at a time, in the §2 order.
- Do not let any facet cross to another except through its recorded seam.
- Do not apply an effect anywhere but EffectEngine (R-24) or dispatch a contribution
  anywhere but RuleRegistry — the S5 boundary is law, not layout.
- Do not put presentation code in the engine package or read outside SeatProjector.
- Do not extend EFX, HookPoints, or VerbSets outside an ExtensionContract cycle.
- Do not repair an illegal intent, log a failed one, or mutate outside the Guard.
- Do not hand-write a golden vector; do not ship a guard without its failing test.
- Do not resolve ODG-4 implicitly by starting to code — it is decided at the C4 anchor.
- Do not respecify an admitted node — supersede on the record.
- Do not merge this file with any other concept's; do not let this file and the
  Specification sheet drift apart.

*Next: `/metaframework:phase4-build` on a fresh repo from the template — C4 anchors on
THIS file + the Specification sheet; ODG-4 is the anchor's first recorded decision.*

**End · CLAUDE_TABLETOP_Phase3.md · Companion: TABLETOP_Phase3_Specification.md**

---


- **Governance:** `governance/Phase4_Conformance_Build_Roster.md` governs the build;
  `governance/Phase5_Utilization_Roster.md` governs environment binding. Read both before work.
- **C4 first.** The first session runs the C4 anchor: verify the handoff's pinned semantics are
  recoverable as rules and every typed interface defines its off-nominal behavior. Record in
  `INSTRUMENTS/C4-anchor-record.md`. Halt-class defects → stop; route upstream via F.
- **Instruments are law.** A module not in `INSTRUMENTS/object-model-and-parameters.md` is not
  written yet — propose it there first. Base cases in `INSTRUMENTS/axioms-and-base-cases.md`
  BEFORE the feature. Every decision the handoff didn't make → the Interpretation Register in
  `INSTRUMENTS/drift-ledger.md` (benign / latent / conflicting), never a silent choice.
- **RC-3 order.** No open body is filled before its resolution is recorded (Register discipline).
  Resolutions are live human decisions, logged in `INSTRUMENTS/RESOLUTION_RECORD.md`.
- **Vectors are computed.** Golden vectors come from the reference implementation, then
  re-derive; deferred vectors block their module's completion in
  `INSTRUMENTS/completion-ledger.md` until discharged.
- **K7 is distinct.** The builder NEVER scores its own conformance. K7 runs as a fresh session
  or subagent with no builder context, adversarially, per the CC-1..CC-7 battery — including
  divergence-injection and mutation tests (delete the guarded call → named tests must fail).
  Trace citations naming a resolution must be conditional on that resolution's live register
  status. Drift score < 7 on any dimension blocks new work on that module (the teeth).
- **Git discipline.** Commit at every approved increment; supersede, never rewrite; tag gates
  (`k7-pass-*`, `resolution-run-*`, `k8-pass-*`). Merges are the human gate — no auto-merge.
- **Backflow.** Handoff defects → `INSTRUMENTS/F-supersession-proposals.md`, taken by the human
  to the Phase 3 chat project as a revision run. Never patch `governance/S3/` in place.
- **Phase 5 in this repo.** Bindings live in `utilization/`, never in the core; the concern
  inventory, discharge record, and K8 readiness run per the Phase 5 roster. The drift ledger
  does not close at deployment.
- **The 3D program (owner-ruled 2026-08-02, I-61):** `governance/3D-ROADMAP.md` governs
  the object-by-object 3D work and SURVIVES SESSION COMPRESSION — a resuming session
  reads it after this file and the instruments, then continues at the first open row.
- **Touch boundaries (owner-requested 2026-08-02):** `governance/ARCHITECTURE.md` maps
  the repo and each increment's LANE — read it before editing anything; out-of-lane
  changes without a register row are defects for K7.
