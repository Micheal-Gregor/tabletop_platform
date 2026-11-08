"""
source_scan — the source readers gate.py, phase4-checks.py, seal.py and k7-run.py share (2.6.19).

Until 2.6.19 each tool carried its own copy, and code-gates' copy-paste gate (G8) found the copies. One module now
holds glob_to_regex, the OS-1 detector and the signature reader; the tools import them from beside themselves.

OS-1: a name in a method body is legal only if it is a parameter of that method, a field assigned from a
constructor parameter, or a local computed from those. Python is parsed; JS/TS is scanned. The scanner is the cheap
pass; the OS-12 isolation tests are the proof.
"""

import ast
import io
import re
import sys
import tokenize
from pathlib import Path


def php_support():
    """tools/php_support.py, loaded from beside this file: the PHP readers every tool shares (G-C7)."""
    here = str(Path(__file__).resolve().parent)
    if here not in sys.path:
        sys.path.insert(0, here)
    import php_support as module
    return module


def glob_to_regex(pattern: str) -> re.Pattern:
    """Correct ** semantics. Neither fnmatch nor git pathspec provides them:
    'src/**/*.ts' fails to match 'src/orphan.ts' under both."""
    out, i, n = [], 0, len(pattern)
    while i < n:
        if pattern.startswith("**/", i):
            out.append("(?:.*/)?"); i += 3
        elif pattern.startswith("**", i):
            out.append(".*"); i += 2
        elif pattern[i] == "*":
            out.append("[^/]*"); i += 1
        elif pattern[i] == "?":
            out.append("[^/]"); i += 1
        else:
            out.append(re.escape(pattern[i])); i += 1
    return re.compile("^" + "".join(out) + "$")


LITERAL_CALLS = {"date", "datetime", "Decimal", "timedelta", "UUID"}
JS_SUFFIXES = (".js", ".mjs", ".ts", ".jsx", ".tsx")


def _py_params(fn) -> list[str]:
    """A function's parameter names in order, `self` left out."""
    a = fn.args
    return [p.arg for p in a.posonlyargs + a.args + a.kwonlyargs if p.arg != "self"]


def _py_module_names(tree) -> tuple[set, set]:
    """(the names a module assigns at its top level, the names it imports)."""
    module_consts, imported = set(), set()
    for node in tree.body:
        if isinstance(node, ast.Assign):
            module_consts.update(t.id for t in node.targets if isinstance(t, ast.Name))
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            imported.update((al.asname or al.name).split(".")[0] for al in node.names)
    return module_consts, imported


def _literal_only(n) -> bool:
    if isinstance(n, ast.Constant):
        return True
    if isinstance(n, (ast.List, ast.Tuple, ast.Set)):
        return all(_literal_only(e) for e in n.elts)
    if isinstance(n, ast.Dict):
        return all(_literal_only(e) for e in list(n.keys) + list(n.values))
    if isinstance(n, ast.Call):
        f = n.func
        name = f.attr if isinstance(f, ast.Attribute) else getattr(f, "id", "")
        return name in LITERAL_CALLS and all(_literal_only(a) for a in n.args)
    return False


def _py_slot_findings(cls) -> list[tuple[str, int, str]]:
    """Default arguments and *args/**kwargs on the methods a class body declares."""
    out = []
    for fn in [n for n in cls.body if isinstance(n, ast.FunctionDef)]:
        args = fn.args
        if args.defaults or args.kw_defaults and any(args.kw_defaults):
            out.append(("OS-1_default_argument", fn.lineno,
                        f"{cls.name}.{fn.name} has a default argument — a default is a "
                        f"sealed scenario; hand the value in"))
        if args.vararg or args.kwarg:
            out.append(("OS-1_bag_parameter", fn.lineno,
                        f"{cls.name}.{fn.name} receives *args/**kwargs — collaborators "
                        f"arrive as declared slots, not in a bag"))
    return out


def _py_returns_literal(fn, params: set) -> bool:
    """True when a function takes nothing and its one statement (docstrings aside) returns a literal."""
    body = [s for s in fn.body if not isinstance(s, ast.Expr)
            or not isinstance(s.value, ast.Constant)]
    return not params and len(body) == 1 and isinstance(body[0], ast.Return) \
        and body[0].value is not None and _literal_only(body[0].value)


def _py_locals(fn) -> set:
    """The names a function assigns, or binds as a for-loop or comprehension target."""
    locals_ = set()
    for sub in ast.walk(fn):
        if isinstance(sub, ast.Assign):
            locals_.update(t.id for t in sub.targets if isinstance(t, ast.Name))
        elif isinstance(sub, (ast.For, ast.comprehension)):
            tgt = getattr(sub, "target", None)
            if isinstance(tgt, ast.Name):
                locals_.add(tgt.id)
    return locals_


def _py_method_findings(cls, fn, module_consts: set, imported: set) -> list[tuple[str, int, str]]:
    """A literal returned from nothing, and the module constants read, in one function of a class."""
    out, params = [], set(_py_params(fn))
    if _py_returns_literal(fn, params):
        out.append(("OS-1_undeclared_input", fn.lineno,
                    f"{cls.name}.{fn.name} takes nothing and returns a literal — that "
                    f"is an undeclared input; make it a constructor parameter"))
    if fn.name == "__init__":
        return out
    allowed = params | _py_locals(fn) | imported
    for sub in ast.walk(fn):
        if isinstance(sub, ast.Name) and isinstance(sub.ctx, ast.Load) \
                and sub.id in module_consts and sub.id not in allowed:
            out.append(("OS-1_module_constant", sub.lineno,
                        f"{cls.name}.{fn.name} reads module constant '{sub.id}' — "
                        f"an undeclared input; hand it in at construction"))
    return out


def _py_os1(text: str) -> list[tuple[str, int, str]]:
    try:
        tree = ast.parse(text)
    except SyntaxError:
        return []
    out = []
    module_consts, imported = _py_module_names(tree)
    for cls in [n for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]:
        out += _py_slot_findings(cls)
        for fn in [n for n in ast.walk(cls) if isinstance(n, ast.FunctionDef)]:
            out += _py_method_findings(cls, fn, module_consts, imported)
    return out


def _js_class_lines(lines: list[str]) -> list[bool]:
    """For each line, whether the scan reads it as inside a class: a class line opens one, its last brace ends it."""
    flags, in_class, depth = [], False, 0
    for i, ln in enumerate(lines, 1):
        if re.search(r"\bclass\s+[A-Za-z_$][\w$]*", ln):
            in_class, depth = True, 0
        if in_class:
            depth += ln.count("{") - ln.count("}")
            in_class = not (depth <= 0 and "}" in ln and i > 1)
        flags.append(in_class)
    return flags


# A method head on one line (2.6.24): its modifiers, its name, its parameters, a return type if it has one (`): T {`),
# the brace. A control line (`if (named !== null) {`) has the same shape and is not a method (FirmOS,
# dac-firm-wall.ts:77); before 2.6.24 it was read as one, and the second `=` of `!==` as a default argument.
JS_METHOD_HEAD = re.compile(r"^\s*(?:(?:public|private|protected|static|override|readonly|async|get|set)\s+)*"
                            r"([A-Za-z_$#][\w$]*)\s*\(([^)]*)\)\s*(:[^{;]*)?\{")
JS_CONTROL = frozenset({"if", "for", "while", "switch", "catch", "with", "return", "function"})
JS_DEFAULT = re.compile(r"(?<![=!<>])=(?![=>])")       # a lone `=`: not ==, ===, !==, <=, >= or =>


def _js_method_findings(i: int, ln: str, lines: list[str]) -> list[tuple[str, int, str]]:
    """Default arguments, bags and a literal returned from nothing, on a class line shaped as a method head."""
    m = JS_METHOD_HEAD.search(ln)
    if not m or m.group(1) in JS_CONTROL:
        return []
    out, params = [], m.group(2)
    if JS_DEFAULT.search(params):
        out.append(("OS-1_default_argument", i,
                    "default argument — a default is a sealed scenario; hand it in"))
    if "..." in params or "arguments" in params:
        out.append(("OS-1_bag_parameter", i,
                    "rest/options bag — collaborators arrive as declared slots"))
    # The literal-return test reads three lines by pattern, not the value returned, so it stays on the untyped heads it
    # read before 2.6.24: on a typed head it would take an object built from fields for a literal (FirmOS, 4 of 5).
    if not params.strip() and not m.group(3) and not ln.strip().startswith("constructor") \
            and re.search(r"\breturn\s+(['\"`]|\d|\{|\[|new Date\()", "\n".join(lines[i - 1:i + 2])):
        out.append(("OS-1_undeclared_input", i,
                    "takes nothing and returns a literal — that is an undeclared "
                    "input; make it a constructor parameter"))
    return out


def _js_constant_read(i: int, ln: str, consts: list) -> list[tuple[str, int, str]]:
    """The first module constant, in source order, a class line reads, if any."""
    for c in consts:
        if re.search(rf"(?<![\w$.]){re.escape(c)}(?![\w$])", ln) and "=" not in ln.split(c)[0][-2:]:
            return [("OS-1_module_constant", i, f"reads module constant '{c}' — an undeclared input")]
    return []


def _js_os1(text: str) -> list[tuple[str, int, str]]:
    out, lines = [], text.splitlines()
    # In source order, so the constant a finding names does not follow the hash seed (2.6.21).
    consts = list(dict.fromkeys(re.findall(r"^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*"
                                           r"(?:['\"`\d\[{]|new Date\()", text, re.M)))
    for i, (ln, in_class) in enumerate(zip(lines, _js_class_lines(lines)), 1):
        if in_class:
            out += _js_method_findings(i, ln, lines) + _js_constant_read(i, ln, consts)
    return out


def os1_findings(rel: str, text: str) -> list[tuple[str, int, str]]:
    if rel.endswith(".php"):
        return php_support().os1(text)
    if rel.endswith(".py"):
        return _py_os1(text)
    if rel.endswith(JS_SUFFIXES):
        return _js_os1(text)
    return []


# A JS/TS string literal, kept as it is, or a comment, blanked: read in one pass so a `//` inside a string is not a
# comment. `#` is a private name in JS, never a comment.
JS_LEXEME = re.compile(r"\"(?:\\.|[^\"\\\n])*\"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`|//[^\n]*|/\*[\s\S]*?(?:\*/|\Z)")
PY_NOT_A_WORD = {tokenize.NL, tokenize.COMMENT, tokenize.INDENT, tokenize.DEDENT}


def _blanked(m: re.Match) -> str:
    """A matched comment as spaces, its line breaks kept; a matched string literal as it is."""
    s = m.group(0)
    return re.sub(r"[^\n]", " ", s) if s.startswith("/") else s


def _py_prose(text: str) -> list:
    """The tokens of a Python file that are not code: each comment, and each statement made of string literals only
    (a docstring, wherever it stands). [] when the file does not tokenize."""
    out, words = [], []
    try:
        for tok in tokenize.generate_tokens(io.StringIO(text).readline):
            if tok.type == tokenize.COMMENT:
                out.append(tok)
            elif tok.type in (tokenize.NEWLINE, tokenize.ENDMARKER):
                out += words if words and all(t.type == tokenize.STRING for t in words) else []
                words = []
            elif tok.type not in PY_NOT_A_WORD:
                words.append(tok)
    except (tokenize.TokenError, SyntaxError):
        return []
    return out


def _blank_span(lines: list[str], start: tuple[int, int], end: tuple[int, int]) -> None:
    """Blank (row, col) `start` to `end` in `lines` with spaces, keeping each line's length and its line break."""
    for row in range(start[0], end[0] + 1):
        ln = lines[row - 1]
        a = start[1] if row == start[0] else 0
        b = end[1] if row == end[0] else len(ln.rstrip("\r\n"))
        lines[row - 1] = ln[:a] + " " * (b - a) + ln[b:]


def _py_code_only(text: str) -> str:
    lines = io.StringIO(text).readlines()
    for tok in _py_prose(text):
        _blank_span(lines, tok.start, tok.end)
    return "".join(lines)


def code_only(rel: str, text: str) -> str:
    """`text` with its comments and docstrings blanked to spaces; every offset and line number is kept (2.6.24). OS-2's
    ambient patterns read this, so a docstring that says "a singleton read" is not a singleton (LedgerCore V2,
    configuration.py:904). String literals in code are kept. A file in another language is returned as it is."""
    if rel.endswith(".php"):
        return php_support().code_only(text, keep_strings=True)
    if rel.endswith(".py"):
        return _py_code_only(text)
    return JS_LEXEME.sub(_blanked, text) if rel.endswith(JS_SUFFIXES) else text


def _named(node) -> str:
    """The last name of a Name, an Attribute or a call of either: `dataclass` for dataclasses.dataclass(...)."""
    node = node.func if isinstance(node, ast.Call) else node
    return getattr(node, "id", None) or getattr(node, "attr", None) or ""


def _init_off(node) -> bool:
    """A call that passes init=False: dataclass(init=False) or field(init=False)."""
    return isinstance(node, ast.Call) and any(k.arg == "init" and isinstance(k.value, ast.Constant)
                                              and k.value.value is False for k in node.keywords)


def _dataclass_init(cls) -> bool:
    """A class whose @dataclass decorator, bare or called, writes its __init__."""
    return any(_named(d) == "dataclass" and not _init_off(d) for d in cls.decorator_list)


def _is_dataclass(cls) -> bool:
    """A class with a @dataclass decorator, whether or not it writes the __init__: a subclass inherits its fields."""
    return any(_named(d) == "dataclass" for d in cls.decorator_list)


def _not_a_field(annotation) -> bool:
    """A ClassVar or KW_ONLY annotation, written as a name, an attribute, a subscript or a string."""
    node = annotation.value if isinstance(annotation, ast.Subscript) else annotation
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value.split("[")[0].split(".")[-1].strip() in ("ClassVar", "KW_ONLY")
    return _named(node) in ("ClassVar", "KW_ONLY")


def _field_names(cls) -> list[tuple[str, bool]]:
    """(name, whether the generated __init__ takes it) for each field a class body declares, in order: its annotated
    names less ClassVar and KW_ONLY; a field(init=False) is a field the __init__ does not take."""
    return [(s.target.id, not (_named(s.value) == "field" and _init_off(s.value))) for s in cls.body
            if isinstance(s, ast.AnnAssign) and isinstance(s.target, ast.Name) and not _not_a_field(s.annotation)]


def _inherited_fields(cls, lookup, seen: frozenset) -> list[tuple[str, bool]]:
    """The fields `cls` inherits from its dataclass bases, the furthest base first, as @dataclass collects them along
    the reversed MRO (2.6.24). A base `lookup` cannot find adds nothing."""
    out = []
    for base in reversed(cls.bases):
        found = lookup(_named(base.value if isinstance(base, ast.Subscript) else base))
        if found and id(found[0]) not in seen:
            parent, parent_lookup = found
            out += _inherited_fields(parent, parent_lookup, seen | {id(parent)})
            out += _field_names(parent) if _is_dataclass(parent) else []
    return out


def _dataclass_fields(cls, lookup) -> list[str]:
    """A dataclass's __init__ parameters: the fields it inherits first, then its own, each in declared order, less
    ClassVar, KW_ONLY and field(init=False). A field declared again keeps its first place and its last declaration,
    as the generated __init__ has it (2.6.24). Until 2.6.24 only the class's own fields were read, so LedgerCore V2's
    `EntityFile(AppendOnlyStore)` was refused for declaring the base's path, header_id, locality and home."""
    fields = dict(_inherited_fields(cls, lookup, frozenset({id(cls)})) + _field_names(cls))
    return [name for name, taken in fields.items() if taken]


IMPORT_HOPS = 4        # how many files a base class is followed through, re-exports included


def _class_scope(root: Path | None, rel: str, tree, hops: int):
    """A lookup for file `rel`: name -> (the class that name means there, the lookup for that class's own file), or
    None (2.6.24). A class the file declares at its top level; with `root`, one it imports with `from <module> import`
    from a file under root, followed through re-exports."""
    declared = {c.name: c for c in tree.body if isinstance(c, ast.ClassDef)}

    def lookup(name: str):
        if name in declared:
            return declared[name], lookup
        return _imported_class(root, rel, tree, name, hops) if root and hops < IMPORT_HOPS else None
    return lookup


def _imported_class(root: Path, rel: str, tree, name: str, hops: int):
    """What `lookup` answers for a name file `rel` imports from a module that is a file under root."""
    for node in (n for n in tree.body if isinstance(n, ast.ImportFrom)):
        source = next((a.name for a in node.names if (a.asname or a.name) == name), "")
        path = _module_file(root, rel, node) if source else ""
        if path:
            return _class_in(root, path, source, hops + 1)
    return None


def _module_candidates(folder: Path, parts: list[str]) -> list[Path]:
    """The module file and the package __init__ that dotted `parts` name inside `folder`."""
    package = folder.joinpath(*parts, "__init__.py")
    return [folder.joinpath(*parts[:-1], parts[-1] + ".py"), package] if parts else [package]


def _module_file(root: Path, rel: str, node) -> str:
    """The file under root that `from <module> import ...` in `rel` reads: beside `rel` for a relative import, else in
    the nearest folder above `rel` that holds it, so a src/ layout resolves. '' when no such file is under root."""
    here = Path(rel).parent
    for _ in range(node.level - 1):
        here = here.parent
    parts = node.module.split(".") if node.module else []
    folders = [here] if node.level else [here, *here.parents]
    return next((p.as_posix() for f in folders for p in _module_candidates(f, parts) if (root / p).is_file()), "")


def _class_in(root: Path, rel: str, name: str, hops: int):
    """What `lookup` answers for `name` in file `rel` under root, or None when the file cannot be read or parsed."""
    try:
        tree = ast.parse((root / rel).read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, SyntaxError, ValueError):
        return None
    return _class_scope(root, rel, tree, hops)(name)


def _py_class_signature(cls, lookup) -> dict:
    """{"__init__": [params], "<public op>": [params]} for one class; a dataclass's fields are its __init__."""
    ops = {fn.name: _py_params(fn) for fn in cls.body if isinstance(fn, ast.FunctionDef)
           and (fn.name == "__init__" or not fn.name.startswith("_"))}
    if "__init__" not in ops and _dataclass_init(cls):
        return {"__init__": _dataclass_fields(cls, lookup), **ops}
    return ops


def _py_signatures(rel: str, text: str, root: Path | None) -> dict:
    try:
        tree = ast.parse(text)
    except SyntaxError:
        return {}
    lookup = _class_scope(root, rel, tree, 0)
    return {cls.name: _py_class_signature(cls, lookup) for cls in ast.walk(tree) if isinstance(cls, ast.ClassDef)}


def _js_param_names(params: str) -> list[str]:
    """The plain names in a JS/TS parameter list: destructuring braces, defaults and rest dots dropped."""
    names = []
    for part in re.sub(r"[{}]", "", params).split(","):
        part = part.strip().split("=")[0].strip().lstrip(".")
        if re.match(r"^[A-Za-z_$][\w$]*$", part):
            names.append(part)
    return names


JS_CLASS = re.compile(r"\bclass\s+(?!extends\b)([A-Za-z_$][\w$]*)")
JS_OP = re.compile(r"^\s{2,}(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{", re.M)


def _js_signatures(text: str) -> dict:
    """{class: {op: params}} for every class in a JS/TS file, each reading the method heads from its own head to the
    next class's (2.7.0). Before 2.7.0 the file's first class took every head in the file, a later class's constructor
    included. A class head is read with comments blanked, so "the class below" in a comment is not a class."""
    heads = list(JS_CLASS.finditer(JS_LEXEME.sub(_blanked, text)))
    out = {}
    for cls, nxt in zip(heads, heads[1:] + [None]):
        ops = {}
        for m in JS_OP.finditer(text, cls.end(), nxt.start() if nxt else len(text)):
            if m.group(1) not in ("if", "for", "while", "switch", "catch"):
                ops[m.group(1)] = _js_param_names(m.group(2))
        out[cls.group(1)] = ops
    return out


def signatures(rel: str, text: str, root: Path | None = None) -> dict:
    """{class: {"__init__": [params], "<public op>": [params]}} for .py / .js / .ts / .php. A Python dataclass reads
    the fields it inherits from a base in the same file, and with `root` from a base it imports from a file under root
    (2.6.24)."""
    if rel.endswith(".php"):
        return php_support().signatures(text)
    if rel.endswith(".py"):
        return _py_signatures(rel, text, root)
    if rel.endswith(JS_SUFFIXES):
        return _js_signatures(text)
    return {}


def _is_protocol(cls) -> bool:
    """A typing.Protocol: Protocol, typing.Protocol or Protocol[...] among its bases."""
    for base in cls.bases:
        node = base.value if isinstance(base, ast.Subscript) else base
        if (getattr(node, "id", None) or getattr(node, "attr", None)) == "Protocol":
            return True
    return False


def _is_stub(fn) -> bool:
    """A body of nothing but a docstring, `...` or `pass`: nothing the declaring class answers."""
    body = [s for s in fn.body if not (isinstance(s, ast.Expr) and isinstance(s.value, ast.Constant))]
    return all(isinstance(s, ast.Pass) for s in body)


def protocol_stubs(rel: str, text: str) -> set[tuple[str, str]]:
    """(class, method) for each stub of a Python typing.Protocol in `text` (2.6.20). A consumer-owned Protocol
    declares what the collaborator it is handed answers; the declaring module has no code there for OS-12 to test."""
    if not rel.endswith(".py"):
        return set()
    try:
        tree = ast.parse(text)
    except SyntaxError:
        return set()
    protocols = [n for n in ast.walk(tree) if isinstance(n, ast.ClassDef) and _is_protocol(n)]
    return {(c.name, fn.name) for c in protocols for fn in c.body
            if isinstance(fn, (ast.FunctionDef, ast.AsyncFunctionDef)) and _is_stub(fn)}
