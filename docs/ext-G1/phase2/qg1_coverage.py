"""QG1 coverage counts for extension G-1, Phase 2 (TE-5): backward (every node traces into S1) and forward
(every proven S1 element named by some node). Reads a2-hierarchy.md; prints counts and any gap."""
import re, sys
text = open("a2-hierarchy.md", encoding="utf-8").read()
rows = [l for l in text.splitlines() if re.match(r"^\| OBJ-\d\d \| [A-Z]", l)]
nodes = {}
for l in rows:
    c = [x.strip() for x in l.strip().strip("|").split("|")]
    if len(c) == 8:
        nodes[c[0]] = c
back_gaps = [k for k, c in nodes.items() if c[7] in ("", "—")]
s1 = ([f"GX-{n}" for n in range(40, 53)] + [f"P-{n}" for n in range(1, 12)] + [f"X{n}" for n in range(1, 11)] +
      [f"RX-{n}" for n in range(1, 9)] + [f"XTM-{n:02d}" for n in range(1, 13)])
objects = ["EnginePin", "Preset", "Provenance", "RollInput", "StartState", "Jitter", "WorldBuild", "Step",
           "SettleRule", "OutcomeReader", "RollOutcome", "SettleRecord", "SnapshotHash", "ReplayCheck", "Trajectory",
           "SolverLoader", "ReadySolver", "IntentRefusal", "OutcomeRefusal", "Φ", "EnergyBooks", "SkillIndex",
           "Dyno", "Dataset", "PinRecord", "InputInEffect", "JitterCoverage"]
traced = " ".join(c[7] + " " + c[2] for c in nodes.values())
fwd_gaps = [e for e in s1 if not re.search(r"(?<![\w-])" + re.escape(e) + r"(?![\w])", traced)]
obj_gaps = [o for o in objects if o not in text]
print(f"nodes {len(nodes)}; backward gaps {len(back_gaps)} {back_gaps}")
print(f"S1 ids {len(s1)}; forward gaps in node traces {len(fwd_gaps)} {fwd_gaps}")
print(f"theoretical objects {len(objects)}; not named anywhere in a2 {len(obj_gaps)} {obj_gaps}")
sys.exit(1 if back_gaps else 0)
