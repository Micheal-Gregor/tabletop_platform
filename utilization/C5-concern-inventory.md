# C5 — Phase 5 Anchor Record & Concern Inventory (TABLETOP)

*Anchored 2026-07-30 at `phase4-complete` (3a5f16e). Owner: Micheal Gregor.*

## Exit-clean check (C5): PASS
Completion ledger: every module row COMPLETE/VERIFIED · 9/9 vectors frozen and
re-deriving (253/253) · K7 tags k7-pass-f1..f7 + k7-pass-boty · external audits 1-4C
archived · no unresolved blocking gate. OPEN by design (not blockers): SP-6 (owner's
Phase 3 channel) · ODG-e1 (clock) · the EFX docket. **The core is FIXED from here —
bindings live in utilization/; a binding needing a core change is F-backflow.**

## The Concern Inventory (∀ concern: disposition ∈ {BOUND, ACCEPTED-RISK, N/A-by-absence})

**PC-* (S3 §8, verbatim enumeration):**
| # | Concern | Workstream |
|---|---|---|
| PC-1 | Persistence medium for rows/logs | W-PERS |
| PC-2 | Transport infrastructure (realtime, presence, host election) | W-ENV/W-OPS |
| PC-3 | Pack distribution/versioning/integrity + content moderation | W-SEC |
| PC-4 | Identity/auth | W-SEC |
| PC-5 | Billing/storefront | W-ENV |
| PC-6 | Per-platform packaging | W-ENV |
| PC-7 | E-2 asset pipeline + skin distribution | W-OBS |
| PC-8 | Telemetry | W-OBS |
| PC-9 | Tamper-evidence on the log | W-SEC/W-PERS |

**Deferred hardening items (drift-ledger residue):**
| # | Item | Source |
|---|---|---|
| DH-1 | Unauthenticated transport presence (leave-on-behalf/seat hijack surface) | I-42 ext. |
| DH-2 | Content-EFX ledger transparency (full EFX→ledger mirror = extension candidate) | I-46a |
| DH-3 | TypedArray engine-seam untyped TypeError (state-safe; M2 typed-refusal ideal) | I-48c |
| DH-4 | Legal-tamper silent-different-game (row swap undetectable without PC-9) | K7-F5 OBS |
| DH-5 | GBC-40/computeV1 script duplication (two hand-typed copies of the 22-move script) | K7-F7 OBS-1 |

**By-target ODGs (resolve AT W-ENV, with justification, never by default):**
ODG-5 + ODG-SE-01/02 (abstract/code boundaries at realization) · ODG-p2 (second-bridge
validation — the second universe's skin) · AE-c12-CF (simultaneity — halts unless the
target universe needs it) · hook observability form (PR-3) · vector re-derivation form
(PR-4).

## Workstream roster (derived from THIS inventory)
W-ENV (target choice — OWNER-GATED, first) → W-SEC · W-PERS · W-OBS · W-OPS in parallel
→ K8 (PR-1..7, distinct reviewer) → F backflow → H → RUN. The drift ledger stays open.
