// ── Definizione temi ──────────────────────────────────────────────────────────
const THEMES = [
  { id: "lavanda",  label: "Lavanda",  dark: false, swatch: "#6200ee" },
  { id: "oceano",   label: "Oceano",   dark: false, swatch: "#0277bd" },
  { id: "foresta",  label: "Foresta",  dark: false, swatch: "#2e7d32" },
  { id: "tramonto", label: "Tramonto", dark: false, swatch: "#bf360c" },
  { id: "rosa",     label: "Rosa",     dark: false, swatch: "#ad1457" },
  { id: "cielo",    label: "Cielo",    dark: false, swatch: "#1976d2" },
  { id: "sabbia",   label: "Sabbia",   dark: false, swatch: "#8d6e63" },
  { id: "menta",    label: "Menta",    dark: false, swatch: "#00897b" },
  { id: "lilla",    label: "Lilla",    dark: false, swatch: "#7b52ab" },
  { id: "pesca",    label: "Pesca",    dark: false, swatch: "#c75b39" },
  { id: "notte",    label: "Notte",    dark: true,  swatch: "#9c7cfa" },
  { id: "abisso",   label: "Abisso",   dark: true,  swatch: "#42a5f5" },
  { id: "giungla",  label: "Giungla",  dark: true,  swatch: "#66bb6a" },
  { id: "carbone",  label: "Carbone",  dark: true,  swatch: "#90a4ae" },
  { id: "aurora",   label: "Aurora",   dark: true,  swatch: "#26c6da" },
  { id: "vulcano",  label: "Vulcano",  dark: true,  swatch: "#ef5350" },
  { id: "cosmo",    label: "Cosmo",    dark: true,  swatch: "#7986cb" },
  { id: "ebano",    label: "Ebano",    dark: true,  swatch: "#a1887f" },
  { id: "rubino",   label: "Rubino",   dark: true,  swatch: "#f06292" },
  { id: "ombra",    label: "Ombra",    dark: true,  swatch: "#78909c" },
];

// ── Inizializzazione ──────────────────────────────────────────────────────────
function initTheme() {
  let saved = localStorage.getItem(THEME_KEY) || "lavanda";
  // Legacy: "light" → "lavanda", "dark" → "notte"
  if (saved === "light") saved = "lavanda";
  if (saved === "dark")  saved = "notte";
  setTheme(saved, false);
  _buildThemePicker();
}

// ── Applicazione tema ─────────────────────────────────────────────────────────
function setTheme(themeId, save = true) {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  document.documentElement.dataset.theme = theme.id;
  if (theme.dark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.innerHTML = theme.dark ? ICONS.moon : ICONS.sun;
  if (save) localStorage.setItem(THEME_KEY, theme.id);
  _updatePickerActive(theme.id);
}

// ── Costruzione pannello picker ───────────────────────────────────────────────
function _buildThemePicker() {
  const panel = document.getElementById("theme-picker-panel");
  if (!panel) return;

  const light = THEMES.filter(t => !t.dark);
  const dark  = THEMES.filter(t =>  t.dark);

  panel.innerHTML = "";

  const makeGroup = (label, items) => {
    const lbl = document.createElement("div");
    lbl.className = "theme-picker-group-label";
    lbl.textContent = label;
    panel.appendChild(lbl);

    const row = document.createElement("div");
    row.className = "theme-picker-row";

    items.forEach(theme => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "theme-picker-item";
      btn.dataset.themeId = theme.id;

      const swatch = document.createElement("span");
      swatch.className = "theme-swatch";
      swatch.style.background = theme.swatch;

      const name = document.createElement("span");
      name.textContent = theme.label;

      btn.appendChild(swatch);
      btn.appendChild(name);
      btn.onclick = (e) => {
        e.stopPropagation();
        setTheme(theme.id);
        closeThemePicker();
      };
      row.appendChild(btn);
    });
    panel.appendChild(row);
  };

  makeGroup("Chiari", light);
  makeGroup("Scuri",  dark);

  const current = localStorage.getItem(THEME_KEY) || "lavanda";
  _updatePickerActive(current);
}

function _updatePickerActive(themeId) {
  document.querySelectorAll(".theme-picker-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.themeId === themeId);
  });
}

// ── Apertura / chiusura picker ────────────────────────────────────────────────
function openThemePicker(e) {
  if (e) e.stopPropagation();
  const panel = document.getElementById("theme-picker-panel");
  if (!panel) return;
  const isOpen = !panel.classList.contains("hidden");
  if (isOpen) {
    closeThemePicker();
  } else {
    panel.classList.remove("hidden");
    setTimeout(() => document.addEventListener("click", _closePickerOutside, { once: true }), 0);
  }
}

function closeThemePicker() {
  const panel = document.getElementById("theme-picker-panel");
  if (panel) panel.classList.add("hidden");
  document.removeEventListener("click", _closePickerOutside);
}

function _closePickerOutside(e) {
  const panel = document.getElementById("theme-picker-panel");
  const wrap  = document.getElementById("theme-toggle")?.closest(".theme-picker-wrap");
  if (panel && wrap && !wrap.contains(e.target)) {
    closeThemePicker();
  }
}

// Compatibilità col vecchio toggleTheme usato altrove
function toggleTheme() {
  openThemePicker();
}
