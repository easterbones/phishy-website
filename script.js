// ==========================================
// MENU MOBILE & NAVIGAZIONE
// ==========================================
function toggleMenu() {
  const nav = document.getElementById('navLinks');
  if (nav) nav.classList.toggle('show');
}

// ==========================================
// SISTEMA SANZIONI & LEGENDA BOLLINI (MOBILE FIRST)
// ==========================================
const systemSanctionsInfo = `
  <div class="sanctions-box">
    <div class="sanctions-header">
      <h4>⚖️ Sistema Sanzioni</h4>
      <span class="sanctions-subtitle">Valutazione individuale con contesto da parte degli admin</span>
    </div>
    
    <div class="sanctions-legend">
      <div class="sanc-item sanc-yellow">
        <div class="sanc-head">
          <span class="badge badge-yellow">🟡 WARN</span>
          <strong>Avvertimento</strong>
        </div>
        <p>Tramite il nostro bot <strong>A 3 Warn</strong> scatta il <strong>Kick automatico</strong>. Dopo 3 warn il contatore si azzera, ma lo storico rimane memorizzato.</p>
      </div>

      <div class="sanc-item sanc-red">
        <div class="sanc-head">
          <span class="badge badge-red">🔴 KICK</span>
          <strong>Infrazione</strong>
        </div>
        <p>Comporta la <strong>rimozione dal gruppo</strong>, anche qui viene registrata nello storico.</p>
      </div>

      <div class="sanc-item sanc-black">
        <div class="sanc-head">
          <span class="badge badge-black">⬛ BAN </span>
          <strong>Infrazione Grave</strong>
        </div>
        <p>Espulsione immediata e <strong>permanente da TUTTI i gruppi</strong> della community Viridi Celesti.</p>
      </div>
    </div>
  </div>
`;

// ==========================================
// DATI REGOLE
// ==========================================
const groupRulesData = {
  viridi: {
    title: "🌲 Viridi Celesti - Regolamento",
    rules: [
      { 
        type: "green", 
        title: "😶‍🌫️ Presentazione (text-pulse-glow)[opzionale]", 
        desc: "Presentarsi è completamente (green)[opzionale] per tutelare la (hl-green)[privacy], nessuno è obbligato a farlo, nessuna penalità verrà applicata a chi non si presenta. (hl-yellow)[Fai attenzione a non divulgare dati sensibili], vogliamo conoscerti non sapere la tua vita privata, problemi famigliari e traumi che stai passing. Non è un gruppo sfogo, non siamo psicologi." 
      },
      { 
        type: "yellow", 
        title: "😶‍🌫️ Info Fake", 
        desc: "Presentarsi è opzionale, tuttavia, usare informazioni false (es. genere o età inventati per ingannare) comporta minimo un warn." 
      },
      { 
        type: "green", 
        title: "💬 Amicizie & Bot", 
        desc: "Sei il benvenuto per fare nuove conoscenze, chattare sul gruppo e usare i comandi di Phishy! (hl-anim-green)[(cioe io cacone)]" 
      },
      { 
        type: "red", 
        title: "🔒 Sicurezza & Dati Sensibili", 
        desc: "Non diffondere (mark-red)[mai] informazioni personali di altri. La sicurezza online è sacra e la violazione della privacy è un reato civile." 
      },
      { 
        type: "yellow", 
        title: "❌ No Link & Autopromozione", 
        desc: "Vietato inviare link di social media, altri gruppi o link abbreviati/sospetti. L'invio non autorizzato comporta un Warn." 
      },
      { 
        type: "yellow", 
        title: "❌ No Litigi & Comportamenti Tossici", 
        desc: "Mantieni il rispetto: niente drammi, insulti o molestie e bullismo. I (hl-gold)[comportamenti tossici vengono sanzionati], (hl-anim-gold)[soltanto] se vengono chiamati gli (gold)[admin/mod] tempestivamente. Quando noi veniamo contattati troppo tardi, affrontiamo il problema come se i due litiganti fossero entrambi nel torto, ed ogniuno con le proprie sanzioni." 
      },
      { 
        type: "red", 
        title: "❌ Privato (hl-red)[Senza] Consenso", 
        desc: "Le conoscenze si fanno sul gruppo. E' possibile scrivere direttamente in privato, e ci sono due modi:\n(hl-green)[1.] Chiedi alla persona in privato la domanda \"posso scriverti?\"\n(hl-green)[2.] Chiedi sul gruppo la stessa domanda \"posso scriverti in privato?\"\n\nQuesti sono i modi che noi di Viridi Celesti approviamo per iniziare una conversazione, in entrambi i casi la persona deve rispoderti si. Se qualcuno ti scrive in privato senza chiederti il consenso, contatta uno degli (gold)[admin/mod] e invia (hl-red)[uno screenshot della conversazione + numero di telefono dell'utente]." 
      },
      { 
        type: "black", 
        title: "❌ Doxing, Hacking & Scripting", 
        desc: "Tolleranza zero per hacking, doxing, scripting e minacce. Comporta il Ban permanente da tutta la community." 
      },  
      { 
        type: "yellow", 
        title: "❌ No Spam & Flood", 
        desc: "Divieto di intasare la chat con messaggi ripetuti, catene o sticker in rapida successione. Sanzione: (badge-yellow)[Warn dal Bot]." 
      },
      { 
        type: "yellow", 
        title: "❌ No Contenuti NSFW", 
        desc: "l'abreviazione per Not Safe For Work (NSFW), indica il divieto di inviare materiale esplicito, che sia pornografico, goliardico, disegnato, meme, softporn o fetish. Sanzione: (badge-yellow)[Warn]\n\nEsiste un gruppo dove è permesso, si chiama (stagger-char)[IQ Negativo]" 
      },
       { 
        type: "red", 
        title: "❌ No Contenuti Gore", 
        desc: "Il gore, ovvero materiale (hl-red)[violento e cruento], persone/animali che soffrono, crimini, guerra, morte registrata in video o immagini non è consentito. Sanzione: (badge-red)[kick]\n\nEsiste un gruppo dove è permesso, si chiama (stagger-char)[IQ Negativo]" 
      },
       { 
        type: "black", 
        title: "❌ No Contenuti pdf/zoofilia", 
        desc: "la pedopornografia e la zoofilia sono una malattia, e la loro diffusione è un reato, non tolleriamo l'esposizione dei minori e animali sfruttati, che sia per usurfuirne o la condivisione goliardica, i membri che inviano questi media li mettiamo nella stessa pappa. Sanzione: (badge-red)[ban]\n\nNon esiste un gruppo dedicato per questi contenuti, né succederà." 
      },
      { 
        type: "yellow", 
        title: "❌ No Chiamate di Gruppo", 
        desc: "Vietato avviare chiamate o videochiamate sul gruppo principale. Utilizza i gruppi secondari dedicati come (stagger-char)[IQ Negativo] e (stagger-char)[Spam]" 
      },
       { 
        type: "yellow", 
        title: "❌ Non dare false regole ", 
        desc: "Quando riguarda il regolamento noi non tolleriamo la diffusione di false regole. La sanzione prevede il doppio rispetto alla regola originale, a seconda della gravità e situazione si può ricevere un warn oppure il ban. Vi sconsigliamo di tirare fuori regole dalla vostra fantasia, verificate sempre le fonti, anche due volte, se qualcuno vi chiede una domanda ditegli di leggere questo regolamento oppure la bio dei gruppi"
      },
    ]
  },
  iq: {
    title: "🔞 IQ Negativo - Regole",
    rules: [
      { 
        type: "green", 
        title: "🔞 Contenuti per adulti / Gore", 
        desc: "Ammessi sticker/video/immagini NSFW (porno) e gore (violenti), ma senza fare spam o flood incontrollato in chat." 
      },
      { 
        type: "green", 
        title: "📞 Chiamate di Gruppo", 
        desc: "Ammesse a qualsiasi ora, sia di giorno che di notte." 
      },
      { 
        type: "yellow", 
        title: "📞 spam di chiamate", 
        desc: "anchesse sono ammesse nel gruppo, sono vietati i spam di squilli per forzare l'ingresso dei membri, che siano chiudere e riaprire una chiamata o invitare un membro ripetutamente." 
      },
      { 
        type: "black", 
        title: "❌ No Pedopornografia", 
        desc: "Materiale porno dove appaiono i bambini, Ban Immediato dalla nostra community." 
      },
      { 
        type: "yellow", 
        title: "❌ No Link Esterni", 
        desc: "Vietato inviare link di altri gruppi Telegram/WhatsApp o sponsorizzazioni non autorizzate." 
      }
    ]
  },
  spam: {
    title: "⚡ Spam - Regole",
    rules: [
      { 
        type: "green", 
        title: "📲 Social Media Personali", 
        desc: "Puoi condividere i tuoi profili TikTok, Instagram o altri social per ricevere nuovi followers o ricevere likes su un post." 
      },
      { 
        type: "yellow", 
        title: "❌ No Referral link/codici", 
        desc: "Vietato inviare codici referral o link per guadagnare/lucrare sugli altri invitando i nostri membri (Temu, Shein, ecc.)." 
      },
       { 
        type: "yellow", 
        title: "❌ No auto promozione", 
        desc: "Vietato sponsorizzare prodotti o servizi che stai vendendo, questa community non è la tua vetrina pubblicitaria, trovati altri canali di divulgazione e altri leads." 
      },
       { 
        type: "red", 
        title: "❌ No links di altri gruppi", 
        desc: "Vietato inviare links di altri gruppi, canali e bacheche di altri " 
      },
      { 
        type: "black", 
        title: "❌ No Link Ingannevoli / Malware", 
        desc: "Vietato inviare link abbreviati, phishing o catene con malware. Violazioni malevole: Ban da tutta la community." 
      }
    ]
  },
  guerre: {
    title: "⚔️ Guerre Statali - Regole",
    rules: [
      { 
        type: "yellow", 
        title: "🛠️ In Lavorazione", 
        desc: "Regolamento specifico per le sfide in fase di definizione." 
      }
    ]
  }
};

// ==========================================
// PARSER EFFETTI TESTO & A CAPO (\n)
// ==========================================
function parseTextEffects(text) {
  if (!text) return "";
  
  // 1. Converti tutti i \n negli opportuni tag di a capo HTML <br>
  let formattedText = text.replace(/\n/g, '<br>');
  
  // 2. Trasforma (classe)[testo] in <span class="classe">testo</span>
  return formattedText.replace(/\(([^)]+)\)\[([^\]]+)\]/g, (match, className, innerText) => {
    return `<span class="${className}">${innerText}</span>`;
  });
}

// ==========================================
// RENDERING DINAMICO REGOLE SULLA PAGINA
// ==========================================
function showInlineRules(groupId) {
  const container = document.getElementById('inlineRulesContainer');
  const titleElem = document.getElementById('rulesTitle');
  const contentElem = document.getElementById('rulesContent');
  const data = groupRulesData[groupId];

  if (!data) return;

  // Evidenzia la scheda selezionata
  document.querySelectorAll('.group-card').forEach(card => card.classList.remove('active-card'));
  const activeCard = document.getElementById(`card-${groupId}`);
  if (activeCard) activeCard.classList.add('active-card');

  // Imposta Titolo
  titleElem.textContent = data.title;
  
  // Genera HTML schede regole processando gli effetti di testo e gli a capo
  const rulesHTML = data.rules.map(r => {
    let badgeClass = "badge-yellow";
    let badgeLabel = "🟡 WARN";

    if (r.type === "green") {
      badgeClass = "badge-green";
      badgeLabel = "🟢 PERMESSO";
    } else if (r.type === "red") {
      badgeClass = "badge-red";
      badgeLabel = "🔴 KICK";
    } else if (r.type === "black") {
      badgeClass = "badge-black";
      badgeLabel = "⚫ BAN";
    }

    // Applica il parser su titolo e descrizione
    const parsedTitle = parseTextEffects(r.title);
    const parsedDesc = parseTextEffects(r.desc);

    return `
      <div class="rule-card rule-border-${r.type}">
        <div class="rule-card-header">
          <span class="badge ${badgeClass}">${badgeLabel}</span>
          <h4 class="rule-title">${parsedTitle}</h4>
        </div>
        <p class="rule-desc">${parsedDesc}</p>
      </div>
    `;
  }).join('');

  // Inietta Legenda + Lista Regole
  contentElem.innerHTML = systemSanctionsInfo + `<div class="rules-v-list">${rulesHTML}</div>`;

  // Mostra il pannello
  container.classList.remove('hidden');

  // Scroll fluido adattato per schermi smartphone
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ==========================================
// FILTRI COMANDI & COMMENTI MEME
// ==========================================
function filterCommands() {
  const searchInput = document.getElementById('commandSearch').value.toLowerCase();
  const cards = document.querySelectorAll('.cmd-card');

  cards.forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(searchInput) ? 'block' : 'none';
  });
}

function filterCategory(category) {
  document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
  if (window.event && window.event.target) {
    window.event.target.classList.add('active');
  }

  document.querySelectorAll('.cmd-card').forEach(card => {
    card.style.display = (category === 'all' || card.getAttribute('data-category') === category) ? 'block' : 'none';
  });
}

function addComment(event, memeId) {
  event.preventDefault();
  const form = event.target;
  const author = form.querySelector('.comment-author').value.trim();
  const text = form.querySelector('.comment-text').value.trim();

  if (!author || !text) return;

  let comments = JSON.parse(localStorage.getItem(`comments_${memeId}`)) || [];
  comments.push({ author, text });
  localStorage.setItem(`comments_${memeId}`, JSON.stringify(comments));

  form.reset();
  loadComments(memeId);
}

function loadComments(memeId) {
  const listContainer = document.getElementById(`comments-list-${memeId.split('-')[1]}`);
  if (!listContainer) return;

  const comments = JSON.parse(localStorage.getItem(`comments_${memeId}`)) || [];

  if (comments.length === 0) {
    listContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">Nessun commento. Scrivine uno tu!</p>';
    return;
  }

  listContainer.innerHTML = comments.map(c => `
    <div style="background:rgba(13,7,20,0.8); padding:0.6rem 0.8rem; border-radius:8px; margin-bottom:0.4rem; border:1px solid var(--border-color);">
      <strong style="color:var(--accent-green);">${escapeHtml(c.author)}:</strong> 
      <span style="color:var(--text-main); font-size:0.9rem;">${escapeHtml(c.text)}</span>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}

// Inizializzazione al caricamento
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('comments-list-1')) {
    loadComments('meme-1');
  }
});