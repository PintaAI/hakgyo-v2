"""Generates the voiceover, one clip per storyboard segment.

Usage: python3 voiceover.py [--project <dir>] [--voice <name|id>] [--only id1,id2]

The voice comes from <project>/project.json ("voice"), default ElevenLabs Jessica:
  {"voice": {"provider": "elevenlabs", "voice": "jessica"}}
  {"voice": {"provider": "gemini", "model": "gemini-3.8-flash-tts", "voice": "Leda",
             "style": "warm, friendly and clear, like a product tutorial presenter"}}

Clips are cached in <project>/vo/ by a hash of everything that shapes the audio, so only
edited lines are generated again. Writes vo_timing.json with each clip's trimmed
duration and the start/end of every word (for callouts and captions).

Keys come from the environment or apps/web/.env in this repository (never copied):
ELEVENLABS_API_KEY; for Gemini GEMINI_API_KEY plus OPENAI_API_KEY (Whisper gives word
times, because Gemini speech has no timestamps). On the ElevenLabs free plan only
premade voices work over the API.
"""
import argparse
import base64
import difflib
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request

import projectdir

ROOT = projectdir.resolve()
ENV_FILE = os.path.join(projectdir.ENGINE, "../../../apps/web/.env")  # the web app's .env
SR = 44100
TRIM = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse"
TARGET_LUFS = -18.0

# --- ElevenLabs --------------------------------------------------------------
EL_MODEL = "eleven_v4"
EL_VOICES = {"jessica": "cgSgspJ2msm6clMCkdW9", "laura": "FGY2WhTYpPnrIDTdsKH5", "sarah": "EXAVITQu4vr4xnSDxMaL", "alice": "Xb7hH8MSUJpSbSDYk0k2"}
EL_SETTINGS = {"stability": 0.5, "similarity_boost": 0.8, "style": 0.25, "use_speaker_boost": True, "speed": 1.05}


def env_value(name):
    if os.environ.get(name):
        return os.environ[name]
    for line in open(ENV_FILE):
        if line.startswith(name + "="):
            return line.split("=", 1)[1].strip().strip("'\"")
    sys.exit(f"{name} is not set")


def elevenlabs_tts(text, voice_id, out_mp3):
    body = {"text": text, "model_id": EL_MODEL, "language_code": "id", "voice_settings": EL_SETTINGS}
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_128",
        data=json.dumps(body).encode(),
        headers={"xi-api-key": env_value("ELEVENLABS_API_KEY"), "Content-Type": "application/json"},
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


def elevenlabs_words(path):
    """Word start/end times measured from the first spoken character."""
    al = json.load(open(path[:-4] + ".json"))
    chars, starts, ends = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    first = next(i for i, ch in enumerate(chars) if ch.strip())
    t0 = starts[first]
    out, cur = [], None
    for ch, s, e in zip(chars, starts, ends):
        if ch.isspace():
            if cur:
                out.append(cur)
                cur = None
            continue
        if cur is None:
            cur = {"w": "", "s": round(s - t0, 3)}
        cur["w"] += ch
        cur["e"] = round(e - t0, 3)
    if cur:
        out.append(cur)
    return out


# --- Gemini speech + Whisper timing ------------------------------------------
def measure_lufs(wav):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", "-", "-af", "ebur128", "-f", "null", "-"], input=wav, capture_output=True)
    found = re.findall(r"I:\s+(-?\d+\.\d+) LUFS", r.stderr.decode())
    return float(found[-1]) if found else TARGET_LUFS


def gemini_tts(text, cfg, out_mp3):
    """Speech through the Interactions API. The text field is read verbatim, so the
    delivery goes in a speech_metadata annotation, never in the text."""
    body = {
        "model": cfg["model"],
        "input": [{"type": "user_input", "content": [{"type": "text", "text": text, "annotations": [{"type": "speech_metadata", "style": cfg["style"]}]}]}],
        "response_format": {"type": "audio"},
        "generation_config": {"speech_config": [{"voice": cfg["voice"]}]},
    }
    for attempt in range(6):
        req = urllib.request.Request(
            "https://generativelanguage.googleapis.com/v1beta/interactions",
            data=json.dumps(body).encode(),
            headers={"x-goog-api-key": env_value("GEMINI_API_KEY"), "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=180) as res:
                data = json.load(res)
            blob = next(c["data"] for s in data["steps"] for c in s.get("content", []) if "data" in c)
            break
        except urllib.error.HTTPError as e:
            detail = e.read().decode()[:300]
            if e.code in (429, 500, 503) and attempt < 5:
                wait = 30 * (attempt + 1)
                print(f"  Gemini {e.code}, waiting {wait}s")
                import time
                time.sleep(wait)
                continue
            sys.exit(f"Gemini {e.code}: {detail}")
    wav = base64.b64decode(blob)
    gain = max(-12.0, min(12.0, TARGET_LUFS - measure_lufs(wav)))  # even loudness from clip to clip
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", "-", "-af", f"volume={gain:.2f}dB", "-ac", "1", "-ar", str(SR), "-q:a", "3", out_mp3], input=wav, check=True)


def whisper_words(path):
    out = subprocess.run(
        ["curl", "-s", "-m", "120", "https://api.openai.com/v1/audio/transcriptions", "-H", f"Authorization: Bearer {env_value('OPENAI_API_KEY')}",
         "-F", f"file=@{path}", "-F", "model=whisper-1", "-F", "language=id", "-F", "response_format=verbose_json", "-F", "timestamp_granularities[]=word"],
        capture_output=True, check=True,
    ).stdout
    data = json.loads(out)
    if "words" not in data:
        sys.exit(f"Whisper failed: {str(data)[:300]}")
    return data["words"]


def norm(token):
    return re.sub(r"[^\w]", "", token.lower())


def align(script, heard):
    """Gives every word of the script a start/end time using the Whisper words.

    Whisper hears slightly different text (numbers become digits, names are respelled),
    so the two word lists are matched with a small Needleman-Wunsch alignment; script
    words with no match get times spread across the gap between their neighbours.
    """
    words = script.split()
    a = [norm(w) for w in words]
    b = [(norm(h["word"]), h["start"], h["end"]) for h in heard]
    n, m, GAP = len(a), len(b), -0.6

    def sim(x, y):
        if not x or not y:
            return -1.0
        r = difflib.SequenceMatcher(None, x, y).ratio()
        return 2 * r - 0.6 if r >= 0.5 else -1.0

    score = [[0.0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        score[i][0] = i * GAP
    for j in range(1, m + 1):
        score[0][j] = j * GAP
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            score[i][j] = max(score[i - 1][j - 1] + sim(a[i - 1], b[j - 1][0]), score[i - 1][j] + GAP, score[i][j - 1] + GAP)
    start, end = [None] * n, [None] * n
    i, j = n, m
    while i > 0 and j > 0:
        s = sim(a[i - 1], b[j - 1][0])
        if score[i][j] == score[i - 1][j - 1] + s and s > 0:
            start[i - 1], end[i - 1] = b[j - 1][1], b[j - 1][2]
            i, j = i - 1, j - 1
        elif score[i][j] == score[i - 1][j] + GAP:
            i -= 1
        else:
            j -= 1
    total = b[-1][2] if b else 0.0
    k = 0
    while k < n:  # fill runs of unmatched words from their neighbours, by length
        if start[k] is not None:
            k += 1
            continue
        run = k
        while run < n and start[run] is None:
            run += 1
        t0 = end[k - 1] if k else 0.0
        t1 = start[run] if run < n else total
        weights = [max(1, len(words[x])) for x in range(k, run)]
        acc = t0
        for x, wgt in zip(range(k, run), weights):
            step = (t1 - t0) * wgt / sum(weights)
            start[x], end[x] = acc, acc + step
            acc += step
        k = run
    first = start[0] if n else 0.0
    return [{"w": words[x], "s": round(start[x] - first, 3), "e": round(max(end[x], start[x]) - first, 3)} for x in range(n)]


# --- shared ------------------------------------------------------------------
def trimmed_duration(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-af", TRIM, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], check=True, capture_output=True).stdout
    return len(raw) / 2 / SR


def load_voice(cli_voice):
    cfg = {}
    pj = os.path.join(ROOT, "project.json")
    if os.path.exists(pj):
        cfg = json.load(open(pj)).get("voice", {})
    cfg.setdefault("provider", "elevenlabs")
    if cfg["provider"] == "elevenlabs":
        name = cli_voice or cfg.get("voice", "jessica")
        cfg["voice_id"] = EL_VOICES.get(name, name)
    else:
        cfg.setdefault("model", "gemini-3.8-flash-tts")
        cfg.setdefault("voice", "Leda")
        cfg.setdefault("style", "warm, friendly and clear, like a product tutorial presenter, at a lively medium pace")
    return cfg


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default=None)
    ap.add_argument("--only", default="")
    args = ap.parse_args()
    cfg = load_voice(args.voice)
    only = set(filter(None, args.only.split(",")))
    os.makedirs(os.path.join(ROOT, "vo"), exist_ok=True)
    sb = json.load(open(os.path.join(ROOT, "storyboard.json")))
    timing = {}
    for seg in sb["segments"]:
        text = seg["vo"]
        if cfg["provider"] == "elevenlabs":  # key unchanged, so existing clips stay valid
            key = hashlib.sha1(json.dumps([text, cfg["voice_id"], EL_MODEL, EL_SETTINGS]).encode()).hexdigest()[:12]
        else:
            key = hashlib.sha1(json.dumps([text, "gemini", cfg["model"], cfg["voice"], cfg["style"], TARGET_LUFS]).encode()).hexdigest()[:12]
        path = os.path.join(ROOT, "vo", f"{key}.mp3")
        sidecar = path[:-4] + (".json" if cfg["provider"] == "elevenlabs" else ".words.json")
        if not os.path.exists(path):
            if only and seg["id"] not in only:
                print("skip (not generated):", seg["id"])
                continue
            print("generating:", seg["id"])
            if cfg["provider"] == "elevenlabs":
                elevenlabs_tts(text, cfg["voice_id"], path)
            else:
                gemini_tts(text, cfg, path)
        if cfg["provider"] == "gemini" and not os.path.exists(sidecar):
            json.dump(align(text, whisper_words(path)), open(sidecar, "w"), ensure_ascii=False)
        word_list = elevenlabs_words(path) if cfg["provider"] == "elevenlabs" else json.load(open(sidecar))
        timing[seg["id"]] = {"file": os.path.relpath(path, ROOT), "dur": round(trimmed_duration(path), 3), "words": word_list}
    json.dump(timing, open(os.path.join(ROOT, "vo_timing.json"), "w"), ensure_ascii=False)
    total = sum(t["dur"] for t in timing.values())
    print(f"{len(timing)} clips, {total:.1f}s of speech")


if __name__ == "__main__":
    main()
