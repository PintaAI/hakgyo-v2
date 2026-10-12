#!/usr/bin/env bash
# Vercel Ignored Build Step, run from the project root (apps/web). Exit 0 skips
# the deployment; exit 1 builds it.
#
# Builds only when the web app or what it is built from changed since the last
# successful deployment. When that commit is unknown or missing from Vercel's
# shallow clone, `git diff` fails and the deployment builds.
base="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"
if git diff --quiet "$base" HEAD -- . ../../packages ../../package.json ../../bun.lock ../../turbo.json; then
  echo "No web changes since ${base}; skipping the deployment."
  exit 0
fi
exit 1
