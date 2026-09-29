async function cercaUtente() {
    const input = document.getElementById('numeroInput').value;
    const errorMsg = document.getElementById('errorMsg');
    const profileResult = document.getElementById('profileResult');
    errorMsg.style.display = 'none';
    profileResult.style.display = 'none';
    if (!input) return;
    try {
        const response = await fetch(`173.249.51.107:3000/api/profilo/${input}`);
        const result = await response.json();
        if (result.success) {
            const user = result.data;                 
            document.getElementById('pName').innerText = `👤 ${user.name == 'Sconosciuto' ? 'utente' : user.name}`;
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
        console.error(error);
        errorMsg.style.display = 'block';
        errorMsg.innerText = "❌ Errore di connessione.";
    }
}
