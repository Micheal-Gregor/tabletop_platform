# Test set: CLAUDE_TABLETOP_G1_Phase3.md

*Produced by `tools/test-set.py` (Amendment S-1) from §5 of `CLAUDE_TABLETOP_G1_Phase3.md`. Analysis only: §5 is not edited. Outcome from the Outcome column.*

## Result

| | Rows |
|---|---|
| Critical path (gates COMPLETE) | 46 |
| Cut: variant of a kept row (same guard, same module, another input) | 1 |
| Cut: covered by its HOOK row (the hook's own show-it-blocks test) | 0 |
| Cut: shared guard re-tested in a calling module | 0 |
| Moved to the positive suite (not refusal tests) | 0 |
| **Total in §5** | **47** |

**Guard elements:** 43. None is dropped: each is covered by a kept row in its module, by its shared guard's owner, or by its HOOK row.

**Kept rows with no S1 case:** 9.

**Restored by the S1 floor:** REF-26 (XR-02), REF-38 (XR-19), REF-39 (XR-20), REF-41 (XR-23), REF-43 (XR-25), REF-44 (XR-26), REF-46 (XR-28), REF-48 (XR-31).

## Per module

| MOD | §5 rows | Critical path | Variants cut | Hook dup cut | Shared-guard cut | Positive suite | Kept rows with no S1 case |
|---|---|---|---|---|---|---|---|
| MOD-37 | 8 | 8 | 0 | 0 | 0 | 0 | 4 |
| MOD-38 | 5 | 5 | 0 | 0 | 0 | 0 | 2 |
| MOD-41 | 18 | 17 | 1 | 0 | 0 | 0 | 1 |
| MOD-42 | 6 | 6 | 0 | 0 | 0 | 0 | 0 |
| MOD-43 | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| MOD-44 | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| MOD-45 | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| MOD-46 | 2 | 2 | 0 | 0 | 0 | 0 | 2 |
| MOD-47 | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| MOD-49 | 1 | 1 | 0 | 0 | 0 | 0 | 0 |

## Appendix: disposition of every §5 row

| REF | MOD | Guard (outcome or invariant) | S1 case | Disposition |
|---|---|---|---|---|
| REF-25 | MOD-41 | UNCOMPUTABLE | XR-01 | critical |
| REF-26 | MOD-41 | UNCOMPUTABLE | XR-02 | critical (restored: only carrier of XR-02) |
| REF-27 | MOD-41 | MALFORMED_ARGS | XR-09 | critical |
| REF-28 | MOD-41 | RULE_REFUSED.NO_THROW | XR-10 | critical |
| REF-29 | MOD-41 | RULE_REFUSED.NO_FLICK | XR-10 | critical |
| REF-30 | MOD-41 | RULE_REFUSED.NOT_RANDOMIZER | XR-11 | critical |
| REF-31 | MOD-41 | RULE_REFUSED.OUT_OF_TURN | XR-11 | critical (wiring row: proves the call) |
| REF-32 | MOD-44 | HOOK_VIOLATION.XH_04 | XR-12 | critical |
| REF-33 | MOD-42 | REFUSE.UNSETTLED | XR-13 | critical |
| REF-34 | MOD-42 | REFUSE.ESCAPED | XR-14 | critical |
| REF-35 | MOD-41 | RULE_REFUSED.RE_SPIN | XR-15 | critical |
| REF-36 | MOD-42 | REFUSE.NO_TUMBLE | XR-16 | critical |
| REF-37 | MOD-42 | REFUSE.COCKED | XR-17 | critical |
| REF-38 | MOD-44 | HOOK-18 | XR-19 | critical (restored: only carrier of XR-19) |
| REF-39 | MOD-44 | HOOK-18 | XR-20 | critical (restored: only carrier of XR-20) |
| REF-40 | MOD-43 | DIVERGENCE | XR-21 | critical |
| REF-41 | MOD-41 | HOOK-13 | XR-23 | critical (restored: only carrier of XR-23) |
| REF-42 | MOD-41 | HOOK_VIOLATION.XH_05 | XR-24 | critical |
| REF-43 | MOD-45 | HOOK-22 | XR-25 | critical (restored: only carrier of XR-25) |
| REF-44 | MOD-49 | HOOK-20 | XR-26 | critical (restored: only carrier of XR-26) |
| REF-45 | MOD-41 | EL-11 | XR-27 | critical |
| REF-46 | MOD-41 | MALFORMED_ARGS | XR-28 | critical (restored: only carrier of XR-28) |
| REF-47 | MOD-41 | HOOK_VIOLATION.XH_03 | XR-30 | critical |
| REF-48 | MOD-41 | HOOK-21 | XR-31 | critical (restored: only carrier of XR-31) |
| REF-49 | MOD-42 | REFUSE.NON_FINITE | XR-32 | critical |
| REF-50 | MOD-44 | REFUSE.NON_FINITE | XR-32 | critical |
| REF-51 | MOD-42 | REFUSE.UNDER_FLOOR | XR-33 | critical |
| REF-52 | MOD-37 | PRESET_INADMISSIBLE.NO_FRICTION | XR-03 | critical |
| REF-53 | MOD-37 | PRESET_INADMISSIBLE.NO_CONTACT_FRICTION | XR-04 | critical |
| REF-54 | MOD-37 | PRESET_INADMISSIBLE.NO_DISSIPATION | XR-04 | critical |
| REF-55 | MOD-37 | PRESET_INADMISSIBLE.NO_PROVENANCE | XR-05 | critical |
| REF-56 | MOD-38 | NOT_ADMITTED.NO_DYNO_RECORD | XR-06 | critical |
| REF-57 | MOD-38 | NOT_ADMITTED.ASSUMED_POPULATION | XR-07 | critical |
| REF-58 | MOD-38 | NOT_ADMITTED.PASS_RULE_FAILED | XR-08 | critical |
| REF-59 | MOD-47 | S-2 | XR-29 | critical |
| REF-60 | MOD-41 | RULE_REFUSED.UNPINNED | — (derived) | critical |
| REF-61 | MOD-41 | DIVERGENCE | XR-21 | critical (wiring row: proves the call) |
| REF-62 | MOD-37 | PRESET_INADMISSIBLE.INCOMPLETE | — (derived) | critical |
| REF-63 | MOD-37 | PRESET_INADMISSIBLE.MEASURED_WITHOUT_FIT | — (derived) | critical |
| REF-64 | MOD-37 | PRESET_INADMISSIBLE.NO_TIME_BASE | — (derived) | critical |
| REF-65 | MOD-37 | PRESET_INADMISSIBLE.NO_HELD_OUT_RESIDUAL | — (derived) | critical |
| REF-66 | MOD-38 | UNDETERMINED | — (derived) | critical |
| REF-67 | MOD-38 | NOT_ADMITTED.OTHER_PRESET | — (derived) | critical |
| REF-68 | MOD-46 | RX-8.UNNAMED_POPULATION | — (derived) | critical |
| REF-69 | MOD-46 | RX-8.CHAINED_STARTS | — (derived) | critical |
| REF-70 | MOD-41 | XH-04.BEFORE_LEGAL | XR-12 | critical |
| REF-71 | MOD-41 | UNCOMPUTABLE | — (derived) | cut: variant of a kept row |
