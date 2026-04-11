// ── Editor a pagine fisse A4 ──────────────────────────────────────────────────
// La paginazione è basata sul conteggio righe, non su scrollHeight,
// per evitare dipendenze dal reflow sincrono del browser.

let _pages = [];      // array di HTMLTextAreaElement
let _linesPerPage = 0; // calcolato una volta sola dopo il primo render

// ── Righe per pagina ──────────────────────────────────────────────────────────

function _calcLinesPerPage() {
  if (_pages.length === 0) return 40;
  const ta = _pages[0];
  const style = window.getComputedStyle(ta);
  const lineH = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.6;
  const innerH = ta.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  return Math.max(1, Math.floor(innerH / lineH));
}

// ── Testo completo ────────────────────────────────────────────────────────────

function _fullText() {
  return _pages.map(ta => ta.value).join("\n");
}

// ── Gestione fogli ────────────────────────────────────────────────────────────

function _addSheet() {
  const bg = document.getElementById("editor-bg");
  const ta = document.createElement("textarea");
  ta.spellcheck = false;
  ta.setAttribute("autocomplete", "off");
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

// ── Distribuzione per righe ───────────────────────────────────────────────────

function _distribute(fullText, anchorOffset) {
  const lpp = _linesPerPage || _calcLinesPerPage();

  // Spezza il testo in righe fisiche (rispettando i \n espliciti)
  const lines = fullText.split("\n");

  // Raggruppa in blocchi da lpp righe
  const chunks = [];
  for (let i = 0; i < lines.length; i += lpp) {
    chunks.push(lines.slice(i, i + lpp).join("\n"));
  }
  if (chunks.length === 0) chunks.push("");

  // Aggiusta il numero di fogli
  while (_pages.length < chunks.length) _addSheet();
  while (_pages.length > chunks.length && _pages.length > 1) _removeLastSheet();

  // Assegna il testo a ogni foglio
  chunks.forEach((chunk, i) => {
    if (_pages[i].value !== chunk) _pages[i].value = chunk;
  });

  // Ripristina cursore
  if (anchorOffset === null) return;
  let rem = anchorOffset;
  for (let i = 0; i < _pages.length; i++) {
    const pageLen = _pages[i].value.length;
    const isLast = i === _pages.length - 1;
    if (rem <= pageLen || isLast) {
      _pages[i].focus();
      _pages[i].selectionStart = _pages[i].selectionEnd = Math.min(rem, pageLen);
      return;
    }
    rem -= pageLen + 1; // +1 per il \n tra pagine
  }
}

// ── Input ─────────────────────────────────────────────────────────────────────

function _onInput(ta) {
  const idx = _pages.indexOf(ta);
  const cursorPos = _pages.slice(0, idx)
    .reduce((acc, t) => acc + t.value.length + 1, 0) + ta.selectionStart;
  _distribute(_fullText(), cursorPos);
  _saveText();
}

// ── Tastiera ──────────────────────────────────────────────────────────────────

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
  _linesPerPage = 0;
  _addSheet();
  // Calcola linesPerPage dopo che il DOM è pronto
  requestAnimationFrame(() => {
    _linesPerPage = _calcLinesPerPage();
  });
}

// ── Carica giorno ─────────────────────────────────────────────────────────────

function loadDay() {
  if (_pages.length === 0) initEditor();
  const text = dayData().notes || "";
  // Assicura che linesPerPage sia calcolato prima di distribuire
  if (!_linesPerPage) _linesPerPage = _calcLinesPerPage();
  _distribute(text, null);
  if (document.getElementById("map-view").classList.contains("active")) renderMap();
  if (document.getElementById("agenda-view").classList.contains("active")) renderAgenda();
}
