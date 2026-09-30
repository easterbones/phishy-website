import express from 'express';
import mongoose from 'mongoose';

const app = express();

// La stringa di connessione va SOLO nelle variabili d'ambiente di Vercel (MONGODB_URI)
const mongoURI = process.env.MONGODB_URI;

const DatabaseSchema = new mongoose.Schema({
    data: { type: Object, default: {} }
}, { minimize: false });
const Database = mongoose.models.Database || mongoose.model('Database', DatabaseSchema);

// Su Vercel ogni richiesta può girare in un'istanza "fredda": riusiamo la connessione tra le chiamate
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
        const user = doc?.data?.users?.[jid];

        if (!user || typeof user !== 'object') {
            return res.status(404).json({ success: false, message: 'Utente non trovato. Hai mai interagito con il bot?' });
        }

        res.set('Cache-Control', 'no-store');
        res.json({
            success: true,
            data: {
                name: user.name || 'Sconosciuto',
                health: user.health ?? 0,
                vita: user.vita ?? 0,
                level: user.level ?? 0,
                role: user.role || 'Novellino',
                limit: user.limit ?? 0,
                credito: user.credito ?? 0,
                joincount: user.joincount ?? 0,
                exp: user.exp ?? 0
            }
        });
    } catch (error) {
        console.error('[API profilo]', error.message);
        res.status(500).json({ success: false, message: 'Errore di comunicazione col database.' });
    }
});

// In locale (node server.js) avvia il listener; su Vercel basta l'export
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`✅ Server avviato sulla porta ${PORT}`));
}

export default app;
