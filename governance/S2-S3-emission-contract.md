# S2 / S3 Emission Contract v1.0

Extends to Phases 2 and 3 the fixed-heading discipline Phase 1 already mandates
("the structure below is downstream-facing and Phase 3 depends on it — do not
alter the headings"). Phase 2 currently has no filename convention; Phase 3
explicitly disclaims a fixed shape. Both emit the documents Phase 4 must parse.

**Adoption rule.** Headings and column headers are fixed. Rows are not. A
document that renames a heading, drops a column, or omits an ID is
non-conforming, and `emission-check` fails the build before K7 is spawned.

---

## 1. Identifier scheme

Every run-level entity carries an ID. Format: `^[A-Z]+-[0-9]{2,}$`.

| Prefix | Entity | Minted in |
|---|---|---|
| `OBJ-nn` | object / class node | Phase 2 |
| `MOD-nn` | module | Phase 3 §2 |
| `SEAM-nn` | seam contract | Phase 3 §4 |
| `REF-nn` | refusal test | Phase 3 §5 |
| `VEC-nn` | golden vector | Phase 3 §6 |
| `HOOK-nn` | hook specification | Phase 3 §7 |
| `PC-nn` | production concern | Phase 3 §8 |
| `AE-nn` | admitted exception | Phase 2 |
| `GX-n` / `GBC-n` | axiom / base case | Phase 1 (existing convention) |

**Rules.** IDs are assigned at first emission, never reused, never renumbered.
A superseded entity keeps its ID and takes status `SUPERSEDED`; a new ID carries
the replacement. Cross-references use the ID, never the prose name.

Rationale: the framework asserts "every S2 node maps to exactly one Phase 3
destination" and "every S3 element maps to exactly one Phase 4 destination."
Neither is checkable without a key.

## 2. Status vocabularies

Exactly two enums. The corpus currently uses five spellings for one concept.

**Entity status** — `PROPOSED` · `ACTIVE` · `DEFERRED` · `DISCHARGED` · `SUPERSEDED` · `REFUSED`

**Module readiness** — `NOT_STARTED` · `BUILT` · `COMPLETE` · `BLOCKED`

`BUILT` means code exists and its suite is green. `COMPLETE` additionally means
CT-1..CT-6 all discharged. The distinction RD-16 calls
"BUILT-but-NOT-COMPLETE" is these two values, not a third spelling.

---

## 3. Phase 2 document — `CLAUDE_<Concept>_Phase2.md`

Filename is now fixed. Headings, in order, verbatim:

```
## 1. Concept and S1 provenance
## 2. Expressed Object Model
## 3. Admitted family
## 4. Refused edges and abstractions
## 5. Admitted exceptions
## 6. Carried judgment for Phase 3
## 7. Open questions
```

**§2 Expressed Object Model** — the definitive object set. One row per node.

| ID | Node | Kind | Tag | Traces to | Status |
|---|---|---|---|---|---|

`Traces to` cites a Phase 1 element (`GX-n`, `GBC-n`, or a Traceability Map row).

**§4 Refused edges and abstractions**

| ID | Refused item | Kind | Reason | Preserved as |
|---|---|---|---|---|

**§5 Admitted exceptions**

| ID | Exception | Scope | Justification | Status |
|---|---|---|---|---|

---

## 4. Phase 3 document — `CLAUDE_<Concept>_Phase3.md`

Sections are **numbered**, in order, verbatim. Numbering is load-bearing:
`completion-ledger.md` cites "S3 §11", which currently resolves to nothing.
Under this contract §11 is the module completion checklist and the citation
becomes true without editing the ledger.

```
## 1. Disambiguation header
## 2. Resolved partition
## 3. Object-to-module map
## 4. Seam contracts
## 5. Refusal tests (CT-4)
## 6. Golden vectors (CT-5)
## 7. Hook manifest (CT-6)
## 8. Production concerns
## 9. Open decision gates
## 10. Build order
## 11. Module completion checklist
```

**§2 Resolved partition**

| ID | Module | File | Owns OBJ | Status | Decides |
|---|---|---|---|---|---|

`Decides` is YES when the module answers a **business question** — one a future scenario
might answer differently: who may act, what is visible, which version is active, what time it
is. It is NO for a plain utility, which is a pure function of what it is handed (building a
refusal value, hashing, formatting). The tag is assigned in Phase 2 with its basis and carried
here.

**§3 Object-to-module map** — the join CC-1 and traceability completeness read.
Every `OBJ-nn` from Phase 2 §2 appears exactly once.

| OBJ | MOD | Role |
|---|---|---|

**§4 Seam contracts**

| ID | Source MOD | Target MOD | Transferred value | Dependency requirement | Validation rule | Binding |
|---|---|---|---|---|---|---|

`Binding` is INJECTED when the target is handed to the source, NAMED when the source reaches
it by name. **A seam whose target has `Decides = YES` must be INJECTED** — emission-check
fails it otherwise (`decider_called_by_name`). A decider reached by name is hard-wired to one
scenario: it works perfectly until a second scenario arrives, which is the expensive moment to
discover it, and tests rarely catch it because the one scenario they cover passes.

Both columns are optional for documents emitted before this rule; where they are absent
emission-check records a note rather than a violation, and the rule is simply unchecked.

**§5 Refusal tests (CT-4)** — `Test name` is the field that makes CC-4 and CC-6
mechanical. Without it no S3 refusal row can be joined to an executable case.

| ID | MOD | Invariant | Forbidden input | Expected rejection | Test name | Outcome |
|---|---|---|---|---|---|---|

`Outcome` names the **guard element** the row covers in its module (Amendment S-1): the refusal
outcome the row observes, as the Expected rejection names it (`SYNCED_LOCATION`), several
comma-separated where one row observes more than one, or a family as `PLUGIN_MAY_NOT_*`. A row
that observes no named outcome (a static check, a FAILING status) gives the ID of the invariant
it guards. A row whose only check is that a hook blocks gives that hook's `HOOK-nn` from §7, alone:
it duplicates the hook's show-it-blocks test (CT-6). Never empty. `tools/test-set.py` reads the
column to find the critical path (CT-4: one refusal per distinct guard element per module).
emission-check fails a malformed value (`outcome_value`) or a `HOOK-nn` §7 does not hold.

The column is optional for documents emitted before the rule; where it is absent emission-check
records a note rather than a violation, and `test-set.py` takes the outcome from its config
(`governance/test-set.md`).

**§6 Golden vectors (CT-5)** — `Rule` must be stated independently of the
vector; a value whose rule is recoverable only from the vector fails CT-5.
`Encoding` names the serialization of Input and Output, without which
`--rederive` cannot compare.

| ID | MOD | Pinned value | Rule | Input | Output | Encoding | State | Discharge condition |
|---|---|---|---|---|---|---|---|---|

`State` is `COMPUTED` or `DEFERRED`. A `DEFERRED` row with an empty
`Discharge condition` is an omission, not a deferral, and fails emission-check.

**§7 Hook manifest (CT-6)** — each row also emits the Appendix A grammar, which
already exists in the Phase 1 roster and is currently never carried into Phase 3.

| ID | MOD | Trigger | Condition | Block action | Registered at |
|---|---|---|---|---|---|

```
HOOK <id> @<trigger> { condition: <condition>, BLOCK: <action> }
```

**§8 Production concerns** — mints the `PC-*` IDs. `tools/seal.py` carries every
`PC-*` row into the seal record, the input to Phase 5's latency / scale / security
review; nothing else creates them.

| ID | MOD | Concern | Class | Owner | Discharge target |
|---|---|---|---|---|---|

**§11 Module completion checklist**

| MOD | CT-1 | CT-2 | CT-3 | CT-4 | CT-5 | CT-6 | PC enum | Readiness |
|---|---|---|---|---|---|---|---|---|

---

## 5. Vector persistence and the `--rederive` interface

`--rederive` appears exactly once in the plugin (`k7-reviewer.md:51`) and is
nowhere defined. CC-5 cannot be mechanical until it is.

**Storage.** One file per vector: `vectors/<VEC-ID>.json`

```json
{
  "id": "VEC-01",
  "module": "MOD-03",
  "rule": "<the rule, stated independently of this vector>",
  "encoding": "utf8-json",
  "input": "<encoded>",
  "output": "<encoded>",
  "state": "COMPUTED",
  "computed_at": "<ISO-8601>",
  "impl_sha": "<sha256 of the implementation file at computation time>"
}
```

**Interface.** `rederive <VEC-ID>` or `rederive --all`.
Recomputes `output` from `input` by invoking the implementation, compares under
`encoding`, and exits `0` on match, `1` on mismatch, `2` on a vector that cannot
be located or whose module is unbuilt. `--all` fails if any vector fails.
`DEFERRED` vectors are skipped and reported, never counted as passes.

`impl_sha` is what proves the vector was computed rather than hand-written: a
vector whose `impl_sha` predates the implementation file's first commit is a
CC-5 failure.

---

## 6. Dangling references this closes

| Defect | Resolution |
|---|---|
| `completion-ledger.md` cites "S3 §11"; no S3 numbering exists | §4 above numbers the S3; §11 is the checklist |
| The seal carries `PC-*` forward; Phase 3 never minted them | §8 assigns `PC-nn` |
| CC-5 calls `--rederive`; undefined | §5 specifies it |
| CC-4/CC-6 need "named tests"; no naming convention | §5 `Test name` column |
| `Status` has five spellings | §2 two enums |
| Appendix A `HOOK` grammar unused downstream | §7 carries it into the S3 |

## 7. What becomes mechanically checkable

Once emitted under this contract, each of these is a script, not a judgment:

- **CC-1** — `MOD` set in §2 versus the source tree, via the `File` column.
- **Traceability completeness** — every `OBJ` in Phase 2 §2 appears exactly once
  in S3 §3; every `MOD` in §2 is the source or target of at least one `SEAM`.
- **Deferred/discharged join** — every `VEC` with `State: DEFERRED` has a
  discharge condition and a matching completion-ledger row.
- **Vector re-derivation** — `rederive --all`.
- **Refusal coverage** — every `REF` row's `Test name` resolves to a real test,
  and deleting the guarded call makes exactly that test fail.
- **The critical path** — `test-set.py` over §5's `Outcome`: one refusal per
  distinct guard element per module, and no guard element dropped.
- **Hook manifest** — every `HOOK` id in §7 is registered at its `Registered at`
  path in the built repo.

What remains for K7 is the residue: whether the implementation is faithful to
intent in ways no column can capture. That residue is small enough to be
answered the same way twice.
