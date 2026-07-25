# Drift Ledger + Interpretation Register — TABLETOP build

**Teeth:** no new work on a module scoring < 7 on any dimension until the score is raised.
Scores are set by the DISTINCT K7 reviewer — never by the builder.

## Drift entries

| ID | Location | Drift | Score (K7) | Status |
|---|---|---|---|---|
| D-1 | core.ts HK-1 | hook not falsifiable (mutation A survived); injection test masked by no-applier branch | axiom 6 → blocked | FIXED: refusal path narrowed to `legal === false`; hook blocks all else; K7-recipe on-path test added — awaiting K7 re-score |
| D-2 | core.ts/intentlog.ts | logged intents aliased to caller objects — row tamperable post-success (GX-3/GX-4 breach) | axiom 5 → blocked | FIXED: intent structuredClone+freezeDeep at submit door; tamper-stability regression tests — awaiting K7 re-score |
| D-3 | guard.ts | unregistered `state.seats` schema contract; appliers could mint seats | fidelity 6 → blocked | FIXED: seats passed from the row (I-7); mint-attack regression test — awaiting K7 re-score |
| D-4 | tools/check-tiers.mjs | bare-import + relative-path evasions (HK-6) | major | FIXED: all specifier forms + relative-escape resolution |
| D-5 | instruments | S3 "self-heal" unmapped | minor | FIXED: object-model note — self-heal = Transport's consumption of rebuild() at F7 |
| D-6 | statetree.ts | NaN/Infinity → null conflation in hash | minor | FIXED: throw on non-finite (I-5′) |
| D-7 | rng.ts / repo | dead draws getter; I-4 collision caveat absent; tsbuildinfo committed | minor | FIXED: getter pruned; I-4′ recorded; artifact gitignored |

## Interpretation Register (decisions the handoff did not make)

| ID | Decision taken | Class (benign/latent/conflicting) | Route (local / F-supersession / AE-link) |
|---|---|---|---|
| I-1 | MoveLogRow carries pack-ref (id, version, integrity hash) — AX-4/V-2 well-definedness | latent | F-supersession (drafted) |
| I-2 | Genesis state = PackLoader's validated setup declaration over (pack, seats, seed); empty log = genesis | benign | local; depends on I-1 |
| I-3 | Non-active-writer submit semantics (refuse vs queue) | benign | local; registered at F7 build, AE-linked to lockstep spec |
| I-4 | RNG algorithm = mulberry32 over FNV-1a fold of (seed ⊕ stream name) — pure JS, portable, byte-stable | benign | local (rng.ts) |
| I-5 | State hash = FNV-1a 64-bit over canonical (key-sorted) JSON — pure, no platform imports (ER-7); NOT cryptographic; tamper-evidence stays a production concern (S3 §8) | benign | local (statetree.ts) |
| I-6 | Applier misbehavior (no state produced) → HookViolation throw, state+log untouched — engine defect surfaces loudly, never repaired into a refusal | benign | local (core.ts, HK-2 injection test) |
| I-7 | Seat legality checked against the ROW's authoritative seats (passed to Guard.check), never a state schema — kernel pack-agnostic; appliers cannot mint seats; genesis need not carry a seats key | benign (K7 defect 3 closure) | local (guard.ts, gx3-log-integrity tests) |
| I-4′ | I-4 caveat appended (K7): fnv1a32 stream-name fold is 32-bit — a name collision would silently merge two streams; stream names are engine-chosen (closed set per pack), not user input; revisit if packs ever name streams | benign | local (rng.ts) |
| I-5′ | I-5 caveat closed (K7 defect 6): canonicalJson now THROWS on non-finite numbers rather than conflating with null | benign | local (statetree.ts) |

## Log

- **2026-07-25 — ledger opened at C4 anchor. I-1..I-3 registered from the C4 probe run; no builder code exists yet.**
- **2026-07-25 — F1 built (I-4..I-6). K7 round 1: RETURN — 3 blocking (D-1..D-3), 1 major (D-4), 3 minor (D-5..D-7). Falsified builder claims noted in the completion ledger. All seven closed by the builder; I-7, I-4′, I-5′ registered; suite 24/24; sent back for K7 re-verify (mutations A–E to be re-run by K7, not the builder).**
- **2026-07-25 — K7 round 2: PASS.** Mutations A–H re-run by K7 (incl. three NEW mutations F/G/H proving the fixes themselves falsifiable); both round-1 probes reconstructed live. Scores (worst dim): types 9 · M1 8 · M2 8 · M3 8 · M4 8 · core 8 — all ≥ 7, **teeth released; F2 may open**. M3 stays NOT-COMPLETE by rule (V-1/V-2 deferred to F2). Non-blocking observations registered below.
- **K7 obs-1 (registered, next-touch obligation on core):** injected guard returning `{legal:false}` without a refusal payload → submit returns `undefined` (outside SubmitResult). Unreachable with the real Guard; close with a defensive throw at next core touch.
- **K7 obs-2 (registered):** structuredClone imposes a cloneability contract on intent args — loud DataCloneError, consistent with the JSON-typed Intent.
- **K7 obs-3 (standing):** I-1/SP-1 upstream supersession still DRAFTED — V-2's discharge at F2 depends on the owner running it through the Phase 3 project.
