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

## Axioms — F7 set

- **GX-31 — The row is the session.** Transport is lockstep over the S-2 row: submits
  append through the hosted core's guarded path; every subscriber observes the SAME
  ordered moves; resume = full rebuild from {packRef, seed, seats, moves} (AX-4/SUP-1).
  A packRef mismatch at resume — id, version, OR hash — refuses WHOLE as divergence
  (R-9); never a partial adoption. *Cites AE-c6-CF, SUP-1.*
- **GX-32 — Writer discipline; the row heals.** A client submits only for a seat it
  HOLDS (join/leave/takeover presence); a departed holder's seat is takeover-eligible;
  a NON-holder submit refuses typed
  *(clarified append-only per K7-F7 D5: a departed-but-not-taken-over holder MAY still
  write — departure makes the seat takeover-ELIGIBLE, it does not revoke the hold)*. Self-heal is never a patch: a rejoining client
  rebuilds from the row. Host submits for AI seats (auto-parity, I-16 family).
  *Cites AE-c6-CF.*
- **GX-33 — A preset is data.** A catalog entry = {id, family, doc,
  build(params) → fragment}; defaults live IN the builder signatures (e.g. work ?? 1)
  — *corrected append-only per K7-F7 D4: the earlier "defaults" catalog field
  overclaimed the shipped shape; I-41 is the accurate registration*; builders EMIT DATA ONLY — no engine call, no state touch,
  window fx ⊆ EFX v1.1.1. Bad params refuse at build (PatternRefusal). Fragment
  behavior — exercised through the ENGINE's doors — is what V-4 pins (VK-8).
  *Cites ODG-3/I-41, BOTY inventory §5.*
- **GX-34 — Tiers point one way.** platform < library < patterns < content; an upward
  import FAILS the build (HK-6); the criterion itself is falsifiable — R-4 injects an
  inversion and the checker must name it. *Cites R-4, HK-6.*

## Base cases — F7 set

- **GBC-41 —** two subscribed clients: every submit through the controller reaches both
  in the same order; final hashes identical; the controller's row replays byte-identical.
  *(GX-31)*
- **GBC-42 —** resume against a row whose packRef differs in id, version, or hash →
  refused whole, each leg NAMED; no partial state escapes. *(GX-31 = the SUP-1
  obligation)*
- **GBC-43 —** writer discipline: a client submitting for a seat it does not hold →
  typed refusal, unlogged; after the holder LEAVES, takeover succeeds and play
  continues on the same row. *(GX-32)*
- **GBC-44 —** preset fidelity floor: the 'job' VNT preset builds RC-A′ (spawn → assign
  → work → complete → receivable through the engine); an IWN preset opens its named
  gated window; a TFX preset ticks at the wrap; RTM configs carry the three routing
  models' shapes. Feeds V-4 — pinned only at the owner's R gate. *(GX-33)*
- **GBC-45 —** R-4: an injected upward import (patterns → presentation; engine →
  patterns; any → packs) makes check-tiers FAIL naming the file. *(GX-34)*

**N/A-by-absence (F7 slot):** network/realtime infrastructure, host election, presence
timeouts (production concerns, S3 §8); AI decision POLICY (host submits; policy = content
tier); pattern-preset numeric tuning (content-pack parameters; the catalog carries
STRUCTURE + defaults only).

## Base cases — BOTY slice (content tier; no new axioms — content adds NO law)

- **GBC-46 —** the pack LOADS: HK-4 validates every card (a poisoned variant with fx
  'summon_dragon' refuses naming it); both contributions pass the MR3 door; the tier
  gate stays clean (content imports engine/patterns downward only). *(GX-10, R-15, GX-34)*
- **GBC-47 —** THE SLICE GAME (3 shops, 3 rounds, seed fixed): upkeep wages · card fx
  fire through EFX (town levy, injected payday via living-deck, capitalize, sue right,
  choice window) · job preset RC-A′ to its receivable · routed 3-portion GC → gated
  routing window → subcontract-debt route → counterparty works all portions → completion
  · recession TFX ticks once at the wrap · contributions fire each wrap · debt settles at
  its due round's upkeep · closing:reckon crowns the champion — moe +4, pete −2, edie −6
  · every ledger entry balanced · cash ≡ derived balances + KNOWN EFX deltas (the I-46
  reconciliation) · rebuild ×2 byte-identical. *(the whole machine, content-driven)*

**N/A-by-absence (BOTY slice):** the full card catalog, 6 trades, 24 rounds, tuned
economy tables (content fidelity = Phase 5/production); multi-TARGET routing of one
venture (GX-27 routes all unassigned portions to ONE counterparty — per-portion routing
= repeated spawn/route or a docketed extension); estates/elimination flows; content-
triggered venture spawn (awaits the docketed spawn_venture EFX member).

## Axioms — F6 set

- **GX-35 — Scoped purity.** Every render read flows through SeatProjector: views are
  branded, deep-frozen, and REDACTED per seat; any renderer handed an unbranded object
  refuses (ProjectionBreach). *Cites R-19, HK-10, S-6.*
- **GX-36 — Tokens only; the Placeholder is complete.** Presentation contracts name
  TOKENS; a raw value in a contract refuses naming it (R-22); binding refuses naming
  every missing token (R-21/HK-12); the D-1 Placeholder Skin binds ANY contract
  completely by construction — frames before assets. *Cites R-21, R-22, HK-12, D-1.*
- **GX-37 — Presentation emits intents, nothing else.** The verb map is closed; emission
  is DATA {type, seat, args}; anything else refuses. *Cites R-23, S-6.*
- **GX-38 — Theater over truth.** Flourishes are data presets (D-2); at animation
  complete, displayed ≡ seeded or the mismatch is FLAGGED and the seeded result wins —
  always. Sound placeholders are captions that self-remove (D-1). *Cites R-20, HK-11, EP-2.*
- **GX-39 — Two clocks; the floor is labeled.** The game clock derives from the view;
  the animation timeline is local and never writes state (ODG-e1 stays open — no
  TimeSource binding); every rendered element carries a label (a11y floor). *Cites
  EP-cluster, ODG-e1.*

## Base cases — F6 set

- **GBC-48 —** projection: opponent deck CONTENTS absent (counts present); window
  options visible only to the decider; the view is frozen + branded; a renderer handed
  raw State refuses. *(GX-35 = R-19)*
- **GBC-49 —** skin: binding a contract with missing tokens refuses NAMING them; a raw
  value ('#ff0000', 'flip.png') in a contract refuses; the Placeholder Skin binds any
  contract with zero refusals. *(GX-36 = R-21/R-22, D-1)*
- **GBC-50 —** emitter: each verb emits a well-formed intent that the ENGINE accepts;
  an unknown verb refuses; a non-intent emission refuses. *(GX-37 = R-23)*
- **GBC-51 —** theater: a flourish completing with displayed ≡ seeded → no flag; a
  mismatch → FLAGGED and the seeded result returned (truth wins); a sound caption
  expires after its ttl. *(GX-38 = R-20)*
- **GBC-52 —** render: component SVG contains the bound token values and a <title>
  label per element (a11y floor 0 missing); the booklet lists every contribution.
  *(GX-36/GX-39)*
- **GBC-53 —** clock: displayClock mirrors the view's turn row; advancing the local
  timeline changes NO state byte. *(GX-39)*
- **GBC-54 —** THE DIE-TILE-PAGE SCENE (feeds V-9 — pinned only at the owner's R gate):
  a seeded die result + a placed tile + a booklet page, projected and rendered under the
  Placeholder Skin; every theater-sync verdict ≡; the rendered scene is deterministic
  across rebuilds. *(GX-35..39, EP-2)*

**N/A-by-absence (F6 slot):** live DOM/framework binding, real assets, sound playback,
input handling (Phase 5/utilization — the model is headless by the ODG-p1 ruling);
TimeSource binding (ODG-e1 open); network presence UI (S3 §8); **EP-1′ and "fidelity =
min formula" — N/A-BY-UNRECOVERABILITY (K7-F6 D3): the S3 names them but no definition
survives anywhere in the record; routed upstream as SP-6, never silently skipped.** The
MP9 "labels split" claim is CORRECTED append-only: the FLOOR shipped (every element
titled); a separate labels channel is Phase-5 adaptation work.

## Base cases — Layout contracts (F6 supersession; no new axioms — GX-35/36/39 govern)

- **GBC-55 —** parent layouts validate (regions in unit bounds, ids unique, roles named);
  a child OVERRIDE of an undeclared region refuses named; an ADD colliding with an
  existing id refuses; a SUPPRESS of an unknown region refuses; a lawful overlay yields
  a child whose changes are QUERYABLE (declared shadowing). *(I-50)*
- **GBC-56 —** geometry tailors freely: a five-sided board overlay renders with every
  parent region intact; renderLayout output carries a <title> per region (a11y floor 0)
  and only placeholder-frame content. *(I-50, I-48b, GX-36/39)*
- **GBC-57 —** the camera is stateless toward the game: cameraViewBox is a pure
  function; focus presets derive from the table layout; panning changes no state byte
  and the scene re-renders byte-identically for the same camera. *(GX-39 family)*

## Base cases — BOTY v1-extraction layouts (content tier; no new axioms — I-50's door governs, content adds NO law)

- **GBC-58 —** the four BOTY children (`boty:fortune-card`, `boty:round-card`,
  `boty:shop-board`, `boty:town-table`) each build lawfully through extendLayout with
  their EXACT shadowing declared and queryable (the recorded overridden/added/suppressed
  sets match the module's documented anatomy, no more, no less); each child's lineage
  names its parent; every region stays inside the unit space. A child attempting the
  same anatomy WITHOUT declaration (e.g. adding a region id the parent owns) refuses
  named — the inherited I-50 refusals hold at the content tier. *(I-50, I-51)*
- **GBC-59 —** modal-as-card (I-51a): the round interstitial and the character/fortune
  draw are the SAME layout law — `boty:round-card` and `boty:fortune-card` rendered via
  renderLayout with two different content fills produce a11y-clean frames (audit 0),
  and rendering one child at a camera focus preset is pure composition: no new
  machinery, no state touch, byte-identical for the same (child, content, camera).
  *(I-50, I-51, GX-39 family)*
- **GBC-60 —** the parity children (I-55): `boty:round-preamble`, `boty:rival-summary`,
  `boty:job-card` (promoted), `boty:tradesperson-card`, `boty:equipment-card`, and the
  town-table `art-banner` add ALL build through extendLayout with EXACT declared
  shadowing; `rival-summary` SUPPRESSES local-play and hand (a rival's play zones are
  absent from the view, not hidden — the redaction spirit at the layout tier); the
  promoted job-card carries ONE definition (the pack's — no duplicate id in the bench);
  every child renders a11y-clean; the derivations fixture covers the WHOLE export
  surface. *(I-50, I-55)*
- **GBC-61 —** vocabulary-as-data (I-55c): `CARD_KINDS` is a frozen 6-member content-tier
  set (tradespeople · equipment · jobs · persistent · playable · global); it enters no
  engine door and defines no behavior — it labels gallery filters, nothing else. *(I-55,
  tier law)*
- **GBC-64 —** maturity coverage (I-59): ALL FIVE popped children (books · preamble ·
  round-card · rival-summary · fortune) are DOM-vs-law checked, pinned, and title-
  checked IN-MODAL by the gate (the I-57 candidates discharged — GBC-63's coverage
  qualification tightens to: showcase = pin only, everything popped = full gate);
  the crew rack renders the LIVE tradesperson child (its regions obey the same law);
  the hand fan shows own-cards ONLY on the viewing seat's board (redaction-honest —
  a rival board never renders another seat's ownDiscard). *(I-57, I-59)*
- **GBC-63 —** the visual gate (I-57): in real Chromium, WITHIN THE CANONICAL SCENES
  (game stage + books modal — scope per K7-vg D3; reworded per K7-vg D5, strike 4: the
  EXACT coverage is — showcase pin-covered; books modal DOM-vs-law + pinned; the four
  other popped children (preamble, round-card, rival-summary, fortune) UNIT-TIER ONLY
  with NO visual-gate coverage — extending domVsLaw + pins to them is the recorded
  next-touch candidate), (a) every rendered region rect EQUALS its LayoutDef and every
  def region is PRESENT — a moved rect or a dropped region fails the gate with the
  layout and region NAMED; (b) the canonical scenes re-derive to their pinned SVG
  hashes every run, and an ORPHANED pin fails too (computed pins, the vector discipline
  at the bench tier); (c) the camera PROVABLY MOVES between presets and the same camera
  re-derives a byte-equal viewBox; (d) every GAME-STAGE region carries its <title>
  (a11y floor, in-DOM; the books modal's titles are guarded by its pin, not by VG5 —
  K7-vg re-verify obs). A gate that cannot fail verifies nothing — each assertion must
  be mutation-killable. *(I-57, I-58, GX-39 family)*
- **GBC-62 —** the PANEL kind (I-56): `PANEL_PARENT` validates and joins the parent
  vocabulary (five parents); its regions are the generic report anatomy (title ·
  mode-tabs · line-items · total · footnote) measured off source 10; `boty:books`
  builds through the door as a thin child (lineage ['template:panel']); the kind union
  admits 'panel' and REFUSES nothing that previously validated (no existing layout's
  behavior changes — additive supersession); renderLayout produces an a11y-clean panel
  frame. The statement-tab switch is pure ui-state: same child + different FILLS, zero
  state bytes touched. *(I-50, I-56)*
