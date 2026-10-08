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

function renderGame() {
  const g = S.game;
  const dealerCards = $('dealerCards');
  const playerCards = $('playerCards');
  const dealerScore = $('dealerScore');
  const playerScore = $('playerScore');
  const betArea = $('betArea');
  const actionBar = $('actionBar');
  const resultMsg = $('resultMsg');

  if (!g || g.status === 'idle' || g.status === 'finished') {
    // schermo puntata
    dealerCards.innerHTML = '';
    playerCards.innerHTML = '';
    dealerScore.hidden = true;
    playerScore.hidden = true;
    betArea.hidden = false;
    actionBar.hidden = true;

    if (S.lastResult) {
      resultMsg.hidden = false;
      resultMsg.className = 'msg ' + (S.lastResult.outcome || 'info');
      resultMsg.textContent = S.lastResult.message || '';
    } else {
      resultMsg.hidden = true;
    }

    // precompila puntata con ultima o default
    const maxBet = Math.max(10, S.user?.limit || 0);
    const inp = $('bet');
    inp.max = maxBet;
    if (Number(inp.value) > maxBet) inp.value = Math.min(100, maxBet);
    return;
  }

  // partita in corso o appena finita (prima del reset)
  betArea.hidden = true;

  // carte dealer
  const showDealer = g.status === 'finished' || g.status === 'dealer_turn';
  dealerCards.innerHTML = (g.dealer || []).map((c, i) =>
    cardHtml(c, !showDealer && i === 1)
  ).join('');

  // carte player
  playerCards.innerHTML = (g.player || []).map(c => cardHtml(c)).join('');

  // punteggi
  const pVal = g.playerValue ?? handValue(g.player || []);
  playerScore.hidden = false;
  playerScore.textContent = pVal;

  if (showDealer) {
    const dVal = g.dealerValue ?? handValue(g.dealer || []);
    dealerScore.hidden = false;
    dealerScore.textContent = dVal;
  } else {
    dealerScore.hidden = true;
  }

  // azioni
  const canAct = g.status === 'player_turn' && !S.busy;
  actionBar.hidden = !canAct;
  $('hitBtn').disabled = !canAct;
  $('standBtn').disabled = !canAct;
  $('doubleBtn').disabled = !canAct || !g.canDouble;

  // messaggio risultato
  if (g.status === 'finished' && g.result) {
    resultMsg.hidden = false;
    resultMsg.className = 'msg ' + (g.result.outcome || 'info');
    resultMsg.textContent = g.result.message || '';
    S.lastResult = g.result;
  } else {
    resultMsg.hidden = true;
  }
}

function renderAll() {
  renderWallet();
  renderStats();
  renderGame();
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
    renderAll();
  } catch (e) {
    $('table').innerHTML = `<div class="empty">${esc(e.message || 'Impossibile caricare il blackjack.')}<br><br><small>Apri di nuovo il blackjack tramite il comando sul bot WhatsApp.</small></div>`;
  }
}

async function startGame() {
  if (S.busy) return;
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
    if (r.game?.result) S.lastResult = r.game.result;
    renderAll();
  } catch (e) {
    toast(e.message, true);
  } finally {
    S.busy = false;
    $('dealBtn').disabled = false;
    renderAll();
  }
}

async function doAction(action) {
  if (S.busy || !S.game || S.game.status !== 'player_turn') return;
  S.busy = true;
  renderAll();
  try {
    const r = await api('/api/blackjack/action', {
      method: 'POST',
      body: JSON.stringify({ action })
    });
    if (!r.success) throw new Error(r.message);
    S.user = r.user || S.user;
    S.stats = r.stats || S.stats;
    S.game = r.game;
    if (r.game?.result) S.lastResult = r.game.result;
    renderAll();
  } catch (e) {
    toast(e.message, true);
  } finally {
    S.busy = false;
    renderAll();
  }
}

// Eventi
$('dealBtn').addEventListener('click', startGame);
$('hitBtn').addEventListener('click', () => doAction('hit'));
$('standBtn').addEventListener('click', () => doAction('stand'));
$('doubleBtn').addEventListener('click', () => doAction('double'));

$('bet').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startGame();
});

loadState();
// refresh periodico del saldo (quando non si sta giocando)
setInterval(() => {
  if (!S.busy && document.visibilityState === 'visible' && TOKEN) {
    if (!S.game || S.game.status === 'idle' || S.game.status === 'finished') {
      loadState();
    }
  }
}, 45000);
