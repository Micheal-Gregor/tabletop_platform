# W-ENV — Target Environment Binding (OWNER-RULED 2026-07-30)

**Target: local-first BROWSER playtest bench (Option A).** Static bundle (engine +
patterns + presentation + packs/boty + the bench adapter), no backend, no network.
Runtime = evergreen browser (verified in real Chromium); storage = browser
localStorage autosave + row export/import as JSON files (log-as-truth IS the save
format); identity = local seat-holding through the certified LockstepController
(one client, several seats — the K7-proven host-driven path).

**By-target ODG resolutions (with justification, never by default):**
- ODG-5 / ODG-SE-01/02 (abstract/code boundary at realization): the bench is an
  ADAPTER — it imports public package surfaces PLUS the MINIMAL fixture
  (packages/engine/tests/f5-fixture.ts — the ODG-p2 second universe; NAMED here per K8
  finding 3, promoting it to an exported surface = next-core-touch work), holds no game
  logic, and renders exclusively through project()+renderTable. Justification: the
  S-6/S-1 seams already define the boundary; the target adds nothing to it.
- ODG-p2 (second-bridge validation): the bench binds BOTH universes (MINIMAL + BOTY)
  through one identical adapter path — the second bridge exercised at the target.
- AE-c12-CF (simultaneity): N/A-by-absence — neither bound universe needs it.
- Hook observability form (PR-3): an in-browser probe battery writing structured
  verdicts to the page; vector form (PR-4): all nine computeV* re-derived IN CHROMIUM
  against the pinned JSON, embedded at build time.
- ODG-e1 (clock): STAYS OPEN — the bench uses the presentation Timeline (local) only.

**Deferred-to-supersession (OWNER-APPROVED dispositions, PR-1):**
- PC-5 billing/storefront: ACCEPTED-RISK (deferred) — revisit trigger: first paid
  distribution decision.
- PC-2 realtime legs (network transport, presence infra, host election):
  ACCEPTED-RISK (deferred) — the in-process lockstep controller IS the bound transport
  at this target; revisit trigger: the online-multiplayer supersession (Option B).
- PC-4 identity provider: BOUND as local profiles at this target; real identity
  deferred with PC-2's trigger.
