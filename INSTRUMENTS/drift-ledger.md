# Drift Ledger + Interpretation Register — TABLETOP build

**Teeth:** no new work on a module scoring < 7 on any dimension until the score is raised.
Scores are set by the DISTINCT K7 reviewer — never by the builder.

## Drift entries

| ID | Location | Drift | Score (K7) | Status |
|---|---|---|---|---|

## Interpretation Register (decisions the handoff did not make)

| ID | Decision taken | Class (benign/latent/conflicting) | Route (local / F-supersession / AE-link) |
|---|---|---|---|
| I-1 | MoveLogRow carries pack-ref (id, version, integrity hash) — AX-4/V-2 well-definedness | latent | F-supersession (drafted) |
| I-2 | Genesis state = PackLoader's validated setup declaration over (pack, seats, seed); empty log = genesis | benign | local; depends on I-1 |
| I-3 | Non-active-writer submit semantics (refuse vs queue) | benign | local; registered at F7 build, AE-linked to lockstep spec |

## Log

- **2026-07-25 — ledger opened at C4 anchor. I-1..I-3 registered from the C4 probe run; no builder code exists yet.**
