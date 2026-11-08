# Building in PHP (2.6.13)

The template's tools read PHP alongside TypeScript, JavaScript and Python. This page is the setup for a PHP build. The
rules don't change by language: the Object Writing Standard, the instruments, K7 and the seal are the same. Only the
readers and the commands differ.

## What the tools do with a `.php` file

| Tool | PHP support (in `tools/php_support.py`) |
|---|---|
| `new-object.py` | writes a sealed class: `declare(strict_types=1)`, the namespace composer.json's PSR-4 map gives its folder, `final readonly`, and each input a promoted `private` constructor parameter typed `object` (replace it with the interface the class calls). It also writes a PHPUnit isolation test, `tests/<sub>/<Class>IsolationTest.php`. It refuses a class whose name isn't its file's name, an input that isn't camelCase, and a file no PSR-4 prefix covers |
| `phase4-checks.py objects` and `gate.py` | **OS-1:** default arguments, variadics, zero-argument methods returning a literal, and module constants (`const`, `define`) read in a class.<br>**OS-2:** `getenv`, `$_ENV`, `$_SERVER` and the request superglobals; the clock (`time()`, `date()`, `new DateTimeImmutable()`, …); randomness (`random_int`, `random_bytes`, `mt_rand`, `uniqid`, …); `$GLOBALS` and `global`; static locals; `::getInstance()`.<br>Both read code with comments and strings blanked.<br>**OS-3:** a decider reached by `use`, `new` or `::`.<br>**OS-12:** the isolation test is found by the pattern `tests/**/<Class>IsolationTest.php` |
| `manifests.py` | resolves each file's dependencies through composer.json's `autoload` and `autoload-dev` PSR-4 maps: `use` statements (including grouped and aliased ones), fully qualified names, **classes named without a `use` because they share a namespace**, traits, attributes, and `require` or `include` of a literal path.<br>A name in the library's own namespace that maps to no tracked file is unresolved, and so is any namespaced `use` when composer.json has no PSR-4 map. Unresolved means the module is never credited, so nothing is guessed |
| `seal.py` | reads `__construct` and public methods for the declaration comparison |

## Setup

1. **composer.json**, before the first class. Declare the library's namespace and its tests:
   ```json
   {
     "require": { "php": ">=8.3" },
     "require-dev": { "phpunit/phpunit": "^11" },
     "autoload": { "psr-4": { "Vendor\\Library\\": "src/" } },
     "autoload-dev": { "psr-4": { "Vendor\\Library\\Tests\\": "tests/" } }
   }
   ```
   Then run `composer install`. `vendor/` stays untracked, so add it to `.gitignore`. Commit `composer.lock`.
2. **`.metaframework/project.json`:**
   ```json
   "test_command": "vendor/bin/phpunit",
   "test_module": "vendor/bin/phpunit tests/{module}",
   "test_select": "vendor/bin/phpunit --filter {test_name}",
   "isolation_test_command": "python tools/isolation-run.py -- vendor/bin/phpunit --filter IsolationTest",
   "source_glob": "src/**/*.php",
   "typecheck_command": "vendor/bin/phpstan analyse --level max src"
   ```
   - `rederive_command` and `rederive_all` drive your own implementation through one vector, for example
     `php tools/rederive.php {vector_id}`. `tools/rederive.py` is language-agnostic.
   - `typecheck_command` is optional for PHP. If you declare it, add PHPStan to `require-dev`.
   - `isolation_test_command` starts PHPUnit through `tools/isolation-run.py`, which clears the environment the same
     way on Windows and POSIX (2.7.0).
3. **Every class starts with the scaffold:**
   ```
   python3 tools/new-object.py Ledger --file src/Records/Ledger.php --inputs clock,store --operations admit
   ```
   The isolation test's operation calls carry `/* input A */` and `/* input B */` placeholders, and **they fail until
   you fill them**. Construct-and-assert is not a pass.
4. **Code quality.** The owner's PHP plugins judge what the template's checks don't:
   - **php-code-scorer:** class design out of 10;
   - **php-package-manager:** PSR-4 and the folder layout;
   - **code-gates:** function size and complexity;
   - **apache-config-reviewer:** `.htaccess` hardening for the host.

## Limits

The PHP readers are scanners, as for the other languages. They cover the common cases, and OS-12's isolation tests
are the proof. Three cases they don't cover:
- A class reached only through a string, for example `$class = 'Ledger'; new $class()`, is invisible to them.
  Don't do this in a library: OS-1 already requires every dependency to arrive at construction.
- An autoloader other than Composer's PSR-4 (`classmap`, `files`) isn't followed, so those dependencies show as
  unresolved and are never credited.
- `include` of a computed path is recorded as unresolved.
