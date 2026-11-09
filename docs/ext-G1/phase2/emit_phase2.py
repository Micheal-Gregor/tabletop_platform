"""Emit CLAUDE_TABLETOP_G1_Phase2.md (TE-5: assembly of decided content is a script).

Fills emission-frame.md's markers from the stage files: the node table (a2 §1 with a3 §3's tags), the sealed nodes
(a1 §3), the declared inputs with the Decides basis (a2 §1, §2; ranges expanded per node), the refused edges and
abstractions (a2 §3, a3 §2) and a5's payload. Prints each input's sha256 and the output's. Run from this folder.
"""
import hashlib, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
RULINGS = sys.argv[1] if len(sys.argv) > 1 else "pending: put to the owner at the final gate."

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def read(n): return (HERE / n).read_text(encoding="utf-8")
def cells(line): return [c.strip() for c in line.strip().strip("|").split("|")]
def table_after(text, header_start):
    lines = text.splitlines()
    i = next(k for k, l in enumerate(lines) if l.startswith(header_start))
    out = []
    for l in lines[i + 2:]:
        if not l.startswith("|"): break
        out.append(cells(l))
    return out

a1, a2, a3, a5 = read("a1-intake.md"), read("a2-hierarchy.md"), read("a3-abstraction.md"), read("a5-contract.md")
nodes = table_after(a2, "| ID | Node | Kind | Is-a |")
tags = {r[0]: r[2] for r in table_after(a3, "| ID | Node | Tag |")}
rows = ["| ID | Node | Kind | Tag | Traces to | Status | Decides |", "|---|---|---|---|---|---|---|"]
for n in nodes:
    kind = n[2] + (f"; is-a {n[3]}" if n[3] != "—" else "")
    rows.append(f"| {n[0]} | {n[1]} | {kind} | {tags.get(n[0], '—')} | {n[7]} | ACTIVE | {n[4]} |")
node_table = "\n".join(rows)

sealed = table_after(a1, "| Sealed node (S2 name) |")
sealed_table = "\n".join(["| Sealed node (S2 name) | MOD | Reached only through | Status |", "|---|---|---|---|"] +
                         [f"| {' | '.join(r)} |" for r in sealed])

inputs = {}
for r in table_after(a2, "| ID | Construction | Operation |"):
    m = re.match(r"OBJ-(\d\d)(?: to OBJ-(\d\d))?$", r[0])
    lo, hi = int(m.group(1)), int(m.group(2) or m.group(1))
    for k in range(lo, hi + 1):
        inputs[f"OBJ-{k:02d}"] = (r[1], r[2])
irows = ["| OBJ | Declared inputs (construction) | Operation inputs | Decides | Decides basis |", "|---|---|---|---|---|"]
for n in nodes:
    c, o = inputs[n[0]]
    irows.append(f"| {n[0]} | {c} | {o} | {n[4]} | {n[5]} |")
assert len(inputs) == len(nodes) == 49, (len(inputs), len(nodes))
input_table = "\n".join(irows)

refused = ["| ID | Refused item | Kind | Reason | Preserved as |", "|---|---|---|---|---|"]
for r in table_after(a2, "| ID | Refused is-a |"):
    refused.append(f"| {r[0]} | {r[1]} | is-a | {r[2]} | {r[3]} |")
for r in table_after(a3, "| ID | Refused abstraction |"):
    refused.append(f"| {r[0]} | {r[1]} | abstraction ({r[2]}) | {r[3]} | {r[4]} |")
refused_table = "\n".join(refused)

payload = a5[a5.index("## Verification payload"):].replace("## Verification payload", "### Verification payload", 1)

frame = HERE / "emission-frame.md"
out = frame.read_text(encoding="utf-8")
for marker, body in [("<!-- TABLE nodes -->", node_table), ("<!-- TABLE sealed -->", sealed_table),
                     ("<!-- TABLE inputs -->", input_table), ("<!-- TABLE refused -->", refused_table),
                     ("<!-- INCLUDE a5-payload -->", payload.rstrip()), ("<!-- RULINGS -->", RULINGS)]:
    assert out.count(marker) == 1, marker
    out = out.replace(marker, body)
dest = HERE / "CLAUDE_TABLETOP_G1_Phase2.md"
dest.write_text(out, encoding="utf-8", newline="\n")
for n in ["emission-frame.md", "a1-intake.md", "a2-hierarchy.md", "a3-abstraction.md", "a5-contract.md"]:
    print(f"input  {n}  sha256 {sha(HERE / n)}")
print(f"wrote  {dest.name}  sha256 {sha(dest)}  ({len(nodes)} nodes, {len(refused) - 2} refused)")
