# Phase 5 Discharge Record — TABLETOP @ W-ENV Option A (browser playtest bench)

*Every enumerated concern carries a disposition; ACCEPTED-RISK entries are LIVE OWNER
ACTS with revisit triggers. Dispositions dated 2026-07-30; owner: Micheal Gregor
(W-ENV ruling "option a"; deferral dispositions presented in that gate and approved).*

| Concern | Disposition | Binding / ground |
|---|---|---|
| PC-1 persistence | **BOUND** | The S-2 row IS the save (log-as-truth): localStorage autosave + JSON export/import (utilization/bench/src/persist.ts). SC-4 held: absent → fresh; unreadable → PersistHalt, refused whole (PR-5b drilled) |
| PC-2 transport | **BOUND (in-process leg) + ACCEPTED-RISK (realtime legs, owner-approved)** | LockstepController IS the bound transport (one client, all seats — K7-proven). Network/presence/host-election deferred; REVISIT TRIGGER: the Option-B online-multiplayer supersession |
| PC-3 pack distribution/integrity | **BOUND (integrity) + N/A-by-absence (distribution/moderation)** | packRef (id/version/hash) enforced whole at every resume (SUP-1, PR-4 in-target); no third-party packs exist at this target — distribution/moderation N/A until packs ship externally |
| PC-4 identity/auth | **BOUND (local) + deferred provider** | One local client holds every seat (writer discipline live); real identity rides PC-2's revisit trigger |
| PC-5 billing/storefront | **ACCEPTED-RISK (deferred, owner-approved)** | REVISIT TRIGGER: first paid-distribution decision |
| PC-6 per-platform packaging | **BOUND** | One static bundle (esbuild → dist/), evergreen-browser target; the folder deploys anywhere static |
| PC-7 asset pipeline / skins | **BOUND via D-1** | The Placeholder Skin is the shipped skin — frames before assets BY DESIGN; the asset pipeline arrives with real skins (content-tier work) |
| PC-8 telemetry | **BOUND (minimal)** | Status line + halt banner + listenerFaults(); nothing leaves the machine (local-first) — remote telemetry N/A at this target |
| PC-9 tamper-evidence | **BOUND (replay lineage)** | {row, finalHash} envelope: every load REPLAYS and compares (PR-5c drilled: a flipped move flags, never loads). DH-4 discharged at this target by the same mechanism |
| DH-1 presence hijack surface | **N/A-in-target** | Single-client bench — no second client exists; surface re-opens with PC-2's trigger |
| DH-2 EFX→ledger mirror | **ACCEPTED-RISK (carried)** | I-46a reconciliation stands; REVISIT TRIGGER: a universe whose content requires full mirroring (ExtensionContract) |
| DH-3 TypedArray seam TypeError | **ACCEPTED-RISK (carried)** | Unreachable through the bench (R-23 deep-clone door precedes the seam); engine-ledger minor stands; REVISIT: next engine K7 entry |
| DH-4 legal-tamper detection | **BOUND** | See PC-9 |
| DH-5 V-1 script duplication | **ACCEPTED-RISK (carried)** | Both copies pinned by V-1/GBC-40 anchors; REVISIT: next core touch of either file |

**PR-6 exercised in production form:** VERSION v1 → v2 (supersession) → v1-restored
(rollback = superseding BACK), three commits, lineage intact, history never rewritten
(c194fcc → f25013b → 7bd9ea3). Saved rows survived the round-trip (packRef-keyed).

**PR-7 in production identity terms:** the deployed identity system IS the controller's
writer discipline — grant/revoke = join/leave/takeover, enforced live (K7-proven; PR-3
smoke re-proved in-target). SoD (approver ≠ counterparty) N/A-BY-FORM at a single-human
bench; binds with the identity provider at PC-2's revisit trigger. AE-resolution
authority = the owner, in the repo record (unchanged by deployment).

---
**K8 GATE (2026-07-30): PASS** — distinct reviewer ran the full PR-1..PR-7 battery
itself, falsified the in-target battery, a vector pin, and the writer discipline (all
demonstrably CAN fail), and ruled the core fixed (one non-behavioral dedup, now
registered as I-49). Six non-blocking findings closed same-day: I-49 row · real
applier-side HK-5b probe · W-ENV record names the fixture import · dead define +
dead imports removed · PR-6 restore-annotation note stands. Final: 253/253 ·
tsc clean ×4 · HK-6 OK · BATTERY 21/21 · DRILLS 5/5. **THE DEPLOYMENT IS BOUND. RUN.**
