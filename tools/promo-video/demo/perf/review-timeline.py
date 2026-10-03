"""Reviews the built timeline: silent stretches, fast or slow clip segments and totals.
Run after `bun demo/render.mjs --stills 0` (or any render) wrote timeline.json.
A silence of more than ~2 s means a clip needs more screen time than its narration:
add narration that describes the action, trim `from`/`to`, or raise `maxRate`."""
import json
import os

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
tl = json.load(open("timeline.json"))["segments"]
sb = {s["id"]: s for s in json.load(open("storyboard.json"))["segments"]}
vo = json.load(open("vo_timing.json"))
fmt = lambda s: f"{int(s // 60)}:{s % 60:04.1f}"

print("== silence between speech (over 1.2 s)")
prev_end = 0
for s in tl:
    gap = s["voAt"] - prev_end
    if gap > 1.2:
        print(f"  {fmt(prev_end)} -> {fmt(s['voAt'])}  {gap:.1f}s before '{s['id']}' ({s['type']})")
    prev_end = s["voAt"] + vo[s["id"]]["dur"]

clips = {n: json.load(open(f"clips/{n}.json")) for n in {sb[s["id"]]["v"]["clip"] for s in tl if s["type"] == "clip"}}
def mark(c, m):
    if isinstance(m, (int, float)): return m
    if m == "end": return clips[c]["duration"] - 0.2
    return next(x["t"] for x in clips[c]["marks"] if x["name"] == m)

print("== clip playback speed (source seconds / screen seconds)")
for s in tl:
    if s["type"] != "clip": continue
    v = sb[s["id"]]["v"]
    span = mark(v["clip"], v["to"]) - mark(v["clip"], v["from"])
    rate = span / s["dur"]
    if rate >= 2.0 or rate < 0.8:
        print(f"  {s['id']:5s} {v['clip']:11s} {span:5.1f}s over {s['dur']:5.1f}s = {rate:.2f}x (cap {v.get('maxRate', 2.5)})")
total = sum(s["dur"] for s in tl)
speech = sum(vo[s["id"]]["dur"] for s in tl)
print(f"== totals: video {total:.0f}s, speech {speech:.0f}s ({100 * speech / total:.0f}% speech)")
