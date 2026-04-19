// ── Colori postit ─────────────────────────────────────────────────────────────
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
  POSTIT_COLORS.map((col) => [col.hex, col.bg])
);

// ── Riferimenti DOM mappa ─────────────────────────────────────────────────────
const container = document.getElementById("map-canvas-container");
const canvas = document.getElementById("infinite-canvas");

// ── Pan & Zoom (Pointer Events: mouse + touch + pinch) ───────────────────────
let isPanning = false, sx, sy;
let _pinchActive = false, _pinchStartDist = 0, _pinchStartZoom = 1;
const _panPtrs = new Map(); // pointerId → {x, y}

container.addEventListener("pointerdown", (e) => {
  if (e.target !== container && e.target !== canvas) return;
  e.preventDefault();
  container.setPointerCapture(e.pointerId);
  _panPtrs.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (_panPtrs.size === 1) {
    isPanning = true;
    sx = e.clientX - state.panX;
    sy = e.clientY - state.panY;
    container.style.cursor = "grabbing";
  } else if (_panPtrs.size === 2) {
    isPanning = false;
    const pts = [..._panPtrs.values()];
    _pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    _pinchStartZoom = state.zoom;
    _pinchActive = true;
  }
});

container.addEventListener("pointermove", (e) => {
  if (!_panPtrs.has(e.pointerId)) return;
  _panPtrs.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (_panPtrs.size === 1 && isPanning) {
    state.panX = e.clientX - sx;
    state.panY = e.clientY - sy;
    applyXform();
  } else if (_panPtrs.size === 2 && _pinchActive) {
    const pts = [..._panPtrs.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    const rect = container.getBoundingClientRect();
    const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
    const midY = (pts[0].y + pts[1].y) / 2 - rect.top;
    const cx = (midX - state.panX) / state.zoom;
    const cy = (midY - state.panY) / state.zoom;
    state.zoom = Math.max(0.3, Math.min(2, _pinchStartZoom * dist / (_pinchStartDist || 1)));
    state.panX = midX - cx * state.zoom;
    state.panY = midY - cy * state.zoom;
    applyXform();
  }
});

container.addEventListener("pointerup", (e) => {
  _panPtrs.delete(e.pointerId);
  if (_panPtrs.size < 2) _pinchActive = false;
  if (_panPtrs.size === 0) {
    isPanning = false;
    container.style.cursor = "grab";
  } else if (_panPtrs.size === 1) {
    const [, pos] = [..._panPtrs.entries()][0];
    sx = pos.x - state.panX;
    sy = pos.y - state.panY;
    isPanning = true;
  }
});

container.addEventListener("pointercancel", (e) => {
  _panPtrs.delete(e.pointerId);
  if (_panPtrs.size === 0) {
    isPanning = false;
    _pinchActive = false;
    container.style.cursor = "grab";
  }
});

container.onwheel = (e) => {
  e.preventDefault();
  const rect = container.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const cx = (mx - state.panX) / state.zoom, cy = (my - state.panY) / state.zoom;
  state.zoom = Math.max(0.3, Math.min(2, state.zoom + (e.deltaY > 0 ? -0.03 : 0.03)));
  state.panX = mx - cx * state.zoom;
  state.panY = my - cy * state.zoom;
  applyXform();
};

// Connessioni: tracciamento globale (nessun pointer capture sul link-handle)
window.addEventListener("pointermove", (e) => {
  if (state.isConnecting) updateTempLine(e);
});
window.addEventListener("pointerup", (e) => {
  if (state.isConnecting) endConnection(e);
});

function applyXform() {
  canvas.style.transform = `translate(${state.panX}px,${state.panY}px) scale(${state.zoom})`;
  updateZoomSlider();
}

function adjustZoom(d) {
  const rect = container.getBoundingClientRect();
  const mx = rect.width / 2, my = rect.height / 2;
  const cx = (mx - state.panX) / state.zoom, cy = (my - state.panY) / state.zoom;
  state.zoom = Math.max(0.3, Math.min(2, state.zoom + d));
  state.panX = mx - cx * state.zoom;
  state.panY = my - cy * state.zoom;
  applyXform();
}

// ── Zoom slider ───────────────────────────────────────────────────────────────
function updateZoomSlider() {
  const MIN_ZOOM = 0.3, MAX_ZOOM = 2;
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
  if (display) display.textContent = Math.round(state.zoom * 100) + "%";
}

function setZoomFromSlider(trackHeight, thumbHeight, y) {
  const MIN_ZOOM = 0.3, MAX_ZOOM = 2;
  const maxY = trackHeight - thumbHeight;
  const clampedY = Math.max(0, Math.min(maxY, y));
  const progress = clampedY / (maxY || 1);
  const newZoom = MIN_ZOOM + progress * (MAX_ZOOM - MIN_ZOOM);
  const rect = container.getBoundingClientRect();
  const mx = rect.width / 2, my = rect.height / 2;
  const cx = (mx - state.panX) / state.zoom, cy = (my - state.panY) / state.zoom;
  state.zoom = newZoom;
  state.panX = mx - cx * state.zoom;
  state.panY = my - cy * state.zoom;
  applyXform();
}

let isSliderDragging = false;
const zoomSliderThumb = document.getElementById("zoom-slider-thumb");
const zoomSliderTrack = document.querySelector(".zoom-slider-track");

if (zoomSliderThumb) {
  zoomSliderThumb.addEventListener("pointerdown", (e) => {
    isSliderDragging = true;
    zoomSliderThumb.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  zoomSliderThumb.addEventListener("pointermove", (e) => {
    if (isSliderDragging) handleSliderDrag(e);
  });
  zoomSliderThumb.addEventListener("pointerup", () => {
    isSliderDragging = false;
    zoomSliderThumb.style.cursor = "grab";
  });
  zoomSliderThumb.addEventListener("pointercancel", () => {
    isSliderDragging = false;
  });
}

if (zoomSliderTrack) {
  zoomSliderTrack.addEventListener("pointerdown", (e) => {
    if (!zoomSliderThumb) return;
    isSliderDragging = true;
    zoomSliderThumb.setPointerCapture(e.pointerId);
    handleSliderClick(e);
    e.preventDefault();
  });
}

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
  if (zoomSliderThumb) zoomSliderThumb.style.cursor = "grabbing";
}

setTimeout(() => updateZoomSlider(), 100);

// ── Geometria ─────────────────────────────────────────────────────────────────
function boxEdge(rx, ry, rw, rh, tx, ty) {
  const cx = rx + rw / 2, cy = ry + rh / 2;
  const dx = tx - cx, dy = ty - cy;
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return { x: cx, y: cy };
  const hw = rw / 2, hh = rh / 2;
  const tX = hw / Math.abs(dx);
  const tY = hh / Math.abs(dy);
  const t = Math.abs(dx) < 0.01 ? tY : Math.abs(dy) < 0.01 ? tX : Math.min(tX, tY);
  return { x: cx + t * dx, y: cy + t * dy };
}

function getRect(p) {
  const el = document.getElementById(`postit-${p.id}`);
  if (el) return { x: p.x, y: p.y, w: el.offsetWidth, h: el.offsetHeight };
  return { x: p.x, y: p.y, w: p.w || 220, h: p.h || 120 };
}

// ── Rendering postit ──────────────────────────────────────────────────────────
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
    title: `Nota ${index + 1}`,
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
          <span class="link-handle" onpointerdown="startConnection(event,${p.id})">${ICONS.link}</span>
          <button class="postit-del" onclick="deletePostit(${p.id})">${ICONS.close}</button>
        </div>
      </div>
      <textarea class="postit-body"
        oninput="updatePostitField(${p.id},'content',this.value)">${escHtml(p.content)}</textarea>
      <div class="postit-resize" onpointerdown="startResize(event,${p.id})">
        <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1,7 L7,7 L7,1" stroke="#666" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
      </div>
    `;
    makeDraggable(el, p);
    canvas.appendChild(el);
  });
  drawArrows();
  updateNavBar();
}

function updatePostitField(id, field, val) {
  const p = dayData().postits.find((x) => x.id === id);
  if (p) { p[field] = val; saveMap(); }
}

function deletePostit(id) {
  const dd = dayData();
  dd.postits = dd.postits.filter((p) => p.id !== id);
  dd.arrows = (dd.arrows || []).filter((a) => a.from !== id && a.to !== id);
  renderMap();
  saveMap();
}

// ── Drag postit ───────────────────────────────────────────────────────────────
function makeDraggable(el, p) {
  let drag = false, ox, oy;
  el.addEventListener("pointerdown", (e) => {
    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA" ||
      e.target.closest(".link-handle") ||
      e.target.closest(".postit-resize")
    ) return;
    drag = true;
    ox = e.clientX / state.zoom - p.x;
    oy = e.clientY / state.zoom - p.y;
    el.setPointerCapture(e.pointerId);
    e.stopPropagation();
  });
  el.addEventListener("pointermove", (e) => {
    if (!drag) return;
    p.x = e.clientX / state.zoom - ox;
    p.y = e.clientY / state.zoom - oy;
    el.style.left = p.x + "px";
    el.style.top = p.y + "px";
    drawArrows();
    saveMap();
  });
  el.addEventListener("pointerup",     () => { drag = false; });
  el.addEventListener("pointercancel", () => { drag = false; });
}

// ── Resize postit ─────────────────────────────────────────────────────────────
function startResize(e, id) {
  e.stopPropagation();
  e.preventDefault();
  const p = dayData().postits.find((x) => x.id === id);
  const el = document.getElementById(`postit-${id}`);
  if (!p || !el) return;
  const startX = e.clientX, startY = e.clientY;
  const startW = el.offsetWidth, startH = el.offsetHeight;
  const handle = e.target.closest(".postit-resize") || e.target;
  handle.setPointerCapture(e.pointerId);
  const move = (me) => {
    p.w = Math.max(160, startW + (me.clientX - startX) / state.zoom);
    p.h = Math.max(80, startH + (me.clientY - startY) / state.zoom);
    el.style.width = p.w + "px";
    el.style.height = p.h + "px";
    drawArrows();
  };
  const up = () => {
    handle.removeEventListener("pointermove", move);
    handle.removeEventListener("pointerup", up);
    handle.removeEventListener("pointercancel", up);
    saveMap();
  };
  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", up);
  handle.addEventListener("pointercancel", up);
}

// ── Connessioni (frecce) ──────────────────────────────────────────────────────
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
  const targetEl = document.elementFromPoint(e.clientX, e.clientY)?.closest(".postit");
  if (targetEl) {
    const tid = parseInt(targetEl.id.replace("postit-", ""));
    if (tid && tid !== state.connectStartId) {
      const dd = dayData();
      if (!dd.arrows) dd.arrows = [];
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

// ── Disegno frecce ────────────────────────────────────────────────────────────
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

    const r1 = getRect(p1), r2 = getRect(p2);
    const cx1 = r1.x + r1.w / 2, cy1 = r1.y + r1.h / 2;
    const cx2 = r2.x + r2.w / 2, cy2 = r2.y + r2.h / 2;
    const midX = (cx1 + cx2) / 2, midY = (cy1 + cy2) / 2;
    const cpX = midX + a.cp.dx, cpY = midY + a.cp.dy;

    const spRaw = boxEdge(r1.x, r1.y, r1.w, r1.h, cpX, cpY);
    const epRaw = boxEdge(r2.x, r2.y, r2.w, r2.h, cpX, cpY);

    if (Math.hypot(epRaw.x - spRaw.x, epRaw.y - spRaw.y) < 3) return;

    const MARKER_OFFSET = 7;
    function offsetPt(edge, boxCx, boxCy, dist) {
      const ddx = edge.x - boxCx, ddy = edge.y - boxCy;
      const len = Math.hypot(ddx, ddy) || 1;
      return { x: edge.x + (ddx / len) * dist, y: edge.y + (ddy / len) * dist };
    }
    const sp = offsetPt(spRaw, r1.x + r1.w / 2, r1.y + r1.h / 2, MARKER_OFFSET);
    const ep = offsetPt(epRaw, r2.x + r2.w / 2, r2.y + r2.h / 2, MARKER_OFFSET);
    const d = `M ${sp.x.toFixed(1)} ${sp.y.toFixed(1)} Q ${cpX.toFixed(1)} ${cpY.toFixed(1)} ${ep.x.toFixed(1)} ${ep.y.toFixed(1)}`;

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "arrow-group");

    const hit = document.createElementNS("http://www.w3.org/2000/svg", "path");
    hit.setAttribute("class", "arrow-hit");
    hit.setAttribute("d", d);
    hit.onclick = (e) => { e.stopPropagation(); showArrowMenu(e, a, dd); };
    group.appendChild(hit);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "arrow-path");
    path.setAttribute("d", d);
    path.setAttribute("marker-end", "url(#ah-end)");
    if (a.bidir) path.setAttribute("marker-start", "url(#ah-start)");
    group.appendChild(path);

    group.addEventListener("mouseenter", () => {
      path.setAttribute("marker-end", "url(#ah-end-hover)");
      if (a.bidir) path.setAttribute("marker-start", "url(#ah-start-hover)");
    });
    group.addEventListener("mouseleave", () => {
      path.setAttribute("marker-end", "url(#ah-end)");
      if (a.bidir) path.setAttribute("marker-start", "url(#ah-start)");
      else path.removeAttribute("marker-start");
    });

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("class", "curve-handle");
    circle.setAttribute("cx", cpX.toFixed(1));
    circle.setAttribute("cy", cpY.toFixed(1));
    circle.setAttribute("r", "5");
    circle.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      circle.setPointerCapture(e.pointerId);
      const move = (me) => {
        const rect = container.getBoundingClientRect();
        a.cp.dx = (me.clientX - rect.left - state.panX) / state.zoom - midX;
        a.cp.dy = (me.clientY - rect.top - state.panY) / state.zoom - midY;
        drawArrows();
      };
      const up = () => {
        circle.removeEventListener("pointermove", move);
        circle.removeEventListener("pointerup", up);
        circle.removeEventListener("pointercancel", up);
        saveMap();
      };
      circle.addEventListener("pointermove", move);
      circle.addEventListener("pointerup", up);
      circle.addEventListener("pointercancel", up);
    });
    group.appendChild(circle);
    svg.appendChild(group);
  });
}

// ── Menu freccia ──────────────────────────────────────────────────────────────
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

  menu.appendChild(mkbtn(ICONS.swap, "Inverti direzione", "", () => {
    [a.from, a.to] = [a.to, a.from];
    a.cp.dx = -a.cp.dx; a.cp.dy = -a.cp.dy;
    drawArrows(); saveMap(); menu.remove();
  }));
  menu.appendChild(mkbtn(
    a.bidir ? ICONS.arrowRight : ICONS.arrowBoth,
    a.bidir ? "Freccia semplice" : "Bidirezionale",
    "",
    () => { a.bidir = !a.bidir; drawArrows(); saveMap(); menu.remove(); }
  ));
  menu.appendChild(mkbtn(ICONS.close, "Elimina connessione", "danger", () => {
    dd.arrows = dd.arrows.filter((x) => x !== a);
    drawArrows(); saveMap(); menu.remove();
  }));

  document.body.appendChild(menu);
  setTimeout(() => {
    window.addEventListener("click", function close() {
      menu?.remove();
      window.removeEventListener("click", close);
    });
  }, 10);
}

// ── Color picker postit ───────────────────────────────────────────────────────
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
  none.innerHTML = ICONS.close;
  none.onclick = () => { p.color = ""; saveMap(); renderMap(); popup.remove(); };
  popup.appendChild(none);

  POSTIT_COLORS.forEach((col) => {
    const sw = document.createElement("div");
    sw.className = "color-swatch" + (p.color === col.hex ? " selected" : "");
    sw.title = col.label;
    sw.style.background = col.hex;
    sw.onclick = () => { p.color = col.hex; saveMap(); renderMap(); popup.remove(); };
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

// ── Navigazione postit ────────────────────────────────────────────────────────
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

  const startX = state.panX, startY = state.panY;
  const dx = targetX - startX, dy = targetY - startY;
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
  const idx = ((state.navIndex % dd.postits.length) + dd.postits.length) % dd.postits.length;
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
