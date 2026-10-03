#!/usr/bin/env bash
# Compares Chrome flag sets for GPU rendering inside the worker container.
cd "$(dirname "$0")/.."
run() { local name="$1"; shift; echo; echo "### $name"; timeout 240 bun perf/profile.mjs "$@" 2>&1 | grep -E "chrome GPU|ms/frame|rror"; }

echo "== (environment check skipped)"

run "A baseline (CPU / SwiftShader)" --frames 40

export GALLIUM_DRIVER=d3d12 MESA_LOADER_DRIVER_OVERRIDE=d3d12
FLAGS="--ignore-gpu-blocklist --enable-gpu-rasterization"
run "B GPU: angle gl-egl + d3d12" --frames 40 --chrome-flags "--use-gl=angle --use-angle=gl-egl $FLAGS"
echo; echo PROBE_DONE
