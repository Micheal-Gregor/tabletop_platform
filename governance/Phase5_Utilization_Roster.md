# Utilization Layer — Phase 5 Roster & Production-Readiness Gate (v0.1 draft, input-agnostic)

*Phase 5 of the #MetaFramework pipeline · Environment binding under governance · Reusable
across concepts · Drafted from the pipeline's own residue: every item phases 1–4 stamped
"developer-owned," "utilization-specific," or "resolved by deployment target," plus the
empirical watch-items from the app-layer build (persistence, secret discipline, hash-lineage).*

Phases 0–4 produce a **concept-agnostic, conformant core**: logic proven, expressed, specified,
built, and verified — deliberately encoding no utilization. Phase 5 binds that core to **one
concrete target environment** and is the only phase permitted to do so. It does not harden the
core by editing it; it hardens the *deployment* by binding each enumerated concern in an
adapter/utilization layer around the core, under the same gate discipline as every other phase.

The spine extends both directions at this layer:

    ∀ binding ∈ Deployment : trace_back(binding) ⊆ enumerated(S4)
    ∀ concern ∈ enumerated(S4) : disposition(concern) ∈ {BOUND, ACCEPTED-RISK, N/A-by-absence}

Nothing is bound that was not enumerated (or registered on discovery); nothing enumerated is
left silently open. "Silently omitted" was forbidden upstream — here it is forbidden at the
moment of truth.

# 1 · What Phase 5 Consumes and Produces

**Input (S4):** the approved Phase 4 exit — conformant code, the four instruments (Object
Model, Axioms & Base Cases, Drift + Interpretation Ledger, Test Strategy + Completion Ledger),
the resolution record, and the **concern inventory**: every production concern (PC-*), every
by-target ODG (e.g. roster-vs-abstract realization, real-base-class-vs-documentation-grouping,
abstract/code boundary), and every deferred hardening item the build logged (persistence,
hash-lineage, tamper-evidence). C5 anchors it; the core is **fixed** — never edited to bind an
environment.

**Outputs:**
- **The bound deployment** — core + utilization adapters in the chosen target environment.
- **The discharge record** — one disposition per enumerated concern: BOUND (with the binding,
  traced), ACCEPTED-RISK (a live human act, recorded with rationale and a revisit trigger),
  or N/A-by-absence (structurally inapplicable, stated).
- **The operations pack** — runbooks derived from the model, not invented: halt-handling (a
  production HALT is a HaltAwait surrender to a named human), incident handling (an incident
  is a halt plus a post-closure ambiguity → an open decision gate, never a silent patch),
  monitoring (the hooks and drift ledger stay live in production), and the
  supersession-upgrade path.
- **Backflow items** — target-environment discoveries that indicate core or spec defects
  travel upstream as supersession proposals (F gate, carried from Phase 4).

# 2 · The Agent Roster

**Fixed roles (every run):**

| Agent | Owns | Decision it owns |
| --- | --- | --- |
| C5 · Anchor / Intake | S4 intake + concern inventory | Is the Phase 4 exit clean — completion ledger green, no undischarged vector, no unresolved blocking gate? Assemble the concern inventory and derive the workstream roster from it. Dirty exit → return to Phase 4; no binding over unverified code. |
| DL · Drift & Trace Service | The four instruments, carried live | The ledger does not close at deployment — production drift is still drift. Always-on. |
| K8 · Production-Readiness Gate | The PR-1..PR-7 battery (§4) | PASS / RETURN per workstream. Run by a distinct reviewer from the binder (AX-2 on the process, carried from K7). |
| F · Backflow Gate | Upstream-defect channel | Target-environment discoveries that implicate the core/spec → supersession proposals; utilization-local fixes stay local. |
| H · Human Gate | — | Approve / revise, live, per-abstraction. Environment choice, every ACCEPTED-RISK, key custody, and anything irreversible are load-bearing — they halt regardless of standing approval. |

**Workstream agents (variable — C5 instantiates from the concern inventory).** The five below
are the recurring shape; a given concept's inventory may collapse or extend them:

| Workstream | Owns (typical concerns) | Carried judgment |
| --- | --- | --- |
| W-ENV · Environment binding | Target runtime, storage, identity provider; every "resolved-by-target" ODG | The one decision everything else keys from. Resolves roster-vs-abstract realization, base-class-vs-grouping, abstract/code boundary — *with justification*, never by default. |
| W-SEC · Security hardening | PC-3 class: authZ (who may grant/revoke standing approval; who records AE resolutions), tamper-evidence on the append-only trace, secret custody | The threat model is **derived, not invented**: the load-bearing invariants and hooks are the asset list — each hook becomes a runtime control; the trace store and seals are the integrity surface. Secrets follow the proven discipline: env-only, never in documents, traces, seals, or chat. |
| W-PERS · Persistence & durability | PC-1 class: standing-approval storage/scope/expiry, trace-store durability, approved-document persistence, hash-lineage | Fail-safe direction is already pinned (SC-4): **missing or unreadable state is UNKNOWN, and UNKNOWN halts** — absent standing is never read as granted, a gap in the trace is a flagged break, never repaired in place. |
| W-OBS · Deployment & observability | PC-4 class: how hooks fire in the target runtime, audit-note sink, monitoring, alerting on halts and drift scores | A hook that cannot be observed firing in the target is not deployed — it is a PR-3 failure. |
| W-OPS · Operations & change | Concurrency (PC-2 class), upgrade path, rollback, incident, the production gate policy | Change is **supersession, never in-place edit**; rollback is superseding back. The halt/batch policy for operational gates is the concept's own GateControl shape where one exists — load-bearing operations halt for a human, mechanical ones batch with an audit note. |

# 3 · Workflow & Control Flow

```
S4 → C5 (anchor + clean-exit check + assemble concern inventory)
        | derives the workstream roster from THIS concept's inventory
        v
   [ W-ENV first — the target choice keys every other binding (human-gated) ]
        v
   [ W-SEC · W-PERS · W-OBS · W-OPS — parallel where independent;
     every binding traced to its concern; every gap → Interpretation Register ]
        v  (all workstreams complete + approved)
   K8 Production-Readiness Gate — PR-1..PR-7, distinct reviewer → RETURN to owning W
        v
   F Backflow Gate — core/spec defects surfaced by the target → supersession upstream
        v
   H Human Gate → bound deployment + discharge record + operations pack → RUN
```

- **Gate policy:** mechanical verifications batch under standing approval with audit notes.
  Load-bearing — halt regardless: the environment choice, every ACCEPTED-RISK disposition,
  key/secret custody decisions, data-migration and anything irreversible, and any PR failure.
- **Regeneration loop:** K8 RETURN names the failing PR test and the owning workstream.
- **Hard halt:** C5 finds the Phase 4 exit dirty (an undischarged vector, an unresolved
  blocking gate) → return to Phase 4. No environment is bound around unverified code.

# 4 · Production-Readiness Battery (K8 · PR-1..PR-7)

Same N/A-by-absence discipline as CT-* and CC-*; "verified in staging" never substitutes for
"verified in the target."

| Test | Question | Failure it catches |
| --- | --- | --- |
| PR-1 Concern-coverage | Does every enumerated concern carry a disposition — BOUND, ACCEPTED-RISK (human act, recorded, revisit trigger), or N/A-by-absence? | The silently omitted production concern — the exact failure the enumeration rule exists to prevent, now at the last exit. |
| PR-2 Binding-trace | Does every binding trace to an enumerated concern or registered discovery? | Un-enumerated infrastructure invention — fidelity (CT-3) at the deployment level. |
| PR-3 Hook-survival | Does every hook demonstrably fire **in the target runtime** — forbidden-transition runs re-executed in the deployed environment? | The hook that existed in dev and silently died in deployment (CC-6's failure mode, one environment later). |
| PR-4 Vector-survival | Do all golden vectors re-derive **in the target** (serialization, hashing, and platform quirks differ)? | A pinned value that drifts across platforms — hash mismatch discovered by a user instead of the gate. |
| PR-5 Failure fail-safety | Under kill/restart/corruption drills: does the append-only trace survive; does missing standing-approval state read as UNKNOWN → HALT; does a trace gap flag a break rather than self-repair? | Fail-open under partial failure — the most dangerous inversion of the pinned direction. |
| PR-6 Supersession-in-production | Has the upgrade path been exercised once — a change landing as supersession, rollback as superseding back, lineage intact? | In-place mutation of sealed history; an upgrade path that exists only on paper. |
| PR-7 AuthZ conformance | Do SoD and the grants model hold in **production identity terms** — approver ≠ counterparty enforced by the deployed identity system; standing-approval grant/revoke restricted to authorized holders; AE-resolution authority bound (closing Phase 4's B-7 gap)? | Four-eyes on paper, one pair of eyes in the identity provider. |

# 5 · Do not

- Do not edit the concept-agnostic core to bind an environment — bindings live in the utilization/adapter layer; a binding that requires a core change is backflow, not a patch.
- Do not bind what was not enumerated — register the discovery first, then bind it (PR-2).
- Do not accept a risk silently — ACCEPTED-RISK is a live human act with rationale and a revisit trigger, on the record (PR-1).
- Do not let staging conformance stand in for target conformance — re-run hooks and vectors where they will actually live (PR-3/PR-4).
- Do not read missing state as permission — absent standing, unreadable registers, gapped traces are UNKNOWN, and UNKNOWN halts (PR-5).
- Do not repair a trace gap in place — flag the break; the chain is evidence, not decoration.
- Do not upgrade by mutation — change is supersession; rollback is superseding back (PR-6).
- Do not put a secret in a document, trace, seal, or chat — env/custody only; a leaked credential is an incident, which is a halt (W-SEC).
- Do not let the binder score its own readiness — K8 runs distinct from the workstreams (AX-2 on the process).
- Do not close the drift ledger at deployment — production drift is drift; the instruments outlive the pipeline.
- Do not automate the human gate — operations inherit the never-automatable rule; the operational halt/batch policy is the GateControl shape, and its load-bearing set halts regardless.
- Do not import another concept's bindings, threat model, or discharge record — re-derive from this inventory.

# 6 · Traceability

Every concern maps to exactly one destination: concern → owning workstream → binding (or
ACCEPTED-RISK / N/A) → PR test → discharge record. Every binding maps back: binding → concern →
the S3 spec that enumerated it → the S2/S1 rule it protects. The no-orphans guarantee now
covers the deployment. Discoveries flow up through F; drift flows into DL; nothing exits the
pipeline unrecorded — because after this phase, there is no later gate to catch it.

# 7 · Reflexive note — deploying the pipeline itself

Running the whole pipeline through Claude Code is itself a Phase 5 run whose target environment
*is* Claude Code: the rosters bind as agent/skill definitions (W-ENV), the approved-document
state as repo files (W-PERS), the trace map and ledgers as committed artifacts (W-PERS/W-OBS),
backflow as supersession commits (W-OPS), and the gate policy as a deployed **GateControl**
instance — the concept built first, because the harness needed it: load-bearing gates halt for
the human, trace-through gates batch with an audit note, UNKNOWN halts. The framework's first
product is the last component of its own deployment.

*The core encodes no utilization. This is the phase that gives it one — on the record.*
