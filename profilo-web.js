async function cercaUtente() {
    const input = document.getElementById('numeroInput').value.replace(/[^0-9]/g, ''); 
    const errorMsg = document.getElementById('errorMsg');
    const profileResult = document.getElementById('profileResult');
    
    errorMsg.style.display = 'none';
    profileResult.style.display = 'none';
    
    if (!input) {
        errorMsg.style.display = 'block';
        errorMsg.innerText = "⚠️ Inserisci un numero prima di cercare.";
        return;
    }

    try {
        const targetUrl = encodeURIComponent(`http://173.249.51.107:3000/api/profilo/${input}`);
        const response = await fetch(`https://api.allorigins.win/get?url=${targetUrl}`);
        
        if (!response.ok) throw new Error('Errore di rete con il proxy');
        
        const proxyData = await response.json();
        
        // Selettore di sicurezza: controlla se la VPS ha risposto con una pagina web di errore invece del JSON
        if (proxyData.contents && proxyData.contents.trim().startsWith('<')) {
            throw new Error("Il server VPS ha restituito una pagina di errore. Controlla che il bot sia avviato e la porta 3000 sia aperta.");
        }

        let result;
        try {
            result = JSON.parse(proxyData.contents);
        } catch (e) {
            throw new Error("I dati ricevuti non sono validi (errore di lettura del database).");
        }

        if (result.success) {
            const user = result.data;
            
            document.getElementById('pName').innerText = `👤 ${user.name == 'Sconosciuto' ? 'Easter Bone' : user.name}`;
            document.getElementById('pLevel').innerText = user.level;
            document.getElementById('pRole').innerText = user.role;
            document.getElementById('pHealth').innerText = user.health;
            document.getElementById('pVita').innerText = user.vita;
            
            const formattaNum = (num) => String(num).replace(/\d/g, d => `${d}͏`);
            
            document.getElementById('pLimit').innerText = formattaNum(user.limit);
            document.getElementById('pCredito').innerText = formattaNum(user.credito);
            document.getElementById('pJoin').innerText = formattaNum(user.joincount);
            document.getElementById('pExp').innerText = formattaNum(user.exp);
            
            profileResult.style.display = 'block';
        } else {
            errorMsg.style.display = 'block';
            errorMsg.innerText = result.message;
        }
    } catch (error) {
        console.error("Errore fetch API:", error);
        errorMsg.style.display = 'block';
        errorMsg.innerText = "❌ " + (error.message || "Errore di connessione. Il bot potrebbe essere offline.");
    }
}

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
