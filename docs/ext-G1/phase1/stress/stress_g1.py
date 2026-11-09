"""Extension G-1, Phase 1, Step 6: the Logic Stress-Test's arithmetic.

Run from the repo root:  python docs/ext-G1/phase1/stress/stress_g1.py
Writes stress-results.json beside this file. The spinner's closed form (no drag) stands in for the engine, as in the
Minimal Worked Example; the jitter is the owner's symmetric form, x_eff = x * (1 + eps * (2u - 1)) (AE-c15).
"""

import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
I, TAU, NS, EPS = 0.002, 0.004, 8, 0.05     # preset S-min (kappa = assumed)
TWO_PI = 2 * math.pi
W = TWO_PI / NS
N_U = 20_000


def theta(omega: float) -> float:
    return I * omega * omega / (2 * TAU)


def aim_advantage(omega0: float) -> float:
    """A = N_s * the largest probability mass, over u, that any arc one sector wide can hold (the aimer picks the arc)."""
    angles = sorted(theta(omega0 * (1 + EPS * (2 * (k + 0.5) / N_U - 1))) % TWO_PI for k in range(N_U))
    doubled = angles + [a + TWO_PI for a in angles]
    best, j = 0, 0
    for i in range(N_U):
        while doubled[j] < doubled[i] + W:
            j += 1
        best = max(best, j - i)
    return NS * best / N_U


def scenario_1() -> dict:
    """An admissible flick just over the one-turn floor for every u, and the floor that would bound the aimer."""
    one_turn = math.sqrt(2 * TAU * TWO_PI / I) / (1 - EPS)     # smallest omega0 with Theta >= 2pi for every u
    grid = [one_turn + 0.1 * k for k in range(0, 200)]
    table = [(w, theta(w), aim_advantage(w)) for w in grid]
    floors = {}
    for bound in (2.0, 1.5, 1.25):
        tail_ok = [i for i in range(len(table)) if all(a <= bound for _, _, a in table[i:])]
        floors[str(bound)] = {"omega0": table[tail_ok[0]][0], "Theta0_rad": table[tail_ok[0]][1],
                              "turns": table[tail_ok[0]][1] / TWO_PI} if tail_ok else None
    probe = 5.3
    return {"one_turn_floor_omega0": one_turn, "probe": {"omega0": probe, "Theta0": theta(probe),
            "Theta_min": theta(probe * (1 - EPS)), "Theta_max": theta(probe * (1 + EPS)),
            "A": aim_advantage(probe)}, "floor_for_bound": floors,
            "coverage_floor_symmetric_rad": math.pi / (2 * EPS),
            "coverage_floor_symmetric_exact_rad": (TWO_PI - W) / (4 * EPS),
            "post_draw_hole": post_draw_hole()}


def best_arc_share(angles: list[float]) -> float:
    """The largest share of the given angles that one arc a sector wide can hold."""
    a = sorted(x % TWO_PI for x in angles)
    n = len(a)
    doubled = a + [x + TWO_PI for x in a]
    best, j = 0, 0
    for i in range(n):
        while doubled[j] < doubled[i] + W:
            j += 1
        best = max(best, j - i)
    return best / n


def post_draw_hole() -> dict:
    """F-1 (adversarial pass): a floor on the SIMULATED turn, tested after the draw, lets refusals select on u.
    With the floor at 42.75 rad, an aimer flicks just under the point where every u clears it."""
    floor = 42.75
    out = {}
    for omega0 in (12.514, 12.758):
        thetas = [theta(omega0 * (1 + EPS * (2 * (k + 0.5) / N_U - 1))) for k in range(N_U)]
        accepted = [t for t in thetas if t >= floor]
        out[str(omega0)] = {"acceptance": len(accepted) / N_U,
                            "A_given_acceptance": NS * best_arc_share(accepted) if accepted else None}
    return {"floor_rad": floor, "probes": out}


def scenario_2() -> dict:
    """A slow-motion clip read at its playback rate: every time is k times too long. Theta is unchanged; T is not."""
    k = 240 / 30
    a_true, omega_true = TAU / I, 12.0
    a_read, omega_read = a_true / k ** 2, omega_true / k
    return {"time_scale": k, "a_true": a_true, "a_read": a_read,
            "Theta_true": omega_true ** 2 / (2 * a_true), "Theta_read": omega_read ** 2 / (2 * a_read),
            "T_true": omega_true / a_true, "T_read": omega_read / a_read,
            "real_flick_12rad_s_with_a_read": {"Theta_rad": 12.0 ** 2 / (2 * a_read), "T_s": 12.0 / a_read}}


def main() -> None:
    res = {"preset": {"I": I, "tau": TAU, "sectors": NS, "epsilon": EPS, "jitter": "symmetric"},
           "scenario_1": scenario_1(), "scenario_2": scenario_2()}
    (HERE / "stress-results.json").write_text(json.dumps(res, indent=2), encoding="utf-8", newline="\n")
    print(json.dumps(res, indent=1))


if __name__ == "__main__":
    main()
