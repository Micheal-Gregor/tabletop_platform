#!/usr/bin/env python3
"""
preset — write a language's ready-made project.json settings where the build has not set them (2.6.21).

Setup step 4 had every build fill test_command, test_module, test_select, source_glob, isolation_test_command,
rederive_command, rederive_all and object_standard by hand, and each one left unfilled was a decision for the owner.
The template carries one preset per language in .metaframework/presets/ (python, typescript, php). This writes one:

    python tools/preset.py python

A key is written only while it is unset: absent, null, or still the value the template's project.json ships (SHIPPED
below: its TypeScript placeholders). A value the build set is never overwritten; it is listed as kept. The preset's
own keys that start with _ are notes and are never written. It prints each key it sets and each it keeps; a second
run sets nothing and leaves the file as it was.

Usage:
    preset.py <language> [--root DIR]    DIR defaults to the checkout this file is in
Exit: 0 written, or nothing left to set; 2 bad invocation (no such preset, or a preset or project.json that is not
JSON).
"""

import argparse
import json
import sys
from pathlib import Path

PRESETS = ".metaframework/presets"
PROJECT = ".metaframework/project.json"
# What the template's .metaframework/project.json ships for each key a preset sets. A key still holding its shipped
# value was never chosen by the build, so a preset may fill it. Change these with that file.
SHIPPED = {"test_command": "npx vitest run", "test_module": "npx vitest run tests/{module}",
           "test_select": "npx vitest run -t {test_name}", "source_glob": "src/**/*.ts",
           "rederive_command": "node tools/rederive.js {vector_id}", "rederive_all": "node tools/rederive.js --all",
           "isolation_test_command": None, "object_standard": None}


def read_json(path: Path) -> dict | None:
    try:
        data = json.loads(path.read_bytes().decode("utf-8"))
    except (OSError, ValueError):
        return None
    return data if isinstance(data, dict) else None


def unset(cfg: dict, key: str) -> bool:
    """Absent, null, or still the value the template ships: never chosen by the build."""
    return cfg.get(key) is None or (key in SHIPPED and cfg[key] == SHIPPED[key])


def plan(cfg: dict, preset: dict) -> tuple[dict, list[str]]:
    """({key: value} to write, the keys the build set to something else), over the preset's settings."""
    differ = {k: v for k, v in preset.items() if not k.startswith("_") and cfg.get(k) != v}
    return {k: v for k, v in differ.items() if unset(cfg, k)}, [k for k in differ if not unset(cfg, k)]


def write_project(path: Path, cfg: dict) -> None:
    """project.json as json.dumps prints it at indent 2 (the template's own layout), keeping CRLF where it has it."""
    text = json.dumps(cfg, indent=2, ensure_ascii=False) + "\n"
    crlf = b"\r\n" in path.read_bytes()
    path.write_bytes((text.replace("\n", "\r\n") if crlf else text).encode("utf-8"))


def apply(root: Path, name: str, preset: dict, cfg: dict) -> int:
    write, kept = plan(cfg, preset)
    for key in kept:
        print(f"preset {name}: kept {key} = {json.dumps(cfg[key], ensure_ascii=False)} (set by the build)")
    for key, value in write.items():
        print(f"preset {name}: set {key} = {json.dumps(value, ensure_ascii=False)}")
        cfg[key] = value
    if write:
        write_project(root / PROJECT, cfg)
    print(f"preset {name}: {len(write)} set, {len(kept)} kept" + (f"; {PROJECT} written" if write else ""))
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="write a language preset's settings into project.json where unset")
    ap.add_argument("language", help="python, typescript or php: a file in .metaframework/presets/")
    ap.add_argument("--root", default=str(Path(__file__).resolve().parents[1]))
    args = ap.parse_args()
    root = Path(args.root).resolve()
    preset, cfg = read_json(root / PRESETS / f"{args.language}.json"), read_json(root / PROJECT)
    if preset is None or cfg is None:
        known = ", ".join(sorted(p.stem for p in (root / PRESETS).glob("*.json"))) or "none"
        print(f"preset: no readable {PRESETS}/{args.language}.json (presets here: {known}), or {PROJECT} is not "
              "a JSON object", file=sys.stderr)
        return 2
    return apply(root, args.language, preset, cfg)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")      # every tool writes UTF-8 (2.8.0)
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
