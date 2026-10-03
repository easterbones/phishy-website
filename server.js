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

// Middleware di autenticazione per le rotte dello shop
function authShop(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const jid = verifyToken(token);
    
    if (!jid) {
        return res.status(401).json({ 
            success: false, 
            message: 'Token non valido o scaduto. Apri di nuovo il negozio dal bot su WhatsApp.' 
        });
    }
    req.userJid = jid;
    next();
}

const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
const bool = (v) => v === true;
const str = (v, d = '') => (typeof v === 'string' ? v : d);

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
// ==================== ROTTE API MEME & COMMENTI ====================

// Schema per salvare i commenti dei meme nel DB
const CommentSchema = new mongoose.Schema({
    videoId: { type: String, required: true },
    author: { type: String, required: true },
    text: { type: String, required: true },
    date: { type: Date, default: Date.now }
});
const Comment = mongoose.models.Comment || mongoose.model('Comment', CommentSchema);

// Configurazione dei video. 
// Puoi modificare 'title' con il nome scelto da te e 'filename' con il nome reale del file in public/vid
const videoMemesList = [
    { id: 'meme-1', filename: 'VID-20260910-WA0038.mp4', title: 'test video' },
    // Aggiungi qui tutti i video che vuoi
];

// Invia la lista dei video al frontend
app.get('/api/memes', (req, res) => {
    res.json({ success: true, memes: videoMemesList });
});

// Ottieni i commenti di un video specifico dal database
app.get('/api/memes/:id/comments', async (req, res) => {
    try {
        await connect();
        // Cerca i commenti per videoId e ordinali dai più recenti ai più vecchi
        const comments = await Comment.find({ videoId: req.params.id }).sort({ date: -1 }).lean();
        res.json({ success: true, comments });
    } catch (error) {
        console.error('[API Memes GET]', error.message);
        res.status(500).json({ success: false, message: 'Errore nel caricamento dei commenti.' });
    }
});

// Salva un nuovo commento nel database
app.post('/api/memes/:id/comments', async (req, res) => {
    try {
        const { author, text } = req.body;
        if (!author || !text) {
            return res.status(400).json({ success: false, message: 'Nome e commento sono obbligatori.' });
        }
        
        await connect();
        const newComment = new Comment({
            videoId: req.params.id,
            author: author,
            text: text
        });
        await newComment.save();
        
        res.json({ success: true, comment: newComment });
    } catch (error) {
        console.error('[API Memes POST]', error.message);
        res.status(500).json({ success: false, message: 'Errore durante il salvataggio del commento.' });
    }
});

app.get('/profilo/:numero', (req, res) => res.sendFile(path.join(__dirname, 'public', 'profilo.html')));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.redirect('/profilo.html'));

if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`✅ Server avviato sulla porta ${PORT}`));
}

export default app;
