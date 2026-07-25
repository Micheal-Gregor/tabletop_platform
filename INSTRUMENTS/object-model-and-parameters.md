# Object Model & Parameters — TABLETOP build

Rule: every module appears here BEFORE it is written; if it isn't here, propose the addition
first. Every entry traces to an admitted S3/S2 node (CC-1).

## Modules — F1 Kernel & Determinism (build slot 1, ACTIVE)

| Module | File | Traces to | Responsibility | Status |
|---|---|---|---|---|
| kernel/types | packages/engine/src/kernel/types.ts | S3 F1 (StateTree/Guard interfaces); I-1 (PackRef); I-2 (Genesis) | Shared kernel types: State, PackRef, Seat, Intent, Refusal (typed), Verdict, GameRow | built |
| M1 StateTree | packages/engine/src/kernel/statetree.ts | S3 F1·M1 ← S2 M1 | One root; on-state ids; derived-never-stored; deep-frozen exposure (R-10 structural) | built |
| M2 Guard | packages/engine/src/kernel/guard.ts | S3 F1·M2 ← S2 M2 | Central legality; two-level check (structural → rule); typed refusal; refusal-not-repair; state byte-unchanged on refuse | built |
| M3 IntentLog | packages/engine/src/kernel/intentlog.ts | S3 F1·M3 ← S2 M3; I-1 | Record-after-success; rebuild(packRef, seed, seats, log); divergence → full rebuild never patch (R-9) | built |
| M4 RNGStreams | packages/engine/src/kernel/rng.ts | S3 F1·M4 ← S2 M4 | Named streams, deterministic, fixed per-stream offsets; human inputs as ARGUMENTS never entropy | built |
| kernel/core | packages/engine/src/kernel/core.ts | S3 S-1 seam (guarded intent path); HK-1/HK-2 | The ONLY mutation path: submit(intent) → Guard → apply → log; hooks wired here | built |

F2–F7 rows seeded when their build slot opens (build order S3 §2).

## Parameters / extension points

- **Genesis (I-2):** `genesis(packRef, seats, seed) → State` — injected; PackLoader (F2)
  supplies the real one; kernel stays pack-agnostic.
- **Appliers:** intent-type → applier registry, INTERNAL to core (not exported); F2+ modules
  register through core, never mutate directly.
- **RNG algorithm:** splitmix-derived per-stream seeding (deterministic, portable);
  algorithm choice = benign interpretation I-4 (registered).
