// ── Topbar azioni ─────────────────────────────────────────────────────────────
function toggleTopbarActions(e) {
  e.stopPropagation();
  document.getElementById("topbar-actions-panel").classList.toggle("open");
}

window.addEventListener("click", () => {
  document.getElementById("topbar-actions-panel").classList.remove("open");
});

// ── Cambio vista ──────────────────────────────────────────────────────────────
function switchView(v, btn) {
  document.querySelectorAll(".view").forEach((el) => el.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach((el) => el.classList.remove("active"));
  document.querySelectorAll(".nav-overflow-item").forEach((el) => el.classList.remove("active"));

  const viewEl = document.getElementById(v + "-view");
  if (viewEl) viewEl.classList.add("active");
  if (btn) btn.classList.add("active");

  // sync overflow nav item
  const overflowItem = document.querySelector(`.nav-overflow-item[data-view="${v}"]`);
  if (overflowItem) overflowItem.classList.add("active");

  // chiudi il pannello se aperto
  document.getElementById("topbar-actions-panel").classList.remove("open");

  const nav = document.getElementById("postit-nav");
  if (v === "map") {
    renderMap();
    requestAnimationFrame(() => {
      const dd = dayData();
      if (dd.postits && dd.postits.length > 0) {
        state.navIndex = 0;
        centerOnPostit(dd.postits[0], false);
      }
    });
  } else {
    nav.classList.remove("visible");
  }

  if (v === "agenda") {
    renderAgenda();
    scrollToCurrentTime();
  }

  if (v === "todo") {
    renderTodo();
  }
}

// ── Toast notifica ────────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById("save-toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2400);
}

// ── Export JSON ───────────────────────────────────────────────────────────────
function exportJSON() {
  const json = JSON.stringify(state.data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dailymapper-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("✓ Esportato!");
}

// ── Import JSON ───────────────────────────────────────────────────────────────
function triggerImport() {
  const overlay = document.createElement("div");
  overlay.className = "import-overlay";
  overlay.innerHTML = `
    <div class="import-dialog">
      <h3>&#9888; Attenzione</h3>
      <p>L'importazione <strong>sovrascriverà tutte le note e le mappe</strong> attualmente salvate.<br><br>Sei sicuro di voler continuare?</p>
      <div class="import-dialog-btns">
        <button class="import-btn-cancel" id="import-cancel">Annulla</button>
        <button class="import-btn-confirm" id="import-confirm">Sì, importa</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById("import-cancel").onclick = () => overlay.remove();
  document.getElementById("import-confirm").onclick = () => {
    overlay.remove();
    document.getElementById("import-file-input").click();
  };
}

function doImport(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      state.data = JSON.parse(e.target.result);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
      renderDays(true);
      loadDay();
      showToast("✓ Importato!");
    } catch {
      showToast("✗ File non valido");
    }
    ev.target.value = "";
  };
  reader.readAsText(file);
}

// ── Cancella tutto ────────────────────────────────────────────────────────────
function triggerClearAll() {
  const overlay = document.createElement("div");
  overlay.className = "import-overlay";
  overlay.innerHTML = `
    <div class="import-dialog">
      <h3>&#9888; Attenzione</h3>
      <p>Questa operazione cancellerà <strong>tutti i dati salvati</strong> in modo permanente.<br><br>Sei sicuro di voler proseguire?</p>
      <div class="import-dialog-btns">
        <button class="import-btn-cancel" id="clear-cancel">Annulla</button>
        <button class="import-btn-confirm" id="clear-confirm">Sì, cancella tutto</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById("clear-cancel").onclick = () => overlay.remove();
  document.getElementById("clear-confirm").onclick = () => {
    overlay.remove();
    clearAllData();
  };
}

function clearAllData() {
  state.data = {};
  localStorage.removeItem(STORAGE_KEY);
  renderDays(true);
  loadDay();
  showToast("✓ Tutti i dati sono stati cancellati");
}
