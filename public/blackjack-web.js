// URL del server API (stesso dello shop)
const API_BASE = 'https://phishy-website.onrender.com';

const $ = (id) => document.getElementById(id);
const nf = new Intl.NumberFormat('it-IT');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ic = (n) => `<svg class="ic"><use href="#i-${n}"/></svg>`;
const TOKEN = new URLSearchParams(location.search).get('t') || '';

const SUITS = { H: '♥', D: '♦', C: '♣', S: '♠' };
const RED = new Set(['H', 'D']);

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

function cardHtml(card, hidden = false) {
  if (hidden || card.hidden) {
    return `<div class="playing-card back" aria-label="carta coperta"></div>`;
  }
  const suit = SUITS[card.s] || card.s;
  const color = RED.has(card.s) ? 'red' : 'black';
  return `<div class="playing-card ${color}" aria-label="${esc(card.r + suit)}">
    <span class="rank">${esc(card.r)}</span>
    <span class="suit">${suit}</span>
  </div>`;
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
