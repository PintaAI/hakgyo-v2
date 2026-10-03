"""Synthesises the reel soundtrack: a 128 BPM track plus SFX from cues.json."""
import json
import os
import subprocess
import numpy as np
from scipy import signal
from scipy.io import wavfile

os.chdir(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
BPM = 128
BEAT = 60 / BPM
cues = json.load(open("cues.json"))
DUR = cues["duration"]
N = int(SR * (DUR + 0.05))
rng = np.random.default_rng(7)


def b(n):
    return n * BEAT


def t_arr(sec):
    return np.arange(int(sec * SR)) / SR


def add(buf, sig, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf):
        return
    sig = sig[: len(buf) - i]
    if sig.ndim == 1 and buf.ndim == 2:
        sig = np.stack([sig, sig], 1)
    buf[i : i + len(sig)] += sig * gain


def lp(x, hz, order=2):
    return signal.sosfilt(signal.butter(order, hz, "low", fs=SR, output="sos"), x)


def hp(x, hz, order=2):
    return signal.sosfilt(signal.butter(order, hz, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def sweep_filter(x, f0, f1, kind="low", chunks=64):
    """Piecewise filter with a cutoff moving exponentially from f0 to f1."""
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


def saw(freq, sec, detune=0.0):
    t = t_arr(sec)
    ph = (freq * (1 + detune)) * t + rng.random()
    return 2 * (ph - np.floor(ph + 0.5))


def env(sec, a=0.003, d=0.2, curve=1.0):
    t = t_arr(sec)
    e = np.exp(-t / d) ** curve
    att = np.clip(t / a, 0, 1) if a > 0 else 1
    return e * att


def note_hz(n):
    return 440 * 2 ** ((n - 69) / 12)


def reverb(x, sec=1.6, wet=0.3, damp=4000):
    ir = noise(sec) * np.exp(-t_arr(sec) * (5 / sec))
    ir = lp(ir, damp)
    ir /= np.sqrt(np.sum(ir**2))
    y = signal.fftconvolve(x, ir)[: len(x)]
    return x * (1 - wet) + y * wet * 0.6


# ---------------- instruments ----------------
def kick(punch=1.0):
    sec = 0.45
    t = t_arr(sec)
    f = 45 + 120 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * env(sec, 0.001, 0.22)
    click = hp(noise(0.01), 3000) * np.linspace(1, 0, int(0.01 * SR)) * 0.4
    body[: len(click)] += click * punch
    return np.tanh(body * 2.2) * 0.9


def clap():
    sec = 0.3
    n = bp(noise(sec), 900, 4000)
    e = np.zeros(int(sec * SR))
    for off in (0, 0.011, 0.022):
        i = int(off * SR)
        seg = env(sec, 0.0005, 0.012 if off < 0.02 else 0.12)[: len(e) - i]
        e[i : i + len(seg)] += seg
    tone = np.sin(2 * np.pi * 190 * t_arr(sec)) * env(sec, 0.001, 0.05) * 0.4
    return (n * e + tone) * 0.7


def hat(open_=False):
    sec = 0.25 if open_ else 0.06
    return hp(noise(sec), 7000, 4) * env(sec, 0.0005, 0.09 if open_ else 0.015) * 0.5


def crash():
    sec = 2.2
    return hp(noise(sec), 4500, 2) * env(sec, 0.001, 0.7) * 0.5


def snare():
    sec = 0.22
    return (bp(noise(sec), 1500, 7000) * env(sec, 0.0008, 0.07) + np.sin(2 * np.pi * 210 * t_arr(sec)) * env(sec, 0.001, 0.04) * 0.5) * 0.6


def bass_note(midi, sec):
    s = saw(note_hz(midi), sec) + 0.5 * np.sin(2 * np.pi * note_hz(midi - 12) * t_arr(sec))
    return lp(s, 700) * env(sec, 0.004, sec * 0.7) * 0.55


def pluck(midi, sec=0.35):
    s = saw(note_hz(midi), sec, 0.004) + saw(note_hz(midi), sec, -0.004)
    return sweep_filter(s * env(sec, 0.002, 0.12), 6000, 700, chunks=8) * 0.18


def pad(midis, sec):
    s = np.zeros(int(sec * SR))
    for m in midis:
        for d in (-0.006, 0, 0.006):
            s += saw(note_hz(m), sec, d)
    s = lp(s, 1800)
    t = t_arr(sec)
    return s * np.clip(t / 0.05, 0, 1) * np.clip((sec - t) / 0.1, 0, 1) * 0.045


# ---------------- sfx ----------------
def sfx_impact():
    sec = 1.0
    t = t_arr(sec)
    boom = np.sin(2 * np.pi * np.cumsum(38 + 80 * np.exp(-t * 18)) / SR) * env(sec, 0.001, 0.3)
    hit = lp(noise(sec), 2500) * env(sec, 0.0005, 0.06)
    return reverb(np.tanh((boom * 1.2 + hit * 0.8) * 1.5) * 0.8, 1.0, 0.25)


def sfx_boom():
    sec = 2.5
    t = t_arr(sec)
    sub = np.sin(2 * np.pi * np.cumsum(30 + 90 * np.exp(-t * 10)) / SR) * env(sec, 0.001, 0.9)
    crack = lp(noise(sec), 5000) * env(sec, 0.0005, 0.12)
    return reverb(np.tanh((sub * 1.4 + crack * 0.7) * 1.3), 2.2, 0.35) * 0.9


def sfx_riser(sec):
    t = t_arr(sec)
    n = sweep_filter(noise(sec), 200, 9000, "low", 96)
    tone = np.sin(2 * np.pi * np.cumsum(200 * (8 ** (t / sec))) / SR) * 0.25
    return (n + tone) * (t / sec) ** 2.2 * 0.55


def sfx_whoosh(up=False):
    sec = 0.55
    t = t_arr(sec)
    n = noise(sec)
    n = sweep_filter(n, 300, 6000, "low", 40) if up else sweep_filter(n, 5000, 400, "low", 40)
    shape = np.sin(np.pi * np.clip(t / sec, 0, 1)) ** (1.5 if up else 2.5)
    if up:
        shape = (t / sec) ** 2 * np.exp(-np.clip(t - sec * 0.85, 0, None) * 30)
    return n * shape * 0.7


def sfx_swipe():
    sec = 0.28
    t = t_arr(sec)
    n = sweep_filter(noise(sec), 1200, 7000, "high", 20)
    return n * np.sin(np.pi * t / sec) ** 2 * 0.45


def sfx_glitch():
    sec = 0.16
    t = t_arr(sec)
    sq = np.sign(np.sin(2 * np.pi * rng.choice([180, 330, 560, 900]) * t))
    crush = np.round(noise(sec) * 3) / 3
    gate = (np.floor(t * 70) % 2 == 0).astype(float)
    return (sq * 0.3 + crush * 0.3) * gate * env(sec, 0.001, 0.08) * 0.6


def sfx_tick():
    sec = 0.05
    t = t_arr(sec)
    return (np.sin(2 * np.pi * 2400 * t) * 0.5 + hp(noise(sec), 5000) * 0.5) * env(sec, 0.0003, 0.008) * 0.5


def sfx_click():
    sec = 0.08
    t = t_arr(sec)
    return np.sin(2 * np.pi * 1400 * t) * env(sec, 0.0003, 0.012) * 0.6


def sfx_pop():
    sec = 0.18
    t = t_arr(sec)
    f = 500 + 900 * (1 - np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(sec, 0.001, 0.05) * 0.55


def sfx_clock():
    sec = 0.06
    return bp(noise(sec), 2500, 6000) * env(sec, 0.0003, 0.006) * 0.8


def sfx_ding():
    sec = 1.6
    t = t_arr(sec)
    s = sum(a * np.sin(2 * np.pi * f * t) for f, a in ((1568, 1), (2352, 0.5), (3136, 0.25), (4704, 0.1)))
    return reverb(s * env(sec, 0.001, 0.45) * 0.3, 1.5, 0.35)


def sfx_count():
    sec = 0.9
    out = np.zeros(int(sec * SR))
    for k in range(12):
        at = sec * (1 - (1 - k / 12) ** 2) * 0.9
        blip = np.sin(2 * np.pi * (900 + k * 60) * t_arr(0.03)) * env(0.03, 0.0005, 0.008)
        i = int(at * SR)
        out[i : i + len(blip)] += blip[: len(out) - i]
    return out * 0.4


def sfx_shimmer():
    sec = 1.2
    t = t_arr(sec)
    out = np.zeros(len(t))
    for k, m in enumerate([81, 84, 88, 91, 93, 96]):
        i = int(k * 0.04 * SR)
        s = np.sin(2 * np.pi * note_hz(m) * t_arr(sec)) * env(sec, 0.002, 0.25)
        out[i:] += s[: len(out) - i]
    return reverb(out * 0.12, 1.4, 0.4)


# ---------------- music ----------------
music = np.zeros(N)
drums = np.zeros(N)
side = np.ones(N)  # sidechain gain applied to bass/pad

chords = [(57, [69, 72, 76]), (53, [65, 69, 72]), (48, [67, 72, 76]), (55, [67, 71, 74])]  # Am F C G
arp_pat = [0, 1, 2, 1, 2, 0, 1, 2]


def duck(at, depth=0.75, rel=0.16):
    i = int(at * SR)
    t = t_arr(0.35)
    g = 1 - depth * np.exp(-t / rel * 3)
    j = min(N, i + len(g))
    side[i:j] = np.minimum(side[i:j], g[: j - i])


# Section markers in real beats, exported by reel.html (they move with holds).
M = cues["music"]
TOTAL = int(np.ceil(M["total"]))
K = kick()
for beat in range(TOTAL):
    at = b(beat)
    intro = beat < M["drop1"]
    build = M["build"] <= beat < M["drop2"]
    end = beat >= M["end"]
    # kick
    if (intro and beat < M["roll1"]) or (not intro and not build and not end) or (build and beat < M["roll2"]) or beat == M["end"]:
        add(drums, K, at, 0.95 if not intro else 0.8)
        duck(at)
    # hats and claps in the groove
    if not intro and not end and not (build and beat >= M["roll2"]):
        add(drums, hat(True), at + BEAT / 2, 0.24)
        for s in range(4):
            add(drums, hat(), at + s * BEAT / 4, 0.11 + (0.06 if s == 2 else 0))
        if (beat - M["drop1"]) % 2 == 1:
            add(drums, clap(), at, 0.7)
    elif intro:
        for s in range(2):
            add(drums, hat(), at + s * BEAT / 2, 0.15)

# snare rolls into both drops
for start, end in ((M["roll1"], M["drop1"]), (M["roll2"], M["drop2"])):
    t = b(start)
    while t < b(end) - 0.02:
        frac = (t - b(start)) / (b(end) - b(start))
        add(drums, snare(), t, 0.25 + 0.5 * frac)
        step = BEAT / 2 if frac < 0.25 else BEAT / 4 if frac < 0.6 else BEAT / 8
        t += step

for beat in M["crashes"]:
    add(drums, crash(), b(beat), 0.45)

# intro drone, then four-beat chord bars from the first drop to the logo
add(music, lp(pad([45, 57, 60, 64], b(M["drop1"])), 900), 0, 1.4)
bar = 0
for bar_beat in range(int(M["drop1"]), int(M["end"]), 4):
    root_note, triad = chords[bar % 4]
    bar += 1
    beats = min(4, M["end"] - bar_beat)
    bar_t = b(bar_beat)
    add(music, pad(triad, b(beats)), bar_t, 1.0)
    for e in range(int(beats * 2)):
        add(music, bass_note(root_note - 12, BEAT / 2 * 0.9), bar_t + e * BEAT / 2, 0.9 if e % 2 else 0.6)
    if bar_beat >= M["arp"]:
        for s in range(int(beats * 4)):
            m = triad[arp_pat[s % 8]] + (12 if s % 4 == 3 else 0)
            add(music, pluck(m), bar_t + s * BEAT / 4, 0.9 if bar_beat >= M["lift"] else 0.7)
# final stab under the logo
root_note, triad = chords[bar % 4]
add(music, pad(triad + [root_note], b(4)), b(M["end"]), 1.4)
add(music, bass_note(root_note - 12, 1.2), b(M["end"]), 1.0)

music *= side
# open the filter across the build before the CTA drop
build_i, drop_i = int(b(M["build"]) * SR), int(b(M["drop2"]) * SR)
music[build_i:drop_i] = sweep_filter(music[build_i:drop_i], 400, 8000, "low", 64)
music = reverb(music, 1.2, 0.18)

# ---------------- sfx track ----------------
fx = np.zeros(N)
bank = {
    "impact": sfx_impact, "boom": sfx_boom, "whoosh": lambda: sfx_whoosh(False), "whooshUp": lambda: sfx_whoosh(True),
    "swipe": sfx_swipe, "glitch": sfx_glitch, "tick": sfx_tick, "click": sfx_click, "pop": sfx_pop,
    "clock": sfx_clock, "ding": sfx_ding, "count": sfx_count, "shimmer": sfx_shimmer,
}
drops = sorted(c["t"] for c in cues["sfx"] if c["type"] == "boom")
for c in cues["sfx"]:
    if c["type"] == "vo":
        continue
    if c["type"] == "riser":
        target = next((d for d in drops if d > c["t"] + 0.5), c["t"] + 1.8)
        add(fx, sfx_riser(target - c["t"]), c["t"], c["gain"])
    elif c["type"] in ("whoosh", "whooshUp"):
        # whooshes peak at the cut, half a second after their cue
        add(fx, bank[c["type"]](), max(0, c["t"] - 0.05), c["gain"])
    else:
        add(fx, bank[c["type"]](), c["t"], c["gain"])

mix = music * 0.55 + drums * 0.6 + fx * 0.75
# voiceover clips placed by reel.html; duck the bed under them
vo = np.zeros(N)
for c in cues["sfx"]:
    if c["type"] == "vo":
        raw = subprocess.run(
            ["ffmpeg", "-v", "error", "-i", c["file"], "-af",
             "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse",
             "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], check=True, capture_output=True).stdout
        add(vo, np.frombuffer(raw, dtype=np.float32).astype(np.float64), c["t"], c["gain"])
if vo.any():
    vo = hp(vo, 110)
    vo /= np.max(np.abs(vo)) / 0.9
    level = signal.sosfilt(signal.butter(1, 6, "low", fs=SR, output="sos"), np.abs(vo))
    gate = np.clip(level / 0.05, 0, 1)
    mix = (music * 0.55 + drums * 0.6) * (1 - 0.55 * gate) + fx * 0.75 * (1 - 0.3 * gate)
    vo = np.tanh(vo * 1.6) / np.tanh(1.6)  # gentle compression
    mix += reverb(vo, 0.6, 0.08) * 0.95

# stereo widen a little with a short delay on the music bus
left = mix + np.roll(music, 300) * 0.06
right = mix + np.roll(music, 520) * 0.06
st = np.stack([left, right], 1)
# end fade over the last 0.5s
fade = np.ones(N)
fi = int((DUR - 0.5) * SR)
fade[fi:] = np.linspace(1, 0, N - fi) ** 1.5
st *= fade[:, None]
st = np.tanh(st * 1.15) / np.tanh(1.15)
st /= np.max(np.abs(st)) / 0.93
wavfile.write("soundtrack.wav", SR, (st * 32767).astype(np.int16))
print("ok", st.shape[0] / SR, "s")
