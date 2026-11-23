"""Rama z ciemnych desek (jak rama obrazu, frez jak w podbitce) -> img/rama-deski.png (9-slice dla border-image).
Uruchom: python narzedzia/rama_deski.py   (rozmiar S, grubość listwy T w px; w CSS border-image-slice = T)"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
S, T = 360, 54
rng = np.random.default_rng(7)

def deska(dl, gr, seed):
    r = np.random.default_rng(seed)
    y = np.arange(gr)[:, None]; x = np.arange(dl)[None, :]
    # słoje: fale wzdłuż długości + drobny szum
    faza = r.uniform(0, 6.28, 6)
    sl = sum(np.sin((y * (0.35 + 0.12 * i)) + np.sin(x / (40 + 23 * i) + faza[i]) * (2.2 + i)) for i in range(4)) / 4
    szum = np.repeat(r.normal(0, 1, (gr, dl // 6 + 2)), 6, axis=1)[:, :dl]
    szum = np.array(Image.fromarray(((szum + 3) * 40).clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))) / 255 - 0.5
    v = 0.5 + 0.28 * sl + 0.3 * szum + 0.06 * np.sin(x / 90 + faza[5])
    baza = np.array([40, 27, 19], float); jas = np.array([92, 62, 40], float)   # ciemny orzech
    img = baza + (jas - baza) * v.clip(0, 1)[..., None]
    # frez (podbitka): rowek przez środek + jasna krawędź
    m = gr // 2
    img[m - 1:m + 2] *= 0.35; img[m + 2] = img[m + 2] * 0.75 + 40
    # fazowane krawędzie deski
    img[0:2] = img[0:2] * 0.85 + 30; img[-3:] *= 0.45
    return img.clip(0, 255).astype(np.uint8)

def rama():
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    boki = [  # (obrót, maska trapezu)
        (0,   [(0, 0), (S, 0), (S - T, T), (T, T)]),          # góra
        (180, [(T, S - T), (S - T, S - T), (S, S), (0, S)]),   # dół
        (90,  [(0, 0), (T, T), (T, S - T), (0, S)]),          # lewa
        (270, [(S, 0), (S, S), (S - T, S - T), (S - T, T)]),  # prawa
    ]
    for i, (rot, poly) in enumerate(boki):
        d = Image.fromarray(deska(S, T, 11 + i)).convert("RGBA")
        warstwa = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        if rot == 0: warstwa.paste(d, (0, 0))
        elif rot == 180: warstwa.paste(d.rotate(180), (0, S - T))
        elif rot == 90: warstwa.paste(d.rotate(90, expand=True), (0, 0))
        else: warstwa.paste(d.rotate(270, expand=True), (S - T, 0))
        maska = Image.new("L", (S, S), 0); ImageDraw.Draw(maska).polygon(poly, fill=255)
        out.paste(warstwa, (0, 0), maska)
    dr = ImageDraw.Draw(out)
    # łączenia na ukos (ciemna szczelina)
    for a, b in [((0, 0), (T, T)), ((S, 0), (S - T, T)), ((0, S), (T, S - T)), ((S, S), (S - T, S - T))]:
        dr.line([a, b], fill=(18, 12, 8, 255), width=2)
    # wewnętrzny cień przy obrazie i jasna krawędź zewnętrzna
    dr.rectangle([T - 2, T - 2, S - T + 1, S - T + 1], outline=(14, 10, 7, 255), width=2)
    dr.rectangle([0, 0, S - 1, S - 1], outline=(130, 96, 64, 255), width=1)
    # gwoździe w rogach (po 2 na róg)
    for cx, cy in [(T * .32, T * .62), (T * .62, T * .32)]:
        for fx, fy in [(1, 1), (-1, 1), (1, -1), (-1, -1)]:
            x = cx if fx > 0 else S - cx; y = cy if fy > 0 else S - cy
            dr.ellipse([x - 3.2, y - 3.2, x + 3.2, y + 3.2], fill=(40, 40, 42, 255))
            dr.ellipse([x - 1.6, y - 2, x + .6, y], fill=(150, 150, 155, 255))
    return out

if __name__ == "__main__":
    import os
    p = os.path.join(os.path.dirname(__file__), "..", "img", "rama-deski.png")
    rama().save(p, optimize=True); print(p, os.path.getsize(p))
