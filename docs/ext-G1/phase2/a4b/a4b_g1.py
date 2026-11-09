"""A4b worked example for extension G-1, Phase 2: one instance walked through the object model (a2-hierarchy.md).

The closed form stands in for the Simulator (no engine in Phase 2); it is labelled a stand-in, never a decider.
u values are XV-07's draws from the sealed RNGStream (seed sigma-7, stream rand:spinner-1). x_min = 6000 mrad/s and
the die's throw are this example's values; ODG-g5 and AE-c20 stay the owner's. Writes a4b-results.json (LF).
"""
import json, math

I, TAU, B, N_S, EPS = 0.002, 0.004, 0.0, 8, 0.05           # preset S-min (S1 step 4 §2), every value kappa = assumed
A = TAU / I                                                  # a = tau/I (step 3 §9)
SCALE = 1000                                                 # mrad/s per rad/s: UnitsToBinary64 divides by it
X_MIN, NO_THROW = 6000, 0                                    # floors on the Flick, in mrad/s (example values)
U = [0.557480385992676, 0.5018962631002069]                  # XV-07, draws 1 and 2
W = 2 * math.pi / N_S

def fnv1a64(text):
    h = 0xcbf29ce484222325
    for b in text.encode("utf-8"):
        h = ((h ^ b) * 0x100000001b3) & 0xFFFFFFFFFFFFFFFF
    return f"{h:016x}"

def guard(x):                                                # RollGuard (G-1): no draw, nothing logged on a refusal
    if not isinstance(x, int):
        return "MALFORMED_ARGS"
    if x <= NO_THROW:
        return "RULE_REFUSED: no flick"
    if x < X_MIN:
        return "RULE_REFUSED: re-spin"
    return "LEGAL"

def theta_closed(w_eff):                                     # ClosedFormOracle, standing in for the Simulator
    return w_eff * w_eff / (2 * A)

def attempt(x, u, s0):                                       # RollApplier: one draw -> Jitter -> roll -> read -> sigma
    factor = 1 + EPS * (2 * u - 1)                           # Jitter (symmetric, AE-c15 ruling)
    w_eff = (x / SCALE) * factor                             # EffectiveInput
    theta = theta_closed(w_eff)
    rest = (s0 + theta) % (2 * math.pi)
    sector = int(rest // W)                                  # half-open rule (AE-c29 open)
    if theta < 2 * math.pi:                                  # SpinnerReader G-4: a defect hook only
        outcome = "REFUSE(under-floor)"
    else:
        outcome = f"VALUE({sector})"
    books = 0.5 * I * w_eff ** 2 - TAU * theta - 0.0         # EnergyBooks, b = 0, no pegs
    h = fnv1a64(json.dumps({"rest": rest, "x": x, "u": u}, sort_keys=True))   # SnapshotHasher stand-in
    return {"x": x, "u": u, "factor": factor, "w_eff": w_eff, "s0": s0, "theta": theta, "rest": rest,
            "outcome": outcome, "sector": sector, "energy_books": books, "H": h}

flicks = [0, 3000, 12000, 12000]
draws, log, sigma, state_sector, s0, live = 0, [], [], None, 0.0, []
for x in flicks:
    verdict = guard(x)
    if verdict != "LEGAL":
        live.append({"x": x, "guard": verdict, "drawn": False, "logged": False})
        continue
    r = attempt(x, U[draws], s0)
    draws += 1
    log.append(x)
    sigma.append(r)
    state_sector, s0 = r["sector"], r["rest"]                # VALUE: Spinner.sector and sigma; next s0 = last rest
    live.append({"x": x, "guard": verdict, "drawn": True, "logged": True, "k": draws, **r})

def rebuild(entries):                                        # sealed rebuild re-runs the appliers; ReplayCheck compares
    out, s, k = [], 0.0, 0
    for x in entries:
        r = attempt(x, U[k], s)
        k += 1
        s = r["rest"]
        out.append(r)
    return out

replay = rebuild(log)
replay_equal = [a["H"] == b["H"] for a, b in zip(sigma, replay)]
tampered = rebuild([12000, 12001])
tamper_equal = [a["H"] == b["H"] for a, b in zip(sigma, tampered)]
floor_check = {"x_min_mrad_s": X_MIN, "theta_at_x_min_low_jitter": theta_closed(X_MIN / SCALE * (1 - EPS)),
               "clears_one_turn": theta_closed(X_MIN / SCALE * (1 - EPS)) >= 2 * math.pi}

die = {"throw": {"p_mm": [0, 50, 0], "v_mm_s": [800, 0, -200], "w_mrad_s": [0, 0, 15000]}, "u": U[0]}
f = 1 + EPS * (2 * U[0] - 1)
die["effective"] = {"p_m": [c / SCALE for c in die["throw"]["p_mm"]],
                    "v_m_s": [c / SCALE * f for c in die["throw"]["v_mm_s"]],
                    "w_rad_s": [c / SCALE * f for c in die["throw"]["w_mrad_s"]]}
COS_ALPHA = 0.984807753012208                                # alpha = 10 degrees, pinned literal (S1 E-17)
def up_dot(deg_about_z):                                     # face 1's normal is +y; rotate about z
    r = math.radians(deg_about_z)                            # analysis only; the reader itself uses the quaternion
    return math.cos(r)
die["reader"] = [{"rest": "identity", "dot": up_dot(0), "outcome": "VALUE(1)" if up_dot(0) >= COS_ALPHA else "REFUSE(cocked)"},
                 {"rest": "20 deg about z", "dot": up_dot(20), "outcome": "VALUE(1)" if up_dot(20) >= COS_ALPHA else "REFUSE(cocked)"}]

results = {"live": live, "draws": draws, "log": log, "final_sector": state_sector, "replay_equal": replay_equal,
           "tamper_equal": tamper_equal, "floor": floor_check, "die": die}
with open("a4b-results.json", "w", newline="\n") as fh:
    json.dump(results, fh, indent=1)
    fh.write("\n")
print(json.dumps(results, indent=1))
