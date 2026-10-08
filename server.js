import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const mongoURI = process.env.MONGODB_URI;
const SHOP_SECRET = process.env.SHOP_SECRET;

// Middleware per il parsing del body JSON
app.use(express.json());

const DatabaseSchema = new mongoose.Schema({
    data: { type: Object, default: {} }
}, { minimize: false });
const Database = mongoose.models.Database || mongoose.model('Database', DatabaseSchema);

let connPromise = global._mongoConn;
function connect() {
    if (!mongoURI) throw new Error('MONGODB_URI non impostata');
    if (!connPromise) {
        connPromise = mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 8000, maxPoolSize: 5 });
        global._mongoConn = connPromise;
        connPromise.catch(() => { connPromise = global._mongoConn = null; });
    }
    return connPromise;
}

// CORS per l'API
app.use('/api', (req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// Helper per verificare il token inviato dal frontend
function verifyToken(token) {
    if (!SHOP_SECRET || !token) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [p, sig] = parts;
    
    const expectedSig = crypto.createHmac('sha256', SHOP_SECRET).update(p).digest('base64url');
    if (sig !== expectedSig) return null;

    try {
        const payload = Buffer.from(p, 'base64url').toString('utf8');
        const [jid, expStr] = payload.split('|');
        const exp = parseInt(expStr, 10);
        if (isNaN(exp) || Date.now() > exp) return null;
        return jid;
    } catch {
        return null;
    }
}

// Middleware di autenticazione per le rotte dello shop / blackjack
function authShop(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const jid = verifyToken(token);
    
    if (!jid) {
        return res.status(401).json({ 
            success: false, 
            message: 'Token non valido o scaduto. Apri di nuovo la pagina dal bot su WhatsApp.' 
        });
    }
    req.userJid = jid;
    next();
}

const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
const bool = (v) => v === true;
const str = (v, d = '') => (typeof v === 'string' ? v : d);

// ==================== BLACKJACK ENGINE ====================

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['H', 'D', 'C', 'S']; // Hearts, Diamonds, Clubs, Spades

function newDeck() {
    const deck = [];
    for (const s of SUITS) {
        for (const r of RANKS) deck.push({ r, s });
    }
    // Fisher-Yates
    for (let i = deck.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function handValue(cards) {
    let total = 0, aces = 0;
    for (const c of cards) {
        if (c.r === 'A') { aces++; total += 11; }
        else if (['K', 'Q', 'J'].includes(c.r)) total += 10;
        else total += parseInt(c.r, 10);
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
}

function isBlackjack(cards) {
    return cards.length === 2 && handValue(cards) === 21;
}

function publicGame(game, revealDealer = false) {
    if (!game) return null;
    const status = game.status;
    const showAll = status === 'finished' || status === 'dealer_turn' || revealDealer;
    return {
        status: game.status,
        bet: game.bet,
        player: game.player,
        dealer: game.dealer.map((c, i) =>
            (!showAll && i === 1) ? { r: '?', s: '?', hidden: true } : { r: c.r, s: c.s }
        ),
        playerValue: handValue(game.player),
        dealerValue: showAll ? handValue(game.dealer) : undefined,
        canDouble: status === 'player_turn' && game.player.length === 2 && !game.doubled,
        result: game.result || null
    };
}

async function getShopUser(db, jid) {
    const shopmeta = db.collection('shopmeta');
    let userDoc = await shopmeta.findOne({ _id: 'user:' + jid });
    if (!userDoc) {
        userDoc = {
            _id: 'user:' + jid,
            limit: 0,
            credito: 0,
            casa: null,
            scudoMs: 0,
            inventory: {},
            bjWins: 0,
            bjLosses: 0,
            bjPushes: 0
        };
        await shopmeta.insertOne(userDoc);
    }
    return userDoc;
}

async function saveShopUser(db, userDoc) {
    const shopmeta = db.collection('shopmeta');
    const { _id, ...rest } = userDoc;
    await shopmeta.updateOne({ _id }, { $set: rest }, { upsert: true });
}

async function getActiveGame(db, jid) {
    const col = db.collection('blackjackgames');
    return col.findOne({ jid, status: { $in: ['player_turn', 'dealer_turn'] } });
}

async function saveGame(db, game) {
    const col = db.collection('blackjackgames');
    if (game._id) {
        const { _id, ...rest } = game;
        await col.updateOne({ _id }, { $set: rest });
    } else {
        const r = await col.insertOne(game);
        game._id = r.insertedId;
    }
    return game;
}

function settle(game, userDoc) {
    const pVal = handValue(game.player);
    const dVal = handValue(game.dealer);
    let outcome, message, payout = 0;

    if (pVal > 21) {
        outcome = 'loss';
        message = `Bust! Hai ${pVal}. Perdi ${game.bet}.`;
        userDoc.bjLosses = (userDoc.bjLosses || 0) + 1;
    } else if (dVal > 21) {
        outcome = 'win';
        payout = game.bet * 2;
        message = `Dealer bust (${dVal})! Vinci ${game.bet}.`;
        userDoc.bjWins = (userDoc.bjWins || 0) + 1;
    } else if (isBlackjack(game.player) && !isBlackjack(game.dealer)) {
        outcome = 'win';
        payout = Math.floor(game.bet * 2.5); // 3:2
        message = `Blackjack! Vinci ${payout - game.bet} (3:2).`;
        userDoc.bjWins = (userDoc.bjWins || 0) + 1;
    } else if (isBlackjack(game.dealer) && !isBlackjack(game.player)) {
        outcome = 'loss';
        message = `Dealer ha Blackjack. Perdi ${game.bet}.`;
        userDoc.bjLosses = (userDoc.bjLosses || 0) + 1;
    } else if (pVal > dVal) {
        outcome = 'win';
        payout = game.bet * 2;
        message = `Hai ${pVal} vs ${dVal}. Vinci ${game.bet}!`;
        userDoc.bjWins = (userDoc.bjWins || 0) + 1;
    } else if (pVal < dVal) {
        outcome = 'loss';
        message = `Hai ${pVal} vs ${dVal}. Perdi ${game.bet}.`;
        userDoc.bjLosses = (userDoc.bjLosses || 0) + 1;
    } else {
        outcome = 'push';
        payout = game.bet; // restituisce la puntata
        message = `Pareggio ${pVal}. Puntata restituita.`;
        userDoc.bjPushes = (userDoc.bjPushes || 0) + 1;
    }

    userDoc.limit = (userDoc.limit || 0) + payout;
    game.status = 'finished';
    game.result = { outcome, message, payout, bet: game.bet };
    return game;
}

function dealerPlay(game) {
    game.status = 'dealer_turn';
    while (handValue(game.dealer) < 17) {
        game.dealer.push(game.deck.pop());
    }
    return game;
}

// ==================== ROTTE API BLACKJACK ====================

app.get('/api/blackjack/state', authShop, async (req, res) => {
    try {
        await connect();
        const db = mongoose.connection.db;
        const userDoc = await getShopUser(db, req.userJid);
        let game = await getActiveGame(db, req.userJid);

        // se non c'è partita attiva, prova a recuperare l'ultima finita (per mostrare il risultato)
        if (!game) {
            const col = db.collection('blackjackgames');
            game = await col.findOne(
                { jid: req.userJid, status: 'finished' },
                { sort: { updatedAt: -1 } }
            );
            // non ripresentare risultati vecchi di più di 2 minuti
            if (game && game.updatedAt && Date.now() - new Date(game.updatedAt).getTime() > 120000) {
                game = null;
            }
        }

        res.set('Cache-Control', 'no-store');
        res.json({
            success: true,
            user: {
                limit: userDoc.limit || 0,
                credito: userDoc.credito || 0
            },
            stats: {
                wins: userDoc.bjWins || 0,
                losses: userDoc.bjLosses || 0,
                pushes: userDoc.bjPushes || 0
            },
            game: publicGame(game)
        });
    } catch (error) {
        console.error('[API blackjack state]', error.message);
        res.status(500).json({ success: false, message: 'Errore di comunicazione col database.' });
    }
});

app.post('/api/blackjack/start', authShop, async (req, res) => {
    try {
        const bet = Math.floor(Number(req.body?.bet) || 0);
        if (bet < 10) {
            return res.status(400).json({ success: false, message: 'Puntata minima: 10.' });
        }

        await connect();
        const db = mongoose.connection.db;

        // blocca se c'è già una partita attiva
        const existing = await getActiveGame(db, req.userJid);
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Hai già una partita in corso. Finiscila prima di iniziarne una nuova.'
            });
        }

        const userDoc = await getShopUser(db, req.userJid);
        if ((userDoc.limit || 0) < bet) {
            return res.status(400).json({ success: false, message: 'Saldo insufficiente.' });
        }

        // scala la puntata subito
        userDoc.limit -= bet;

        const deck = newDeck();
        const player = [deck.pop(), deck.pop()];
        const dealer = [deck.pop(), deck.pop()];

        let game = {
            jid: req.userJid,
            bet,
            deck,
            player,
            dealer,
            doubled: false,
            status: 'player_turn',
            result: null,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // blackjack naturale?
        const pBJ = isBlackjack(player);
        const dBJ = isBlackjack(dealer);

        if (pBJ || dBJ) {
            game = settle(game, userDoc);
            game.updatedAt = new Date();
        }

        await saveGame(db, game);
        await saveShopUser(db, userDoc);

        res.set('Cache-Control', 'no-store');
        res.json({
            success: true,
            user: { limit: userDoc.limit || 0, credito: userDoc.credito || 0 },
            stats: {
                wins: userDoc.bjWins || 0,
                losses: userDoc.bjLosses || 0,
                pushes: userDoc.bjPushes || 0
            },
            game: publicGame(game)
        });
    } catch (error) {
        console.error('[API blackjack start]', error.message);
        res.status(500).json({ success: false, message: 'Errore durante l\'avvio della partita.' });
    }
});

app.post('/api/blackjack/action', authShop, async (req, res) => {
    try {
        const action = String(req.body?.action || '').toLowerCase();
        if (!['hit', 'stand', 'double'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Azione non valida.' });
        }

        await connect();
        const db = mongoose.connection.db;

        let game = await getActiveGame(db, req.userJid);
        if (!game || game.status !== 'player_turn') {
            return res.status(400).json({ success: false, message: 'Nessuna partita attiva in cui puoi agire.' });
        }

        const userDoc = await getShopUser(db, req.userJid);

        if (action === 'double') {
            if (game.player.length !== 2 || game.doubled) {
                return res.status(400).json({ success: false, message: 'Non puoi raddoppiare ora.' });
            }
            if ((userDoc.limit || 0) < game.bet) {
                return res.status(400).json({ success: false, message: 'Saldo insufficiente per raddoppiare.' });
            }
            userDoc.limit -= game.bet;
            game.bet *= 2;
            game.doubled = true;
            game.player.push(game.deck.pop());
            // dopo double si sta sempre
            if (handValue(game.player) > 21) {
                game = settle(game, userDoc);
            } else {
                game = dealerPlay(game);
                game = settle(game, userDoc);
            }
        } else if (action === 'hit') {
            game.player.push(game.deck.pop());
            if (handValue(game.player) > 21) {
                game = settle(game, userDoc);
            }
            // altrimenti resta player_turn
        } else if (action === 'stand') {
            game = dealerPlay(game);
            game = settle(game, userDoc);
        }

        game.updatedAt = new Date();
        await saveGame(db, game);
        await saveShopUser(db, userDoc);

        res.set('Cache-Control', 'no-store');
        res.json({
            success: true,
            user: { limit: userDoc.limit || 0, credito: userDoc.credito || 0 },
            stats: {
                wins: userDoc.bjWins || 0,
                losses: userDoc.bjLosses || 0,
                pushes: userDoc.bjPushes || 0
            },
            game: publicGame(game)
        });
    } catch (error) {
        console.error('[API blackjack action]', error.message);
        res.status(500).json({ success: false, message: 'Errore durante l\'azione.' });
    }
});

// ==================== ROTTE API SHOP ====================

app.get('/api/shop/state', authShop, async (req, res) => {
    try {
        await connect();
        const db = mongoose.connection.db;
        const shopmeta = db.collection('shopmeta');

        const catalogDoc = await shopmeta.findOne({ _id: 'catalog' });
        const userDoc = await shopmeta.findOne({ _id: 'user:' + req.userJid });

        if (!catalogDoc) {
            return res.status(500).json({ success: false, message: 'Catalogo shop non ancora pronto. Riprova tra poco.' });
        }

        res.set('Cache-Control', 'no-store');
        res.json({
            success: true,
            catalog: catalogDoc.categories || [],
            user: userDoc ? {
                limit: userDoc.limit || 0,
                credito: userDoc.credito || 0,
                casa: userDoc.casa || null,
                scudoMs: userDoc.scudoMs || 0
            } : { limit: 0, credito: 0, casa: null, scudoMs: 0 },
            inventory: userDoc?.inventory || {}
        });
    } catch (error) {
        console.error('[API shop state]', error.message);
        res.status(500).json({ success: false, message: 'Errore di comunicazione col database.' });
    }
});

app.post('/api/shop/checkout', authShop, async (req, res) => {
    try {
        const { type, pay, items } = req.body || {};
        if (!type || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Dati ordine non validi.' });
        }

        await connect();
        const db = mongoose.connection.db;
        const shoporders = db.collection('shoporders');

        const newOrder = {
            jid: req.userJid,
            type,
            pay: pay === 'mixed' ? 'mixed' : 'wallet',
            items,
            status: 'pending',
            createdAt: new Date()
        };

        const result = await shoporders.insertOne(newOrder);
        res.json({ success: true, orderId: result.insertedId.toString() });
    } catch (error) {
        console.error('[API shop checkout]', error.message);
        res.status(500).json({ success: false, message: 'Errore durante la registrazione dell\'ordine.' });
    }
});

app.get('/api/shop/order/:id', authShop, async (req, res) => {
    try {
        const orderId = req.params.id;
        await connect();
        const db = mongoose.connection.db;
        const shoporders = db.collection('shoporders');
        const shopmeta = db.collection('shopmeta');

        let objectId;
        try {
            objectId = new mongoose.Types.ObjectId(orderId);
        } catch {
            return res.status(400).json({ success: false, message: 'ID ordine non valido.' });
        }

        const order = await shoporders.findOne({ _id: objectId });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Ordine non trovato.' });
        }

        const response = {
            success: true,
            status: order.status,
            message: order.message || ''
        };

        if (order.status === 'done' || order.status === 'rejected') {
            const userDoc = await shopmeta.findOne({ _id: 'user:' + req.userJid });
            if (userDoc) {
                response.user = {
                    limit: userDoc.limit || 0,
                    credito: userDoc.credito || 0,
                    casa: userDoc.casa || null,
                    scudoMs: userDoc.scudoMs || 0
                };
                response.inventory = userDoc.inventory || {};
            }
        }

        res.json(response);
    } catch (error) {
        console.error('[API shop order]', error.message);
        res.status(500).json({ success: false, message: 'Errore durante la verifica dell\'ordine.' });
    }
});

// ==================== ROTTE API PROFILO ====================

app.get('/api/profilo/:numero', async (req, res) => {
    try {
        const numero = req.params.numero.replace(/[^0-9]/g, '');
        if (numero.length < 5 || numero.length > 20) {
            return res.status(400).json({ success: false, message: 'Numero non valido.' });
        }
        const jid = numero + '@s.whatsapp.net';

        await connect();
        const doc = await Database.findOne().sort({ _id: 1 }).lean();
        const users = doc?.data?.users || {};
        const chats = doc?.data?.chats || {};
        const user = users[jid];

        if (!user || typeof user !== 'object') {
            return res.status(404).json({ success: false, message: 'Utente non trovato. Hai mai interagito con il bot?' });
        }

        const partnerRaw = str(user.partner);
        const partner = partnerRaw.includes('@')
            ? (users[partnerRaw]?.name && users[partnerRaw].name !== '?' ? users[partnerRaw].name : 'Utente')
            : partnerRaw;

        const gruppi = Object.entries(user.groups && typeof user.groups === 'object' ? user.groups : {})
            .slice(0, 50)
            .map(([gid, val]) => {
                const stats = {};
                if (val && typeof val === 'object') {
                    for (const [k, v] of Object.entries(val)) {
                        const ok = typeof v === 'number' || typeof v === 'boolean' ||
                            (typeof v === 'string' && v.length < 60 && !v.includes('@'));
                        if (ok) stats[k] = v;
                    }
                } else if (typeof val === 'number' || typeof val === 'boolean') {
                    stats.valore = val;
                }
                return { name: str(chats[gid]?.name) || 'Gruppo', stats };
            });

        res.set('Cache-Control', 'no-store');
        res.json({
            success: true,
            data: {
                name: str(user.name) || 'Sconosciuto',
                role: str(user.role) || 'Novellino',
                registered: bool(user.registered),
                age: num(user.age, -1),
                regTime: num(user.regTime, -1),
                firstTime: num(user.firstTime),
                exp: num(user.exp),
                level: num(user.level),
                limit: num(user.limit),
                credito: num(user.credito),
                euro: num(user.euro),
                bank: num(user.bank),
                health: num(user.health),
                vita: num(user.vita),
                messages: num(user.messages),
                stickerCount: num(user.stickerCount),
                joincount: num(user.joincount),
                spam: num(user.spam),
                warn: num(user.warn),
                callWarn: num(user.callWarn),
                tprem: num(user.tprem),
                muto: bool(user.muto),
                banned: bool(user.banned),
                premium: bool(user.premium),
                premiumDate: num(user.premiumDate, -1),
                sposato: bool(user.sposato),
                partner,
                lavoro: str(user.lavoro) || 'disoccupato',
                descrizione: str(user.descrizione) || 'nessuna descrizione',
                groups: gruppi
            }
        });
    } catch (error) {
        console.error('[API profilo]', error.message);
        res.status(500).json({ success: false, message: 'Errore di comunicazione col database.' });
    }
});


// Servizio file statici
app.get('/profilo/:numero', (req, res) => res.sendFile(path.join(__dirname, 'public', 'profilo.html')));
app.get('/blackjack', (req, res) => res.sendFile(path.join(__dirname, 'public', 'blackjack.html')));
app.get('/shop', (req, res) => res.sendFile(path.join(__dirname, 'public', 'shop.html')));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.redirect('/profilo.html'));

if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`✅ Server avviato sulla porta ${PORT}`));
}

export default app;
