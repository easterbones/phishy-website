// URL del server del bot (quello che esegue main.js e ha la route /api/profilo).
// Lascia '' solo se sito e bot sono sullo stesso dominio.
const API_BASE = 'https://phishy-websites.onrender.com';

const $ = (id) => document.getElementById(id);
const nf = new Intl.NumberFormat('it-IT');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dataIT = (ms) => (ms > 0 ? new Date(ms).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

// [campo, etichetta, icona, colore]
const TILES = [
    ['level', 'Livello', '⭐', '#ffd86b'],
    ['exp', 'Esperienza', '✨', '#b9a4ff'],
    ['limit', 'Caramelle', '🍬', '#ff9ec4'],
    ['credito', 'Credito', '💳', '#8fe3c8'],
    ['euro', 'Euro', '💶', '#9bd0ff'],
    ['bank', 'Banca', '🏦', '#ffb98a'],
    ['vita', 'Vita', '💖', '#ff9a9a'],
    ['messages', 'Messaggi', '💬', '#a5e8ff'],
    ['stickerCount', 'Sticker', '🖼️', '#d8b4ff'],
    ['joincount', 'Join', '🚪', '#c8e89a'],
    ['spam', 'Spam', '📢', '#ffd0a0'],
    ['warn', 'Warn', '⚠️', '#ffe28a'],
    ['callWarn', 'Warn chiamate', '📞', '#ffb3b3'],
    ['tprem', 'Tprem', '👑', '#f5c6ff']
];

function countUp(el, target, fmt = (v) => nf.format(Math.round(v))) {
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
    let i = 0;
    const nome = u.name === 'Sconosciuto' ? 'Easter Bone' : (u.name && u.name !== '?' ? u.name : 'Utente');
    const health = Math.max(0, Math.min(100, Number(u.health) || 0));

    const badges = [
        u.registered ? '<span class="badge good">✅ Registrato</span>' : '<span class="badge">📝 Non registrato</span>',
        u.role ? `<span class="badge">🎖️ ${esc(u.role)}</span>` : '',
        u.premium ? '<span class="badge good">👑 Premium</span>' : '',
        u.sposato ? `<span class="badge">💍 Sposato${u.partner ? ' con ' + esc(u.partner) : ''}</span>` : '',
        u.muto ? '<span class="badge bad">🔇 Muto</span>' : '',
        u.banned ? '<span class="badge bad">🚫 Bannato</span>' : ''
    ].join('');

    const tiles = TILES.map(([k, label, ico, c]) =>
        `<div class="tile pop" style="--c:${c};--i:${++i + 4}"><div class="ico">${ico}</div><b data-n="${Number(u[k]) || 0}">0</b><span>${label}</span></div>`
    ).join('');

    const sw = (label, on, red) => `<div class="sw"><span>${label}</span><div class="tg ${on ? 'on' : ''} ${red ? 'red' : ''}"></div></div>`;
    const row = (l, v) => `<div class="row"><span>${l}</span><b>${esc(v)}</b></div>`;

    const gruppi = (u.groups || []).map((g, n) => {
        const chips = Object.entries(g.stats || {}).map(([k, v]) =>
            `<span class="chip">${esc(k)}: ${typeof v === 'number' ? nf.format(v) : typeof v === 'boolean' ? (v ? 'sì' : 'no') : esc(v)}</span>`).join('');
        return `<div class="clay g pop" style="--i:${n}"><h4>👥 ${esc(g.name)}</h4><div class="chips">${chips || '<span class="chip">nessuna statistica</span>'}</div></div>`;
    }).join('');

    $('profileResult').innerHTML = `
    <div class="clay hero pop">
      <div class="avatar">${esc((Array.from(nome.trim())[0] || '?').toUpperCase())}</div>
      <div>
        <h2 class="name" style="margin:0 0 6px">${esc(nome)}</h2>
        <p class="sub">💼 ${esc(u.lavoro || 'disoccupato')}${u.age > 0 ? ' · 🎂 ' + u.age + ' anni' : ''}</p>
        <div class="badges">${badges}</div>
      </div>
      <div class="gauge">
        <svg viewBox="0 0 200 110"><path d="M20 100A80 80 0 0 1 180 100" fill="none" stroke="var(--ib)" stroke-width="22" stroke-linecap="round"/>
        <path id="gaugeArc" d="M20 100A80 80 0 0 1 180 100" fill="none" stroke="url(#gg)" stroke-width="22" stroke-linecap="round" stroke-dasharray="251.3" stroke-dashoffset="251.3" style="transition:stroke-dashoffset 1.4s cubic-bezier(.34,1.2,.64,1)"/>
        <defs><linearGradient id="gg" x1="0" x2="1"><stop offset="0" stop-color="var(--acc2)"/><stop offset="1" stop-color="var(--acc)"/></linearGradient></defs></svg>
        <div class="val"><span data-n="${health}">0</span><small>%</small></div>
        <div class="lbl">❤️ SALUTE</div>
      </div>
    </div>
    ${u.registered ? '' : '<div class="clay notice pop" style="--i:2">📝 Profilo non registrato: molti valori restano quelli di default finché l\'utente non usa il comando <b>.reg</b></div>'}

    <h2>📊 Statistiche</h2>
    <div class="grid">${tiles}</div>

    <div class="two">
      <div><h2>🎛️ Stato</h2><div class="clay panel pop" style="--i:3">
        ${sw('Registrato', u.registered)}${sw('Premium', u.premium)}${sw('Sposato', u.sposato)}${sw('Muto', u.muto, true)}${sw('Bannato', u.banned, true)}
      </div></div>
      <div><h2>🪪 Informazioni</h2><div class="clay panel pop" style="--i:4">
        ${row('Età', u.age > 0 ? u.age + ' anni' : '—')}${row('Lavoro', u.lavoro || 'disoccupato')}${row('Partner', u.partner || '—')}
        ${row('Registrato il', dataIT(u.regTime))}${row('Primo accesso', dataIT(u.firstTime))}${row('Premium fino al', dataIT(u.premiumDate))}
        ${row('Descrizione', u.descrizione || 'nessuna descrizione')}
      </div></div>
    </div>

    <h2>👥 Gruppi (${(u.groups || []).length})</h2>
    ${gruppi ? `<div class="groups">${gruppi}</div>` : '<div class="clay panel">Nessun dato di gruppo per questo utente.</div>'}`;

    // animazioni numeri e gauge
    $('profileResult').querySelectorAll('[data-n]').forEach((el) => countUp(el, Number(el.dataset.n)));
    requestAnimationFrame(() => requestAnimationFrame(() => {
        const arc = $('gaugeArc');
        if (arc) arc.style.strokeDashoffset = 251.3 * (1 - health / 100);
    }));
}

async function cercaUtente() {
    const input = $('numeroInput').value.replace(/[^0-9]/g, '');
    const err = $('errorMsg'), res = $('profileResult'), loader = $('loader');
    const mostraErrore = (t) => { err.textContent = t; err.hidden = false; };
    err.hidden = true; res.hidden = true;

    if (!input) return mostraErrore('⚠️ Inserisci un numero prima di cercare.');

    loader.hidden = false;
    try {
        const r = await fetch(`${API_BASE}/api/profilo/${input}`);
        if (!(r.headers.get('content-type') || '').includes('application/json')) {
            return mostraErrore(`❌ Il server API non risponde come previsto (HTTP ${r.status}). Controlla API_BASE in profilo-web.js.`);
        }
        const json = await r.json();
        if (json.success) { render(json.data); res.hidden = false; }
        else mostraErrore(json.message || 'Utente non trovato.');
    } catch (e) {
        console.error('Errore fetch API:', e);
        mostraErrore('❌ Impossibile comunicare con il database.');
    } finally {
        loader.hidden = true;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    $('searchForm').addEventListener('submit', (e) => { e.preventDefault(); cercaUtente(); });

    const root = document.documentElement, btn = $('themeBtn');
    const applica = (t) => { root.dataset.theme = t; btn.textContent = t === 'dark' ? '☀️' : '🌙'; };
    let salvato = null;
    try { salvato = localStorage.getItem('tema'); } catch {}
    applica(salvato || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    btn.addEventListener('click', () => {
        const t = root.dataset.theme === 'dark' ? 'light' : 'dark';
        applica(t);
        try { localStorage.setItem('tema', t); } catch {}
    });
});
