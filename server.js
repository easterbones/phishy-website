import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// La stringa di connessione va SOLO nelle variabili d'ambiente (MONGODB_URI)
const mongoURI = process.env.MONGODB_URI;

const DatabaseSchema = new mongoose.Schema({
    data: { type: Object, default: {} }
}, { minimize: false });
const Database = mongoose.models.Database || mongoose.model('Database', DatabaseSchema);

// Riusiamo la connessione tra le chiamate
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

// CORS per l'API (così la pagina funziona anche se ospitata su un altro dominio)
app.use('/api', (req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
const bool = (v) => v === true;
const str = (v, d = '') => (typeof v === 'string' ? v : d);

app.get('/api/profilo/:numero', async (req, res) => {
    try {
        const numero = req.params.numero.replace(/[^0-9]/g, '');
        if (numero.length < 5 || numero.length > 20) {
            return res.status(400).json({ success: false, message: 'Numero non valido.' });
        }
        const jid = numero + '@s.whatsapp.net';

        await connect();
        // Stesso documento usato dal bot (il più vecchio), in sola lettura
        const doc = await Database.findOne().sort({ _id: 1 }).lean();
        const users = doc?.data?.users || {};
        const chats = doc?.data?.chats || {};
        const user = users[jid];

        if (!user || typeof user !== 'object') {
            return res.status(404).json({ success: false, message: 'Utente non trovato. Hai mai interagito con il bot?' });
        }

        // Privacy: il partner (un JID = numero di telefono) viene mostrato solo come nome
        const partnerRaw = str(user.partner);
        const partner = partnerRaw.includes('@')
            ? (users[partnerRaw]?.name && users[partnerRaw].name !== '?' ? users[partnerRaw].name : 'Utente')
            : partnerRaw;

        // Privacy: i gruppi vengono mostrati col nome, mai con l'ID; solo valori semplici
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

// Pagina e JS serviti dalla cartella "public" (profilo.html, profilo-web.js)
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.redirect('/profilo.html'));

if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`✅ Server avviato sulla porta ${PORT}`));
}

export default app;
