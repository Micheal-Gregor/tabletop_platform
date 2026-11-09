"""Assemble the G-1 Phase 2 Final Package (TE-5: a mechanical step is a script).

Run from anywhere:  python docs/ext-G1/phase2/assemble_package.py
Reuses R2's assembler (`docs/ext-G1/phase1/assemble_package.py`), whose include-and-shift logic is unchanged, pointed at
this folder's `final-package-frame.md` and writing `S2-G1-final-package.md`. It prints the SHA-256 of every input and
of the output.
"""

import importlib.util
from pathlib import Path

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("phase1_assembler", HERE.parent / "phase1" / "assemble_package.py")
assembler = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(assembler)
assembler.HERE = HERE
assembler.FRAME = HERE / "final-package-frame.md"
assembler.OUT = HERE / "S2-G1-final-package.md"

if __name__ == "__main__":
    assembler.main()
