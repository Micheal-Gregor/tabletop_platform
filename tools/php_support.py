#!/usr/bin/env python3
"""
php_support — what the template's tools need to read PHP, in one place (G-C7, 2.6.13).

The tools were written for TypeScript, JavaScript and Python. Each dispatches a `.php` file here for:
  ambient(text)            OS-2 ambient reads in PHP (env, superglobals, clock, randomness, globals, static locals)
  os1(text)                OS-1: default arguments, variadic bags, zero-argument methods returning a literal, module
                           constants read inside a class
  signatures(text)         {class: {"__construct": [params], "<public op>": [params]}}
  imports(root, path, data, psr4, tracked)
                           the files a PHP file depends on, resolved through composer.json's PSR-4 maps (manifests.py)
  psr4(root)               composer.json's autoload and autoload-dev PSR-4 maps, longest prefix first
  namespace_for(psr4, rel) the namespace PSR-4 gives a file, or None when no prefix covers it

The scanners are the cheap pass, as for the other languages: the OS-12 isolation tests are the proof. Imports follow the
manifests.py rule: a dependency is resolved to a tracked file or recorded as unresolved, never guessed, so a missed
dependency can only cost a review, never skip one. PHP names a class without importing it when both share a
namespace, so every class-like name in the code is resolved, not only `use` statements: a name that resolves to a
tracked file is a dependency, and a name that resolves to nothing internal is a keyword, a builtin or a vendor class.

Run from the repository root: python -m unittest discover -s tools/tests
"""

import json
import posixpath
import re
from dataclasses import dataclass
from pathlib import Path

# ------------------------------------------------------------------------------------------------- lexing
# Code with comments removed and string contents blanked, so no scanner reads text as code. Line breaks are kept,
# so a position still maps to its line.
_HEREDOC = re.compile(r"<<<[ \t]*(['\"]?)([A-Za-z_]\w*)\1\r?\n.*?\r?\n[ \t]*\2\b", re.S)
_OPENER = re.compile(r"[<#/'\"]")          # the characters a heredoc, a comment or a string literal can start at


def _blank(s: str) -> str:
    return re.sub(r"[^\n]", " ", s)


def code_only(text: str, keep_strings: bool = False) -> str:
    """`text` with comments blanked and, unless keep_strings, the contents of string literals blanked.

    `#[` opens an attribute, not a comment. Offsets and line numbers are preserved."""
    out, i, n = [], 0, len(text)
    while i < n:
        piece, i = _lexeme(text, i, keep_strings)
        out.append(piece)
    return "".join(out)


def _lexeme(text: str, i: int, keep_strings: bool) -> tuple[str, int]:
    """What code_only writes for the text at `i`, and where the next piece starts."""
    for read in (_heredoc, _line_comment, _block_comment, _string):
        hit = read(text, i, keep_strings)
        if hit:
            return hit
    m = _OPENER.search(text, i + 1)
    j = m.start() if m else len(text)
    return text[i:j], j


def _heredoc(text: str, i: int, keep_strings: bool) -> tuple[str, int] | None:
    m = _HEREDOC.match(text, i) if text.startswith("<<<", i) else None
    if not m:
        return None
    return (m.group(0) if keep_strings else "''" + _blank(m.group(0))[2:]), m.end()


def _line_comment(text: str, i: int, _keep_strings: bool) -> tuple[str, int] | None:
    c = text[i]
    if not (c == "/" and text.startswith("//", i) or c == "#" and not text.startswith("#[", i)):
        return None
    j = text.find("\n", i)
    j = len(text) if j < 0 else j
    return _blank(text[i:j]), j


def _block_comment(text: str, i: int, _keep_strings: bool) -> tuple[str, int] | None:
    if not text.startswith("/*", i):
        return None
    j = text.find("*/", i + 2)
    j = len(text) if j < 0 else j + 2
    return _blank(text[i:j]), j


def _string(text: str, i: int, keep_strings: bool) -> tuple[str, int] | None:
    c, n = text[i], len(text)
    if c not in "'\"":
        return None
    j = i + 1
    while j < n and text[j] != c:
        j += 2 if text[j] == "\\" else 1
    j = min(j + 1, n)
    lit = text[i:j]
    return (lit if keep_strings else c + _blank(lit[1:-1]) + (c if len(lit) > 1 else "")), j


def _line(text: str, pos: int) -> int:
    return text.count("\n", 0, pos) + 1


def _close(text: str, start: int, open_ch: str, close_ch: str) -> int:
    """The index just past the bracket that closes the one at `start`, or len(text)."""
    depth = 0
    for k in range(start, len(text)):
        if text[k] == open_ch:
            depth += 1
        elif text[k] == close_ch:
            depth -= 1
            if depth == 0:
                return k + 1
    return len(text)


# ------------------------------------------------------------------------------------------------- OS-2
AMBIENT = [
    # (regex, rule, what to do instead): read against code with comments and strings blanked.
    (r"\bgetenv\s*\(|\$_ENV\b|\$_SERVER\b", "OS-2", "hand the value in at construction"),
    (r"\$_(GET|POST|COOKIE|REQUEST|FILES|SESSION)\b", "OS-2",
     "request globals belong to the app's edge; hand the values in"),
    (r"(?<![\w$>:\\])\\?(time|microtime|hrtime|date|gmdate|mktime|strtotime|date_create|date_create_immutable)\s*\(|"
     r"\bnew\s+\\?DateTime(Immutable)?\s*\(\s*(\)|['\"]now['\"])", "OS-2", "inject a clock provider"),
    (r"(?<![\w$>:\\])\\?(rand|mt_rand|random_int|random_bytes|uniqid|lcg_value|mt_srand|srand|shuffle|array_rand"
     r"|str_shuffle)\s*\(", "OS-2", "inject an id or randomness provider"),
    (r"\$GLOBALS\b|(?<![\w$])global\s+\$", "OS-2", "globals are module-level mutable state — make it an input"),
    (r"^\s*static\s+\$\w+", "OS-2", "a static local is hidden mutable state — make it an input"),
    (r"::getInstance\s*\(", "OS-2", "inject the instance"),
]


def ambient(text: str) -> tuple[str, int, str] | None:
    """The first OS-2 ambient read in a PHP file: (pattern, line, fix), or None."""
    code = code_only(text)
    for pat, _rule, fix in AMBIENT:
        m = re.search(pat, code, re.M)
        if m:
            return pat, _line(code, m.start()), fix
    return None


# ------------------------------------------------------------------------------------------------- classes
_CLASS = re.compile(r"(?<![\w$>:])(?:(?:final|abstract|readonly)\s+)*(class|interface|trait|enum)\s+([A-Za-z_]\w*)")
_METHOD = re.compile(r"((?:(?:public|protected|private|static|final|abstract)\s+)*)function\s+&?\s*([A-Za-z_]\w*)\s*\(")


def _classes(code: str) -> list[tuple[str, int, int]]:
    """(name, body start, body end) for each class-like declaration, anonymous classes excluded."""
    out = []
    for m in _CLASS.finditer(code):
        brace = code.find("{", m.end())
        if brace < 0:
            continue
        out.append((m.group(2), brace, _close(code, brace, "{", "}")))
    return out


def _methods(code: str, start: int, end: int) -> list[dict]:
    """The methods declared directly in a class body (closures and nested classes excluded)."""
    out, k = [], start + 1
    while True:
        m = _METHOD.search(code, k, end)
        if not m:
            return out
        if code.count("{", start + 1, m.start()) - code.count("}", start + 1, m.start()) != 0:
            k = m.end()                     # nested inside a method body: a closure or an anonymous class
            continue
        p_open = m.end() - 1
        p_close = _close(code, p_open, "(", ")")
        brace, semi = code.find("{", p_close, end), code.find(";", p_close, end)
        abstract = semi >= 0 and (brace < 0 or semi < brace)
        body_end = semi + 1 if abstract else _close(code, brace, "{", "}")
        out.append({"name": m.group(2), "modifiers": m.group(1).split(), "pos": m.start(),
                    "params": code[p_open + 1:p_close - 1], "body": "" if abstract else code[brace + 1:body_end - 1]})
        k = body_end


def _param_names(params: str) -> list[str]:
    return re.findall(r"\$([A-Za-z_]\w*)", params)


def _top_params(params: str) -> list[str]:
    """The parameter list split at its own commas (not those inside a default value's brackets)."""
    parts, depth, cur = [], 0, []
    for ch in params:
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append("".join(cur))
            cur = []
        else:
            cur.append(ch)
    if "".join(cur).strip():
        parts.append("".join(cur))
    return parts


def signatures(text: str) -> dict:
    """{class: {"__construct": [params], "<public op>": [params]}}; private and protected methods are not operations."""
    code, out = code_only(text), {}
    for name, start, end in _classes(code):
        ops = {}
        for meth in _methods(code, start, end):
            if meth["name"] != "__construct" and ("private" in meth["modifiers"] or "protected" in meth["modifiers"]):
                continue
            ops[meth["name"]] = _param_names(meth["params"])
        out[name] = ops
    return out


# ------------------------------------------------------------------------------------------------- OS-1
_LITERAL = re.compile(r"^\s*return\s+(['\"]|-?\d|\[|array\s*\(|true\b|false\b|null\b|"
                      r"new\s+\\?DateTime(Immutable)?\s*\(\s*['\"])", re.I)


def os1(text: str) -> list[tuple[str, int, str]]:
    """OS-1 findings in a PHP file: (rule, line, detail)."""
    code, out = code_only(text), []
    consts = set(re.findall(r"^\s*const\s+([A-Za-z_]\w*)\s*=", code, re.M))
    consts |= set(re.findall(r"\bdefine\s*\(\s*['\"]([A-Za-z_]\w*)['\"]", code_only(text, keep_strings=True)))
    for cname, start, end in _classes(code):
        consts -= set(re.findall(r"\bconst\s+(?:[\w\\|?]+\s+)?([A-Za-z_]\w*)\s*=", code[start:end]))
        for meth in _methods(code, start, end):
            out += _method_os1(code, f"{cname}::{meth['name']}", meth, consts)
    return out


def _method_os1(code: str, where: str, meth: dict, consts: set[str]) -> list[tuple[str, int, str]]:
    """One method's OS-1 findings: default arguments, variadics, a literal returned from nothing, constants read."""
    out, line = [], _line(code, meth["pos"])
    params = _top_params(meth["params"])
    if any(re.search(r"\$\w+\s*=(?!=|>)", p) for p in params):
        out.append(("OS-1_default_argument", line,
                    f"{where} has a default argument — a default is a sealed scenario; hand the value in"))
    if any("..." in p for p in params):
        out.append(("OS-1_bag_parameter", line,
                    f"{where} takes a variadic — collaborators arrive as declared slots, not in a bag"))
    statements = [s for s in meth["body"].split(";") if s.strip()]
    if not params and len(statements) == 1 and _LITERAL.match(statements[0]):
        out.append(("OS-1_undeclared_input", line,
                    f"{where} takes nothing and returns a literal — that is an undeclared input; "
                    f"make it a constructor parameter"))
    return out + _constant_reads(code, where, meth, consts)


def _constant_reads(code: str, where: str, meth: dict, consts: set[str]) -> list[tuple[str, int, str]]:
    out = []
    for c in sorted(consts):
        m = re.search(rf"(?<![\w$>:\\]){re.escape(c)}(?![\w(])", meth["body"])
        if m:
            out.append(("OS-1_module_constant", _line(code, code.find(meth["body"]) + m.start()),
                        f"{where} reads module constant '{c}' — an undeclared input; hand it in at "
                        f"construction"))
    return out


# ------------------------------------------------------------------------------------------------- PSR-4
def psr4(root: Path) -> list[tuple[str, str]]:
    """[(namespace prefix with trailing \\, directory with trailing /)] from composer.json, longest prefix first."""
    try:
        cfg = json.loads((root / "composer.json").read_bytes().decode("utf-8"))
    except (OSError, ValueError):
        return []
    out = _psr4_section(cfg, "autoload") + _psr4_section(cfg, "autoload-dev")
    return sorted(out, key=lambda pd: -len(pd[0]))


def _psr4_section(cfg: dict, sec: str) -> list[tuple[str, str]]:
    """The PSR-4 pairs of one composer.json section, in the order it lists them."""
    out = []
    for prefix, dirs in ((cfg.get(sec) or {}).get("psr-4") or {}).items():
        out += [_psr4_pair(prefix, d) for d in ([dirs] if isinstance(dirs, str) else dirs)]
    return out


def _psr4_pair(prefix: str, d: str) -> tuple[str, str]:
    d = posixpath.normpath(d.strip("/")) if d.strip("/") else ""
    return prefix.strip("\\") + "\\" if prefix.strip("\\") else "", d + "/" if d else ""


def namespace_for(maps: list[tuple[str, str]], rel: str) -> str | None:
    """The namespace PSR-4 gives the file at `rel`, or None when no mapping covers it."""
    for prefix, d in sorted(maps, key=lambda pd: -len(pd[1])):
        if rel.startswith(d):
            sub = posixpath.dirname(rel[len(d):])
            return (prefix + sub.replace("/", "\\")).strip("\\")
    return None


def _file_for(maps, fqcn: str) -> list[str]:
    out = []
    for prefix, d in maps:
        if prefix and fqcn.startswith(prefix):
            out.append(d + fqcn[len(prefix):].replace("\\", "/") + ".php")
        elif not prefix:
            out.append(d + fqcn.replace("\\", "/") + ".php")
    return out


def _internal(maps, fqcn: str) -> bool:
    return any(prefix and fqcn.startswith(prefix) for prefix, _ in maps)


# ------------------------------------------------------------------------------------------------- imports
_NAME = r"\\?[A-Za-z_]\w*(?:\\[A-Za-z_]\w*)*"
_REQUIRE = re.compile(r"(?<![\w$>:])(?:require|include)(?:_once)?\b\s*\(?\s*(.*?)\s*\)?\s*;", re.S)
_DECL_WORDS = r"(?:function|const|class|interface|trait|enum|namespace|goto|case|as|insteadof|fn)"
_USE = re.compile(r"(?<![\w$>:])use\s+(function\s+|const\s+)?([^;{(]+?)(\{[^}]*\})?\s*;")


@dataclass(frozen=True)
class _Scope:
    """The PHP file being read, and what its names resolve against."""
    path: str
    maps: list[tuple[str, str]]
    tracked: set[str]


def _depth(code: str, pos: int) -> int:
    return code.count("{", 0, pos) - code.count("}", 0, pos)


def _use_clauses(code: str, at: int, end: int, depth0: int) -> list[tuple[str, str, int, int]]:
    """(kind class|function|const, fqcn, alias position, end) for each import `use` at namespace level."""
    out = []
    for m in _USE.finditer(code[at:end]):
        pos = at + m.start()
        if _depth(code, pos) != depth0:
            continue                        # a trait use inside a class body: read as a name, below
        out += [_use_entry(k, item, pos) for k, item in _use_items(m)]
    return out


def _use_items(m: re.Match) -> list[tuple[str, str]]:
    """(kind, `name [as alias]`) for each name one `use` statement imports, a group use's names in full."""
    kind = (m.group(1) or "class").strip()
    head = m.group(2).strip()
    if not m.group(3):
        return [(kind, p.strip()) for p in head.split(",")]
    base, items = head.rstrip("\\"), []
    for part in m.group(3).strip("{}").split(","):
        part = part.strip()
        if part:
            k2, _, rest = part.partition(" ") if part.startswith(("function ", "const ")) else ("", "", part)
            items.append(((k2 or kind).strip(), base + "\\" + rest.strip()))
    return items


def _use_entry(k: str, item: str, pos: int) -> tuple[str, str, str, int]:
    parts = re.split(r"\s+as\s+", item, maxsplit=1)
    name = parts[0].strip().lstrip("\\")
    alias = parts[1].strip() if len(parts) > 1 else name.split("\\")[-1]
    return k, name, alias, pos


def _tracked_file(scope: _Scope, fqcn: str) -> str | None:
    """The first file PSR-4 gives a class name that git tracks, or None."""
    return next((f for f in _file_for(scope.maps, fqcn) if f in scope.tracked), None)


def _resolve(scope: _Scope, fqcn: str, explicit: bool) -> list[tuple[str, str]]:
    """The entry a class name adds to imports(): a tracked file, or for an explicit name unresolved or external."""
    if not fqcn or fqcn == scope.path:
        return []
    hit = _tracked_file(scope, fqcn)
    if hit is not None:
        return [("file", hit)] if hit != scope.path else []
    if not explicit:
        return []
    if _internal(scope.maps, fqcn) or (not scope.maps and "\\" in fqcn):
        return [("unresolved", fqcn)]       # names our namespace, or no map to tell: never guessed
    return [("external", fqcn)]


def _require(scope: _Scope, arg: str) -> tuple[str, str]:
    """require / include: a literal path, or __DIR__ . 'literal'."""
    lit = re.fullmatch(r"(?:(__DIR__|dirname\(__FILE__\))\s*\.\s*)?(['\"])([^'\"]+)\2", arg)
    if not lit:
        return "unresolved", f"(dynamic include in {scope.path}: {arg[:40]})"
    target = lit.group(3)
    rel = posixpath.normpath(posixpath.join(posixpath.dirname(scope.path), target.lstrip("/"))) if lit.group(1) \
        else posixpath.normpath(target)
    return ("file", rel) if rel in scope.tracked else ("unresolved", target)


def _namespace_blocks(code: str) -> list[tuple[str, int, int, int]]:
    """Namespaces, in order: (namespace, start, end, brace depth of its body); one global block when there is none."""
    decls = [(m.group(1) or "", m.start(), m.group(2)) for m in
             re.finditer(r"(?<![\w$>:\\])namespace\s+([A-Za-z_][\w\\]*)?\s*([;{])", code)]
    blocks = []
    for i, (ns, pos, opener) in enumerate(decls):
        if opener == "{":
            brace = code.find("{", pos)
            blocks.append((ns, brace + 1, _close(code, brace, "{", "}") - 1, 1))
        else:
            blocks.append((ns, pos, decls[i + 1][1] if i + 1 < len(decls) else len(code), 0))
    return blocks or [("", 0, len(code), 0)]


def _block_imports(scope: _Scope, code: str, block: tuple[str, int, int, int]) -> list[tuple[str, str]]:
    """One namespace block's entries: its class `use` imports, then every class-like name its code mentions."""
    ns, start, end, depth0 = block
    aliases, out = {}, []
    for kind, name, alias, _pos in _use_clauses(code, start, end, depth0):
        if kind != "class":
            continue                        # functions and constants are not autoloaded classes
        aliases[alias.lower()] = name
        out += _resolve(scope, name, explicit=True)
    for name in _class_names(_block_body(code, block)):
        out += _resolve_name(scope, ns, aliases, name)
    return out


def _block_body(code: str, block: tuple[str, int, int, int]) -> str:
    """A block's code with its namespace-level `use` statements and namespace declarations blanked."""
    _ns, start, end, depth0 = block
    body = _USE.sub(lambda m: _blank(m.group(0)) if _depth(code, start + m.start()) == depth0 else m.group(0),
                    code[start:end])
    return re.sub(r"(?<![\w$>:])namespace\s+[A-Za-z_][\w\\]*", lambda m: _blank(m.group(0)), body)


def _class_names(body: str) -> list[str]:
    """The names in `body` that can be classes: not a declaration's own name, a label, an alias or a function call."""
    out = []
    for m in re.finditer(rf"(?<![\w$>:\\])({_NAME})(?!\w)", body):
        before = body[max(0, m.start() - 12):m.start()]
        after = body[m.end():m.end() + 3]
        if re.search(rf"\b{_DECL_WORDS}\s+&?\s*$", before):
            continue                        # a declaration's own name, a label or an alias
        if after.lstrip().startswith("(") and not re.search(r"\bnew\s+$", before):
            continue                        # a function call, not a class
        out.append(m.group(1))
    return out


def _resolve_name(scope: _Scope, ns: str, aliases: dict, name: str) -> list[tuple[str, str]]:
    """A name as written: fully qualified, through a `use` alias, or relative to the block's namespace."""
    if name.startswith("\\"):
        return _resolve(scope, name[1:], explicit=True)
    first, _, rest = name.partition("\\")
    if first.lower() in aliases:
        return _resolve(scope, aliases[first.lower()] + ("\\" + rest if rest else ""), explicit=bool(rest))
    return _resolve(scope, (ns + "\\" if ns else "") + name, explicit=bool(rest))


def imports(root: Path, path: str, data: str, maps: list[tuple[str, str]], tracked: set[str]) -> list[tuple[str, str]]:
    """[('file', path) | ('external', name) | ('unresolved', name)] for one PHP file."""
    raw, code = code_only(data, keep_strings=True), code_only(data)
    scope = _Scope(path, maps, tracked)
    out = [_require(scope, m.group(1).strip()) for m in _REQUIRE.finditer(raw)]
    for block in _namespace_blocks(code):
        out += _block_imports(scope, code, block)
    return list(dict.fromkeys(out))
