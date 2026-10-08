// URL del server API (stesso dello shop)
const API_BASE = 'https://phishy-websites.onrender.com';

const $ = (id) => document.getElementById(id);
const nf = new Intl.NumberFormat('it-IT');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ic = (n) => `<svg class="ic"><use href="#i-${n}"/></svg>`;
const TOKEN = new URLSearchParams(location.search).get('t') || '';

const SUITS = { H: '♥', D: '♦', C: '♣', S: '♠' };
const RED = new Set(['H', 'D']);

/* ── CuteCards.png sprite sheet ───────────────────────────────
   Immagine: 1500 × 576 px
   Griglia:  15 colonne × 4 righe
   Carta:    100 × 144 px  (nessuno gap tra le celle)
   Righe (top→bottom): Clubs, Diamonds, Spades, Hearts
   Colonne (left→right): A 2 3 4 5 6 7 8 9 10 J Q K Joker Back
─────────────────────────────────────────────────────────────── */
const DECK_SRC = '/assets/img/CuteCards.png';
const SHEET_COLS = 15;
const SHEET_ROWS = 4;
const SPRITE_CW = 100; // px nel foglio
const SPRITE_CH = 144;
// dimensione a schermo (mantiene aspect 100:144)
const CARD_W = 80;
const CARD_H = 115;

const SUIT_ROW = { C: 0, D: 1, S: 2, H: 3 };
const RANK_COL = {
  A: 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6,
  '8': 7, '9': 8, '10': 9, J: 10, Q: 11, K: 12
};
const BACK_COL = 14; // dorso a strisce
const BACK_ROW = 2;  // riga spades (dorso nero)

const S = {
  user: null,          // { limit, credito }
  stats: { wins: 0, losses: 0, pushes: 0 },
  game: null,          // stato partita corrente dal server
  busy: false,
  animating: false,
  lastResult: null
};

function toast(t, bad) {
  const el = $('toast');
  el.textContent = t;
  el.className = 'toast' + (bad ? ' bad' : '');
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.hidden = true; }, 3500);
}

async function api(path, opt = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (TOKEN) headers['Authorization'] = 'Bearer ' + TOKEN;

  const r = await fetch(API_BASE + path, { ...opt, headers: { ...headers, ...(opt.headers || {}) } });
  const contentType = r.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Il server non ha risposto in formato JSON (HTTP ' + r.status + ').');
  }
  const data = await r.json();
  if (!r.ok && !data.message) {
    throw new Error('Errore HTTP ' + r.status);
  }
  return data;
}

function spriteStyle(col, row) {
  // usa % così scala con width/height CSS (anche su mobile)
  // posizione: (col / (cols-1)) * 100%  se background-size è in multipli esatti
  // più affidabile: background-size = cols*100% × rows*100% della singola carta
  const sizeX = SHEET_COLS * 100; // 1500%
  const sizeY = SHEET_ROWS * 100; // 400%
  const posX = SHEET_COLS === 1 ? 0 : (col / (SHEET_COLS - 1)) * 100;
  const posY = SHEET_ROWS === 1 ? 0 : (row / (SHEET_ROWS - 1)) * 100;
  return [
    `background-image:url('${DECK_SRC}')`,
    `background-size:${sizeX}% ${sizeY}%`,
    `background-position:${posX}% ${posY}%`,
    `background-repeat:no-repeat`
  ].join(';');
}

function cardHtml(card, hidden = false) {
  if (hidden || card.hidden) {
    return `<div class="playing-card" style="${spriteStyle(BACK_COL, BACK_ROW)}" aria-label="carta coperta"></div>`;
  }
  const col = RANK_COL[card.r];
  const row = SUIT_ROW[card.s];
  if (col === undefined || row === undefined) {
    // fallback testo se rank/suit sconosciuti
    const suit = SUITS[card.s] || card.s;
    return `<div class="playing-card fallback" aria-label="${esc(card.r + suit)}">
      <span class="rank">${esc(card.r)}</span><span class="suit">${suit}</span>
    </div>`;
  }
  const label = esc((card.r || '') + (SUITS[card.s] || card.s || ''));
  return `<div class="playing-card" style="${spriteStyle(col, row)}" aria-label="${label}"></div>`;
}

function handValue(cards) {
  // solo per display lato client (il server è autoritativo)
  let total = 0, aces = 0;
  for (const c of cards) {
    if (c.hidden) continue;
    if (c.r === 'A') { aces++; total += 11; }
    else if (['K', 'Q', 'J'].includes(c.r)) total += 10;
    else total += parseInt(c.r, 10) || 0;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function renderWallet() {
  if (!S.user) { $('wallet').innerHTML = ''; return; }
  $('wallet').innerHTML =
    `<span class="chip">${ic('candy')}<span>${nf.format(S.user.limit)}<br><small>Portafoglio</small></span></span>` +
    `<span class="chip">${ic('card')}<span>${nf.format(S.user.credito)}<br><small>Carta</small></span></span>`;
}

function renderStats() {
  const st = S.stats || { wins: 0, losses: 0, pushes: 0 };
  $('stats').innerHTML =
    `<div class="stat win"><b>${nf.format(st.wins)}</b>Vittorie</div>` +
    `<div class="stat loss"><b>${nf.format(st.losses)}</b>Sconfitte</div>` +
    `<div class="stat push"><b>${nf.format(st.pushes)}</b>Pareggi</div>`;
}

/** Aggiunge una carta al container e la anima dopo `delay` ms */
function appendCard(container, html, { who = 'dealer', delay = 0, flip = false } = {}) {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  const el = wrap.firstElementChild;
  if (!el) return null;
  if (who === 'player') el.classList.add('deal-player');
  if (flip) el.classList.add('flip');
  container.appendChild(el);
  requestAnimationFrame(() => {
    setTimeout(() => el.classList.add('show'), delay);
  });
  return el;
}

function clearHands() {
  const d = $('dealerCards'); if (d) d.innerHTML = '';
  const p = $('playerCards'); if (p) p.innerHTML = '';
  const ds = $('dealerScore'); if (ds) ds.hidden = true;
  const ps = $('playerScore'); if (ps) ps.hidden = true;
  const badge = document.querySelector('.outcome-badge');
  if (badge) badge.remove();
}

function setScore(el, val, show) {
  if (!el) return;
  if (!show) { el.hidden = true; return; }
  el.hidden = false;
  el.textContent = val;
}

function setHidden(id, hidden) {
  const el = typeof id === 'string' ? $(id) : id;
  if (el) el.hidden = !!hidden;
}

function showOutcomeBadge(outcome) {
  const label = $('dealerHand')?.querySelector('.hand-label');
  if (!label) return;
  const old = label.querySelector('.outcome-badge');
  if (old) old.remove();
  if (!outcome) return;
  const map = { win: 'Vinto', loss: 'Perso', push: 'Pareggio' };
  const b = document.createElement('span');
  b.className = 'outcome-badge ' + outcome;
  b.textContent = map[outcome] || outcome;
  label.appendChild(b);
}

/**
 * Render istantaneo (senza animazione) — usato al load e dopo animazioni.
 * @param {{ animate?: boolean, revealDealer?: boolean }} opts
 */
function renderGame(opts = {}) {
  const g = S.game;
  const dealerCards = $('dealerCards');
  const playerCards = $('playerCards');
  const dealerScore = $('dealerScore');
  const playerScore = $('playerScore');

  // ── stato puntata / tavolo vuoto ──
  if (!g || g.status === 'idle') {
    clearHands();
    setHidden('betArea', false);
    setHidden('actionBar', true);
    setHidden('replayBar', true);
    setHidden('resultMsg', true);
    const maxBet = Math.max(10, S.user?.limit || 0);
    const inp = $('bet');
    if (inp) {
      inp.max = maxBet;
      if (Number(inp.value) > maxBet) inp.value = Math.min(100, maxBet);
    }
    return;
  }

  setHidden('betArea', true);

  const finished = g.status === 'finished';
  const showDealer = finished || g.status === 'dealer_turn' || opts.revealDealer;

  // se non stiamo animando, ridisegna tutto
  if (!opts.animate && dealerCards && playerCards) {
    dealerCards.innerHTML = '';
    playerCards.innerHTML = '';
    (g.dealer || []).forEach((c, i) => {
      const html = cardHtml(c, !showDealer && i === 1);
      const el = appendCard(dealerCards, html, { who: 'dealer', delay: 0 });
      if (el) el.classList.add('show');
    });
    (g.player || []).forEach((c) => {
      const html = cardHtml(c);
      const el = appendCard(playerCards, html, { who: 'player', delay: 0 });
      if (el) el.classList.add('show');
    });
  }

  const pVal = g.playerValue ?? handValue(g.player || []);
  setScore(playerScore, pVal, true);

  if (showDealer) {
    setScore(dealerScore, g.dealerValue ?? handValue(g.dealer || []), true);
  } else {
    const first = (g.dealer || [])[0];
    setScore(dealerScore, first ? handValue([first]) : 0, true);
  }

  // azioni
  const canAct = g.status === 'player_turn' && !S.busy && !S.animating;
  setHidden('actionBar', !canAct);
  const hitBtn = $('hitBtn');
  const standBtn = $('standBtn');
  const doubleBtn = $('doubleBtn');
  if (hitBtn) hitBtn.disabled = !canAct;
  if (standBtn) standBtn.disabled = !canAct;
  if (doubleBtn) doubleBtn.disabled = !canAct || !g.canDouble;

  // fine mano: carte scoperte + badge + rigioca (niente testo lungo)
  if (finished) {
    setHidden('actionBar', true);
    setHidden('replayBar', false);
    setHidden('resultMsg', true);
    if (g.result) {
      S.lastResult = g.result;
      showOutcomeBadge(g.result.outcome);
    }
  } else {
    setHidden('replayBar', true);
    setHidden('resultMsg', true);
    showOutcomeBadge(null);
  }
}

function renderAll(opts) {
  renderWallet();
  renderStats();
  renderGame(opts);
}

/** Distribuisce le 4 carte iniziali una alla volta */
async function animateInitialDeal(game) {
  S.animating = true;
  clearHands();
  setHidden('betArea', true);
  setHidden('actionBar', true);
  setHidden('replayBar', true);
  setHidden('resultMsg', true);

  const dealer = game.dealer || [];
  const player = game.player || [];
  const dEl = $('dealerCards');
  const pEl = $('playerCards');
  if (!dEl || !pEl) { S.animating = false; return; }
  const step = 280;

  // ordine classico: player, dealer, player, dealer(hole)
  if (player[0]) appendCard(pEl, cardHtml(player[0]), { who: 'player', delay: 30 });
  await sleep(step);
  if (dealer[0]) appendCard(dEl, cardHtml(dealer[0]), { who: 'dealer', delay: 30 });
  await sleep(step);
  if (player[1]) appendCard(pEl, cardHtml(player[1]), { who: 'player', delay: 30 });
  await sleep(step);
  const holeHidden = game.status === 'player_turn';
  if (dealer[1]) appendCard(dEl, cardHtml(dealer[1], holeHidden), { who: 'dealer', delay: 30 });
  await sleep(step + 80);

  setScore($('playerScore'), game.playerValue ?? handValue(player), true);
  if (holeHidden && dealer[0]) {
    setScore($('dealerScore'), handValue([dealer[0]]), true);
  } else {
    setScore($('dealerScore'), game.dealerValue ?? handValue(dealer), true);
  }

  S.animating = false;
}

/** Aggiunge carte nuove (hit / carte extra del dealer) con animazione */
async function animateNewCards(prevGame, nextGame) {
  S.animating = true;
  const prevP = (prevGame?.player || []).length;
  const prevD = (prevGame?.dealer || []).length;
  const nextP = nextGame.player || [];
  const nextD = nextGame.dealer || [];
  const pEl = $('playerCards');
  const dEl = $('dealerCards');
  const step = 260;

  // nuove carte player
  for (let i = prevP; i < nextP.length; i++) {
    appendCard(pEl, cardHtml(nextP[i]), { who: 'player', delay: 20 });
    await sleep(step);
  }

  // se si passa a finished/dealer_turn: rivela hole card + carte dealer extra
  const wasHidden = prevGame?.status === 'player_turn';
  const nowOpen = nextGame.status === 'finished' || nextGame.status === 'dealer_turn';

  if (wasHidden && nowOpen && nextD[1]) {
    // sostituisci la seconda carta (dorso → faccia)
    const kids = dEl.children;
    if (kids[1]) {
      const html = cardHtml(nextD[1], false);
      const wrap = document.createElement('div');
      wrap.innerHTML = html;
      const neu = wrap.firstElementChild;
      neu.classList.add('flip', 'show');
      kids[1].replaceWith(neu);
      await sleep(320);
    }
  }

  for (let i = Math.max(prevD, 2); i < nextD.length; i++) {
    appendCard(dEl, cardHtml(nextD[i]), { who: 'dealer', delay: 20 });
    await sleep(step);
  }

  setScore($('playerScore'), nextGame.playerValue ?? handValue(nextP), true);
  if (nowOpen || nextGame.status === 'finished') {
    setScore($('dealerScore'), nextGame.dealerValue ?? handValue(nextD), true);
  }

  S.animating = false;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function loadState() {
  try {
    if (!TOKEN) {
      throw new Error('Manca il token di accesso. Apri il link del blackjack generato dal bot WhatsApp.');
    }
    const r = await api('/api/blackjack/state');
    if (!r.success) throw new Error(r.message);
    S.user = r.user;
    S.stats = r.stats || { wins: 0, losses: 0, pushes: 0 };
    S.game = r.game || null;
    if (r.game?.status === 'finished' && r.game.result) {
      S.lastResult = r.game.result;
    }
    // se partita finita da poco: mostra tavolo completo (carte scoperte)
    // se idle/null: tavolo vuoto + puntata
    renderAll();
  } catch (e) {
    $('table').innerHTML = `<div class="empty">${esc(e.message || 'Impossibile caricare il blackjack.')}<br><br><small>Apri di nuovo il blackjack tramite il comando sul bot WhatsApp.</small></div>`;
  }
}

async function startGame() {
  if (S.busy || S.animating) return;
  const bet = Math.floor(Number($('bet').value) || 0);
  if (bet < 10) {
    toast('Puntata minima: 10', true);
    return;
  }
  if (S.user && bet > S.user.limit) {
    toast('Saldo insufficiente', true);
    return;
  }

  S.busy = true;
  S.lastResult = null;
  showOutcomeBadge(null);
  $('dealBtn').disabled = true;
  try {
    const r = await api('/api/blackjack/start', {
      method: 'POST',
      body: JSON.stringify({ bet })
    });
    if (!r.success) throw new Error(r.message);
    S.user = r.user || S.user;
    S.stats = r.stats || S.stats;
    S.game = r.game;

    renderWallet();
    renderStats();
    await animateInitialDeal(r.game);
  } catch (e) {
    toast(e.message, true);
    clearHands();
  } finally {
    S.busy = false;
    S.animating = false;
    const db = $('dealBtn');
    if (db) db.disabled = false;
    // IMPORTANT: render DOPO busy=false, altrimenti i bottoni restano nascosti
    // animate:true → non ridisegnare le carte già animate
    renderWallet();
    renderStats();
    renderGame({ animate: true });
  }
}

async function doAction(action) {
  if (S.busy || S.animating || !S.game || S.game.status !== 'player_turn') return;
  S.busy = true;
  const prev = S.game;
  // disabilita bottoni subito
  renderGame();
  try {
    const r = await api('/api/blackjack/action', {
      method: 'POST',
      body: JSON.stringify({ action })
    });
    if (!r.success) throw new Error(r.message);
    S.user = r.user || S.user;
    S.stats = r.stats || S.stats;
    S.game = r.game;

    renderWallet();
    renderStats();
    await animateNewCards(prev, r.game);
  } catch (e) {
    toast(e.message, true);
  } finally {
    S.busy = false;
    S.animating = false;
    renderWallet();
    renderStats();
    renderGame({ animate: true });
  }
}

function resetTable() {
  S.game = null;
  S.lastResult = null;
  showOutcomeBadge(null);
  clearHands();
  renderAll();
}

// Eventi (safe se l'HTML non è ancora aggiornato)
function on(id, ev, fn) {
  const el = $(id);
  if (el) el.addEventListener(ev, fn);
}
on('dealBtn', 'click', startGame);
on('hitBtn', 'click', () => doAction('hit'));
on('standBtn', 'click', () => doAction('stand'));
on('doubleBtn', 'click', () => doAction('double'));
on('replayBtn', 'click', resetTable);
on('bet', 'keydown', (e) => { if (e.key === 'Enter') startGame(); });

// se manca replayBar nell'HTML (vecchia versione), lo crea
(function ensureReplayBar() {
  if ($('replayBar')) return;
  const controls = $('controls');
  if (!controls) return;
  const bar = document.createElement('div');
  bar.className = 'actions';
  bar.id = 'replayBar';
  bar.hidden = true;
  bar.innerHTML = '<button class="btn teal" id="replayBtn">Gioca ancora</button>';
  controls.appendChild(bar);
  on('replayBtn', 'click', resetTable);
})();

loadState();
// refresh periodico del saldo (quando non si sta giocando)
setInterval(() => {
  if (!S.busy && !S.animating && document.visibilityState === 'visible' && TOKEN) {
    if (!S.game || S.game.status === 'idle') {
      loadState();
    }
  }
}, 45000);
