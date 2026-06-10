/**
 * Widget chatbot RAG — Centro Benessere
 * Incollare nel footer WordPress (Aspetto → Editor tema → footer.php
 * oppure tramite plugin "Insert Headers and Footers"):
 *
 *   <script>
 *     window.ChatbotConfig = { apiUrl: "https://tuo-backend.railway.app" };
 *   </script>
 *   <script src="https://tuo-cdn.com/chatbot.js"></script>
 *
 * Nessun plugin WordPress necessario.
 */

(function () {
  "use strict";

  // Aspetta che il DOM sia completamente caricato
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {

  // ---------------------------------------------------------------------------
  // Configurazione — sovrascrivibile dall'esterno prima del caricamento
  // ---------------------------------------------------------------------------
  const CONFIG = Object.assign(
    {
      apiUrl: "https://unica-rag-1-production.up.railway.app",
      titolo: "Assistente Centro Benessere",
      sottotitolo: "Come posso aiutarti?",
      placeholder: "Scrivi la tua domanda...",
      colore: "#8b5e83",          // viola benessere — modifica liberamente
      coloreTesto: "#ffffff",
      altezza: "460px",
      larghezza: "370px",
    },
    window.ChatbotConfig || {}
  );

  // ---------------------------------------------------------------------------
  // Stato
  // ---------------------------------------------------------------------------
  let aperto = false;
  let inAttesa = false;
  let history = []; // memoria conversazione

  // ---------------------------------------------------------------------------
  // Stili
  // ---------------------------------------------------------------------------
  const style = document.createElement("style");
  style.textContent = `
    #cb-wrapper, #cb-wrapper * { all: initial; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

    #cb-bubble {
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
      width: 56px; height: 56px; border-radius: 50%;
      background: ${CONFIG.colore}; color: ${CONFIG.coloreTesto};
      border: none; cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,.25);
      display: flex; align-items: center; justify-content: center;
      transition: transform .2s, box-shadow .2s;
    }
    #cb-bubble:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(0,0,0,.3); }
    #cb-bubble svg { width: 28px; height: 28px; fill: currentColor; }

    #cb-panel {
      position: fixed; bottom: 92px; right: 24px; z-index: 99998;
      width: ${CONFIG.larghezza}; height: ${CONFIG.altezza};
      border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,.18);
      display: flex; flex-direction: column; overflow: hidden;
      background: #fff; opacity: 0; pointer-events: none;
      transform: translateY(12px) scale(.97);
      transition: opacity .22s ease, transform .22s ease;
    }
    #cb-panel.aperto { opacity: 1; pointer-events: all; transform: none; }

    /* Header */
    #cb-header {
      background: ${CONFIG.colore}; color: ${CONFIG.coloreTesto};
      padding: 14px 16px; display: flex; align-items: center; gap: 10px;
    }
    #cb-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(255,255,255,.25);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    #cb-avatar svg { width: 20px; height: 20px; fill: ${CONFIG.coloreTesto}; }
    #cb-header-testo { flex: 1; }
    #cb-header-testo strong { display: block; font-size: 14px; line-height: 1.2; }
    #cb-header-testo span { font-size: 11px; opacity: .8; }
    #cb-chiudi {
      background: none; border: none; color: ${CONFIG.coloreTesto};
      cursor: pointer; padding: 4px; opacity: .7; line-height: 0;
    }
    #cb-chiudi:hover { opacity: 1; }
    #cb-chiudi svg { width: 18px; height: 18px; fill: currentColor; }

    /* Messaggi */
    #cb-messaggi {
      flex: 1; overflow-y: auto; padding: 16px 14px;
      display: flex; flex-direction: column; gap: 10px;
      scroll-behavior: smooth;
    }
    #cb-messaggi::-webkit-scrollbar { width: 4px; }
    #cb-messaggi::-webkit-scrollbar-track { background: transparent; }
    #cb-messaggi::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }

    .cb-msg {
      max-width: 82%; padding: 10px 13px;
      border-radius: 16px; font-size: 13.5px; line-height: 1.5;
      word-break: break-word;
    }
    .cb-msg.bot {
      background: #f4f4f5; color: #1a1a1a;
      align-self: flex-start; border-bottom-left-radius: 4px;
    }
    .cb-msg.user {
      background: ${CONFIG.colore}; color: ${CONFIG.coloreTesto};
      align-self: flex-end; border-bottom-right-radius: 4px;
    }
    .cb-msg.typing { opacity: 1; background: #f4f4f5 !important; padding: 12px 16px !important; }
    .cb-dot { display: inline-block !important; width: 8px !important; height: 8px !important; border-radius: 50% !important;
      background: #8b5e83 !important; margin: 0 3px !important; animation: cb-bounce .9s infinite !important; }
    .cb-dot:nth-child(2) { animation-delay: .15s !important; }
    .cb-dot:nth-child(3) { animation-delay: .3s !important; }
    @keyframes cb-bounce { 0%,80%,100%{ transform:translateY(0) } 40%{ transform:translateY(-8px) } }

    /* Input */
    #cb-footer {
      border-top: 1px solid #eee; padding: 10px 12px;
      display: flex; gap: 8px; align-items: flex-end;
    }
    #cb-input {
      flex: 1; resize: none; border: 1px solid #ddd; border-radius: 10px;
      padding: 9px 12px; font-size: 13.5px; line-height: 1.4;
      max-height: 100px; outline: none; transition: border-color .2s;
      font-family: inherit;
    }
    #cb-input:focus { border-color: ${CONFIG.colore}; }
    #cb-invia {
      background: ${CONFIG.colore}; color: ${CONFIG.coloreTesto};
      border: none; border-radius: 10px; padding: 9px 14px;
      cursor: pointer; font-size: 13px; font-weight: 600;
      transition: opacity .2s; flex-shrink: 0;
    }
    #cb-invia:disabled { opacity: .45; cursor: default; }

    /* Mobile */
    @media (max-width: 480px) {
      #cb-panel {
        right: 0; bottom: 0; left: 0; width: 100%;
        height: 92vh; border-radius: 16px 16px 0 0;
      }
    }
  `;
  document.head.appendChild(style);

  // ---------------------------------------------------------------------------
  // HTML
  // ---------------------------------------------------------------------------
  const wrapper = document.createElement("div");
  wrapper.id = "cb-wrapper";
  wrapper.innerHTML = `
    <button id="cb-bubble" aria-label="Apri chat assistente">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
      </svg>
    </button>

    <div id="cb-panel" role="dialog" aria-modal="true" aria-label="${CONFIG.titolo}">
      <div id="cb-header">
        <div id="cb-avatar">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
          </svg>
        </div>
        <div id="cb-header-testo">
          <strong>${CONFIG.titolo}</strong>
          <span>${CONFIG.sottotitolo}</span>
        </div>
        <button id="cb-chiudi" aria-label="Chiudi chat">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <div id="cb-messaggi" aria-live="polite"></div>

      <div id="cb-footer">
        <textarea
          id="cb-input"
          rows="1"
          placeholder="${CONFIG.placeholder}"
          aria-label="Messaggio"
        ></textarea>
        <button id="cb-invia">Invia</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper);

  // ---------------------------------------------------------------------------
  // Riferimenti DOM
  // ---------------------------------------------------------------------------
  const bubble = document.getElementById("cb-bubble");
  const panel = document.getElementById("cb-panel");
  const chiudi = document.getElementById("cb-chiudi");
  const messaggiEl = document.getElementById("cb-messaggi");
  const inputEl = document.getElementById("cb-input");
  const inviaBtn = document.getElementById("cb-invia");

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function aggiungiMessaggio(testo, tipo) {
    const div = document.createElement("div");
    div.className = `cb-msg ${tipo}`;
    // I messaggi bot possono contenere HTML (<b>, <br>) — i messaggi utente vengono escaped
    if (tipo === "bot") {
      div.innerHTML = testo;
    } else {
      div.textContent = testo;
    }
    messaggiEl.appendChild(div);
    messaggiEl.scrollTop = messaggiEl.scrollHeight;
    return div;
  }

  function mostraTyping() {
    const div = document.createElement("div");
    div.className = "cb-msg bot typing";
    div.innerHTML = '<span class="cb-dot"></span><span class="cb-dot"></span><span class="cb-dot"></span>';
    div.id = "cb-typing";
    messaggiEl.appendChild(div);
    messaggiEl.scrollTop = messaggiEl.scrollHeight;
  }

  function rimuoviTyping() {
    const el = document.getElementById("cb-typing");
    if (el) el.remove();
  }

  function setInAttesa(stato) {
    inAttesa = stato;
    inviaBtn.disabled = stato;
    inputEl.disabled = stato;
  }

  // Messaggio di benvenuto
  function mostraBenvenuto() {
    if (messaggiEl.children.length === 0) {
      aggiungiMessaggio(
        "Ciao! Sono l'assistente del centro benessere. Posso aiutarti con informazioni su trattamenti, prezzi e orari. Come posso aiutarti?",
        "bot"
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Invio messaggio
  // ---------------------------------------------------------------------------
  async function invia() {
    const testo = inputEl.value.trim();
    if (!testo || inAttesa) return;

    inputEl.value = "";
    inputEl.style.height = "auto";
    aggiungiMessaggio(testo, "user");
    setInAttesa(true);
    mostraTyping();

    try {
      const res = await fetch(`${CONFIG.apiUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: testo, history: history }),
      });

      rimuoviTyping();

      if (!res.ok) {
        throw new Error(`Errore server: ${res.status}`);
      }

      const data = await res.json();
      aggiungiMessaggio(data.answer, "bot");

      // Aggiorna memoria conversazione
      history.push({ role: "user", content: testo });
      history.push({ role: "assistant", content: data.answer });
      if (history.length > 12) history = history.slice(-12); // mantieni ultimi 6 scambi
    } catch (err) {
      rimuoviTyping();
      aggiungiMessaggio(
        "Mi dispiace, si è verificato un problema tecnico. Riprova tra qualche istante o chiama direttamente il centro.",
        "bot"
      );
      console.error("[Chatbot]", err);
    } finally {
      setInAttesa(false);
      inputEl.focus();
    }
  }

  // ---------------------------------------------------------------------------
  // Apertura / chiusura
  // ---------------------------------------------------------------------------
  function apriPanel() {
    aperto = true;
    panel.classList.add("aperto");
    bubble.setAttribute("aria-expanded", "true");
    mostraBenvenuto();
    setTimeout(() => inputEl.focus(), 250);
  }

  function chiudiPanel() {
    aperto = false;
    panel.classList.remove("aperto");
    bubble.setAttribute("aria-expanded", "false");
  }

  bubble.addEventListener("click", () => (aperto ? chiudiPanel() : apriPanel()));
  chiudi.addEventListener("click", chiudiPanel);

  // Chiudi con Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && aperto) chiudiPanel();
  });

  // Invia con Enter (Shift+Enter per andare a capo)
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      invia();
    }
  });

  inviaBtn.addEventListener("click", invia);

  // Auto-resize textarea
  inputEl.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 100) + "px";
  });

  } // fine init
})();
