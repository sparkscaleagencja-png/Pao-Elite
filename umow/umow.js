/* Okno „Umów bezpłatną wycenę”. Wolne godziny przychodzą z aplikacji PAO Elite (/_a/api/termin/…).
   Gdy kalendarz jest wyłączony albo nie obejmuje kodu pocztowego: prośba z preferowanym dniem i porą (/_a/api/wycena). */
(function(){
  var API = '/_a/api', TEL = '608 355 327';
  var DNI = ['niedz.','pon.','wt.','śr.','czw.','pt.','sob.'], MIES = ['sty','lut','mar','kwi','maj','cze','lip','sie','wrz','paź','lis','gru'];
  var USL = ['Renowacja elewacji','Czyszczenie i malowanie dachów','Hydroizolacja dachu płaskiego','Wymiana pokrycia dachowego, w tym pokryć z eternitu','Posadzki żywiczne','Taras i schody','Termomodernizacja','Naprawa poddasza po kunach i zabezpieczenie przed ich powrotem','Inne / nie wiem'];
  function E(t, a, d){
    var e = document.createElement(t), k, z;
    for (k in a || {}) {
      if (k === 'text') e.textContent = a[k];
      else if (k === 'on') for (z in a.on) e.addEventListener(z, a.on[z]);
      else if (a[k] != null && a[k] !== false) e.setAttribute(k, a[k] === true ? '' : a[k]);
    }
    (d || []).forEach(function(x){ if (x) e.append(x); });
    return e;
  }
  function stat(x){ try { window.pegazStat && window.pegazStat('klik', x); } catch (_) {} }
  function api(s, p){
    return fetch(API + s, p ? {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(p)} : {cache:'no-store'}).then(function(r){
      return r.json().catch(function(){ return {}; }).then(function(d){
        if (!r.ok || !d.ok) { var e = new Error(d.blad || 'Nie udało się połączyć. Zadzwoń: ' + TEL + '.'); e.zajety = d.zajety; throw e; }
        return d;
      });
    }, function(){ throw new Error('Brak połączenia. Sprawdź internet albo zadzwoń: ' + TEL + '.'); });
  }
  function nazwaUslugi(u){
    var t = [].slice.call(document.querySelectorAll('.tile')).filter(function(x){ return x.dataset.service === u; })[0], h = t && t.querySelector('h3');
    return h ? h.textContent.trim() : u;
  }
  function dzienTxt(iso){ var d = new Date(iso + 'T12:00'); return {d: DNI[d.getDay()], m: d.getDate() + ' ' + MIES[d.getMonth()]}; }
  function pole(id, txt, a, opc){
    a = a || {};
    var at = Object.assign({id: 'um-' + id, name: id}, a); delete at.tag;
    var i = E(a.tag || 'input', at);
    return {w: E('div', {}, [E('label', {'for': 'um-' + id}, [txt + ' ', opc ? E('small', {text: '(opcjonalnie)'}) : null]), i]), i: i};
  }
  function zaznacz(rodzic, b){ [].forEach.call(rodzic.children, function(x){ x.setAttribute('aria-pressed', String(x === b)); }); }
  function przewin(e, blok){ e.scrollIntoView({block: blok || 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}); }
  var okno, tresc, wroc, S;

  function otworz(usluga){
    if (okno) return;
    wroc = document.activeElement;
    S = {usluga: USL.indexOf(usluga) >= 0 ? usluga : '', zdj: [], wToku: 0, dni: null, dzien: '', godz: '', tryb: ''};
    tresc = E('div', {'class': 'um-t'});
    okno = E('div', {'class': 'um-tlo', on: {mousedown: function(e){ if (e.target === okno && !S.wpisane) zamknij(); }}}, [
      E('div', {'class': 'um', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'um-tyt'}, [
        E('div', {'class': 'um-g'}, [E('h2', {id: 'um-tyt', text: 'Umów bezpłatną wycenę'}), E('button', {'class': 'um-x', type: 'button', 'aria-label': 'Zamknij', text: '×', on: {click: zamknij}})]), tresc])]);
    document.body.append(okno); document.documentElement.classList.add('um-stop'); document.addEventListener('keydown', klawisz);
    formularz(); stat('okno umawiania');
  }
  function zamknij(){
    if (!okno) return;
    okno.remove(); okno = null; document.documentElement.classList.remove('um-stop'); document.removeEventListener('keydown', klawisz);
    if (location.hash === '#umow') history.replaceState(null, '', location.pathname + location.search);
    if (wroc && wroc.focus) wroc.focus({preventScroll: true});
  }
  function klawisz(e){
    if (e.key === 'Escape') return zamknij();
    if (e.key !== 'Tab') return;
    var f = [].slice.call(okno.querySelectorAll('button,input,select,textarea,a[href]')).filter(function(x){ return x.offsetParent && !x.disabled && x.tabIndex >= 0; });
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }

  function formularz(){
    var us = pole('usluga', 'Usługa', {tag: 'select', required: true}),
        kod = pole('kod', 'Kod pocztowy', {inputmode: 'numeric', autocomplete: 'postal-code', placeholder: '56-400', maxlength: 6, required: true}),
        mi = pole('miejscowosc', 'Miejscowość', {autocomplete: 'address-level2', placeholder: 'np. Oleśnica', required: true});
    us.i.append(E('option', {value: '', text: '— wybierz —'}));
    USL.forEach(function(u){ us.i.append(E('option', {value: u, text: nazwaUslugi(u), selected: u === S.usluga})); });
    kod.i.addEventListener('input', function(){ var c = kod.i.value.replace(/\D/g, '').slice(0, 5); kod.i.value = c.length > 2 ? c.slice(0, 2) + '-' + c.slice(2) : c; });
    var bl = E('div', {'class': 'um-err', role: 'alert'}), dalej = E('div'), b = E('button', {'class': 'um-b', type: 'submit', text: 'Sprawdź terminy'});
    function blad(m, i){ bl.textContent = m; bl.style.display = m ? 'block' : 'none'; if (i) i.focus(); }
    function od_nowa(){ S.dni = null; dalej.textContent = ''; b.className = 'um-b'; b.textContent = 'Sprawdź terminy'; }
    function rysuj(kom){
      dalej.textContent = ''; blad('');
      if (S.tryb === 'kalendarz') kalendarz(dalej, kom); else prosba(dalej);
      przewin(dalej);
    }
    function sprawdz(){
      blad('');
      if (!us.i.value) return blad('Wybierz usługę.', us.i);
      if (!/^\d{2}-\d{3}$/.test(kod.i.value)) return blad('Podaj kod pocztowy, np. 56-400.', kod.i);
      if (mi.i.value.trim().length < 2) return blad('Podaj miejscowość.', mi.i);
      S.usluga = us.i.value; S.kod = kod.i.value; S.miejscowosc = mi.i.value.trim(); S.dzien = S.godz = '';
      b.disabled = true; b.textContent = 'Sprawdzam…';
      api('/termin/wolne', {usluga: S.usluga, kod: S.kod}).then(function(d){ S.dni = d.dni; }, function(){ S.dni = {}; }).then(function(){
        S.tryb = Object.keys(S.dni).length ? 'kalendarz' : 'prosba';
        b.disabled = false; b.textContent = 'Sprawdź ponownie'; b.className = 'um-b j'; rysuj();
      });
    }
    S.odswiez = function(kom){
      return api('/termin/wolne', {usluga: S.usluga, kod: S.kod}).then(function(d){ S.dni = d.dni; S.dzien = S.godz = ''; S.tryb = Object.keys(d.dni).length ? 'kalendarz' : 'prosba'; rysuj(kom); });
    };
    /* zmiana usługi albo kodu po sprawdzeniu: pokazane godziny przestają być ważne */
    us.i.addEventListener('change', function(){ if (S.dni && us.i.value !== S.usluga) od_nowa(); });
    kod.i.addEventListener('input', function(){ if (S.dni && kod.i.value !== S.kod) od_nowa(); });
    mi.i.addEventListener('input', function(){ S.miejscowosc = mi.i.value.trim() || S.miejscowosc; });
    tresc.append(E('p', {text: 'Przyjedziemy, obejrzymy i zmierzymy. Wybierz usługę i napisz, gdzie.'}),
      E('form', {novalidate: true, on: {submit: function(e){ e.preventDefault(); sprawdz(); }, input: function(){ S.wpisane = true; }}}, [us.w, E('div', {'class': 'um-k'}, [kod.w, mi.w]), bl, E('div', {'class': 'um-rz'}, [b])]), dalej);
    setTimeout(function(){ (S.usluga ? kod.i : us.i).focus({preventScroll: true}); }, 30);
  }

  function wyborDnia(box, dni, naWybor, kom){
    var godz = E('div'), kr = E('div', {'class': 'um-dni'});
    if (kom) box.append(E('div', {'class': 'um-info'}, [E('p', {text: kom})]));
    box.append(E('h3', {text: 'Wybierz dzień'}), kr, godz);
    Object.keys(dni).forEach(function(d){
      var t = dzienTxt(d), b = E('button', {type: 'button', 'aria-pressed': 'false', 'data-d': d}, [E('small', {text: t.d}), t.m]);
      b.addEventListener('click', function(){ zaznacz(kr, b); S.dzien = d; S.godz = ''; naWybor(false); godziny(d); });
      kr.append(b);
    });
    function godziny(d){
      var g = E('div', {'class': 'um-godz'});
      godz.textContent = ''; godz.append(E('h3', {text: 'Wybierz godzinę'}), g);
      dni[d].forEach(function(h){
        var b = E('button', {type: 'button', 'aria-pressed': 'false', text: h});
        b.addEventListener('click', function(){ zaznacz(g, b); S.godz = h; naWybor(true); });
        g.append(b);
      });
      przewin(godz, 'nearest');
    }
  }

  function kalendarz(box, kom){
    var dane = E('div', {hidden: true});
    wyborDnia(box, S.dni, function(ok){
      dane.hidden = !ok;
      if (ok && !dane.firstChild) daneKlienta(dane);
      if (ok) setTimeout(function(){ przewin(dane); }, 40);
    }, kom);
    box.append(dane);
  }
  function prosba(box){
    var j = new Date(Date.now() + 864e5), min = j.getFullYear() + '-' + ('0' + (j.getMonth() + 1)).slice(-2) + '-' + ('0' + j.getDate()).slice(-2);
    var dz = pole('dzien', 'Który dzień Ci pasuje?', {type: 'date', min: min}, true), pory = E('div', {'class': 'um-pora'});
    ['rano', 'w południe', 'po południu', 'obojętnie'].forEach(function(p){
      var b = E('button', {type: 'button', 'aria-pressed': 'false', text: p});
      b.addEventListener('click', function(){ zaznacz(pory, b); S.pora = p; });
      pory.append(b);
    });
    dz.i.addEventListener('change', function(){ S.prefDzien = dz.i.value; });
    box.append(E('div', {'class': 'um-info'}, [E('p', {text: 'Godzinę ustalamy telefonicznie, bo zależy od trasy. Napisz, kiedy Ci pasuje, a oddzwonimy z propozycją terminu.'})]), dz.w, E('label', {text: 'Pora dnia'}), pory);
    daneKlienta(box);
  }

  function daneKlienta(box){
    var kal = S.tryb === 'kalendarz',
        im = pole('imie', 'Imię', {autocomplete: 'name'}),
        te = pole('telefon', 'Telefon', {type: 'tel', inputmode: 'tel', autocomplete: 'tel', placeholder: 'np. 600 123 456'}),
        ma = pole('email', 'E-mail', {type: 'email', inputmode: 'email', autocomplete: 'email'}, true),
        ad = pole('adres', 'Ulica i numer', {autocomplete: 'street-address', placeholder: 'np. Polna 5'}, !kal),
        uw = pole('uwagi', 'Uwagi', {tag: 'textarea', placeholder: 'Co chcesz odnowić, orientacyjny metraż, dojazd…'}, true);
    var fot = E('div', {'class': 'um-foto'}), plik = E('input', {type: 'file', accept: 'image/*', multiple: true, hidden: true});
    plik.addEventListener('change', function(){ dodajZdjecia(plik.files, fot); plik.value = ''; });
    var zg = E('input', {type: 'checkbox', id: 'um-zg'}), pulapka = E('input', {type: 'text', name: 'firma', tabindex: -1, autocomplete: 'off', 'aria-hidden': 'true', style: 'position:absolute;left:-9999px;opacity:0;width:1px'});
    var bl = E('div', {'class': 'um-err', role: 'alert'}), b = E('button', {'class': 'um-b', type: 'button', text: kal ? 'Zarezerwuj termin' : 'Wyślij prośbę o termin', on: {click: wyslij}});
    function blad(m, i){ bl.textContent = m; bl.style.display = m ? 'block' : 'none'; if (i) i.focus(); }
    function wyslij(){
      blad('');
      var tel = te.i.value.replace(/\D/g, '');
      if (kal && !S.godz) return blad('Wybierz dzień i godzinę.');
      if (im.i.value.trim().length < 2) return blad('Podaj imię.', im.i);
      if (!/^\+?[\d\s().-]+$/.test(te.i.value.trim()) || tel.length < 9 || tel.length > 13) return blad('Podaj poprawny numer telefonu (min. 9 cyfr).', te.i);
      if (ma.i.value.trim() && !ma.i.checkValidity()) return blad('Adres e-mail wygląda na niepoprawny, możesz go zostawić pusty.', ma.i);
      if (kal && !ad.i.value.trim()) return blad('Podaj ulicę i numer (albo numer domu).', ad.i);
      if (!zg.checked) return blad('Zaznacz zgodę na kontakt w sprawie wyceny.', zg);
      if (S.wToku > 0) return blad('Zdjęcia jeszcze się wczytują, spróbuj za chwilę.');
      var p = {usluga: S.usluga, kod: S.kod, miejscowosc: S.miejscowosc, adres: ad.i.value, imie: im.i.value, telefon: te.i.value, email: ma.i.value, zdjecia: S.zdj, rodo: true, firma: pulapka.value, zrodlo: window.PaoUmow.zrodlo()};
      var t0 = b.textContent; b.disabled = true; b.textContent = 'Wysyłam…';
      (kal ? api('/termin/rezerwuj', Object.assign(p, {dzien: S.dzien, godz: S.godz, uwagi: uw.i.value}))
           : api('/wycena', Object.assign(p, {wiadomosc: uw.i.value, prefer_dzien: S.prefDzien || '', prefer_pora: S.pora || ''}))).then(function(d){
        stat(kal ? 'WYCENA: termin zarezerwowany' : 'WYCENA: prośba wysłana');
        if (kal && d.t) gotowe(d); else gotoweProsba();
      }, function(e){
        b.disabled = false; b.textContent = t0;
        if (e.zajety) S.odswiez(e.message).catch(function(){ blad(e.message); }); else blad(e.message);
      });
    }
    box.append(E('h3', {text: 'Twoje dane'}), E('div', {'class': 'um-2'}, [im.w, te.w]), ma.w, ad.w, uw.w,
      E('label', {}, ['Zdjęcia ', E('small', {text: '(opcjonalnie, do 4)'})]), E('button', {type: 'button', 'class': 'um-b j', text: 'Dodaj zdjęcia', on: {click: function(){ plik.click(); }}}), plik, fot, pulapka,
      E('label', {'class': 'um-zg'}, [zg, E('span', {}, ['Zgadzam się na przetwarzanie moich danych przez PAO Elite Przemysław Obruśnik w celu umówienia i przygotowania wyceny. Szczegóły: ', E('a', {href: 'polityka-prywatnosci.html', target: '_blank', rel: 'noopener', text: 'polityka prywatności'}), '.'])]),
      bl, E('div', {'class': 'um-rz'}, [b]));
  }

  function dodajZdjecia(pliki, box){
    [].slice.call(pliki).forEach(function(pl){
      if (S.zdj.length + S.wToku >= 4) return;
      S.wToku++;
      var u = URL.createObjectURL(pl), im = new Image();
      im.onload = function(){
        S.wToku--;
        var k = Math.min(1, 1600 / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        var d = c.toDataURL('image/jpeg', .8), b64 = d.split(',')[1], s = E('span', {style: 'background-image:url(' + d + ')'});
        S.zdj.push(b64);
        s.append(E('button', {type: 'button', 'aria-label': 'Usuń zdjęcie', text: '×', on: {click: function(){ S.zdj.splice(S.zdj.indexOf(b64), 1); s.remove(); }}}));
        box.append(s);
      };
      im.onerror = function(){ S.wToku--; URL.revokeObjectURL(u); box.append(E('p', {text: 'Tego pliku nie da się wczytać. Wyślij JPG albo PNG.'})); };
      im.src = u;
    });
  }

  function gotowe(d){
    var link = location.origin + '/termin.html#t=' + d.t, wst = d.status === 'wstepna';
    var czym = d.poczta && d.sms ? ', e-mailem i SMS-em.' : d.poczta ? ', e-mailem.' : d.sms ? ', SMS-em.' : wst ? ', telefonicznie lub SMS-em.' : '.';
    tresc.textContent = ''; tresc.scrollTop = 0; S.wpisane = false;
    tresc.append(E('p', {'class': 'um-ok', text: wst ? 'Termin zarezerwowany wstępnie' : 'Termin potwierdzony'}), E('p', {text: d.termin.charAt(0).toUpperCase() + d.termin.slice(1)}), E('p', {text: d.adres + ', ' + d.kod + ' ' + d.miejscowosc}),
      E('div', {'class': 'um-info'}, [E('p', {text: wst ? 'Ten termin jest dla Ciebie zajęty. Potwierdzimy go po sprawdzeniu trasy' + czym : 'Do zobaczenia. Szczegóły znajdziesz pod linkiem poniżej' + (d.poczta || d.sms ? czym.replace(', ', ' oraz dostaniesz je ') : '.')}), E('p', {text: 'Pytania: ' + TEL})]),
      E('p', {text: 'Pod tym linkiem sprawdzisz, zmienisz albo odwołasz termin. Zapisz go:'}), E('p', {}, [E('a', {href: link, text: 'Moja wycena', style: 'color:#a34a30;font-weight:700'})]),
      E('div', {'class': 'um-rz'}, [E('button', {type: 'button', 'class': 'um-b s', text: 'Dodaj do kalendarza', on: {click: function(){ ics(d); }}}),
        E('button', {type: 'button', 'class': 'um-b j', text: 'Kopiuj link', on: {click: function(e){ navigator.clipboard.writeText(link).then(function(){ e.target.textContent = 'Skopiowano'; }, function(){ prompt('Skopiuj link:', link); }); }}}),
        E('button', {type: 'button', 'class': 'um-b j', text: 'Zamknij', on: {click: zamknij}})]));
  }
  function gotoweProsba(){
    tresc.textContent = ''; tresc.scrollTop = 0; S.wpisane = false;
    tresc.append(E('p', {'class': 'um-ok', text: 'Dziękujemy, mamy Twoją prośbę'}), E('p', {text: 'Oddzwonimy z propozycją terminu. Jeśli wolisz od razu porozmawiać, zadzwoń: ' + TEL + '.'}),
      E('div', {'class': 'um-rz'}, [E('a', {'class': 'um-b', href: 'tel:+48608355327', text: 'Zadzwoń'}), E('button', {type: 'button', 'class': 'um-b j', text: 'Zamknij', on: {click: zamknij}})]));
  }
  function ics(d){
    /* czas lokalny polski (bez przeliczania na strefę telefonu) */
    function z(x){ return x.toISOString().replace(/[-:]|\.\d{3}Z/g, ''); }
    var s = new Date(d.start + ':00Z'), k = new Date(s.getTime() + d.czas_min * 6e4), e = function(t){ return String(t).replace(/([\\;,])/g, '\\$1'); };
    var t = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PAO Elite//PL', 'BEGIN:VEVENT', 'UID:' + z(s) + '-wycena@pao-elite.pl', 'DTSTAMP:' + z(new Date()) + 'Z', 'DTSTART;TZID=Europe/Warsaw:' + z(s), 'DTEND;TZID=Europe/Warsaw:' + z(k),
      'SUMMARY:Wycena PAO Elite' + (d.status === 'wstepna' ? ' (do potwierdzenia)' : ''), 'LOCATION:' + e(d.adres + ', ' + d.kod + ' ' + d.miejscowosc), 'DESCRIPTION:' + e(d.usluga + '. Tel. ' + TEL), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var a = E('a', {href: URL.createObjectURL(new Blob([t], {type: 'text/calendar'})), download: 'wycena-pao-elite.ics'});
    document.body.append(a); a.click(); a.remove();
  }
  window.PaoOkno = {otworz: otworz, _wyborDnia: function(box, dni, stan, cb, kom){ S = stan; wyborDnia(box, dni, cb, kom); }, _api: api, _ics: ics, _E: E};
})();
