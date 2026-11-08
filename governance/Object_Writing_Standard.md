# Object Writing Standard (OS-1..OS-12)

*How a class object must be written so that sealing it does not freeze one scenario's
assumptions into the library. Assigned in Phase 2, checked in Phase 3, enforced against code in
Phase 4 (`tools/phase4-checks.py objects`), audited in Phase 5.*

**The disease this prevents.** An object reaches inside itself for something it was never
handed — a decider imported by name, a global, the clock, an environment variable, a
singleton. It works perfectly for the scenario it was written for, so the tests pass and it
seals. A second scenario arrives, the object answers with the first scenario's assumption, and
the call fails or returns a wrong answer. The next session reads that as "the library is
missing an object" and asks for an extension. The library grows a near-duplicate of something
it already has, and the real fault — an undeclared dependency — is never named.

A sealed object is only repurposable if everything it depends on arrives through its own
declaration.

---

## The rules

**OS-1 · Declare every dependency at construction.** Everything the object needs to do its work
is a constructor parameter. If an operation needs something the constructor did not take, it is
a parameter of that operation. Nothing arrives any other way.

- **A name in a method body is legal only if** it is a parameter of that method, a field
  assigned from a constructor parameter, or a local computed from those. A module constant read
  inside a class is an undeclared input.
- **A zero-argument method or nested function whose body returns a literal** — a string, a
  number, `date(...)`, `datetime(...)`, or an object built from literals — is an undeclared
  input and fails OS-1. A zero-argument query that returns a field already assigned from a
  constructor parameter is legal; the rule does not ban zero-argument methods.
- **No default values** on constructor or operation parameters, in any language. A default is a
  sealed scenario.
- **No `**kwargs`, `*args`, or a rest/options bag** used to receive collaborators. A
  collaborator arrives in a named slot.
- **An input that is itself an object is a declared slot, not a lookup.** The class names the
  operations it will call on that object — a `Protocol` in Python, a listed method set in
  JavaScript, an interface type in PHP — and checks at construction that the instance provides them
  (`callable(getattr(obj, "decide", None))`, `typeof obj?.decide === "function"`). The concrete
  class is not named and not imported. Bind the instance at the wiring point: the constructor,
  a factory, or `functools.partial`. Never resolve it inside the method, by import, by locator,
  or by `getInstance`. Late binding means the body is chosen by the instance that was passed —
  it never means the parameter is omitted.

**OS-2 · No ambient reads.** Inside a class: no environment variables, no clock, no randomness,
no process or request globals, no module-level mutable state, no singleton accessor. These are
inputs. Hand in a clock provider, an id provider, a config value — anything whose answer could
differ between two callers.

**OS-3 · A decider is handed in, never imported.** A module that answers a business question —
who may act, what is visible, which version is active, what time it is — is injected. A plain
utility, a pure function of its arguments (building a refusal value, hashing, formatting), may
be imported directly. This is the `Decides = YES/NO` tag, enforced at the seam.

**OS-4 · Construct valid or refuse to exist.** The constructor validates what it is handed and
throws on anything that would produce an invalid instance. No half-built object is ever
reachable, and no operation re-checks what construction already guaranteed.

**OS-5 · State is private; invariants are the object's own.** Nothing outside the class mutates
its fields. Expose commands, not setters. A caller that must read state and then decide is a
caller doing the object's job.

**OS-6 · Refusals are typed and documented.** Every way an operation can refuse is a named
error carried in the interface contract's `Refusals` cell, which may not be empty — "none" is
an answer and must be written. A caller must be able to tell "it refused me
correctly" from "it is broken" without reading the source — otherwise a correct refusal gets
reported as a missing object.

**OS-7 · Determinism is declared** in the contract's `Determinism` cell. Same inputs, same output — or state exactly what varies and
why. Anything non-deterministic takes its source of variation as an input (see OS-2), so a test
can pin it.

**OS-8 · Side effects are declared** in the contract's `Side effects` cell, or there are none. An operation that writes, emits, or
mutates says so in its contract. "None" is an answer and must be written.

**OS-9 · No bucket modules.** No `helpers`, `utils`, `common`, `misc`, `shared`, `lib`. A
module's name states what it owns. Buckets have no owner and no contract, which is exactly why
deciders drift into them and get imported by name.

**OS-10 · One responsibility, one reason to change.** If the sentence describing the class needs
an "and", it is two classes. This is what keeps OS-1 bearable: a small object needs few inputs.

**OS-11 · Inject at the wiring point, not at every call site.** Dependencies are supplied once
where the object graph is assembled. Operations keep their natural signatures. Injecting
everywhere makes callers supply what they should not have to know about — the rule targets
decisions, not every value.

**OS-12 · Every class ships an isolation test that exercises it.** Construct the object with its
declared inputs and nothing else — no environment, no clock, no globals, no network — and
**call every public operation**. For each declared input, two calls differ in only that input
and **the results must differ**, unless the contract states that the operation is invariant to
that input in its `Invariant to` cell — the only way a two-call test may return equal answers.
**Construct-and-assert is a failure, not a pass**: an object that answers from a
hidden fact constructs perfectly and returns the same answer whatever you hand it, which is
precisely what this test is for. The tests run with the environment cleared. A consumer-owned
Protocol's stubs (a method whose body is only `...`) declare what a handed-in collaborator answers;
they are not the declaring class's operations, and its test does not call them (2.6.20).

---

## Where each rule is caught

| Rule | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|---|---|---|---|---|
| OS-1, OS-11 | Declared inputs per node | §2 / §4 columns | `objects` check | — |
| OS-2 | — | — | `objects` check (ambient patterns) | sleaze audit |
| OS-3 | `Decides` tag + basis | `Binding` must be INJECTED | `objects` check (import scan) | binding audit |
| OS-4, OS-5, OS-10 | Class admission | Module responsibility boundary | K7 (CC battery) | — |
| OS-6, OS-7, OS-8 | — | §5 refusal rows | Interface contract at the seal | contract read |
| OS-9 | Node naming | `objects` check (module + file names) | `objects` check | — |
| OS-12 | — | — | `objects` check (test present) + the test itself | — |

## How it is enforced

| Moment | Mechanism | Catches |
|---|---|---|
| Writing a class | `gate.py` refuses the write | OS-1 undeclared inputs (defaults, bags, literal-returning zero-arg methods, module constants) and OS-2 ambient reads, with the fix in the denial |
| Starting a class | `tools/new-object.py` | OS-1, OS-4, OS-9, OS-12 — by making the compliant shape the cheap one |
| Committing | `gate.py` runs the `objects` check and the declaration comparison on staged files | OS-1, OS-2, OS-3, OS-9, OS-12, and any signature that has drifted from the object model or the contract |
| Sealing | the sweep runs `objects`, the isolation tests, and the declaration comparison | all of the above; a missing `isolation_test_command` or an unwritten contract FAILS the seal, and every constructor parameter must appear in the object-model Declared inputs cell and every operation parameter in its contract Inputs cell, and Refusals, Side effects and Determinism all written |
| Phase 5 | the standard audit, read-only | drift in a library already sealed |

## The limits of the static check

`phase4-checks.py objects` is a scanner. It catches the patterns listed above by text, which is
most real cases and all the common ones, and it can be tuned per language in
`.metaframework/project.json` under `object_standard`. It cannot prove absence of ambient
access. **OS-12 is the rule that actually proves it**, because an object that reaches outside
its declared inputs fails to construct or fails to answer in an empty environment. Treat the
scanner as the cheap pass and the isolation test as the real one.
