/**
 * Widget chatbot RAG — Centro Benessere
 * Accessibile: WCAG 2.1 AA, focus trap, screen reader, keyboard nav
 *
 * Installazione WordPress (WP Codebox, tipo HTML, Frontend Footer):
 *   <script src="https://fabioc91.github.io/chatbot-widget/chatbot.js"></script>
 */

(function () {
  "use strict";

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {

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

  let aperto = false;
  let inAttesa = false;
  let history = [];

  // ---------------------------------------------------------------------------
  // Stili
  // ---------------------------------------------------------------------------
  const style = document.createElement("style");
  style.textContent = `
    /* Reset isolato */
    #cb-wrapper, #cb-wrapper * {
      all: initial;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    /* Focus visibile globale — WCAG 2.1 AA */
    #cb-wrapper :focus-visible {
      outline: 3px solid #005fcc !important;
      outline-offset: 2px !important;
    }

    /* Bubble */
    #cb-bubble {
      position: fixed !important; bottom: 24px !important; right: 24px !important; z-index: 99999 !important;
      width: 56px !important; height: 56px !important; border-radius: 50% !important;
      background: ${CONFIG.colore} !important; color: #fff !important;
      border: none !important; cursor: pointer !important;
      box-shadow: 0 4px 16px rgba(0,0,0,.3) !important;
      display: flex !important; align-items: center !important; justify-content: center !important;
      transition: transform .2s, box-shadow .2s !important;
    }
    #cb-bubble:hover { transform: scale(1.08) !important; box-shadow: 0 6px 20px rgba(0,0,0,.35) !important; }
    #cb-bubble svg { width: 28px !important; height: 28px !important; fill: #fff !important; display: block !important; }

    /* Panel */
    #cb-panel {
      position: fixed !important; bottom: 92px !important; right: 24px !important; z-index: 99998 !important;
      width: ${CONFIG.larghezza} !important; height: ${CONFIG.altezza} !important;
      border-radius: 16px !important; box-shadow: 0 8px 32px rgba(0,0,0,.2) !important;
      display: flex !important; flex-direction: column !important; overflow: hidden !important;
      background: #fff !important; opacity: 0 !important; pointer-events: none !important;
      transform: translateY(12px) scale(.97) !important;
      transition: opacity .22s ease, transform .22s ease !important;
    }
    #cb-panel.aperto {
      opacity: 1 !important; pointer-events: all !important; transform: none !important;
    }

    /* Header */
    #cb-header {
      background: ${CONFIG.colore} !important; color: #fff !important;
      padding: 14px 16px !important; display: flex !important;
      align-items: center !important; gap: 10px !important; flex-shrink: 0 !important;
    }
    #cb-avatar {
      width: 38px !important; height: 38px !important; border-radius: 50% !important;
      background: rgba(255,255,255,.18) !important;
      border: 1.5px solid rgba(255,255,255,.35) !important;
      display: flex !important; align-items: center !important;
      justify-content: center !important; flex-shrink: 0 !important;
    }
    #cb-avatar svg { width: 22px !important; height: 22px !important; fill: #fff !important; display: block !important; }
    #cb-header-testo { flex: 1 !important; }
    #cb-header-testo strong {
      display: block !important; font-size: 14px !important; font-weight: 700 !important;
      line-height: 1.2 !important; color: #fff !important;
    }
    #cb-header-testo span {
      display: block !important; font-size: 11px !important;
      color: rgba(255,255,255,.78) !important; margin-top: 1px !important;
    }
    #cb-chiudi {
      background: none !important; border: 2px solid transparent !important;
      color: #fff !important; cursor: pointer !important;
      padding: 6px !important; border-radius: 6px !important;
      line-height: 0 !important; flex-shrink: 0 !important;
    }
    #cb-chiudi:hover { background: rgba(255,255,255,.15) !important; }
    #cb-chiudi svg { width: 18px !important; height: 18px !important; fill: #fff !important; display: block !important; }

    /* Messaggi */
    #cb-messaggi {
      flex: 1 !important; overflow-y: auto !important; padding: 16px 14px !important;
      display: flex !important; flex-direction: column !important; gap: 10px !important;
      scroll-behavior: smooth !important;
    }
    #cb-messaggi::-webkit-scrollbar { width: 4px !important; }
    #cb-messaggi::-webkit-scrollbar-track { background: transparent !important; }
    #cb-messaggi::-webkit-scrollbar-thumb { background: #ddd !important; border-radius: 4px !important; }

    /* Wrapper messaggio con label */
    .cb-msg-wrap { display: flex !important; flex-direction: column !important; gap: 3px !important; }
    .cb-msg-wrap.user { align-items: flex-end !important; }
    .cb-msg-wrap.bot  { align-items: flex-start !important; }
    .cb-label {
      font-size: 11px !important; font-weight: 700 !important;
      color: #555 !important; padding: 0 3px !important; display: block !important;
    }
    .cb-msg-wrap.user .cb-label { color: #777 !important; }

    /* Bolle */
    .cb-msg {
      max-width: 82% !important; padding: 10px 13px !important;
      border-radius: 16px !important; font-size: 13.5px !important;
      line-height: 1.6 !important; word-break: break-word !important;
    }
    .cb-msg.bot {
      background: #e8e8e9 !important; color: #1a1a1a !important;
      border-bottom-left-radius: 4px !important;
    }
    .cb-msg.user {
      background: ${CONFIG.colore} !important; color: #fff !important;
      border-bottom-right-radius: 4px !important;
    }
    .cb-msg b { font-weight: 700 !important; }

    /* Typing loader */
    .cb-msg.typing { background: #e8e8e9 !important; padding: 12px 16px !important; }
    .cb-dot {
      display: inline-block !important; width: 8px !important; height: 8px !important;
      border-radius: 50% !important; background: #555 !important;
      margin: 0 3px !important; animation: cb-bounce .9s infinite !important;
    }
    .cb-dot:nth-child(2) { animation-delay: .15s !important; }
    .cb-dot:nth-child(3) { animation-delay: .3s !important; }
    @keyframes cb-bounce { 0%,80%,100%{ transform:translateY(0) } 40%{ transform:translateY(-8px) } }

    /* Footer input */
    #cb-footer {
      border-top: 1px solid #eee !important; padding: 10px 12px !important;
      display: flex !important; gap: 8px !important; align-items: flex-end !important;
      flex-shrink: 0 !important;
    }
    #cb-input {
      flex: 1 !important; resize: none !important;
      border: 1.5px solid #ddd !important; border-radius: 10px !important;
      padding: 9px 12px !important; font-size: 13.5px !important; line-height: 1.4 !important;
      max-height: 100px !important; background: #fff !important; color: #1a1a1a !important;
      font-family: inherit !important;
    }
    #cb-input:focus { border-color: ${CONFIG.colore} !important; outline: 3px solid #005fcc !important; outline-offset: 1px !important; }
    #cb-input:disabled { opacity: .5 !important; }
    #cb-invia {
      background: ${CONFIG.colore} !important; color: #fff !important;
      border: none !important; border-radius: 10px !important;
      padding: 9px 14px !important; cursor: pointer !important;
      font-size: 13px !important; font-weight: 600 !important;
      transition: opacity .2s !important; flex-shrink: 0 !important;
    }
    #cb-invia:disabled { opacity: .45 !important; cursor: default !important; }
    #cb-invia:hover:not(:disabled) { opacity: .85 !important; }

    /* Screen reader only */
    .cb-sr-only {
      position: absolute !important; width: 1px !important; height: 1px !important;
      padding: 0 !important; margin: -1px !important; overflow: hidden !important;
      clip: rect(0,0,0,0) !important; white-space: nowrap !important; border: 0 !important;
    }

    /* Mobile */
    @media (max-width: 480px) {
      #cb-panel {
        right: 0 !important; bottom: 0 !important; left: 0 !important;
        width: 100% !important; height: 92vh !important;
        border-radius: 16px 16px 0 0 !important;
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
    <button
      id="cb-bubble"
      aria-label="Apri chat assistente"
      aria-haspopup="dialog"
      aria-expanded="false"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
      </svg>
    </button>

    <div
      id="cb-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cb-dialog-title"
      aria-describedby="cb-dialog-desc"
    >
      <span id="cb-dialog-desc" class="cb-sr-only">
        Chatbot del centro benessere Unica. Premi Escape per chiudere.
      </span>

      <div id="cb-header">
        <div id="cb-avatar" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h3a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3h3V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zm-4 9a1.5 1.5 0 0 0 0 3 1.5 1.5 0 0 0 0-3zm8 0a1.5 1.5 0 0 0 0 3 1.5 1.5 0 0 0 0-3zm-7 5h6v-1H9v1z"/>
          </svg>
        </div>
        <div id="cb-header-testo">
          <strong id="cb-dialog-title">${CONFIG.titolo}</strong>
          <span>${CONFIG.sottotitolo}</span>
        </div>
        <button id="cb-chiudi" aria-label="Chiudi chat">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <div
        id="cb-messaggi"
        role="log"
        aria-live="polite"
        aria-label="Conversazione"
        aria-relevant="additions"
      ></div>

      <div id="cb-footer">
        <textarea
          id="cb-input"
          rows="1"
          placeholder="${CONFIG.placeholder}"
          aria-label="Scrivi un messaggio"
          aria-multiline="true"
        ></textarea>
        <button id="cb-invia" aria-label="Invia messaggio">Invia</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper);

  // ---------------------------------------------------------------------------
  // Riferimenti DOM
  // ---------------------------------------------------------------------------
  const bubble    = document.getElementById("cb-bubble");
  const panel     = document.getElementById("cb-panel");
  const chiudi    = document.getElementById("cb-chiudi");
  const messaggiEl = document.getElementById("cb-messaggi");
  const inputEl   = document.getElementById("cb-input");
  const inviaBtn  = document.getElementById("cb-invia");

  // ---------------------------------------------------------------------------
  // Focus trap — mantieni focus dentro il dialog quando è aperto
  // ---------------------------------------------------------------------------
  function getFocusabili() {
    return Array.from(
      panel.querySelectorAll(
        'button:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => el.offsetParent !== null);
  }

  panel.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    const focusabili = getFocusabili();
    if (!focusabili.length) return;
    const primo = focusabili[0];
    const ultimo = focusabili[focusabili.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === primo) { e.preventDefault(); ultimo.focus(); }
    } else {
      if (document.activeElement === ultimo) { e.preventDefault(); primo.focus(); }
    }
  });

  // ---------------------------------------------------------------------------
  // Helpers messaggi
  // ---------------------------------------------------------------------------
  function aggiungiMessaggio(testo, tipo) {
    const wrap = document.createElement("div");
    wrap.className = `cb-msg-wrap ${tipo}`;

    const label = document.createElement("span");
    label.className = "cb-label";
    label.setAttribute("aria-hidden", "true");
    label.textContent = tipo === "bot" ? "Unica:" : "Tu:";

    const div = document.createElement("div");
    div.className = `cb-msg ${tipo}`;
    div.setAttribute("role", tipo === "bot" ? "article" : "none");

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
    label.setAttribute("aria-hidden", "true");
    label.textContent = "Unica:";

    const div = document.createElement("div");
    div.className = "cb-msg bot typing";
    div.setAttribute("aria-label", "Unica sta scrivendo...");
    div.innerHTML = '<span class="cb-dot" aria-hidden="true"></span><span class="cb-dot" aria-hidden="true"></span><span class="cb-dot" aria-hidden="true"></span>';

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
    inviaBtn.setAttribute("aria-busy", stato ? "true" : "false");
  }

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

      if (!res.ok) throw new Error(`Errore server: ${res.status}`);

      const data = await res.json();
      aggiungiMessaggio(data.answer, "bot");

      history.push({ role: "user", content: testo });
      history.push({ role: "assistant", content: data.answer });
      if (history.length > 12) history = history.slice(-12);
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
  let elementoPrecedente = null;

  function apriPanel() {
    aperto = true;
    elementoPrecedente = document.activeElement;
    panel.classList.add("aperto");
    panel.removeAttribute("aria-hidden");
    bubble.setAttribute("aria-expanded", "true");
    mostraBenvenuto();
    setTimeout(() => {
      inputEl.focus();
    }, 250);
  }

  function chiudiPanel() {
    aperto = false;
    panel.classList.remove("aperto");
    panel.setAttribute("aria-hidden", "true");
    bubble.setAttribute("aria-expanded", "false");
    // Riporta focus al pulsante bubble
    if (elementoPrecedente && elementoPrecedente.focus) {
      elementoPrecedente.focus();
    } else {
      bubble.focus();
    }
  }

  bubble.addEventListener("click", () => (aperto ? chiudiPanel() : apriPanel()));
  chiudi.addEventListener("click", chiudiPanel);

  // Escape chiude il dialog
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && aperto) {
      chiudiPanel();
    }
  });

  // Enter invia (Shift+Enter per andare a capo)
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

  // Stato iniziale — panel nascosto agli screen reader
  panel.setAttribute("aria-hidden", "true");

  } // fine init
})();
