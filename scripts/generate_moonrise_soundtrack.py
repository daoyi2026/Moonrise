from __future__ import annotations

import math
import os
import random
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 32000
DURATION = 87.55
N = int(round(SR * DURATION))
SEED = 20260929
rng = np.random.default_rng(SEED)
random.seed(SEED)

L = np.zeros(N, dtype=np.float64)
R = np.zeros(N, dtype=np.float64)


def midi(note: int) -> float:
    return 440.0 * 2.0 ** ((note - 69) / 12.0)


def add(sig: np.ndarray, start: float, pan: float = 0.0, gain: float = 1.0) -> None:
    i0 = int(round(start * SR))
    if i0 >= N:
        return
    s0 = 0
    if i0 < 0:
        s0 = -i0
        i0 = 0
    i1 = min(N, i0 + len(sig) - s0)
    if i1 <= i0:
        return
    x = sig[s0:s0 + (i1 - i0)] * gain
    ang = (float(np.clip(pan, -1.0, 1.0)) + 1.0) * math.pi / 4.0
    L[i0:i1] += x * math.cos(ang)
    R[i0:i1] += x * math.sin(ang)


def soft_env(n: int, attack: float, release: float) -> np.ndarray:
    e = np.ones(n, dtype=np.float64)
    a = min(n, max(1, int(attack * SR)))
    r = min(n, max(1, int(release * SR)))
    e[:a] *= np.sin(np.linspace(0.0, math.pi / 2.0, a)) ** 2
    e[-r:] *= np.cos(np.linspace(0.0, math.pi / 2.0, r)) ** 2
    return e


def glass(freq: float, seconds: float = 0.55, amp: float = 1.0, decay: float = 10.0) -> np.ndarray:
    n = max(1, int(seconds * SR))
    t = np.arange(n) / SR
    core = (
        1.00 * np.sin(2 * math.pi * freq * t)
        + 0.31 * np.sin(2 * math.pi * freq * 2.414 * t)
        + 0.13 * np.sin(2 * math.pi * freq * 3.86 * t)
        + 0.055 * np.sin(2 * math.pi * freq * 5.27 * t)
    )
    core *= (1.0 - np.exp(-1200 * t)) * np.exp(-decay * t)
    metal = (
        0.62 * np.sin(2 * math.pi * freq * 3.21 * t)
        + 0.36 * np.sin(2 * math.pi * freq * 4.83 * t)
        + 0.20 * np.sin(2 * math.pi * freq * 6.41 * t)
        + 0.10 * np.sin(2 * math.pi * freq * 8.17 * t)
    )
    metal *= (1.0 - np.exp(-2200 * t)) * np.exp(-21 * t)
    ping = np.sin(2 * math.pi * freq * 10.4 * t) * (1.0 - np.exp(-2800 * t)) * np.exp(-52 * t)
    y = core + 0.48 * metal + 0.08 * ping
    y /= np.max(np.abs(y)) + 1e-9
    return y * amp


def micro_metal(freq: float, seconds: float = 0.17, amp: float = 1.0) -> np.ndarray:
    n = max(1, int(seconds * SR))
    t = np.arange(n) / SR
    y = (
        np.sin(2 * math.pi * freq * t)
        + 0.35 * np.sin(2 * math.pi * freq * 2.91 * t)
        + 0.17 * np.sin(2 * math.pi * freq * 4.79 * t)
        + 0.08 * np.sin(2 * math.pi * freq * 7.08 * t)
    )
    y *= (1.0 - np.exp(-2500 * t)) * np.exp(-24 * t)
    y /= np.max(np.abs(y)) + 1e-9
    return y * amp


def piano(freq: float, seconds: float = 2.8, amp: float = 1.0) -> np.ndarray:
    n = max(1, int(seconds * SR))
    t = np.arange(n) / SR
    y = (
        np.sin(2 * math.pi * freq * t) * np.exp(-0.95 * t)
        + 0.26 * np.sin(2 * math.pi * freq * 2.01 * t) * np.exp(-1.75 * t)
        + 0.09 * np.sin(2 * math.pi * freq * 3.03 * t) * np.exp(-2.55 * t)
    )
    y *= 1.0 - np.exp(-90 * t)
    y /= np.max(np.abs(y)) + 1e-9
    return y * amp


def airy_pad(notes: list[int], seconds: float, amp: float = 1.0) -> np.ndarray:
    n = max(1, int(seconds * SR))
    t = np.arange(n) / SR
    y = np.zeros(n, dtype=np.float64)
    for j, note in enumerate(notes):
        f = midi(note)
        det = 0.0014 * (-1 if j % 2 == 0 else 1)
        y += np.sin(2 * math.pi * f * (1 + det) * t + 0.31 * j)
        y += 0.58 * np.sin(2 * math.pi * f * (1 - det) * t + 0.19 * j)
        y += 0.045 * np.sin(2 * math.pi * 2 * f * t + 0.13 * j)
    y /= max(1, len(notes)) * 1.64
    e = np.sin(math.pi * np.clip(t / seconds, 0.0, 1.0)) ** 0.62
    e *= 0.93 + 0.07 * np.sin(2 * math.pi * 0.05 * t + 0.7)
    return y * e * amp


def flute(freq: float, seconds: float = 2.1, amp: float = 1.0) -> np.ndarray:
    n = max(1, int(seconds * SR))
    t = np.arange(n) / SR
    ph = 2 * math.pi * freq * t + 0.028 * np.sin(2 * math.pi * 5.05 * t + 0.18 * np.sin(2 * math.pi * 0.22 * t))
    y = np.sin(ph) + 0.075 * np.sin(2 * ph)
    y *= soft_env(n, 0.18, 0.62) / 1.075
    return y * amp


def horn(freq: float, seconds: float = 2.4, amp: float = 1.0) -> np.ndarray:
    n = max(1, int(seconds * SR))
    t = np.arange(n) / SR
    ph = 2 * math.pi * freq * t + 0.016 * np.sin(2 * math.pi * 4.7 * t)
    y = np.sin(ph) + 0.15 * np.sin(2 * ph) + 0.045 * np.sin(3 * ph)
    y *= soft_env(n, 0.28, 0.85) / 1.195
    return y * amp


# 0.0–2.2: low, calm water only.
t = np.arange(int(2.5 * SR)) / SR
water = (
    np.sin(2 * math.pi * 42 * t + 0.12 * np.sin(2 * math.pi * 0.08 * t))
    + 0.42 * np.sin(2 * math.pi * 63 * t + 0.15 * np.sin(2 * math.pi * 0.055 * t + 1.1))
)
water *= (0.48 + 0.52 * (0.5 + 0.5 * np.sin(2 * math.pi * 0.11 * t + 0.7)) ** 1.6) * 0.0065
add(water, 0.0, -0.05)
add(np.roll(water, 83), 0.0, 0.06, 0.82)

# 2.2–18.35: fish moves through a net full of scales: dense, layered, irregular glass/metal.
scale_notes = [86, 88, 90, 93, 95, 98, 100, 102]
tm = 2.28
while tm < 18.28:
    tm += float(rng.uniform(0.075, 0.16))
    if tm >= 18.35:
        break
    note = int(rng.choice(scale_notes))
    add(micro_metal(midi(note) * float(rng.uniform(0.995, 1.006)), float(rng.uniform(0.13, 0.23)), float(rng.uniform(0.0026, 0.0052))), tm, float(rng.uniform(-0.98, 0.98)))

cluster = 2.5
while cluster < 18.1:
    cluster += float(rng.uniform(0.25, 0.52))
    count = int(rng.integers(4, 9))
    span = float(rng.uniform(0.08, 0.27))
    center_pan = float(rng.uniform(-0.78, 0.78))
    for off in np.sort(rng.uniform(0, span, count)):
        note = int(rng.choice(scale_notes))
        amp = float(rng.uniform(0.0052, 0.0110))
        add(glass(midi(note) * float(rng.uniform(0.993, 1.009)), float(rng.uniform(0.42, 0.72)), amp), cluster + float(off), float(np.clip(center_pan + rng.normal(0, 0.24), -1, 1)))

# 18.35–28.05: fish exits; glass lingers and gentle harmony arrives.
for st, chord, sec, a in [
    (18.35, [50, 57, 62, 64, 66, 69], 3.3, 0.020),
    (21.25, [47, 54, 59, 62, 64, 66], 3.4, 0.019),
    (24.20, [43, 50, 55, 57, 59, 62], 3.4, 0.019),
    (26.85, [45, 52, 57, 59, 64], 2.4, 0.018),
]:
    add(airy_pad(chord, sec, a), st)

tm = 18.45
while tm < 28.0:
    p = (tm - 18.45) / (28.0 - 18.45)
    tm += float(rng.uniform(0.11 + 0.10 * p, 0.26 + 0.32 * p))
    if tm >= 28.0:
        break
    note = int(rng.choice([81, 83, 86, 88, 90, 93, 95]))
    add(glass(midi(note), float(rng.uniform(0.38, 0.65)), float(rng.uniform(0.0038, 0.0080)) * (1 - 0.22 * p)), tm, float(rng.uniform(-0.9, 0.9)))

# 28.05: moon nucleus blooms.
for j, note in enumerate([50, 57, 62, 66, 69, 76]):
    add(piano(midi(note), 4.0, 0.036 if j < 4 else 0.027), 28.05 + j * 0.065, -0.42 + 0.84 * j / 5)
for j, note in enumerate([74, 78, 81, 85, 88]):
    add(glass(midi(note), 2.6, 0.019, decay=2.0 + 0.15 * j), 28.16 + j * 0.05, -0.28 + 0.56 * j / 4)

# 29.55–53.55: moon rise — organic long arc, scattered scale drops, climax around 49–52.
for st, chord, sec, a in [
    (29.0, [50, 57, 62, 66, 69], 6.0, 0.023),
    (34.4, [47, 54, 59, 62, 66], 6.0, 0.024),
    (39.8, [43, 50, 55, 59, 62], 6.0, 0.025),
    (45.0, [45, 52, 57, 61, 64], 6.3, 0.027),
    (49.8, [50, 57, 62, 66, 69], 6.0, 0.029),
]:
    add(airy_pad(chord, sec, a), st)

rise_phrase = [
    (74, 29.6, 1.15, 0.018), (76, 31.0, 0.78, 0.018), (78, 31.95, 1.25, 0.019),
    (81, 33.4, 1.45, 0.020), (83, 35.1, 1.0, 0.020), (85, 36.35, 1.35, 0.021),
    (86, 38.05, 1.75, 0.022), (85, 40.2, 0.95, 0.021), (83, 41.45, 1.20, 0.021),
    (81, 43.0, 1.55, 0.022), (83, 45.0, 1.15, 0.023), (85, 46.4, 1.45, 0.024),
    (86, 48.2, 1.70, 0.026), (88, 50.3, 1.70, 0.028),
]
for idx, (note, st, dur, amp) in enumerate(rise_phrase):
    add(piano(midi(note), dur + 1.2, amp * 1.05), st, -0.10)
    if idx < 9:
        add(flute(midi(note), dur, amp * 0.78), st + 0.05, 0.19)
    else:
        add(horn(midi(note - 12), dur + 0.18, amp * 0.72), st + 0.03, 0.16)

for tm in sorted(rng.uniform(30.2, 53.2, 48)):
    note = int(rng.choice([81, 83, 86, 88, 90, 93]))
    add(glass(midi(note) * float(rng.uniform(0.996, 1.005)), float(rng.uniform(0.30, 0.52)), float(rng.uniform(0.0030, 0.0060))), float(tm), float(rng.uniform(-0.95, 0.95)))

# Rain begins at 51.55 while moon is still moving: transform falling-scale glass into rain, no hard cut.
bridge = 50.75
while bridge < 56.0:
    p = (bridge - 50.75) / (56.0 - 50.75)
    bridge += float(rng.uniform(np.interp(p, [0, 1], [0.35, 0.11]), np.interp(p, [0, 1], [0.88, 0.32])))
    if bridge >= 56.0:
        break
    count = 1 if rng.random() > (0.28 + 0.38 * p) else int(rng.integers(2, 5))
    for _ in range(count):
        note = int(rng.choice([86, 88, 90, 93, 95, 98]))
        add(glass(midi(note), float(rng.uniform(0.24, 0.40)), float(rng.uniform(0.0032, 0.0058))), bridge + float(rng.uniform(0, 0.13)), float(rng.uniform(-0.96, 0.96)))

# 53.55–83.55: moon is high; open, sparse horizon + irregular jade-plate glass rain.
for st, chord, sec, a in [
    (53.2, [38, 45, 52, 57, 62, 66], 8.7, 0.0145),
    (61.0, [43, 50, 55, 59, 62], 8.5, 0.0135),
    (68.7, [45, 52, 57, 61, 64], 8.5, 0.0125),
    (76.2, [50, 57, 62, 66, 69], 8.3, 0.0115),
    (82.5, [38, 45, 52, 57, 62], 4.8, 0.0090),
]:
    add(airy_pad(chord, sec, a), st)

for note, st, dur, amp in [
    (81, 55.4, 2.5, 0.0090), (76, 59.7, 2.2, 0.0081), (74, 64.6, 2.7, 0.0074),
    (78, 70.2, 2.4, 0.0078), (76, 75.9, 2.5, 0.0070), (74, 81.1, 2.1, 0.0062),
]:
    add(flute(midi(note), dur, amp), st, 0.21)

rain_hi = [90, 93, 95, 98, 100, 102, 105, 107]
rain_mid = [83, 86, 88, 90, 93, 95]
cluster_t = 53.7
while cluster_t < 83.35:
    if rng.random() < 0.15:
        cluster_t += float(rng.uniform(0.70, 1.25))
    else:
        cluster_t += float(rng.uniform(0.18, 0.58))
    if cluster_t >= 83.35:
        break
    r = rng.random()
    count = int(rng.integers(1, 3) if r < 0.20 else rng.integers(3, 6) if r < 0.76 else rng.integers(6, 9))
    span = float(rng.uniform(0.06, 0.30))
    center_pan = float(rng.uniform(-0.88, 0.88))
    base_gain = float(rng.uniform(0.0028, 0.0048))
    for off in np.sort(rng.uniform(0, span, count)):
        note = int(rng.choice(rain_hi))
        pan = float(np.clip(center_pan + rng.normal(0, 0.27), -1, 1))
        amp = base_gain * float(rng.uniform(0.72, 1.18))
        add(micro_metal(midi(note) * float(rng.uniform(0.997, 1.004)), float(rng.uniform(0.11, 0.19)), amp), cluster_t + float(off), pan)
        if rng.random() < 0.24:
            note2 = int(rng.choice(rain_mid))
            add(glass(midi(note2), float(rng.uniform(0.24, 0.38)), amp * float(rng.uniform(0.42, 0.68))), cluster_t + float(off) + float(rng.uniform(0.025, 0.075)), float(np.clip(pan + rng.uniform(-0.25, 0.25), -1, 1)))

# 83.55–87.55: rain stops, leave air and a last distant glint.
add(airy_pad([38, 45, 52, 57, 62], 4.1, 0.0075), 83.25)
add(glass(midi(86), 0.42, 0.0018), 85.25, -0.12)

# Small stereo hall reflections.
dry_l = L.copy()
dry_r = R.copy()
for delay_s, g in [(0.085, 0.032), (0.17, 0.020), (0.30, 0.011)]:
    d = int(delay_s * SR)
    L[d:] += dry_r[:-d] * g
    R[d:] += dry_l[:-d] * g

# Exact loop landing.
fade_start = int((DURATION - 0.85) * SR)
fade = np.linspace(1.0, 0.0, N - fade_start)
L[fade_start:] *= fade
R[fade_start:] *= fade

# Gentle safety limiter.
L[:] = np.tanh(L * 1.04)
R[:] = np.tanh(R * 1.04)
peak = max(float(np.max(np.abs(L))), float(np.max(np.abs(R))), 1e-9)
if peak > 0.92:
    L[:] *= 0.92 / peak
    R[:] *= 0.92 / peak

out_dir = Path(os.environ.get("MOONRISE_AUDIO_DIR", "public/experiences/galaxy/audio"))
out_dir.mkdir(parents=True, exist_ok=True)
wav_path = out_dir / "moonrise.wav"
m4a_path = out_dir / "moonrise.m4a"

pcm = np.column_stack([
    (np.clip(L, -1.0, 1.0) * 32767).astype(np.int16),
    (np.clip(R, -1.0, 1.0) * 32767).astype(np.int16),
])
with wave.open(str(wav_path), "wb") as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    wf.writeframes(pcm.tobytes())

subprocess.run([
    "ffmpeg", "-y", "-loglevel", "error",
    "-i", str(wav_path), "-t", f"{DURATION:.2f}",
    "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
    str(m4a_path),
], check=True)
wav_path.unlink(missing_ok=True)

print(f"generated {m4a_path} ({m4a_path.stat().st_size} bytes)")
