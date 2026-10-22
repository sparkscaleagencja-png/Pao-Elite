/* Edytor strony PAO Elite.
   Wyzwalacz: 3 kliknięcia w "PAO Elite" w stopce (index.html) -> logowanie -> edycja tekstów klikiem w stronę.
   Zapis = publikacja: serwer składa stronę z szablonu i treści (strona_edytor.py w aplikacji PAO Elite). */
(function(){
  'use strict';
  if (window.PaoEdytor) return;

  var API = window.PAO_API || '/_a/api/';
  var D = document;
  var stan = null;            // odpowiedź GET strona/stan
  var oryginaly = {};         // klucz -> znormalizowany HTML po ostatnim zapisie
  var seoStart = {title: '', description: ''};
  var aktywny = false, podglad = false, panelNazwa = '';
  var els = {};

  function el(tag, attrs, html){
    var e = D.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function(k){ if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); });
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function norm(s){ return String(s).replace(/\s+/g, ' ').replace(/<br\s*\/?>/gi, '<br>').trim(); }

  function api(sciezka, dane){
    var opt = {credentials: 'same-origin', headers: {}};
    if (dane !== undefined){ opt.method = 'POST'; opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(dane); }
    return fetch(API + sciezka, opt).then(function(r){
      return r.json().catch(function(){ return {}; }).then(function(j){ j._status = r.status; return j; });
    });
  }

  function toast(txt, zle){
    var t = el('div', {'class': 'pe-ui pe-toast' + (zle ? ' bad' : '')}, esc(txt));
    D.body.appendChild(t);
    requestAnimationFrame(function(){ t.classList.add('show'); });
    setTimeout(function(){ t.classList.remove('show'); setTimeout(function(){ t.remove(); }, 350); }, zle ? 5200 : 2800);
  }

  function dolaczCss(){
    if (D.getElementById('pe-css')) return;
    var src = ''; var sc = D.querySelectorAll('script[src*="edytor.js"]');
    if (sc.length) src = sc[0].getAttribute('src');
    var baza = src ? src.replace(/edytor\.js.*$/, '') : 'edytor/';
    var l = el('link', {id: 'pe-css', rel: 'stylesheet', href: baza + 'edytor.css?v=1'});
    D.head.appendChild(l);
  }

  /* ------------------------------------------------------------- logowanie */
  function pokazLogowanie(){
    zamknijLogowanie();
    var ov = el('div', {'class': 'pe-ui pe-login', id: 'pe-login'});
    ov.innerHTML = '<form class="pe-card" style="position:relative" autocomplete="on">' +
      '<button class="pe-x" type="button" aria-label="Zamknij">×</button>' +
      '<h3>PAO <b>ELITE</b> · edytor</h3><p>Zaloguj się, aby edytować stronę.</p>' +
      '<label for="pe-u">Login</label><input id="pe-u" name="username" autocomplete="username" required>' +
      '<label for="pe-p">Hasło</label><input id="pe-p" name="password" type="password" autocomplete="current-password" required>' +
      '<div class="pe-err" id="pe-err" role="alert"></div>' +
      '<button class="pe-btn ac" type="submit">Zaloguj</button></form>';
    D.body.appendChild(ov);
    var f = ov.querySelector('form'), u = ov.querySelector('#pe-u'), p = ov.querySelector('#pe-p'), er = ov.querySelector('#pe-err');
    ov.querySelector('.pe-x').onclick = zamknijLogowanie;
    ov.addEventListener('mousedown', function(e){ if (e.target === ov) zamknijLogowanie(); });
    D.addEventListener('keydown', escLogowanie);
    setTimeout(function(){ u.focus(); }, 30);
    f.addEventListener('submit', function(e){
      e.preventDefault(); er.textContent = '';
      var b = f.querySelector('button[type=submit]'); b.disabled = true; b.textContent = 'Loguję…';
      api('login', {user: u.value.trim(), haslo: p.value}).then(function(j){
        if (j.ok){ zamknijLogowanie(); wczytajIStartuj(); }
        else { er.textContent = j.blad || 'Nie udało się zalogować'; p.value = ''; p.focus(); b.disabled = false; b.textContent = 'Zaloguj'; }
      }).catch(function(){ er.textContent = 'Brak połączenia z serwerem'; b.disabled = false; b.textContent = 'Zaloguj'; });
    });
  }
  function escLogowanie(e){ if (e.key === 'Escape') zamknijLogowanie(); }
  function zamknijLogowanie(){ var o = D.getElementById('pe-login'); if (o) o.remove(); D.removeEventListener('keydown', escLogowanie); }

  /* ------------------------------------------------------------- start edytora */
  function otworz(){
    if (aktywny) return;
    dolaczCss();
    api('strona/stan').then(function(j){
      if (j.ok){ stan = j; start(); }
      else if (j._status === 401) pokazLogowanie();
      else toast(j.blad || 'Edytor niedostępny', true);
    }).catch(function(){ toast('Brak połączenia z serwerem', true); });
  }
  function wczytajIStartuj(){
    api('strona/stan').then(function(j){ if (j.ok){ stan = j; start(); } else toast(j.blad || 'Edytor niedostępny', true); });
  }

  function pola(){ return [].slice.call(D.querySelectorAll('[data-e]')); }

  function start(){
    aktywny = true;
    D.documentElement.classList.add('pe-on');
    // karuzela hero: wstrzymana na czas edycji (nie przeskakuje spod rąk)
    var vj = D.getElementById('vjourney');
    if (vj){ vj.addEventListener('mouseleave', blokuj, true); vj.dispatchEvent(new Event('mouseenter')); }
    // FAQ: wszystkie odpowiedzi rozwinięte
    [].forEach.call(D.querySelectorAll('details'), function(d){ d.open = true; });
    pola().forEach(function(p){
      p.classList.add('pe-f'); p.setAttribute('contenteditable', 'true'); p.setAttribute('spellcheck', 'true'); p.setAttribute('lang', 'pl');
      [].forEach.call(p.querySelectorAll('img'), function(i){ i.setAttribute('contenteditable', 'false'); });
      oryginaly[p.getAttribute('data-e')] = norm(p.innerHTML);
    });
    seoStart = {title: D.title || '', description: (D.querySelector('meta[name="description"]') || {content: ''}).content || ''};
    stan.seoNowe = {title: seoStart.title, description: seoStart.description};
    zbudujPasek();
    D.addEventListener('click', klik, true);
    D.addEventListener('keydown', klawisz, true);
    D.addEventListener('paste', wklej, true);
    D.addEventListener('input', wejscie, true);
    addEventListener('beforeunload', ostrzez);
    odswiezStatus();
    toast('Edytor włączony — kliknij dowolny tekst na stronie, żeby go zmienić');
  }
  function blokuj(e){ e.stopImmediatePropagation(); }

  function zbudujPasek(){
    var b = el('div', {'class': 'pe-ui pe-bar', id: 'pe-bar'});
    b.innerHTML = '<div class="pe-brand">PAO <b>ELITE</b> <span>· edytor</span></div><div class="pe-stat" id="pe-stat"></div><div class="pe-sp"></div>' +
      '<button class="pe-btn" data-a="seo" type="button">SEO</button>' +
      '<button class="pe-btn" data-a="galeria" type="button">Galeria</button>' +
      '<button class="pe-btn" data-a="historia" type="button">Historia</button>' +
      '<button class="pe-btn" data-a="pomoc" type="button">Pomoc</button>' +
      '<button class="pe-btn" data-a="podglad" type="button">Podgląd</button>' +
      '<button class="pe-btn" data-a="cofnij" type="button">Cofnij zmiany</button>' +
      '<button class="pe-btn ac" data-a="zapisz" id="pe-save" type="button">Zapisz i opublikuj</button>' +
      '<button class="pe-btn" data-a="wyjdz" type="button">Wyjdź</button>';
    D.body.appendChild(b);
    var p = el('aside', {'class': 'pe-ui pe-panel', id: 'pe-panel', 'aria-label': 'Panel edytora'});
    D.body.appendChild(p);
    els.bar = b; els.panel = p;
    b.addEventListener('click', function(e){
      var a = e.target.closest('[data-a]'); if (!a) return;
      var n = a.getAttribute('data-a');
      if (n === 'zapisz') zapisz();
      else if (n === 'cofnij') cofnij();
      else if (n === 'wyjdz') wyjdz();
      else if (n === 'podglad') przelaczPodglad(a);
      else panel(n);
    });
  }

  /* ------------------------------------------------------------- zmiany */
  function zmienione(){
    return pola().filter(function(p){ return norm(p.innerHTML) !== oryginaly[p.getAttribute('data-e')]; });
  }
  function seoZmienione(){
    var s = stan.seoNowe; return s.title !== seoStart.title || s.description !== seoStart.description;
  }
  function liczbaZmian(){ return zmienione().length + (seoZmienione() ? 1 : 0); }
  function odswiezStatus(){
    zmienione(); pola().forEach(function(p){ p.classList.toggle('pe-zm', norm(p.innerHTML) !== oryginaly[p.getAttribute('data-e')]); });
    var n = liczbaZmian(), s = D.getElementById('pe-stat'), b = D.getElementById('pe-save');
    if (!s) return;
    s.className = 'pe-stat' + (n ? ' zm' : '');
    s.textContent = n ? n + ' ' + (n === 1 ? 'niezapisana zmiana' : 'niezapisane zmiany') : 'Wszystko zapisane';
    b.disabled = !n;
  }
  function wejscie(e){ if (e.target.closest && e.target.closest('[data-e]')) odswiezStatus(); }
  function ostrzez(e){ if (aktywny && liczbaZmian()){ e.preventDefault(); e.returnValue = ''; } }

  function klik(e){
    if (!aktywny) return;
    var t = e.target;
    if (t.closest('.pe-ui')) return;
    // linki, kafelki i nagłówki rozwijanych pytań nie nawigują / nie zwijają się w trybie edycji
    if (!podglad && t.closest('a, summary, .tile')) e.preventDefault();
  }
  function klawisz(e){
    if (!aktywny) return;
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')){ e.preventDefault(); zapisz(); return; }
    if (e.key === 'Escape' && panelNazwa){ panel(''); return; }
    var p = e.target.closest && e.target.closest('[data-e]'); if (!p) return;
    if (e.key === 'Enter'){ e.preventDefault(); if (e.shiftKey) D.execCommand('insertLineBreak'); }
  }
  function wklej(e){
    var p = e.target.closest && e.target.closest('[data-e]'); if (!p) return;
    e.preventDefault();
    var txt = (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\s*\n\s*/g, ' ');
    D.execCommand('insertText', false, txt);
  }

  function zapisz(){
    var dane = {pola: {}, seo: {}};
    zmienione().forEach(function(p){ dane.pola[p.getAttribute('data-e')] = p.innerHTML; });
    if (seoZmienione()) dane.seo = {title: stan.seoNowe.title, description: stan.seoNowe.description};
    if (!Object.keys(dane.pola).length && !Object.keys(dane.seo).length){ toast('Brak zmian do zapisania'); return; }
    var b = D.getElementById('pe-save'); b.disabled = true; b.textContent = 'Publikuję…';
    api('strona/zapisz', dane).then(function(j){
      b.textContent = 'Zapisz i opublikuj';
      if (j._status === 401){ pokazLogowanie(); toast('Sesja wygasła — zaloguj się ponownie', true); odswiezStatus(); return; }
      if (!j.ok){ toast(j.blad || (j.bledy && j.bledy.join('; ')) || 'Nie udało się zapisać', true); odswiezStatus(); return; }
      pola().forEach(function(p){ oryginaly[p.getAttribute('data-e')] = norm(p.innerHTML); });
      seoStart = {title: stan.seoNowe.title, description: stan.seoNowe.description};
      odswiezStatus();
      toast(j.zmienione ? 'Opublikowano ✓ (' + j.zmienione + ' ' + (j.zmienione === 1 ? 'zmiana' : 'zmian') + ') — zmiany są już na stronie' : 'Brak zmian do zapisania');
      odswiezStan();
    }).catch(function(){ b.textContent = 'Zapisz i opublikuj'; toast('Brak połączenia z serwerem', true); odswiezStatus(); });
  }
  function cofnij(){
    var n = liczbaZmian(); if (!n){ toast('Nie ma niezapisanych zmian'); return; }
    if (!confirm('Cofnąć wszystkie niezapisane zmiany (' + n + ')?')) return;
    pola().forEach(function(p){ var k = p.getAttribute('data-e'); if (norm(p.innerHTML) !== oryginaly[k]) p.innerHTML = oryginaly[k]; });
    stan.seoNowe = {title: seoStart.title, description: seoStart.description};
    odswiezStatus(); if (panelNazwa === 'seo') panel('seo', true);
  }
  function wyjdz(){
    if (liczbaZmian() && !confirm('Masz niezapisane zmiany. Wyjść bez zapisywania?')) return;
    aktywny = false; removeEventListener('beforeunload', ostrzez);
    location.reload();
  }
  function przelaczPodglad(btn){
    podglad = !podglad; btn.classList.toggle('on', podglad);
    D.documentElement.classList.toggle('pe-podglad', podglad);
    pola().forEach(function(p){ p.setAttribute('contenteditable', podglad ? 'false' : 'true'); });
    toast(podglad ? 'Podgląd: tak wygląda strona bez ramek edycji' : 'Wróciłeś do edycji');
  }
  function odswiezStan(){ return api('strona/stan').then(function(j){ if (j.ok){ var n = stan.seoNowe; stan = j; stan.seoNowe = n; if (panelNazwa) panel(panelNazwa, true); } }); }

  /* ------------------------------------------------------------- panele */
  function panel(nazwa, odswiez){
    var p = els.panel;
    if (!odswiez && panelNazwa === nazwa){ nazwa = ''; }
    panelNazwa = nazwa;
    [].forEach.call(els.bar.querySelectorAll('[data-a]'), function(b){ var a = b.getAttribute('data-a'); if (a !== 'podglad') b.classList.toggle('on', a === nazwa); });
    if (!nazwa){ p.classList.remove('open'); return; }
    var tytuly = {seo: 'SEO — wyszukiwarka Google', galeria: 'Galeria zdjęć', historia: 'Historia zmian', pomoc: 'Jak edytować'};
    p.innerHTML = '<div class="pe-ph"><h4>' + tytuly[nazwa] + '</h4><button class="pe-x" style="position:static" type="button" aria-label="Zamknij">×</button></div><div class="pe-pb" id="pe-pb"></div>';
    p.querySelector('.pe-x').onclick = function(){ panel(''); };
    p.classList.add('open');
    var pb = D.getElementById('pe-pb');
    ({seo: panelSeo, galeria: panelGaleria, historia: panelHistoria, pomoc: panelPomoc})[nazwa](pb);
  }

  function panelPomoc(pb){
    pb.innerHTML = '<ul class="pe-tips">' +
      '<li><b>Kliknij tekst</b> na stronie (ma przerywaną ramkę) i pisz. Zmienione pola podświetlają się na zielono.</li>' +
      '<li><b>Enter</b> nie dodaje akapitu. Nowa linia w tym samym polu: <b>Shift+Enter</b>.</li>' +
      '<li><b>Wklejany tekst</b> jest zawsze czystym tekstem — formatowanie z Worda nie wejdzie na stronę.</li>' +
      '<li><b>Zapisz i opublikuj</b> (lub Ctrl+S) od razu zmienia stronę dla wszystkich. Każdy zapis jest w Historii i można go przywrócić.</li>' +
      '<li><b>Cofnij zmiany</b> kasuje tylko to, czego jeszcze nie zapisałeś.</li>' +
      '<li><b>SEO</b>: tytuł i opis strony widoczne w Google. <b>Galeria</b>: zdjęcia z realizacji — dodawanie, podpisy, usuwanie.</li>' +
      '<li><b>Podgląd</b> chowa ramki edycji, żeby zobaczyć stronę jak klient.</li>' +
      '<li>Numeru telefonu, e-maila i linków nie zmienisz tu — to robi programista.</li>' +
      '<li>Teksty w interaktywnym domu 3D (animacja) też zmienia programista.</li></ul>';
  }

  function panelSeo(pb){
    var s = stan.seoNowe;
    pb.innerHTML = '<p class="pe-hint">Tak strona pokazuje się w wynikach Google. Pisz konkretnie: co robisz, gdzie i dla kogo.</p>' +
      '<label for="pe-seo-t">Tytuł strony</label><input type="text" id="pe-seo-t" maxlength="120" value="' + esc(s.title) + '"><div class="pe-cnt" id="pe-seo-tc"></div>' +
      '<label for="pe-seo-d">Opis strony</label><textarea id="pe-seo-d" maxlength="320">' + esc(s.description) + '</textarea><div class="pe-cnt" id="pe-seo-dc"></div>' +
      '<div class="pe-serp"><div class="u">pao-elite.pl</div><div class="t" id="pe-serp-t"></div><div class="d" id="pe-serp-d"></div></div>' +
      '<p class="pe-hint">Zapis tytułu i opisu następuje razem z przyciskiem <b>Zapisz i opublikuj</b>.</p>';
    var t = D.getElementById('pe-seo-t'), d = D.getElementById('pe-seo-d');
    function odsw(){
      stan.seoNowe = {title: t.value.trim(), description: d.value.trim()};
      var tc = D.getElementById('pe-seo-tc'), dc = D.getElementById('pe-seo-dc');
      tc.textContent = t.value.length + ' znaków (do ok. 60 widać w całości)'; tc.className = 'pe-cnt' + (t.value.length > 65 ? ' zla' : '');
      dc.textContent = d.value.length + ' znaków (do ok. 160 widać w całości)'; dc.className = 'pe-cnt' + (d.value.length > 165 ? ' zla' : '');
      D.getElementById('pe-serp-t').textContent = t.value.length > 65 ? t.value.slice(0, 62) + '…' : t.value;
      D.getElementById('pe-serp-d').textContent = d.value.length > 165 ? d.value.slice(0, 162) + '…' : d.value;
      odswiezStatus();
    }
    t.addEventListener('input', odsw); d.addEventListener('input', odsw); odsw();
  }

  function panelHistoria(pb){
    var h = stan.historia || [];
    if (!h.length){ pb.innerHTML = '<p class="pe-hint">Historia jest pusta — pojawi się po pierwszym zapisie.</p>'; return; }
    pb.innerHTML = '<p class="pe-hint">Wersje sprzed każdego zapisu. Przywrócenie też da się cofnąć (tworzy nowy wpis).</p>' +
      h.map(function(x){ return '<div class="pe-hi"><div>' + esc(x.ts) + '<small>' + esc(x.opis) + ' · pól z własną treścią w tej wersji: ' + x.pol + '</small></div><button class="pe-btn" data-id="' + esc(x.id) + '" type="button">Przywróć</button></div>'; }).join('');
    pb.onclick = function(e){
      var b = e.target.closest('[data-id]'); if (!b) return;
      if (liczbaZmian() && !confirm('Masz niezapisane zmiany — przywrócenie wersji je skasuje. Kontynuować?')) return;
      if (!confirm('Przywrócić tę wersję strony? Zmiana od razu pojawi się na stronie.')) return;
      b.disabled = true;
      api('strona/przywroc', {id: b.getAttribute('data-id')}).then(function(j){
        if (j.ok){ toast('Przywrócono wersję — odświeżam stronę…'); aktywny = false; removeEventListener('beforeunload', ostrzez); setTimeout(function(){ location.reload(); }, 900); }
        else { toast(j.blad || 'Nie udało się przywrócić', true); b.disabled = false; }
      });
    };
  }

  /* ------------------------------------------------------------- galeria */
  var galKlucz = 'ogolne';
  function panelGaleria(pb){
    var klucze = stan.galeria_klucze || [], opisy = stan.galeria_opisy || [];
    var opts = '<optgroup label="Zdjęcia z realizacji (pasek na dole animacji)">' + klucze.map(function(k){ return '<option value="' + esc(k.id) + '"' + (k.id === galKlucz ? ' selected' : '') + '>' + esc(k.nazwa) + '</option>'; }).join('') + '</optgroup>' +
      '<optgroup label="Zdjęcie w dymku „tak robimy” (jedno na warstwę)">' + opisy.map(function(k){ return '<option value="opisy:' + esc(k.id) + '"' + (('opisy:' + k.id) === galKlucz ? ' selected' : '') + '>' + esc(k.nazwa) + '</option>'; }).join('') + '</optgroup>';
    pb.innerHTML = '<label for="pe-gk">Sekcja</label><select id="pe-gk">' + opts + '</select><div id="pe-gl"></div>' +
      '<label for="pe-gp">Podpis nowych zdjęć (opcjonalnie)</label><input type="text" id="pe-gp" maxlength="90" placeholder="np. Elewacja w Oleśnicy, 180 m²">' +
      '<label class="pe-up" id="pe-gu"><input type="file" id="pe-gf" accept="image/jpeg,image/png,image/webp" multiple>Kliknij lub przeciągnij zdjęcia tutaj<br><small>zmniejszę je automatycznie do 1800 px</small></label>' +
      '<p class="pe-hint" id="pe-gs"></p>';
    var sel = D.getElementById('pe-gk');
    sel.onchange = function(){ galKlucz = sel.value; rysujGalerie(); };
    var f = D.getElementById('pe-gf'), u = D.getElementById('pe-gu');
    f.onchange = function(){ wyslijPliki([].slice.call(f.files)); f.value = ''; };
    ['dragenter', 'dragover'].forEach(function(n){ u.addEventListener(n, function(e){ e.preventDefault(); u.classList.add('drag'); }); });
    ['dragleave', 'drop'].forEach(function(n){ u.addEventListener(n, function(e){ e.preventDefault(); u.classList.remove('drag'); }); });
    u.addEventListener('drop', function(e){ wyslijPliki([].slice.call(e.dataTransfer.files)); });
    rysujGalerie();
  }
  function wlasneZdjecia(){
    var m = stan.galeria || {};
    if (galKlucz.indexOf('opisy:') === 0){ var o = (m.opisy || {})[galKlucz.slice(6)]; return o ? [{src: o.foto, podpis: '', opis: true}] : []; }
    var lista = m[galKlucz] || [];
    // alias z dodaj.py: sekcja bez własnych zdjęć pokazuje cudze — tu pokazujemy tylko to, co leży w folderze tej sekcji
    return lista.filter(function(x){ return x.src.indexOf(galKlucz + '/') === 0; });
  }
  function rysujGalerie(){
    var gl = D.getElementById('pe-gl'); if (!gl) return;
    var l = wlasneZdjecia(), opis = galKlucz.indexOf('opisy:') === 0, t = '?t=' + Date.now();
    gl.innerHTML = l.length ? '<div class="pe-gal">' + l.map(function(x, i){
      return '<div class="pe-gi"><img src="/galeria/' + esc(x.src) + t + '" alt="">' + (opis ? '' : '<input type="text" data-i="' + i + '" value="' + esc(x.podpis || '') + '" placeholder="podpis" maxlength="90">') +
        '<button type="button" data-del="' + esc(x.src) + '">Usuń</button></div>'; }).join('') + '</div>' :
      '<p class="pe-hint">Ta sekcja nie ma jeszcze własnych zdjęć' + (opis ? '.' : ' (strona pokazuje wtedy zdjęcia z pokrewnej sekcji, jeśli są).') + '</p>';
    gl.onchange = function(e){
      var i = e.target.getAttribute && e.target.getAttribute('data-i'); if (i == null) return;
      api('strona/galeria/podpis', {src: l[+i].src, podpis: e.target.value}).then(function(j){ toast(j.ok ? 'Podpis zapisany ✓' : (j.blad || 'Błąd'), !j.ok); });
    };
    gl.onclick = function(e){
      var d = e.target.closest('[data-del]'); if (!d) return;
      if (!confirm('Usunąć to zdjęcie z galerii? Zniknie ze strony.')) return;
      api('strona/galeria/usun', {src: d.getAttribute('data-del')}).then(function(j){ toast(j.ok ? 'Usunięto ✓' : (j.blad || 'Błąd'), !j.ok); if (j.ok) odswiezStan().then(rysujGalerie); });
    };
  }
  function zmniejsz(file){
    return createImageBitmap(file).then(function(bmp){
      var max = 1800, s = Math.min(1, max / Math.max(bmp.width, bmp.height)), c = D.createElement('canvas');
      c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      return new Promise(function(res){ c.toBlob(res, 'image/jpeg', 0.86); });
    });
  }
  function blobNaBase64(b){ return new Promise(function(res){ var r = new FileReader(); r.onload = function(){ res(String(r.result).split(',')[1] || ''); }; r.readAsDataURL(b); }); }
  function wyslijPliki(pliki){
    pliki = pliki.filter(function(f){ return /^image\//.test(f.type); });
    var st = D.getElementById('pe-gs'), podpis = (D.getElementById('pe-gp') || {}).value || '';
    if (!pliki.length){ if (st) st.textContent = 'Wybierz zdjęcia (JPG, PNG lub WEBP).'; return; }
    if (galKlucz.indexOf('opisy:') === 0) pliki = pliki.slice(0, 1);
    var ok = 0, i = 0;
    (function nast(){
      if (i >= pliki.length){ if (st) st.textContent = 'Gotowe: dodano ' + ok + ' z ' + pliki.length + '.'; toast('Zdjęcia dodane (' + ok + ') ✓'); odswiezStan().then(rysujGalerie); return; }
      var f = pliki[i++]; if (st) st.textContent = 'Wysyłam ' + i + ' z ' + pliki.length + '…';
      zmniejsz(f).then(blobNaBase64).then(function(b64){
        return api('strona/galeria/dodaj', {klucz: galKlucz, dane: b64, podpis: podpis || (pliki.length === 1 ? '' : '')});
      }).then(function(j){ if (j.ok) ok++; else toast(j.blad || 'Nie udało się dodać zdjęcia', true); nast(); }).catch(function(){ toast('Błąd przy wysyłaniu zdjęcia', true); nast(); });
    })();
  }

  window.PaoEdytor = {otworz: otworz};
})();
