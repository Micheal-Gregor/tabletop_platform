# C4 Anchor Record — TABLETOP Phase 4 run

**S3 anchored:** governance/S3/TABLETOP_Phase3_Specification.md +
governance/S3/CLAUDE_TABLETOP_Phase3.md · tag `s3-anchor-v1.0` (commit 0b099b3) ·
2026-07-25. Fixed for this run; defects route through F, never patched.

## Well-formedness check (the handoff halt, RD-3 probe list)

**Probe A — pinned values.** All nine vectors are DEFERRED; no expected values exist yet,
so no rule can be "recoverable only from a vector." Each rule was restated independently
at K6 (CT-5, SP-5 doctrine) and re-checked here without reference to any expected value:

| Check | Verdict | Detail |
|---|---|---|
| V-1 rule w/o vector | ✓ w/ finding C4-F1 | Rule = the Stage-2b σ=7 script + ranking law. Recoverable — but the script lives in the Phase-1 record, OUTSIDE governance/S3/. Disposition: commit upstream anchors read-only under `governance/upstream/` (clearly labeled reference, NOT S3). Not halt-class — the rule exists and is unambiguous; it is merely not co-located. |
| V-2 rule w/o vector | ✓ w/ interpretation I-1 | AX-4: (seed, seats, log) rebuilds byte-identical state. Well-defined ONLY given the same ContentPack — the row schema `{seed, seats, moves}` names no pack. I-1 (latent, F-route): MoveLogRow carries pack-ref (id + version + integrity hash). Without it V-2 and Transport self-heal are underdetermined. |
| V-3 rule w/o vector | ✓ | EFX v1.1.1 closure: each of the seven descriptors → its typed mutation, nothing else. Descriptor list enumerated in S1 v2.0 §Vocabularies. |
| V-4 rule w/o vector | ✓ | VK-8: each pattern preset reproduces its inventory-documented behavior; inventory = the BOTY Mechanics & Objects Inventory (upstream annex, C4-F1). |
| V-5 rule w/o vector | ✓ | EX-2: admission predicate decides per kind. |
| V-6 rule w/o vector | ✓ | ER-e3: composed tiles FORM a Surface; recursion constitutive. |
| V-7 rule w/o vector | ✓ | Precedence law: per-firing snapshot; total order (hook, bearer-entry-seq, tiebreak per MR1 spec). |
| V-8 rule w/o vector | ✓ | ER1-4 × EX-5: contribution registers on relation-FORM; effects only through EFX. |
| V-9 rule w/o vector | ✓ | EP-2 theater-sync: displayed ≡ seeded across kinds and joins. |

**Probe B — typed interfaces, off-nominal inputs.**

| Interface | Off-nominal probe | Handoff answers? |
|---|---|---|
| EFX v1.1.1 | unenumerated descriptor | ✓ R-2 (load) + R-3 (runtime, halt-not-skip) — negative cases on BOTH paths |
| HookPoints v1.0 | unknown hook in a contribution | ✓ R-15 load refusal |
| VerbSets v1.0 | unmapped/unknown verb in a skin or pack | ✓ by composition: governed vocabulary + HK-4 load validation → refuse naming the member; runtime unmapped gesture → no intent emitted (R-23 bounds the only legal output) |
| Guard verdict | marker family negative case | ✓ R-1; mutation-testing mandated (§3 doctrine) |
| Genesis case | where does state₀ come from? | Partially — log-as-truth defines REBUILD; genesis = deterministic f(pack, seats, seed) at pack load. Registered as I-2 (benign): state₀ is produced by PackLoader's validated setup declaration; the empty-log game is the genesis state. Depends on I-1 (pack-ref in the row). |
| Component family (open) | pack references an unadmitted kind | ✓ EX-2/HK-7 refuse; R-14 blocks respec |
| Relation formation | predicate absent | ✓ R-13 |
| Transport consumer interface | submit by non-active-writer; resume mid-window | Shape answered (active-writer law, self-heal); exact refusal-vs-queue semantics = I-3 (benign, registered at F7 build time, AE-linked to the lockstep controller spec) |
| GovernedVocabulary | growth outside a contract cycle | ✓ R-4/HK-6 + S-7; ExtensionContract is the only door |

**Probe C — hook falsifiability.** All 12 hooks name a trigger + condition + block and an
owner; each is mutation-testable by construction. ✓

## Findings & registered items (none halt-class)

- **C4-F1** (housekeeping): commit upstream anchors (CLAUDE_TABLETOP_v2.md, Stage-2b
  worked example, BOTY inventory) read-only under `governance/upstream/`.
- **I-1** (latent → F-route): MoveLogRow must carry pack-ref (id, version, integrity
  hash); supersession proposal to Phase 3 wording drafted in F-supersession-proposals.md.
- **I-2** (benign, local): genesis state = PackLoader's validated setup declaration
  applied deterministically over (pack, seats, seed); empty log = genesis.
- **I-3** (benign, deferred to F7): non-active-writer submit semantics.

## Rulings REQUIRED at this gate (live human — queued, not defaulted)

1. **ODG-4** — greenfield engine + BOTY re-enters as the first content pack (candidate),
   vs refactor the shipped BOTY codebase.
2. **ODG-p1 (partial, substrate only)** — SVG as the piece-rendering substrate (owner's
   stated input); full technique ratified at F6 design.
3. **D-1 Placeholder Skin doctrine** (owner addition, post-Phase-3) — platform ships a
   built-in COMPLETE skin: visual tokens → alt-text; sound tokens → transient
   self-removing captions. Satisfies R-21/R-22 lawfully; enables asset-free mechanic
   testing; doubles as the A11y floor. Routed: RESOLUTION_RECORD + F-supersession
   proposal (so S3 stays truthful).
4. **D-2 Flourish library doctrine** (owner addition) — reusable experience presets
   (dice throw, card flip/reveal, …) as PRESENTATION-TIER presets: bound to kind/join
   contracts, opt-in per game, promotable from pack-local to library like Ventures.
   Same routing as D-1.
5. **Stack** — proposed: TypeScript monorepo (`packages/engine`, `packages/presentation`,
   `packages/patterns`, `packs/`), Vitest harness, CI hook for HK-6. The handoff is
   stack-silent (per-platform packaging is a production concern); this is an
   interpretation the owner should ratify, not inherit.

**C4 verdict: PROCEED conditional on the five rulings above** — no halt-class defect; no
building until the gate closes (Do-not: never build over an unrecorded resolution).

## Gate install at the 2.9.1 adoption (H-1) — 2026-11-08, R1 install (I-261)

The build predates the plugin template; the owner ruled "Adopt, fix findings". The template machinery was copied in as
a set (tools/, .metaframework/, .claude/settings.json hooks + agents, governance contracts, rubrics, the current
Phase 4 roster and Object Writing Standard), then:

- `python3 tools/install-gates.py` → wrote `.githooks/pre-commit`, `pre-merge-commit`, `pre-applypatch`; set
  `core.hooksPath`; `.claude/settings.local.json`: 56 plugins off, 2 on (metaframework, oop-standards); "complete".
- `node <oop-standards>/code-gates/scripts/gates.cjs init` → `.code-gates.json` (default limits); `code_gates: true`;
  `install-gates.py --code-gates <gates.cjs>` → "complete". code-gates resolves the repo's own TypeScript.
- `python3 tools/phase4-checks.py gates` → **pass** (exit 0). `rosters` pass; `structure-check` pass.
- Still open, for the R1 build session: `modules` (37 source files claimed by no object-model row), `objects` (7 OS-2
  hits, all function-local `let`s: an SR-1 case), `scaffold`, the library's 41 code-gates findings, the bench's move
  to `ui/`, and the live probe from each session shape — it needs a session started after this install, since Claude
  Code reads hooks only at session start (TE-3).

## Pre-repair sweep (read-only measure) — 2026-11-08, run 20261108T212337Z-seal-check-09b3, tree 3a3c47f90a5a

`seal.py check` through `tools/run.py`, on the owner's "okay, carry on", before any repair. Status **fail**:
- **pass (real):** worktree-clean; full-suite (exit 0); rederive-all (exit 0); structure-check.
- **pass (empty — nothing to compare yet):** full-review, s3-coverage, declarations-match. The object model is not in
  the template's format, so these find no modules; they bite once the 37 files are mapped.
- **fail:** reviewed (no final K7, `k7-run.py --final`); isolation-tests (OS-12 undeclared: 34 classes, none with an
  isolation test; 7 files hold two classes); phase4-checks (modules unclaimed; objects 7 OS-2, an SR-1 case; tags 36:
  the old k7-pass tags have no verdict files; scaffold 3); emission-check (the S3 predates the emission contract's
  headings — a re-emission is an S3 revision, the owner's to rule); interface-contract (ui/interface-contract.md
  unwritten, a close step). Plus the 41 code-gates findings. Carried: 6 completion-ledger rows read as "awaiting K7".

## Live gate probes at R1 (H-1) — 2026-11-08, the R1 repair session

- **The lead's session** (started in this folder after the 2.9.1 install, so `.claude/settings.json`'s hooks load,
  TE-3): its Write of `.metaframework/gate-probe` was refused; `.metaframework/gate-live.jsonl` line nonce
  `7a3f19c2e4b8d061`, session `f7fce8bb-94b2-401c-95c1-77b5675a6788`, agent_id null, gate sha256 `04ff8826fcd5…`.
- **A builder sub-agent:** each builder's first call is its brief's probe, verified by `brief.py verify --nonce`; the
  first builder's line is cited in the completion ledger and below when it runs.
- **No worktree** is used in R1: builders and the lead work in this folder.

## Revision v1.3 · 2026-11-08 (tools/anchor-s3.py --revision)

- **Supersedes** `governance/S3/CLAUDE_TABLETOP_Phase3.md`, anchored at `s3-anchor-v1.2`. Every file anchored before stays as it was.
- **Discharges** SP-7 (`INSTRUMENTS/F-supersession-proposals.md`).
- **Placed** in `governance/S3/v1.3/` and tagged `s3-anchor-v1.3`:
  - `CLAUDE_TABLETOP_Phase3.md` sha256 `9b10495ba53a391d6c0201328f3a8e728a92a9859aad48acf18f1e4dc85485f4`
  - `TABLETOP_Phase3_Specification.md` sha256 `ff4cecd2842faaacfc22c197952e81dddb7e6e97158ea9277f137e67ff773822`
- **s3_document** is now `governance/S3/v1.3/CLAUDE_TABLETOP_Phase3.md`: briefs, K7 and the seal read the revision from this commit on.

## Seal sweep at R1's close — 2026-11-09, run 20261109T012245Z-seal-check-6761, HEAD `d6c175e`

`seal.py check` through `tools/run.py`, once, after the final K7 review (round 1, RETURN at drift 5). Status **fail on one
step**, triaged once for the owner's single seal approval:
- **pass:** worktree-clean; reviewed (the final review, round 1; the owner's approval closes it); full-review (every
  module's final content had a full review); full-suite (exit 0, 821 tests); rederive-all (exit 0); isolation-tests
  (exit 0, OS-12, environment cleared); structure-check; emission-check; s3-coverage (every specified module is
  built); interface-contract (written); declarations-match (signatures, object model and contract agree).
- **fail:** phase4-checks, and within it only `tags`: the 36 `k7-pass-*` tags placed before the K7 runner existed
  (25 Jul to 4 Aug) match no `k7-pass-<N>` verdict file. Each is accounted for in `INSTRUMENTS/legacy-k7-tags.md`;
  RD-11 keeps closed gates closed and tags unmoved. **Triage: known issue** (`seal.py apply --accept-failures`),
  the owner's to accept in the one approval. modules, objects, scaffold, rosters and gates pass.
- **carried to Phase 5:** PC-01..PC-09; the final review's twelve blocking findings (as `noticed` gaps); the nine
  SR-1 OS-2 entries as known issues (K7's compensating check: the files hold no module-level mutable state); six
  pre-template completion-ledger rows that still read "awaiting K7".
