"""Record the owner's verdict at R3's final gate in the stage files (2026-11-08). Run once, from this folder; then
emit_phase2.py (with RULINGS) and assemble_package.py re-run."""
from pathlib import Path
D = Path(__file__).resolve().parent
def edit(name, old, new):
    p = D / name
    t = p.read_text(encoding="utf-8")
    assert t.count(old) == 1, (name, old[:60])
    p.write_text(t.replace(old, new), encoding="utf-8", newline="\n")

edit("qg1-and-stress-test.md", "| **ESCALATE to the owner** at the final gate. Recommended:",
     "| **ESCALATE to the owner** at the final gate; **ruled 2026-11-08, live: \"mm, mm/s, mrad/s (Recommended)\"**. Recommended:")
edit("a3-abstraction.md", "| LB EL-5; open: AE-c20 (units, this phase's) |", "| LB EL-5; AE-c20 ruled: mm, mm/s, mrad/s |")
edit("emission-frame.md", "| AE-c20 | the integer inputs' units, and the order of scaling and jitter (OBJ-15 to OBJ-17) | no | the owner at R3's final gate |\n", "")
edit("final-package-frame.md", "<!-- APPROVAL -->",
     "\n\n**Approved by the owner, 2026-11-08, live at the gate: \"Approve and commit (Recommended)\"; AE-c20 ruled \"mm, mm/s,\nmrad/s (Recommended)\".** R3 spend at the gate: 3.18M of 4M weighted (`.metaframework/spend-ledger.md`, rows\n\"phase2:… G-1 (R3)\").")
edit("te6-adversarial-pass.md", "(`te6_fixes.py`, run from the\nsession's scratchpad; it changed only these stage files)",
     "(`te6_fixes.py`, kept beside these files as\nthe record; it changed only these stage files)")
print("gate recorded")
