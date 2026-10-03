// URL del server del bot (quello con la route /api/profilo). '' se sito e API sono sullo stesso dominio.
const API_BASE = 'https://phishy-websites.onrender.com';

// Immagini di Phishy: tutte 1536x1024 (3:2). Cartella: public/img/
const A = {
    portrait: '/img/phishy-vestito_rosso_fisheye.jpeg',
    stato: '/img/phishy_farfalle.jpeg',
    info: '/img/phishy_fuma_ps2.jpeg',
    prof: '/img/20250902_0309_Professoressa_Pixel_Art_remix_01k43zdghafeya83p5srawgy8q.png',
    gruppi: '/img/phishy_creepy_cherry.jpeg'
};

const $ = (id) => document.getElementById(id);
const nf = new Intl.NumberFormat('it-IT');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dataIT = (ms) => (ms > 0 ? new Date(ms).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
const ic = (n) => `<svg class="ic"><use href="#i-${n}"/></svg>`;
const img = (src, cls = '', extra = '') => `<img ${cls ? `class="${cls}"` : ''} src="${src}" width="1536" height="1024" alt="" ${extra} onerror="this.remove()">`;

const roman = (n) => {
    n = Math.floor(n);
    if (n <= 0 || n >= 4000) return String(Math.max(0, n));
    let r = '';
    for (const [v, s] of [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']])
        while (n >= v) { r += s; n -= v; }
    return r;
};

// [campo, etichetta, icona]
const TILES = [
    ['level', 'Livello', 'star'], ['exp', 'Esperienza', 'spark'], ['limit', 'Caramelle', 'candy'],
    ['credito', 'Credito', 'card'], ['euro', 'Euro', 'euro'], ['bank', 'Banca', 'bank'],
    ['vita', 'Vita', 'heart'], ['messages', 'Messaggi', 'chat'], ['stickerCount', 'Sticker', 'sticker'],
    ['joincount', 'Join', 'door'], ['spam', 'Spam', 'mega'], ['warn', 'Warn', 'warn'],
    ['callWarn', 'Warn chiamate', 'phone'], ['tprem', 'Tprem', 'crown']
];

function countUp(el, target) {
    const fmt = (v) => nf.format(Math.round(v));
    if (reduced || !isFinite(target)) { el.textContent = fmt(target); return; }
    const t0 = performance.now(), dur = 1100;
    const step = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function render(u) {
    const nome = u.name === 'Sconosciuto' ? 'Easter Bone' : (u.name && u.name !== '?' ? u.name : 'Utente');
    const health = Math.max(0, Math.min(100, Number(u.health) || 0));
    const bd = (cls, icon, t) => `<span class="bd ${cls}">${ic(icon)}${t}</span>`;

    const badges = [
        u.registered ? bd('ok', 'check', 'Registrato') : bd('', 'warn', 'Non registrato'),
        u.role ? bd('gold', 'ribbon', esc(u.role)) : '',
        u.premium ? bd('gold', 'crown', 'Premium') : '',
        u.sposato ? bd('', 'ring', 'Sposato' + (u.partner ? ' con ' + esc(u.partner) : '')) : '',
        u.muto ? bd('bad', 'mute', 'Muto') : '',
        u.banned ? bd('bad', 'ban', 'Bannato') : ''
    ].join('');

    const tiles = TILES.map(([k, label, icon], n) =>
        `<div class="tile t${(n % 6) + 1} pop" style="--i:${n}"><div class="ico">${ic(icon)}</div><b data-n="${Number(u[k]) || 0}">0</b><span>${label}</span></div>`
    ).join('');

    const sw = (label, icon, on, red) => `<div class="sw"><span>${ic(icon)}${label}</span><div class="tg ${on ? 'on' : ''} ${red ? 'red' : ''}"></div></div>`;
    const row = (icon, l, v) => `<div class="row"><span>${ic(icon)}${l}</span><b>${esc(v)}</b></div>`;

    const gruppi = (u.groups || []).map((g, n) => {
        const chips = Object.entries(g.stats || {}).map(([k, v]) =>
            `<span class="chip">${esc(k)}: ${typeof v === 'number' ? nf.format(v) : typeof v === 'boolean' ? (v ? 'sì' : 'no') : esc(v)}</span>`).join('');
        return `<div class="card g pop" style="--i:${n}"><h4>${ic('group')}${esc(g.name)}</h4><div class="chips">${chips || '<span class="chip">nessuna statistica</span>'}</div></div>`;
    }).join('');

    const rib = (icon, t, c) => `<div class="rib"><span>${ic(icon)}${t}</span><span class="cnt">${c}</span></div>`;

    $('profileResult').innerHTML = `
    <div class="card hero pop">
      <div class="por">${img(A.portrait)}<div class="seal"><b>${roman(u.level)}</b><small>LIVELLO</small></div></div>
      <div>
        <h2 class="name">${esc(nome)}</h2>
        <p class="meta">${esc(u.lavoro || 'disoccupato')}${u.age > 0 ? ', ' + u.age + ' anni' : ''}</p>
        <div class="badges">${badges}</div>
        <div class="vital">
          <div><span>${ic('heart')} Salute</span></div>
          <div class="bar"><div class="fill" id="fill"></div><span class="pct" id="pct">0%</span></div>
        </div>
      </div>
    </div>
    ${u.registered ? '' : `<div class="note pop" style="--i:2">${img(A.prof)}<span>Il registro non ti conosce ancora: molti valori restano quelli di default finché non usi il comando <b>.reg</b></span></div>`}

    ${rib('star', 'Statistiche', roman(TILES.length) + ' voci')}
    <div class="grid">${tiles}</div>

    ${rib('ribbon', 'Dossier', 'II schede')}
    <div class="two">
      <div class="card panel pop">${img(A.stato, 'band')}<div class="in">
        ${sw('Registrato', 'check', u.registered)}${sw('Premium', 'crown', u.premium)}${sw('Sposato', 'ring', u.sposato)}${sw('Muto', 'mute', u.muto, true)}${sw('Bannato', 'ban', u.banned, true)}
      </div></div>
      <div class="card panel pop" style="--i:2">${img(A.info, 'band')}<div class="in">
        ${row('cal', 'Età', u.age > 0 ? u.age + ' anni' : '—')}${row('job', 'Lavoro', u.lavoro || 'disoccupato')}${row('ring', 'Partner', u.partner || '—')}
        ${row('cal', 'Registrato il', dataIT(u.regTime))}${row('cal', 'Primo accesso', dataIT(u.firstTime))}${row('crown', 'Premium fino al', dataIT(u.premiumDate))}
        ${row('chat', 'Descrizione', u.descrizione || 'nessuna descrizione')}
      </div></div>
    </div>

    ${rib('group', 'Gruppi', roman((u.groups || []).length) + (u.groups && u.groups.length ? '' : ' voci'))}
    ${img(A.gruppi, 'gband')}
    ${gruppi ? `<div class="groups">${gruppi}</div>` : '<div class="card empty">Nessun dato di gruppo per questo utente.</div>'}`;

    $('profileResult').querySelectorAll('[data-n]').forEach((el) => countUp(el, Number(el.dataset.n)));
    requestAnimationFrame(() => requestAnimationFrame(() => {
        $('fill').style.width = health + '%';
        countUp($('pct'), health);
        setTimeout(() => { $('pct').textContent = health + '%'; }, 1200);
    }));
}

// Legge il numero dall'URL: ?393534409026 | ?numero=393534409026 | /profilo/393534409026
function numeroDaUrl() {
    const dec = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
    const p = new URLSearchParams(location.search);
    let v = p.get('numero') || p.get('n') || p.get('tel') || p.get('num');
    if (!v && location.search.length > 1 && !location.search.includes('=')) v = dec(location.search.slice(1));
    if (!v) { const m = location.pathname.match(/\/profilo\/([^/]+)\/?$/); if (m) v = dec(m[1]); }
    return (v || '').replace(/[^0-9]/g, '');
}

async function cercaUtente() {
    const input = $('numeroInput').value.replace(/[^0-9]/g, '');
    const err = $('errorMsg'), res = $('profileResult'), loader = $('loader');
    const mostraErrore = (t) => { err.innerHTML = ic('ban') + '<span>' + esc(t) + '</span>'; err.hidden = false; };
    err.hidden = true; res.hidden = true;

    if (!input) return mostraErrore('Inserisci un numero prima di cercare.');

    loader.hidden = false;
    try {
        const r = await fetch(`${API_BASE}/api/profilo/${input}`);
        if (!(r.headers.get('content-type') || '').includes('application/json')) {
            return mostraErrore(`Il server API non risponde come previsto (HTTP ${r.status}). Controlla API_BASE in profilo-web.js.`);
        }
        const json = await r.json();
        if (json.success) {
            render(json.data); res.hidden = false;
            if (location.pathname.endsWith('.html')) history.replaceState(null, '', '?' + input);
        } else mostraErrore(json.message || 'Utente non trovato.');
    } catch (e) {
        console.error('Errore fetch API:', e);
        mostraErrore('Impossibile comunicare con il database.');
    } finally {
        loader.hidden = true;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    $('searchForm').addEventListener('submit', (e) => { e.preventDefault(); cercaUtente(); });
    const n = numeroDaUrl();
    if (n) { $('numeroInput').value = n; cercaUtente(); }
});
