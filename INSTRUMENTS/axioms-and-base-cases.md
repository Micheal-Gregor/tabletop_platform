# Axioms & Base Cases — TABLETOP build

Axioms restate the carried rules this build must uphold, each citing its S3/S2 source.
Base cases are pre-solved scenarios (input → expected observable outcome); every one becomes
an executable test BEFORE its feature ships. IDs are stable.

## Axioms (carried rules, code-level) — F1 set

- **GX-1 — Guarded intent path.** No state mutation exists outside `core.submit(intent)`;
  the Guard's LEGAL verdict gates every apply. *Cites S-1, R-10, HK-1.*
- **GX-2 — Refusal-not-repair.** An illegal intent yields a TYPED refusal; the state is
  byte-unchanged; nothing is logged. The engine never "fixes" an intent. *Cites R-1, ER-1/2.*
- **GX-3 — Log-as-truth.** The persisted game is `{packRef, seed, seats, moves}` (I-1);
  the log records ONLY succeeded intents, appended AFTER success. *Cites S-2, HK-2, AX-4.*
- **GX-4 — Rebuild, never patch.** Replay divergence → full rebuild from the row; no
  partial state repair. `rebuild(row)` is byte-deterministic. *Cites R-9, AX-4.*
- **GX-5 — Stream isolation.** Randomness comes only from named, seeded streams with
  fixed offsets; human inputs enter as intent ARGUMENTS, never as entropy; one stream's
  consumption never shifts another's sequence. *Cites ER-6, S2 M4.*
- **GX-6 — Derived-never-stored.** Values computable from the tree are never persisted on
  it; ids live on-state. *Cites S2 M1.*

## Base cases (input → expected observable outcome) — F1 set

- **GBC-1 —** *Given* a genesis state and a legal test intent, *when* submitted, *then*
  the new state reflects exactly the applier's mutation, the log gains one entry, and the
  entry equals the submitted intent. *(GX-1/GX-3; test: basecases.test.ts)*
- **GBC-2 —** *Given* an illegal intent (unknown type OR failing rule-level check), *when*
  submitted, *then* a typed refusal `{code, rule, detail}` is returned, deep-equal state,
  log length unchanged. *(GX-2 = R-1; test: r1-refusal.test.ts)*
- **GBC-3 —** *Given* a completed 10-move game row, *when* rebuilt twice from
  `{packRef, seed, seats, moves}`, *then* both rebuilds hash identically to the live final
  state. *(GX-3/GX-4; feeds V-2 — vector value COMPUTED later, never hand-written)*
- **GBC-4 —** *Given* a row whose moves contain an intent that the Guard refuses during
  replay (tamper), *when* rebuilt, *then* rebuild REFUSES as a whole (divergence), and no
  partially-applied state is observable. *(GX-4 = R-9; test: r9-divergence.test.ts)*
- **GBC-5 —** *Given* the exported state object, *when* any consumer attempts direct
  mutation, *then* the attempt throws (frozen) — and no engine API returns a mutable
  reference. *(GX-1 = R-10; test: r10-structural.test.ts)*
- **GBC-6 —** *Given* two streams `dice` and `deck` from one seed, *when* `dice` draws N
  values, *then* `deck`'s sequence is unchanged vs a fresh build; same seed+stream+index →
  same value always. *(GX-5; test: rng.test.ts)*
- **GBC-7 —** *Given* a human choice (e.g. chosen seat), *when* it enters play, *then* it
  appears as an intent argument in the log and NEVER as a stream draw. *(GX-5; test:
  rng.test.ts)*

## Axioms — F2 set

- **GX-7 — Sole applier, closed vocabulary.** EffectEngine applies every effect; EFX
  v1.1.1 (pay, capitalize, grant_favor, levy, deck_inject, grant_sue_right, open_window)
  is sealed; an unknown descriptor is refused LOUDLY at the HK-9 gate — halt-not-skip.
  Per-descriptor mutators are module-private (R-24's structural half). *Cites S-3, R-3,
  R-24, HK-9.*
- **GX-8 — Windows gate; decisions are never skipped.** An open gated window blocks seat
  advance; the decision is taken by the decider or by auto-policy (eliminated/absent
  decider), and either way it is a LOGGED intent. *Cites S-8, R-6, R-7, HK-5.*
- **GX-9 — Wrap once.** Round-wrap fires exactly once per round; a second wrap-tick in
  one round is refused. *Cites ER-3, R-8, HK-3.*
- **GX-10 — Validation names defects.** A pack enters play only through validate():
  EFX closure (every fx list ⊆ EFX), schema, version — refusals NAME the offending
  member. *Cites S-5, R-2, HK-4.*
- **GX-11 — Depth-1 window law.** open_window may not fire from within a window
  application. *Cites R-17 (engine side; MR1 side lands at F4).*
- **GX-12 — Decks are streams + order.** Shuffle/draw from named RNG streams; injection
  is order-preserving by policy; drawing from an empty deck is legal (yields none).
  *Cites S2 M6, Stage-2b S8.*

## Base cases — F2 set

- **GBC-8 —** *Given* a pack containing a card with fx `"summon_dragon"`, *when* loaded,
  *then* load refuses NAMING `summon_dragon` and the card. *(GX-10 = R-2; r2-pack-load)*
- **GBC-9 —** *Given* a running game and an injected descriptor `{fx:'hack'}`, *when*
  applied, *then* EffectRefusal — loud, state unchanged, nothing skipped. *(GX-7 = R-3)*
- **GBC-10 —** *Given* each of the seven EFX descriptors with minimal args, *when*
  applied, *then* exactly its typed mutation occurs (pay moves cash; capitalize creates
  an owned asset; grant_favor mints n; levy charges scope; deck_inject inserts
  order-preserving; grant_sue_right records the right; open_window opens an IWN). Feeds
  V-3 — values computed at discharge, never hand-written. *(GX-7)*
- **GBC-11 —** *Given* an open gated window, *when* the seat tries to pass, *then*
  refused (R-6); *when* the decider resolves it, *then* the option's fx apply and pass
  proceeds. *(GX-8, HK-5)*
- **GBC-12 —** *Given* a window whose decider is eliminated, *when* pass is attempted,
  *then* refused; *when* `window:auto` is submitted, *then* the auto option applies and
  the decision IS in the log. *(GX-8 = R-7)*
- **GBC-13 —** *Given* the last seat passing, *then* the round wraps once (flag set);
  *given* a forced second wrap in the same round, *then* refused. *(GX-9 = R-8, HK-3)*
- **GBC-14 —** *Given* one seed, *then* deck order is identical across rebuilds; inject
  'top'/'bottom' preserves order; empty-deck draw is a legal none. *(GX-12)*
- **GBC-15 —** *Given* the engine's public surface, *then* no per-descriptor mutator is
  exported — the ONLY effect path is EffectEngine.apply. *(GX-7 = R-24 structural)*
- **GBC-16 —** *Given* a window option whose fx contains open_window, *when* resolved,
  *then* refused (depth-1). *(GX-11 = R-17 engine side)*
- **GBC-17 —** *Given* a full F2 scenario (load, draws, window, wrap), *then* rebuild
  from the row is byte-identical. *(GX-3/4 carried into F2 machinery; feeds V-2)*

## Axioms — F3 set

- **GX-13 — Admission by rule, never enumeration.** A kind is admitted iff it declares
  identity + state shape, roles with EX-3-bindable bindings, and grantable relations ⊆
  the five. The gate refuses NAMING the defect. *Cites EX-2, S-5, R-14 adjacency, HK-7.*
- **GX-14 — Roles bind to platform primitives.** Randomizer→RNGStreams · Tracker→derived
  state · Reference→ruleset presentation · TimeSource→DEFERRED (ODG-e1: admit the kind,
  defer the binding; USE of the deferred binding refuses). Unbindable → inadmissible.
  *Cites EX-3, R-11, RD-e5.*
- **GX-15 — Relations are typed and predicated.** Exactly five (Placement, Composition,
  Attachment, Overlay, Representation); formation/dissolution by predicate (HK-8);
  form/dissolve EMISSIONS recorded on-state for the F4 HookBus (S-4). A formation
  without a holding predicate refuses. *Cites EX-5, R-13, HK-8.*
- **GX-16 — Views never own.** A Representation relation reads a derived-state path,
  mode read-only, always; any write path through it refuses. *Cites EX-6, R-12, SC-2.*
- **GX-17 — Surfaces and the recursion.** Placement occurs on Surfaces (topology ∈
  {grid, hex, track, slots, freeform}); components COMPOSED side-by-side FORM a Surface
  — the built map is itself a Surface and accepts placement. *Cites EX-4, ER-e3 (V-6).*
- **GX-18 — Supersede, never respec.** An admitted kind is never redefined in place;
  supersession records the chain. *Cites R-14.*

## Base cases — F3 set

- **GBC-18 —** *Given* a novel kind declaring identity+shape, bindable roles, and legal
  relations, *when* admitted, *then* it enters the registry (admission by RULE — the
  "standee" proof). *Given* one missing leg (no shape / TimeSource-required / relation
  ∉ five), *then* refusal NAMES the leg. *(GX-13 = V-5's table; HK-7)*
- **GBC-19 —** *Given* role Randomizer/Tracker/Reference, *then* bound to its primitive;
  *given* TimeSource, *then* DEFERRED(ODG-e1) — admissible, unusable; *given* an unknown
  role, *then* R-11 refusal. *(GX-14)*
- **GBC-20 —** *Given* an admitted kind re-registered, *then* R-14 refusal; *given* a
  supersession, *then* new def + recorded chain. *(GX-18)*
- **GBC-21 —** *Given* a Placement whose predicate holds, *then* formed + on-form
  emission recorded; *given* a failing predicate or unknown relation type, *then* HK-8/
  R-13 refusal, nothing emitted. Dissolution mirrors. *(GX-15)*
- **GBC-22 —** *Given* a Representation relation, *then* reads return the derived value;
  a write attempt through it → R-12 refusal; forming one with mode ≠ read-only → refused
  at formation. *(GX-16)*
- **GBC-23 —** *Given* each topology, *then* position-shape validity is enforced (grid
  int x/y · hex q/r · track index · slots slot-id · freeform numeric x/y); a wrong-shape
  placement refuses. *(GX-17)*
- **GBC-24 —** *Given* tiles composed side-by-side, *then* a NEW Surface exists whose
  substrate is the composed set, and placement onto it succeeds (V-6's law); dissolving
  the composition retires it. *(GX-17 recursion)*

**N/A-by-absence (F3 slot):** contribution dispatch (F4 — emissions recorded, consumed
later per I-21); kind SKINS/fidelity (F6); specific piece stats (pattern/content tier).

**N/A-by-absence (F1 slot):** window gating, EFX closure, admission, projection — their
rules live with F2/F3/F4/F6 and are N/A here by structure (no such surface exists in F1).
**N/A-by-absence (F2 slot):** balanced-move posting (R-5, Ledger = F5); registry dispatch
order (V-7, F4); admission (F3); presentation rules (F6). Venture/TFX semantics = F5.

Rule: a base case that cannot be expressed as a test signals the object model is wrong —
fix the model (backflow), don't skip the test.
