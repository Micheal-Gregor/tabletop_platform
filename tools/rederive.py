#!/usr/bin/env python3
"""
rederive — CC-5, mechanically.

Recomputes each golden vector's output from the implementation and compares it
to the pinned value. A vector that cannot be recomputed, or that recomputes to
something else, is a CC-5 failure. A vector whose impl_sha does not match the
implementation file it claims to derive from was hand-written, which is the
specific thing CC-5 exists to catch.

Language-agnostic by construction. The only project-specific knowledge is one
declared command in .metaframework/project.json:

    "rederive_invoke": "node {entry} {input_file}"
    "rederive_invoke": "python3 {entry} {input_file}"
    "rederive_invoke": "cargo run --quiet --bin {module} -- {input_file}"

Placeholders: {entry} (the module's File from the object model), {module},
{input_file} (a temp file holding the vector's encoded input), {vector_id}.
The command must write only the encoded output to stdout.

Usage:
    rederive.py <VEC-ID> [...]        one or more vectors
    rederive.py --all                 every COMPUTED vector
    rederive.py --all --json
Exit: 0 all pass, 1 any fail, 2 usage / configuration error.
"""

import argparse
import hashlib
import json
import re
import shlex
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Context:
    """What every vector's check shares: the repo root, each module's File, the declared command, the re-pin flag."""
    root: Path
    entries: dict
    invoke: str
    refresh_provenance: bool = False


def write_text_kept(path: Path, text: str) -> None:
    """Write text as UTF-8 bytes. Text mode would turn every \\n into \\r\\n on Windows (F7, the Frame Gate trial),
    so this writes LF, or CRLF only where the file being rewritten already uses it."""
    crlf = path.is_file() and b"\r\n" in path.read_bytes()
    path.write_bytes(text.replace("\r\n", "\n").replace("\n", "\r\n" if crlf else "\n").encode("utf-8"))


def die(msg: str, code: int = 2) -> int:
    print(f"rederive: {msg}", file=sys.stderr)
    return code


def md_rows(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    lines = path.read_text(encoding="utf-8").splitlines()
    for i in range(len(lines) - 1):
        if lines[i].strip().startswith("|") and \
                re.match(r"^\|[\s\-:|]+\|$", lines[i + 1].strip()):
            cols = [c.strip() for c in lines[i].strip().strip("|").split("|")]
            rows, j = [], i + 2
            while j < len(lines) and lines[j].strip().startswith("|"):
                vals = [c.strip() for c in lines[j].strip().strip("|").split("|")]
                if len(vals) == len(cols):
                    rows.append(dict(zip(cols, vals)))
                j += 1
            return rows
    return []


def normalise(text: str, encoding: str) -> str:
    """Comparison is by declared encoding, never by raw string equality."""
    t = text.strip()
    if encoding in ("utf8-json", "json"):
        try:
            return json.dumps(json.loads(t), sort_keys=True, separators=(",", ":"))
        except json.JSONDecodeError:
            return t
    if encoding in ("hex", "sha256"):
        return t.lower()
    return t


def provenance_problem(claimed: str, actual: str) -> str:
    """Why the vector's impl_sha does not show it was computed from the current implementation, or ""."""
    if not claimed:
        return ("no impl_sha recorded; the emission contract requires it and "
                "without it the vector cannot be shown to be computed rather "
                "than hand-written")
    if claimed != actual:
        return (f"impl_sha {claimed[:12]} != current {actual[:12]}: the "
                f"implementation moved after this vector was pinned, so the "
                f"record asserts something untrue. Re-pin with "
                f"--refresh-provenance once the value re-derives.")
    return ""


def recompute(ctx: Context, vec: dict, entry: str, vid: str) -> subprocess.CompletedProcess | str:
    """Run the declared command on the vector's input: the finished process, or why it could not run."""
    # Binary: a text-mode write would turn every \n of the input into \r\n on Windows, and the
    # entry reads the input as bytes (F7, the Frame Gate trial).
    with tempfile.NamedTemporaryFile("wb", suffix=".in", delete=False) as tf:
        tf.write(vec.get("input", "").encode("utf-8"))
        in_file = tf.name
    try:
        # Split the declared command first, then fill each word (2.6.24): splitting the filled command read a Windows
        # temp path's backslashes as POSIX escapes and dropped them, so no vector re-derived (LedgerCore V2, VEC-01).
        cmd = [word.format(entry=entry, module=vec.get("module", ""), input_file=in_file, vector_id=vid)
               for word in shlex.split(ctx.invoke)]
        try:
            return subprocess.run(cmd, capture_output=True, text=True,
                                  timeout=120, cwd=str(ctx.root))
        except FileNotFoundError:
            return f"rederive_invoke command not found: {cmd[0]}"
        except subprocess.TimeoutExpired:
            return "recomputation exceeded 120s"
    finally:
        Path(in_file).unlink(missing_ok=True)


def check_one(ctx: Context, vec: dict, vid: str) -> tuple[bool, str]:
    if vec.get("state") == "DEFERRED":
        return True, "DEFERRED — skipped, not counted as a pass"

    module = vec.get("module", "")
    entry = ctx.entries.get(module)
    if not entry:
        return False, f"module {module} has no File in the object model"
    entry_path = ctx.root / entry
    if not entry_path.is_file():
        return False, f"{module} entry {entry} is not on disk"

    actual = hashlib.sha256(entry_path.read_bytes()).hexdigest()
    provenance = provenance_problem(vec.get("impl_sha", ""), actual)

    enc = vec.get("encoding", "utf8-json")
    r = recompute(ctx, vec, entry, vid)
    if isinstance(r, str):
        return False, r
    if r.returncode != 0:
        return False, f"implementation exited {r.returncode}: {r.stderr.strip()[:160]}"

    got = normalise(r.stdout, enc)
    want = normalise(vec.get("output", ""), enc)
    if got != want:
        return False, (f"recomputed {got[:60]!r} but the pinned value is "
                       f"{want[:60]!r}")
    if provenance:
        # The value is proven; the provenance record is not. CC-5 requires both,
        # so this fails — a record that asserts a false impl_sha is a false record.
        if ctx.refresh_provenance:
            vec["impl_sha"] = actual
            write_text_kept(ctx.root / "vectors" / f"{vid}.json", json.dumps(vec, indent=2) + "\n")
            return True, f"re-derived; impl_sha re-pinned to {actual[:12]}"
        return False, provenance
    return True, "re-derived"


def load_context(root: Path, refresh_provenance: bool) -> Context | str:
    """The checks' shared context from project.json and the object model, or why it cannot be built."""
    try:
        cfg = json.loads((root / ".metaframework" / "project.json")
                         .read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        return f"cannot read .metaframework/project.json: {e}"

    invoke = cfg.get("rederive_invoke")
    if not invoke:
        return ("project.json declares no rederive_invoke. CC-5 cannot be "
                "mechanical without it; see the emission contract §5.")

    entries = {r.get("Module", ""): r.get("File", "")
               for r in md_rows(root / "INSTRUMENTS" / "object-model-and-parameters.md")}
    if not entries:
        return ("INSTRUMENTS/object-model-and-parameters.md has no parseable "
                "table; vectors cannot be bound to implementations")
    return Context(root, entries, invoke, refresh_provenance)


def check_all(ctx: Context, paths: list[Path]) -> tuple[list[dict], int]:
    """(one result per vector file, in order; how many failed)."""
    results, failed = [], 0
    for p in paths:
        vid = p.stem
        try:
            vec = json.loads(p.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as e:
            results.append({"vector": vid, "ok": False, "detail": f"unreadable: {e}"})
            failed += 1
            continue
        ok, detail = check_one(ctx, vec, vid)
        results.append({"vector": vid, "module": vec.get("module", ""),
                        "state": vec.get("state", ""), "ok": ok, "detail": detail})
        failed += 0 if ok else 1
    return results, failed


def report(results: list[dict], failed: int, as_json: bool) -> None:
    if as_json:
        print(json.dumps({"status": "fail" if failed else "pass",
                          "checked": len(results), "failed": failed,
                          "results": results}, indent=2))
        return
    for r in results:
        mark = "ok  " if r["ok"] else "FAIL"
        print(f"{mark} {r['vector']:<10} {r.get('module',''):<10} {r['detail']}")
    print(f"\n{len(results)} vector(s), {failed} failed."
          if failed else f"\n{len(results)} vector(s), all re-derived.")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("vectors", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--root", default=".")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--refresh-provenance", action="store_true",
                    help="re-pin impl_sha for vectors whose value re-derives")
    args = ap.parse_args()

    if not args.all and not args.vectors:
        return die("name at least one VEC-ID, or pass --all")

    root = Path(args.root).resolve()
    ctx = load_context(root, args.refresh_provenance)
    if isinstance(ctx, str):
        return die(ctx)

    vdir = root / "vectors"
    if args.all:
        paths = sorted(vdir.glob("VEC-*.json"))
        if not paths:
            return die(f"no vectors found in {vdir}")
    else:
        paths = [vdir / f"{v}.json" for v in args.vectors]

    results, failed = check_all(ctx, paths)
    report(results, failed, args.json)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")      # every tool writes UTF-8 (2.8.0)
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
