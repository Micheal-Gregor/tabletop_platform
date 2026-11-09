"""Extension G-1, Phase 1, Step 4: the Minimal Worked Example's arithmetic.

Run from the repo root:  python docs/ext-G1/phase1/mwe/mwe_g1.py
It prints a summary and writes mwe-results.json beside this file.

The jitter draws u come from the SEALED RNGStream (packages/engine/src/kernel/rng-stream.ts), run through node;
nothing here re-implements the sealed RNG. The spinner's closed form stands in for the engine (no implementation
exists yet): every number it produces is a stand-in, labelled as such, and the hash is a stand-in hash of the
closed-form rest state, never Rapier's snapshot hash.
"""

import hashlib
import json
import math
import random
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]

SEED = "sigma-7"                 # the seed of the sealed V-1 and V-9 vectors
STREAM = "rand:spinner-1"        # the component's own stream (name convention: an MWE assumption)

# Preset S-min: the gap's worked example. Every value's provenance: assumed (G-1 shaped detail).
GAP = "ui/gaps.md G-1 worked example"
PRESET = {
    "I": {"value": 0.002, "unit": "kg m^2", "kappa": "assumed", "source": GAP},
    "tau": {"value": 0.004, "unit": "N m", "kappa": "assumed", "source": GAP},
    "b": {"value": 0.0, "unit": "N m s", "kappa": "assumed", "source": GAP + " (no drag)"},
    "sectors": {"value": 8, "unit": "equal", "kappa": "assumed", "source": GAP},
    "epsilon": {"value": 0.05, "unit": "1", "kappa": "assumed", "source": GAP},
    "omega_unit": {"value": 1000, "unit": "mrad/s per rad/s", "kappa": "assumed", "source": "MWE (AE-c20 open)"},
    "dt": {"value": 1 / 240, "unit": "s", "kappa": "assumed", "source": "MWE (pin, AE-c16 open)"},
}
I = PRESET["I"]["value"]
TAU = PRESET["tau"]["value"]
NS = PRESET["sectors"]["value"]
EPS = PRESET["epsilon"]["value"]
W = 2 * math.pi / NS
TWO_PI = 2 * math.pi
COS_ALPHA = 0.984807753012208          # cos 10 deg, pinned literal (15 significant digits, within the 17-digit rule)
DIE_NORMALS = {1: (0, 1, 0), 6: (0, -1, 0), 2: (1, 0, 0), 5: (-1, 0, 0), 3: (0, 0, 1), 4: (0, 0, -1)}


def sealed_draws(seed: str, name: str, n: int) -> list[float]:
    """n draws from the sealed RNGStream, run by node from the sealed source file."""
    js = (
        "import('./packages/engine/src/kernel/rng-stream.ts').then(m=>{"
        f"const s=new m.RNGStream({json.dumps(name)},{json.dumps(seed)});"
        f"console.log(JSON.stringify(Array.from({{length:{n}}},()=>s.next())));}})"
    )
    out = subprocess.run(
        ["node", "--experimental-transform-types", "--no-warnings", "-e", js],
        cwd=ROOT, capture_output=True, text=True, check=True,
    )
    return json.loads(out.stdout.strip())


def theta_closed(omega: float) -> float:
    """Closed form, no drag: angle turned before rest."""
    return I * omega * omega / (2 * TAU)


def time_closed(omega: float) -> float:
    return I * omega / TAU


def sector_of(angle: float) -> int:
    return int((angle % TWO_PI) // W)


def standin_hash(theta_rest: float) -> str:
    """Stand-in for the snapshot hash: SHA-256 of the canonical closed-form rest state."""
    canon = json.dumps({"omega": 0, "theta_rest": repr(theta_rest)}, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canon.encode()).hexdigest()


def discrete_theta(omega0: float, dt: float) -> float:
    """Semi-implicit Euler with constant friction torque: the ORDER of a fixed-step integrator's error.
    This is not Rapier; it informs the tolerance AE-c26 must set."""
    a = TAU / I
    w, th = omega0, 0.0
    while w > 0:
        w = max(w - a * dt, 0.0)
        th += w * dt
    return th


def attempt(x_mrad: int, s0: float, u: float | None) -> dict:
    """One spinner attempt through gates G-1 (floor) and G-2..G-6. The closed form stands in for roll_pi."""
    if not isinstance(x_mrad, int) or x_mrad <= 0:
        return {"x": x_mrad, "intent_refusal": "RULE_REFUSED no flick", "draw": None, "logged": False}
    omega0 = x_mrad / PRESET["omega_unit"]["value"]
    omega_eff = omega0 * (1 + EPS * u)
    theta = theta_closed(omega_eff)
    theta_rest = s0 + theta
    outcome = "REFUSE(under-one-turn)" if theta < TWO_PI else f"VALUE(sector {sector_of(theta_rest)})"
    return {
        "x": x_mrad, "u": u, "omega0": omega0, "omega_eff": omega_eff, "s0": s0,
        "Theta": theta, "T": time_closed(omega_eff), "theta_rest": theta_rest, "O": outcome,
        "energy_books": 0.5 * I * omega_eff ** 2 - TAU * theta,
        "H_standin": standin_hash(theta_rest),
    }


def gap_example() -> dict:
    """The gap's own worked example, re-derived (u fixed at 0 and 0.5 as the gap states them)."""
    return {
        "omega12": {"Theta": theta_closed(12.0), "T": time_closed(12.0), "rest": theta_closed(12.0) % TWO_PI,
                    "sector": sector_of(theta_closed(12.0))},
        "omega12.3": {"Theta": theta_closed(12.3), "rest": theta_closed(12.3) % TWO_PI,
                      "sector": sector_of(theta_closed(12.3))},
        "skill_index_at_12": W * TAU / (I * 12.0),
    }


def live_and_replay(u1: float, u2: float) -> tuple[dict, dict]:
    """The live log (A0 intent refusal, A1 refused outcome, A2 accepted) and its replay under AE-c14's two readings."""
    a1 = attempt(3000, 0.0, u1)
    a2 = attempt(12000, a1["theta_rest"], u2)     # reading R-a of AE-c18: start where the arrow last rested
    live = {"A0": attempt(0, 0.0, None), "A1": a1, "A2_reading_Ra": a2,
            "A2_reading_Rb": attempt(12000, 0.0, u2)}  # reading R-b: a refused attempt does not move the start
    r1 = attempt(3000, 0.0, u1)
    r2 = attempt(12000, r1["theta_rest"], u2)
    # F-3 (adversarial pass): unlogged, A1 writes nothing, so A2 starts at 0 live too; live draws u2, replay u1.
    live_unlogged = attempt(12000, 0.0, u2)
    replay_unlogged = attempt(12000, 0.0, u1)
    replay = {
        "refusal_logged": {"A2_H_equal": r2["H_standin"] == a2["H_standin"], "A2_O": r2["O"]},
        "refusal_not_logged": {
            "A2_H_equal": replay_unlogged["H_standin"] == live_unlogged["H_standin"],
            "live": {"O": live_unlogged["O"], "rest": live_unlogged["theta_rest"] % TWO_PI,
                     "omega_eff": live_unlogged["omega_eff"], "u": u2},
            "replay": {"O": replay_unlogged["O"], "rest": replay_unlogged["theta_rest"] % TWO_PI,
                       "omega_eff": replay_unlogged["omega_eff"], "u": u1}},
        "tampered_x12001": {"H_equal": attempt(12001, a1["theta_rest"], u2)["H_standin"] == a2["H_standin"]},
    }
    return live, replay


def oracle_xv01() -> dict:
    """XV-01's oracle side: Theta and T at 8, 12 and 16 rad/s with u fixed at 0.5 (symmetric g(u) = 0, no jitter)."""
    return {str(w): {"Theta": theta_closed(w), "T": time_closed(w), "u": 0.5} for w in (8.0, 12.0, 16.0)}


def chain_vacuity() -> dict:
    """F-2: one constant 12 rad/s flick, no jitter, chained starts. It 'passes' chi-square while the hand aims perfectly."""
    counts = [0] * NS
    s0 = 0.0
    for _ in range(10_000):
        s0 = (s0 + theta_closed(12.0)) % TWO_PI
        counts[sector_of(s0)] += 1
    return {"counts": counts, "chi2": chi2(counts, 10_000)}


def rerun_final_rules(u1: float) -> dict:
    """The worked example's log under the final rules: symmetric jitter, the spinner floor on the input before the draw
    (x_min = 5278 mrad/s, the least floor at which every u clears one turn), and starts that chain from the last rest."""
    x_min = 5278
    out = {"x_min_mrad_s": x_min, "A0": "x = 0: intent refusal, no draw",
           "A1": "x = 3000 < x_min: intent refusal (re-spin), no draw, not logged, nothing moves"}
    omega_eff = 12.0 * (1 + EPS * (2 * u1 - 1))
    th = theta_closed(omega_eff)
    out["A2"] = {"u": u1, "draw_index": 1, "omega_eff": omega_eff, "s0": 0.0, "Theta": th,
                 "rest": th % TWO_PI, "O": f"VALUE(sector {sector_of(th)})"}
    return out


def sector_probs_over_u(omega0: float, s0: float, g) -> list[float]:
    """Sector probabilities over u ~ U[0,1) for a fixed flick (the jitter's claim), by a fine midpoint rule."""
    n = 200_000
    counts = [0] * NS
    for k in range(n):
        counts[sector_of(s0 + theta_closed(omega0 * (1 + EPS * g((k + 0.5) / n))))] += 1
    return [c / n for c in counts]


def chi2(counts: list[float], n: float) -> float:
    e = n / NS
    return sum((c - e) ** 2 / e for c in counts)


def jitter_claim() -> dict:
    """The jitter's claim for the accepted flick (s0 = 0): one-sided g(u)=u against symmetric g(u)=2u-1."""
    out = {}
    for name, g, low in (("one_sided", lambda u: u, 12.0), ("symmetric", lambda u: 2 * u - 1, 12.0 * (1 - EPS))):
        p = sector_probs_over_u(12.0, 0.0, g)
        out[name] = {"p": p, "reachable": sum(q > 0 for q in p), "chi2_N10000": chi2([q * 1e4 for q in p], 1e4),
                     "span_rad": theta_closed(12.0 * (1 + EPS)) - theta_closed(low)}
    out["coverage_floor_rad"] = {"one_sided": TWO_PI / (2 * EPS + EPS ** 2), "symmetric": math.pi / (2 * EPS)}
    # F-13: an arc longer than 2pi - W meets every sector at any alignment, so that is the exact floor.
    out["coverage_floor_exact_rad"] = {"one_sided": (TWO_PI - W) / (2 * EPS + EPS ** 2),
                                       "symmetric": (TWO_PI - W) / (4 * EPS)}
    out["chi2_critical_df7"] = {"0.05": 14.067, "0.001": 24.322}
    return out


def hand_claim() -> dict:
    """A dyno of N=10,000 with an ASSUMED hand population, omega0 ~ U[8,16] rad/s, s0 = 0."""
    rng = random.Random(7)
    counts = [0] * NS
    refused = 0
    for _ in range(10_000):
        r = attempt(int(round(rng.uniform(8.0, 16.0) * 1000)), 0.0, rng.random())
        if r["O"].startswith("REFUSE"):
            refused += 1
        else:
            counts[sector_of(r["theta_rest"])] += 1
    return {"population": "omega0 ~ U[8,16] rad/s, kappa=assumed", "N": 10_000, "refused": refused,
            "counts": counts, "chi2": chi2(counts, sum(counts))}


def hand_claim_chain() -> dict:
    """The same population and draws, but each spin starts where the last one rested (AE-c18 reading R-a)."""
    rng = random.Random(7)
    counts = [0] * NS
    s0 = 0.0
    for _ in range(10_000):
        r = attempt(int(round(rng.uniform(8.0, 16.0) * 1000)), s0, rng.random())
        s0 = r["theta_rest"] % TWO_PI
        counts[sector_of(s0)] += 1
    return {"population": "omega0 ~ U[8,16] rad/s, kappa=assumed; s0 = last rest", "N": 10_000,
            "counts": counts, "chi2": chi2(counts, sum(counts))}


def rotate(q: tuple, v: tuple) -> tuple:
    """Rotate v by the unit quaternion q = (x, y, z, w), with + - * only."""
    x, y, z, w = q
    vx, vy, vz = v
    tx, ty, tz = 2 * (y * vz - z * vy), 2 * (z * vx - x * vz), 2 * (x * vy - y * vx)
    return (vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx))


def read_die(q: tuple) -> dict:
    best = max(DIE_NORMALS, key=lambda f: rotate(q, DIE_NORMALS[f])[1])
    d = rotate(q, DIE_NORMALS[best])[1]
    return {"face": best, "dot": d, "O": f"VALUE({best})" if d >= COS_ALPHA else "REFUSE(cocked)"}


def die_reader() -> dict:
    """The die's outcome reader on given rest orientations (the die cannot be simulated by hand)."""
    h = math.radians(10)
    return {
        "identity": read_die((0.0, 0.0, 0.0, 1.0)),
        "tilted_20deg_about_z": read_die((0.0, 0.0, math.sin(h), math.cos(h))),
        "no_tumble": {"faces_up_during_motion": [1, 1, 1, 1], "distinct": 1, "T_f": 3, "O": "REFUSE(no-tumble)"},
        "tumbled": {"faces_up_during_motion": [1, 2, 6, 5, 1], "distinct": 4, "T_f": 3, "passes_G4": True},
    }


def report(res: dict) -> None:
    live = res["live"]
    print(json.dumps({k: res[k] for k in ("sealed_draws", "gap_example", "replay", "integrator_order")}, indent=1))
    print("A1", live["A1"]["O"], "Theta", live["A1"]["Theta"])
    a2 = live["A2_reading_Ra"]
    print("A2 Ra", a2["O"], "s0", a2["s0"], "Theta", a2["Theta"], "rest", a2["theta_rest"] % TWO_PI)
    print("A2 Rb", live["A2_reading_Rb"]["O"], "rest", live["A2_reading_Rb"]["theta_rest"] % TWO_PI)
    for k in ("one_sided", "symmetric"):
        j = res["jitter_claim"][k]
        print(k, "reachable", j["reachable"], "chi2", round(j["chi2_N10000"], 1), "span", round(j["span_rad"], 4),
              "p", [round(p, 4) for p in j["p"]])
    print("coverage floors", res["jitter_claim"]["coverage_floor_rad"])
    hc = res["hand_claim"]
    print("hand", hc["counts"], "refused", hc["refused"], "chi2", round(hc["chi2"], 2))
    hk = res["hand_claim_chain"]
    print("hand chain", hk["counts"], "chi2", round(hk["chi2"], 2))
    print("die", res["die_reader"]["identity"], res["die_reader"]["tilted_20deg_about_z"])
    print("exact coverage floors", res["jitter_claim"]["coverage_floor_exact_rad"])
    print("xv01", res["oracle_xv01"])
    print("chain vacuity", res["chain_vacuity"])
    print("final rules", res["rerun_final_rules"])


def main() -> None:
    draws = sealed_draws(SEED, STREAM, 3)
    live, replay = live_and_replay(draws[0], draws[1])
    w_eff = live["A2_reading_Ra"]["omega_eff"]
    dt = PRESET["dt"]["value"]
    res = {
        "seed": SEED, "stream": STREAM, "preset": PRESET, "sealed_draws": draws,
        "gap_example": gap_example(), "live": live, "replay": replay,
        "integrator_order": {"Theta_closed": live["A2_reading_Ra"]["Theta"], "Theta_semi_implicit":
                             discrete_theta(w_eff, dt), "omega_dt_over_2": w_eff * dt / 2},
        "jitter_claim": jitter_claim(), "hand_claim": hand_claim(), "hand_claim_chain": hand_claim_chain(),
        "die_reader": die_reader(), "oracle_xv01": oracle_xv01(), "chain_vacuity": chain_vacuity(),
        "rerun_final_rules": rerun_final_rules(draws[0]),
    }
    io = res["integrator_order"]
    io["difference"] = io["Theta_semi_implicit"] - io["Theta_closed"]
    (HERE / "mwe-results.json").write_text(json.dumps(res, indent=2), encoding="utf-8", newline="\n")
    report(res)


if __name__ == "__main__":
    main()
