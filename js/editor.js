// ── Editor pagina singola A4 ──────────────────────────────────────────────────
// Una sola textarea di altezza fissa. Quando è piena, l'input viene bloccato.

let _editorTa = null;
let _lastValidValue = "";

// ── Init ──────────────────────────────────────────────────────────────────────

function initEditor() {
  const bg = document.getElementById("editor-bg");
  if (!bg) return;
  bg.innerHTML = "";

  const sheet = document.createElement("div");
  sheet.className = "editor-page-sheet";

  const ta = document.createElement("textarea");
  ta.spellcheck = false;
  ta.setAttribute("autocomplete", "off");
  ta.setAttribute("placeholder", "Scrivi qui...");

  sheet.appendChild(ta);
  bg.appendChild(sheet);
  _editorTa = ta;

  ta.addEventListener("input", _onInput);
}

// ── Input: ripristina se overflow ─────────────────────────────────────────────

function _onInput() {
  const ta = _editorTa;
  if (ta.scrollHeight > ta.clientHeight + 1) {
    // Pagina piena: annulla l'ultimo input
    const cursor = ta.selectionStart - 1;
    ta.value = _lastValidValue;
    ta.selectionStart = ta.selectionEnd = Math.max(0, cursor);
  } else {
    _lastValidValue = ta.value;
  }
  _saveText();
}

// ── Salvataggio ───────────────────────────────────────────────────────────────

function _saveText() {
  dayData().notes = _editorTa ? _editorTa.value : "";
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  renderDays(false);
}

// ── Carica giorno ─────────────────────────────────────────────────────────────

function loadDay() {
  if (!_editorTa) initEditor();
  _editorTa.value = dayData().notes || "";
  _lastValidValue = _editorTa.value;
  if (document.getElementById("map-view").classList.contains("active")) renderMap();
  if (document.getElementById("agenda-view").classList.contains("active")) renderAgenda();
}
