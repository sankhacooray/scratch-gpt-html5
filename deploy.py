#!/usr/bin/env python3
"""Publish the public wrapper page to the `gh-pages` branch of origin.

Only the wrapper (index.html) + CNAME are published — the app source lives on
the default branch and is bundled into the separate Apps Script project. Shallow-
clones gh-pages into a temp dir, wipes it, copies the site files, adds .nojekyll,
commits and pushes. Creates the gh-pages branch if it doesn't exist.

Run:  python3 deploy.py   (or: npm run deploy:pages)
"""
import os
import shutil
import subprocess
import sys
import tempfile

REPO_DIR = os.path.dirname(os.path.abspath(__file__))
SITE_FILES = ["index.html", "CNAME"]
BRANCH = "gh-pages"


def run(cmd, cwd=None, check=True):
    print("> " + " ".join(cmd))
    return subprocess.run(cmd, cwd=cwd, check=check)


def main():
    origin = subprocess.run(
        ["git", "-C", REPO_DIR, "remote", "get-url", "origin"],
        capture_output=True, text=True,
    )
    if origin.returncode != 0:
        sys.exit("No 'origin' remote configured. Add it, then re-run.")
    origin_url = origin.stdout.strip()

    tmp = tempfile.mkdtemp(prefix="ghpages-")
    try:
        cloned = subprocess.run(
            ["git", "clone", "--depth", "1", "--branch", BRANCH, origin_url, tmp]
        )
        if cloned.returncode != 0:
            # Branch doesn't exist yet — clone default and make an orphan branch.
            run(["git", "clone", "--depth", "1", origin_url, tmp])
            run(["git", "checkout", "--orphan", BRANCH], cwd=tmp)
            run(["git", "rm", "-rf", "."], cwd=tmp, check=False)

        # Wipe everything except .git
        for name in os.listdir(tmp):
            if name == ".git":
                continue
            path = os.path.join(tmp, name)
            shutil.rmtree(path) if os.path.isdir(path) else os.remove(path)

        # Copy the site files + disable Jekyll
        for fname in SITE_FILES:
            src = os.path.join(REPO_DIR, fname)
            if os.path.exists(src):
                shutil.copy2(src, os.path.join(tmp, fname))
            else:
                print("  (skip missing " + fname + ")")
        open(os.path.join(tmp, ".nojekyll"), "w").close()

        run(["git", "add", "-A"], cwd=tmp)
        committed = subprocess.run(
            ["git", "commit", "-m", "Deploy Scratch GPT wrapper"], cwd=tmp
        )
        if committed.returncode != 0:
            print("Nothing changed — gh-pages already up to date.")
            return
        run(["git", "push", "origin", BRANCH], cwd=tmp)
        print("\nPublished to gh-pages. Live shortly at https://scratchgpt.sankhacooray.com/")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
