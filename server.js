import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// INSERISCI QUI LA TUA STRINGA DI CONNESSIONE A MONGODB ATLAS
const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://iosonoio:lePaperechevolano2308@viridi.gryel56.mongodb.net/?appName=viridi';

mongoose.connect(mongoURI)
    .then(() => console.log('🌐 Sito connesso con successo a MongoDB Atlas!'))
    .catch(err => console.error('❌ Errore di connessione al DB:', err));

// Schema identico a quello utilizzato dall'adapter del bot
const DatabaseSchema = new mongoose.Schema({
    data: { type: Object, default: {} }
}, { minimize: false });
const Database = mongoose.models.Database || mongoose.model('Database', DatabaseSchema);

// Dice ad Express di fornire i file HTML, CSS e JS statici dalla cartella principale
app.use(express.static(__dirname));

// L'API autonoma del sito web
app.get('/api/profilo/:numero', async (req, res) => {
    try {
        let numero = req.params.numero.replace(/[^0-9]/g, '');
        let jid = numero + '@s.whatsapp.net';

        // Estrae il documento unico di lowdb da MongoDB
        const doc = await Database.findOne();

        if (!doc || !doc.data || !doc.data.users || !doc.data.users[jid]) {
            return res.status(404).json({ success: false, message: 'Utente non trovato. Hai mai interagito con il bot?' });
        }

        let user = doc.data.users[jid];
        
        // Formatta i dati da inviare al frontend
        const datiSicuri = {
            name: user.name || 'Sconosciuto',
            health: user.health || 0,
            vita: user.vita || 0,
            level: user.level || 0,
            role: user.role || 'Novellino',
            limit: user.limit || 0,
            credito: user.credito || 0,
            joincount: user.joincount || 0,
            exp: user.exp || 0
        };

        res.json({ success: true, data: datiSicuri });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Errore di comunicazione col database.' });
    }
});

// Avvia il server e recupera l'IP pubblico
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`✅ Server web e API avviati sulla porta ${PORT}`);
    
    try {
        // Recupera l'IP pubblico tramite il servizio ipify
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        console.log(`\n========================================`);
        console.log(`🌍 Il tuo Indirizzo IP pubblico è: ${ipData.ip}`);
        console.log(`👉 Aggiungi questo IP alla Whitelist di MongoDB Atlas.`);
        console.log(`========================================\n`);
    } catch (error) {
        console.log('⚠️ Impossibile recuperare l\'indirizzo IP pubblico in automatico.');
    }
});
