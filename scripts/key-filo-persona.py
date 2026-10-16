"""
Keys the Filo persona desk renders (scene1.png … scene5.png, blue screen) for FiloPersonaLoop:

  python3 scripts/key-filo-persona.py "<folder with scene1-5.png>"

Writes public/work/filo/studio/persona-desk-1.webp … -5.webp: transparent, cropped to one shared box
so the scenes line up. The page crossfades them; timing and transition live in DialKit
(Filo persona loop). Needs numpy and Pillow.
"""
import os
import sys

import numpy as np
from PIL import Image

SRC = os.path.join(sys.argv[1], 'scene{}.png')
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'work', 'filo', 'studio')
BG = np.array([0, 96, 253], float)  # the renders' blue screen
K0, K1 = 30.0, 140.0  # key = B - max(R, G): <= K0 opaque, >= K1 clear
QUALITY = 88
PAD = 24


def key(i):
    c = np.asarray(Image.open(SRC.format(i)).convert('RGB')).astype(float)
    k = c[..., 2] - np.maximum(c[..., 0], c[..., 1])
    a = np.clip((K1 - k) / (K1 - K0), 0, 1)
    # Premultiplied foreground: take out the blue each edge pixel was mixed with.
    p = np.clip(c - (1 - a)[..., None] * BG, 0, 255)
    # Despill: no pixel ends up bluer than its red/green allow.
    p[..., 2] = np.minimum(p[..., 2], np.maximum(p[..., 0], p[..., 1]) + 6)
    return np.minimum(p, (a * 255)[..., None]), a


scenes = [key(i) for i in range(1, 6)]
ys, xs = np.where(np.any([a > 0.02 for _, a in scenes], axis=0))
y0, x0 = max(ys.min() - PAD, 0), max(xs.min() - PAD, 0)
h, w = (ys.max() + PAD - y0) // 2 * 2, (xs.max() + PAD - x0) // 2 * 2
scenes = [(p[y0:y0 + h, x0:x0 + w], a[y0:y0 + h, x0:x0 + w]) for p, a in scenes]
print(f'crop {w}x{h} at {x0},{y0}')

for n, (p, a) in enumerate(scenes, 1):
    rgb = np.where(a[..., None] > 0, p / np.maximum(a, 1e-6)[..., None], 0)
    path = os.path.join(OUT, f'persona-desk-{n}.webp')
    Image.fromarray(np.dstack([np.clip(rgb, 0, 255), a * 255]).round().astype(np.uint8)).save(path, quality=QUALITY, method=6)
    print(path, os.path.getsize(path) // 1024, 'KB')
