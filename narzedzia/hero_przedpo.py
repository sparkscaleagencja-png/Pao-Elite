"""Film „przed / po” na drugi slajd góry strony, z prawdziwych zdjęć realizacji (kolaże REVO: górna i dolna połowa).
Zdjęcie „przed” jest dopasowywane do „po” (ORB + homografia), potem kurtyna odsłania efekt.
Użycie: python narzedzia/hero_przedpo.py  ->  video/hero-przedpo.mp4 + .jpg"""
import cv2, numpy as np, subprocess, os
from PIL import Image, ImageDraw, ImageFont

R = r"C:\Users\gp-4\Documents\REVO Primetech\REVO"
OUT = os.path.join(os.path.dirname(__file__), "..", "video")
W, H, FPS = 1280, 720, 30
# (plik, ramka_gora, ramka_dol, ktora_przed: 'gora'|'dol')
PARY = [
    (R + r"\Zdjęcia dachy\404ee1bb-967a-46c1-a218-1e2eb7404b4b.jpg", (45, 30, 1440, 712), (40, 770, 1470, 1470), "gora"),
    (R + r"\Zdjęcia elewacji\aff0d264-de40-4e55-a551-99430f23a514.jpg", (70, 70, 1870, 925), (80, 1010, 1870, 1860), "dol"),
]
# punkty wspólne (współrzędne w całym kolażu): kominy L/P, okno dachowe, talerz anteny, szczyt łuku drzwi
RECZNE = {PARY[0][0]: ([(604, 75), (809, 80), (735, 213), (1362, 400), (990, 412)],
                       [(580, 800), (808, 800), (748, 968), (1345, 1135), (1010, 1160)])}
FONT = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 30)

def wczytaj(p):
    return cv2.imdecode(np.fromfile(p, np.uint8), cv2.IMREAD_COLOR)

def dopasuj(src, dst):
    orb = cv2.ORB_create(6000)
    g1, g2 = cv2.cvtColor(src, cv2.COLOR_BGR2GRAY), cv2.cvtColor(dst, cv2.COLOR_BGR2GRAY)
    k1, d1 = orb.detectAndCompute(g1, None); k2, d2 = orb.detectAndCompute(g2, None)
    m = sorted(cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True).match(d1, d2), key=lambda x: x.distance)[:600]
    A = np.float32([k1[x.queryIdx].pt for x in m]); B = np.float32([k2[x.trainIdx].pt for x in m])
    Hm, ok = cv2.findHomography(A, B, cv2.RANSAC, 4.0)
    print("dopasowanie: punkty", int(ok.sum()), "z", len(m))
    return cv2.warpPerspective(src, Hm, (dst.shape[1], dst.shape[0]), borderMode=cv2.BORDER_REPLICATE)

def kadr(img):
    """środek w proporcji 16:9 -> 1280x720"""
    h, w = img.shape[:2]
    if w / h > W / H: nw = int(h * W / H); x = (w - nw) // 2; img = img[:, x:x + nw]
    else: nh = int(w * H / W); y = max(0, (h - nh) // 3); img = img[y:y + nh]
    return cv2.resize(img, (W, H), interpolation=cv2.INTER_LANCZOS4)

def etykieta(frame, txt, alfa):
    if alfa <= 0: return frame
    im = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)).convert("RGBA")
    ov = Image.new("RGBA", im.size); d = ImageDraw.Draw(ov)
    tw = d.textlength(txt, font=FONT); x, y = 40, H - 160
    kol = (192, 90, 60) if txt == "PO" else (30, 32, 36)
    d.rectangle([x, y, x + tw + 36, y + 52], fill=kol + (int(230 * alfa),))
    d.text((x + 18, y + 9), txt, font=FONT, fill=(255, 255, 255, int(255 * alfa)))
    return cv2.cvtColor(np.array(Image.alpha_composite(im, ov).convert("RGB")), cv2.COLOR_RGB2BGR)

klatki = []
for plik, rg, rd, przed_w in PARY:
    im = wczytaj(plik)
    g = im[rg[1]:rg[3], rg[0]:rg[2]]; d = im[rd[1]:rd[3], rd[0]:rd[2]]
    przed, po = (g, d) if przed_w == "gora" else (d, g)
    if plik in RECZNE:
        a_pts, b_pts = RECZNE[plik]
        o1 = rg if przed_w == "gora" else rd; o2 = rd if przed_w == "gora" else rg
        A_ = np.float32([(x - o1[0], y - o1[1]) for x, y in a_pts]); B_ = np.float32([(x - o2[0], y - o2[1]) for x, y in b_pts])
        Mx, _ = cv2.estimateAffinePartial2D(A_, B_)
        przed = cv2.warpAffine(przed, Mx, (po.shape[1], po.shape[0]), borderMode=cv2.BORDER_REPLICATE)
    else:
        przed = dopasuj(przed, po)
    # wspólny, bezpieczny kadr (brzegi po dopasowaniu bywają rozmazane)
    h, w = po.shape[:2]; m = int(0.07 * w)
    mg, md = int(0.03 * h), int(0.11 * h)
    przed, po = przed[mg:h - md, m:w - m], po[mg:h - md, m:w - m]
    a, b = kadr(przed), kadr(po)
    n_przed, n_wipe, n_po = int(1.8 * FPS), int(1.4 * FPS), int(2.6 * FPS)
    tot = n_przed + n_wipe + n_po
    for i in range(tot):
        z = 1.0 + 0.05 * i / tot  # powolny najazd
        M = cv2.getRotationMatrix2D((W / 2, H / 2), 0, z)
        A = cv2.warpAffine(a, M, (W, H)); B = cv2.warpAffine(b, M, (W, H))
        if i < n_przed: f = A.copy(); lab, la = "PRZED", 1
        elif i < n_przed + n_wipe:
            t = (i - n_przed) / n_wipe; t = t * t * (3 - 2 * t); x = int(W * t)
            f = A.copy(); f[:, :x] = B[:, :x]
            cv2.rectangle(f, (max(0, x - 3), 0), (min(W - 1, x + 3), H), (255, 255, 255), -1)
            lab, la = ("PRZED", 1 - t) if t < .5 else ("PO", (t - .5) * 2)
        else: f = B; lab, la = "PO", 1
        klatki.append(f)
    # przenikanie do następnej pary robi pętla w ffmpeg (fade z czarnego krótko)
mp4 = os.path.join(OUT, "hero-przedpo.mp4")
p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS),
                      "-i", "-", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-pix_fmt", "yuv420p",
                      "-movflags", "+faststart", mp4], stdin=subprocess.PIPE)
for k in klatki: p.stdin.write(k.tobytes())
p.stdin.close(); p.wait()
cv2.imwrite(os.path.join(OUT, "hero-przedpo.jpg"), klatki[int(5.5 * FPS)], [cv2.IMWRITE_JPEG_QUALITY, 85])
print("ok", os.path.getsize(mp4), len(klatki) / FPS, "s")
