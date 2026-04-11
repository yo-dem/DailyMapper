// ── Editor a pagine fisse A4 ──────────────────────────────────────────────────
// Ogni foglio è una <textarea> di altezza fissa (A4).
// scrollHeight > clientHeight → testo in overflow → nuova pagina.
// Ad ogni input si raccoglie tutto il testo, si redistribuisce su tutti
// i fogli e si riposiziona il cursore nel punto giusto.

const PAGE_HEIGHT  = 1123;
const PAGE_PADDING = 30;

let _pages = []; // array di HTMLTextAreaElement

// ── Testo completo ────────────────────────────────────────────────────────────

function _fullText() {
  return _pages.map(ta => ta.value).join("\n");
}

// ── Overflow check ────────────────────────────────────────────────────────────

function _overflows(ta) {
  return ta.scrollHeight > ta.clientHeight + 1;
}

// ── Gestione fogli ────────────────────────────────────────────────────────────

function _createTextarea() {
  const ta = document.createElement("textarea");
  ta.spellcheck = false;
  ta.setAttribute("autocomplete", "off");
  return ta;
}

function _addSheet() {
  const bg = document.getElementById("editor-bg");
  const ta = _createTextarea();
  const sheet = document.createElement("div");
  sheet.className = "editor-page-sheet";
  sheet.appendChild(ta);
  bg.appendChild(sheet);
  ta.addEventListener("input",   () => _onInput(ta));
  ta.addEventListener("keydown", (e) => _onKeydown(e, ta));
  _pages.push(ta);
  return ta;
}

function _removeLastSheet() {
  if (_pages.length <= 1) return;
  const ta = _pages.pop();
  ta.parentElement.remove();
}

// ── Redistribuzione completa ──────────────────────────────────────────────────
// Riceve il testo completo e lo distribuisce sui fogli necessari.
// Restituisce { pageIdx, cursorPos } dove il cursore deve andare dopo.

function _redistribute(fullText, anchorText, anchorOffset) {
  // Porta tutto sul primo foglio
  while (_pages.length > 1) _removeLastSheet();
  _pages[0].value = fullText;

  // Propaga l'overflow pagina per pagina
  let p = 0;
  while (p < _pages.length) {
    const ta = _pages[p];
    if (_overflows(ta)) {
      // Assicurati che esista la pagina successiva
      if (p + 1 >= _pages.length) _addSheet();
      const next = _pages[p + 1];

      // Sposta righe in eccesso alla pagina successiva, una alla volta
      while (_overflows(ta)) {
        const text = ta.value;
        const cut = text.lastIndexOf("\n");
        if (cut === -1) {
          // Riga unica lunghissima: spezza per caratteri
          const half = Math.floor(text.length / 2);
          ta.value   = text.slice(0, half);
          next.value = text.slice(half) + (next.value ? "\n" + next.value : "");
        } else {
          ta.value   = text.slice(0, cut);
          next.value = text.slice(cut + 1) + (next.value ? "\n" + next.value : "");
        }
      }
      p++;
    } else {
      // Nessun overflow su questa pagina: le successive non ne avranno
      // (il testo è già tutto qui); rimuovi pagine vuote in coda
      while (_pages.length > p + 1) _removeLastSheet();
      break;
    }
  }

  // Trova dove rimettere il cursore: cerca la pagina che contiene
  // i caratteri immediatamente prima di anchorOffset nel testo originale
  if (anchorText === null) return;

  let remaining = anchorOffset;
  for (let i = 0; i < _pages.length; i++) {
    const len = _pages[i].value.length + 1; // +1 per il \n di separazione
    if (remaining <= _pages[i].value.length || i === _pages.length - 1) {
      _pages[i].focus();
      _pages[i].selectionStart = _pages[i].selectionEnd = Math.min(remaining, _pages[i].value.length);
      return;
    }
    remaining -= len;
  }
}

// ── Handler input ─────────────────────────────────────────────────────────────

function _onInput(ta) {
  const idx = _pages.indexOf(ta);

  // Posizione cursore nel testo globale
  const cursorPos = _pages.slice(0, idx).reduce((acc, t) => acc + t.value.length + 1, 0)
                  + ta.selectionStart;

  const full = _fullText();
  _redistribute(full, ta, cursorPos);
  _saveText();
}

// ── Navigazione tra fogli con tastiera ───────────────────────────────────────

function _onKeydown(e, ta) {
  const idx = _pages.indexOf(ta);

  if (e.key === "Backspace" && idx > 0 &&
      ta.selectionStart === 0 && ta.selectionEnd === 0) {
    e.preventDefault();
    const prev = _pages[idx - 1];
    prev.focus();
    prev.selectionStart = prev.selectionEnd = prev.value.length;
  }

  if (e.key === "ArrowUp" && idx > 0 && ta.selectionStart === 0) {
    e.preventDefault();
    const prev = _pages[idx - 1];
    prev.focus();
    prev.selectionStart = prev.selectionEnd = prev.value.length;
  }

  if (e.key === "ArrowDown" && idx < _pages.length - 1 &&
      ta.selectionStart === ta.value.length) {
    e.preventDefault();
    const next = _pages[idx + 1];
    next.focus();
    next.selectionStart = next.selectionEnd = 0;
  }
}

// ── Salvataggio ───────────────────────────────────────────────────────────────

function _saveText() {
  dayData().notes = _fullText();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  renderDays(false);
}

// ── Init ──────────────────────────────────────────────────────────────────────

function initEditor() {
  const bg = document.getElementById("editor-bg");
  if (!bg) return;
  _pages.forEach(ta => ta.parentElement && ta.parentElement.remove());
  _pages = [];
  _addSheet();
}

// ── Carica testo del giorno corrente ─────────────────────────────────────────

function loadDay() {
  if (_pages.length === 0) initEditor();

  const text = dayData().notes || "";
  _redistribute(text, null, 0);

  if (document.getElementById("map-view").classList.contains("active")) renderMap();
  if (document.getElementById("agenda-view").classList.contains("active")) renderAgenda();
}

