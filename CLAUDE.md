# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

Open `dailyMapper.html` directly in a browser — no build step, no server required. All data persists in `localStorage`.

## Architecture

**Single-page vanilla JS app** with Italian UI. One HTML file, one CSS file, ten JS modules loaded as plain `<script>` tags in a strict dependency order (documented in the HTML comment block before the script tags).

### Global state

All application state lives in the single `state` object defined in `js/state.js`. It is mutated directly by all modules. There are no modules, no bundler, no imports — every function is global.

### Script load order (dependencies must precede dependents)

```
state.js → storage.js → theme.js → editor.js → sidebar.js → agenda.js → map.js → ui.js → todo.js → main.js
```

Violating this order causes "function not defined" errors at parse time.

### Data model

All data is keyed by ISO date string (`YYYY-MM-DD`) inside `state.data`, which mirrors `localStorage` key `dm_v3`:

```js
state.data["2025-06-01"] = {
  notes: "",        // free-text for the Note view (single A4 page)
  postits: [],      // map postits: { id, x, y, w, h, title, content, color }
  arrows: [],       // connections between postits: { from, to, cp, bidir }
  agenda: {},       // keyed by slot index (0–287, each = 5 min): { text, alarm, snoozeUntil }
  todos: [],        // { id, text, checked, time }
}
```

`dayData()` in `storage.js` returns (and lazily initialises) the entry for `state.currentDay`.

### Saving

- `save()` — reads the textarea value first, then writes to localStorage. Used only by the Note view.
- `saveMap()` — writes `state.data` to localStorage as-is. Used by all other views (map, agenda, todo).

### Views

| View ID | Module | Notes |
|---|---|---|
| `editor-view` | `editor.js` | Fixed-height A4 textarea; blocks input when full |
| `map-view` | `map.js` | Infinite canvas with pan/zoom, draggable postits, SVG arrows |
| `agenda-view` | `agenda.js` | 288 five-minute slots; alarm engine polls every 10s via `setInterval` |
| `todo-view` | `todo.js` | Per-day checklist; "copy to agenda" button rounds time to nearest 5 min |

### Agenda slot indexing

`slotIndex = hours * 12 + Math.floor(minutes / 5)`. Granularity (1h/30m/15m/10m/5m) controls how many slots are rendered, but alarms always iterate all 288 slots.

### localStorage keys

| Key | Purpose |
|---|---|
| `dm_v3` | All app data |
| `dm_v3_theme` | `"light"` or `"dark"` |
| `dm_v3_sidebar` | Sidebar width in px |
| `dm_v3_agenda_granularity` | Minutes per agenda row |
