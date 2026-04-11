const TODAY_ISO = new Date().toISOString().split("T")[0];
const STORAGE_KEY = "dm_v3";

let state = {
  currentDay: TODAY_ISO,
  viewDate: new Date(),
  data: JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"),
  zoom: 1,
  panX: -2000,
  panY: -2000,
  isConnecting: false,
  connectStartId: null,
};
const THEME_KEY = "dm_v3_theme";
const SIDEBAR_KEY = "dm_v3_sidebar";

// ── sidebar resize ─────────────────────────────────────────────────────────────
let sidebarWidth = parseInt(localStorage.getItem(SIDEBAR_KEY) || "320");

function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  const expander = document.getElementById("sidebar-expander");

  // Set initial width
  sidebar.style.width = sidebarWidth + "px";
  updateSidebarContentVisibility();

  // Expander click to toggle sidebar
  expander.addEventListener("click", () => {
    const sidebar = document.getElementById("sidebar");

    if (sidebarWidth > 60) {
      // Collapse completely
      sidebarWidth = 0;
      sidebar.style.width = "0px";
    } else {
      // Expand to default width
      sidebarWidth = 320;
      sidebar.style.width = "320px";
      sidebar.style.display = "flex";
    }
    updateSidebarContentVisibility();
    localStorage.setItem(SIDEBAR_KEY, sidebarWidth);
  });
}

function updateSidebarContentVisibility() {
  const sidebar = document.getElementById("sidebar");
  const expander = document.getElementById("sidebar-expander");
  const contentElements = document.querySelectorAll(
      "#sidebar .month-nav, #sidebar .btn-oggi, #sidebar #days-list",
  );

  if (sidebarWidth === 0) {
    // Completely hidden
    sidebar.style.display = "flex";
    sidebar.style.borderRightColor = "transparent";
    expander.style.left = "0px";
    contentElements.forEach((el) => {
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
    });
  } else {
    // Sidebar visible
    sidebar.style.display = "flex";
    sidebar.style.borderRightColor = "var(--md-border)";
    expander.style.left = sidebarWidth + "px";
    contentElements.forEach((el) => {
      el.style.opacity = "1";
      el.style.pointerEvents = "auto";
    });
  }
}

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
      document.documentElement.dataset.theme === "dark" ? "light" : "dark",
  );
}

function toggleTopbarActions(e) {
  e.stopPropagation();
  document.getElementById("topbar-actions-panel").classList.toggle("open");
}

window.addEventListener("click", () => {
  document.getElementById("topbar-actions-panel").classList.remove("open");
});

function dayData() {
  if (!state.data[state.currentDay]) {
    state.data[state.currentDay] = {
      notes: "",
      postits: [],
      arrows: [],
      agenda: {} // NUOVO: Predisposto per le ore
    };
  }
  // Fallback per salvataggi vecchi senza agenda
  if (!state.data[state.currentDay].agenda) {
    state.data[state.currentDay].agenda = {};
  }
  return state.data[state.currentDay];
}
function save() {
  dayData().notes = document.getElementById("main-editor").value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  renderDays(false);
}
function saveMap() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  renderDays(false);
}

// ── sidebar ───────────────────────────────────────────────────────────────────
function goToToday() {
  state.viewDate = new Date();
  state.currentDay = TODAY_ISO;
  renderDays(true);
  loadDay();
}
function changeMonth(d) {
  state.viewDate.setMonth(state.viewDate.getMonth() + d);
  renderDays(false);
}
function pickDate(e) {
  if (!e.target.value) return;
  state.viewDate = new Date(e.target.value);
  state.currentDay = e.target.value;
  renderDays(true);
  loadDay();
}

function openDateModal() {
  state.modalViewDate = new Date(state.viewDate);
  renderDateModal();
  document.getElementById("date-modal").classList.remove("hidden");
}
function closeDateModal() {
  document.getElementById("date-modal").classList.add("hidden");
}
function changeModalMonth(delta) {
  state.modalViewDate.setMonth(state.modalViewDate.getMonth() + delta);
  renderDateModal();
}
function selectModalDate(dateString) {
  state.viewDate = new Date(dateString);
  state.currentDay = dateString;
  renderDays(true);
  loadDay();
  closeDateModal();
}
function renderDateModal() {
  const monthLabel = document.getElementById("date-modal-month-label");
  const grid = document.getElementById("date-modal-grid");
  const year = state.modalViewDate.getFullYear();
  const month = state.modalViewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  monthLabel.textContent = state.modalViewDate.toLocaleString("it-IT", {
    month: "long",
    year: "numeric",
  });

  grid.innerHTML = "";
  const startPadding = (firstDay.getDay() + 6) % 7;
  for (let i = 0; i < startPadding; i++) {
    const cell = document.createElement("div");
    cell.className = "date-modal-cell empty";
    grid.appendChild(cell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const isoDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "date-modal-cell date-modal-day";
    cell.textContent = day;
    if (isoDate === state.currentDay) {
      cell.classList.add("selected");
    }
    if (isoDate === TODAY_ISO) {
      cell.classList.add("today");
    }
    cell.onclick = () => selectModalDate(isoDate);
    grid.appendChild(cell);
  }
}

function renderDays(scrollToActive = false) {
  const list = document.getElementById("days-list");
  list.innerHTML = "";
  const y = state.viewDate.getFullYear(),
      m = state.viewDate.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  document.getElementById("month-label").textContent =
      state.viewDate.toLocaleString("it-IT", {
        month: "long",
        year: "numeric",
      });
  let activeEl = null;
  for (let i = 1; i <= last; i++) {
    const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    const dow = new Date(y, m, i).getDay();
    const weekend = dow === 0 || dow === 6;
    const col = weekend ? "color:#d32f2f;font-weight:bold" : "";
    const item = document.createElement("div");
    item.className = `day-item ${weekend ? "weekend" : ""} ${ds === state.currentDay ? "active" : ""} ${ds === TODAY_ISO ? "is-today" : ""}`;
    const dd = state.data[ds];
    const hasNote = dd && dd.notes && dd.notes.trim().length > 0;
    const hasMap = dd && dd.postits && dd.postits.length > 0;
    const indicators = document.createElement("span");
    indicators.className = "day-indicators";

    if (hasNote) {
      const noteDot = document.createElement("span");
      noteDot.className = "day-dot has-note";
      noteDot.title = "Clicca per vedere la nota";
      noteDot.onclick = (e) => {
        e.stopPropagation();
        state.currentDay = ds;
        renderDays(false);
        loadDay();
        switchView(
            "editor",
            document.querySelector('.nav-tab[onclick*="editor"]'),
        );
      };
      indicators.appendChild(noteDot);
    }

    if (hasMap) {
      const mapDot = document.createElement("span");
      mapDot.className = "day-dot has-map";
      mapDot.title = "Clicca per vedere la mappa";
      mapDot.onclick = (e) => {
        e.stopPropagation();
        state.currentDay = ds;
        renderDays(false);
        loadDay();
        switchView("map", document.querySelector('.nav-tab[onclick*="map"]'));
        // Center on first postit after switching to map view
        requestAnimationFrame(() => {
          const dd = dayData();
          if (dd.postits && dd.postits.length > 0) {
            centerOnPostit(dd.postits[0], false);
          }
        });
      };
      indicators.appendChild(mapDot);
    }

    // Create day number element
    const dayNum = document.createElement("span");
    dayNum.className = "day-num";
    dayNum.textContent = i;

    // Create day name element
    const dayName = document.createElement("span");
    dayName.style.cssText = col;
    dayName.textContent = new Date(y, m, i).toLocaleString("it-IT", {
      weekday: "short",
    });

    // Add all elements to the day item
    item.appendChild(dayNum);
    item.appendChild(dayName);
    item.appendChild(indicators);
    item.onclick = (e) => {
      const now = Date.now();
      const last = state.lastTapTime || 0;
      const lastDay = state.lastTapDay || "";
      const isDoubleTap = (now - last < 300) && (lastDay === ds);

      state.lastTapTime = now;
      state.lastTapDay = ds;

      state.currentDay = ds;
      renderDays(false);
      loadDay();

      // Al doppio tap/click, passa direttamente all'Agenda
      if (isDoubleTap) {
        const tabAgenda = document.querySelector('.nav-tab[onclick*="agenda"]');
        switchView("agenda", tabAgenda);
      }
    };
    list.appendChild(item);
    if (ds === state.currentDay) activeEl = item;
  }
  if (scrollToActive && activeEl)
    setTimeout(
        () =>
            activeEl.scrollIntoView({
              behavior: "smooth",
              block: "center",
            }),
        10,
    );
}

function loadDay() {
  document.getElementById("main-editor").value = dayData().notes || "";
  if (document.getElementById("map-view").classList.contains("active")) renderMap();

  // Se la vista attiva è agenda, aggiorna anche quella
  if (document.getElementById("agenda-view").classList.contains("active")) renderAgenda();
}

// ── pan & zoom ────────────────────────────────────────────────────────────────
const container = document.getElementById("map-canvas-container");
const canvas = document.getElementById("infinite-canvas");
let isPanning = false,
    sx,
    sy;

container.onmousedown = (e) => {
  if (e.target === container || e.target === canvas) {
    isPanning = true;
    sx = e.clientX - state.panX;
    sy = e.clientY - state.panY;
    container.style.cursor = "grabbing";
  }
};
container.onwheel = (e) => {
  e.preventDefault();
  const rect = container.getBoundingClientRect();
  const mx = e.clientX - rect.left,
      my = e.clientY - rect.top;
  const cx = (mx - state.panX) / state.zoom,
      cy = (my - state.panY) / state.zoom;
  state.zoom = Math.max(
      0.3,
      Math.min(2, state.zoom + (e.deltaY > 0 ? -0.03 : 0.03)),
  );
  state.panX = mx - cx * state.zoom;
  state.panY = my - cy * state.zoom;
  applyXform();
};
window.addEventListener("mousemove", (e) => {
  if (isPanning) {
    state.panX = e.clientX - sx;
    state.panY = e.clientY - sy;
    applyXform();
  }
  if (state.isConnecting) updateTempLine(e);
});
window.addEventListener("mouseup", (e) => {
  isPanning = false;
  container.style.cursor = "grab";
  if (state.isConnecting) endConnection(e);
});

function applyXform() {
  canvas.style.transform = `translate(${state.panX}px,${state.panY}px) scale(${state.zoom})`;
  updateZoomSlider();
}
function adjustZoom(d) {
  const rect = container.getBoundingClientRect();
  const mx = rect.width / 2,
      my = rect.height / 2;
  const cx = (mx - state.panX) / state.zoom,
      cy = (my - state.panY) / state.zoom;
  state.zoom = Math.max(0.3, Math.min(2, state.zoom + d));
  state.panX = mx - cx * state.zoom;
  state.panY = my - cy * state.zoom;
  applyXform();
}
function updateZoomSlider() {
  const MIN_ZOOM = 0.3;
  const MAX_ZOOM = 2;
  const progress = (state.zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM);
  const thumb = document.getElementById("zoom-slider-thumb");
  const track = document.querySelector(".zoom-slider-track");
  if (thumb && track) {
    const trackHeight = track.offsetHeight;
    const thumbHeight = thumb.offsetHeight;
    const position = progress * (trackHeight - thumbHeight);
    thumb.style.top = position + "px";
  }
  const display = document.getElementById("zoom-level-display");
  if (display) {
    display.textContent = Math.round(state.zoom * 100) + "%";
  }
}
function setZoomFromSlider(trackHeight, thumbHeight, y) {
  const MIN_ZOOM = 0.3;
  const MAX_ZOOM = 2;
  const maxY = trackHeight - thumbHeight;
  const clampedY = Math.max(0, Math.min(maxY, y));
  const progress = clampedY / (maxY || 1);
  const newZoom = MIN_ZOOM + progress * (MAX_ZOOM - MIN_ZOOM);
  const rect = container.getBoundingClientRect();
  const mx = rect.width / 2,
      my = rect.height / 2;
  const oldZoom = state.zoom;
  const cx = (mx - state.panX) / oldZoom,
      cy = (my - state.panY) / oldZoom;
  state.zoom = newZoom;
  state.panX = mx - cx * state.zoom;
  state.panY = my - cy * state.zoom;
  applyXform();
}

// ── zoom slider drag ──────────────────────────────────────────────────────────
let isSliderDragging = false;
const zoomSliderThumb = document.getElementById("zoom-slider-thumb");
const zoomSliderTrack = document.querySelector(".zoom-slider-track");

if (zoomSliderThumb) {
  zoomSliderThumb.addEventListener("mousedown", (e) => {
    isSliderDragging = true;
    e.preventDefault();
  });
}

if (zoomSliderTrack) {
  zoomSliderTrack.addEventListener("mousedown", (e) => {
    isSliderDragging = true;
    handleSliderClick(e);
    e.preventDefault();
  });
}

window.addEventListener("mousemove", (e) => {
  if (isSliderDragging && zoomSliderTrack) {
    handleSliderDrag(e);
  }
});

window.addEventListener("mouseup", () => {
  isSliderDragging = false;
  if (zoomSliderThumb) {
    zoomSliderThumb.style.cursor = "grab";
  }
});

function handleSliderClick(e) {
  const rect = zoomSliderTrack.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const trackHeight = zoomSliderTrack.offsetHeight;
  const thumbHeight = zoomSliderThumb.offsetHeight;
  setZoomFromSlider(trackHeight, thumbHeight, y - thumbHeight / 2);
}

function handleSliderDrag(e) {
  const rect = zoomSliderTrack.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const trackHeight = zoomSliderTrack.offsetHeight;
  const thumbHeight = zoomSliderThumb.offsetHeight;
  setZoomFromSlider(trackHeight, thumbHeight, y - thumbHeight / 2);
  if (zoomSliderThumb) {
    zoomSliderThumb.style.cursor = "grabbing";
  }
}

setTimeout(() => updateZoomSlider(), 100);

// ── geometry helpers ──────────────────────────────────────────────────────────
/*
  Returns the point on the border of rectangle (rx,ry,rw,rh)
  closest to where a ray from the rect center toward (tx,ty) exits.
  No padding — arrow stops exactly at the box edge.
*/
function boxEdge(rx, ry, rw, rh, tx, ty) {
  const cx = rx + rw / 2,
      cy = ry + rh / 2;
  const dx = tx - cx,
      dy = ty - cy;
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return { x: cx, y: cy };
  const hw = rw / 2,
      hh = rh / 2;
  // t to reach each wall from center in direction (dx,dy)
  const tX = hw / Math.abs(dx); // vertical walls
  const tY = hh / Math.abs(dy); // horizontal walls
  const t =
      Math.abs(dx) < 0.01 ? tY : Math.abs(dy) < 0.01 ? tX : Math.min(tX, tY);
  return { x: cx + t * dx, y: cy + t * dy };
}

function getRect(p) {
  const el = document.getElementById(`postit-${p.id}`);
  if (el)
    return {
      x: p.x,
      y: p.y,
      w: el.offsetWidth,
      h: el.offsetHeight,
    };
  return { x: p.x, y: p.y, w: p.w || 220, h: p.h || 120 };
}

// ── postit render ─────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
}

function addPostit() {
  const dd = dayData();
  const rect = container.getBoundingClientRect();
  const screenCenterX = window.innerWidth / 2;
  const screenCenterY = window.innerHeight / 2;
  const baseX = (screenCenterX - rect.left - state.panX) / state.zoom - 110;
  const baseY = (screenCenterY - rect.top - state.panY) / state.zoom - 60;
  const offset = 28;
  const index = dd.postits.length;
  dd.postits.push({
    id: Date.now(),
    x: baseX + offset * index,
    y: baseY + offset * index,
    w: 220,
    h: null,
    title: `nota ${index + 1}`,
    content: "",
  });
  renderMap();
  saveMap();
}

function renderMap() {
  canvas.querySelectorAll(".postit").forEach((el) => el.remove());
  const dd = dayData();
  dd.postits.forEach((p) => {
    const el = document.createElement("div");
    el.className = "postit";
    el.id = `postit-${p.id}`;
    el.style.left = p.x + "px";
    el.style.top = p.y + "px";
    el.style.width = (p.w || 220) + "px";
    if (p.h) el.style.height = p.h + "px";

    el.style.background = POSTIT_BG[p.color] || "#ffffff";
    el.dataset.color = p.color || "";

    el.innerHTML = `
      <div class="postit-color-strip" style="background:${p.color || "transparent"}"></div>
      <div class="postit-header">
        <input class="postit-title" value="${escHtml(p.title)}"
          oninput="updatePostitField(${p.id},'title',this.value)">
        <div class="postit-btns">
          <button class="postit-color-btn" onclick="openColorPicker(event,${p.id})" title="Cambia colore">&#11044;</button>
          <span class="link-handle" onmousedown="startConnection(event,${p.id})">🔗</span>
          <button class="postit-del" onclick="deletePostit(${p.id})">✕</button>
        </div>
      </div>
      <textarea class="postit-body"
        oninput="updatePostitField(${p.id},'content',this.value)">${escHtml(p.content)}</textarea>
      <div class="postit-resize" onmousedown="startResize(event,${p.id})">
        <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1,7 L7,7 L7,1" stroke="#666" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
      </div>
    `;
    makeDraggable(el, p);
    canvas.appendChild(el);
  });
  drawArrows();
}

function updatePostitField(id, field, val) {
  const p = dayData().postits.find((x) => x.id === id);
  if (p) {
    p[field] = val;
    saveMap();
  }
}

// ── drag ─────────────────────────────────────────────────────────────────────
function makeDraggable(el, p) {
  let drag = false,
      ox,
      oy;
  el.onmousedown = (e) => {
    if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.closest(".link-handle") ||
        e.target.closest(".postit-resize")
    )
      return;
    drag = true;
    ox = e.clientX / state.zoom - p.x;
    oy = e.clientY / state.zoom - p.y;
    e.stopPropagation();
  };
  window.addEventListener("mousemove", (e) => {
    if (!drag) return;
    p.x = e.clientX / state.zoom - ox;
    p.y = e.clientY / state.zoom - oy;
    el.style.left = p.x + "px";
    el.style.top = p.y + "px";
    drawArrows();
    saveMap();
  });
  window.addEventListener("mouseup", () => (drag = false));
}

// ── resize ────────────────────────────────────────────────────────────────────
function startResize(e, id) {
  e.stopPropagation();
  e.preventDefault();
  const p = dayData().postits.find((x) => x.id === id);
  const el = document.getElementById(`postit-${id}`);
  if (!p || !el) return;
  const startX = e.clientX,
      startY = e.clientY;
  const startW = el.offsetWidth,
      startH = el.offsetHeight;
  const move = (me) => {
    p.w = Math.max(160, startW + (me.clientX - startX) / state.zoom);
    p.h = Math.max(80, startH + (me.clientY - startY) / state.zoom);
    el.style.width = p.w + "px";
    el.style.height = p.h + "px";
    drawArrows();
  };
  const up = () => {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
    saveMap();
  };
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
}

// ── connection ────────────────────────────────────────────────────────────────
function startConnection(e, id) {
  e.stopPropagation();
  state.isConnecting = true;
  state.connectStartId = id;
}

function updateTempLine(e) {
  const rect = container.getBoundingClientRect();
  const tx = (e.clientX - rect.left - state.panX) / state.zoom;
  const ty = (e.clientY - rect.top - state.panY) / state.zoom;
  const p = dayData().postits.find((x) => x.id === state.connectStartId);
  if (!p) return;
  const r = getRect(p);
  const sp = boxEdge(r.x, r.y, r.w, r.h, tx, ty);
  let line = document.getElementById("temp-line");
  if (!line) {
    line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.id = "temp-line";
    line.setAttribute("stroke", "#6200ee");
    line.setAttribute("stroke-width", "1.5");
    line.setAttribute("stroke-dasharray", "5,4");
    document.getElementById("arrows-svg").appendChild(line);
  }
  line.setAttribute("x1", sp.x);
  line.setAttribute("y1", sp.y);
  line.setAttribute("x2", tx);
  line.setAttribute("y2", ty);
}

function endConnection(e) {
  state.isConnecting = false;
  document.getElementById("temp-line")?.remove();
  const targetEl = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest(".postit");
  if (targetEl) {
    const tid = parseInt(targetEl.id.replace("postit-", ""));
    if (tid && tid !== state.connectStartId) {
      const dd = dayData();
      if (!dd.arrows) dd.arrows = [];
      // initialise cp with slight vertical offset so the handle is draggable from the start
      dd.arrows.push({
        from: state.connectStartId,
        to: tid,
        cp: { dx: 0, dy: -30 },
        bidir: false,
      });
      drawArrows();
      saveMap();
    }
  }
}

// ── draw arrows ───────────────────────────────────────────────────────────────
function drawArrows() {
  const svg = document.getElementById("arrows-svg");
  svg.querySelectorAll(".arrow-group").forEach((g) => g.remove());
  const dd = dayData();
  if (!dd.arrows) return;

  dd.arrows.forEach((a) => {
    const p1 = dd.postits.find((p) => p.id === a.from);
    const p2 = dd.postits.find((p) => p.id === a.to);
    if (!p1 || !p2) return;
    if (!a.cp) a.cp = { dx: 0, dy: -30 };

    const r1 = getRect(p1);
    const r2 = getRect(p2);
    const cx1 = r1.x + r1.w / 2,
        cy1 = r1.y + r1.h / 2;
    const cx2 = r2.x + r2.w / 2,
        cy2 = r2.y + r2.h / 2;
    const midX = (cx1 + cx2) / 2,
        midY = (cy1 + cy2) / 2;
    const cpX = midX + a.cp.dx,
        cpY = midY + a.cp.dy;

    // Exit point from p1 toward cp, entry point into p2 from cp
    const spRaw = boxEdge(r1.x, r1.y, r1.w, r1.h, cpX, cpY);
    const epRaw = boxEdge(r2.x, r2.y, r2.w, r2.h, cpX, cpY);

    // Skip only when the two edge points are literally the same pixel
    // (boxes overlap completely). A small threshold avoids invisible arrows.
    if (Math.hypot(epRaw.x - spRaw.x, epRaw.y - spRaw.y) < 3) return;

    // Offset the endpoints OUTWARD from each box by the marker size (7px)
    // so the arrowhead is always fully visible outside the postit rectangle.
    const MARKER_OFFSET = 7;
    function offsetPt(edge, boxCx, boxCy, dist) {
      const ddx = edge.x - boxCx,
          ddy = edge.y - boxCy;
      const len = Math.hypot(ddx, ddy) || 1;
      return {
        x: edge.x + (ddx / len) * dist,
        y: edge.y + (ddy / len) * dist,
      };
    }
    const sp = offsetPt(spRaw, r1.x + r1.w / 2, r1.y + r1.h / 2, MARKER_OFFSET);
    const ep = offsetPt(epRaw, r2.x + r2.w / 2, r2.y + r2.h / 2, MARKER_OFFSET);

    const d = `M ${sp.x.toFixed(1)} ${sp.y.toFixed(1)} Q ${cpX.toFixed(1)} ${cpY.toFixed(1)} ${ep.x.toFixed(1)} ${ep.y.toFixed(1)}`;

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "arrow-group");

    const hit = document.createElementNS("http://www.w3.org/2000/svg", "path");
    hit.setAttribute("class", "arrow-hit");
    hit.setAttribute("d", d);
    hit.onclick = (e) => {
      e.stopPropagation();
      showArrowMenu(e, a, dd);
    };
    group.appendChild(hit);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "arrow-path");
    path.setAttribute("d", d);
    path.setAttribute("marker-end", "url(#ah-end)");
    if (a.bidir) path.setAttribute("marker-start", "url(#ah-start)");
    group.appendChild(path);

    // Hover: swap marker color (CSS cannot change SVG marker-end attribute)
    group.addEventListener("mouseenter", () => {
      path.setAttribute("marker-end", "url(#ah-end-hover)");
      if (a.bidir) path.setAttribute("marker-start", "url(#ah-start-hover)");
    });
    group.addEventListener("mouseleave", () => {
      path.setAttribute("marker-end", "url(#ah-end)");
      if (a.bidir) path.setAttribute("marker-start", "url(#ah-start)");
      else path.removeAttribute("marker-start");
    });

    const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
    );
    circle.setAttribute("class", "curve-handle");
    circle.setAttribute("cx", cpX.toFixed(1));
    circle.setAttribute("cy", cpY.toFixed(1));
    circle.setAttribute("r", "5");
    circle.onmousedown = (e) => {
      e.stopPropagation();
      const move = (me) => {
        const rect = container.getBoundingClientRect();
        a.cp.dx = (me.clientX - rect.left - state.panX) / state.zoom - midX;
        a.cp.dy = (me.clientY - rect.top - state.panY) / state.zoom - midY;
        drawArrows();
      };
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
        saveMap();
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    };
    group.appendChild(circle);
    svg.appendChild(group);
  });
}

// ── arrow menu ────────────────────────────────────────────────────────────────
function showArrowMenu(e, a, dd) {
  document.getElementById("arrow-menu-popup")?.remove();
  const menu = document.createElement("div");
  menu.id = "arrow-menu-popup";
  menu.className = "arrow-menu";
  menu.style.left = e.clientX + "px";
  menu.style.top = e.clientY + "px";

  const mkbtn = (icon, label, cls, fn) => {
    const b = document.createElement("button");
    b.className = "arrow-menu-btn" + (cls ? " " + cls : "");
    b.innerHTML = `<span>${icon}</span> ${label}`;
    b.onclick = fn;
    return b;
  };
  menu.appendChild(
      mkbtn("⇄", "Inverti direzione", "", () => {
        [a.from, a.to] = [a.to, a.from];
        a.cp.dx = -a.cp.dx;
        a.cp.dy = -a.cp.dy;
        drawArrows();
        saveMap();
        menu.remove();
      }),
  );
  menu.appendChild(
      mkbtn(
          a.bidir ? "→" : "↔",
          a.bidir ? "Freccia semplice" : "Bidirezionale",
          "",
          () => {
            a.bidir = !a.bidir;
            drawArrows();
            saveMap();
            menu.remove();
          },
      ),
  );
  menu.appendChild(
      mkbtn("✕", "Elimina connessione", "danger", () => {
        dd.arrows = dd.arrows.filter((x) => x !== a);
        drawArrows();
        saveMap();
        menu.remove();
      }),
  );
  document.body.appendChild(menu);
  setTimeout(() => {
    window.addEventListener("click", function close() {
      menu?.remove();
      window.removeEventListener("click", close);
    });
  }, 10);
}

// ── misc ──────────────────────────────────────────────────────────────────────
function deletePostit(id) {
  const dd = dayData();
  dd.postits = dd.postits.filter((p) => p.id !== id);
  dd.arrows = (dd.arrows || []).filter((a) => a.from !== id && a.to !== id);
  renderMap();
  saveMap();
}

// ── MODIFICATO PER SUPPORTARE LA VISTA AGENDA ──
function switchView(v, btn) {
  document
      .querySelectorAll(".view")
      .forEach((el) => el.classList.remove("active"));
  document
      .querySelectorAll(".nav-tab")
      .forEach((el) => el.classList.remove("active"));

  const viewEl = document.getElementById(v + "-view");
  if(viewEl) viewEl.classList.add("active");
  if(btn) btn.classList.add("active");

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

  // Costruisci le ore se passiamo alla vista agenda
  if (v === "agenda") {
    renderAgenda();
    scrollToCurrentTime(); // <--- Aggiungi questa riga qui
  }
}

renderDays(true);
loadDay();
applyXform();

// ── postit color palette ──────────────────────────────────────────────────────
const POSTIT_COLORS = [
  { hex: "#e53935", bg: "#ffebee", label: "Rosso" },
  { hex: "#f57c00", bg: "#fff3e0", label: "Arancio" },
  { hex: "#f9a825", bg: "#fffde7", label: "Giallo" },
  { hex: "#388e3c", bg: "#e8f5e9", label: "Verde" },
  { hex: "#0097a7", bg: "#e0f7fa", label: "Ciano" },
  { hex: "#1565c0", bg: "#e3f2fd", label: "Blu" },
  { hex: "#6a1b9a", bg: "#f3e5f5", label: "Viola" },
  { hex: "#c2185b", bg: "#fce4ec", label: "Rosa" },
  { hex: "#546e7a", bg: "#eceff1", label: "Grigio" },
];
const POSTIT_BG = Object.fromEntries(
    POSTIT_COLORS.map((col) => [col.hex, col.bg]),
);

function openColorPicker(e, id) {
  e.stopPropagation();
  document.getElementById("color-picker-popup")?.remove();
  const p = dayData().postits.find((x) => x.id === id);
  const popup = document.createElement("div");
  popup.id = "color-picker-popup";
  popup.className = "color-picker-popup";
  const px = Math.min(e.clientX, window.innerWidth - 170);
  const py = Math.min(e.clientY + 8, window.innerHeight - 130);
  popup.style.left = px + "px";
  popup.style.top = py + "px";

  const none = document.createElement("div");
  none.className = "color-swatch" + (!p.color ? " selected" : "");
  none.title = "Nessuno";
  none.style.background = "#f0f0f0";
  none.textContent = "✕";
  none.onclick = () => {
    p.color = "";
    saveMap();
    renderMap();
    popup.remove();
  };
  popup.appendChild(none);

  POSTIT_COLORS.forEach((col) => {
    const sw = document.createElement("div");
    sw.className = "color-swatch" + (p.color === col.hex ? " selected" : "");
    sw.title = col.label;
    sw.style.background = col.hex;
    sw.onclick = () => {
      p.color = col.hex;
      saveMap();
      renderMap();
      popup.remove();
    };
    popup.appendChild(sw);
  });

  document.body.appendChild(popup);
  setTimeout(() => {
    window.addEventListener("click", function closeP() {
      popup?.remove();
      window.removeEventListener("click", closeP);
    });
  }, 10);
}

// ── toast ─────────────────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById("save-toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2400);
}

// ── export JSON ───────────────────────────────────────────────────────────────
function exportJSON() {
  const json = JSON.stringify(state.data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dailymapper-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("\u2713 Esportato!");
}

// ── import JSON ───────────────────────────────────────────────────────────────
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
  showToast("\u2713 Tutti i dati sono stati cancellati");
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
      showToast("\u2713 Importato!");
    } catch {
      showToast("\u2717 File non valido");
    }
    ev.target.value = "";
  };
  reader.readAsText(file);
}

// ── postit navigation ─────────────────────────────────────────────────────────
state.navIndex = 0;

function centerOnPostit(p, animated = true) {
  const rect = container.getBoundingClientRect();
  const el = document.getElementById("postit-" + p.id);
  const pw = el ? el.offsetWidth : p.w || 220;
  const ph = el ? el.offsetHeight : p.h || 120;

  const screenCenterX = window.innerWidth / 2;
  const screenCenterY = window.innerHeight / 2;
  const targetX = screenCenterX - rect.left - (p.x + pw / 2) * state.zoom;
  const targetY = screenCenterY - rect.top - (p.y + ph / 2) * state.zoom;

  if (!animated) {
    state.panX = targetX;
    state.panY = targetY;
    applyXform();
    return;
  }

  const startX = state.panX,
      startY = state.panY;
  const dx = targetX - startX,
      dy = targetY - startY;
  const dur = 380;
  let start = null;
  function step(ts) {
    if (!start) start = ts;
    const prog = Math.min((ts - start) / dur, 1);
    const t = 1 - Math.pow(1 - prog, 3);
    state.panX = startX + dx * t;
    state.panY = startY + dy * t;
    applyXform();
    if (prog < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function updateNavBar() {
  const dd = dayData();
  const nav = document.getElementById("postit-nav");
  const label = document.getElementById("nav-label");
  if (!dd.postits || dd.postits.length === 0) {
    nav.classList.remove("visible");
    return;
  }
  nav.classList.add("visible");
  const idx =
      ((state.navIndex % dd.postits.length) + dd.postits.length) %
      dd.postits.length;
  state.navIndex = idx;
  label.textContent = `${idx + 1} / ${dd.postits.length}`;
}

function navPostit(dir) {
  const dd = dayData();
  if (!dd.postits || dd.postits.length === 0) return;
  state.navIndex =
      (((state.navIndex + dir) % dd.postits.length) + dd.postits.length) %
      dd.postits.length;
  updateNavBar();
  centerOnPostit(dd.postits[state.navIndex], true);
}

const _origRenderMap = renderMap;
renderMap = function () {
  _origRenderMap();
  updateNavBar();
};

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "e") {
    e.preventDefault();
    exportJSON();
    return;
  }
  const mapActive = document
      .getElementById("map-view")
      .classList.contains("active");
  if (!mapActive) return;
  if (e.key === "ArrowRight") navPostit(1);
  if (e.key === "ArrowLeft") navPostit(-1);
});

initTheme();
initSidebar();

// ==========================================
// FUNZIONI NUOVE: AGENDA E TIMERS
// ==========================================

function renderAgenda() {
  const list = document.getElementById("agenda-list");
  if (!list) return;
  list.innerHTML = "";
  const dd = dayData();

  // 288 iterazioni: una ogni 5 minuti (24 * 12)
  for (let i = 0; i < 288; i++) {
    if (!dd.agenda[i]) dd.agenda[i] = { text: "", alarm: false, snoozeUntil: null };
    const hourData = dd.agenda[i];

    // Calcolo ora e minuti per l'etichetta (ogni 5 minuti)
    const h = Math.floor(i / 12);
    const m = (i % 12) * 5;
    const timeStr = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");

    const row = document.createElement("div");
    row.className = "agenda-row";
    row.id = "agenda-row-" + i;

    const timeSpan = document.createElement("span");
    timeSpan.className = "agenda-time";
    timeSpan.textContent = timeStr;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "agenda-input";
    input.placeholder = "..........";
    input.value = hourData.text;
    input.oninput = (e) => {
      dd.agenda[i].text = e.target.value;
      saveMap();
    };

    const clock = document.createElement("button");
    clock.className = "agenda-clock-btn" + (hourData.alarm ? " active" : "");
    clock.innerHTML = "⏰";
    clock.onclick = () => {
      dd.agenda[i].alarm = !dd.agenda[i].alarm;
      dd.agenda[i].snoozeUntil = null;
      saveMap();
      renderAgenda();
    };

    row.appendChild(timeSpan);
    row.appendChild(input);
    row.appendChild(clock);
    list.appendChild(row);
  }
}

function scrollToCurrentTime() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  // Trova l'indice del blocco di 5 minuti più vicino
  const index = (currentHour * 12) + Math.floor(currentMin / 5);

  const targetRow = document.getElementById("agenda-row-" + index);
  if (targetRow) {
    setTimeout(() => {
      targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
      targetRow.style.transition = "background-color 0.5s";
      targetRow.style.backgroundColor = "var(--today-color)";
      setTimeout(() => targetRow.style.backgroundColor = "", 2000);
    }, 50);
  }
}

// ── Motore Audio Web API ──
let audioCtx;
let alarmInterval;

function playAlarmSound() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const playBeep = () => {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'sine'; // Suono morbido, cambia in 'square' per un suono più acuto
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // Frequenza (Nota La)

    // Fade out per evitare "click" audio
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  };

  playBeep();
  // Ripeti il bip ogni secondo finché la modale è aperta
  alarmInterval = setInterval(playBeep, 1000);
}

function stopAlarmSound() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
}

// ── Motore Timer / Sveglie (controlla ogni 10 secondi) ──
let activeAlarm = null;
setInterval(checkAlarms, 10000);

function checkAlarms() {
  if (activeAlarm) return;
  const now = new Date();

  for (const dateString in state.data) {
    const dd = state.data[dateString];
    if (!dd.agenda) continue;

    for (let i = 0; i < 288; i++) {
      const item = dd.agenda[i];
      if (item && item.alarm) {
        const h = Math.floor(i / 12);
        const m = (i % 12) * 5;
        const [y, month, d] = dateString.split("-").map(Number);

        // Calcola l'ora esatta considerando la granularità di 5 minuti
        const targetTime = new Date(y, month - 1, d, h, m, 0);

        if (now >= targetTime) {
          if (!item.snoozeUntil || now.getTime() >= item.snoozeUntil) {
            showAlarmModal(dateString, i, h, m, item.text);
            return;
          }
        }
      }
    }
  }
}

function showAlarmModal(dateString, index, h, m, text) {
  activeAlarm = { ds: dateString, index: index };
  const messageEl = document.getElementById("alarm-message");
  const modalEl = document.getElementById("alarm-modal");

  const displayDate = (dateString === TODAY_ISO) ? "Oggi" : dateString;
  const timeStr = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");

  messageEl.innerHTML = `<strong>Data:</strong> ${displayDate} - <strong>Ore:</strong> ${timeStr}<br><br>
                         <i>${text || "Nessun appunto inserito."}</i>`;

  modalEl.classList.remove("hidden");
  modalEl.classList.add("flashing-overlay"); // Effetto luminoso aggiuntivo

  playAlarmSound();
}

function stopAlarm() {
  if (activeAlarm) {
    const { ds, index } = activeAlarm;
    state.data[ds].agenda[index].alarm = false;
    saveMap();
  }
  closeAlarmModal();
}

function snoozeAlarm() {
  if (activeAlarm) {
    const { ds, index } = activeAlarm;
    state.data[ds].agenda[index].snoozeUntil = Date.now() + 5 * 60 * 1000;
    saveMap();
  }
  closeAlarmModal();
}

function goToAlarm() {
  if (activeAlarm) {
    const { ds, index } = activeAlarm;
    state.currentDay = ds;
    state.viewDate = new Date(ds);
    state.data[ds].agenda[index].alarm = false;
    saveMap();

    renderDays(true);
    loadDay();

    const tabAgenda = document.querySelector('.nav-tab[onclick*="agenda"]');
    switchView("agenda", tabAgenda);

    setTimeout(() => {
      const row = document.getElementById("agenda-row-" + index);
      if (row) {
        row.scrollIntoView({ behavior: "smooth", block: "center" });
        row.style.background = "var(--md-primary)";
        setTimeout(() => { row.style.background = "var(--md-surface)"; }, 800);
      }
    }, 200);
  }
  closeAlarmModal();
}

function closeAlarmModal() {
  activeAlarm = null;
  const modalEl = document.getElementById("alarm-modal");
  modalEl.classList.add("hidden");
  modalEl.classList.remove("flashing-overlay");

  stopAlarmSound();

  if (document.getElementById("agenda-view").classList.contains("active")) {
    renderAgenda();
  }
}