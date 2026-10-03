// Pagina Video Meme. Legge la lista `videoMemesList` da script.js (da caricare PRIMA di questo file).
// Campi di ogni video: { filename: 'x.mp4', title: 'Titolo', date: '2026-10-03' }   <- date è opzionale
(() => {
    // menu mobile: se script.js non è raggiungibile, lo definiamo qui
    if (typeof window.toggleMenu !== 'function') {
        window.toggleMenu = () => { const n = document.getElementById('navLinks'); if (n) n.classList.toggle('show'); };
    }

    const feed = document.getElementById('vw-feed');
    if (!feed) return;

    const PER_PAGE = 5;
    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const src = (f) => 'vid/' + encodeURIComponent(f);
    const slug = (f) => 'v-' + String(f).replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-');
    const fmtTime = (s) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '--:--');
    const fmtDate = (d) => { const t = Date.parse(d); return isNaN(t) ? '' : new Date(t).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }); };

    const list = typeof videoMemesList !== 'undefined' ? videoMemesList : [];
    const items = list.map((v, i) => ({ ...v, n: i + 1, id: slug(v.filename) }));
    const S = { q: '', desc: true, page: 1 };

    const view = () => {
        const a = items.filter((v) => String(v.title || v.filename).toLowerCase().includes(S.q));
        return S.desc ? a.reverse() : a;
    };

    const post = (v, i) => `
    <article class="vw-post" id="${v.id}" style="animation-delay:${i * 70}ms">
      <aside class="vw-author">
        <img class="vw-ava" src="assets/img/avatar-logo.png" alt="" onerror="this.style.visibility='hidden'">
        <div><span class="vw-rank">ARCHIVIO</span>
          <div class="vw-stats">Video <b>#${v.n}</b><br>Durata <b data-dur>--:--</b><br>Risoluzione <b data-res>--</b></div></div>
      </aside>
      <div class="vw-body">
        <header class="vw-posthead"><span><i class="fa-regular fa-clock"></i> ${v.date && fmtDate(v.date) ? 'Caricato il ' + esc(fmtDate(v.date)) : 'Phishy Bot'}</span><a class="vw-num" href="#${v.id}">#${v.n}</a></header>
        <h3 class="vw-vtitle">${esc(v.title || v.filename)}</h3>
        <div class="vw-win">
          <div class="vw-bar"><span class="t">${esc(v.filename)}</span><i class="fa-solid fa-minus"></i><i class="fa-regular fa-square"></i><i class="fa-solid fa-xmark"></i></div>
          <div class="vw-screen"><video controls playsinline preload="metadata" src="${src(v.filename)}"></video></div>
          <div class="vw-status"><span class="rec">REC</span><span data-dur2>--:--</span><span data-res2>--</span></div>
        </div>
        <footer class="vw-foot">
          <button class="vw-btn" type="button" data-act="link" data-id="${v.id}"><i class="fa-solid fa-link"></i> Copia link</button>
          <a class="vw-btn" href="${src(v.filename)}" download><i class="fa-solid fa-download"></i> Scarica</a>
          <button class="vw-btn" type="button" data-act="full"><i class="fa-solid fa-expand"></i> Schermo intero</button>
        </footer>
      </div>
    </article>`;

    const pagerHTML = (pages) => {
        if (pages <= 1) return '';
        const b = (p, t, cls = '') => `<button type="button" class="${cls}" data-page="${p}" ${p < 1 || p > pages ? 'disabled' : ''}>${t}</button>`;
        let h = b(1, '<i class="fa-solid fa-angles-left"></i>') + b(S.page - 1, 'Prec');
        for (let p = 1; p <= pages; p++) h += b(p, p, p === S.page ? 'on' : '');
        return h + b(S.page + 1, 'Succ') + b(pages, '<i class="fa-solid fa-angles-right"></i>') + `<span class="info">Pagina ${S.page} di ${pages}</span>`;
    };

    function render() {
        const a = view(), pages = Math.max(1, Math.ceil(a.length / PER_PAGE));
        S.page = Math.min(Math.max(S.page, 1), pages);
        const slice = a.slice((S.page - 1) * PER_PAGE, S.page * PER_PAGE);
        feed.innerHTML = slice.length ? slice.map(post).join('') : '<div class="vw-empty">Nessun video trovato nel nastro.</div>';
        $('vw-pager-top').innerHTML = $('vw-pager-bot').innerHTML = pagerHTML(pages);
        $('vw-count').textContent = items.length + ' video';
        $('vw-stats').innerHTML = `<li><span>Video totali</span><b>${items.length}</b></li><li><span>Pagine</span><b>${pages}</b></li><li><span>Ordine</span><b>${S.desc ? 'Recenti' : 'Vecchi'}</b></li>`;
    }

    // durata, risoluzione e orientamento letti dal file video
    feed.addEventListener('loadedmetadata', (e) => {
        const v = e.target, p = v.closest && v.closest('.vw-post');
        if (!p) return;
        const d = fmtTime(v.duration), r = `${v.videoWidth}x${v.videoHeight}`;
        p.querySelector('[data-dur]').textContent = p.querySelector('[data-dur2]').textContent = d;
        p.querySelector('[data-res]').textContent = p.querySelector('[data-res2]').textContent = r;
        p.classList.toggle('is-portrait', v.videoHeight > v.videoWidth);
    }, true);

    function toast(t) {
        document.querySelectorAll('.vw-toast').forEach((n) => n.remove());
        const n = document.createElement('div'); n.className = 'vw-toast'; n.textContent = t; document.body.appendChild(n);
        setTimeout(() => n.remove(), 2200);
    }
    const copy = (url, msg) => (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast(msg), () => toast('Copia non riuscita'));

    function jump() {
        const id = location.hash.slice(1);
        if (!items.some((v) => v.id === id)) return;
        S.q = ''; $('vw-q').value = '';
        S.page = Math.floor(view().findIndex((v) => v.id === id) / PER_PAGE) + 1;
        render();
        const el = $(id);
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.classList.add('flash'); }
    }

    document.addEventListener('click', (e) => {
        const t = e.target.closest('[data-page],[data-act]');
        if (!t) return;
        if (t.dataset.page) { S.page = Number(t.dataset.page); render(); $('vw-top').scrollIntoView({ behavior: 'smooth' }); }
        else if (t.dataset.act === 'link') copy(location.origin + location.pathname + '#' + t.dataset.id, 'Link copiato');
        else if (t.dataset.act === 'full') {
            const v = t.closest('.vw-post').querySelector('video');
            (v.requestFullscreen || v.webkitRequestFullscreen || v.webkitEnterFullscreen || (() => {})).call(v);
        }
    });
    $('vw-sort').addEventListener('click', () => {
        S.desc = !S.desc; S.page = 1;
        $('vw-sort').querySelector('span').textContent = S.desc ? 'Più recenti' : 'Più vecchi';
        render();
    });
    $('vw-q').addEventListener('input', (e) => { S.q = e.target.value.trim().toLowerCase(); S.page = 1; render(); });
    $('vw-share').addEventListener('click', () => {
        const url = location.origin + location.pathname;
        if (navigator.share) navigator.share({ title: 'Video Meme - Phishy Bot', url }).catch(() => {}); else copy(url, 'Link della pagina copiato');
    });
    window.addEventListener('hashchange', jump);

    // anteprime "Ultimi caricati" (una volta sola)
    $('vw-thumbs').innerHTML = items.slice(-6).reverse().map((v) =>
        `<a class="vw-th" href="#${v.id}" title="${esc(v.title || v.filename)}"><video muted preload="metadata" src="${src(v.filename)}#t=0.1"></video><span>#${v.n}</span></a>`
    ).join('') || '<p class="vw-muted">Nessuna anteprima.</p>';

    render();
    jump();
})();
