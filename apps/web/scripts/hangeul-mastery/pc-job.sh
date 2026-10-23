#!/bin/bash
# Runs on the GPU PC inside the persistent gpu-run workspace "hakgyo-video" (sent by ./voxcpm.ts), whose
# /data/tools/tts Python environment has VoxCPM2 and /data/tools/whisper has faster-whisper. It speaks the lines in
# hangeul-mastery/<job>/lines.json with hakgyo-video's render/tts.py (cloning hangeul-mastery/<job>/voice-ref.wav
# when it is there), optionally transcribes the results in Korean with render/whisper.py as a check, and packs
# everything into hangeul-mastery/result-<job>.tgz. The job always exits 0 so the results and the log come back;
# the TTS exit code is in the archive's `status` file.
#
#   bash hangeul-mastery/pc-job.sh <job> <cfg> <steps> <whisper 0|1>
set -uo pipefail
JOB="$1"; CFG="$2"; STEPS="$3"; WHISPER="${4:-1}"
DIR="hangeul-mastery/$JOB"
TOOLS=/data/tools
export HF_HOME=/data/cache/hf TORCH_HOME=/data/cache/torch
status=0
mkdir -p "$DIR/out"
# results of earlier jobs that were never collected
find hangeul-mastery -maxdepth 1 -name 'result-*.tgz' -mmin +180 -delete 2>/dev/null

REF=""
[ -f "$DIR/voice-ref.wav" ] && REF="$DIR/voice-ref.wav"
"$TOOLS/tts/bin/python" render/tts.py --in "$DIR/lines.json" --out-dir "$DIR/out" --ref "$REF" --cfg "$CFG" --steps "$STEPS" || status=$?

if [ "$WHISPER" = 1 ] && compgen -G "$DIR/out/*.wav" >/dev/null; then
  site="$("$TOOLS/whisper/bin/python" -c 'import site; print(site.getsitepackages()[0])')"
  LD_LIBRARY_PATH="$site/nvidia/cublas/lib:$site/nvidia/cudnn/lib:${LD_LIBRARY_PATH:-}" \
    "$TOOLS/whisper/bin/python" render/whisper.py --lang ko --out "$DIR/out/whisper.json" "$DIR"/out/*.wav \
    || echo "[hangeul] whisper check failed (clips are still returned)"
fi

echo "$status" > "$DIR/out/status"
tar -czf "hangeul-mastery/result-$JOB.tgz" -C "$DIR/out" .
rm -rf "$DIR"
exit 0
