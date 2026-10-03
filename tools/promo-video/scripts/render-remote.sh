#!/bin/bash
# Renders a project on the private GPU worker and leaves the video on that machine (its /output folder).
#   bash scripts/render-remote.sh [project]      (default: kurikulum)
# Only what the render needs is sent: the engine, the project's storyboard, clips, camera tracks,
# voiceover and assets. Cookies and state (auth-*.json, state.json) stay here.
set -euo pipefail
PROJECT="${1:-kurikulum}"
PKG="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/demo" "$STAGE/$PROJECT"
cp "$PKG/package.json" "$PKG/bun.lock" "$STAGE/"
for f in compose.html render.mjs make.mjs audio.py camera.py voiceover.py projectdir.py; do cp "$PKG/demo/$f" "$STAGE/demo/"; done
ln -s "$PKG/demo/assets" "$STAGE/demo/assets"
for f in project.json storyboard.json vo_timing.json; do [ -e "$PKG/$PROJECT/$f" ] && cp "$PKG/$PROJECT/$f" "$STAGE/$PROJECT/"; done
for d in clips vo; do [ -e "$PKG/$PROJECT/$d" ] && ln -s "$PKG/$PROJECT/$d" "$STAGE/$PROJECT/$d"; done
gpu-run --dir "$STAGE" --workspace "hakgyo-$PROJECT" -- \
  "bun install && rm -rf $PROJECT/parts && bun demo/make.mjs --project $PROJECT --jobs 8 --encoder nvenc && cp $PROJECT/hakgyo-$PROJECT.mp4 /output/"
