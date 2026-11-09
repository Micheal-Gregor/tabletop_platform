# Test-intake log

The frozen test set (Amendment S-1, `governance/test-set.md`; roster v0.10). Before each build
stretch the lead fixes that stretch's critical path with `tools/test-set.py` and records it
under Frozen sets. Only that set gates COMPLETE (the completion ledger's CT-4 box) and CC-4.
Cut rows stay in S3 §5 as the record: they are not written and they gate nothing, unless the
owner schedules them.

Everyone else proposes: a sub-agent, a sub-session, K7. A proposal is one row under Proposals,
naming the guard element it claims to cover and why. It is not written, run or counted during
the stretch unless it blocks the build, and it waits here until the owner schedules it: the
end-of-stretch dedupe and the owner's batch ruling are cut (roster v0.14, RD-34).

## Frozen sets

One row per stretch. Report is the `test-set.py` output for the stretch's modules, committed
with the row.

| Stretch | Modules | Critical rows | Report | Frozen at | Approved by |
|---|---|---|---|---|---|

## Proposals

`tools/k7-run.py` appends a K7 verdict's `proposed_tests` here; any other proposal is added by
hand. Disposition stays `pending` until the owner schedules (`admitted`) or rejects a proposal;
Covered by is filled when one is admitted.

| ID | Stretch | Proposed by | Module | Guard element | Proposed test | Why | Covered by | Disposition |
|---|---|---|---|---|---|---|---|---|
| TP-01 | — | K7 round 1 | MOD-32 | bind refusal naming the missing tokens (REF-21) | A separate frozen case for REF-21, apart from REF-22: bind a skin missing two of a contract's tokens and assert the refusal names both, in contract order, and that a skin with an extra unrelated token still binds. | REF-21 and REF-22 share one test ('R-21: missing tokens refuse, NAMED; R-22: a raw value in a contract refuses', f6-presentation.test.ts:74), so a regression in one masks the other's failure location. | — | pending |
| TP-02 | — | K7 round 1 | MOD-27 | divergence (packRef mismatch included) refused whole (REF-09 via SEAM-04) | Resume with a row whose packRef matches but whose moves contain a tampered middle move; assert DivergenceError and that no LockstepController is returned and no listener is ever invoked. | It confirms that 'refused whole' holds at the transport door for mid-replay divergence, not only for the packRef legs (lockstep.ts:58-67). | — | pending |
| TP-03 | — | K7 round 1 | MOD-33 | REF-19 refused (projection breach) | A spread-derived view, {...project(state, seat), decks: state.decks}, handed to renderTable is refused or shows no unredacted content. | The brand is an enumerable marker field (I-47), so spreading copies it. A builder extending a view with a raw field is a plausible way past HOOK-10. | — | pending |
| TP-04 | — | K7 round 1 | MOD-27 | REF-09 divergence (packRef mismatch included) refused whole | Resume a row whose seats list differs from the hosted session's seats (same packRef) and assert divergence is refused whole, or that the rebuilt hash is compared against the live hash. | Resume checks only packRef's three legs. A row with altered seats replays without any check that it matches the live session. | — | pending |
