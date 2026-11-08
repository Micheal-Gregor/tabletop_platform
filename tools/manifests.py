#!/usr/bin/env python3
"""
manifests — what a module's content is, and what review it has already been credited (credited review, the F1 design,
stage 1). Shared by k7-run.py (which modules a round reviews, and how) and seal.py (the full-review backstop).

A module (MOD-NN) is its object-model rows: their File cells. Its MANIFEST is canonical JSON of
  module      the MOD id
  s3          the S3 anchor tag's commit
  rows        the digest of its object-model rows (an edited row is a changed module)
  files       its files, the internal files they import that belong to no module, and the test files that import any
              of them: each {path, sha256}
  closure     every module its files import, directly or transitively: each {module, content}
  unresolved  internal imports that could not be resolved, its own and its closure's
Its files include its code hooks (2.6.21): each file S3 §7's Registered at cell names for one of the module's hooks,
when no module owns it and it is not a test. A hook is run by path, as precommit.py runs it, so a test that names a
hook file belongs to the module as one that imports it does; a hook-only change no longer leaves the module credited.
The manifest's digest is the module's fingerprint. Imports are RESOLVED to tracked files (RD-13), in TypeScript /
JavaScript, Python and PHP (through composer.json's PSR-4 maps, tools/php_support.py). A specifier that is neither resolved nor plainly external (a package, a builtin) is recorded as
unresolved, never guessed, and a module with any unresolved import is never credited: a missed dependency can only cost
a review, never skip one. Links made by injection (OS-3) are not imports; the reviewer follows them (see k7-run.py).

A round is CONCLUDED when its verdict is PASS, or a closing tag (k7-pass-*, closed-by-owner*, seal-*) sits at or after
its reviewed commit. For each module:
  credited  its current fingerprint was in scope of a concluded round, and nothing is unresolved: not reviewed again
  diff      it was in scope of a concluded round on other content: reviewed on what changed since that round's
            reviewed commit (the base: the newest such round), and the code that change depends on
  full      never concluded, or asked for (--full)
The seal's backstop: every module's final fingerprint was reviewed in FULL in a concluded round.

    python manifests.py [--root .] [--json] [manifest | scope [--modules MOD-01,..] [--full] | backstop]
Exit: 0 answered; 1 the backstop is not met; 2 a bad call.
"""

import argparse
import ast
import hashlib
import json
import posixpath
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


def php_support():
    """tools/php_support.py, loaded from beside this file: the PHP readers every tool shares (G-C7)."""
    here = str(Path(__file__).resolve().parent)
    if here not in sys.path:
        sys.path.insert(0, here)
    import php_support as module
    return module

JS_EXT = (".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs")
CODE_EXT = JS_EXT + (".py", ".php")
# `from` counts only in an import or export statement: a bare `from` before a quote also matched inside strings
# ("context-and-from" ? ...), turning text into an unresolved specifier that barred credit (Frame Gate IR-102).
JS_SPEC = re.compile(r"""(?:^[ \t]*(?:import|export)\b[^;'"]*?\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)"""
                     r"""(['"])([^'"\n]+)\1""", re.M)
NODE_BUILTINS = {"assert", "async_hooks", "buffer", "child_process", "cluster", "console", "constants", "crypto", "dgram",
                 "dns", "events", "fs", "http", "http2", "https", "inspector", "module", "net", "os", "path",
                 "perf_hooks", "process", "punycode", "querystring", "readline", "repl", "stream", "string_decoder",
                 "timers", "tls", "trace_events", "tty", "url", "util", "v8", "vm", "wasi", "worker_threads", "zlib"}
CLOSING = ("k7-pass-*", "closed-by-owner*", "seal-*")
HOOK_ID = re.compile(r"HOOK-\d+")


def git(root: Path, *a: str) -> str:
    r = subprocess.run(["git", "-C", str(root), *a], capture_output=True, encoding="utf-8", errors="replace")
    return r.stdout.strip() if r.returncode == 0 else ""


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def stored(root: Path, paths) -> dict[str, bytes]:
    """Each file's content as git stores it: its index blob, after git's clean filters.

    Hashing the bytes on disk made the same commit fingerprint differently after a checkout: under
    core.autocrlf=true, git writes CRLF into the working file and still calls the tree clean, so the
    module's receipts stopped applying. A path the index does not hold is read from disk."""
    paths = list(paths)
    if not paths:
        return {}
    out = subprocess.run(["git", "-C", str(root), "cat-file", "--batch"], capture_output=True,
                         input="".join(f":{p}\n" for p in paths).encode("utf-8")).stdout
    found, i = {}, 0
    for p in paths:
        nl = out.find(b"\n", i)
        if nl < 0:
            break
        head = out[i:nl].split()
        if head[-1:] == [b"missing"] or len(head) != 3:
            i = nl + 1
            continue
        size = int(head[2])
        found[p] = out[nl + 1:nl + 1 + size]
        i = nl + 1 + size + 1
    return {p: found[p] if p in found else (root / p).read_bytes() for p in paths}


def canonical(obj) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def cells(line: str) -> list[str]:
    """A markdown table row's cells; a pipe inside backticks does not split."""
    out, cur, tick = [], [], False
    for ch in line.strip().strip("|"):
        if ch == "`":
            tick = not tick
        if ch == "|" and not tick:
            out.append("".join(cur).strip())
            cur = []
        else:
            cur.append(ch)
    out.append("".join(cur).strip())
    return out


def table_rows(text: str):
    """The body rows of each `| Module | File |` table: its header and separator lines excluded."""
    in_table = False
    for line in text.splitlines():
        if line.startswith("| Module | File |"):
            in_table = True
            continue
        if not line.startswith("|"):
            in_table = False
            continue
        if in_table and not re.match(r"^\|\s*-", line):
            yield line


def named_files(cell: str, tracked: set[str]) -> list[str]:
    """The tracked files a table cell names, in the order it names them, once each."""
    found = re.findall(r"[\w.\-/]+\.[A-Za-z]+", cell.replace("`", " "))
    return list(dict.fromkeys(p for p in found if p in tracked))


def add_row(mods: dict[str, dict], line: str, tracked: set[str]) -> None:
    """One object-model row into its module's entry: the row's text, and the tracked files its File cell names."""
    c = cells(line)
    m = re.match(r"\s*(MOD-\d+)", c[0]) if c else None
    if not m or len(c) < 2:
        return
    entry = mods.setdefault(m.group(1), {"files": [], "rows": []})
    entry["rows"].append(" ".join(line.split()))
    entry["files"] += [p for p in named_files(c[1], tracked) if p not in entry["files"]]


def object_model(root: Path, tracked: set[str]) -> dict[str, dict]:
    """{MOD-id: {"files": [...], "rows": [row text, ...]}} from INSTRUMENTS/object-model-and-parameters.md."""
    om = root / "INSTRUMENTS" / "object-model-and-parameters.md"
    mods: dict[str, dict] = {}
    if not om.is_file():
        return mods
    for line in table_rows(om.read_bytes().decode("utf-8")):
        add_row(mods, line, tracked)
    return mods


def is_test(path: str) -> bool:
    return path.startswith("tests/") and path.endswith(CODE_EXT)


def s3_text(root: Path, cfg: dict) -> str:
    """The S3 project.json declares; '' when it declares none or the file cannot be read."""
    rel = cfg.get("s3_document") or ""
    try:
        return (root / rel).read_bytes().decode("utf-8", "replace") if rel else ""
    except OSError:
        return ""


def hook_rows(text: str):
    """The cells of each row of S3 §7, the hook manifest: | HOOK-nn | MOD-nn | ... | Registered at |. The section is
    found by its number, as brief.py and phase4-checks.py find theirs; an S3 without one has no rows."""
    in_s7 = False
    for line in text.splitlines():
        if line.startswith("## "):
            in_s7 = re.match(r"^##\s+7[.\s]", line) is not None
        elif in_s7 and line.startswith("|"):
            c = cells(line)
            if len(c) >= 3 and HOOK_ID.fullmatch(c[0].strip("` ")):
                yield c


def hook_files(root: Path, cfg: dict, mods: dict[str, dict], tracked: set[str]) -> dict[str, list[str]]:
    """{MOD: its hook files} (2.6.21): the tracked files the Registered at cell (a §7 row's last) names for the
    module's hooks, less those a module owns (its fingerprint covers them) and tests (they join by the test rules)."""
    owned = {f for e in mods.values() for f in e["files"]}
    hooks: dict[str, list[str]] = {}
    for c in hook_rows(s3_text(root, cfg)):
        files = [f for f in named_files(c[-1], tracked) if f not in owned and not is_test(f)]
        if files:
            add_hooks(hooks, c[1], files)
    return hooks


def add_hooks(hooks: dict[str, list[str]], mod_cell: str, files: list[str]) -> None:
    """One §7 row's hook files onto each module its MOD cell names."""
    for m in re.findall(r"MOD-\d+", mod_cell):
        known = hooks.setdefault(m, [])
        known += [f for f in files if f not in known]


def node_packages(root: Path) -> set[str]:
    """The packages package.json declares, in any of its dependency sections."""
    pkg = {}
    try:
        pkg = json.loads((root / "package.json").read_bytes().decode("utf-8"))
    except (OSError, ValueError):
        pass
    return {k for sec in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies")
            for k in (pkg.get(sec) or {})}


def python_roots(cfg: dict) -> list[str]:
    """Where an absolute Python import is looked for: the repo root, python_roots, source_glob's root, tests."""
    roots = [""] + [r.strip("/") for r in (cfg.get("python_roots") or []) if r]
    glob = (cfg.get("source_glob") or "").split("*")[0].strip("/")
    if glob and glob not in roots:
        roots.append(glob)
    if "tests" not in roots:
        roots.append("tests")
    return roots


def js_candidates(frm: str, spec: str) -> list[str]:
    """The paths a relative specifier can name: as written, with each extension, the .ts a .js names, an index."""
    base = posixpath.normpath(posixpath.join(posixpath.dirname(frm), spec))
    stem, ext = posixpath.splitext(base)
    cands = [base] + [base + e for e in JS_EXT + (".json",)]
    if ext in (".js", ".jsx", ".mjs", ".cjs"):
        cands += [stem + e for e in (".ts", ".tsx", ".mts", ".cts")]
    return cands + [posixpath.join(base, "index" + e) for e in JS_EXT]


class Resolver:
    """Resolves import specifiers to tracked files: ('file', path), ('external', spec) or ('unresolved', spec)."""

    def __init__(self, root: Path, tracked: set[str], cfg: dict):
        self.root, self.tracked = root, tracked
        self.packages = node_packages(root)
        self.py_roots = python_roots(cfg)
        self.php_maps = None                  # composer.json's PSR-4 maps, read on the first PHP file

    def _first(self, cands: list[str]):
        for c in cands:
            c = posixpath.normpath(c)
            if c in self.tracked:
                return c
        return None

    def _module_file(self, stem: str):
        """The tracked file a Python module path names: stem.py, or the package's stem/__init__.py."""
        return self._first([stem + ".py", posixpath.join(stem, "__init__.py")])

    def js(self, frm: str, spec: str):
        if spec.startswith("node:") or spec.split("/")[0] in NODE_BUILTINS:
            return ("external", spec)
        if spec.startswith("."):
            hit = self._first(js_candidates(frm, spec))
            return ("file", hit) if hit else ("unresolved", spec)
        name = "/".join(spec.split("/")[:2]) if spec.startswith("@") else spec.split("/")[0]
        if name in self.packages or (self.root / "node_modules" / name).is_dir():
            return ("external", spec)
        return ("unresolved", spec)

    def py(self, frm: str, module: str | None, level: int, names: list[str]) -> list[tuple[str, str]]:
        if level:
            return self._relative(frm, module, level, names)
        return self._absolute(module, names)

    def _relative(self, frm: str, module: str | None, level: int, names: list[str]) -> list[tuple[str, str]]:
        """`from .x import y`: x and each name in it, under the package `level` dots up from frm."""
        base = posixpath.dirname(frm)
        for _ in range(level - 1):
            base = posixpath.dirname(base)
        parts = module.split(".") if module else []
        targets = [posixpath.join(base, *parts)] if parts else []
        targets += [posixpath.join(base, *parts, n) for n in names]
        found = [h for t in targets if (h := self._module_file(t))]
        return [("file", f) for f in found] or [("unresolved", "." * level + (module or ""))]

    def _absolute(self, module: str, names: list[str]) -> list[tuple[str, str]]:
        """`import x` or `from x import y`: x under the first Python root that holds it, and each name in it."""
        top = module.split(".")[0]
        if top in sys.stdlib_module_names:
            return [("external", module)]
        for r in self.py_roots:
            stem = posixpath.join(r, *module.split(".")) if r else posixpath.join(*module.split("."))
            hit = self._module_file(stem)
            if hit:
                inner = [s for n in names if (s := self._module_file(posixpath.join(stem, n)))]
                return [("file", hit)] + [("file", s) for s in inner]
        # not in the repo and not the standard library: a third-party package, or something unseen
        return [("external", module)] if self._installed(top) else [("unresolved", module)]

    def _installed(self, top: str) -> bool:
        import importlib.util
        try:
            spec = importlib.util.find_spec(top)
        except (ImportError, ValueError):
            return False
        origin = getattr(spec, "origin", None) if spec else None
        return bool(spec) and not (origin and Path(origin).resolve().is_relative_to(self.root.resolve()))

    def imports(self, path: str) -> list[tuple[str, str]]:
        data = (self.root / path).read_bytes().decode("utf-8", "replace")
        if path.endswith(".php"):
            return self._php_imports(path, data)
        if path.endswith(".py"):
            return self._py_imports(path, data)
        return [self.js(path, m.group(2)) for m in JS_SPEC.finditer(data)]

    def _php_imports(self, path: str, data: str) -> list[tuple[str, str]]:
        php = php_support()
        if self.php_maps is None:
            self.php_maps = php.psr4(self.root)
        return php.imports(self.root, path, data, self.php_maps, self.tracked)

    def _py_imports(self, path: str, data: str) -> list[tuple[str, str]]:
        try:
            tree = ast.parse(data)
        except SyntaxError:
            return [("unresolved", f"(unparseable {path})")]
        out = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for a in node.names:
                    out += self.py(path, a.name, 0, [])
            elif isinstance(node, ast.ImportFrom):
                out += self.py(path, node.module, node.level, [a.name for a in node.names if a.name != "*"])
        return out


@dataclass(frozen=True)
class Graph:
    """What build resolved: the object model's modules, and for each its files, the modules those import, and the
    imports that could not be resolved; with every listed file's content as git stores it."""
    mods: dict[str, dict]
    files_of: dict[str, set[str]]
    deps: dict[str, set[str]]
    unresolved: dict[str, set[str]]
    data: dict[str, bytes]


def import_reader(res: Resolver):
    """f -> f's resolved imports, each file read once; a file that is not code imports nothing."""
    edges: dict[str, list[tuple[str, str]]] = {}

    def imports(f):
        if f not in edges:
            edges[f] = res.imports(f) if f.endswith(CODE_EXT) else []
        return edges[f]

    return imports


def anchor_commit(root: Path) -> str:
    """The S3 anchor tag's commit: the last s3-anchor-* tag by name; "" when there is none."""
    anchor = sorted(git(root, "tag", "-l", "s3-anchor-*").splitlines())
    return git(root, "rev-list", "-n", "1", anchor[-1]) if anchor else ""


def reach(m: str, own: list[str], owner: dict[str, str], imports) -> tuple[set[str], set[str], set[str]]:
    """Module m's files (its own, and loose internal files they reach that belong to no module), the modules those
    import, and the imports that could not be resolved."""
    files, seen, todo, dep, unres = set(own), set(), list(own), set(), set()
    while todo:
        f = todo.pop()
        if f in seen:
            continue
        seen.add(f)
        for kind, x in imports(f):
            if kind == "unresolved":
                unres.add(f"{f}: {x}")
            elif kind == "file" and owner.get(x, m) != m:
                dep.add(owner[x])
            elif kind == "file" and x not in files:
                files.add(x)
                todo.append(x)
    return files, dep, unres


def reach_all(mods: dict[str, dict], imports, hooks: dict[str, list[str]]) -> tuple[dict, dict, dict]:
    """Each module's reach, from its files and its hook files: {MOD: files}, {MOD: modules imported}, {MOD: unresolved
    imports}."""
    owner = {f: m for m, e in mods.items() for f in e["files"]}
    files_of, deps, unresolved = {}, {}, {}
    for m, e in mods.items():
        files_of[m], deps[m], unresolved[m] = reach(m, e["files"] + hooks.get(m, []), owner, imports)
    return files_of, deps, unresolved


def join_module(t: str, x: str, files_of: dict[str, set[str]]) -> bool:
    """Test t joins every module that x belongs to; True when it joined one it was not already in."""
    joined = False
    for files in files_of.values():
        if x in files and t not in files:
            files.add(t)
            joined = True
    return joined


def names_file(text: str, path: str) -> bool:
    """Whether `text` names the file at `path` by its file name (a path built in parts names it so too)."""
    return re.search(rf"(?<![\w.\-]){re.escape(posixpath.basename(path))}\b", text) is not None


def join_hook_tests(root: Path, tests: list[str], hooks: dict[str, list[str]], files_of: dict[str, set[str]]) -> None:
    """A test that names one of a module's hook files joins the module (2.6.21): its tests run a hook by path, as
    precommit.py does, more often than they import it. One that imports it joins through join_tests."""
    if not hooks:
        return
    for t in tests:
        text = (root / t).read_bytes().decode("utf-8", "replace")
        for m, files in hooks.items():
            if m in files_of and any(names_file(text, h) for h in files):
                files_of[m].add(t)


def join_tests(tests: list[str], files_of: dict[str, set[str]], imports) -> bool:
    """One pass of the tests over the modules' files; True when any test joined a module."""
    joined = False
    for t in tests:
        for kind, x in imports(t):
            if kind == "file":
                joined = join_module(t, x, files_of) or joined
    return joined


def charge_tests(tests: list[str], files_of: dict[str, set[str]], unresolved: dict[str, set[str]], imports) -> None:
    """A test's unresolved imports count against every module it belongs to."""
    for t in tests:
        missing = [x for kind, x in imports(t) if kind == "unresolved"]
        for m, files in files_of.items():
            if t in files:
                unresolved[m].update(f"{t}: {x}" for x in missing)


def closure_of(m: str, deps: dict[str, set[str]]) -> set[str]:
    """Every module m imports, directly or transitively."""
    closure, todo = set(), list(deps[m])
    while todo:
        d = todo.pop()
        if d not in closure and d != m:
            closure.add(d)
            todo += list(deps[d])
    return closure


def rows_digest(rows: list[str]) -> str:
    return sha("\n".join(rows).encode("utf-8"))


def listing(files: set[str], data: dict[str, bytes]) -> list[dict]:
    return [{"path": f, "sha256": sha(data[f])} for f in sorted(files)]


def fingerprint(m: str, s3: str, g: Graph, content: dict[str, str]) -> dict:
    """Module m's manifest, its digest, the modules it imports and the modules that import it."""
    closure = closure_of(m, g.deps)
    unres = set(g.unresolved[m]) | {f"{d} · {u}" for d in closure for u in g.unresolved[d]}
    manifest = {"module": m, "s3": s3, "rows": rows_digest(g.mods[m]["rows"]),
                "files": listing(g.files_of[m], g.data),
                "closure": [{"module": d, "content": content[d]} for d in sorted(closure)],
                "unresolved": sorted(unres)}
    return {"manifest": manifest, "digest": sha(canonical(manifest)), "deps": sorted(g.deps[m]),
            "importers": sorted(x for x in g.mods if m in g.deps[x])}


def build(root: Path, cfg: dict) -> dict[str, dict]:
    """Every module's manifest and fingerprint: {MOD: {"manifest", "digest", "deps", "importers"}}."""
    tracked = set(git(root, "ls-files").splitlines())
    mods = object_model(root, tracked)
    hooks = hook_files(root, cfg, mods, tracked)
    imports = import_reader(Resolver(root, tracked, cfg))
    s3 = anchor_commit(root)
    files_of, deps, unresolved = reach_all(mods, imports, hooks)
    # A test belongs to every module whose files it imports, through test support files too. One pass over an
    # unordered set let the hash seed decide whether a test met its support file before or after that file joined,
    # so the same content had different fingerprints in different processes (Frame Gate IR-101). Sorted, and repeated
    # until nothing new joins.
    tests = sorted(f for f in tracked if is_test(f))
    join_hook_tests(root, tests, hooks, files_of)
    while join_tests(tests, files_of, imports):
        pass
    charge_tests(tests, files_of, unresolved, imports)
    g = Graph(mods, files_of, deps, unresolved, stored(root, sorted({f for m in mods for f in files_of[m]})))
    content = {m: sha(canonical({"files": listing(files_of[m], g.data), "rows": rows_digest(mods[m]["rows"])}))
               for m in mods}
    return {m: fingerprint(m, s3, g, content) for m in mods}


def closing_commits(root: Path) -> list[str]:
    """The commits the closing tags (k7-pass-*, closed-by-owner*, seal-*) sit on."""
    return [c for p in CLOSING for t in git(root, "tag", "-l", p).splitlines()
            if (c := git(root, "rev-list", "-n", "1", t))]


def verdict_rounds(inst: Path) -> list[tuple[int, dict]]:
    """Each readable k7-verdict-<n>.json as (n, verdict), in round order."""
    rounds = []
    for p in inst.glob("k7-verdict-*.json"):
        m = re.search(r"k7-verdict-(\d+)\.json$", p.name)
        if m:
            try:
                rounds.append((int(m.group(1)), json.loads(p.read_bytes().decode("utf-8"))))
            except (OSError, ValueError):
                continue
    return sorted(rounds, key=lambda r: r[0])


def round_concluded(root: Path, v: dict, commit: str, closing: list[str]) -> bool:
    """The verdict is PASS, or a closing tag sits at or after the reviewed commit; never without a reviewed commit."""
    if not commit:
        return False
    return v.get("verdict") == "PASS" or any(
        subprocess.run(["git", "-C", str(root), "merge-base", "--is-ancestor", commit, c],
                       capture_output=True).returncode == 0 for c in closing)


def credit_scope(n: int, s: dict, commit: str, h: dict) -> None:
    """One scope entry of concluded round n: the fingerprint it credits (and if in full), and its module's base. A
    checkpoint's entry (RD-32) reviewed correctness only: it credits nothing and is no base."""
    mod = s.get("module")
    if s.get("mode") == "checkpoint":
        return
    if s.get("manifest"):
        h["credited"].setdefault(mod, {})[s["manifest"]] = n
        if s.get("mode") == "full":
            h["full"].setdefault(mod, {})[s["manifest"]] = n
    if s.get("mode") in ("full", "diff") and commit:
        h["base"][mod] = (commit, n)


def credit_round(n: int, rv: dict, commit: str, h: dict) -> None:
    """Concluded round n's reviewed scope into the history h."""
    scope = rv.get("scope")
    if scope is None:            # a verdict written before credited review: its modules list, no fingerprints
        scope = [{"module": m, "mode": "full"} for m in rv.get("modules", [])]
    for s in scope:
        credit_scope(n, s, commit, h)
    if "(all)" in rv.get("modules", []) and rv.get("scope") is None and commit:
        h["base"]["(all)"] = (commit, n)


def history(root: Path, inst: Path) -> dict:
    """From the verdict files: for each module, the fingerprints concluded rounds credited (and which were full), and
    the base: the reviewed commit of the newest concluded round that had the module in scope."""
    closing = closing_commits(root)
    h: dict[str, dict] = {"credited": {}, "full": {}, "base": {}}
    for n, v in verdict_rounds(inst):
        rv = v.get("reviewed") or {}
        commit = rv.get("commit_sha", "")
        if round_concluded(root, v, commit, closing):
            credit_round(n, rv, commit, h)
    return h


def receipted(cfg: dict) -> bool:
    """RD-28: credit is read from PipelineGate receipts when the repo declares its store."""
    return bool(cfg.get("pipelinegate_command"))


def scope_entry(m: str, b: dict, h: dict, credit: str | None, force_full: bool) -> dict:
    """Module m's line in a round's scope: credited when a credit is given, else diff on its base, else full."""
    digest = b["digest"]
    entry = {"module": m, "manifest": digest, "base": None, "base_round": None, "credit_round": None,
             "unresolved": b["manifest"]["unresolved"], "deps": b["deps"], "importers": b["importers"],
             "files": [f["path"] for f in b["manifest"]["files"]], "credit": None}
    base = h["base"].get(m) or h["base"].get("(all)")
    if credit:
        entry |= {"mode": "credited", "credit_round": h["credited"].get(m, {}).get(digest), "credit": credit}
    elif not force_full and base:
        entry |= {"mode": "diff", "base": base[0], "base_round": base[1]}
    else:
        entry["mode"] = "full"
    return entry


def scope(root: Path, cfg: dict, inst: Path, modules: list[str], force_full: bool = False) -> list[dict]:
    built, h = build(root, cfg), history(root, inst)
    if receipted(cfg):
        import receipts                                  # lazily: receipts imports this module
    out = []
    for m in modules:
        b = built[m]
        unres = b["manifest"]["unresolved"]
        if receipted(cfg):     # the receipts decide credit; the verdict files only give the base
            credited = not unres and receipts.concluded(root, cfg, receipts.h_of(b["manifest"]))
        else:
            credited = b["digest"] in h["credited"].get(m, {}) and not unres
        credit = None if force_full or not credited else ("receipt" if receipted(cfg) else "verdict")
        out.append(scope_entry(m, b, h, credit, force_full))
    return out


def is_ancestor(root: Path, a: str, b: str) -> bool:
    return subprocess.run(["git", "-C", str(root), "merge-base", "--is-ancestor", a, b],
                          capture_output=True).returncode == 0


def reviewed_commit(v: dict) -> str:
    return (v.get("reviewed") or {}).get("commit_sha", "")


def round_kind(v: dict) -> str:
    """A verdict's kind (RD-32): checkpoint, final, or round for any other."""
    return (v.get("reviewed") or {}).get("kind") or "round"


def rounds_toward_seal(root: Path, inst: Path) -> list[tuple[int, dict]]:
    """The K7 rounds toward the next seal: each one whose reviewed commit is not at or before the latest seal-* tag
    (2.8.0). An extension build's rounds start again after its library's seal."""
    seals = git(root, "tag", "-l", "seal-*", "--sort=-v:refname").splitlines()
    sealed = git(root, "rev-list", "-n", "1", seals[0]) if seals else ""
    return [(n, v) for n, v in verdict_rounds(inst)
            if not sealed or (reviewed_commit(v) and not is_ancestor(root, reviewed_commit(v), sealed))]


def backstop(root: Path, cfg: dict, inst: Path, approved: dict | None = None) -> list[str]:
    """Modules whose final fingerprint has not been reviewed in full in a concluded round. `approved` ({module: the
    fingerprint reviewed in full}) is what the owner's approval at the seal closes (2.8.0): the final review's content,
    so it counts as concluded without a closing tag."""
    built, h = build(root, cfg), history(root, inst)
    if receipted(cfg):
        import receipts
    gaps = []
    for m, b in sorted(built.items()):
        if (approved or {}).get(m) == b["digest"]:
            continue
        if receipted(cfg):     # RD-28: only a receipt at full-review counts; the verdict file's mode is not evidence
            if not receipts.fully_reviewed(root, cfg, receipts.h_of(b["manifest"])):
                gaps.append(f"{m}: its final content has no ACCEPT receipt at full-review")
            continue
        full = b["digest"] in h["full"].get(m, {})
        if not full:
            last = max(h["credited"].get(m, {}).values(), default=None)
            gaps.append(f"{m}: its final content has had no full review" +
                        (f" (last concluded review: round {last})" if last else " (no concluded review records its content)"))
    return gaps


def answer(a: argparse.Namespace, root: Path, cfg: dict):
    """The command's answer: every module's manifest, a round's scope, or the backstop's gaps."""
    inst = root / "INSTRUMENTS"
    if a.command == "manifest":
        return build(root, cfg)
    if a.command == "scope":
        mods = [m for m in a.modules.split(",") if m] or sorted(build(root, cfg))
        return scope(root, cfg, inst, mods, a.full)
    return backstop(root, cfg, inst)


def show_manifest(res: dict) -> None:
    for m, b in sorted(res.items()):
        print(f"{m}  {b['digest'][:12]}  files {len(b['manifest']['files'])}  deps {','.join(b['deps']) or '-'}"
              + (f"  UNRESOLVED {len(b['manifest']['unresolved'])}" if b["manifest"]["unresolved"] else ""))


def show_scope(res: list) -> None:
    for e in res:
        print(f"{e['module']}  {e['mode']:9}" + (f"  base {e['base'][:7]} (round {e['base_round']})" if e["base"] else "")
              + (f"  credited by round {e['credit_round']}" if e["credit_round"] else "")
              + (f"  unresolved {len(e['unresolved'])}" if e["unresolved"] else ""))


def show_backstop(res: list) -> None:
    print("\n".join(res) or "backstop met: every module's final content has had a full review")


SHOW = {"manifest": show_manifest, "scope": show_scope, "backstop": show_backstop}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.strip().split("\n\n")[0])
    ap.add_argument("--root", default=".")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("command", nargs="?", default="manifest", choices=["manifest", "scope", "backstop"])
    ap.add_argument("--modules", default="")
    ap.add_argument("--full", action="store_true")
    a = ap.parse_args()
    root = Path(a.root).resolve()
    try:
        cfg = json.loads((root / ".metaframework" / "project.json").read_bytes().decode("utf-8"))
    except (OSError, ValueError):
        cfg = {}
    res = answer(a, root, cfg)
    if a.json:
        sys.stdout.buffer.write((json.dumps(res, indent=2) + "\n").encode("utf-8"))
    else:
        SHOW[a.command](res)
    return 1 if a.command == "backstop" and res else 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")      # every tool writes UTF-8 (2.8.0)
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
