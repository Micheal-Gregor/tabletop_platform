# Axioms & Base Cases — <CONCEPT> build

Axioms restate the carried rules this build must uphold, each citing its S3/S2 source.
Base cases are pre-solved scenarios (input → expected observable outcome); every one becomes
an executable test BEFORE its feature ships. IDs are stable.

## Axioms (carried rules, code-level)

- **GX-1 —** ... *Cites* ...

## Base cases (input → expected observable outcome)

- **GBC-1 —** *Given* ... *when* ... *then* ... *(GX-n; test: ...)*

**N/A-by-absence:** (rules structurally absent from this S3 — stated, never silently passed)

Rule: a base case that cannot be expressed as a test signals the object model is wrong —
fix the model (backflow), don't skip the test.
