async function cercaUtente() {
    // Pulisce l'input tenendo solo i numeri, utile se qualcuno inserisce il "+"
    const input = document.getElementById('numeroInput').value.replace(/[^0-9]/g, ''); 
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
        // Utilizziamo un proxy HTTPS per trasformare la richiesta ed evitare il blocco Mixed Content
        const targetUrl = encodeURIComponent(`http://173.249.51.107:3000/api/profilo/${input}`);
        const response = await fetch(`https://api.allorigins.win/get?url=${targetUrl}`);
        
        if (!response.ok) throw new Error('Errore di rete con il proxy');
        
        const proxyData = await response.json();
        
        // Il proxy avvolge la risposta del tuo server dentro l'oggetto "contents", quindi la decodifichiamo
        const result = JSON.parse(proxyData.contents);

        if (result.success) {
            const user = result.data;
            
            // Popola i dati dell'HTML
            document.getElementById('pName').innerText = `👤 ${user.name == 'Sconosciuto' ? 'Utente' : user.name}`;
            document.getElementById('pLevel').innerText = user.level;
            document.getElementById('pRole').innerText = user.role;
            document.getElementById('pHealth').innerText = user.health;
            document.getElementById('pVita').innerText = user.vita;
            
            // Funzione per formattare i numeri
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
        errorMsg.innerText = "❌ Errore di connessione. Il bot potrebbe essere offline o irraggiungibile.";
    }
}

// Inizializza gli eventi solo quando il DOM è completamente caricato
document.addEventListener('DOMContentLoaded', () => {
    const btnCerca = document.getElementById('btnCerca');
    
    if (btnCerca) {
        btnCerca.addEventListener('click', cercaUtente);
    }

    const inputField = document.getElementById('numeroInput');
    if (inputField) {
        inputField.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                cercaUtente();
            }
        });
    }
});
