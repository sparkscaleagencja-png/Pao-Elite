# PAO Elite — prototypy strony WWW

Prototypy strony dla PAO Elite (czyszczenie i malowanie elewacji oraz dachów, Oleśnica / Dolny Śląsk).

## Struktura

- `index.html` — **wersja główna**: kinowa sekwencja wideo sterowana scrollem (salon → dachy z drona → PRZED → PO) przechodząca w stronę z interaktywnym domkiem SVG, kafelkami usług, opiniami, FAQ i formularzem.
- `warianty/interaktywny-domek.html` — sam wariant z interaktywnym domkiem jako hero (bez sekcji wideo).
- `warianty/cinematic-css.html` — wcześniejszy wariant scroll-cinematic w czystym CSS (bez wideo i WebGL).
- `warianty/hero-3d-threejs.html` — wariant 3D (Three.js): salon → wylot przez okno → chmury → dom.

## Uruchomienie

Pliki są samodzielne — wystarczy otworzyć w przeglądarce (z dostępem do internetu: klipy wideo w `index.html` i biblioteka Three.js w wariancie 3D ładują się z CDN).

## Do zrobienia przed wdrożeniem

- Podmiana klipów demo (Pexels) na własne ujęcia PAO Elite i przeniesienie ich na własny hosting.
- Podmiana placeholderów w galerii realizacji na prawdziwe zdjęcia.
- Podpięcie formularza pod realną wysyłkę (backend / usługa formularzy).
- Prawdziwe opinie Google zamiast przykładowych.
