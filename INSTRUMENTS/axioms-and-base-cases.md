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

**N/A-by-absence (F1 slot):** window gating, EFX closure, admission, projection — their
rules live with F2/F3/F4/F6 and are N/A here by structure (no such surface exists in F1).

Rule: a base case that cannot be expressed as a test signals the object model is wrong —
fix the model (backflow), don't skip the test.
