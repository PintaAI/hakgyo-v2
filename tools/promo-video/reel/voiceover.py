"""Generates the Indonesian voiceover with ElevenLabs and lays it out as vo.wav.

Usage:
  python3 voiceover.py                     # generate missing lines, write vo_timing.js
  python3 voiceover.py --voice <voice_id>  # use another voice
  python3 voiceover.py --audition          # one sample line per candidate voice

Each line is cached in vo/ by a hash of (text, voice, model, settings), so
re-running only spends credits on lines that changed. The API key is read from
ELEVENLABS_API_KEY or apps/web/.env in this repository.

Free accounts can only use premade voices over the API ("Free users cannot use
library voices via the API"), so the native Indonesian voices from the Voice
Library need a paid plan. Premade voices are multilingual and speak Indonesian
with language_code="id".
"""
import argparse
import base64
import hashlib
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

import numpy as np
from scipy.io import wavfile

SR = 44100
B = 60 / 128
ROOT = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(ROOT, "../../../apps/web/.env")  # the web app's .env, never copied

MODEL = "eleven_v4"
# Premade female voices usable on the free plan.
VOICES = {
    "jessica": "cgSgspJ2msm6clMCkdW9",  # Playful, Bright, Warm
    "laura": "FGY2WhTYpPnrIDTdsKH5",  # Enthusiast, Quirky
    "sarah": "EXAVITQu4vr4xnSDxMaL",  # Mature, Reassuring, Confident
    "alice": "Xb7hH8MSUJpSbSDYk0k2",  # Clear, Engaging Educator
}
DEFAULT_VOICE = "jessica"
SETTINGS = {"stability": 0.4, "similarity_boost": 0.8, "style": 0.35, "use_speaker_boost": True, "speed": 1.1}

# (start beat, hold beat, text, anchors). Beats are design beats in reel.html.
# A line starts at `start`; if it runs past `hold`, reel.html holds the scene
# there so the voice is never sped up. Each anchor (beat, word) holds the
# scene before that beat until the word is spoken, so a card or label appears
# with the word that names it.
LINES = [
    (0.15, 2.9, "Materi pakai PDF? Kuis manual pakai Google Form? Belajar di grup WhatsApp?", [(1, "Kuis"), (2, "Belajar")]),
    (4.1, 6.0, "Ribet nggak sih?", []),
    (8.2, 13.0, "Sekarang, kelola semua di satu tempat.", []),
    (14.2, 17.4, "Hakgyo!", []),
    (18.2, 25.4, "Learning platform yang nyediain semuanya di satu tempat. Mulai dari kurikulum, jadwal, grouping,",
     [(20.5, "kurikulum"), (22.5, "jadwal"), (24, "grouping")]),
    (26.3, 35.4, "sampai aplikasi belajar.", []),
    (36.3, 43.4, "Latihan ujian masih PBT? Digitalisasi sistem tryout dengan Hakgyo.", [(37, "Digitalisasi")]),
    (44.2, 51.8, "Integrasi berbagai tools, kayak Zoom, ChatGPT, Claude, fitur AI, dan WhatsApp.",
     [(46, "Zoom"), (47.5, "ChatGPT"), (49, "fitur"), (50.5, "WhatsApp")]),
    (56.2, 59.6, "Siap pindahin kelas? Hubungi kami sekarang.", [(58.6, "Hubungi")]),
    (60.4, 63.5, "Hakgyo.", []),
]


def api_key():
    if os.environ.get("ELEVENLABS_API_KEY"):
        return os.environ["ELEVENLABS_API_KEY"]
    for line in open(ENV_FILE):
        if line.startswith("ELEVENLABS_API_KEY="):
            return line.split("=", 1)[1].strip().strip("'\"")
    sys.exit("ELEVENLABS_API_KEY is not set")


def tts(text, voice_id, out_mp3):
    body = {"text": text, "model_id": MODEL, "language_code": "id", "voice_settings": SETTINGS}
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_128",
        data=json.dumps(body).encode(),
        headers={"xi-api-key": api_key(), "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as res:
            data = json.load(res)
    except urllib.error.HTTPError as e:
        sys.exit(f"ElevenLabs {e.code}: {e.read().decode()[:400]}")
    with open(out_mp3, "wb") as f:
        f.write(base64.b64decode(data["audio_base64"]))
    with open(out_mp3[:-4] + ".json", "w") as f:
        json.dump(data.get("alignment"), f)


def decode(path):
    """Decodes to mono float at SR with leading and trailing silence trimmed."""
    filters = ["silenceremove=start_periods=1:start_threshold=-45dB", "areverse",
               "silenceremove=start_periods=1:start_threshold=-45dB", "areverse"]
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-af", ",".join(filters), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def word_time(path, text, word):
    """Seconds from the first spoken character to `word`, from the TTS alignment."""
    al = json.load(open(path[:-4] + ".json"))
    starts = al["character_start_times_seconds"]
    first = next(i for i, ch in enumerate(al["characters"]) if ch.strip())
    i = "".join(al["characters"]).lower().index(word.lower())
    return round(starts[i] - starts[first], 3)


def clip_path(text, voice_id):
    key = hashlib.sha1(json.dumps([text, voice_id, MODEL, SETTINGS]).encode()).hexdigest()[:12]
    return os.path.join(ROOT, "vo", f"{key}.mp3")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default=DEFAULT_VOICE, help="name from VOICES or a voice id")
    ap.add_argument("--audition", action="store_true")
    args = ap.parse_args()
    os.makedirs(os.path.join(ROOT, "vo"), exist_ok=True)

    if args.audition:
        line = LINES[2][2]
        for name, vid in VOICES.items():
            path = clip_path(line, vid)
            if not os.path.exists(path):
                tts(line, vid, path)
            out = os.path.join(ROOT, "vo", f"audition-{name}.mp3")
            subprocess.run(["cp", path, out], check=True)
            print("wrote", out)
        return

    voice_id = VOICES.get(args.voice, args.voice)
    timing = []
    for start, hold, text, anchors in LINES:
        path = clip_path(text, voice_id)
        if not os.path.exists(path):
            print("generating:", text)
            tts(text, voice_id, path)
        dur = len(decode(path)) / SR
        print(f"beat {start:5.2f}  {dur:4.2f}s  {text}")
        marks = [{"at": beat, "sec": word_time(path, text, word)} for beat, word in anchors]
        timing.append({"start": start, "holdAt": hold, "dur": round(dur, 3), "file": os.path.relpath(path, ROOT), "text": text, "anchors": marks})
    with open(os.path.join(ROOT, "vo_timing.js"), "w") as f:
        f.write("window.VO_LINES = " + json.dumps(timing, ensure_ascii=False, indent=1) + ";\n")
    print("wrote vo_timing.js; now run render.mjs and audio.py")


if __name__ == "__main__":
    main()
