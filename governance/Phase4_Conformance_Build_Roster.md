# Conformance Build Layer — Phase 4 Roster & Code-Conformance Gate (v0.2, input-agnostic)

*Phase 4 of the #MetaFramework pipeline · The governed build · Reusable across concepts ·
v0.1 drafted from the GateControl pilot build (interpretation log B-1..B-10) and the app-layer
control system (drift ledger, axioms & base cases, object model & parameters, test strategy).
v0.2 folds in the eight revisions (RD-1..RD-8) from the full pressure-test run: C4 → K7
(RETURN) → regeneration → R → K7 re-verify (narrow RETURN) → surgical fix → K7 PASS.*

Phases 0–3 prove logic and emit a build instruction; then the project "leaves AI-project
space." Phase 4 is what receives it. It is **not** free-form coding with a good CLAUDE.md —
it is the same machine as the earlier phases pointed at code: an anchored input, a governed
loop, a conformance gate, a human gate, and a trace that never breaks. The spine extends one
layer further:

    ∀ module ∈ Code : trace_back(module) ⊆ components(S3)     (S3 = the Phase 3 spec + CLAUDE.md)

And Phase 4 adds the arrow no earlier phase needed: a **backflow gate**, because the build is
the first place upstream defects become observable (pilot finding B-1: an inverted decision
polarity recoverable only from a golden-vector remark — nothing before code execution could
have caught it).

# 1 · What Phase 4 Consumes and Produces

**Input (S3):** the approved Phase 3 pair — CLAUDE_<Concept>_Phase3.md + Specification docx.
Anchored at intake; never edited, only built and, where defective, **superseded upstream**.

**Outputs:**
- **Conformant code** — built in the mandated order, open bodies behind fixed interfaces.
- **The four standing instruments** (living documents, opened at intake, maintained every step):
  1. **Object Model & Parameters** — the code-level anchor. Rule: *every module appears here
     before it is written; if it isn't here, propose the addition first.* This is CT-1 made
     enforceable at code level.
  2. **Axioms & Base Cases** — the carried rules restated as app-level invariants (each citing
     the S3/S2 rule it descends from) + pre-solved scenarios (input → expected observable
     outcome) as the primary correctness lens. Base cases are written **before** the feature.
  3. **Drift Ledger** — the running register of divergence, each entry scored (object-model
     fidelity · axiom coverage · base-case support · extensibility) **with teeth**: no new
     work on a module scoring < 7 until the score is raised. Plus an **Interpretation
     Register**: every decision the handoff didn't make (B-1..B-10 class), classified
     benign / latent / conflicting — the Stage 2b Assumption Exposure Log, re-instantiated at
     code level.
  4. **Test Strategy & Completion Ledger** — the layered harness (engine conformance / unit /
     base-case) plus the per-module CT-checklist table showing exactly which modules are
     COMPLETE, which are blocked on deferred vectors, which are OPEN awaiting resolution.
- **Resolution record** — human-gated dispositions of open bodies, fired ODGs, deferred
  vectors, and production concerns.
- **Backflow items** — handoff defects packaged as supersession proposals to Phase 3 (or
  deeper), never fixed silently in code.

# 2 · The Agent Roster

Fixed roles, same granularity test as Phase 3 (an agent exists where a judgment can resolve
more than one way):

| Agent | Owns | Decision it owns |
| --- | --- | --- |
| C4 · Anchor / Intake | S3 intake + handoff well-formedness | Re-run the halt **on the handoff itself**, with a concrete probe list (RD-3): for EACH pinned value, restate its rule WITHOUT the vector — recoverable?; for EACH typed interface, name the off-nominal input (unenumerated member, marker family with no negative case, genesis case, default under openness) — does the handoff answer it? Malformed → blocking return to Phase 3. |
| B* · Build agents | One per facet, in the mandated build order | Everything within the facet, against the seams; every un-made decision → Interpretation Register, never silently chosen. |
| DL · Drift & Trace Service | The four instruments + the module→S3 trace map | None autonomous — the shared service every agent writes to. Always-on. Analogue of T. |
| K7 · Code-Conformance Gate | The CC-1..CC-7 battery (below) | PASS / RETURN per module. **Run by a distinct session/agent from the builder** — the builder never scores its own drift (AX-2 applied to the process itself). Distinct means (RD-6): a fresh context with no builder transcript, always; a different model or human reviewer for load-bearing modules. Every builder "verified/complete" claim is an assertion for K7 to falsify, never accept (RD-2). |
| R · Resolution Run | Open bodies, fired ODGs, deferred vectors, production concerns | Disposition each through the Register (RC-3 discipline): record the resolution first, fill the body second. Human-gated per item. |
| F · Backflow Gate | Upstream-defect channel | Classify each Interpretation Register entry: utilization shape (stays local) vs handoff defect (→ supersession proposal upstream). Never edits S3 in place. |
| H · Human Gate | — | Approve / revise. Live, per-abstraction. The drift-teeth rule is its standing delegation: score ≥ 7 batches under standing approval; < 7, open-body fills, AE/ODG resolutions, and spec supersessions **halt regardless** — the load-bearing set of this phase. |

# 3 · The Code-Conformance Battery (K7 · CC-1..CC-7)

CT-1..CT-6 verified the *spec*. CC-1..CC-7 verify the *code against the spec* — same
N/A-by-absence discipline throughout:

| Test | Question | Instrument |
| --- | --- | --- |
| CC-1 Code-trace | Does every module trace to an S3 component (and transitively to S2)? Machine-checkable: module ∉ Object Model → build fails. | Object Model & Parameters |
| CC-2 Carried-rule | Does the running code honor every carried axiom? Rules absent by structure → N/A-by-absence. | Axioms & Base Cases |
| CC-3 Fidelity | Does the code add behavior S3 never specified — beyond *registered* utilization shapes? An unregistered invention fails; a registered interpretation passes pending backflow review. | Interpretation Register |
| CC-4 Refusal-execution | Does every refusal test **run and pass** — not merely appear in the spec? Forbidden input → observed rejection. | Test harness |
| CC-5 Vector-discharge | Is every computed vector re-derived from the implementation? Is every *deferred* vector now computed (this is the phase deferral discharges into)? A module with an undischarged vector is NOT COMPLETE — by rule, indefinitely. | Completion Ledger |
| CC-6 Hook-wiring | Do the hooks actually fire? Wiring proof requires BOTH (RD-2/RD-8): **divergence-injection** (force the guarded component to misbehave — a lying predicate, a suspended register — and prove the hook catches it on the real orchestrated path) AND **mutation testing** (delete the guarded call / invert the order in a throwaway copy → named tests MUST fail; presence-of-calls plus green tests is not proof). Where a rule is mechanically checkable, promote it from advisory prose to a **CI hook** that fails the build. | Hook harness + CI |
| CC-7 Drift-score | Quantified alignment ≥ 7 on all four dimensions, scored by a **distinct reviewer**, with the merge-blocking teeth. Anchored rubric (RD-5) so scores compare across reviewers: 9–10 = conforms, no known gaps; 7–8 = conforms with registered interpretations / cosmetic drift only; 5–6 = a demonstrated invariant gap or unregistered invention (RETURN); ≤4 = structural divergence from the model. This is the graduated, code-level analogue of PS_OOP admission. | Drift Ledger |

# 4 · Workflow & Control Flow

```
S3 → C4 (anchor + handoff well-formedness halt)
        | opens the four instruments; derives the module build order from S3
        v
   [ B agents — mandated order; every step: base cases FIRST, then code,
     then self-review appends to the Drift Ledger + Interpretation Register ]
        v  (per module, or per governed increment)
   ┌─► K7 Code-Conformance Gate — CC-1..CC-7, distinct reviewer ─► RETURN loops to owning B
   │        v
   │   R Resolution Run — human-gated dispositions (unblocks NOT-COMPLETE modules,
   │        v              discharges deferred vectors)
   └── resolved/discharged modules RE-ENTER K7 (the K7 ⇄ R loop, RD-1 — a module
        v   whose vector was deferred CANNOT pass CC-5 until R runs, then must re-verify)
   F Backflow Gate — handoff defects → supersession proposals upstream
        v
   H Human Gate → conformant code + instruments + resolution record
```

- **Gate policy (builder mode):** increments batch under standing approval with a recorded
  audit note; the load-bearing set halts regardless: drift < 7, filling an open body,
  resolving an AE/ODG, computing a deferred vector, any CC failure, any spec supersession.
- **Regeneration loop:** K7 RETURN names the failing CC test and the owning module — exact
  analogue of K6's return-to-facet.
- **Hard halt:** C4 finds the handoff under-determined (a B-1-class pinned value with no
  recoverable rule) → blocking return to Phase 3. No building over ambiguous semantics.

# 5 · Do not

- Do not write a module that is not yet in the Object Model & Parameters — propose first (CC-1).
- Do not make an interpretation silently — register it, classify it, and let F route it (CC-3).
- Do not let the builder score its own drift — the conformance reviewer is a distinct agent/session (AX-2 on the process).
- Do not add features on top of a module scoring < 7 — raise the score first (the teeth).
- Do not fill an open body without recording its resolution through the Register first (RC-3, carried).
- Do not count a module complete while any of its vectors is deferred-undischarged (CC-5).
- Do not trust a hook that has never fired — prove wiring with a forbidden-transition run (CC-6).
- Do not leave a mechanically-checkable rule advisory — promote it to a CI hook (CC-6).
- Do not ship a base case that cannot be expressed as a test — that is a signal the object model is wrong; fix the model (backflow), don't skip the test.
- Do not fix an upstream defect silently in code — supersede the upstream document through F.
- Do not let an interpretation implement an open body's interface without linking it to that AE in the register at write time — it dies or is sanctioned when the AE resolves, never floats (RD-4).
- Do not stamp a trace citation naming a resolution unless that resolution's register status is RESOLVED at stamp time — a citation is itself a claim; false provenance in an append-only store is worse than none (RD-7).
- Do not accept presence-of-calls + green tests as hook wiring — mutation-test it: delete the guarded call in a throwaway copy and named tests must fail (RD-8).
- Do not edit S3 in place — it is fixed at anchor, superseded never patched.
- Do not close any gate without a live human decision — no defaults, timeouts, batch approvals.

# 6 · Traceability

Every S3 element maps to exactly one Phase 4 destination: modules → B agents (built) → K7
(verified) → Completion Ledger (statused); open bodies/ODGs/deferred vectors/production
concerns → R (dispositioned); handoff defects → F (superseded upstream); everything → DL
(traced). The no-orphans guarantee now reaches code, and — through F — the pipeline finally
learns from its builds, the way v3 → v3.1 absorbed the verification-handoff rule.

*The spine was preserved for this. Now it survives contact with the code.*
