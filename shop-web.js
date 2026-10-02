/* ─── renderShop: ogni categoria avvolta in un carosello ─── */
function renderShop() {
    $('view').innerHTML = S.catalog.map((c) => `
      <div class="rib"><span>${ic(CAT_ICON[c.name] || 'star')}${esc(clean(c.name))}</span><span class="cnt">${c.items.length}</span></div>
      <div class="carousel-wrap"><div class="carousel">${c.items.map((i, n) => {
          const p = price(i), off = p < i.price, owned = S.inv[i.key] || 0;
          const locked = HOUSES.includes(i.key) && S.user.casa;
          const q = S.sel['shop:' + i.key] || 1;
          return `<article class="card item" style="--i:${n}">
            ${off ? `<span class="off">-${i.discount}%</span>` : ''}
            <img src="${getItemImage(i.key)}" alt="${esc(clean(i.name))}" width="200" height="200" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';">
            <h3>${esc(clean(i.name))}</h3>
            <div class="price">${ic('candy')}${nf.format(p)}${off ? `<s>${nf.format(i.price)}</s>` : ''}</div>
            ${owned ? `<span class="left">Ne hai ${nf.format(owned)}</span>` : ''}
            <div class="row">${stepper('shop:' + i.key, q)}<button class="btn" data-add="${i.key}" ${locked ? 'disabled title="Hai già una casa"' : ''}>${ic('plus')}Aggiungi</button></div>
          </article>`;
      }).join('')}</div></div>`).join('');
}

/* ─── renderBag: carosello unico per lo zaino ─────────────── */
function renderBag() {
    const rows = Object.entries(S.inv).map(([k, owned]) => ({ i: find(k), owned })).filter((r) => r.i && r.i.sell > 0);
    $('view').innerHTML = `<div class="rib"><span>${ic('bag')}Zaino</span><span class="cnt">${rows.length}</span></div>` + (rows.length
        ? `<div class="carousel-wrap"><div class="carousel">${rows.map(({ i, owned }, n) => {
            const q = Math.min(S.sel['sell:' + i.key] || 1, owned);
            return `<article class="card item" style="--i:${n}">
              <img src="${getItemImage(i.key)}" alt="${esc(clean(i.name))}" width="200" height="200" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';">
              <h3>${esc(clean(i.name))}</h3><span class="left">Ne hai ${nf.format(owned)}</span>
              <div class="price">${ic('candy')}${nf.format(i.sell)}<s>cad.</s></div>
              <div class="row">${stepper('sell:' + i.key, q)}<button class="btn" data-sell="${i.key}">Vendi</button></div>
            </article>`;
        }).join('')}</div></div>` : '<div class="card empty">Lo zaino è vuoto.</div>');
}

/* ─── renderAll: preserva lo scroll orizzontale + init 3D ─── */
function renderAll() {
    // salva scroll di ogni carosello prima di ricostruire
    const scrolls = [];
    document.querySelectorAll('.carousel').forEach((c, i) => { scrolls[i] = c.scrollLeft; });

    renderWallet();
    S.tab === 'shop' ? renderShop() : renderBag();
    renderCartBar();
    if (!$('drawer').hidden) renderDrawer();

    // ripristina scroll + inizializza la curvatura 3D
    document.querySelectorAll('.carousel').forEach((c, i) => {
        if (scrolls[i] !== undefined) c.scrollLeft = scrolls[i];
    });
    initCarousels();
}

/* ─── Carousel: init + update 3D ──────────────────────────── */
const CAROUSEL_MAX_ANGLE = 18; // gradi max di rotazione ai bordi

function updateCarousel(carousel) {
    const carRect = carousel.getBoundingClientRect();
    if (carRect.width === 0) return;
    const centerX = carRect.left + carRect.width / 2;
    const half = carRect.width / 2;
    carousel.querySelectorAll('.item').forEach((item) => {
        const r = item.getBoundingClientRect();
        const itemCenterX = r.left + r.width / 2;
        // offset: -1 = estrema sinistra, 0 = centro, +1 = estrema destra
        let offset = (itemCenterX - centerX) / half;
        offset = Math.max(-1.5, Math.min(1.5, offset));
        const ry = offset * CAROUSEL_MAX_ANGLE;
        item.style.setProperty('--ry', ry.toFixed(2) + 'deg');
    });
}

function initCarousels() {
    document.querySelectorAll('.carousel').forEach((c) => {
        if (!c.dataset.init) {
            c.dataset.init = '1';
            const onScroll = () => updateCarousel(c);
            c.addEventListener('scroll', onScroll, { passive: true });
            // ricalcola anche al resize / quando cambia il layout
            if ('ResizeObserver' in window) {
                new ResizeObserver(() => updateCarousel(c)).observe(c);
            }
        }
    });
    // primo calcolo dopo il layout
    requestAnimationFrame(() => {
        document.querySelectorAll('.carousel').forEach(updateCarousel);
    });
}
