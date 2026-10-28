"""Speaks Hakgyo question bank TTS jobs with VoxCPM2 (OpenBMB, Apache-2.0 weights) on the GPU worker.
Adapted from /root/projects/hakgyo-video/render/tts.py; see docs/eps-question-generator.md section 6.

    python voxcpm_tts.py --jobs jobs.json --voices voices --out out

jobs.json: [{"id": "<job>", "clips": [{"key": "prompt" | "option-<n>", "lines": [{"voice": "M" | "F", "text": "..."}]}],
             "voices": {"M": "<voice description>", "F": "<voice description>"}}]
Writes out/<job>/<clip key>.wav (lines joined with a pause) and out/<job>/status.json ({"ok": true} or {"ok": false, "error"}).

Two fixed designed voices: each is made once from its description and kept as voices/voice-<M|F>.wav in the persistent
workspace, then every line clones that clip, so the voice stays the same across questions and runs. No real person's
voice is cloned. Each line has a fixed seed from its text, so the same text gives the same audio.
"""
import argparse
import hashlib
import json
import os
import re
import time
import traceback

import numpy as np
import soundfile as sf
import torch

ap = argparse.ArgumentParser()
ap.add_argument("--jobs", required=True)
ap.add_argument("--voices", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--cfg", type=float, default=2.0)
ap.add_argument("--steps", type=int, default=20)
ap.add_argument("--gap", type=float, default=0.7)
a = ap.parse_args()

from voxcpm import VoxCPM  # noqa: E402 (slow import)

jobs = json.load(open(a.jobs))
os.makedirs(a.voices, exist_ok=True)
t0 = time.time()
model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False, optimize=False)
sr = model.tts_model.sample_rate
print(f"[tts] VoxCPM2 loaded in {time.time() - t0:.0f} s, {sr} Hz, {len(jobs)} jobs", flush=True)


def seed_for(text: str, salt: str = ""):
    s = int(hashlib.sha1((salt + text).encode()).hexdigest()[:8], 16)
    torch.manual_seed(s)
    torch.cuda.manual_seed_all(s)


def speak(text: str, cue: str = "", **kw):
    """short exam lines in one piece; longer text cut at sentence ends (as in tts.py)"""
    pieces, cur = [], ""
    for sentence in re.findall(r"[^.!?。！？]+[.!?。！？]*\s*", text) or [text]:
        if cur and len(cur) + len(sentence) > 140:
            pieces.append(cur)
            cur = ""
        cur += sentence
    pieces.append(cur or text)
    out = []
    for n, piece in enumerate(pieces):
        wav = model.generate(text=(f"({cue})" if cue else "") + piece.strip(), cfg_value=a.cfg, inference_timesteps=a.steps, **kw)
        out.append(np.asarray(wav, dtype=np.float32))
        if n < len(pieces) - 1:
            out.append(np.zeros(int(0.2 * sr), dtype=np.float32))
    return np.concatenate(out)


def voice_ref(voice: str, description: str):
    """the designed voice's reference clip, made once from its description"""
    path = os.path.join(a.voices, f"voice-{voice}-{hashlib.sha1(description.encode()).hexdigest()[:8]}.wav")
    if not os.path.exists(path):
        sample = "안녕하세요. 오늘은 안전 교육이 있습니다. 작업장에 들어가기 전에 안전모를 꼭 쓰세요."
        seed_for(description, "ref")
        sf.write(path, speak(sample, description), sr)
        print(f"[tts] voice {voice} made from its description -> {path}", flush=True)
    return path


for job in jobs:
    job_dir = os.path.join(a.out, job["id"])
    os.makedirs(job_dir, exist_ok=True)
    try:
        refs = {voice: voice_ref(voice, description) for voice, description in job["voices"].items()}
        for clip in job["clips"]:
            parts = []
            for n, line in enumerate(clip["lines"]):
                seed_for(line["text"], line["voice"])
                parts.append(speak(line["text"], reference_wav_path=refs[line["voice"]]))
                if n < len(clip["lines"]) - 1:
                    parts.append(np.zeros(int(a.gap * sr), dtype=np.float32))
            sf.write(os.path.join(job_dir, f"{clip['key']}.wav"), np.concatenate(parts), sr)
        json.dump({"ok": True}, open(os.path.join(job_dir, "status.json"), "w"))
        print(f"[tts] job {job['id']} done", flush=True)
    except Exception as error:  # one bad job must not stop the others
        traceback.print_exc()
        json.dump({"ok": False, "error": str(error)[:500]}, open(os.path.join(job_dir, "status.json"), "w"))
