"""Build the G-1 Phase 3 Specification docx (the record) from this folder's markdown, read-only on the sources.

Run from anywhere:  python docs/ext-G1/phase3/spec_docx.py
One part per record file, in PARTS order: headings, paragraphs, bullets, tables and fenced blocks. python-docx.
"""
import re
from pathlib import Path

from docx import Document
from docx.shared import Pt

HERE = Path(__file__).resolve().parent
PARTS = ["C0-partition.md", "facets/FA.md", "facets/FB.md", "S5-synthesis.md", "K6-conformance.md",
         "te6-adversarial-pass.md", "test-set-report.md", "CLAUDE_TABLETOP_G1_Phase3.md"]
OUT = HERE / "TABLETOP_G1_Phase3_Specification.docx"
TITLE = "TABLETOP — Phase 3 Specification, extension G-1 (physics decides a Randomizer's outcome)"
INLINE = re.compile(r"\*\*|`")


def plain(text: str) -> str:
    return INLINE.sub("", text)


def row_cells(line: str) -> list[str]:
    return [plain(c.strip()) for c in line.strip().strip("|").split("|")]


def add_table(doc, rows: list[str]) -> None:
    body = [row_cells(r) for r in rows if not re.match(r"^\|\s*:?-{3,}", r)]
    width = max(len(r) for r in body)
    table = doc.add_table(rows=len(body), cols=width, style="Table Grid")
    for i, cells in enumerate(body):
        for j, text in enumerate(cells):
            table.cell(i, j).text = text
    for cell in table._cells:
        for para in cell.paragraphs:
            for run in para.runs:
                run.font.size = Pt(7)


def add_block(doc, line: str) -> None:
    """One non-table line: a heading, a bullet or a paragraph."""
    heading = re.match(r"^(#{1,4})\s+(.*)", line)
    if heading:
        doc.add_heading(plain(heading.group(2)), level=min(len(heading.group(1)) + 1, 4))
    elif re.match(r"^\s*[-*] ", line):
        doc.add_paragraph(plain(line.strip()[2:]), style="List Bullet")
    elif line.strip():
        doc.add_paragraph(plain(line))


def add_part(doc, lines: list[str]) -> None:
    table, fence = [], False
    for line in lines + [""]:
        if line.startswith("```"):
            fence = not fence
        elif fence:
            doc.add_paragraph().add_run(line).font.name = "Consolas"
        elif line.startswith("|"):
            table.append(line)
        else:
            if table:
                add_table(doc, table)
                table = []
            add_block(doc, line)


def main() -> None:
    doc = Document()
    doc.add_heading(TITLE, level=0)
    for part in PARTS:
        doc.add_page_break()
        doc.add_heading(f"Part: {part}", level=1)
        add_part(doc, (HERE / part).read_text(encoding="utf-8").splitlines())
    doc.save(OUT)
    print(f"wrote {OUT.name} from {len(PARTS)} parts")


if __name__ == "__main__":
    main()
