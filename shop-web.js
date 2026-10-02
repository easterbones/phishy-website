// URL del server API. '' se il sito è servito dallo stesso server (consigliato).
const API_BASE = '';
const PLACEHOLDER_IMG = '/assets/img/avatar-logo.png';

const $ = (id) => document.getElementById(id);
const nf = new Intl.NumberFormat('it-IT');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (s) => String(s).replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').replace(/\s+/g, ' ').trim();
const ic = (n) => `<svg class="ic"><use href="#i-${n}"/></svg>`;
const TOKEN = new URLSearchParams(location.search).get('t') || '';
const CAT_ICON = { POZIONI: 'potion', VEICOLI: 'car', ATTREZZI: 'rod', SEMI: 'seed', PROTEZIONI: 'shield', SPECIALI: 'star', ANIMALI: 'paw', CASE: 'house' };
const SHIELDS = ['scudo', 'scudo3h', 'scudo6h', 'scudo12h'];
const HOUSES = ['monolocale', 'villa', 'castello'];

const S = { catalog: [], user: null, inv: {}, cart: {}, tab: 'shop', sel: {}, busy: false, mixed: false, msg: null };
const items = () => S.catalog.flatMap((c) => c.items);
const find = (k) => items().find((i) => i.key === k);
const price = (i) => (i.discount && i.expiresAt && Date.parse(i.expiresAt) > Date.now() ? i.final : i.price);
const maxQty = (k) => (SHIELDS.includes(k) || HOUSES.includes(k) ? 1 : 99);
const cartLines = () => Object.entries(S.cart).map(([k, q]) => ({ i: find(k), q })).filter((l) => l.i);
const total = () => cartLines().reduce((a, l) => a + price(l.i) * l.q, 0);
const count = () => cartLines().reduce((a, l) => a + l.q, 0);

function toast(t, bad) {
    const el = $('toast'); el.textContent = t; el.className = 'toast' + (bad ? ' bad' : ''); el.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 3500);
}

async function api(path, opt = {}) {
    const r = await fetch(API_BASE + path, { ...opt, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN } });
    if (!(r.headers.get('content-type') || '').includes('application/json')) throw new Error('Il server non risponde come previsto (HTTP ' + r.status + ').');
    return r.json();
}

function stepper(id, v) {
    return `<div class="stp" data-id="${id}"><button type="button" data-d="-1" aria-label="Meno">${ic('minus')}</button><output>${v}</output><button type="button" data-d="1" aria-label="Più">${ic('plus')}</button></div>`;
}

function renderWallet() {
    if (!S.user) { $('wallet').innerHTML = ''; return; }
    $('wallet').innerHTML = `<span class="chip">${ic('candy')}<span>${nf.format(S.user.limit)}<br><small>Portafoglio</small></span></span><span class="chip">${ic('card')}<span>${nf.format(S.user.credito)}<br><small>Carta</small></span></span>`;
}

/* ────────────────────────────────────────────────────────────
   CAROSELLO — init + aggiornamento curvatura 3D
   ──────────────────────────────────────────────────────────── */
const CAROUSEL_MAX_ANGLE = 18; // gradi max di rotazione ai bordi

function updateCarousel(carousel) {
    const carRect = carousel.getBoundingClientRect();
    if (!carRect.width) return;
    const centerX = carRect.left + carRect.width / 2;
    const half = carRect.width / 2;
    carousel.querySelectorAll('.item').forEach((item) => {
        const r = item.getBoundingClientRect();
        const itemCenterX = r.left + r.width / 2;
        let offset = (itemCenterX - centerX) / half;
        offset = Math.max(-1.5, Math.min(1.5, offset));
        item.style.setProperty('--ry', (offset * CAROUSEL_MAX_ANGLE).toFixed(2) + 'deg');
    });
}

function initCarousels() {
    document.querySelectorAll('.carousel').forEach((c) => {
        if (!c.dataset.init) {
            c.dataset.init = '1';
            c.addEventListener('scroll', () => updateCarousel(c), { passive: true });
            if ('ResizeObserver' in window) new ResizeObserver(() => updateCarousel(c)).observe(c);
        }
    });
    requestAnimationFrame(() => document.querySelectorAll('.carousel').forEach(updateCarousel));
}
/* ──────────────────────────────────────────────────────────── */

function renderShop() {
    $('view').innerHTML = S.catalog.map((c) => `
      <div class="rib"><span>${ic(CAT_ICON[c.name] || 'star')}${esc(clean(c.name))}</span><span class="cnt">${c.items.length}</span></div>
      <div class="carousel-wrap"><div class="carousel">${c.items.map((i, n) => {
          const p = price(i), off = p < i.price, owned = S.inv[i.key] || 0;
          const locked = HOUSES.includes(i.key) && S.user.casa;
          const q = S.sel['shop:' + i.key] || 1;
          return `<article class="card item" style="--i:${n}">
            ${off ? `<span class="off">-${i.discount}%</span>` : ''}
            <img src="${PLACEHOLDER_IMG}" alt="" width="200" height="200" onerror="this.style.visibility='hidden'">
            <h3>${esc(clean(i.name))}</h3>
            <div class="price">${ic('candy')}${nf.format(p)}${off ? `<s>${nf.format(i.price)}</s>` : ''}</div>
            ${owned ? `<span class="left">Ne hai ${nf.format(owned)}</span>` : ''}
            <div class="row">${stepper('shop:' + i.key, q)}<button class="btn" data-add="${i.key}" ${locked ? 'disabled title="Hai già una casa"' : ''}>${ic('plus')}Aggiungi</button></div>
          </article>`;
      }).join('')}</div></div>`).join('');
}

function renderBag() {
    const rows = Object.entries(S.inv).map(([k, owned]) => ({ i: find(k), owned })).filter((r) => r.i && r.i.sell > 0);
    $('view').innerHTML = `<div class="rib"><span>${ic('bag')}Zaino</span><span class="cnt">${rows.length}</span></div>` + (rows.length
        ? `<div class="carousel-wrap"><div class="carousel">${rows.map(({ i, owned }, n) => {
            const q = Math.min(S.sel['sell:' + i.key] || 1, owned);
            return `<article class="card item" style="--i:${n}">
              <img src="${PLACEHOLDER_IMG}" alt="" width="200" height="200" onerror="this.style.visibility='hidden'">
              <h3>${esc(clean(i.name))}</h3><span class="left">Ne hai ${nf.format(owned)}</span>
              <div class="price">${ic('candy')}${nf.format(i.sell)}<s>cad.</s></div>
              <div class="row">${stepper('sell:' + i.key, q)}<button class="btn" data-sell="${i.key}">Vendi</button></div>
            </article>`;
        }).join('')}</div></div>` : '<div class="card empty">Lo zaino è vuoto.</div>');
}

function renderCartBar() {
    const n = count(), b = $('cartBtn');
    b.hidden = !n || S.tab !== 'shop';
    b.innerHTML = `<span>${ic('cart')} Carrello <b>${n}</b></span><span>${ic('candy')} ${nf.format(total())}</span>`;
}

function renderDrawer() {
    const lines = cartLines(), t = total(), u = S.user;
    const fund = S.mixed ? u.limit + u.credito : u.limit;
    const ok = lines.length && t <= fund && !S.busy;
    $('drawerBody').innerHTML = `
      <h2>Carrello <button class="btn alt" id="closeDrawer" aria-label="Chiudi">${ic('close')}</button></h2>
      ${lines.length ? lines.map((l) => `<div class="line"><strong>${esc(clean(l.i.name))}</strong><span class="sum">${nf.format(price(l.i) * l.q)}</span>
        ${stepper('cart:' + l.i.key, l.q)}<button class="btn alt" data-rm="${l.i.key}" aria-label="Rimuovi">${ic('trash')}</button></div>`).join('') : '<div class="empty">Il carrello è vuoto.</div>'}
      <div class="tot"><span>Totale</span><span>${ic('candy')} ${nf.format(t)}</span></div>
      <div class="row"><span>Saldo portafoglio</span><strong>${nf.format(u.limit)}</strong></div>
      <label class="chk"><input type="checkbox" id="mixed" ${S.mixed ? 'checked' : ''}> Usa anche la carta se serve (${nf.format(u.credito)})</label>
      ${lines.length && t > fund ? `<div class="msg bad">Ti mancano ${nf.format(t - fund)}.</div>` : ''}
      ${S.msg ? `<div class="msg ${S.msg.ok ? 'ok' : 'bad'}">${esc(S.msg.t)}</div>` : ''}
      <button class="btn" id="pay" ${ok ? '' : 'disabled'}>${S.busy ? 'Elaborazione...' : 'Conferma acquisto'}</button>`;
}

function renderAll() {
    // salva lo scroll orizzontale dei caroselli prima di ricostruire
    const scrolls = [];
    document.querySelectorAll('.carousel').forEach((c, i) => { scrolls[i] = c.scrollLeft; });

    renderWallet();
    S.tab === 'shop' ? renderShop() : renderBag();
    renderCartBar();
    if (!$('drawer').hidden) renderDrawer();

    // ripristina lo scroll e inizializza la curvatura 3D
    document.querySelectorAll('.carousel').forEach((c, i) => {
        if (scrolls[i] !== undefined) c.scrollLeft = scrolls[i];
    });
    initCarousels();
}

// Invia l'ordine (coda su Mongo) e attende che il bot lo applichi
async function sendOrder(type, lines) {
    if (S.busy) return;
    S.busy = true; S.msg = null; renderAll();
    try {
        const r = await api('/api/shop/checkout', { method: 'POST', body: JSON.stringify({ type, pay: S.mixed ? 'mixed' : 'wallet', items: lines }) });
        if (!r.success) throw new Error(r.message);
        for (let n = 0; n < 40; n++) {
            await new Promise((ok) => setTimeout(ok, 1000));
            const o = await api('/api/shop/order/' + r.orderId);
            if (!o.success) throw new Error(o.message);
            if (o.status === 'done' || o.status === 'rejected') {
                if (o.user) { S.user = o.user; S.inv = o.inventory || {}; }
                if (o.status === 'done') { if (type === 'buy') { S.cart = {}; $('drawer').hidden = true; } toast(o.message); S.msg = null; }
                else { S.msg = { ok: false, t: o.message }; toast(o.message, true); }
                return;
            }
        }
        S.msg = { ok: false, t: 'Il bot non ha ancora elaborato l\'ordine. Controlla lo zaino tra poco.' };
    } catch (e) { S.msg = { ok: false, t: e.message }; toast(e.message, true); }
    finally { S.busy = false; renderAll(); }
}

async function load() {
    try {
        const r = await api('/api/shop/state');
        if (!r.success) throw new Error(r.message);
        S.catalog = r.catalog; S.user = r.user; S.inv = r.inventory || {};
        renderAll();
    } catch (e) {
        $('view').innerHTML = `<div class="card empty">${esc(e.message || 'Impossibile caricare il negozio.')}<br>Apri di nuovo il negozio dal bot su WhatsApp.</div>`;
    }
}

document.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.tab) {
        S.tab = t.dataset.tab;
        document.querySelectorAll('[data-tab]').forEach((b) => { b.classList.toggle('on', b === t); b.classList.toggle('alt', b !== t); });
        return renderAll();
    }
    const stp = t.closest('.stp');
    if (stp && t.dataset.d) {
        const id = stp.dataset.id, d = Number(t.dataset.d), [kind, k] = id.split(':');
        if (kind === 'cart') {
            const q = (S.cart[k] || 1) + d;
            if (q < 1) delete S.cart[k]; else S.cart[k] = Math.min(q, maxQty(k));
        } else {
            const max = kind === 'sell' ? (S.inv[k] || 1) : maxQty(k);
            S.sel[id] = Math.max(1, Math.min((S.sel[id] || 1) + d, max));
        }
        return renderAll();
    }
    if (t.dataset.add) {
        const k = t.dataset.add;
        S.cart[k] = Math.min((S.cart[k] || 0) + (S.sel['shop:' + k] || 1), maxQty(k)); S.sel['shop:' + k] = 1;
        toast('Aggiunto al carrello'); return renderAll();
    }
    if (t.dataset.rm) { delete S.cart[t.dataset.rm]; return renderAll(); }
    if (t.dataset.sell) {
        const k = t.dataset.sell, q = S.sel['sell:' + k] || 1;
        return sendOrder('sell', [{ key: k, qty: q }]).then(() => { S.sel['sell:' + k] = 1; renderAll(); });
    }
    if (t.id === 'cartBtn') { S.msg = null; $('drawer').hidden = false; return renderDrawer(); }
    if (t.id === 'closeDrawer') { $('drawer').hidden = true; return; }
    if (t.id === 'pay') return sendOrder('buy', cartLines().map((l) => ({ key: l.i.key, qty: l.q })));
});
document.addEventListener('change', (e) => { if (e.target.id === 'mixed') { S.mixed = e.target.checked; renderDrawer(); } });
$('drawer').addEventListener('click', (e) => { if (e.target.id === 'drawer') $('drawer').hidden = true; });

load();
setInterval(() => { if (!S.busy && document.visibilityState === 'visible') load(); }, 60000);   // aggiorna sconti e saldo
