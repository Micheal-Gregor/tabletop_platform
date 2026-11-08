## Phase 4 process contract (every Phase 4 session in this repo — the first build or an extension build — until the next seal)

- **Governance:** `governance/Phase4_Conformance_Build_Roster.md` governs the build. Read it
  before work.
- **C4 first.** The first session runs the C4 anchor: verify the handoff's pinned semantics are
  recoverable as rules and every typed interface defines its off-nominal behavior. Record in
  `INSTRUMENTS/C4-anchor-record.md`. Halt-class defects → stop; route upstream via F.
- **Instruments are law — for engine modules.** A module not in
  `INSTRUMENTS/object-model-and-parameters.md` is not written yet — propose it there first.
  Base cases in `INSTRUMENTS/axioms-and-base-cases.md` BEFORE the feature. Every MATERIAL
  decision the handoff didn't make (RD-25: it changes behaviour or a contract) → the
  Interpretation Register in `INSTRUMENTS/drift-ledger.md`, one line (benign / latent /
  conflicting), never a silent choice; a ruling is one row. There is no builder battery (RD-34):
  a step closes on the gates. `ui/` is Phase 5's tree, not a module source; a build session
  does not touch it until the close writes `ui/interface-contract.md`.
- **RC-3 order.** No open body is filled before its resolution is recorded (Register discipline).
  Resolutions are live human decisions, logged in `INSTRUMENTS/RESOLUTION_RECORD.md`.
- **Vectors are computed.** Golden vectors come from the reference implementation, then
  re-derive; deferred vectors block their module's completion in
  `INSTRUMENTS/completion-ledger.md` until discharged, each row carrying its discharge condition.
- **The gate reaches every step (H-1).** A step starts with `python3 tools/state.py set
  current_module=MOD-nn`, refused while `python3 tools/phase4-checks.py gates` fails. A builder's
  prompt is `python3 tools/brief.py MOD-nn`, whole; its first tool call is the gate probe; its work
  is accepted only when `brief.py verify --nonce <N>` exits 0. Never `--no-verify`, never a change
  to `core.hooksPath`.
- **K7 is distinct and bounded.** The builder NEVER scores its own conformance. K7 is launched by
  `tools/k7-run.py` as a separate PROCESS with no builder context — never an in-session
  subagent — adversarially, per the CC-1..CC-7 battery, including divergence-injection and
  mutation tests. Not per step (RD-32): a step closes on the gates, and its next action is the
  next step. K7 runs at the foundation checkpoint (`k7-run.py --checkpoint`, CC-1, CC-2, CC-4;
  one fix pass, no re-check, no triage) and the final review (`k7-run.py --final`), which goes to
  the close. No owner triage after a round (RD-34): the runner refuses any other round unless the
  owner orders it (`owner-round-<n>`). The final review, until the seal, blocks merges, and
  `tools/gate.py` enforces that at merge.
- **Long runs go through `tools/run.py` (RD-35).** `python tools/run.py --kind k7|seal-check|suite
  --label "<what>" -- <command>` for `k7-run.py`, `seal.py check` and the full suite: detached, with
  a record in `.metaframework/runs/` that a crash cannot lose. The gate refuses them otherwise.
  The hooks print each run's state change to every session; never wait on one by hand.
- **Base cases first.** A module's base-case tests are watched failing (`tools/brief.py red`)
  before its code; the gate refuses a builder's code until they have been. Builders run as
  `.claude/agents/builder.md`.
- **Git discipline.** Commit at every approved increment; supersede, never rewrite; tag gates
  (`k7-pass-*`, `resolution-run-*`, `closed-by-owner-*`). A `k7-pass-N` tag is refused unless
  verdict N exists, PASSed, and reviewed this exact tree. The final review needs no tag: the
  owner's approval at the seal closes it. Merges are the human gate.
- **Backflow.** Handoff defects → `INSTRUMENTS/F-supersession-proposals.md`, taken by the human
  to the Phase 3 chat project as a revision run. Never patch `governance/S3/` in place.
- **Phase 4 ends at the close (RD-33).** In order, started without asking: (1) the last module
  is built; (2) write `ui/interface-contract.md`; (3) the final K7 review, `k7-run.py --final`;
  (4) `seal.py check`, one sweep, no judgment; (5) the owner's one approval, `python3
  tools/seal.py apply --approved-by "<owner, date>"`, which seals the library and merges `phase4`
  into `main` with `--no-ff`. The final review's findings become Phase 5 gaps in `ui/gaps.md`;
  everything the sweep carries forward, open owner gates included, goes to Phase 5. Nothing is
  worked between the last module and the seal unless the owner orders it. Never a second sweep.
  After a seal, files present at the seal tag are frozen (`gate.py`); an extension build adds
  new files only and K7 reviews only its new modules.
