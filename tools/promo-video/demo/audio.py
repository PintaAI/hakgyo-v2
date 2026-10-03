"""Builds the demo soundtrack from timeline.json: a calm music bed that ducks
under the voiceover, the voiceover clips, and transition/UI sound effects."""
import json
import os
import subprocess

import numpy as np
from scipy import signal
from scipy.io import wavfile

import projectdir

os.chdir(projectdir.resolve())
SR = 44100
BPM = 96
BEAT = 60 / BPM
TL = json.load(open("timeline.json"))
DUR = TL["duration"]
N = int(SR * (DUR + 0.5))
rng = np.random.default_rng(11)


def t_arr(sec):
    return np.arange(int(sec * SR)) / SR


def add(buf, sig, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf) or i < 0:
        return
    sig = sig[: len(buf) - i]
    buf[i : i + len(sig)] += sig * gain


def lp(x, hz, order=2):
    return signal.sosfilt(signal.butter(order, hz, "low", fs=SR, output="sos"), x)


def hp(x, hz, order=2):
    return signal.sosfilt(signal.butter(order, hz, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi):
    return signal.sosfilt(signal.butter(2, [lo, hi], "band", fs=SR, output="sos"), x)


def sweep(x, f0, f1, kind="low", chunks=40):
    out = np.zeros_like(x)
    edges = np.linspace(0, len(x), chunks + 1).astype(int)
    for k in range(chunks):
        f = f0 * (f1 / f0) ** (k / max(chunks - 1, 1))
        sos = signal.butter(2, min(f, SR / 2.2), kind, fs=SR, output="sos")
        seg = x[max(0, edges[k] - 2048) : edges[k + 1]]
        out[edges[k] : edges[k + 1]] = signal.sosfilt(sos, seg)[-(edges[k + 1] - edges[k]) :]
    return out


def noise(sec):
    return rng.uniform(-1, 1, int(sec * SR))


def env(sec, a=0.003, d=0.2):
    t = t_arr(sec)
    return np.exp(-t / d) * np.clip(t / a, 0, 1)


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def saw(f, sec, det=0.0):
    ph = f * (1 + det) * t_arr(sec) + rng.random()
    return 2 * (ph - np.floor(ph + 0.5))


def reverb(x, sec=1.8, wet=0.3):
    ir = lp(noise(sec) * np.exp(-t_arr(sec) * (5 / sec)), 5000)
    ir /= np.sqrt(np.sum(ir**2))
    return x * (1 - wet) + signal.fftconvolve(x, ir)[: len(x)] * wet * 0.6


# ---------------- music bed ----------------
# Cmaj7 - Am7 - Fmaj7 - G6, two bars each
chords = [(48, [64, 67, 71, 72]), (45, [64, 67, 69, 72]), (41, [65, 69, 72, 76]), (43, [62, 67, 71, 76])]
music, drums = np.zeros(N), np.zeros(N)


def pad(notes, sec):
    s = np.zeros(int(sec * SR))
    for m in notes:
        for d in (-0.005, 0, 0.005):
            s += saw(hz(m), sec, d)
    t = t_arr(sec)
    return lp(s, 1400) * np.clip(t / 0.6, 0, 1) * np.clip((sec - t) / 0.6, 0, 1) * 0.025


def keys(m, sec=0.9):
    t = t_arr(sec)
    s = np.sin(2 * np.pi * hz(m) * t) + 0.35 * np.sin(4 * np.pi * hz(m) * t) + 0.12 * np.sin(6 * np.pi * hz(m) * t)
    return s * env(sec, 0.004, 0.35) * 0.11


def kick():
    t = t_arr(0.4)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(48 + 70 * np.exp(-t * 30)) / SR) * env(0.4, 0.001, 0.16) * 1.8) * 0.55


def hat(sec=0.05):
    return hp(noise(sec), 8000, 4) * env(sec, 0.0005, 0.012) * 0.22


def rim():
    return bp(noise(0.08), 1500, 5000) * env(0.08, 0.0005, 0.02) * 0.35


K = kick()
bars = int(np.ceil(DUR / (4 * BEAT))) + 1
arp = [0, 2, 1, 3, 2, 1, 3, 2]
for bar in range(bars):
    root, notes = chords[(bar // 2) % 4]
    t0 = bar * 4 * BEAT
    if bar % 2 == 0:
        add(music, pad(notes, 8 * BEAT + 0.6), t0)
        add(music, lp(saw(hz(root - 12), 8 * BEAT) * env(8 * BEAT, 0.02, 3.0), 300) * 0.06, t0)
    for e in range(8):
        if (bar + e) % 3 != 2:
            add(music, keys(notes[arp[e]] + 12), t0 + e * BEAT / 2, 0.8)
    if 2 <= bar:
        for b in range(4):
            if b in (0, 2):
                add(drums, K, t0 + b * BEAT)
            if b in (1, 3):
                add(drums, rim(), t0 + b * BEAT, 0.6)
            for s in range(2):
                add(drums, hat(), t0 + b * BEAT + s * BEAT / 2 + BEAT / 4, 0.8)
music = reverb(music, 2.2, 0.35)

# ---------------- voiceover ----------------
TRIM = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse"
vo = np.zeros(N)
for seg in TL["segments"]:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", seg["file"], "-af", TRIM, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         check=True, capture_output=True).stdout
    add(vo, np.frombuffer(raw, np.float32).astype(np.float64), seg["voAt"])
vo = hp(vo, 90)
vo /= np.max(np.abs(vo)) / 0.9
vo = np.tanh(vo * 1.5) / np.tanh(1.5)

# ---------------- sfx ----------------
def s_whoosh():
    sec = 0.6
    t = t_arr(sec)
    return sweep(noise(sec), 400, 5000) * np.sin(np.pi * t / sec) ** 2 * 0.35


def s_swipe():
    sec = 0.3
    t = t_arr(sec)
    return sweep(noise(sec), 1500, 7000, "high", 16) * np.sin(np.pi * t / sec) ** 2 * 0.18


def s_pop():
    sec = 0.16
    f = 520 + 700 * (1 - np.exp(-t_arr(sec) * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(sec, 0.001, 0.045) * 0.35


def s_tick():
    sec = 0.04
    return np.sin(2 * np.pi * 2200 * t_arr(sec)) * env(sec, 0.0003, 0.007) * 0.3


def s_impact():
    sec = 0.9
    t = t_arr(sec)
    boom = np.sin(2 * np.pi * np.cumsum(40 + 70 * np.exp(-t * 18)) / SR) * env(sec, 0.001, 0.28)
    return reverb(np.tanh(boom * 1.4 + lp(noise(sec), 2500) * env(sec, 0.0005, 0.05) * 0.6) * 0.5, 1.0, 0.25)


def s_boom():
    sec = 2.4
    t = t_arr(sec)
    sub = np.sin(2 * np.pi * np.cumsum(30 + 80 * np.exp(-t * 9)) / SR) * env(sec, 0.001, 0.9)
    return reverb(np.tanh(sub * 1.3 + lp(noise(sec), 4000) * env(sec, 0.0005, 0.1) * 0.6), 2.2, 0.35) * 0.7


def s_shimmer():
    sec = 1.4
    out = np.zeros(int(sec * SR))
    for k, m in enumerate([84, 88, 91, 95, 96]):
        add(out, np.sin(2 * np.pi * hz(m) * t_arr(sec)) * env(sec, 0.002, 0.3), k * 0.05)
    return reverb(out * 0.08, 1.4, 0.4)


bank = {"whoosh": s_whoosh, "swipe": s_swipe, "pop": s_pop, "tick": s_tick, "impact": s_impact, "boom": s_boom, "shimmer": s_shimmer}
fx = np.zeros(N)
for c in TL["sfx"]:
    add(fx, bank[c["type"]](), c["t"] - (0.25 if c["type"] == "whoosh" else 0), c["gain"])

# ---------------- mix ----------------
level = signal.sosfilt(signal.butter(1, 4, "low", fs=SR, output="sos"), np.abs(vo))
gate = np.clip(level / 0.04, 0, 1)
bed = (music * 0.5 + drums * 0.35) * (1 - 0.6 * gate)
mix = bed + fx * 0.8 + vo * 1.0
fade = np.ones(N)
fi = int((DUR - 2.5) * SR)
fade[fi:] = np.clip(np.linspace(1, 0, N - fi), 0, 1) ** 1.5
fade[: int(0.3 * SR)] = np.linspace(0, 1, int(0.3 * SR))
mix *= fade
st = np.stack([mix + np.roll(bed, 280) * 0.05, mix + np.roll(bed, 470) * 0.05], 1)
st = np.tanh(st * 1.1) / np.tanh(1.1)
st /= np.max(np.abs(st)) / 0.92
wavfile.write("soundtrack.wav", SR, (st * 32767).astype(np.int16))
print(f"ok {N / SR:.1f}s")
