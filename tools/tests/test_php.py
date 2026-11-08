"""PHP in the Phase 4 template (G-C7, 2.6.13): the scaffold, the scanners, import resolution and the seal's signatures.

Each case builds a throwaway repository with a composer.json PSR-4 map. The PHP cases need `php` on PATH for the lint
check; the PHPUnit case runs only when MF_PHPUNIT names a phpunit binary (vendor/bin/phpunit of any project), because
the template ships no Composer install of its own.

Run from the repository root: python -m unittest discover -s tools/tests
"""
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1]


def load_tool(name: str, file: str):
    """A tool whose file name is not a module name, loaded from this tools/ directory."""
    spec = importlib.util.spec_from_file_location(name, TOOLS / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


P4 = load_tool("phase4_checks", "phase4-checks.py")
PHP = load_tool("php_support", "php_support.py")
MANIFESTS = load_tool("manifests", "manifests.py")
SEAL = load_tool("seal", "seal.py")

COMPOSER = {"autoload": {"psr-4": {"Acme\\Accounts\\": "src/"}},
            "autoload-dev": {"psr-4": {"Acme\\Accounts\\Tests\\": "tests/"}}}

LEDGER = """<?php

declare(strict_types=1);

namespace Acme\\Accounts\\Records;

use Acme\\Accounts\\Admission\\{Window, Missing as Gone};
use DateTimeImmutable;
use Psr\\Log\\LoggerInterface;

/** "use Acme\\Accounts\\Fake;" in a comment is not an import. */
#[\\Attribute]
final readonly class Ledger
{
    use Countable;

    public function __construct(private object $clock, private Window $window)
    {
    }

    public function admit(string $key): bool
    {
        $f = function () use ($key) { return Outbox::class; };
        return new Gone($key) instanceof Window;
    }

    private function hidden(int $y): int
    {
        return $y;
    }
}
"""

BAD = """<?php
declare(strict_types=1);
namespace Acme\\Accounts\\Records;
const LIMIT = 5;
final class Bad
{
    public function __construct(private object $clock) {}
    public function at(int $n = 3, object ...$more): int { return LIMIT + $n; }
    public function name(): string { return 'bad'; }
    public function now(): int { $x = 'time() in a string is not a read'; return time(); }
}
"""


class Repo(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix="mf-php-"))
        self.addCleanup(shutil.rmtree, self.root, True)
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        self.put("composer.json", json.dumps(COMPOSER))
        self.put(".metaframework/project.json", json.dumps({"source_glob": "src/**/*.php"}))

    def put(self, rel: str, text: str) -> None:
        p = self.root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8")

    def add(self) -> set:
        subprocess.run(["git", "-C", str(self.root), "add", "-A"], check=True)
        return set(subprocess.run(["git", "-C", str(self.root), "ls-files"], capture_output=True,
                                  text=True).stdout.split())

    def scaffold(self, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run([sys.executable, "-B", str(TOOLS / "new-object.py"), *args, "--root", str(self.root)],
                              capture_output=True, text=True, encoding="utf-8", timeout=60)


class Scaffold(Repo):
    def test_the_class_is_sealed_typed_and_namespaced_by_psr4(self):
        ran = self.scaffold("Ledger", "--file", "src/Records/Ledger.php", "--inputs", "clock,standingIn")
        self.assertEqual(ran.returncode, 0, ran.stderr)
        text = (self.root / "src/Records/Ledger.php").read_text(encoding="utf-8")
        self.assertTrue(text.startswith("<?php\n\ndeclare(strict_types=1);\n\nnamespace Acme\\Accounts\\Records;\n"))
        self.assertIn("\nfinal readonly class Ledger\n{\n", text)
        self.assertIn("        private object $clock,\n        private object $standingIn,\n    ) {\n    }\n", text)
        self.assertIn("@throws \\ArgumentCountError if `clock` or `standingIn` is missing", text)
        self.assertEqual([ln for ln in text.splitlines() if len(ln) > 120], [])

    def test_the_isolation_test_is_a_phpunit_class_named_for_its_file(self):
        self.scaffold("Ledger", "--file", "src/Records/Ledger.php", "--inputs", "clock", "--operations", "admit")
        test = (self.root / "tests/Records/LedgerIsolationTest.php").read_text(encoding="utf-8")
        self.assertIn("namespace Acme\\Accounts\\Tests\\Records;\n\nuse Acme\\Accounts\\Records\\Ledger;\n", test)
        self.assertIn("final class LedgerIsolationTest extends TestCase\n", test)
        self.assertIn("$this->expectException(\\ArgumentCountError::class);", test)
        self.assertIn("self::assertNotEquals($a, $b);", test)

    @unittest.skipUnless(shutil.which("php"), "php is not on PATH")
    def test_both_files_lint(self):
        self.scaffold("Ledger", "--file", "src/Records/Ledger.php", "--inputs", "clock", "--operations", "admit")
        for rel in ("src/Records/Ledger.php", "tests/Records/LedgerIsolationTest.php"):
            ran = subprocess.run(["php", "-l", str(self.root / rel)], capture_output=True, text=True)
            self.assertEqual(ran.returncode, 0, ran.stdout + ran.stderr)

    def test_refusals_name_the_fix(self):
        wrong = self.scaffold("Wrong", "--file", "src/Records/Other.php", "--inputs", "clock")
        self.assertIn("'Wrong' belongs in src/Records/Wrong.php", wrong.stderr)
        unmapped = self.scaffold("Bad", "--file", "lib2/Bad.php", "--inputs", "clock")
        self.assertIn("no PSR-4 mapping in composer.json covers lib2/Bad.php", unmapped.stderr)
        snake = self.scaffold("Ledger", "--file", "src/Ledger.php", "--inputs", "the_clock")
        self.assertIn("camelCase", snake.stderr)
        for ran in (wrong, unmapped, snake):
            self.assertEqual(ran.returncode, 1)
        self.assertFalse((self.root / "src").exists(), "a refusal writes nothing")

    def test_the_template_scanners_pass_the_scaffold_once_its_operation_is_filled(self):
        self.scaffold("Ledger", "--file", "src/Records/Ledger.php", "--inputs", "clock", "--operations", "admit")
        p = self.root / "src/Records/Ledger.php"
        p.write_text(p.read_text(encoding="utf-8").replace(
            "    // operations go here. Anything an operation needs that is not above is its own parameter.\n",
            "    public function admit(string $key): bool\n    {\n        return $this->clock->now() > strlen($key);\n"
            "    }\n"), encoding="utf-8")
        self.add()
        self.assertEqual(P4.check_objects(self.root, {"source_glob": "src/**/*.php"}), [])


@unittest.skipUnless(os.environ.get("MF_PHPUNIT"), "set MF_PHPUNIT to a phpunit binary to run the generated test")
class PhpUnitRun(Repo):
    def test_the_generated_structural_tests_pass(self):
        self.scaffold("Ledger", "--file", "src/Ledger.php", "--inputs", "clock")
        vendor = Path(os.environ["MF_PHPUNIT"]).resolve().parents[1]
        self.put("boot.php", f"""<?php
require '{vendor / "autoload.php"}';
spl_autoload_register(function (string $c): void {{
    $f = __DIR__ . '/src/' . str_replace('\\\\', '/', substr($c, strlen('Acme\\\\Accounts\\\\'))) . '.php';
    if (is_file($f)) {{ require $f; }}
}});
""")
        ran = subprocess.run([os.environ["MF_PHPUNIT"], "--bootstrap", "boot.php", "tests"], cwd=self.root,
                             capture_output=True, text=True, env={"PATH": os.environ.get("PATH", "")}, timeout=120)
        self.assertEqual(ran.returncode, 0, ran.stdout + ran.stderr)
        self.assertIn("OK (2 tests", ran.stdout)


class Scanners(unittest.TestCase):
    def test_signatures_list_the_constructor_and_public_operations_only(self):
        self.assertEqual(PHP.signatures(LEDGER), {"Ledger": {"__construct": ["clock", "window"], "admit": ["key"]}})
        self.assertEqual(P4.signatures("src/Ledger.php", LEDGER), SEAL.signatures("src/Ledger.php", LEDGER))

    def test_os1_finds_defaults_bags_literals_and_module_constants(self):
        rules = sorted({r for r, _, _ in P4.os1_findings("src/Bad.php", BAD)})
        self.assertEqual(rules, ["OS-1_bag_parameter", "OS-1_default_argument", "OS-1_module_constant",
                                 "OS-1_undeclared_input"])
        self.assertEqual(P4.os1_findings("src/Ledger.php", LEDGER), [])

    def test_ambient_reads_code_not_comments_or_strings(self):
        hit = PHP.ambient(BAD)
        self.assertEqual((hit[1], hit[2]), (10, "inject a clock provider"))
        self.assertIsNone(PHP.ambient("<?php\n// time() and $_ENV in a comment\n$x = 'getenv(\"A\")';\n"))
        for code in ("$_SESSION['a']", "random_int(1, 6)", "new \\DateTimeImmutable()", "global $db;", "$GLOBALS['x']"):
            self.assertIsNotNone(PHP.ambient(f"<?php\nfunction f() {{ {code}; }}\n"), code)
        for code in ("$this->time()", "Clock::time()", "new DateTimeImmutable('2026-10-23')", "$timeout()"):
            self.assertIsNone(PHP.ambient(f"<?php\nfunction f() {{ {code}; }}\n"), code)


class Imports(Repo):
    def test_imports_resolve_through_psr4_including_implicit_same_namespace_names(self):
        self.put("src/Records/Ledger.php", LEDGER)
        self.put("src/Records/Outbox.php", "<?php\nnamespace Acme\\Accounts\\Records;\nfinal class Outbox {}\n")
        self.put("src/Records/Countable.php", "<?php\nnamespace Acme\\Accounts\\Records;\ntrait Countable {}\n")
        self.put("src/Admission/Window.php", "<?php\nnamespace Acme\\Accounts\\Admission;\n"
                                             "require_once __DIR__ . '/../Records/Outbox.php';\nfinal class Window {}\n")
        tracked = self.add()
        maps = PHP.psr4(self.root)
        got = PHP.imports(self.root, "src/Records/Ledger.php", LEDGER, maps, tracked)
        self.assertEqual(sorted(x for k, x in got if k == "file"),
                         ["src/Admission/Window.php", "src/Records/Countable.php", "src/Records/Outbox.php"])
        self.assertEqual([x for k, x in got if k == "unresolved"], ["Acme\\Accounts\\Admission\\Missing"])
        self.assertNotIn("Acme\\Accounts\\Fake", [x for _, x in got])
        self.assertIn(("external", "Psr\\Log\\LoggerInterface"), got)
        window = (self.root / "src/Admission/Window.php").read_text(encoding="utf-8")
        self.assertEqual(PHP.imports(self.root, "src/Admission/Window.php", window, maps, tracked),
                         [("file", "src/Records/Outbox.php")])

    def test_manifests_attach_tests_and_record_module_dependencies(self):
        self.scaffold("Ledger", "--file", "src/Records/Ledger.php", "--inputs", "clock")
        self.put("src/Records/Spend.php", "<?php\nnamespace Acme\\Accounts\\Records;\n"
                                          "final class Spend { public function __construct(private Ledger $l) {} }\n")
        self.put("INSTRUMENTS/object-model-and-parameters.md",
                 "| Module | File | Traces | Purpose | Declared inputs | Decides | Status |\n|---|---|---|---|---|---|---|\n"
                 "| MOD-01 Ledger | src/Records/Ledger.php | x | x | clock | NO | x |\n"
                 "| MOD-02 Spend | src/Records/Spend.php | x | x | l | NO | x |\n")
        self.add()
        built = MANIFESTS.build(self.root, {"source_glob": "src/**/*.php"})
        self.assertEqual([f["path"] for f in built["MOD-01"]["manifest"]["files"]],
                         ["src/Records/Ledger.php", "tests/Records/LedgerIsolationTest.php"])
        self.assertEqual(built["MOD-02"]["deps"], ["MOD-01"])
        self.assertEqual(built["MOD-01"]["manifest"]["unresolved"], [])

    def test_without_a_psr4_map_a_namespaced_use_is_unresolved_never_guessed(self):
        (self.root / "composer.json").unlink()
        tracked = self.add()
        got = PHP.imports(self.root, "src/A.php", "<?php\nnamespace X;\nuse Y\\Z;\nuse DateTimeImmutable;\n",
                          PHP.psr4(self.root), tracked)
        self.assertEqual(got, [("unresolved", "Y\\Z"), ("external", "DateTimeImmutable")])


if __name__ == "__main__":
    unittest.main()
