async function cercaUtente() {
    const input = document.getElementById('numeroInput').value;
    const errorMsg = document.getElementById('errorMsg');
    const profileResult = document.getElementById('profileResult');
    
    // Resetta i messaggi e i risultati a ogni nuova ricerca
    errorMsg.style.display = 'none';
    profileResult.style.display = 'none';
    
    if (!input) {
        errorMsg.style.display = 'block';
        errorMsg.innerText = "⚠️ Inserisci un numero prima di cercare.";
        return;
    }

    try {
        // SOSTITUISCI "INDIRIZZO_IP_VPS" CON L'IP REALE DEL TUO SERVER
        const response = await fetch(`http://173.249.51.107:3000/api/profilo/${input}`);
        const result = await response.json();

        if (result.success) {
            const user = result.data;
            
            // Popola i dati dell'HTML
            document.getElementById('pName').innerText = `👤 ${user.name == 'Sconosciuto' ? 'Utente' : user.name}`;
            document.getElementById('pLevel').innerText = user.level;
            document.getElementById('pRole').innerText = user.role;
            document.getElementById('pHealth').innerText = user.health;
            document.getElementById('pVita').innerText = user.vita;
            
            // Funzione per formattare i numeri (come l'avevi impostata tu)
            const formattaNum = (num) => String(num).replace(/\d/g, d => `${d}͏`);
            
            document.getElementById('pLimit').innerText = formattaNum(user.limit);
            document.getElementById('pCredito').innerText = formattaNum(user.credito);
            document.getElementById('pJoin').innerText = formattaNum(user.joincount);
            document.getElementById('pExp').innerText = formattaNum(user.exp);
            
            // Mostra il blocco coi risultati
            profileResult.style.display = 'block';
        } else {
            // Mostra l'errore ricevuto dal backend (es. "Utente non trovato")
            errorMsg.style.display = 'block';
            errorMsg.innerText = result.message;
        }
    } catch (error) {
        console.error("Errore fetch API:", error);
        errorMsg.style.display = 'block';
        errorMsg.innerText = "❌ Errore di connessione al bot. Il server potrebbe essere offline o l'IP è errato.";
    }
}

// Inizializza l'Event Listener solo quando l'HTML è stato caricato completamente
document.addEventListener('DOMContentLoaded', () => {
    const btnCerca = document.getElementById('btnCerca');
    
    if (btnCerca) {
        btnCerca.addEventListener('click', cercaUtente);
    }

    // Aggiungo anche l'attivazione della ricerca premendo "Invio" sulla tastiera
    const inputField = document.getElementById('numeroInput');
    if (inputField) {
        inputField.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                cercaUtente();
            }
        });
    }
});
