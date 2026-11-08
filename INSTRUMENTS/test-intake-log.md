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
