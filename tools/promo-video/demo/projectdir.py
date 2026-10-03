"""Which video project a script works on.

A project is a folder with its own storyboard.json, clips/, vo/ and outputs (and an
optional project.json). The shared engine (this folder) supplies compose.html, assets
and the scripts. Pick one with `--project <dir>` or $PROMO_PROJECT; default `demo`.
A relative path is resolved from tools/promo-video.
"""
import os
import sys

ENGINE = os.path.dirname(os.path.abspath(__file__))
PACKAGE = os.path.dirname(ENGINE)


def resolve():
    args = sys.argv
    if "--project" in args:  # consume it so argparse in the caller never sees it
        i = args.index("--project")
        value = args[i + 1]
        del args[i : i + 2]
    else:
        value = os.environ.get("PROMO_PROJECT", "demo")
    return value if os.path.isabs(value) else os.path.join(PACKAGE, value)
