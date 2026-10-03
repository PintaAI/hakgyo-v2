#!/usr/bin/env bash
# Verifies a finished render in place, so the video itself never has to be copied anywhere.
# Writes demo/verify/report.txt (streams, loudness) and two small contact sheets:
#   sheet-even.jpg  12 frames spread evenly over the video
#   sheet-times.jpg frames at the times given as arguments (e.g. callout moments)
# Usage: bash demo/perf/verify-render.sh [video] [seconds ...]
cd "$(dirname "$0")/.."
V=${1:-hakgyo-demo.mp4}; shift
mkdir -p verify && rm -f verify/*
{
  echo "== streams"
  ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate -show_entries format=duration,size -of compact "$V"
  echo "== loudness (target about -14 LUFS)"
  ffmpeg -hide_banner -nostats -i "$V" -vn -af ebur128 -f null - 2>&1 | grep -E "^\s+(I|LRA):" | tail -2
} > verify/report.txt
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V")
R=$(awk "BEGIN{print 12/$D}")
ffmpeg -v error -y -i "$V" -vf "fps=$R,scale=480:-1,tile=4x3" -frames:v 1 verify/sheet-even.jpg
i=0
for t in "$@"; do ffmpeg -v error -y -ss "$t" -i "$V" -frames:v 1 -vf scale=480:-1 "verify/t$(printf %02d $i).jpg"; i=$((i + 1)); done
if [ "$i" -gt 0 ]; then
  ffmpeg -v error -y -framerate 1 -i verify/t%02d.jpg -vf "tile=3x3" -frames:v 1 verify/sheet-times.jpg
  rm -f verify/t[0-9][0-9].jpg
fi
cat verify/report.txt
