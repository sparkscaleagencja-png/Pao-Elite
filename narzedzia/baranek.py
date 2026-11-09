"""Tekstura tynku „baranek” 1,5 mm (bezszwowa, szara, do nakładania na kolor): img/baranek.webp
Ziarna ~1,5 mm = ok. 3-4 px przy kafelku 256 px; oświetlenie z lewej-góry daje drobne cienie jak na prawdziwym tynku."""
import numpy as np
from PIL import Image
import os

N = 256
rng = np.random.default_rng(15)
h = np.zeros((N, N))
for _ in range(int(N * N / 9)):            # ~1 ziarno na 3x3 px
    x, y = rng.integers(0, N, 2)
    r = rng.uniform(1.1, 2.0)
    a = rng.uniform(.6, 1.0)
    ys, xs = np.mgrid[-3:4, -3:4]
    b = a * np.exp(-(xs ** 2 + ys ** 2) / (2 * (r * .62) ** 2))
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            h[(y + dy) % N, (x + dx) % N] += b[dy + 3, dx + 3]
h = np.minimum(h, np.percentile(h, 99))
f = np.fft.fft2(h)
fy = np.fft.fftfreq(N)[:, None]; fx = np.fft.fftfreq(N)[None, :]
g = np.exp(-(fx ** 2 + fy ** 2) * (2 * np.pi * .7) ** 2 / 2)   # lekkie zmiękczenie
h = np.real(np.fft.ifft2(f * g))
gy, gx = np.gradient(h)
light = -(gx * .7 + gy * .7)                # światło z lewej-góry
light = light / np.percentile(np.abs(light), 98)
pix = np.clip(128 + 70 * light + 22 * (h - h.mean()) / h.std(), 0, 255).astype(np.uint8)
out = os.path.join(os.path.dirname(__file__), "..", "img", "baranek.webp")
Image.fromarray(pix, "L").save(out, quality=82)
print("ok", os.path.getsize(out))
