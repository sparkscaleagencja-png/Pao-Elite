"""Montaż filmu na górę strony z klipów usług (Higgsfield, 1280x720, 6 s).
Użycie: python narzedzia/hero_montaz.py [katalog_klipow]
Wynik: video/hero-uslugi.mp4 + video/hero-uslugi.jpg (plakat)."""
import subprocess, sys, os

SRC = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\gp-4\Documents\Spark Scale\klipy-uslug\wideo\karty"
OUT = os.path.join(os.path.dirname(__file__), "..", "video")
# (plik, start s) — fragment z przemianą przed->po
UJECIA = [("2_dachy", 1.2), ("1_elewacja", 2.4), ("3_hydroizolacja", 1.6), ("4_wymiana_dachu", 2.2),
          ("6_taras", 0.8), ("5_garaz", 2.0), ("7_termo", 2.4)]
DL, XF = 2.8, 0.5

wej, filt = [], []
for i, (f, s) in enumerate(UJECIA):
    wej += ["-ss", str(s), "-t", str(DL), "-i", os.path.join(SRC, f + "_720.mp4")]
    filt.append(f"[{i}:v]fps=30,scale=1280:720,setsar=1,format=yuv420p[v{i}]")
prev, off = "v0", 0.0
for i in range(1, len(UJECIA)):
    off += DL - XF
    filt.append(f"[{prev}][v{i}]xfade=transition=fade:duration={XF}:offset={off:.2f}[x{i}]")
    prev = f"x{i}"
filt.append(f"[{prev}]unsharp=5:5:0.6[out]")
mp4 = os.path.join(OUT, "hero-uslugi.mp4")
subprocess.run(["ffmpeg", "-v", "error", "-y", *wej, "-filter_complex", ";".join(filt), "-map", "[out]", "-an",
                "-c:v", "libx264", "-preset", "slow", "-crf", "25", "-movflags", "+faststart", mp4], check=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "1.9", "-i", mp4, "-frames:v", "1", "-q:v", "4",
                os.path.join(OUT, "hero-uslugi.jpg")], check=True)
print("ok", os.path.getsize(mp4))
