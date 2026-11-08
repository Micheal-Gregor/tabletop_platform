#!/usr/bin/env python3
"""
new-object — scaffold a class that already satisfies the Object Writing Standard.

The compliant path has to be the cheap path. Writing `import { decider }` costs three
tokens and solves the call in front of you; threading a dependency through a constructor,
a wiring point and a test costs thirty and solves a scenario that does not exist yet. A
model optimises the visible problem. So this generator makes the correct shape cost one
command: the class with its declared inputs, the isolation test that proves it needs
nothing else, and the object-model row that makes it legal to write.

A .js or .ts class is written as Prettier prints it at 80 columns, under a TSDoc comment
that names its refusals with @throws. It is sealed by a `new.target` check before
`Object.freeze(this)`: composition roots pass constructors as values, so the constructor
stays public (TypeScript standard 5.5), and a frozen class must not be extendable (3.3).

A .php class (G-C7, 2.6.13) is written to the PHP OOP standard the php-code-scorer applies:
`declare(strict_types=1)`, the namespace composer.json's PSR-4 map gives its folder, `final readonly`
(sealed and immutable), and every input a promoted `private` constructor parameter, so a missing input
is refused by PHP itself. Its isolation test is a PHPUnit class, `<Class>IsolationTest`, in the file
named after it under tests/, because PHPUnit loads a test class from the file of the same name.

Usage:
    new-object.py <Module> --file src/<name>.<ext> --inputs clock,standingIn
                  [--decides yes|no] [--traces MOD-07] [--purpose "..."] [--root .]

Exit: 0 written, 1 refused (bad name, file exists, bucket name), 2 bad invocation.
"""

import argparse
import json
import posixpath
import re
import sys
import textwrap
from dataclasses import dataclass
from pathlib import Path

BUCKETS = {"helpers", "helper", "utils", "util", "common", "misc", "shared", "stuff", "lib"}

# The rules every scaffolded class states: a comment header in Python, the class TSDoc in JS/TS.
OS_RULES = (
    ("OS-1", "every dependency arrives at construction (below). Nothing is reached for."),
    ("OS-2", "no env, clock, randomness, globals, singletons, module-level mutable state."),
    ("OS-4", "the constructor validates and refuses; no half-built instance exists."),
    ("OS-5", "state is private; expose commands, not setters."),
    ("OS-6", "every refusal is typed and named in the interface contract."),
)

# Prettier's printWidth. A JS/TS class over it loses M1 under typescript-code-scorer.
WIDTH = 80
# PER Coding Style's soft limit. A PHP line over it loses M1 under php-code-scorer.
PHP_WIDTH = 120

OPS_NOTE = "operations go here. Anything an operation needs that is not above is its own parameter."

PY = """{header}

class {Module}:
    def __init__(self, *, {params}):
{checks}
{assigns}

    # operations go here. Anything an operation needs that is not above is its own parameter.
"""

JS_OP = """
  it('{op} answers differently when {varied} differs', () => {{
    const a = new {Module}({{ ...deps() }}).{op}(/* input A */);
    const b = new {Module}({{ ...deps({{ {varied}: other.{varied} }}) }}).{op}(/* input B */);
    expect(a).not.toEqual(b);   // if they are equal, the answer came from somewhere undeclared
  }});
"""

PY_OP = """
    def test_{op}_answers_differently_when_{varied}_differs(self):
        a = {Module}(**deps()).{op}()           # input A
        b = {Module}(**deps({varied}=other_{varied}())).{op}()   # input B
        self.assertNotEqual(a, b)   # if equal, the answer came from somewhere undeclared
"""

JS_TEST = """{c} Isolation test (OS-12) — construct {Module} with its declared inputs and nothing
{c} else, then exercise every public operation. Run it with the environment cleared and the
{c} clock frozen: anything this class reaches for outside its inputs fails here.
import {{ {Module} }} from '{import_path}';

describe('{Module} in isolation', () => {{
  const deps = (over) => ({{ {stubs}, ...over }});
  const other = {{ {others} }};

  it('refuses to construct when an input is missing', () => {{
    expect(() => new {Module}({{}})).toThrow();
  }});

  it('refuses to construct a subclass: {Module} is sealed', () => {{
    expect(() => new (class extends {Module} {{}})(deps())).toThrow(TypeError);
  }});
{op_blocks}
  {c} Construct-and-assert is a failure, not a pass: every public operation is called, and
  {c} for each declared input two calls differ in only that input and the answers differ.
}});
"""

PY_TEST = """{c} Isolation test (OS-12) — construct {Module} with its declared inputs and nothing
{c} else, then exercise every public operation. Run it with the environment cleared and the
{c} clock frozen: anything this class reaches for outside its inputs fails here.
import unittest

from {import_path} import {Module}


def deps(**over):
    base = dict({stubs})
    base.update(over)
    return base

{others}


class {Module}InIsolation(unittest.TestCase):
    def test_refuses_to_construct_when_an_input_is_missing(self):
        with self.assertRaises(Exception):
            {Module}()
{op_blocks}

# Construct-and-assert is a failure, not a pass: every public operation is called, and for
# each declared input two calls differ in only that input and the answers differ.
"""


@dataclass(frozen=True)
class Scaffold:
    """One class to scaffold, as the command line declared it and after it was checked."""
    name: str
    rel: str
    target: Path
    inputs: tuple
    ops: tuple
    purpose: str


def write_text_kept(path: Path, text: str) -> None:
    """Write text as UTF-8 bytes. Text mode would turn every \\n into \\r\\n on Windows (F7, the Frame Gate trial),
    so this writes LF, or CRLF only where the file being rewritten already uses it."""
    crlf = path.is_file() and b"\r\n" in path.read_bytes()
    path.write_bytes(text.replace("\r\n", "\n").replace("\n", "\r\n" if crlf else "\n").encode("utf-8"))


def die(msg: str, code: int = 1) -> int:
    print(f"new-object: {msg}", file=sys.stderr)
    return code


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser()
    ap.add_argument("module")
    ap.add_argument("--file", required=True)
    ap.add_argument("--inputs", default="", help="comma-separated declared inputs (OS-1)")
    ap.add_argument("--no-inputs", action="store_true",
                    help="this class truly needs nothing handed in — state it explicitly")
    ap.add_argument("--operations", default="",
                    help="comma-separated public operations; each gets a two-call isolation test")
    ap.add_argument("--decides", choices=["yes", "no"], default="no")
    ap.add_argument("--traces", default="")
    ap.add_argument("--purpose", default="")
    ap.add_argument("--root", default=".")
    return ap.parse_args()


def listed(text: str) -> tuple:
    """The names in a comma-separated option, blanks dropped."""
    return tuple(x.strip() for x in text.split(",") if x.strip())


def refusal(name: str, rel: str, target: Path) -> str:
    """Why this class may not be created where asked, or "" when it may."""
    if not re.match(r"^[A-Z][A-Za-z0-9]*$", name):
        return f"'{name}' must be PascalCase — a module's name states what it owns"
    if target.stem.lower() in BUCKETS or any(f"/{b}/" in "/" + rel.lower() for b in BUCKETS):
        return (f"'{rel}' is a bucket (OS-9). A bucket has no owner and no contract, which "
                f"is exactly how a decider ends up imported by name. Name it for what it owns.")
    if target.exists():
        return f"{rel} already exists; this command creates, it never overwrites"
    return ""


def input_problem(inputs: tuple, no_inputs: bool) -> str:
    """Why the declared inputs are not a valid invocation, or "" when they are."""
    if not inputs and not no_inputs:
        return ("--inputs is required (OS-1). Everything the class needs — a clock, a config "
                "value, another module's decision — arrives at construction. If it truly "
                "needs nothing, say so with --no-inputs; a forgotten flag must not succeed "
                "silently.")
    if inputs and no_inputs:
        return "--inputs and --no-inputs contradict each other"
    return ""


def py_header(s: Scaffold) -> str:
    """The Python class's comment header: the rules it is written to, then its purpose."""
    header = f"# {s.name} — Object Writing Standard\n"
    header += "".join(f"# {rule}  {text}\n" for rule, text in OS_RULES)
    return header + (f"# {s.purpose}\n" if s.purpose else "")


def py_test(s: Scaffold) -> str:
    """The Python isolation test (OS-12)."""
    varied = s.inputs[0] if s.inputs else "nothing"
    blocks = "".join(PY_OP.format(Module=s.name, op=o, varied=varied) for o in s.ops)
    return PY_TEST.format(c="#", Module=s.name, import_path=s.rel.replace("/", ".").removesuffix(".py"),
                          stubs=", ".join(f"{i}=object()" for i in s.inputs),
                          others="\n".join(f"def other_{i}():\n    return object()"
                                           for i in s.inputs),
                          op_blocks=blocks or "\n    # one test per public operation — two "
                                             "calls differing in one input, answers differ\n")


def py_test_path(root: Path, stem: str) -> str:
    """The Python isolation test's path (2.6.21): the project's isolation_test_pattern made concrete, as the Python
    preset's `tests/**/test_{stem}_isolation.py` is; else tests/<stem>.isolation.test.py, which the default matches."""
    try:
        cfg = json.loads((root / ".metaframework" / "project.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        cfg = {}
    pattern = ((cfg.get("object_standard") or {}).get("isolation_test_pattern") or "").replace("**/", "")
    concrete = pattern.replace("{stem}", stem)
    if "{stem}" in pattern and "*" not in concrete and concrete.endswith(".py"):
        return concrete
    return f"tests/{stem}.isolation.test.py"


def render_py(s: Scaffold, root: Path) -> tuple:
    """(class source, test path, test source) for a Python class."""
    checks = "\n".join(f"        if {i} is None:\n            raise ValueError"
                       f"('{s.name} requires {i}')" for i in s.inputs) or "        pass"
    assigns = "\n".join(f"        self._{i} = {i}" for i in s.inputs)
    body = PY.format(header=py_header(s), Module=s.name, params=", ".join(s.inputs) or "**_",
                     checks=checks, assigns=assigns or "        pass")
    return body, py_test_path(root, s.target.stem), py_test(s)


def wrapped(text: str, prefix: str, indent: str = "") -> list:
    """`text` as lines no wider than WIDTH, each starting with `prefix`; continuations add `indent`."""
    return [prefix + line for line in textwrap.wrap(text, WIDTH - len(prefix), subsequent_indent=indent,
                                                     break_long_words=False, break_on_hyphens=False)]


def or_list(names: tuple) -> str:
    """`a`, `a` or `b`, `a`, `b` or `c`."""
    quoted = [f"`{n}`" for n in names]
    return quoted[0] if len(quoted) == 1 else ", ".join(quoted[:-1]) + " or " + quoted[-1]


def class_doc(s: Scaffold) -> str:
    """The class TSDoc: what it owns, the rules it is written to, its seal and its refusals.
    It never says "class" before a word: phase4-checks reads the first `class <Name>` as the class."""
    missing = f"{or_list(s.inputs)} is missing, or if " if s.inputs else ""
    lines = ["/**", *wrapped(s.purpose or f"(one line: what {s.name} owns, and when to use it)", " * "),
             " *", " * Object Writing Standard:"]
    for rule, text in OS_RULES:
        lines += wrapped(f"- {rule} {text}", " * ", "  ")
    lines += [" *", *wrapped("@sealed Enforced at run time by the `new.target` check. The constructor "
                             "stays public because composition roots pass it as a value.", " * "),
              *wrapped(f"@throws TypeError if {missing}a subclass is constructed.", " * "), " */"]
    return "\n".join(lines)


def throw_if(condition: str, message: str) -> list:
    """`if (condition) throw new TypeError("message");` in the constructor, as Prettier breaks it at WIDTH."""
    error = f'throw new TypeError("{message}");'
    for form in ([f"    if ({condition}) {error}"], [f"    if ({condition})", f"      {error}"]):
        if max(map(len, form)) <= WIDTH:
            return form
    return [f"    if ({condition})", "      throw new TypeError(", f'        "{message}",', "      );"]


def constructor_head(inputs: tuple) -> list:
    """The constructor's first line, its one destructured parameter broken one name a line when too wide."""
    if not inputs:
        return ["  constructor() {"]
    line = f"  constructor({{ {', '.join(inputs)} }}) {{"
    if len(line) <= WIDTH:
        return [line]
    return ["  constructor({", *[f"    {i}," for i in inputs], "  }) {"]


def js_class(s: Scaffold) -> str:
    """A sealed JS/TS class: private fields, inputs refused when missing, a new.target check, frozen."""
    lines = [class_doc(s), f"export class {s.name} {{", *[f"  #{i};" for i in s.inputs]]
    lines += constructor_head(s.inputs)
    lines += throw_if(f"new.target !== {s.name}", f"{s.name} is sealed and cannot be extended")
    for i in s.inputs:
        lines += throw_if(f"{i} === undefined", f"{s.name} requires {i}")
    lines += [f"    this.#{i} = {i};" for i in s.inputs]
    lines += ["    Object.freeze(this);", "  }", "", *wrapped(OPS_NOTE, "  // "), "}", ""]
    return "\n".join(lines)


def render_js(s: Scaffold) -> tuple:
    """(class source, test path, test source) for a JS or TS class."""
    import_path = "../" * max(s.rel.count("/"), 1) + s.rel.removesuffix(".js").removesuffix(".ts")
    varied = s.inputs[0] if s.inputs else "nothing"
    blocks = "".join(JS_OP.format(Module=s.name, op=o, varied=varied) for o in s.ops)
    test = JS_TEST.format(c="//", Module=s.name, import_path=import_path,
                          stubs=", ".join(f"{i}: {{}}" for i in s.inputs),
                          others=", ".join(f"{i}: {{}}" for i in s.inputs),
                          op_blocks=blocks or "\n  // one block per public operation — two "
                                              "calls differing in one input, answers differ\n")
    return js_class(s), f"tests/{s.target.stem}.isolation.test{s.target.suffix}", test


PHP_OP = """
    public function test{Op}AnswersDifferentlyWhen{Varied}Differs(): void
    {{
        $a = (new {Module}(...self::deps([])))->{op}(/* input A */);
        $b = (new {Module}(...self::deps(['{varied}' => new \\stdClass()])))->{op}(/* input B */);
        self::assertNotEquals($a, $b);   // if they are equal, the answer came from somewhere undeclared
    }}
"""

PHP_TEST = """<?php

declare(strict_types=1);
{namespace}
use {fqcn};
use PHPUnit\\Framework\\TestCase;

/**
{doc}
 */
final class {Module}IsolationTest extends TestCase
{{
    /**
     * The declared inputs, each a stand-in, with `$over` replacing some of them.
     *
     * @param array<string, mixed> $over
     * @return array<string, mixed>
     */
    private static function deps(array $over): array
    {{
        return [...[{stubs}], ...$over];
    }}
{missing}
    public function testIsSealedAndImmutable(): void
    {{
        $class = new \\ReflectionClass({Module}::class);
        self::assertTrue($class->isFinal());
        self::assertTrue($class->isReadOnly());
    }}
{op_blocks}}}
"""

PHP_MISSING = """
    public function testRefusesToConstructWhenAnInputIsMissing(): void
    {{
        $this->expectException(\\ArgumentCountError::class);
        new {Module}();
    }}
"""


def php_support(root: Path):
    """tools/php_support.py, beside this file: composer.json's PSR-4 maps (G-C7)."""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import php_support as module
    return module


def php_refusal(root: Path, s_name: str, rel: str, inputs: tuple) -> str:
    """Why a PHP class may not be scaffolded at `rel`, or "" when it may."""
    if Path(rel).stem != s_name:
        return (f"a PHP class lives in the file named after it (PSR-4): '{s_name}' belongs in "
                f"{posixpath.join(posixpath.dirname(rel), s_name + '.php')}")
    bad = [i for i in inputs if not re.match(r"^[a-z][A-Za-z0-9]*$", i)]
    if bad:
        return f"PHP inputs are camelCase properties (PER naming): {', '.join(bad)}"
    if php_support(root).namespace_for(php_support(root).psr4(root), rel) is None:
        return (f"no PSR-4 mapping in composer.json covers {rel}. Declare the library's namespace first, "
                f'e.g. "autoload": {{"psr-4": {{"Vendor\\\\Library\\\\": "src/"}}}}, then run composer dump-autoload')
    return ""


def php_wrapped(text: str, prefix: str) -> list:
    return [prefix + line for line in textwrap.wrap(text, PHP_WIDTH - len(prefix), break_long_words=False,
                                                     break_on_hyphens=False)]


def php_class(s: Scaffold, namespace: str) -> str:
    """A sealed PHP class: strict types, its PSR-4 namespace, final readonly, promoted private inputs."""
    doc = ["/**", *php_wrapped(s.purpose or f"(one line: what {s.name} owns, and when to use it)", " * "),
           " *", " * Object Writing Standard:"]
    for rule, text in OS_RULES:
        doc += php_wrapped(f"- {rule} {text}", " * ")
    doc += [" *", *php_wrapped("Sealed: `final readonly`. It cannot be extended, and nothing about it changes after "
                               "construction.", " * "), " */"]
    lines = ["<?php", "", "declare(strict_types=1);", "", f"namespace {namespace};", "", *doc,
             f"final readonly class {s.name}", "{"]
    if s.inputs:
        lines += ["    /**", *php_wrapped(f"Replace `object` with the interface each input is called through (OS-1), or "
                                          f"the scalar type of a value.", "     * "), "     *",
                  *php_wrapped(f"@throws \\ArgumentCountError if {or_list(s.inputs)} is missing", "     * "),
                  "     * @throws \\TypeError if an input is not of its declared type", "     */",
                  "    public function __construct(", *[f"        private object ${i}," for i in s.inputs],
                  "    ) {", "    }", ""]
    lines += [*php_wrapped(OPS_NOTE, "    // "), "}", ""]
    return "\n".join(lines)


def render_php(s: Scaffold, root: Path) -> tuple:
    """(class source, test path, test source) for a PHP class."""
    php = php_support(root)
    maps = php.psr4(root)
    namespace = php.namespace_for(maps, s.rel)
    src_dir = next(d for prefix, d in sorted(maps, key=lambda pd: -len(pd[1])) if s.rel.startswith(d))
    sub = posixpath.dirname(s.rel[len(src_dir):])
    test_rel = posixpath.join("tests", sub, f"{s.name}IsolationTest.php")
    test_ns = php.namespace_for(maps, test_rel)
    varied = s.inputs[0] if s.inputs else "nothing"
    blocks = "".join(PHP_OP.format(Module=s.name, op=o, Op=o[:1].upper() + o[1:], varied=varied,
                                   Varied=varied[:1].upper() + varied[1:]) for o in s.ops)
    doc = "\n".join(php_wrapped(f"Isolation test (OS-12): constructs {s.name} with its declared inputs and nothing else, "
                                f"then calls every public operation. Run it with the environment cleared and the clock "
                                f"frozen: anything {s.name} reaches for outside its inputs fails here. "
                                f"Construct-and-assert is a failure, not a pass: for each declared input, two calls "
                                f"differ in only that input and the answers differ.", " * "))
    test = PHP_TEST.format(namespace=f"\nnamespace {test_ns};\n" if test_ns else "", fqcn=f"{namespace}\\{s.name}",
                           doc=doc, Module=s.name,
                           stubs=", ".join(f"'{i}' => new \\stdClass()" for i in s.inputs),
                           missing=PHP_MISSING.format(Module=s.name) if s.inputs else "",
                           op_blocks=blocks or "\n    // one test per public operation: two calls differing in one "
                                               "input, answers differ\n")
    return php_class(s, namespace), test_rel, test


def write_scaffold(root: Path, s: Scaffold, body: str, test_rel: str, test: str) -> None:
    """The class, and its isolation test unless one is already there."""
    s.target.parent.mkdir(parents=True, exist_ok=True)
    write_text_kept(s.target, body)
    tp = root / test_rel
    tp.parent.mkdir(parents=True, exist_ok=True)
    if not tp.exists():
        write_text_kept(tp, test)


def add_model_row(root: Path, s: Scaffold, a: argparse.Namespace) -> None:
    """The object-model row that makes the module legal to write, at the end of the Modules table."""
    om = root / "INSTRUMENTS" / "object-model-and-parameters.md"
    if not om.is_file():
        return
    row = (f"| {s.name} | {s.rel} | {a.traces or '(trace me)'} | {s.purpose or '(one line)'} | "
           f"{', '.join(s.inputs) or '—'} | {a.decides.upper()} | NOT_STARTED |")
    lines = om.read_text(encoding="utf-8").splitlines()
    for i, ln in enumerate(lines):
        if ln.startswith("| Module | File |"):
            j = i + 2
            while j < len(lines) and lines[j].startswith("|"):
                j += 1
            lines.insert(j, row)
            write_text_kept(om, "\n".join(lines) + "\n")
            return


def report(s: Scaffold, test_rel: str, decides: str) -> None:
    print(f"new-object: wrote {s.rel} and {test_rel}, and added the object-model row.\n"
          f"  Declared inputs: {', '.join(s.inputs) or '(none)'}\n"
          f"  Decides: {decides.upper()}"
          + ("  — every seam into this module must be INJECTED (OS-3)."
             if decides == "yes" else "")
          + "\nNext: fill the operations, give the isolation test one case per operation, and "
            "add the module's entry to the interface contract (operation, inputs, returns, "
            "refusals, side effects, determinism).")


def main() -> int:
    a = parse_args()
    root = Path(a.root).resolve()
    rel = a.file.lstrip("/")
    target = root / rel
    refused = refusal(a.module, rel, target)
    if refused:
        return die(refused)
    inputs = listed(a.inputs)
    problem = input_problem(inputs, a.no_inputs)
    if problem:
        return die(problem, 2)
    if target.suffix == ".php":
        refused = php_refusal(root, a.module, rel, inputs)
        if refused:
            return die(refused)
    s = Scaffold(a.module, rel, target, inputs, listed(a.operations), a.purpose)
    if target.suffix == ".php":
        body, test_rel, test = render_php(s, root)
    else:
        body, test_rel, test = render_py(s, root) if target.suffix == ".py" else render_js(s)
    write_scaffold(root, s, body, test_rel, test)
    add_model_row(root, s, a)
    report(s, test_rel, a.decides)
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")      # every tool writes UTF-8 (2.8.0)
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
