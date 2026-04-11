// ── Costanti globali ──────────────────────────────────────────────────────────
const TODAY_ISO = new Date().toISOString().split("T")[0];
const STORAGE_KEY = "dm_v3";
const THEME_KEY = "dm_v3_theme";
const SIDEBAR_KEY = "dm_v3_sidebar";

// ── Stato applicazione ────────────────────────────────────────────────────────
const state = {
  currentDay: TODAY_ISO,
  viewDate: new Date(),
  data: JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"),
  zoom: 1,
  panX: -2000,
  panY: -2000,
  isConnecting: false,
  connectStartId: null,
  navIndex: 0,
};
