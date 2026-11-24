/* Umawianie wyceny: lekki start (źródło wejścia + otwieranie okna). Okno (umow.js, umow.css) ładuje się dopiero po kliknięciu. */
(function(){
  var W = '?v=1', KL = 'pao_zrodlo';
  /* skąd przyszedł klient: pierwsze wejście w tej wizycie (sessionStorage, bez ciasteczek i bez identyfikatorów reklamowych) */
  function zrodlo(){
    try { var z = sessionStorage.getItem(KL); if (z) return JSON.parse(z); } catch (_) {}
    var q = new URLSearchParams(location.search), o = {strona: location.pathname};
    ['utm_source','utm_medium','utm_campaign'].forEach(function(k){ if (q.get(k)) o[k] = q.get(k).slice(0, 80); });
    if (q.get('gclid') || q.get('gbraid') || q.get('wbraid')) o.reklama = 'google'; else if (q.get('fbclid')) o.reklama = 'meta'; else if (q.get('ttclid')) o.reklama = 'tiktok';
    try { var r = document.referrer && new URL(document.referrer).hostname; if (r && r.replace(/^www\./,'') !== location.hostname.replace(/^www\./,'')) o.referer = r; } catch (_) {}
    try { sessionStorage.setItem(KL, JSON.stringify(o)); } catch (_) {}
    return o;
  }
  zrodlo();
  var lok = /^(localhost|127\.0\.0\.1)$/.test(location.hostname), moja = lok || /(^|\.)pao-elite\.pl$/.test(location.hostname);
  var laduje = null;
  function zaladuj(){
    if (laduje) return laduje;
    laduje = new Promise(function(ok, zle){
      var l = document.createElement('link'), zostalo = 2, gotowe = function(){ if (!--zostalo) ok(); };
      l.rel = 'stylesheet'; l.href = 'umow/umow.css' + W; l.onload = gotowe; l.onerror = gotowe; document.head.appendChild(l);
      var s = document.createElement('script'); s.src = 'umow/umow.js' + W; s.onload = gotowe; s.onerror = function(){ laduje = null; zle(); }; document.head.appendChild(s);
    });
    return laduje;
  }
  function otworz(usluga){
    if (document.documentElement.classList.contains('pe-on')) return;
    if (!moja) { location.href = 'https://pao-elite.pl/#umow'; return; }
    zaladuj().then(function(){ window.PaoOkno.otworz(usluga || ''); }, function(){ var k = document.getElementById('kontakt'); if (k) k.scrollIntoView(); else location.href = 'index.html#kontakt'; });
  }
  window.PaoUmow = {otworz: otworz, zrodlo: zrodlo};
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('[data-umow]'); if (!a || document.documentElement.classList.contains('pe-on')) return;
    e.preventDefault(); otworz(a.getAttribute('data-umow'));
  });
  addEventListener('message', function(e){ if (e.origin === location.origin && e.data && e.data.type === 'umow') otworz(String(e.data.usluga || '')); });
  function zHasha(){ if (location.hash === '#umow') otworz(''); }
  addEventListener('hashchange', zHasha); zHasha();
})();
