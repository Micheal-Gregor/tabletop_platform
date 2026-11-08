"""2.7.0: the gate reads what a call says however it is spelled.

A payload holding a symbol the S3 uses (ρ, ℛ) is read as UTF-8 whatever the console's code page; git is git as git.exe,
Git or a path to either, and with -C <repo> on the tag rules; `git commit -a` stages inside the commit; an archive
unpacked, a folder synced and a sweep with -delete write and remove where they land. And RD-32's merge rule: a step
closes on the gates, so a merge needs no verdict for its tree, only a newest round that does not block.

Run from the repository root: python -m unittest discover -s tools/tests
"""
import json
import os
import subprocess
import sys
import unittest

from test_gate_reach import OS1_SOURCE, S3_REL, Reach21, git, install


class Utf8Payload(Reach21):
    """LedgerCore V2 MOD-16: an Edit holding ρ failed closed with "surrogates not allowed"."""

    def gate_in_code_page(self, tool_input: dict, tool: str = "Edit") -> subprocess.CompletedProcess:
        payload = {"tool_name": tool, "tool_input": tool_input, "cwd": str(self.root), "session_id": "sess-1"}
        env = {k: v for k, v in os.environ.items() if k not in ("PYTHONIOENCODING", "PYTHONUTF8")}
        env.update({"CLAUDE_PROJECT_DIR": str(self.root), "PYTHONUTF8": "0"})
        return subprocess.run([sys.executable, str(self.root / "tools" / "gate.py")], capture_output=True,
                              input=json.dumps(payload, ensure_ascii=False).encode("utf-8"), env=env, timeout=300)

    def test_symbols_the_spec_uses_pass_and_the_rules_still_read_them(self):
        rate = str(self.root / "src" / "rate.py")       # read in cp1252, ρ became surrogates the parser refused
        source = "class Rate:\n    def __init__(self, rho):\n        self.rho = rho  # ρ, as the S3 writes it\n"
        self.assertAllowed(self.gate_in_code_page({"file_path": rate, "content": source}, "Write"))
        self.assertAllowed(self.gate_in_code_page({"file_path": rate, "old_string": "x", "new_string": "# ℛ ℬ Γ ρ"}))
        clock = str(self.root / "src" / "clock.py")
        self.assertDenied(self.gate_in_code_page({"file_path": clock, "content": OS1_SOURCE + "# ρ\n"}, "Write"), "OS-1")


class GitSpellings(Reach21):
    """git.exe, Git and a path to git are git to every rule; the tag rules read git -C <repo>."""

    def test_every_spelling_of_git_is_judged(self):
        install(self.root)
        r = self.r
        self.each_denied(["Git commit --no-verify -m x", "git.exe commit -n -m x", "GIT.EXE -C . commit --no-verify -m x",
                          '"C:/Program Files/Git/cmd/git.exe" commit --no-verify -m x'], "never skips")
        self.each_denied(["Git config core.hooksPath x"], "install-gates.py")
        self.each_denied(["Git rebase main", "/usr/bin/git rebase main"], "git merge --no-ff")
        self.each_denied([f"& 'C:/Program Files/Git/cmd/git.exe' -C '{r}' rebase main"], "git merge --no-ff",
                         tool="PowerShell")
        self.each_allowed(['git commit -m "a Git config note"', "cat tools/git.exe.md"])

    def test_the_tag_rules_read_git_dash_c(self):
        r = self.r
        self.each_denied([f'git -C "{r}" tag k7-pass-1', f'Git.exe -C "{r}" tag k7-pass-1'], "k7-verdict-1.json")
        self.each_denied([f'git -C "{r}" tag seal-1', f"git.exe tag seal-2"], "seal.py apply")
        cfg_path = self.root / ".metaframework" / "project.json"
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
        cfg_path.write_text(json.dumps({**cfg, "pipelinegate_command": "python pg.py"}), encoding="utf-8")
        self.each_denied([f'git -C "{r}" tag closed-by-owner-2', f'Git -C "{r}" tag -a closed-by-owner-2 -m ok'],
                         "k7-verdict-2.json does not exist")
        self.each_allowed([f'git -C "{r}" tag -l "k7-pass-*"', f'git -C "{r}" tag -d closed-by-owner-2'])


class CommitAll(Reach21):
    """git commit -a stages as it commits, after the checks have read the index."""

    def test_committing_with_dash_a_is_refused(self):
        install(self.root)
        self.each_denied(["git commit -a -m x", "git commit -am x", "git commit --all -m x", "Git commit -qa -m x",
                          f'git -C "{self.r}" commit -a -m x'], "stage with git add in one call")
        self.each_allowed(['git commit -m "commit -a is refused"', "git commit -m x", "git commit --amend -m x"])


class LandingVerbs(Reach21):
    """tar -x, Expand-Archive, rsync and find -delete write, or remove, everything beneath where they land."""

    def test_unpacking_syncing_or_sweeping_into_the_frozen_folder_is_refused(self):
        self.each_denied(["tar -xf drop.tar -C governance/S3", "tar xzf drop.tgz --directory=governance/S3",
                          "cd governance/S3 && tar -xf ../../drop.tar", "rsync -a docs/ governance/S3/",
                          "rsync -avt docs/x.md governance/S3", "find governance/S3 -name '*.md' -delete",
                          "find governance -delete"], "frozen")
        self.each_denied(["Expand-Archive drop.zip -DestinationPath governance/S3",
                          "Expand-Archive -Path drop.zip governance/S3"], "frozen", tool="PowerShell")
        self.each_denied(["tar -xf drop.tar", "find . -name '*.pyc' -delete"], "name the files you mean")

    def test_reading_out_of_it_passes(self):
        self.each_allowed(["tar -czf /tmp/s3.tgz governance/S3", "rsync -a governance/S3/ /tmp/s3/",
                           "find governance/S3 -name '*.md'", "tar -tf drop.tar", "find docs -name '*.tmp' -delete",
                           "tar -xf drop.tar -C docs/unpacked"])
        self.each_allowed(["Expand-Archive drop.zip -DestinationPath docs/unpacked"], tool="PowerShell")

    def test_a_builder_unpacks_nothing_into_the_machinery_and_the_seal_holds(self):
        self.each_denied(["tar -xf drop.tar -C tools", "rsync -a docs/ .claude/"], "may not write", **self.BUILDER)
        (self.root / "src").mkdir(exist_ok=True)
        (self.root / "src" / "a.py").write_text("A = 1\n", encoding="utf-8")
        git(self.root, "add", "src/a.py")
        git(self.root, "commit", "-q", "-m", "library")
        git(self.root, "tag", "seal-1")
        self.each_denied(["tar -xf drop.tar -C src", "find src -name '*.py' -delete", "rsync -a --delete docs/ src/"],
                         "sealed at seal-1")


class MergesUnderRd32(Reach21):
    """RD-32: a step closes on the gates. A merge needs no verdict for its tree; the newest round must not block. From
    2.8.0 a checkpoint never does, and the final review does until the seal."""

    def verdict(self, n: int, verdict: str, drift: int = 8, kind: str = "") -> None:
        sha = git(self.root, "rev-parse", "HEAD").stdout.decode().strip()
        (self.root / "INSTRUMENTS" / f"k7-verdict-{n}.json").write_text(json.dumps({
            "round": n, "verdict": verdict, "drift_score": {"value": drift, "basis": []},
            "preflight": {"structure_check": {"status": "pass", "violations": []}},
            "reviewed": {"commit_sha": sha, "tree_sha": "0" * 40, **({"kind": kind} if kind else {})}}),
            encoding="utf-8")

    def test_a_merge_waits_only_on_a_round_that_blocks(self):
        self.each_allowed(["git merge --no-ff side"])                      # no round yet
        self.verdict(1, "PASS")
        self.each_allowed(["git merge --no-ff side", f'git -C "{self.r}" merge --no-ff side'])   # an older tree
        self.verdict(2, "RETURN", 5)
        self.each_denied(["git merge --no-ff side", "Git merge --no-ff side", f'git -C "{self.r}" merge --no-ff side'],
                         "verdict 2 is RETURN", "seal.py apply")
        git(self.root, "tag", "closed-by-owner-2")
        self.each_allowed(["git merge --no-ff side"])
        git(self.root, "commit", "-q", "--allow-empty", "-m", "the next stretch")
        self.verdict(3, "PASS", 6)
        self.each_denied(["git merge --no-ff side"], "drift score 6 is below 7")

    def test_a_checkpoint_holds_no_merge_and_the_final_review_holds_until_the_seal(self):
        """2.8.0 (roster v0.14): a checkpoint gets one fix pass, with no re-check, so it holds nothing; the final review
        holds merges until the seal, or until the owner orders work on it."""
        self.verdict(1, "RETURN", 5, "checkpoint")
        self.each_allowed(["git merge --no-ff side"])
        git(self.root, "commit", "-q", "--allow-empty", "-m", "the build goes on")
        self.verdict(2, "RETURN", 5, "final")
        self.each_denied(["git merge --no-ff side"], "Nothing is worked between the final review and the seal")
        git(self.root, "tag", "owner-round-2")
        self.each_allowed(["git merge --no-ff side"])
        git(self.root, "tag", "-d", "owner-round-2")
        git(self.root, "tag", "seal-1")
        self.each_allowed(["git merge --no-ff side"])

    def test_the_sealed_build_merges_into_main_whatever_mains_state_says(self):
        """2.8.0: LedgerCore V2's seal-to-main merge had no passing route (31 Oct 2026). main's STATE.json says phase 4
        and its newest round, off the sealed line, is open; the merged ref is the seal itself. And a quoted -m message
        is one word."""
        git(self.root, "checkout", "-q", "-b", "phase4")
        (self.root / "src" / "sealed.py").write_text("A = 1\n", encoding="utf-8")
        git(self.root, "add", "-A")
        git(self.root, "commit", "-q", "-m", "the library")
        git(self.root, "tag", "seal-1")
        git(self.root, "checkout", "-q", "main")
        git(self.root, "commit", "-q", "--allow-empty", "-m", "main moves on")
        self.verdict(1, "RETURN", 5)
        git(self.root, "add", "-A")
        git(self.root, "commit", "-q", "-m", "main's open round, which the seal does not descend from")
        self.each_allowed(['git merge --no-ff -m "seal-1: merge phase4 into main" phase4', "git merge --no-ff phase4"])
        self.each_denied(["git merge --no-ff side"], "verdict 1 is RETURN")


if __name__ == "__main__":
    unittest.main()
