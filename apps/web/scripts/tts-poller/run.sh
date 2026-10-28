#!/bin/bash
# Runs on the GPU worker inside the persistent workspace "hakgyo-tts" (sent by poll.ts through gpu-run):
# installs VoxCPM2 once (as /root/projects/hakgyo-video/render/pc-job.sh does), speaks jobs.json, encodes
# every clip as mp3 and packs out/ into results.tgz for the VPS.
set -uo pipefail
TOOLS=/data/tools
export PATH="$TOOLS/bin:$TOOLS/uv:$PATH" HF_HOME=/data/cache/hf TORCH_HOME=/data/cache/torch
if [ ! -x "$TOOLS/uv/uv" ] && ! command -v uv >/dev/null; then
  mkdir -p "$TOOLS/uv" && curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="$TOOLS/uv" UV_NO_MODIFY_PATH=1 sh
fi
if [ ! -x "$TOOLS/tts/bin/python" ] || ! "$TOOLS/tts/bin/python" -c "import voxcpm, soundfile" 2>/dev/null; then
  echo "[tts] installing VoxCPM2 (its own environment: $TOOLS/tts)"
  UV_CACHE_DIR=/data/cache/uv uv venv --python 3.12 "$TOOLS/tts" && \
  UV_CACHE_DIR=/data/cache/uv uv pip install --python "$TOOLS/tts/bin/python" torch torchaudio --index-url https://download.pytorch.org/whl/cu124 --extra-index-url https://pypi.org/simple && \
  UV_CACHE_DIR=/data/cache/uv uv pip install --python "$TOOLS/tts/bin/python" voxcpm soundfile
fi
rm -rf out results.tgz && mkdir -p out voices
"$TOOLS/tts/bin/python" voxcpm_tts.py --jobs jobs.json --voices voices --out out
# 64 kbit/s mono mp3: small enough for offline bundles, clear for speech
find out -name '*.wav' | while read -r wav; do
  ffmpeg -v error -y -i "$wav" -ac 1 -ar 24000 -c:a libmp3lame -b:a 64k "${wav%.wav}.mp3" && rm "$wav"
done
tar -czf results.tgz out
