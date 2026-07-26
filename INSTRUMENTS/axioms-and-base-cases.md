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

## Axioms — F4 set

- **GX-19 — Registry law.** RuleRegistry is the SOLE dispatcher of contributions; no
  if-ladder; dispatch = per-firing snapshot in total order (hook, bearer-entry-seq).
  Effects apply ONLY via EffectEngine (the S5 boundary, R-24/HK-9 full). *Cites S-3.*
- **GX-20 — Contributions validated at load.** trigger ∈ HookPoints v1.0 ∧ effects ⊆ EFX
  v1.1.1 ∧ versions known ∧ slots declared — refusal NAMES the member. *Cites R-15, HK-4.*
- **GX-21 — Bounded meta.** A condition reads ONLY event fields and its own declared
  slots — statically (validation) and at runtime (hasOwn-bounded resolution). *Cites R-16.*
- **GX-22 — Declared state only.** Rule state lives in declared slots with a reset class
  (never/per-turn/per-round/per-game); an undeclared write refuses. *Cites R-18.*
- **GX-23 — Governed growth.** The three vocabularies grow ONLY through ExtensionContract
  cycles with per-member obligations; runtime NEVER mutates a sealed vocabulary. *Cites S-7.*
- **GX-24 — Relation-borne activation.** A relation-borne contribution is active iff a
  formed relation of its bearer type exists — DERIVED from state, never bookkept (V-8's
  law: registers on form). *Cites ER1-4 × EX-5.*

## Base cases — F4 set

- **GBC-25 —** contribution w/ unknown hook / unknown effect / unknown version / undeclared
  slot-write target → load refusal NAMING it. *(GX-20 = R-15)*
- **GBC-26 —** condition referencing beyond event.*/own slots → refused at validation; a
  forged runtime path resolves bounded-only. *(GX-21 = R-16)*
- **GBC-27 —** slotWrite to a declared slot lands on state.ruleSlots; undeclared →
  refused; per-turn/per-round resets clear exactly their class. *(GX-22 = R-18)*
- **GBC-28 —** two contributions on one hook fire in bearer-entry-seq; a contribution
  registered MID-firing does not join that firing (snapshot). Feeds V-7. *(GX-19)*
- **GBC-29 —** the monster room: a relation-borne contribution fires only while its
  relation is formed (pump on-form → active; dissolve → inert); its effects flow through
  EffectEngine only. Feeds V-8. *(GX-24, GX-19)*
- **GBC-30 —** an open_window effect fired from dispatch at windowDepth ≥ 1 → refused
  (R-17 MR1 side). A dispatch on an unknown hook → HK-9 halt.
- **GBC-31 —** propose() without full obligations → refused; an approved cycle NEVER
  mutates the sealed vocabulary at runtime; docket members remain non-members. *(GX-23)*
- **GBC-32 —** RulesetView exposes every vocabulary member and registered contribution
  (total exposure); it is derived, never stored. *(MR6)*

**N/A-by-absence (F4 slot):** turn/lifecycle hook EMISSION from engine paths = I-29 (F5
weave); UniqueDef art/params consumption (F6/packs); VerbSets consumption (F6).

## Axioms — F5 set

- **GX-25 — Balanced or refused.** With the Ledger loaded, every resource move posts as
  zero-sum legs (bank absorbs); an unbalanced post THROWS; final cash ≡ derived account
  balances (RC-D). Application flows through EffectEngine (S5 held). *Cites R-5, RC-3.*
- **GX-26 — Venture is the sole contract primitive.** General (multi-party, routed,
  debt-carried) AND degenerate (single-portion Job, RC-A′) forms; lifecycle spawn →
  assigned → work → all-complete → payoff DIST | lapse (status flip + crew release;
  penalty paths = pack policy args, N/A-by-absence). *Cites RC-A′, RC-E (Stage-2b).*
  *(Cite corrected per K7-F5 DF5-7 — the former T2 token resolved nowhere; lapse leg
  corrected per DF5-9 — "penalty" overclaimed what is built.)*
- **GX-27 — Decisions gate and log.** A windowed routing decision opens a gated IWN
  (blocks advance, S-8); the choice closes it; effectuation is the SUBSEQUENT logged
  library intent carrying the decision as arguments (I-36 — human inputs as arguments,
  AX-3; auto/AI parity preserved: both paths are logged intents). The window is the
  recorded GATE and ceremony; the route intent's arguments are SOLELY authoritative
  (I-38 — option-binding = content policy). *Cites A-2b-02 (Stage-2b).* *(T3 excised
  per DF5-7.)*
- **GX-28 — One crew, one portion.** Assignment to a busy crew member refuses; work
  burns exactly one unit per work intent. *Cites CRW.*
- **GX-29 — Timed effects tick at the wrap, once.** TFX charges apply at round wrap
  through the weave (never twice — GX-9 guards the wrap); duration expires to removal;
  charges post balanced when the Ledger is loaded. With the library wired, the weave
  OWNS the pass — turn:pass is superseded (I-37) so no logged intent can wrap without
  the tick. *Cites RC-G.* *(T6 excised per DF5-7.)*
- **GX-30 — The Closing Round closes the books.** At 'closing': trailing-first order,
  receivables force-collected as balanced posts, rank by cash, champion recorded, status
  'ended' — I-17's reserved vocabulary finally set. *Cites RCK, QG1-Q1.*

## Base cases — F5 set

- **GBC-33 —** balanced post lands (legs on state, cash via EffectEngine, derivation ≡
  cash); unbalanced post → LedgerRefusal naming the imbalance. *(GX-25 = R-5)*
- **GBC-34 —** degenerate venture: spawn(1 portion, self) → assign → work 1→0 →
  complete → receivable lands. General: route windowed → window gates pass → decision →
  route intent → counterparty portion + carried debt; completion → receivable to
  counterparty. *(GX-26/27)*
- **GBC-35 —** assigning a busy crew member refuses; work on an unassigned portion
  refuses. *(GX-28)*
- **GBC-36 —** TFX(table, levy 1, duration 1): tick at wrap charges all living seats
  (balanced when loaded), then expires; no second tick. *(GX-29)*
- **GBC-37 —** debts due round N settle at N's upkeep as balanced posts. *(GX-25)*
- **GBC-38 —** reckon: receivables collected, ranking trailing-first computed, champion
  by cash, status 'ended'; reckon before 'closing' refuses. *(GX-30)*
- **GBC-39 —** the weave: turn:end at the last seat wraps the round ONCE, dispatches
  on-round-wrap through the F4 bus, ticks TFX, resets per-round slots. *(GX-29, I-29)*
- **GBC-40 —** THE MINIMAL GAME (Stage-2b S0..S10, σ=7): A ends at 0, B at +3, B is
  champion; every ledger entry balanced; cash ≡ derived balances; rebuild ×2
  byte-identical. Feeds V-1 — pinned only at the owner's R gate. *(everything)*

**N/A-by-absence (F5 slot):** estates/respawn mechanics (viability PO LICY args recorded,
full elimination flows = pack/universe content); commission_now routing (parameter point,
not exercised by MINIMAL — content-reachable per Stage-2b §2); venture-lapse PENALTY
paths (levies/favor hits on lapse = pack policy args — the platform ships the status
flip + crew release only; DF5-9 registered the boundary).

**N/A-by-absence (F3 slot):** contribution dispatch (F4 — emissions recorded, consumed
later per I-21); kind SKINS/fidelity (F6); specific piece stats (pattern/content tier).

**N/A-by-absence (F1 slot):** window gating, EFX closure, admission, projection — their
rules live with F2/F3/F4/F6 and are N/A here by structure (no such surface exists in F1).
**N/A-by-absence (F2 slot):** balanced-move posting (R-5, Ledger = F5); registry dispatch
order (V-7, F4); admission (F3); presentation rules (F6). Venture/TFX semantics = F5.

Rule: a base case that cannot be expressed as a test signals the object model is wrong —
fix the model (backflow), don't skip the test.
