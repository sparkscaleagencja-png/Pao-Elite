#!/usr/bin/env python3
"""
Galeria wykonów PAO Elite — odświeża galeria/manifest.json na podstawie plików w folderach.

JAK DODAĆ ZDJĘCIA / FILMY (może być ich dowolnie dużo):
  1. Wrzuć pliki do folderu o nazwie KLUCZA, np.  galeria/dach-pokrycie/zdjecie1.jpg
  2. Uruchom:  python galeria/dodaj.py
  3. Wgraj folder galeria/ na serwer (razem z manifest.json).

KLUCZE (nazwy folderów):
  Całość usługi:  ogolne  wymiana  dachowka  kuna  odnowa  docieplanie  podbitka  hydro  posadzka  taras
  Warstwa dachu:  dach-welna  dach-krokwie  dach-deski  dach-membrana  dach-kontrlaty  dach-laty  dach-pokrycie
  Warstwa ściany: sciana-mur  sciana-klej  sciana-eps  sciana-siatka  sciana-grunt  sciana-tynk  sciana-farba
  Zdjęcie w dymku "tak robimy" (jedno na warstwę):  galeria/opisy/<klucz-warstwy>.jpg  (np. opisy/dach-pokrycie.jpg)

Podpis zdjęcia = nazwa pliku bez rozszerzenia (myślniki i podkreślenia -> spacje; numer na początku "01_" ucinany).
Kolejność = alfabetyczna po nazwie pliku. Filmy: .mp4 / .webm / .mov; plakat filmu = plik o tej samej nazwie .jpg w tym samym folderze.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
FOTO = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}
WIDEO = {".mp4", ".webm", ".mov", ".m4v"}

def podpis(nazwa):
    n = re.sub(r"^\d+[_\-. ]+", "", os.path.splitext(nazwa)[0])
    return re.sub(r"[_\-]+", " ", n).strip()

manifest = {"opisy": {}}
for klucz in sorted(os.listdir(ROOT)):
    p = os.path.join(ROOT, klucz)
    if not os.path.isdir(p):
        continue
    pliki = sorted(os.listdir(p), key=str.lower)
    if klucz == "opisy":
        for f in pliki:
            if os.path.splitext(f)[1].lower() in FOTO:
                manifest["opisy"][os.path.splitext(f)[0]] = {"foto": "opisy/" + f}
        continue
    wpisy, nazwy = [], {os.path.splitext(f)[0] for f in pliki}
    for f in pliki:
        base, ext = os.path.splitext(f); ext = ext.lower()
        if ext in WIDEO:
            w = {"typ": "wideo", "src": f"{klucz}/{f}", "podpis": podpis(f)}
            for pe in (".jpg", ".jpeg", ".png", ".webp"):
                if os.path.exists(os.path.join(p, base + pe)):
                    w["poster"] = f"{klucz}/{base}{pe}"; break
            wpisy.append(w)
        elif ext in FOTO:
            if any(os.path.splitext(x)[0] == base and os.path.splitext(x)[1].lower() in WIDEO for x in pliki):
                continue            # to plakat filmu, nie osobne zdjecie
            wpisy.append({"typ": "foto", "src": f"{klucz}/{f}", "podpis": podpis(f)})
    if wpisy:
        manifest[klucz] = wpisy

with open(os.path.join(ROOT, "manifest.json"), "w", encoding="utf-8") as fh:
    json.dump(manifest, fh, ensure_ascii=False, indent=2)
print("manifest.json:", {k: (len(v) if isinstance(v, list) else len(v)) for k, v in manifest.items()} or "pusty")
