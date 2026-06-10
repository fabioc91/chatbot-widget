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
      colore: "#1C1C1A",
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
      background: ${CONFIG.colore} !important; color: #fff !important;
      padding: 14px 16px !important; display: flex !important; align-items: center !important; gap: 10px !important;
    }
    #cb-avatar {
      width: 38px !important; height: 38px !important; border-radius: 50% !important;
      background: rgba(255,255,255,.18) !important;
      border: 1.5px solid rgba(255,255,255,.35) !important;
      display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important;
    }
    #cb-avatar svg { width: 22px !important; height: 22px !important; fill: #fff !important; display: block !important; }
    #cb-header-testo { flex: 1 !important; }
    #cb-header-testo strong { display: block !important; font-size: 14px !important; line-height: 1.2 !important; color: #fff !important; font-weight: 700 !important; }
    #cb-header-testo span { display: block !important; font-size: 11px !important; color: rgba(255,255,255,.75) !important; margin-top: 1px !important; }
    #cb-chiudi { background: none !important; border: none !important; color: #fff !important; cursor: pointer !important; padding: 4px !important; opacity: .7 !important; line-height: 0 !important; }
    #cb-chiudi:hover { opacity: 1 !important; }
    #cb-chiudi svg { width: 18px !important; height: 18px !important; fill: #fff !important; display: block !important; }

    /* Messaggi */
    #cb-messaggi {
      flex: 1; overflow-y: auto; padding: 16px 14px;
      display: flex; flex-direction: column; gap: 10px;
      scroll-behavior: smooth;
    }
    #cb-messaggi::-webkit-scrollbar { width: 4px; }
    #cb-messaggi::-webkit-scrollbar-track { background: transparent; }
    #cb-messaggi::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }

    .cb-msg-wrap { display: flex !important; flex-direction: column !important; gap: 4px !important; }
    .cb-msg-wrap.user { align-items: flex-end !important; }
    .cb-msg-wrap.bot { align-items: flex-start !important; }
    .cb-label { font-size: 11px !important; font-weight: 700 !important; color: #555 !important; padding: 0 2px !important; display: block !important; }
    .cb-msg-wrap.user .cb-label { color: #777 !important; }

    .cb-msg {
      max-width: 82% !important; padding: 10px 13px !important;
      border-radius: 16px !important; font-size: 13.5px !important; line-height: 1.6 !important;
      word-break: break-word !important;
    }
    .cb-msg b { font-weight: 700 !important; }
    .cb-msg.bot {
      background: #e8e8e9 !important; color: #1a1a1a !important;
      border-bottom-left-radius: 4px;
    }
    .cb-msg.user {
      background: ${CONFIG.colore} !important; color: #fff !important;
      border-bottom-right-radius: 4px;
    }
    .cb-msg.typing { opacity: 1; background: #f4f4f5 !important; padding: 12px 16px !important; }
    .cb-dot { display: inline-block !important; width: 8px !important; height: 8px !important; border-radius: 50% !important;
      background: #1C1C1A !important; margin: 0 3px !important; animation: cb-bounce .9s infinite !important; }
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
          <!-- Icona robot/AI assistant -->
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h3a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3h3V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zm-4 9a1.5 1.5 0 0 0 0 3 1.5 1.5 0 0 0 0-3zm8 0a1.5 1.5 0 0 0 0 3 1.5 1.5 0 0 0 0-3zm-7 5h6v-1H9v1z"/>
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
    const wrap = document.createElement("div");
    wrap.className = `cb-msg-wrap ${tipo}`;

    const label = document.createElement("span");
    label.className = "cb-label";
    label.textContent = tipo === "bot" ? "Unica:" : "Tu:";

    const div = document.createElement("div");
    div.className = `cb-msg ${tipo}`;
    // I messaggi bot possono contenere HTML (<b>, <br>) — i messaggi utente vengono escaped
    if (tipo === "bot") {
      div.innerHTML = testo;
    } else {
      div.textContent = testo;
    }

    wrap.appendChild(label);
    wrap.appendChild(div);
    messaggiEl.appendChild(wrap);
    messaggiEl.scrollTop = messaggiEl.scrollHeight;
    return div;
  }

  function mostraTyping() {
    const wrap = document.createElement("div");
    wrap.className = "cb-msg-wrap bot";
    wrap.id = "cb-typing";

    const label = document.createElement("span");
    label.className = "cb-label";
    label.textContent = "Unica:";

    const div = document.createElement("div");
    div.className = "cb-msg bot typing";
    div.innerHTML = '<span class="cb-dot"></span><span class="cb-dot"></span><span class="cb-dot"></span>';

    wrap.appendChild(label);
    wrap.appendChild(div);
    messaggiEl.appendChild(wrap);
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
