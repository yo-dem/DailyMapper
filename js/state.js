// ── Costanti globali ──────────────────────────────────────────────────────────
const TODAY_ISO = new Date().toISOString().split("T")[0];
const STORAGE_KEY = "dm_v3";
const THEME_KEY = "dm_v3_theme";
const SIDEBAR_KEY = "dm_v3_sidebar";

// ── Icone SVG flat (currentColor → eredita il colore del pulsante) ────────────
const ICONS = {
  moon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  sun:  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  alarm: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><polyline points="12 9 12 13 14 15"/><line x1="5" y1="3" x2="2.5" y2="6"/><line x1="19" y1="3" x2="21.5" y2="6"/></svg>`,
  alarmLg: `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><polyline points="12 9 12 13 14 15"/><line x1="5" y1="3" x2="2.5" y2="6"/><line x1="19" y1="3" x2="21.5" y2="6"/></svg>`,
  link: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  close: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>`,
  swap: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="14" viewBox="0 0 24 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><line x1="3" y1="5" x2="21" y2="5"/><polyline points="7 19 3 15 7 11"/><line x1="21" y1="15" x2="3" y2="15"/></svg>`,
  arrowRight: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="12" viewBox="0 0 15 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="6" x2="14" y2="6"/><polyline points="9 1 14 6 9 11"/></svg>`,
  arrowBoth: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="6" x2="15" y2="6"/><polyline points="5 1 1 6 5 11"/><polyline points="11 1 15 6 11 11"/></svg>`,
  chevronDown: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  chevronUp:   `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`,
};

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
  expandedHours: new Set(),
  expandedHoursDay: null,
};
