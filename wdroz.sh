#!/bin/bash
# Wdrożenie strony pao-elite.pl na serwer (Git Bash). Użycie:  bash wdroz.sh [plik ...]   (ścieżki względem katalogu repo)
# Bez argumentów: index.html realizacje.html polityka-prywatnosci.html sitemap.xml robots.txt warianty/dom-rozkladany.html edytor/edytor.js edytor/edytor.css
#
# ZASADY (od edytora strony, 2026-10-22):
#  * index.html NIE trafia bezpośrednio na stronę. Jest SZABLONEM: wgrywany do /opt/pao-elita/strona/index.html, potem aplikacja
#    składa stronę = szablon + treść zapisana w edytorze (data/strona/tresc.json). Dzięki temu wdrożenie kodu nie kasuje edycji klienta.
#  * galeria/ NIE jest wdrażana stąd — zdjęcia dodaje klient w edytorze (serwer jest źródłem prawdy dla galeria/ i manifest.json).
#  * nowy tekst w szablonie, który ma być edytowalny: dodaj data-e="unikalny-klucz" (patrz strona_edytor.py w aplikacji PAO Elite).
set -e
cd "$(dirname "$0")"
HOST=ubuntu@164.132.243.94
PLIKI=("$@"); [ ${#PLIKI[@]} -eq 0 ] && PLIKI=(index.html realizacje.html polityka-prywatnosci.html sitemap.xml robots.txt warianty/dom-rozkladany.html edytor/edytor.js edytor/edytor.css)
INNE=(); SZABLON=0
for f in "${PLIKI[@]}"; do case "$f" in galeria/*) echo "POMIJAM $f (galeria jest zarządzana w edytorze)";; index.html) SZABLON=1;; *) INNE+=("$f");; esac; done
if [ ${#INNE[@]} -gt 0 ]; then
  tar -cf /tmp/pao-wdroz.tar "${INNE[@]}"; scp -q /tmp/pao-wdroz.tar $HOST:/tmp/pao-wdroz.tar
  ssh $HOST 'set -e; for d in pao-elite pao-strona; do sudo tar -xf /tmp/pao-wdroz.tar -C /var/www/$d --no-same-owner; done; cd /var/www; for d in pao-elite pao-strona; do for f in '"${INNE[*]}"'; do sudo chown root:root $d/$f; sudo chmod a+r $d/$f; done; done; rm /tmp/pao-wdroz.tar'
fi
if [ $SZABLON -eq 1 ]; then
  scp -q index.html $HOST:/tmp/pao-szablon.html
  ssh $HOST 'set -e; cd /opt/pao-elita; cp strona/index.html ~/backups/szablon-index-$(date +%Y%m%d-%H%M%S).html; cp /tmp/pao-szablon.html strona/index.html; rm /tmp/pao-szablon.html; python3 -c "import strona_edytor as s; print(s.zbuduj())"'
fi
echo "Gotowe: ${PLIKI[*]}"
