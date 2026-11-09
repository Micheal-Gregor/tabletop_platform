"""Assemble the G-1 Phase 1 Final Package (TE-5: a mechanical step is a script).

Run from anywhere:  python docs/ext-G1/phase1/assemble_package.py
Reads final-package-frame.md, replaces each `<!-- INCLUDE <file> -->` line with that file's text (its headings shifted
down two levels so they nest under the package's numbered sections), and writes S1-G1-final-package.md. It prints the
SHA-256 of every input and of the output, so the package can be checked against the approved files.
"""

import hashlib
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
FRAME = HERE / "final-package-frame.md"
OUT = HERE / "S1-G1-final-package.md"
INCLUDE = re.compile(r"^<!-- INCLUDE (\S+) -->$")
FENCE = "```"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def shifted(text: str) -> str:
    """Shift markdown headings down two levels, leaving fenced code untouched."""
    out, in_fence = [], False
    for line in text.splitlines():
        if line.startswith(FENCE):
            in_fence = not in_fence
        if not in_fence and line.startswith("#"):
            line = "##" + line
        out.append(line)
    return "\n".join(out)


def main() -> None:
    lines = []
    for line in FRAME.read_text(encoding="utf-8").splitlines():
        m = INCLUDE.match(line)
        if m:
            src = HERE / m.group(1)
            print(f"include {m.group(1)}  sha256 {sha(src)}")
            lines.append(shifted(src.read_text(encoding="utf-8")))
        else:
            lines.append(line)
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    print(f"frame   {FRAME.name}  sha256 {sha(FRAME)}")
    print(f"wrote   {OUT.name}  sha256 {sha(OUT)}")


if __name__ == "__main__":
    main()
