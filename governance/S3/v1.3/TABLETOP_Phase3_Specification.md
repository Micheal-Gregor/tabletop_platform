# SPECIFICATION LAYER — PHASE 3 · TABLETOP

*Consolidated Specification Sheet · #MetaFramework Phase 3 fan-out · Partition re-derived
from S2-TABLETOP-v2.0's own seams · v1.0 · 2026-07-25 · Companion:
**CLAUDE_TABLETOP_Phase3.md***

**⚠ CONCEPT DISAMBIGUATION:** TABLETOP only. Never merge with BOTY-repo, ContractLite,
GateControl, or any other concept's partition, seams, or build instruction.

*AUDIT NOTE: facet slices batched under standing approval per the approved partition;
judgment items are flagged in-line and consolidated at the final gate.*

## 1 · Run Overview

| Property | Value |
|---|---|
| S2 anchor | S2-TABLETOP-v2.0 — CLEAR (A1 re-applied; ledger = directedness proof) |
| Partition (ODG-A) | **RESOLVED**: 7 facets over 9 seams (owner-approved 2026-07-25) |
| AE-c6-CF | **TRIGGER FIRED & RESOLVED**: Transport = self-contained lockstep controller with defined consumer interface; UX orchestration declared OUT-OF-PLATFORM |
| Synthesis (S5) | Contradiction path EXERCISED — registry-law vs module-native effects (§5) |
| Conformance (K6) | **PASS** CT-1..CT-6 — with ONE test authored at CT-4 (R-24, §6) |
| Payload | 23 carried + 1 authored refusal tests · 9 deferred vectors (rules stated independently) · 12 hooks consolidated |
| Deliverables | This sheet + CLAUDE_TABLETOP_Phase3.md |

## 2 · Facet Specifications (statuses: ready-for-design unless flagged)

**F1 · Kernel & Determinism** — StateTree (one root; on-state ids; derived-never-stored),
Guard (central legality + typed refusal; two-level pattern), IntentLog (record-after-
success; rebuild; self-heal), RNGStreams (named streams, fixed offsets; human inputs as
arguments). Interfaces fixed; all four ready. Honors: refusal-not-repair, log-as-truth,
stream isolation. Exposes S-1/S-2.

**F2 · Play Engine** — TurnMachine (five phases; wrap-once; end-trigger + Closing slot;
consults Guard AND WindowManager before advance — RE-1 lineage), Deck (living-inject,
reserve, scripted), WindowManager (IWN schema; auto-policy × settlement for absent/
eliminated — the ST-1 composition), PackLoader (validation names defects; EFX-closure at
load; flavor attach), EffectEngine (sole applier; unknown-descriptor refusal; **the S-3
clarified wording from S5: sole applier of EFFECTS, fed by BOTH registry-dispatched
contributions and module-native library effects**). All ready. Honors: wrap-once, window
gating, both-check refusals.

**F3 · Ontology** — KindRegistry + AdmissibilityGate (admission-by-rule; EX-2 predicate),
RoleBinder (role→primitive bindings; unbindable → refuse; TimeSource deferred to ODG-e1),
RelationEngine (five typed relations; formation/dissolution predicates; hook emission →
S-4), SurfaceManager (five topologies; composition-forms-Surface recursion). The 12-kind
Component family + Relation family specified to interface depth. All ready. Honors:
view-never-owns, admitted-node-respec refusal.

**F4 · Rule System** — RuleRegistry (**dispatches CONTRIBUTIONS — S5 clarification**;
precedence snapshot law), HookBus (turn+lifecycle+relation hooks v1.0), ContributionLoader
(versioned validation), StateSlotManager (four reset classes), ExtensionContract (the
governance process; docket standing; history v1.1/v1.1.1), RulesetView (total exposure).
UniqueDef specified as catalog artifact (RE-7 held). All ready. Honors: registry law,
bounded meta, declared state, GovernedVocabulary contract (S-7).

**F5 · Mechanics Library (opt-in per module)** — Venture (sole contract primitive; presets
per pattern tier; completion-effects module-native → EffectEngine per S-3), Routing,
Outfit (viability policies) + Crew, Ledger (balanced-move where loaded), TimedEffects,
ClosingRound (eligibility = content policy per QG1-Q1). All ready. Honors: preset
fidelity (VK-8/V-4), one-vocabulary at the effect level.

**F6 · Presentation (separate package)** — ContractRenderer + JoinRenderer (contracts per
kind; joins per relation), VerbHandler (verb→intent only), SkinBinder (TokenContract;
refusal names missing tokens), **SeatProjector (scoped purity — every read through it)**,
Unboxer (validated reveal), BookletRenderer (RulesetView → booklet), ClockDriver (two-clock
law), Adaptation/A11y (floor + labels split). All ready; realization technique = ODG-p1.
Honors: theater-over-truth (TheaterSync), EP-1′, tokens-only, fidelity = min formula.

**F7 · Edges & Content Tiers** — **Transport: the AE-c6-CF resolution specified** — a
self-contained lockstep controller ({seed,seats,moves} row, active-writer, host-driven AI,
presence, takeover, self-heal) exposing a defined consumer interface (subscribe, submit,
resume); UX orchestration explicitly out-of-platform. PatternLibrary (the preset catalog —
6 VNT · 3 RTM · 9 IWN · 2 TFX + Closing/settlement defaults; ODG-3 shape flagged
implementation-dependent). TierCriterion (CI-enforced dependency direction). Transport
ready; PatternLibrary implementation-dependent (ODG-3).

## 3 · Seam Contracts

S-1..S-9 as priced and approved at C0 (c0-partition.md §2) — carried verbatim as the
cross-facet law; **S-3's wording refined by S5** (below). The seam governs; every facet's
cross-facet dependency above was declared against this table.

## 4 · Object-to-Agent Traceability

Every S2 node → exactly one destination: the 28+12+5+9 family nodes → F1–F7 as §2;
Guard + AdmissibilityGate + ExtensionContract double as K6's evaluator family; TierCriterion
+ SeamSet → C0/T; the payload's bindings → owning facets, verified at K6, manifested in
the CLAUDE.md. **No orphans (CT-1 ✓).**

## 5 · Synthesis Gate (S5) — Contradiction Path EXERCISED

**Tension (genuine, multi-output):** F4 asserts the registry law — all rule dispatch
flows through RuleRegistry, no if-ladders — which read broadly claims ALL effect flows
originate from registry dispatch. F5 asserts library modules apply native effects
(a Venture payoff, a TimedEffect tick) directly through EffectEngine — they are model
behavior, not content contributions. Read naively: either the library bypasses the
registry (F4 violated) or every library behavior must masquerade as a contribution
(F5 distorted, and content/model blur — the god-defense weakens).

**Resolution — precondition disjointness (non-destructive):** the two claims govern
disjoint domains. **RuleRegistry is the sole dispatcher of CONTRIBUTIONS** (content-borne
rules attached to kinds/relations); **EffectEngine is the sole applier of EFFECTS** —
fed by both registry dispatch AND module-native library behavior. The one-vocabulary law
(S-3) binds at the vocabulary level, not the dispatch-source level. Neither claim dropped;
S-3's wording refined accordingly; **and the boundary gains teeth: R-24 authored at CT-4**
(any effect application bypassing EffectEngine → refused). Second candidate (F3
view-never-owns vs F6 tracker display) dismissed as trivial — both facets already agree
by E-3's ST-1. **S5 verdict: CONSOLIDATED.**

## 6 · Conformance Gate (K6) — CT-1..CT-6 **PASS**

CT-1 ✓ (no orphans, §4). CT-2 ✓ — every carried rule honored per facet (§2);
**N/A-by-absence, explicit:** affordance show-disabled-with-reason and device-trust
HALT-and-escalate — no such facets in this S2 (interaction affordances live behind
verb→intent contracts; trust boundaries are Phase-5 production territory). CT-3 ✓ — all
proven-open interiors stay open (ODG-e1, docket, ODG-p1/2, ODG-3/4/5, ODG-SE-01/02); no
invented behavior. **CT-4 ✓ — 23 carried tests bound + ONE authored: R-24
(effect-application bypassing EffectEngine → refused)** — S5's clarified seam demanded
its own guard; authored at CT-4, which is where that decision belongs (precedent:
GateControl's ReadGuard). No guard ships happy-path-only. **CT-5 ✓ (deferred) — all nine
vectors deferred with each pinned value's RULE stated independently of its vector**
(per the SP-5 doctrine now standard): e.g., V-2's rule is AX-4's rebuild law, V-8's rule
is ER1-4×EX-5 composition, V-9's rule is EP-2 theater-sync — no value recoverable only
from its expected output. CT-6 ✓ — the 12 hooks consolidated into one manifest with
owners (CLAUDE.md §hooks). **Under-verified: nothing.**

## 7 · Production Concerns (developer-owned open gates — never resolved here)

Persistence medium (rows/logs) · transport infrastructure (realtime, presence, host
election) · pack distribution/versioning/integrity + content moderation for user-authored
packs · identity/auth · billing/storefront · per-platform packaging · the E-2 asset
pipeline + skin distribution · telemetry · tamper-evidence on the log.

## 8 · Open Decision Gates — Resolved or Carried

**RESOLVED this run:** ODG-A (the partition — C0, owner-approved) · AE-c6-CF (Transport
shape — §2 F7) · the S5 contradiction (ODG-D analogue, exercised genuinely).
**CARRIED (all non-blocking):** ODG-3 pattern-catalog shape (F7/M17) · **ODG-4 BOTY
migration — decided at the Phase 4 C4 anchor, never by momentum** · ODG-5 + ODG-SE-01/02
(abstract/code boundaries) · AE-c12-CF simultaneity · ODG-e1 Clock seam · the EFX docket
(spawn_venture, draw_card, form_relation) · ODG-p1 realization technique · ODG-p2
second-bridge validation.

## 9 · Build Order & Standing Rules → CLAUDE_TABLETOP_Phase3.md

F1 kernel first (the T-service of this concept) → F2 play → F3 ontology → F4 rules
(registry before any dispatch consumer) → F5 library → F7 edges → F6 presentation LAST,
as its own package, touching the engine only through SeatProjector + IntentEmitter.
Full do-not list, refusal/vector/hook tables, and the module-completion checklist travel
in the companion CLAUDE.md — the authoritative build instruction.

*The seams were preserved for this. Now they coordinate the build — the TABLETOP build.*
