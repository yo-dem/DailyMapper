// ── Vista Editor (Note) ───────────────────────────────────────────────────────
function loadDay() {
  document.getElementById("main-editor").value = dayData().notes || "";
  if (document.getElementById("map-view").classList.contains("active")) renderMap();
  if (document.getElementById("agenda-view").classList.contains("active")) renderAgenda();
}
