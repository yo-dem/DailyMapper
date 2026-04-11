// ── Accesso ai dati del giorno corrente ───────────────────────────────────────
function dayData() {
  if (!state.data[state.currentDay]) {
    state.data[state.currentDay] = {
      notes: "",
      postits: [],
      arrows: [],
      agenda: {},
    };
  }
  if (!state.data[state.currentDay].agenda) {
    state.data[state.currentDay].agenda = {};
  }
  return state.data[state.currentDay];
}

// ── Salvataggio ───────────────────────────────────────────────────────────────
function save() {
  dayData().notes = document.getElementById("main-editor").value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  renderDays(false);
}

function saveMap() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  renderDays(false);
}
