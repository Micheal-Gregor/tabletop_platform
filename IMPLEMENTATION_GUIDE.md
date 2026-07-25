# How to Run the Pipeline End-to-End — Implementation Guide

*The operating manual for the whole #MetaFramework pipeline: three chat projects + one repo
per idea. v1.0 · July 2026*

## The topology (what lives where, and why)

| Stage | Medium | What it is |
|---|---|---|
| Phase 1 · Meta Framework | **Chat project (existing)** | Concept → proven logic skeleton (S1). Chat-shaped: sequential agents, human gates. |
| Phase 2 · OOP Expression | **Chat project (existing)** | S1 → admitted object model (S2). |
| Phase 3 · Specification | **Chat project (existing)** | S2 → spec docx + CLAUDE_<Concept>_Phase3.md (S3). The pipeline's last chat phase. |
| Phase 4 · Conformance Build | **Git repo per idea — THIS TEMPLATE** | S3 → conformant code + instruments + resolutions. Run in Claude Code. |
| Phase 5 · Utilization | **Same repo** | Concern inventory → bound deployment + discharge record. |
| Backflow | Chat projects again | F's supersession proposals re-enter Phase 3 (or deeper) as revision runs. |

**Do not create chat projects for Phases 4/5.** The 3→4 boundary is a change of medium, not
just a handoff: Phase 4 needs a filesystem, executing tests, living instruments, and a
reviewer with no builder context. And do not create a separate "execution" folder after
Phase 5 — **the Phase 4 repo IS the execution project**; Phase 5 continues inside it
(`utilization/`). One idea = three chat passes + one repo. Never two concepts in one repo
(the concept-isolation rule).

## Per-idea walkthrough

**1–3 · The chat passes (as you do today).**
Idea → Phase 1 project → download S1 exports. Upload S1 → Phase 2 project → S2 exports.
Upload S2 → Phase 3 project → spec + `CLAUDE_<Concept>_Phase3.md`.

**4 · Create the repo.**
Copy this template → `<concept>-build/`. Put the Phase 3 exports in `governance/S3/` (frozen;
tag `s3-anchor-v1.0`). Replace the root `CLAUDE.md` body with the full Phase 3 build
instruction (the disambiguation rename the file itself mandates) and keep the appended
**Phase 4 process contract**. Claude Code reads root CLAUDE.md automatically — that is the
handoff mechanism.

**5 · Run Phase 4 in Claude Code.**
- *Session 1 — C4:* "Run the C4 anchor per governance/Phase4_Conformance_Build_Roster.md."
  Well-formedness check → `INSTRUMENTS/C4-anchor-record.md`. Halt-class defects stop here.
- *Build sessions:* mandated order; base cases before features; every un-made decision into
  the Interpretation Register; commit per approved increment.
- *K7:* a **fresh session or subagent that did not build** — point it at the repo + S3, run
  CC-1..CC-7 adversarially (divergence-injection + mutation tests). RETURN loops to the
  builder; the K7 ⇄ R loop repeats until PASS. Tag `k7-pass-1`.
- *R:* present open bodies / fired ODGs / deferred vectors to YOU at the live gate; record in
  `RESOLUTION_RECORD.md` BEFORE filling anything; compute discharged vectors; re-enter K7.
- *F:* handoff defects → `F-supersession-proposals.md`. You carry these back to the Phase 3
  chat project as a revision run; the superseded S3 v1.1 re-enters as a new tag.

**6 · Run Phase 5 in the same repo.**
C5 assembles the concern inventory (PC-*, by-target ODGs, deferred hardening); W-ENV binds the
target first (human-gated); bindings go in `utilization/`, never the core; K8 runs PR-1..PR-7
**in the target environment**; every concern exits BOUND / ACCEPTED-RISK (live human act) /
N/A-by-absence. Tag `k8-pass-1`. Operate: the drift ledger stays open in production.

## Why git is the right medium for your discipline

Commits are append-only trace links; tags are anchors and gates; supersession = new commit,
never a history rewrite; the drift-teeth rule is literally merge-blocking; K7 is a PR review
by a distinct session; **H — the human gate — is you clicking merge.** The disciplines phases
0–3 enforce by prompt, the repo enforces by construction.

## Session-role discipline (the SoD that matters most)

One session, one role. The builder session never runs K7 on its own work; the K7 session never
fixes code (it is a gate, not a builder); R halts for the live human — Claude proposes
dispositions, only you decide. The pressure test proved the cost of skipping this: self-review
scored 8–9 on code a distinct reviewer scored 5, with four real defects behind the gap —
including a false citation in the append-only trace that only an adversarial reconstruction
caught.

## The worked example

The GateControl build (pressure-tested 2026-07-10) is the reference instance of this whole
structure: its INSTRUMENTS/, resolution record, supersession proposals, K7 reports, and the
RETURN → regenerate → resolve → re-verify → PASS cycle show each artifact in filled-in form.
Keep it beside this template as the exemplar.
