// ── Inizializzazione ──────────────────────────────────────────────────────────
initTheme();
initSidebar();
initEditor();
renderDays(true);
loadDay();
applyXform();

// ── Scorciatoie da tastiera ───────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  // Ctrl/Cmd + E → esporta
  if ((e.ctrlKey || e.metaKey) && e.key === "e") {
    e.preventDefault();
    exportJSON();
    return;
  }
  // Frecce sinistra/destra → navigazione postit (solo in vista mappa)
  const mapActive = document.getElementById("map-view").classList.contains("active");
  if (!mapActive) return;
  if (e.key === "ArrowRight") navPostit(1);
  if (e.key === "ArrowLeft") navPostit(-1);
});
