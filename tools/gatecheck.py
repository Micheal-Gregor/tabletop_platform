#!/usr/bin/env python3
"""
gatecheck — is this checkout's gate install present and current? (2.6.17)

`phase4-checks.py gates` prints it; C4 does not close, `state.py set current_module=...` refuses and k7-run.py
refuses while it lists a problem; the SessionStart hook reports it. One implementation, read by all four.

What it checks:
  settings   .claude/settings.json runs tools/gate.py on every tool that writes, runs a shell or launches a
             sub-agent, and the command fails closed ("|| exit 2") when python3 cannot start.
  hooks      git's core.hooksPath is .githooks and .githooks/pre-commit is there (executable, off Windows).
             git does not clone config: a fresh clone fails here until tools/install-gates.py runs. An absolute
             hooks path to this checkout's own .githooks counts too; one to another checkout's does not (2.6.21:
             an app-made worktree points at the main checkout's). pre-applypatch is a hook too (2.6.21: git am).
  merges     merge.ff is false and pull.ff only (2.6.21): a fast-forward makes no commit, so no hook checks it.
  template   the gate machinery equals .metaframework/template-manifest.json (C0): a restarted repo still
             carrying an older gate.py has no probe rule, and nothing it logs can accept a step.
  project    every hooks/*.py is listed in project.json's project_hooks, and every listed one exists (I-3).
  code-gates declared in project.json exactly when .code-gates.json exists; then node and the gates.cjs path
             tools/install-gates.py recorded in .metaframework/local.json both resolve.
  tools      python3 and git resolve.
  probe      no .metaframework/gate-probe on disk: a probe that was not refused was written by an ungated session.
  profiles   (2.7.0) the session profiles: .claude/agents/builder.md is the template's (the manifest above), and
             .claude/settings.local.json turns off every plugin installed on this machine but metaframework and
             oop-standards, so a coordinator and its builders start light. tools/install-gates.py writes both.
"""

import hashlib
import json
import os
import re
import shutil
import subprocess
from pathlib import Path

from basis import file_sha256, project

REQUIRED_TOOLS = ("Bash", "PowerShell", "Write", "Edit", "NotebookEdit", "mcp__terminal__run_in_terminal",
                  "Monitor", "Agent", "Task")
MANIFEST = ".metaframework/template-manifest.json"
LOCAL = ".metaframework/local.json"
PROBE = ".metaframework/gate-probe"
SETTINGS_HOOKS = ".claude/settings.json#hooks"
BUILDER_PROFILE = ".claude/agents/builder.md"
COORDINATOR_PROFILE = ".claude/settings.local.json"
GATE_FILES = tuple(f"tools/{name}" for name in (
    "basis.py", "brief.py", "emission-check.py", "gate.py", "gate_reach.py", "gatecheck.py", "install-gates.py",
    "k7-run.py", "k7-scratch.py", "k7_passes.py", "manifests.py", "new-object.py", "phase4-checks.py", "php_support.py",
    "precommit.py", "receipts.py", "reopen.py", "run.py", "seal.py", "source_scan.py", "spend.py", "state.py",
    "structure-check.py", "test-set.py")) +(".githooks/pre-commit", ".githooks/pre-merge-commit",
                                            ".githooks/pre-applypatch", SETTINGS_HOOKS, BUILDER_PROFILE)
GIT_HOOKS = ("pre-commit", "pre-merge-commit", "pre-applypatch")
MERGE_SETTINGS = (("merge.ff", "false"), ("pull.ff", "only"))        # install-gates writes them (2.6.21)
# The plugins a build uses (2.7.0): the router and the skills, and code-gates. Every other installed one is off.
KEPT_PLUGINS = ("metaframework", "oop-standards")


def problem(rule: str, detail: str, file: str = "") -> dict:
    return {"rule": rule, "detail": detail, "file": file}


def git_config(root: Path, key: str) -> str:
    try:
        r = subprocess.run(["git", "-C", str(root), "config", "--get", key], capture_output=True, encoding="utf-8",
                           errors="replace", timeout=15)
        return r.stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ""


def same_folder(a: Path, b: Path) -> bool:
    return os.path.normcase(os.path.realpath(a)) == os.path.normcase(os.path.realpath(b))


def hooks_path_problem(root: Path) -> str:
    """'' when core.hooksPath resolves to this checkout's own .githooks, relative or absolute (2.6.21)."""
    value = git_config(root, "core.hooksPath")
    if not value:
        return "git's core.hooksPath is not .githooks (git does not clone config): run python3 tools/install-gates.py"
    path = Path(value).expanduser()
    if same_folder(path if path.is_absolute() else root / path, root / ".githooks"):
        return ""
    return (f"git's core.hooksPath is {value}, not this checkout's own .githooks (an app-made worktree points at the "
            "main checkout's): run python3 tools/install-gates.py here")


def hooks_installed(root: Path) -> str:
    """'' when git runs this checkout's .githooks on every commit, merge and git am here, else what is missing."""
    reason = hooks_path_problem(root)
    if reason:
        return reason
    for name in GIT_HOOKS:
        hook = root / ".githooks" / name
        if not hook.is_file():
            return f".githooks/{name} is missing: run python3 tools/install-gates.py, which writes it"
        if os.name != "nt" and not os.access(hook, os.X_OK):
            return f".githooks/{name} is not executable, so git skips it: run python3 tools/install-gates.py"
    return ""


def merge_problems(root: Path) -> list[dict]:
    """A merge that fast-forwards makes no commit, so no hook checks the commits it lands (2.6.21)."""
    have = {key: git_config(root, key) for key, _ in MERGE_SETTINGS}
    return [problem("fast_forward_allowed", f"git's {key} is {have[key] or 'unset'}, not {want}: a fast-forward "
                    "makes no commit, so no hook checks what it lands; run python3 tools/install-gates.py")
            for key, want in MERGE_SETTINGS if have[key] != want]


def settings_hooks(root: Path) -> dict | None:
    try:
        return json.loads((root / ".claude" / "settings.json").read_bytes().decode("utf-8")).get("hooks") or {}
    except (OSError, ValueError):
        return None


def gate_hooks(hooks: dict) -> list[tuple[str, str]]:
    """(matcher, command) for every PreToolUse hook that runs tools/gate.py."""
    return [(e.get("matcher") or "", h.get("command", "")) for e in hooks.get("PreToolUse", [])
            for h in e.get("hooks", []) if "tools/gate.py" in h.get("command", "")]


def settings_problems(root: Path) -> list[dict]:
    hooks = settings_hooks(root)
    if hooks is None:
        return [problem("settings_unreadable", ".claude/settings.json is missing or not JSON", ".claude/settings.json")]
    gate = gate_hooks(hooks)
    out = [problem("settings_tool_ungated", f"the gate's PreToolUse matcher does not cover {t}", ".claude/settings.json")
           for t in REQUIRED_TOOLS if not any(re.search(m, t) for m, _ in gate)]
    if not gate or not all(c.rstrip().endswith("|| exit 2") for _, c in gate):
        out.append(problem("settings_fails_open", "the gate's command must end in `|| exit 2`: a hook that cannot "
                           "start exits non-zero but not 2, and Claude Code runs the tool anyway", ".claude/settings.json"))
    return out


def entry_digest(root: Path, rel: str) -> str:
    if rel != SETTINGS_HOOKS:
        return file_sha256(root / rel)
    hooks = settings_hooks(root)
    return "" if hooks is None else hashlib.sha256(json.dumps(hooks, sort_keys=True).encode("utf-8")).hexdigest()


def compute_manifest(root: Path) -> dict[str, str]:
    """{file: digest} of the gate machinery as this checkout has it; the release records the template's."""
    return {rel: entry_digest(root, rel) for rel in GATE_FILES}


def recorded_manifest(root: Path) -> dict | None:
    """The template manifest this checkout carries, or None when it is missing or not JSON."""
    try:
        return json.loads((root / MANIFEST).read_bytes().decode("utf-8"))
    except (OSError, ValueError):
        return None


def drift_fix(rel: str) -> str:
    """How a drifted file is brought back: a git hook (2.6.24) or the builder profile (2.7.0) by install-gates, which
    carries them; the rest by hand."""
    if rel.startswith(".githooks/") or rel == BUILDER_PROFILE:
        return "run python3 tools/install-gates.py, which writes the template's copy"
    return "refresh it from the plugin's repo template"


def read_json(path: Path) -> dict:
    try:
        data = json.loads(path.read_bytes().decode("utf-8"))
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def desktop_plugins() -> list[str]:
    """The plugins the desktop app's store holds for a claude.ai account (its manifest.json)."""
    local = os.environ.get("LOCALAPPDATA")
    mans = Path(local, "Claude-Data").glob("*/rpm/*/*/manifest.json") if local else []
    return [p["name"] for man in mans for p in read_json(man).get("plugins") or [] if isinstance(p, dict) and "name" in p]


def synced_plugins(home: Path) -> list[str]:
    """The plugins Claude Code's synced store holds: each folder's plugin.json, and the older <name>.meta.json files."""
    named = [read_json(m).get("name") for m in home.glob("synced/*/*/.claude-plugin/plugin.json")]
    return [n for n in named if n] + [m.name[:-len(".meta.json")].split("~")[0] for m in home.glob("synced/*/*.meta.json")]


def installed_plugins() -> dict[str, str]:
    """{enabledPlugins key: plugin name} for every plugin installed on this machine, read where _metaframework/check.py
    reads them. The plugins a claude.ai account syncs, from the desktop app's store or the synced store, load as
    `<name>@synced` (measured with the desktop app's Claude Code 2.1.309); Claude Code's own as name@marketplace."""
    home = Path.home() / ".claude" / "plugins"
    found = {f"{name}@synced": name for name in desktop_plugins() + synced_plugins(home)}
    return found | {key: key.split("@")[0] for key in read_json(home / "installed_plugins.json").get("plugins") or {}}


def coordinator_settings() -> dict[str, bool]:
    """The enabledPlugins a build's sessions run with (2.7.0): every installed plugin off but the ones it uses."""
    return {key: name in KEPT_PLUGINS for key, name in sorted(installed_plugins().items())}


def profile_problems(root: Path) -> list[dict]:
    """The coordinator profile (2.7.0): every plugin installed here is listed in .claude/settings.local.json, off
    unless the build uses it. The builder profile is held to the template by the manifest."""
    have = read_json(root / COORDINATOR_PROFILE).get("enabledPlugins") or {}
    stale = sorted(k for k, on in coordinator_settings().items() if have.get(k) is not on)
    if not stale:
        return []
    return [problem("coordinator_profile_stale", f"{len(stale)} installed plugin(s) not set as a build runs them "
                    f"({', '.join(stale[:4])}{', ...' if len(stale) > 4 else ''}): run python3 tools/install-gates.py",
                    COORDINATOR_PROFILE)]


def manifest_problems(root: Path) -> list[dict]:
    recorded = recorded_manifest(root)
    if recorded is None:
        return [problem("template_manifest_missing", "no readable template manifest: this checkout's gate machinery "
                        "cannot be compared with the template it came from", MANIFEST)]
    return [problem("template_drift", f"differs from the template ({entry_digest(root, rel)[:12] or 'missing'} != "
                    f"{want[:12]}): {drift_fix(rel)}", rel.split("#")[0])
            for rel, want in recorded.items() if not rel.startswith("_") and entry_digest(root, rel) != want]


def project_hook_problems(root: Path, cfg: dict) -> list[dict]:
    listed = [str(p).replace("\\", "/") for p in (cfg.get("project_hooks") or [])]
    on_disk = sorted(p.relative_to(root).as_posix() for p in (root / "hooks").glob("*.py"))
    out = [problem("project_hook_unwired", "not listed in project.json project_hooks, so no commit runs it", p)
           for p in on_disk if p not in listed]
    return out + [problem("project_hook_missing", "listed in project.json project_hooks, absent on disk", p)
                  for p in listed if not (root / p).is_file()]


def local_settings(root: Path) -> dict:
    try:
        return json.loads((root / LOCAL).read_bytes().decode("utf-8"))
    except (OSError, ValueError):
        return {}


def code_gates_problems(root: Path, cfg: dict) -> list[dict]:
    declared, present = bool(cfg.get("code_gates")), (root / ".code-gates.json").is_file()
    if present != declared:
        return [problem("code_gates_undeclared" if present else "code_gates_missing",
                        "project.json code_gates must be true exactly when .code-gates.json exists", ".code-gates.json")]
    if not declared:
        return []
    out = [] if shutil.which("node") else [problem("node_missing", "code-gates needs node on the PATH")]
    cli = local_settings(root).get("code_gates_cli") or ""
    if not cli or not Path(cli).is_file():
        out.append(problem("code_gates_cli_missing", f"gates.cjs is not at the path recorded in {LOCAL} ({cli or 'none'}); "
                           "run python3 tools/install-gates.py --code-gates <the bundle's gates.cjs>", LOCAL))
    return out


def problems(root: Path, cfg: dict | None = None) -> list[dict]:
    """Every gap in this checkout's gate install; [] when it is complete."""
    cfg = project(root) if cfg is None else cfg
    out = settings_problems(root)
    reason = hooks_installed(root)
    if reason:
        out.append(problem("commit_hook_not_installed", reason, ".githooks/pre-commit"))
    out += merge_problems(root) + manifest_problems(root) + project_hook_problems(root, cfg)
    out += code_gates_problems(root, cfg) + profile_problems(root)
    out += [problem("tool_missing", f"{t} is not on the PATH; the hooks call it") for t in ("python3", "git")
            if not shutil.which(t)]
    if (root / PROBE).exists():
        out.append(problem("probe_left", "a gate probe was written, not refused: some session here ran ungated. "
                           "Find which, then delete the file", PROBE))
    return out


def summary(root: Path, cfg: dict | None = None) -> str:
    found = problems(root, cfg)
    if not found:
        return "GATES: installed and current (phase4-checks.py gates)"
    lines = [f"GATES: {len(found)} problem(s) — no build step, K7 round or C4 close until they are fixed:"]
    return "\n".join(lines + [f"  - {p['rule']}: {p['detail']}" for p in found[:6]])
