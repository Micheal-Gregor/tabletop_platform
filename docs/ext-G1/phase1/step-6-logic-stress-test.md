# Extension G-1 · Phase 1 · Step 6 — Logic Stress-Test

Sources: steps 2 to 5, with the owner's rulings at the Consistency Gate (step 5 §9) in force: outcome refusals logged,
load before hosting, starts chain from the last rest, the symmetric jitter, the settle record, own mutation, and the
footage rule. The arithmetic is `stress/stress_g1.py` (SHA-256 `9358dd79…d58fe71b`, revised after the adversarial
pass and set to write LF line endings; first run `02fbb64e…94f129e`), output `stress/stress-results.json`
(`bfc355ab…68803a9b1ee`), with the closed form standing in for the engine as before.

## 1. Stress-test summary

**All three scenarios failed as first tested** (Scenario 1 was first recorded as a pass; the adversarial pass, F-1,
showed the pass was wrong). Each failure has a correction that belongs to a named stage, and none needs a sealed object
changed. No blocking decision gate was produced: the corrections set constraints whose numbers are already the owner's
at R5 (ε, the dyno pass rule). Scenario 1 (a constraint collision) shows the spinner's floor must be a preset value
tested on the input before the draw. Scenario 2 (missing information) fails: a wrong time base passes
every check the dataset plan had. Scenario 3 (adversarial interpretation) fails: a dyno fed a convenient population
proves "fair" for players who do not exist.

## 2. Scenario 1 — Constraint collision

**Input.** Preset S-min (I = 0.002 kg·m², τ = 0.004 N·m, 8 sectors, ε = 0.05, symmetric jitter). A flick of
x = 5300 mrad/s. Θ₀ = 7.02 rad; over every u, Θ lies in [6.338, 7.742] rad, all at least 2π.

**The collision.** G-4 (GX-45) admits every attempt from this flick: it always turns more than once, so it is VALUE,
never REFUSE(under-one-turn). GX-48(b), as LA-2 measures it, requires that no admissible input lets an aimer do much
better than fair. This input lets one: the jitter spreads the result over 1.40 rad (0.22 turn), so an aimer who picks
the flick for the sector they want, given the public last rest, lands it with probability 0.57, **A = 4.57 × fair**.
Following G-4 accepts an aimed result; following GX-48(b) forbids it.

**The decision.** The input must be refused as too weak to be fair, not accepted. The framework already has the rule
that decides: G-0 admits a preset only with a dyno record, and LA-2 takes the jitter's claim as a maximum over *all
admissible inputs*. A preset whose admissible inputs start at one turn fails its own jitter claim, so it is never
admitted, and no game reaches this input. The rule is deterministic and keeps PD: nothing is repaired or reinterpreted.

**What the scenario exposes, first.** The rule works only if the floor can move: with one turn hard-coded, *no*
spinner with a small ε could be admitted. The floor must be preset data, chosen with ε so that A ≤ A_max over every
admissible flick. For S-min at ε = 0.05, the smallest flicks above which every stronger flick stays within the bound,
*with every u accepted*, are:

| A_max | Flick floor ω₀ (x_min) | Θ₀ at that flick | Turns |
|---|---|---|---|
| 2.0 | 8.18 rad/s | 16.7 rad | 2.66 |
| 1.5 | 13.08 rad/s | 42.8 rad | 6.80 |
| 1.25 | 20.08 rad/s | 100.8 rad | 16.0 |

**What the adversarial pass exposed (F-1).** As first written, the floor was tested on the *simulated* turn, after the
draw, and a refused spin is a free re-spin. An aimer then picks a flick just under the point where every u clears the
floor, so only a thin slice of u is accepted, and given acceptance the sector is nearly fixed. With the floor at
42.75 rad: at ω₀ = 12.514 rad/s only 5.0% of u is accepted and **A given acceptance = 8.0** (the aimer's sector is
certain); at 12.758 rad/s, 25% accepted and A = 3.0. The first "PASS" measured A only where every u was accepted, so
it missed this. The same selection works on any refusal that depends on u.

**Result: FAIL as first tested; corrected** (the owner: "Adopt the fix"). The spinner's floor is tested on **the
logged input, before the draw**: x ≥ x_min (integer preset data, the table's flick floor, plus a margin for the
engine), an intent refusal ("re-spin") that draws nothing. The simulated turn test stays as a defect hook. Both dyno
claims and A are measured on accepted outcomes with the acceptance rate reported, which covers the die's u-dependent
refusals. This belongs to the Implementation Specification (the preset, G-0, G-1, G-4, X8). ε, x_min and A_max are one
decision, the owner's at R5.

## 3. Scenario 2 — Missing information at a gate

**The gate and the missing input.** The dataset plan's fit of the spinner's a = τ/I and c = b/I (GX-49: "measured"
needs a known time base). The owner films on a phone in slow motion: the phone captures 240 fps and exports a file
whose stream says 30 fps, as D-3's metadata shows for its own clip. The capture rate is missing from the file, and the
fit reads the playback rate.

**What happens.** Every time is read 8 times too long. The fit returns a = 0.031 rad/s² against a true 2.0 (64 times too
small) and ω₀ 8 times too small. **The predicted angle turned is unchanged** (36.0 rad both ways), because Θ is a
geometric property of the motion and is invariant under rescaling time. Only the time to stop shows it: 48 s read
against 6 s true. The held-out third, filmed the same way, agrees with the fit on Θ. The preset is admitted as
"measured". In play, a real 12 rad/s flick would turn 2304 rad (367 turns) over 384 s.

**Is the fallback enough?** No. GX-49 requires a "known" time base, but a declared one passes. The footage rule
(AE-c27) covers third-party clips, not the owner's own. The Consistency Gate could not see it: it is a data fault, not a
logic fault.

**Result: FAIL.** The error passes through undetected and changes every spin.

**Mechanism to add (dataset plan and GX-49's operational definition, Implementation Specification):** a source's time
base counts as known only when it is **verified inside the clip**, by a time reference in frame (a running stopwatch,
or a blinking light of known period) or by a free fall timed against g in the same clip. A held-out check must include
a **time-dependent prediction** (T, the time to stop, or ω at a fixed time), not only the angle.

## 4. Scenario 3 — Adversarial interpretation

**The interpretation.** "A preset is fair if its dyno passes." The preset's author feeds the hand's-claim dyno a broad
population of flicks, ω₀ uniform on [8, 80] rad/s. Real players flick between 9 and 11 rad/s. The dyno passes, the
record names its population as GX-48(a) asks, and the preset is admitted as fair.

**Why it is technically valid.** GX-48(a) asks for "inputs drawn from a stated population of throws (from the
dataset)" and GX-49 asks that the population carry its κ. A population tagged "assumed" is stated and tagged. The
pass rule is open (AE-c21), so nothing requires the population to be the measured one.

**Why it is wrong in intent.** G-1 asks that fairness be measured, not assumed. A dyno proves fairness only for the
throws it simulates, and the step-4 worked example showed a dyno's χ² swing from fail to pass on the population and the
start policy alone (35.8 and 7.52; the 7.52 was later shown vacuous, F-2, which only strengthens the point). "Fair" over imaginary flicks says nothing about the people at the table.

**What should catch it.** The provenance tag flags the population as assumed, but only to a reader. No gate refuses it.

**Result: FAIL.** The interpretation passes the framework unchallenged.

**Mechanism to add (GX-48's operational definition and G-0, Implementation Specification):** for admission *for play*,
the hand's-claim population must be the dataset's **measured** flick or throw distribution (κ = measured), named by
hash in the dyno record. A dyno on an assumed population is allowed for development only, and its record says so. The
pass rule's numbers stay the owner's (AE-c21).

## 5. Conflict-handling review

| Gap | Correction | Stage |
|---|---|---|
| The one-turn floor is hard-coded, and a floor tested after the draw lets refusals select on u (Scenario 1, F-1) | x_min as integer preset data, tested at G-1 before the draw; the turn test a defect hook; fairness on accepted outcomes | Implementation Specification (preset, G-0, G-1, G-4, X8) |
| A declared time base passes as known (Scenario 2) | Time base verified in clip; a time-dependent held-out check | Implementation Specification (dataset plan); GX-49's operational definition |
| An assumed population can admit a preset (Scenario 3) | Admission for play needs the measured population, named by hash | Implementation Specification (G-0); GX-48's operational definition |

**Already flagged, not blocked: the scripted aimer.** A modified client that knows the seed (every lockstep peer does)
can search for a throw that lands a chosen outcome; every axiom holds while it does. AE-c25 carries this as an owner gate
and a production concern (step 5 §5). This scenario was checked and is recorded as passing *by flag*: the framework
names it and does not hide it.

## 6. Traceability under stress

All three scenarios kept the TraceabilityMap intact. Scenario 2 is the one whose failure would have been
undetectable in play: the wrong preset would trace correctly to its fit and its sources, and only a wrong number would
travel. Its correction adds a traceable check (a time-dependent residual) to the chain from source to preset.

## 7. Open decision gates

| Gate | Decision | Blocking |
|---|---|---|
| ODG-g5 | ε, x_min and A_max per component, as one decision (with AE-c21's pass rule) | non-blocking: owner at R5 |
| ODG-g6 (AE-c25) | The trust model for networked play: whether a defence against scripted aimers is needed, and where it goes (it changes the sealed seed model) | non-blocking: owner, at Phase 5's security review or the first networked game |

No blocking gate was produced.

## 8. Recommendation

**Approved for Implementation Specification — two non-blocking open decision gates carried forward** (ODG-g5,
ODG-g6), with the three corrections in §5 carried into the specification.

Under standing approval this gate batches (it produced no blocking gate). Audit note: the three corrections tighten a
floor, a data rule and an admission rule; none adds a primitive or changes a sealed object. *Revised after the
adversarial pass (F-1, F-13 via the scripts), on the owner's "Adopt the fix" and "Apply all".*
