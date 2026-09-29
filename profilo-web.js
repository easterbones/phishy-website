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
        // Chiama la route API locale del sito
        const response = await fetch(`/api/profilo/${input}`);
        const result = await response.json();

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
        errorMsg.innerText = "❌ Impossibile comunicare con il database.";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btnCerca = document.getElementById('btnCerca');
    if (btnCerca) btnCerca.addEventListener('click', cercaUtente);

    const inputField = document.getElementById('numeroInput');
    if (inputField) {
        inputField.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') cercaUtente();
        });
    }
});
