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
