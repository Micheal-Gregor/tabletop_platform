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
| DF2-1 | packloader turn:pass | HK-5 real-path wiring theater (MUT-2 survived) | blocking | FIXED: D1 on-path suborned-Guard test; builder re-ran MUT-2 → killed |
| DF2-2 | turn.ts passSeat | HK-3 real-path call unfalsifiable (MUT-4 survived) | blocking | FIXED: D2 forged-wrap passSeat test; MUT-4 → killed |
| DF2-3 | windows.ts auto path | depth-1 law unverified on auto (MUT-13 survived) | blocking | FIXED: D3 auto-trap fixture; MUT-13 → killed |
| DF2-4 | packloader HK-4 | "schema valid" leg absent — NaN cash committable | blocking | FIXED: per-descriptor arg schema, recursive over window options; D4 tests |
| DF2-5 | windows/packloader | nonexistent decider bricks the game | blocking | FIXED: decider ∈ seats at load; absent-decider = auto-eligible; D5 tests |
| DF2-6 | windows.ts | silent auto-index repair (?? option 0) | major | FIXED: refuse at runtime + range-check at load; D6 tests |
| DF2-7 | packloader/effects | deck_inject card smuggling; uncataloged draw silent no-op | major | FIXED: catalog check at load + draw-applier halt; D7 tests |
| DF2-8 | packloader | TOCTOU — pack unsealed after validation | major | FIXED: structuredClone+freezeDeep at loadPack AND wirePack doors; D8 test |
| DF2-9 | effects.ts | unregistered levy exemption | major | FIXED: registered I-15, cited in code |
| DF2-10 | effects.ts | phantom citation "I-05" | moderate | FIXED: cites S1 v2.0 AX-5/S-3 |
| DF2-11 | packloader | wirePack's own HK-4 leg untested (MUT-6b) | moderate | FIXED: D11 direct test |
| DF2-12 | windows.ts | eliminated decider could also resolve (two legal deciders) | moderate | FIXED: I-16 refusal; D12 test |
| DF2-13 | turn.ts | 'ended' dead vocabulary; unbounded closing rounds unregistered | minor | FIXED: registered I-17 (F5 slot deferral) |
| DF2-14 | effects.ts | dead EffectContext.drawInt | minor | FIXED: deleted |
| DF2-15 | instruments | stale "proposed" rows; windowSeq/packId beyond I-8; onTurn mis-cite; deck no-ops unregistered | minor | FIXED: rows updated; I-8′/I-18 registered; cite corrected to M5/turn-order |
| DF2-16 (NEW-1) | packloader HK-4 | zero-option gated window validates → no path to decision, game bricked (GX-8; falsified the closure's own header claim) | blocking (K7 re-verify) | FIXED: options.length ≥ 1 at load (mutation-verified: disabling it fails only the NEW-1 test); trap fixtures given a real inner option |
| DF2-17 (OBS-A/B/C) | effects/packloader/index | unverifiable AX-5 citation; packGenesis unsealed when used directly; forceRoundWrap on the public surface | minor | FIXED: cite → seam S-3 + CLAUDE §9 do-not; packGenesis seals at its own door; forceRoundWrap demoted off the public index (tests import the module directly) |
| EXT2-1 | packloader HK-4 | **external audit 2, BLOCKING:** window whose sole/any option opens a window validates → statically dead under depth-1 → brick/landmine (the NEW-1 SIBLING — DF2-16's closure was narrower than its claim) | blocking | FIXED: nested open_window refused at load ("statically dead"); trap fixtures moved to FORGED GENESIS (engine-side) so runtime R-17 tests stay on-path; mutation-verified (disabling the check fails both R2-1 tests) |
| EXT2-2 | effects.ts | finite-in ≠ finite-out: two max-double pays committed AND logged cash:Infinity; illegality surfaced lazily at hash time | major | FIXED: assertFiniteResult at every numeric mutation (pay/levy/grant_favor) — refused at application; regression proves log holds only the legal move and the row replays clean |
| EXT2-3 | packloader HK-4 | non-array fx (card or option) → raw TypeError, breaking the "names defects" contract | moderate | FIXED: array-shape checks named in the refusal |
| EXT2-4 | packloader wirePack | wirePack's OWN seal unfalsifiable (MP6 survived; D8 only proved loadPack's door) — DF2-8's closure narrower than its claim | moderate | FIXED: direct-wirePack TOCTOU regression (genesis from separate copy); builder re-ran MP6 → killed |
| EXT2-5 (I-19) | effects/packloader | content controlled the unvalidated `gated` flag (unregistered invention; gated:false windows silently skippable) | minor | FIXED: gating ENGINE-RESERVED — every content window gates (S-8); content declaring `gated` → load refusal; registered I-19 |
| EXT2-6 (OBS-1/3) | effects/packloader | dead isFrozen leg in HK-9 (unobservable — frozen objects cannot unfreeze); all-eliminated packs loadable | minor | FIXED: dead leg removed; "no LIVING seat" load refusal added. OBS-2 (mapSeat defensive throw) RETAINED and registered as expected-survivor defensive depth |

## Interpretation Register (decisions the handoff did not make)

| ID | Decision taken | Class (benign/latent/conflicting) | Route (local / F-supersession / AE-link) |
|---|---|---|---|
| I-1 | MoveLogRow carries pack-ref (id, version, integrity hash) — AX-4/V-2 well-definedness | latent → **RESOLVED** | F-supersession EXECUTED as SUP-1 (owner-approved 2026-07-25); interpretation SANCTIONED — no longer ahead of spec |
| I-2 | Genesis state = PackLoader's validated setup declaration over (pack, seats, seed); empty log = genesis | benign | local; depends on I-1 |
| I-3 | Non-active-writer submit semantics (refuse vs queue) | benign | local; registered at F7 build, AE-linked to lockstep spec |
| I-4 | RNG algorithm = mulberry32 over FNV-1a fold of (seed ⊕ stream name) — pure JS, portable, byte-stable | benign | local (rng.ts) |
| I-5 | State hash = FNV-1a 64-bit over canonical (key-sorted) JSON — pure, no platform imports (ER-7); NOT cryptographic; tamper-evidence stays a production concern (S3 §8) | benign | local (statetree.ts) |
| I-6 | Applier misbehavior (no state produced) → HookViolation throw, state+log untouched — engine defect surfaces loudly, never repaired into a refusal | benign | local (core.ts, HK-2 injection test) |
| I-7 | Seat legality checked against the ROW's authoritative seats (passed to Guard.check), never a state schema — kernel pack-agnostic; appliers cannot mint seats; genesis need not carry a seats key | benign (K7 defect 3 closure) | local (guard.ts, gx3-log-integrity tests) |
| I-4′ | I-4 caveat appended (K7): fnv1a32 stream-name fold is 32-bit — a name collision would silently merge two streams; stream names are engine-chosen (closed set per pack), not user input; revisit if packs ever name streams | benign | local (rng.ts) |
| I-5′ | I-5 caveat closed (K7 defect 6): canonicalJson now THROWS on non-finite numbers rather than conflating with null | benign | local (statetree.ts) |
| I-8 | F2 engine state regions: `seats[]{id,cash,favor,assets[],sueRights[],eliminated}` · `turn{round,seatIdx,phase,wrappedRound,maxRounds,status}` · `decks{ref:{draw[],discard[],reserve[]}}` · `windows[]` — card DEFINITIONS stay in the loaded pack (derived-never-stored; packRef pins them) | benign | local (packloader genesis) |
| I-9 | Five phase names = start · draw · resolution · maintenance · cleanup (owner's stated flow); at F2 phase stepping is tracked state, with binding discipline arriving when rules/library attach to phases (F4/F5) | benign | local (turn.ts) |
| I-10 | F2 pack schema depth: `{id,version,efxVersion,maxRounds,seats[],cards{id:{fx[],flavor?}},decks{ref:{cards[],owner?}}}` — flavor carried, never read | benign | local (packloader.ts) |
| I-11 | At F2 the EffectEngine's feeds are card-borne fx only; registry feed = F4, library feed = F5 (explicit deferral, AE-linked to those slots) | benign | local (object model note) |
| I-12 | Elimination MECHANISM is F5 (Outfit viability policy); F2 recognizes the `eliminated` flag: skipped in rotation, auto-policy-eligible for windows | benign | local (turn.ts/windows.ts) |
| I-13 | Window depth tracked via apply-context (depth 0 = normal fx; depth 1 = inside window resolution); open_window at depth ≥ 1 → refused (GX-11) | benign | local (effects.ts) |
| I-14 | V-1 ownership corrected: MINIMAL needs F5 modules; V-1 discharges after F5. V-2/V-3 discharge at F2's R gate | benign | object model + completion ledger |
| I-15 | Table levy exempts eliminated seats (the table charges the living; estates = F5 Outfit territory) | benign (K7-F2 defect 9 closure) | local (effects.ts) |
| I-16 | An eliminated seat may not act as decider — auto-policy owns its windows; one window never has two legal deciders | benign (K7-F2 defect 12 closure) | local (windows.ts) |
| I-17 | Status 'closing' = the M15 Closing-Round SLOT: rounds continue unbounded and 'ended' is reserved vocabulary until M15 opts in at F5 (explicit deferral, AE-linked to the F5 slot) | benign (K7-F2 defect 13) | local (turn.ts) |
| I-18 | M6-level silent no-ops (drawTop unknown deck → none; toReserve unknown card → unchanged) are LEGAL at the deck layer; catalog integrity halts at the draw APPLIER (GX-10); "absent" (vs eliminated) deciders = F7 presence territory, deferred | benign (K7-F2 defect 15) | local (deck.ts/packloader.ts) |
| I-8′ | I-8 amended: genesis also carries `windowSeq` (window id counter — replay-deterministic); `packId` REMOVED from state (duplicated the row — GX-6) | benign | local (packloader.ts) |
| I-19 | Gating is ENGINE-RESERVED: every content window gates (S-8); the `gated` field exists for future engine-opened advisory windows (F5); content declaring it → load refusal | benign (ext-audit-2 F2-R2-5) | local (effects.ts/packloader.ts) |

## Log

- **2026-07-25 — ledger opened at C4 anchor. I-1..I-3 registered from the C4 probe run; no builder code exists yet.**
- **2026-07-25 — F1 built (I-4..I-6). K7 round 1: RETURN — 3 blocking (D-1..D-3), 1 major (D-4), 3 minor (D-5..D-7). Falsified builder claims noted in the completion ledger. All seven closed by the builder; I-7, I-4′, I-5′ registered; suite 24/24; sent back for K7 re-verify (mutations A–E to be re-run by K7, not the builder).**
- **2026-07-25 — K7 round 2: PASS.** Mutations A–H re-run by K7 (incl. three NEW mutations F/G/H proving the fixes themselves falsifiable); both round-1 probes reconstructed live. Scores (worst dim): types 9 · M1 8 · M2 8 · M3 8 · M4 8 · core 8 — all ≥ 7, **teeth released; F2 may open**. M3 stays NOT-COMPLETE by rule (V-1/V-2 deferred to F2). Non-blocking observations registered below.
- **K7 obs-1 (registered, next-touch obligation on core):** injected guard returning `{legal:false}` without a refusal payload → submit returns `undefined` (outside SubmitResult). Unreachable with the real Guard; close with a defensive throw at next core touch.
- **K7 obs-2 (registered):** structuredClone imposes a cloneability contract on intent args — loud DataCloneError, consistent with the JSON-typed Intent.
- **K7 obs-3 (CLOSED 2026-07-25):** SP-1 executed as SUP-1 (governance/S3/, s3-anchor-v1.1); I-1 sanctioned. V-2's discharge now waits only on F2. New F7 obligation on record: packRef-mismatch at rebuild → divergence refusal.
- **2026-07-25 — EXTERNAL K7 AUDIT round 1 (independent session, no builder context; report at governance/audits/K7_AUDIT_REPORT-1.md): PASS.** Reproduced the internal round-2 verdict via its own mutation battery (A–H + 5 tier-gate forms) and found ONE gap internal K7 missed — **EA-1 (= its MUT-H): the non-finite hash guard was unfalsifiable** (deleting it left the suite green). Closures, all landed this round: EA-1 hash-integrity tests added (builder re-ran MUT-H: 2 named tests now fail on the mutant); EA-2 obs-1 CLOSED (refusing verdict without payload → HookViolation, with injection test); EA-3 stale 18/18 note annotated as superseded (append-only); EA-4 scaffold barrels ratified in the object model. Suite 28/28. External scores concur ≥ 7 all dims (M1 base-case 7 pre-closure — the EA-1 tests raise exactly that gap).
