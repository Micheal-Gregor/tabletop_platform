# Conformance Build Layer — Phase 4 Roster & Code-Conformance Gate (v0.14, input-agnostic)

*Phase 4 of the #MetaFramework pipeline · The governed build · Reusable across concepts ·
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

---

# v0.3 amendments — RD-9..RD-16

*These amend §5's regeneration loop and §3's battery discipline. Where v0.2 says "the K7 ⇄ R
loop … RETURN loops to owning B" and "re-enter K7", RD-9 SUPERSEDES that mechanics. Everything
else in v0.2 stands.*

- **RD-9 · The round cap.** The unbounded K7 ⇄ R loop converges on exhaustion, not correctness
  (observed: six rounds with a floating exit condition). Superseding mechanics: **PASS, or ONE
  builder fix round + ONE K7 re-check, then everything still open goes to the OWNER as a triage
  list** (fix now / known issue / won't-fix). No round 3, ever. A slice still returning at the
  cap is a finding about its scope.
- **RD-10 · Builder battery before K7.** The builder re-plants the defect shapes its tests
  exist to kill (plus any a prior K7 found) BEFORE invoking K7 — after committing the slice
  (an untracked tree cannot be git-restored; a battery with silent restore failures proves
  nothing; restores are verified against HEAD and the run aborts on failure). Build-only kills
  get a compiler-evading re-plant that must die by TEST. Observed: "BUILT & GREEN" with 9/16
  mutation survival.
- **RD-11 · Tag and closure discipline.** Tag only the tree K7 actually reviewed. A gate may
  close on owner triage without a K7 PASS — tag `closed-by-owner`, never a `k7-pass` tag for a
  verdict that does not exist. Closed gates stay closed: later defects are NEW work items,
  never retroactive RETURNs, never voided tags.
- **RD-12 · Rule-level pins.** A base case guarding "the members" scans SOURCE for the set and
  checks it reflectively — never a hard-coded list (the fifth member skates), and never one
  declaration form (class fields shadow sealed prototypes under ES2022 field semantics).
- **RD-13 · Resolve-then-contain (standing detector rule).** A module-reach detector RESOLVES
  specifiers to paths and tests CONTAINMENT; string/name scans are supplementary tripwires
  only. String detectors were defeated three times by sibling spellings (`'../index'`,
  `'./../index'`, computed-key member fetches) each carrying a live, running breach past a
  green suite.
- **RD-14 · Banners close with the code.** Scaffold/status banners in the instruments are
  rewritten at build close IN THE SAME COMMIT as the code. A register that misdescribes its
  artifact is the failure that hides every other one (caught three times).
- **RD-15 · No session-minted procedure.** Changes to gate rules, review scope, or the
  reviewer's charter — even owner-proposed in chat — take effect only once recorded in
  RESOLUTION_RECORD. Conversational adoption produced reviewer role-blur (K7 writing code it
  then certified).
- **RD-16 · Deferral is a recorded state, not a gap.** A golden vector may lawfully defer TO
  Phase 5 when its discharge condition names a target event (e.g. a governed first
  enactment); the completion ledger row must carry that condition verbatim, and the module is
  BUILT-but-NOT-COMPLETE — an honest state Phase 5's C5 accepts as input.

---

# v0.4 amendments — RD-17..RD-24

*Appended; everything above stands except where a line below says SUPERSEDES.*

- **RD-17 · The seal is Phase 4's exit.** Once the last gate closes (K7 PASS or owner triage),
  `tools/seal.py check` runs ONE sweep, mechanical only: the nearest closing tag covers the
  code being sealed; full suite; `rederive --all`; the phase4 checks; structure and emission;
  every ACTIVE module in S3 §2 exists on disk. Failures go to the OWNER once: fix now (one
  round) or known issue. `tools/seal.py apply` then writes the seal record, archives the Phase
  4 CLAUDE.md, installs the Phase 5 contract, and tags `seal-N`. After the tag, files present
  at the seal that match `sealed_globs` are frozen — `gate.py` refuses writes, `seal.py verify`
  and `phase4-checks seal` detect changes. **There is no second sweep.** Observed: reviewing
  documentation and code together with no stated end goal produced relative verdicts —
  what one pass accepted the next rejected — and each pass generated documentation the next
  pass audited.
- **RD-18 · Extension builds.** A gap Phase 5 cannot close with existing operations becomes an
  extension run through Phases 1–3 (sealed objects are givens; new objects only), then
  `seal.py begin-extension` returns the repo to Phase 4. The extension adds NEW files; a need
  to change a sealed file is not an extension and halts for the owner. K7 reviews the new
  modules only (`--modules` is required after a seal; the runner verifies sealed files
  unchanged first). The extension closes by re-sealing as `seal-N+1`.
- **RD-19 · The round cap is restored and enforced.** SUPERSEDES the skill-level note that
  made rounds unbounded under a no-progress halt. Moving review to a separate process fixed
  role blur; it did not fix convergence. The no-progress halt measures motion, not distance —
  a loop of ever-smaller fixes changes the tree every round and never trips it. RD-9 stands as
  written — PASS, or ONE fix round + ONE re-check, then owner triage — and `k7-run.py` refuses
  a third consecutive non-PASS round until a closing tag is placed. The no-progress halt is
  kept inside the cap. Owner-triaged closes are tagged `closed-by-owner-N` (a suffix, so more
  than one gate can close that way).
- **RD-20 · Phase 5 surfaces; it does not bind.** The Utilization roster (C5, W-ENV/SEC/PERS/
  OBS/OPS/DISCHARGE, K8) is retired from this repo. RD-16 is amended accordingly: production
  concerns (`PC-*`) and vectors deferred to a target event are carried in the seal record and
  become inputs to Phase 5's latency / scale / security review. Discharging a target-deferred
  vector computes and pins an engine value, so it runs as a scoped extension build, not as UI
  work.
- **RD-21 · Blocked by the seal: log, continue, batch.** When a build cannot proceed as written
  because a sealed module would have to change — most often a decider reached by name that now
  needs handing in — the builder does NOT stop and does NOT reach into the library. It records
  the exception in `INSTRUMENTS/F-supersession-proposals.md` (call site, sealed target, what
  the new code needs, what was built around it, what is left unbuilt), builds everything else
  on the list, and finishes the full pass. At the end of the run it presents ONE consolidated
  case covering every blocked item: the call sites, what each unlocks, the order, and the
  default if the owner declines. The owner rules once. Fifteen interruptions for fifteen call
  sites is the failure this rule exists to prevent; so is a builder that quietly edits a
  helper to keep moving. Nothing is applied until the owner rules, and what is approved is
  applied as one deliberate re-seal, not as fifteen reaches into sealed code.
- **RD-22 · The Object Writing Standard is binding.** `governance/Object_Writing_Standard.md`
  (OS-1..OS-12) governs how every class is written: dependencies declared at construction, no
  ambient reads, deciders injected, valid-or-refuse constructors, private state, typed
  refusals, declared determinism and side effects, no bucket modules, one responsibility,
  injection at the wiring point, and an isolation test per class. `phase4-checks.py objects`
  enforces what a scanner can see; OS-12's isolation test proves the rest. The seal sweep runs
  both, so a library cannot seal over a hard-wired dependency. The failure this closes: an
  object that reaches for what it was never handed works perfectly for one scenario, seals,
  then answers the second scenario with the first one's assumption — which the next session
  reports as a missing object and brings back as an extension request. Extensions are for
  capabilities the engine lacks, not for dependencies it never declared.
- **RD-23 · The standard is enforced where the choice is made, not where it is documented.**
  A rule read 40,000 tokens ago loses to the three-token shortcut sitting in front of the
  cursor, so OS-2 is refused by `gate.py` AT THE WRITE, with the fix in the denial;
  `phase4-checks.py objects` runs at `git commit` on staged files, so a violation cannot
  accumulate for a later sweep; `tools/new-object.py` scaffolds the compliant shape so
  compliance costs fewer tokens than improvising; and the OS-12 isolation tests run at the seal
  with the environment cleared, which is the only step that proves absence rather than scanning
  for presence. Documentation states the rule; these four make it the path of least resistance.
- **RD-24 · A seal may not close over an undeclared input.** The defect: a sealed class answers
  from a fact nobody declared — a zero-argument helper returning a literal, a default argument,
  a module constant — so it works for the scenario it was written for and lies to the second
  one. Phase 5 then reads the lie as a missing class and opens an extension, which adds a class
  and cannot repair one. The repair is upstream, in four places: OS-1 names the illegal shapes;
  `gate.py` refuses them at the write; `phase4-checks.py objects` parses for them and requires
  an isolation test that CALLS every operation and proves a declared input changes the answer;
  and the seal sweep fails — not notes — on an undeclared `isolation_test_command`, an unwritten
  interface contract, or any disagreement between a signature, the object model's Declared
  inputs cell, and the contract's Inputs cell. The contract is copied from the signatures, never
  written from memory of the happy path. This applies to classes written after the change; it
  does not reopen sealed files.

---

# v0.5 amendments — RD-25..RD-26

*Appended; everything above stands except where a line below says AMENDS. Adopted by the owner, 13 Oct 2026, battery size as a guide (from the Frame Gate trial's findings F3 and F4, MF-35).*

- **RD-25 · A materiality bar for the record.** AMENDS §1's Interpretation Register ("every decision the handoff didn't
  make"), §2's B* row ("every un-made decision → Interpretation Register") and §1's "maintained every step".
  - **What is material.** An interpretation is registered when the builder's choice is material. A choice is
    material when it changes observable behaviour or a contract:
    - what a public operation returns, refuses, records or emits;
    - a signature, or a type at a seam;
    - a persisted or exchanged format;
    - declared determinism or side effects;
    - anything inside an open body, which RC-3 still requires to be linked to its AE when it is written.
  - **What is not.** A choice that changes none of these is not registered: a private helper's name, an internal
    structure with identical outputs, how tests are arranged, wording.
  - **The register's form.** An interpretation is one line: id, the choice, its class (benign / latent / conflicting),
    and the rule or AE it touches.
  - **Rulings.** A ruling is one row in `RESOLUTION_RECORD.md`, quoting the owner's words where they decide it, with no
    narrative copy elsewhere.
  - **The instruments.** They are updated when a step changes what they record. No entry is written to show activity.
  - **CC-3 reads with this test.** An unregistered choice is a finding only when it is material; a choice that adds no
    behaviour is not an invention.
  - **Observed** (Frame Gate, six modules): 85 interpretations, many changing no behaviour and no contract, and every
    ruling written twice, as a row and as a narrative section. The record grew faster than the code, and each review
    read it all.

- **RD-26 · A battery is sized to the change's new claims.** AMENDS RD-10, which says what a battery re-plants but not
  how many.
  - **What gets planted.** A battery plants at least one mutation for each NEW or CHANGED claim in the slice: a base
    case, a refusal, or a test's stated claim. Every mutation names the claim it targets; a mutation that names none is
    not planted.
  - **Prior findings are always re-planted.** Each defect shape a K7 round found in the module is re-planted. That is
    regression, and it is cheap.
  - **Unchanged claims are not re-planted.** A claim whose code and tests are unchanged since the module's last
    concluded battery is not re-planted. Its earlier kill is the credit.
  - **Size.** About 10 to 15 mutations is the usual size. A larger battery states its reason in the battery record:
    for example, a detector whose reach is itself the claim.
  - **What stands.** Everything else in RD-10: a committed tree, verified restores, and a build-only kill re-planted
    so that it dies by TEST.
  - **Observed** (Frame Gate): the builder sized batteries toward exhaustion. Battery 19 planted 36 mutations in about
    40 minutes, and nothing in the roster bounded it.

---

# v0.6 amendments — RD-27

*Appended; everything above stands except where a line below says AMENDS. Adopted by the owner, 13 Oct 2026 (from the Frame Gate trial's finding F1 and the F1/F6 design, stage 1).*

- **RD-27 · Credited review.** AMENDS §3's battery mechanics and the K7 runner. RD-9's round cap and the reviewer as a
  separate process stand.
  - **The fingerprint.** The runner computes each module's content fingerprint (`tools/manifests.py`). It covers:
    - the module's files from the object model;
    - the internal files they import that belong to no module;
    - the test files that import any of them;
    - the module's object-model rows;
    - the content of every module its files import, transitively.

    Imports are resolved to tracked files (RD-13). An internal import that cannot be resolved is recorded, and a module
    with one is never credited.
  - **Concluded.** A round is concluded when its verdict is PASS, or when a closing tag (`k7-pass-*`,
    `closed-by-owner*`, `seal-*`) sits at or after its reviewed commit.
  - **Modes.** Each module in scope gets one, written into the verdict's `reviewed.scope`:
    - **credited**: this exact fingerprint was in scope of a concluded round. It is not reviewed again.
    - **diff**: the module was in scope of a concluded round on other content. It is reviewed on its changes since the
      base, which is the reviewed commit of the newest such round. The reviewer also reads, in full, the unchanged code
      those changes depend on or that calls them, following imports and injection seams (the object model names them).
      A defect found there is a finding against the module whose code holds it.
    - **full**: the module was never concluded, or the owner asks (`--full`).
  - **Checks.** Mechanical checks run as declared every round, the full suite included. A judgement check that passed
    at the base is re-assessed only where the changes touch what it reads, and the reviewer says which checks it
    carried.
  - **A round of credited modules is not spent.** Nothing is spawned and no verdict is written.
  - **The backstop.** `seal.py check` fails its `full-review` step unless every module's final fingerprint had a FULL
    review in a concluded round. A first review is always full, so only modules last reviewed by diff come back.
  - **Observed** (the Frame Gate trial, MF-35, and its builder's reading of rounds 8-12 from git):
    - closed modules were re-reviewed end to end for a handful of changed files;
    - all three product defects K7 found sat in their round's diff;
    - DR-37 was completed by unchanged code that a diff-only review would have skipped. Hence the read-in rule, and
      the backstop.

---

# v0.7 amendments — RD-28

*Appended; everything above stands except where a line below says AMENDS. Adopted by the owner, 13 Oct 2026 (from the Frame Gate trial's finding F6 and the F1/F6 design, stage 2).*

- **RD-28 · The gates are receipts.** AMENDS RD-10, RD-27 and RD-9's owner close, for a repo that declares its
  PipelineGate store (`pipelinegate_command`). A repo that does not declare one keeps RD-27 as written.
  - **The store.** The repo keeps its own store, `.pipelinegate/`, its lines committed with the repo. The owner signs
    its catalog: `bootstrap`, then `battery_complete@1` (mechanical), `k7_verdict@1` (judged, pinned to the digest of
    the repo's K7 charter) and `owner_triage@1` (judged, pinned to the owner's principal).
    `tools/receipts.py setup --signer P` prints the commands. The executor never signs.
  - **Points.** Each module's content manifest (RD-27) is an artifact. Its line carries:
    - `battery`: the builder's battery record covers this content. Every mutation names its claim, was killed, and had
      its restore verified; a build-only kill has a test re-plant; an empty battery says why.
    - `k7`: the reviewer's verdict. It is pending when the round starts, and ACCEPT on a PASS.
    - `owner-triage`: the owner's close.
    - `full-review`: ACCEPT on a PASS of a FULL review, or on the owner's close of a round that reviewed the module in
      full.
  - **The battery before review is a refusal.** `k7-run.py` does not spawn the reviewer for content whose standing at
    `battery` is not ACCEPT.
  - **The reviewer's independence is enforced.** The engine refuses a decider who is the artifact's author
    (`AUTHOR_IS_JUDGE`), and a reviewer whose charter's digest is not the one the rubric pins
    (`DECIDER_NOT_IN_RUBRIC`). The runner learns this from the pending receipt, before any round is spent. Changing the
    charter is therefore a signed act: the owner admits a new rubric version.
  - **Credit and the backstop are read from standing,** on every call, never from the verdict files:
    - credited means ACCEPT at `k7` or `owner-triage`;
    - the seal's full-review step means ACCEPT at `full-review`.

    The verdict files still give each module its diff base.
  - **The owner's close is a receipt.** `tools/receipts.py owner-close --round N --person P` is run only on the
    owner's explicit, live word, with the principal the owner names. `gate.py` refuses the `closed-by-owner-N` tag
    until it exists for every module in round N's scope.
  - **A RETURN or HALT stays pending.** Its findings live in the verdict file. The sealed library's judged rubrics
    declare no outcome names, so a RETURN cannot be a receipt without a PipelineGate extension.
  - **Observed** (the sandbox, against the real engine):
    - a verdict file edited to claim credit for changed content was credited from the verdict files alone, and
      refused by the receipts;
    - the same forgery fooled a backstop read from the verdict file's mode, which is why `full-review` is a receipt;
    - an edited charter was refused before a round was spent.

---

# v0.8 amendments — RD-29

*Appended; everything above stands except where a line below says AMENDS. Adopted by the owner, 13 Oct 2026 (from the three-charter comparison and the owner's ruling: the 29 Aug generic charter as the base, and a runner-owned worktree).*

- **RD-29 · The reviewer's charter ships with the template, and the reviewer writes only in the runner's worktree.**
  AMENDS §2 (K7's row), §3 CC-6 ("a throwaway copy") and RD-28 (the charter its digest pins). It restates RD-19 and
  RD-20 in the charter's own text.
  - **The charter is part of the template.**
    - It ships as `repo-template/.claude/agents/k7-reviewer.md`, the path `k7-run.py` and `receipts.py` already default
      to. Until now the template shipped none.
    - Its text is the 29 Aug generic charter (sha256 `5cb55edd…19f9a2685`) with the edits below. The appendix gives it
      in full.
    - A repo may still edit its own copy, as PipelineGate's concept-specific charter does. A repo with a store pins the
      digest of whatever it runs (RD-28), so a later change is a signed act.
  - **Edits to the base.** Each edit brings the text into line with a rule already in force, or with this amendment:
    1. **Frontmatter `description`.** The base says "Use PROACTIVELY" and gives examples of spawning the reviewer from the
       builder's session. The new text says it is launched only by `k7-run.py`, never in-session, as `phase4-build`
       already requires.
    2. **`tools`** gains PowerShell, Write and Edit.
       - PowerShell: both Windows builds needed a shell there (Frame Gate R-05; PipelineGate's charter).
       - Write and Edit: for the worktree only (below).
    3. **The opening paragraph and CC-6.** Mutation experiments run in the runner's worktree and nowhere else. This is
       Frame Gate's R-07 text.
    4. **Inputs.** The prompt also carries the worktree's path and each module's review mode (credited, diff or full,
       per RD-27).
    5. **Tree integrity.** The runner checks the repository before and after the round and refuses a dirty verdict. The
       reviewer restores the worktree between experiments. The store is named as excepted, alongside `STATE.json`.
    6. **The round cap.** The base says the cap is retired. The new text restates RD-19: the runner enforces the cap and
       forces a HALT on no progress. The reviewer neither counts rounds nor refuses one.
    7. **K8.** The production-readiness section comes out. RD-20 retired it.

    **Not carried:** Frame Gate's R-15 stated-scope scoring. The template has no SCOPE convention for detectors, so it
    stays Frame Gate's ruling until one is adopted.
  - **The worktree.**
    - **Created:** each round, the runner creates a detached git worktree of the reviewed commit at `.k7/wt`.
    - **Where:** it is gitignored and sits inside the repo, so dependencies such as `node_modules` resolve from the copy
      as they do from the original.
    - **Removed:** when the round ends, however it ends. A worktree left by a crashed round is removed before the next
      one starts.
  - **The grant is the runner's.**
    - **What it grants:** the runner adds the reviewer's permissions to the command it starts:
      - Edit on `.k7/**`. This covers Write too; a `Write(path)` rule is not matched at all;
      - the shell, for `tools/k7-scratch.py` only, which runs the declared commands in the worktree;
      - project settings only. No user or local settings are loaded, so a builder's "always allow" click never
        reaches the reviewer;
      - all under a permission mode that denies anything not granted (`dontAsk`).

      The confinement lives there, not in the charter's `tools` line, which cannot name a path.
    - **What it refuses:** a `reviewer_command` that would widen the grant or replace the charter whose digest the
      rubric pins. That covers:
      - skipping permissions;
      - its own permission mode or allow list;
      - settings or setting sources;
      - extra directories;
      - an inline agent, or a system prompt.

      `--model` is allowed.
    - **The template's default command** changes from `--agent-file`, which the current CLI does not accept, to
      `--agent k7-reviewer`. Both real builds had already rewired it locally.
  - **A dirty repository after review is a refusal, not a warning.**
    - The runner checks the working tree against HEAD after the reviewer exits. `STATE.json` and the store are excepted.
    - If anything changed:
      - it names the files;
      - it writes no verdict and appends no receipt;
      - it keeps the reviewer's raw output at `INSTRUMENTS/k7-raw-<round>.txt` for the owner. A second refusal in
        the same round is kept as `-2`, never an overwrite.
    - A refused round leaves no verdict, so it does not count toward RD-19's cap.
    - Today a dirty tree is recorded and warned about, and a PASS still appends its k7 ACCEPT. That is the gap this
      closes.
  - **Repos in flight** keep their own charter.
    - **Adopting v0.8 means:**
      - the repo's charter states RD-29's rules;
      - its runner carries the worktree, the grant and the refusal;
      - where a store is signed, the owner admits a new `k7_verdict` version for the changed charter.
    - **Frame Gate** already runs R-07, which is this amendment's substance.

# v0.9 amendments — T-1 (Token economy)

*Appended; everything above stands except where a line below says AMENDS. Adopted by the owner, 24 Oct 2026, on
Amendment T-1 from the Account Foundation run: Phases 1–3 spent about $190 of a $250 budget, and nothing in the
pipeline forecast it. The rules in full: `governance/token-economy.md`.*

- **TE-1 · The budget is a gate input.** AMENDS §4 (gate policy).
  - Every human gate reports spend so far and the forecast to the next gate, from `.metaframework/spend-ledger.md`
    (`tools/spend.py status`).
  - Spend plus forecast over the phase budget joins the load-bearing set: it halts regardless of standing approval,
    and the owner raises the budget, narrows the scope, or stops.
- **TE-8 · Forecast at setup.** The Phases 1–3 ledger is carried into the repo at setup. Before the module loop,
  the coordinator forecasts modules × cost per module (`spend.py forecast --unit-kind module`), from the owner's
  estimate until a module is measured. The owner approves that spend at C4's gate. The forecast is repeated once
  the first modules are measured.
- **TE-9 · The module loop.** AMENDS §2 (B*'s row) and RD-6.
  - **One sub-session per module,** in §10 build order, replacing "one per facet". The order is fixed, so parallel
    saves nothing.
  - **The builder runs on the mid tier** with the module's S3 slice and nothing more (TE-4):
    - its §2 row;
    - the §4 seams it is the source of;
    - its §5–§8 rows;
    - the §3 interfaces of those seams' targets.

    It returns 20 lines or fewer and writes its full output to a file.
  - **K7 runs separately on the top tier,** with `--model opus` in `reviewer_command` (RD-29 permits `--model`). RD-6's
    "a different model for load-bearing modules" now holds for every module.
  - **The coordinator** updates the completion ledger and the spend ledger (a `module:MOD-nn build` row, and a
    `module:MOD-nn K7` row per round), then runs `spend.py status` before the next module starts.
- **TE-3 · A fresh coordinator** after every closed gate. STATE carries the position (destination-first sessions
  already require it), so nothing needs the old transcript.
- **TE-6 · Proportional verification** changes nothing for the battery or K7. RD-26 already sizes the battery to
  the change, and RD-27 already credits unchanged content. An extra adversarial pass, where one is run, is one, at
  the seal, scoped to what was built or changed.
- **Unchanged:** C4, K7's distinctness, the round cap, R, F, the seal, and every human gate.
- **Repos in flight** adopt v0.9 as a set:
  - copy `tools/spend.py`, `tools/tests/test_spend.py`, `governance/token-economy.md` and
    `.metaframework/spend-ledger.md`;
  - add the ledger to `doc-roles.json` as a ledger;
  - refresh the roster copy and regenerate `roster-manifest.json`.

# v0.10 amendments — S-1 (The frozen test set)

*Appended; everything above stands except where a line below says AMENDS. Ruled by the owner, live, 26 Oct 2026, on
the frozen-test-set proposal from the LedgerCore V2 run: every phase and agent could add a test and none could remove
one, so 71 S1 test groups became 238 refusal rows, and the set analysis kept 169. The rules in full:
`governance/test-set.md`.*

- **TS-7 · The lead fixes the critical path per build stretch.** Before the stretch starts, the lead runs
  `tools/test-set.py` for the stretch's modules (exit 0: no guard element dropped), writes its report, and records it
  in `INSTRUMENTS/test-intake-log.md` under Frozen sets. The config it reads is the one Phase 3 approved, at
  `.metaframework/test-set.json`.
- **COMPLETE counts only the frozen set.** The completion ledger's CT-4 box counts the module's critical rows, plus any
  proposal admitted for it. The vectors (CC-5), the hooks (CC-6) and the PC enum box are unchanged.
- **CC-4 checks only the frozen set.** AMENDS §3: CC-4's question is "does every refusal test *in the frozen set* run
  and pass". Cut rows stay in S3 §5 as the record. They are not written and they gate nothing; the owner may schedule
  any of them later. A guard element the frozen set does not cover is still a CC-4 failure. A repo with no frozen set
  recorded counts every §5 row, as before.
- **Proposals, not additions.** Builders, sub-agents, sub-sessions and reviewers only propose tests: one row each in the
  test-intake log, naming the guard element it claims to cover and why. Proposals and issues are logged during the
  stretch and not acted on, unless one blocks the build. At the end of the stretch the lead dedupes the log against the
  set, admitting a proposal only when it covers a guard element the set does not already cover, and the owner approves
  or rejects the batch.
- **TS-8 · K7 proposes through its verdict.** `governance/k7-verdict.schema.json` and the charter
  (`.claude/agents/k7-reviewer.md`) carry an optional `proposed_tests` field, each entry naming the guard element it
  claims to cover. An uncovered guard element is still a RETURN (CC-4, in `blocking`). Another test for a covered
  element is a proposal, which `tools/k7-run.py` appends to the intake log, pending; it changes no verdict. Where a
  store pins the charter's digest (RD-28, RD-29), the changed charter refuses as `DECIDER_NOT_IN_RUBRIC` until the
  owner signs a new `k7_verdict` version for it.
- **Acceptance (in the shape T-1 used):** the dedupe never drops a guard element, and LedgerCore V2's §5 reproduces its
  169 through `test-set.py` with its config; cut rows stay on record; every human gate, K6 and K7 are unchanged except
  as above; the template suite and checkers still pass.
- **Unchanged:** C4, K7's distinctness and its round cap, R, F, the seal, every human gate, and the completion ledger's
  other boxes.
- **Repos in flight** adopt v0.10 as a set:
  - copy `tools/test-set.py`, `tools/tests/test_test_set.py`, `governance/test-set.md`,
    `INSTRUMENTS/test-intake-log.md` and `.metaframework/test-set.json`;
  - copy `tools/emission-check.py` (the `Outcome` column, noted where absent), `tools/k7-run.py` (it logs
    `proposed_tests`), `governance/k7-verdict.schema.json`, `governance/S2-S3-emission-contract.md` and the charter;
  - add the CT-4 paragraph to the completion ledger;
  - where a store is signed, the owner admits a new `k7_verdict` version for the changed charter;
  - refresh the roster copy and regenerate `roster-manifest.json`.

# v0.11 amendments — H-1 (The gate's reach)

*Appended; everything above stands except where a line below says AMENDS. Ruled by the owner, 27 Oct 2026, after
LedgerCore V2 Phase 4 attempt 1: its lead session started in another folder and its builders wrote into the repo by
absolute path, so `tools/gate.py` never fired on four build steps; no git hook was installed; `tools/new-object.py`
was never used; and the builders were briefed by hand, without the Object Writing Standard or the object model K7
reviewed against. Attempt 1 was archived and Phase 4 restarted on plugin 2.6.17.*

- **H-1.1 · The gate reaches every session.** The metaframework plugin's router hook (`hooks/route.py`) runs a build
  repo's own `tools/gate.py` on every write, shell command and sub-agent launch that touches the repo, from whatever
  folder the session started in; a sub-agent runs its parent session's hooks, so it is covered too. The repo's
  `.claude/settings.json` still runs the gate for a session started inside it. Both hook commands fail closed when
  python3 cannot start.
- **H-1.2 · Every commit is checked, from anywhere.** C4 installs `.githooks/pre-commit` (`tools/install-gates.py`,
  once per clone), and every commit, from a session or a plain shell, runs `tools/precommit.py`. `gate.py` refuses a
  session's commit until the hook is installed, however the commit is spelled (`git -C <repo>`, `cd <repo>`), and
  refuses `--no-verify`, `-n` and any change to `core.hooksPath`.
- **H-1.3 · The install proves itself.** `tools/phase4-checks.py gates` passes before C4 closes, before each build step
  starts (`tools/state.py set current_module=...` refuses otherwise) and before each K7 round (`tools/k7-run.py`
  refuses otherwise). The SessionStart hook reports it. The gate machinery is compared with the template's manifest,
  so a repo running an older `gate.py` fails it.
- **H-1.4 · Each builder proves it is gated.** A builder's first tool call writes `.metaframework/gate-probe` with its
  brief's nonce. The gate refuses it and logs the refusal, with the session and agent ids and its own digest, in
  `.metaframework/gate-live.jsonl`. The coordinator accepts the step only when `tools/brief.py verify` finds exactly
  one such refusal inside a sub-agent by the current `gate.py`, and cites the nonce in the completion ledger. Work
  whose nonce does not verify was built ungated and is not accepted, whatever its tests say. C4 shows the same
  refusal live from each session shape the build will use.
- **H-1.5 · Builders and K7 are given the same documents.** A builder's brief is generated by `tools/brief.py` from the
  review basis (`tools/basis.py`: the roster, the standard, the S3, the S2 and the object model) and stamped with their
  digests. `gate.py` refuses a builder's launch on a module without a current, issued, unused stamp, and
  `tools/k7-run.py` shows the reviewer the same list. AMENDS T-1's TE-9 step 1: the builder's prompt is its brief.
- **H-1.6 · The gate's machinery is not the builder's.** A builder may not write `tools/`, `.githooks/`, `.claude/` or
  `.metaframework/`, where the documented-exception list lives. No session writes library source through a shell,
  where the gate cannot read the content; the probe log and the brief log are written by the tools only.
- **H-1.7 · The scorer is recorded.** At each stretch's end, before K7, the oop-standards scorer's grade per class goes
  in `INSTRUMENTS/scorer-record.md`. It informs K7; it gates nothing until the owner rules otherwise.
- **Acceptance:** the unit rows of the 2.6.17 acceptance criteria pass, in the template suite
  (`tools/tests/test_gate_reach.py`) and the plugin's (`tools/tests/test_route.py`); the live rows (that the hooks fire
  in each session shape) are shown at C4 and cited from `gate-live.jsonl` in the anchor record; the template suite and
  checkers still pass.
- **Open for the owner, not adopted:** new source files only from `new-object.py`; the scope of "no mutations";
  whether the scorer gates a stretch; a user-level hook for a session with the plugin disabled; CI on push.
- **Unchanged:** C4's probes, K7's distinctness and its round cap, R, F, the seal and every human gate.
- **Repos in flight** adopt v0.11 as a set:
  - copy `tools/gate.py`, `gate_reach.py`, `gatecheck.py`, `basis.py`, `precommit.py`, `install-gates.py`,
    `brief.py`, `phase4-checks.py`, `state.py`, `k7-run.py` and `tests/test_gate_reach.py`, then `.githooks/`, the
    `hooks` block of `.claude/settings.json`, `.metaframework/template-manifest.json` and `INSTRUMENTS/scorer-record.md`;
  - add `project_hooks` (every `hooks/*.py`) and `code_gates` to `project.json`, and the `.gitignore` and
    `.gitattributes` lines;
  - run `python3 tools/install-gates.py`, then `python3 tools/phase4-checks.py gates`;
  - refresh the roster copy and regenerate `roster-manifest.json`.

# v0.12 amendments — RD-30..RD-31 (plugin 2.6.21)

*From LedgerCore V2's step 2, 27 Oct 2026. RD-30 amends the owner triage of RD-9 and RD-19; RD-31 says how far a code
hook goes. Everything else stands.*

- **RD-30 · The owner may order one more round.** AMENDS RD-9's triage list; RD-19 stands. The list becomes: fix now /
  **fix now and re-check** / known issue / won't-fix.
  - "Fix now and re-check" is the owner's order for exactly one more builder fix round and one K7 re-check.
  - It is recorded as a RESOLUTION_RECORD row and an `owner-round-<n>` tag at or after the last reviewed commit.
    `k7-run.py` allows one round per tag; after it, the cap applies again.
  - Only the owner orders it. A builder may not place or move a tag, and with a receipts store the gate requires the
    owner's receipt for an `owner-round` tag, as it does for `closed-by-owner`.
  - The no-progress HALT still applies.
  - Why: a cap can be spent on a round that halted for a process error rather than the code (LedgerCore V2 step 2,
    round 3), and "fix now" alone closes the gate with fixes K7 never saw.
- **RD-31 · A code hook catches what a builder would write; K7 catches the rest.**
  - A HOOK row's code hook (`hooks/*.py`) refuses the forms a builder would plausibly write.
  - Forms a dynamic language allows at run time (`type()`, computed bases, metaclasses, `setattr` with a computed
    name, `exec`) are known issues by default, registered once, with K7's review as the backstop. A new form K7 finds
    is a known issue, not a new hook rule, unless the owner rules otherwise.
  - A hook rule names the threat ("a decorator that replaces `execute`"), never a syntactic stand-in ("any class
    decorator"). LedgerCore V2's HOOK-05 took four K7 rounds the other way, and its rule against any class decorator
    refused the `@dataclass` every act class with inputs needs.
  - The same principle as OS-12: the scanner is the cheap pass, the review is the real one.
- **Also in 2.6.21, enforced by the tools:**
  - a builder's brief carries `.metaframework/operating-rules.md` and its `MF-RULES` line, and the gate refuses a
    builder launch without the current one;
  - the declarations check compares each class with its own Declared inputs (`Class: inputs; Class: inputs`), reads
    a dataclass's fields as its constructor, and refuses `none` for a class that takes inputs;
  - a module's own S3 hooks are part of its credited-review fingerprint;
  - a session may not commit around the hooks (`cherry-pick` or `revert` without `--no-commit`, `rebase`,
    `commit-tree`, `update-ref`, `branch -f`, `reset --hard` to another commit), fast-forward a merge, or stage and
    commit in one call; `git am` runs the checks through `.githooks/pre-applypatch`.
- **Repos in flight** take v0.12 at a step boundary: refresh the roster copy and regenerate `roster-manifest.json`; the
  briefs and K7's basis then restamp. 2.6.21's tools enforce RD-30 and the list above whether or not the copy is
  refreshed.

# v0.13 amendments — RD-32, and RD-31's language reading (plugin 2.7.0)

*From LedgerCore V2's measurements, 29 and 30 Oct 2026. RD-32 amends RD-9 and §4's loop; RD-9's cap, RD-19, RD-30 and
RD-31 stand. The owner chose it with the checkpoint ("Queue with checkpoint", 30 Oct 2026), and the C4 probe ("C4
probe + roster", 29 Oct 2026). Everything else stands.*

- **RD-32 · No K7 per step: one foundation checkpoint, one final deep review, then the seal.** AMENDS RD-9 and §4,
  where K7 runs "per module, or per governed increment".
  - **A step closes on the gates:** the hard gate and the commit checks, `brief.py verify`, and the scorer's surface
    review. No K7 round and no tag. After the step's ledger rows, the next action is the next step in S3 §10's order.
  - **The foundation checkpoint.** Once the modules the rest of the library calls are built, one K7 round reviews them
    for correctness only: CC-1, CC-2 and CC-4. Hook hardening is out of scope. C4 names those modules in
    `INSTRUMENTS/C4-anchor-record.md`, from S3 §10's order (LedgerCore V2: after step 3). `tools/k7-run.py
    --checkpoint`.
  - **The final deep review,** when every module is built: `tools/k7-run.py --final`. Every module in full, split by
    facet, plus one pass across the seams, read back as one verdict. RD-31 applies strictly: a way around a code hook
    is a known issue unless a builder would plausibly write that form.
  - **Then one fix pass, one re-check of the changed modules** (`k7-run.py --modules <them>`), and the owner rules the
    rest under RD-9 and RD-30's triage. The gate closes with `k7-pass-<n>` or `closed-by-owner-<n>`, and the seal
    follows; Phase 4 already seals once.
  - Each of these is a K7 round under RD-9's cap. RD-10's battery runs before each, on the modules it reviews. The
    drift-teeth rule holds on the newest round: a merge waits while that round is not a PASS at drift 7 or more and is
    not closed.
  - Why: on LedgerCore V2, review and its fixes cost 3 to 4 times the building (about 16 of 38 active hours). 14 of
    its 30 blocking findings, and 8 of its 14 failed rounds, hardened code hooks against ways around them, and that
    loop does not settle (HOOK-05: 5 rounds). Only three findings needed catching early: the foundation defects in
    MOD-25, MOD-20 and MOD-24, which about 20 modules were built on.
- **RD-31, amended · What the build's language cannot give.** The S3 is written without a language, which is first
  chosen at Phase 4 setup. A hook, refusal or constraint row that promises something is private, unreachable or
  unchangeable, where the build's language cannot give it, is recorded at C4 as a reading for that language and a
  supersession proposal to F, before code. It is never tested vacuously. The S3 wording stays for a build in a
  language that can meet it.
  - C4's probe list asks it of each such row. The probe is read, not a keyword scan: LedgerCore V2's S3 uses
    "closure" for proposal closure throughout.
  - Why: REF-222 says a PluginPort has no handle "reachable" under closure-cell inspection, which Python's reflection
    makes unmeetable while the port still calls its collaborator. Its test passed vacuously and K7 returned it (round
    14, CC-4).
- **Also in 2.7.0, enforced by the tools:**
  - **base cases first** (the owner: "Gate refuses early"): `tools/brief.py red --nonce <N>` runs each test the step's
    new base-case rows name, on its own, against the module's current code, and logs the run only when every one
    fails or errors. In a Python build the gate refuses a builder's Write or Edit to its module's S3 §2 File until
    that line exists, and `brief.py verify` refuses a step without it, or whose red test changed after it. K7 fix
    rounds too: a failing test before the fix. A base-case row names its test (`test:` and the name in backticks);
  - **session profiles** (the owner: "Queue it"): a builder is launched as `.claude/agents/builder.md` (Read, Write,
    Edit, Grep, Glob and the shell; no Skill, no MCP), and the gate refuses any other launch of a brief; the
    coordinator's sessions turn off every installed plugin but metaframework and oop-standards
    (`.claude/settings.local.json`). `tools/install-gates.py` writes both, and `phase4-checks.py gates` names either
    when it is missing or changed.
- **Repos in flight** take v0.13 between steps, never mid-step (gate.py changes, so every probe is re-taken): refresh
  the roster copy and regenerate `roster-manifest.json`, run `tools/install-gates.py`, and add the "Foundation
  modules" line to the C4 anchor record. A build whose foundation is built and reviewed goes on to the final review.

# v0.14 amendments — RD-33..RD-35: the close, the cuts, and long runs (plugin 2.8.0)

*Ruled by the owner, 31 Oct 2026, after LedgerCore V2's Phase 4 close ran 16 hours past the point where every module
was built (8:44 AM to 1 AM). The lead asked "which first?" rather than starting listed work (about 4.5 hours); three
post-triage work items, four owner gates and another K7 round ran before a seal that needed none of them; and K7
round 18's verdict landed at 9:46 PM and sat unread for 3 hours, because the app restarted at 9:20 PM and lost the
background run. `seal.py` would have allowed the seal at 8:44 AM: it carries incomplete modules, deferred vectors and
production concerns forward rather than failing on them. The owner: "Adopt it" (the close), "Cut them" (the cuts),
and "I want a hard gate on this… Relying on judgement doesn't work if the desktop crashes." Everything else stands.*

- **RD-33 · The close: write the code, test it, seal it.** AMENDS RD-9, RD-17, RD-19, RD-32's "then one fix pass,
  one re-check of the changed modules, and the owner rules the rest", and §4. Five steps, in order:
  1. The last module is built.
  2. Write `ui/interface-contract.md`.
  3. Run the final K7 review (`tools/k7-run.py --final`).
  4. Run `tools/seal.py check`.
  5. The owner gives one approval. That one act seals the library (`seal.py apply`) and merges `phase4` into `main`
     with `--no-ff`.

  Around it:
  - Findings from the final review become Phase 5 gaps in `ui/gaps.md` (`seal.py apply` writes them, `noticed`). A
    fix pass happens only when the owner orders one (RD-30's `owner-round-<n>`).
  - Everything the sweep carries forward goes to Phase 5, open owner gates included: production concerns, deferred
    vectors, incomplete modules, the final review's findings, RESOLUTION_RECORD rows with no disposition and STATE's
    `blocked_on`, and the object standard's exceptions.
  - Nothing is worked between the last module and the seal unless the owner orders it. The close's steps are
    started, not asked about.
  - The owner's approval closes the final review. `seal.py check` and `apply` require no `closed-by-owner` tag for
    it: the reviewed step asks that the final review, or a round the owner ordered after it, reviewed the code being
    sealed, and the backstop counts the final review's full review as concluded.
  - SR-1 entries still in place are carried into the seal record as known issues and listed by the sweep
    (`Projects/CLAUDE.md` rule 12's Expiry, amended by the owner's ruling of 31 Oct 2026).
- **RD-34 · The cuts.** AMENDS RD-9, RD-10, RD-19, RD-26, RD-28, RD-32 and S-1.
  - **The builder mutation battery:** RD-10, RD-26, `INSTRUMENTS/mutation-battery.md`, and `k7-run.py`'s refusal to
    review content with no battery receipt (RD-28's `battery` point; `receipts.py setup` admits no
    `battery_complete`). CC-6's mutation testing is K7's, in its own worktree (RD-29), and is unchanged.
  - **The end-of-stretch test-intake dedupe** and the owner's batch ruling on it (S-1, TS-7). Proposals are still
    logged; they gate nothing, and the owner schedules any of them.
  - **Owner triage after every K7 round** (RD-9's cap, RD-19's enforcement). The foundation checkpoint gets one fix
    pass and no triage, and no re-check: the next round is the final review. The final review goes to the close.
    `k7-run.py` refuses any other round after either unless the owner orders it: an `owner-round-<n>` tag at or after
    the last reviewed commit buys exactly one (RD-30). The no-progress HALT stands.
  - **The merge rule follows.** A checkpoint holds no merge. The final review holds merges until the seal, or until
    the owner orders work on it.
  - **Kept:** base cases watched failing (`brief.py red`); the hard gate and the commit checks; `brief.py verify`; the
    frozen test set; the final review; the records the tools write.
- **RD-35 · Long runs are gated.** A session's judgement does not survive a desktop crash, so the mechanism is the
  tools'.
  - **`tools/run.py -- <command>`**, with `--kind k7|seal-check|suite|other`, `--label`, `--timeout` and `--result`,
    starts the command detached from the Claude process tree, so a desktop crash or an app restart kills neither it
    nor its supervisor: a new detached process group on Windows, `setsid` on POSIX. The supervisor keeps the run
    record, `.metaframework/runs/<run_id>.json` (schema 1, in `tools/run.py`), rewrites its heartbeat every 30 seconds
    until the command exits, then writes the result. Only `run.py` writes the record, atomically. Readers derive
    `interrupted` (running, heartbeat older than 120 s, the launcher not alive) and `stalled` (running, heartbeat
    fresh, past `timeout_s` or the log unchanged for 15 minutes), and write nothing.
  - **The gate refuses** `tools/k7-run.py`, `tools/seal.py check` and the full suite (`test_command`, with options
    only) unless they are started through `tools/run.py`.
  - **Hooks** (`tools/state.py`): SessionStart, on every source, and UserPromptSubmit print each of the build's runs
    whose state has changed since that session last saw it, with the time; Stop and SubagentStop append a turn-end
    line to `.metaframework/session-events.jsonl`. The template's `.gitignore` lists both.
  - Off the PC, the owner's watchdog and status board read the same records.
- **Repos in flight** take v0.14 between steps, never mid-step (gate.py and the hooks change, so every probe is
  re-taken): refresh the roster copy and regenerate `roster-manifest.json`, take the tools as the plugin README's "A
  repo adopting 2.8.0" list says, add the two `.gitignore` lines before any run, and run `tools/install-gates.py`
  and `phase4-checks.py gates`. A build whose last module is built goes straight to the close.
