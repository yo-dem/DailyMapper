// ── Tema ──────────────────────────────────────────────────────────────────────
function initTheme() {
  const savedTheme =
    localStorage.getItem(THEME_KEY) ||
    document.documentElement.dataset.theme ||
    "light";
  setTheme(savedTheme);
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const toggleButton = document.getElementById("theme-toggle");
  if (toggleButton) toggleButton.textContent = theme === "dark" ? "☀️" : "🌙";
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  setTheme(
    document.documentElement.dataset.theme === "dark" ? "light" : "dark"
  );
}
