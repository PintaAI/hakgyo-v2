"""Builds a calm zoom/pan camera track for each desktop clip.

The camera works in held shots, not continuous following. Screen activity
(cursor moves, typing, dialogs) is pooled over a few seconds to find where the
work is happening. The camera keeps its current framing while that area stays
comfortably inside the view, and only cuts to a new framing when the work has
clearly moved elsewhere or after a page navigation. Each framing is held for a
minimum time, and every move eases in and out over about a second. Output:
clips/<name>.cam.json at 10 samples/sec.
"""
import json
import os
import subprocess
import sys

import numpy as np
from scipy.ndimage import binary_dilation

import projectdir

os.chdir(projectdir.resolve())
FPS = 10
W, H = 240, 150
MAX_ZOOM = 1.25
MIN_HOLD = 2.5  # seconds a framing stays put
MOVE = 1.1  # seconds an eased move takes
POOL = 2.0  # seconds of activity pooled into the work area


def frames(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", f"fps={FPS},scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.int16)


def activity(f):
    """Per sample: None, "nav" for page-sized changes, or the changed box."""
    out = [None]
    for k in range(1, len(f)):
        diff = np.abs(f[k] - f[k - 1]) > 22
        if diff.mean() > 0.12:
            out.append("nav")
        elif diff.sum() > 6:
            ys, xs = np.nonzero(binary_dilation(diff, iterations=2))
            out.append((xs.min() / W, ys.min() / H, (xs.max() + 1) / W, (ys.max() + 1) / H))
        else:
            out.append(None)
    return out


def framing_for(box):
    x0, y0, x1, y1 = box
    bw, bh = max(x1 - x0, 0.3), max(y1 - y0, 0.3)
    z = float(np.clip(min(0.8 / bw, 0.8 / bh), 1.0, MAX_ZOOM))
    z = round(z * 10) / 10  # a few discrete zoom levels only
    half = 0.5 / z
    return (float(np.clip((x0 + x1) / 2, half, 1 - half)), float(np.clip((y0 + y1) / 2, half, 1 - half)), z)


def inside(box, frame, margin=0.06):
    cx, cy, z = frame
    half = 0.5 / z
    return box[0] >= cx - half + margin and box[2] <= cx + half - margin and box[1] >= cy - half + margin and box[3] <= cy + half - margin


def track(path):
    act = activity(frames(path))
    n = len(act)
    pool = int(POOL * FPS)
    # keyframes: (sample index, framing)
    keys = [(0, (0.5, 0.5, 1.0))]
    last_change = -10 ** 9
    outside_for = 0
    for k in range(n):
        if act[k] == "nav":
            # new page: return to the full view (unless already there)
            if keys[-1][1][2] != 1.0 and k - last_change >= MOVE * FPS:
                keys.append((k, (0.5, 0.5, 1.0)))
                last_change = k
            continue
        recent = [b for b in act[max(0, k - pool) : k + 1] if b not in (None, "nav")]
        if not recent:
            continue
        box = (min(b[0] for b in recent), min(b[1] for b in recent), max(b[2] for b in recent), max(b[3] for b in recent))
        current = keys[-1][1]
        outside_for = 0 if inside(box, current) else outside_for + 1
        # move only when the work has stayed outside the frame for a while
        if outside_for >= int(0.8 * FPS) and k - last_change >= MIN_HOLD * FPS:
            target = framing_for(box)
            if not inside(box, target, margin=0.0):
                target = (0.5, 0.5, 1.0)
            if target != current:
                keys.append((max(0, k - int(0.6 * FPS)), target))
                last_change = k
                outside_for = 0
    # ease between keyframes
    cx, cy, z = np.zeros(n), np.zeros(n), np.zeros(n)
    move = int(MOVE * FPS)
    for k in range(n):
        idx = max(i for i, (s, _) in enumerate(keys) if s <= k)
        s, fr = keys[idx]
        prev = keys[idx - 1][1] if idx else fr
        p = min(1.0, (k - s) / move) if idx else 1.0
        e = 4 * p ** 3 if p < 0.5 else 1 - (-2 * p + 2) ** 3 / 2
        cx[k], cy[k], z[k] = (prev[j] + (fr[j] - prev[j]) * e for j in range(3))
    return {"fps": FPS, "cx": cx.round(4).tolist(), "cy": cy.round(4).tolist(), "z": z.round(3).tolist(),
            "keys": [[round(i / FPS, 2), *[round(v, 4) for v in fr]] for i, fr in keys]}


if __name__ == "__main__":
    for name in sys.argv[1:]:
        t = track(f"clips/{name}.mp4")
        json.dump(t, open(f"clips/{name}.cam.json", "w"))
        z = np.array(t["z"])
        print(f"{name}: {len(z) / FPS:.0f}s, {len(t['keys'])} framings, zoomed {np.mean(z > 1.05) * 100:.0f}% of the time")
