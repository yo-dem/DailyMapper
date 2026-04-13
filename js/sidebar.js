// ── Larghezza sidebar ─────────────────────────────────────────────────────────
let sidebarWidth = parseInt(localStorage.getItem(SIDEBAR_KEY) || "320");

const SIDEBAR_COLLAPSE_BREAKPOINT = 700; // px
let _autoCollapsed = false;
let _savedWidthBeforeCollapse = 320;

function _autoCollapseSidebar() {
  if (window.innerWidth < SIDEBAR_COLLAPSE_BREAKPOINT && sidebarWidth > 0) {
    _savedWidthBeforeCollapse = sidebarWidth;
    _autoCollapsed = true;
    sidebarWidth = 0;
    document.getElementById("sidebar").style.width = "0px";
    updateSidebarContentVisibility();
    // non salviamo in localStorage: è un collapse automatico, non scelta utente
  } else if (window.innerWidth >= SIDEBAR_COLLAPSE_BREAKPOINT && _autoCollapsed) {
    _autoCollapsed = false;
    sidebarWidth = _savedWidthBeforeCollapse;
    document.getElementById("sidebar").style.width = sidebarWidth + "px";
    updateSidebarContentVisibility();
  }
}

function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  const expander = document.getElementById("sidebar-expander");

  sidebar.style.width = sidebarWidth + "px";
  updateSidebarContentVisibility();
  _autoCollapseSidebar();

  window.addEventListener("resize", _autoCollapseSidebar);

  expander.addEventListener("click", () => {
    const sidebar = document.getElementById("sidebar");
    if (sidebarWidth > 60) {
      sidebarWidth = 0;
      sidebar.style.width = "0px";
    } else {
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
    "#sidebar .month-nav, #sidebar .btn-oggi, #sidebar #days-list"
  );

  if (sidebarWidth === 0) {
    sidebar.style.display = "flex";
    sidebar.style.borderRightColor = "transparent";
    expander.style.left = "0px";
    contentElements.forEach((el) => {
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
    });
  } else {
    sidebar.style.display = "flex";
    sidebar.style.borderRightColor = "var(--md-border)";
    expander.style.left = sidebarWidth + "px";
    contentElements.forEach((el) => {
      el.style.opacity = "1";
      el.style.pointerEvents = "auto";
    });
  }
}

// ── Navigazione mesi e giorni ─────────────────────────────────────────────────
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

// ── Lista giorni ──────────────────────────────────────────────────────────────
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
    const hasAgenda = dd && dd.agenda && Object.values(dd.agenda).some(
      (slot) => (slot.text && slot.text.trim().length > 0) || slot.alarm
    );
    const hasTodo = dd && dd.todos && dd.todos.length > 0;

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
        switchView("editor", document.querySelector('.nav-tab[onclick*="editor"]'));
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
        requestAnimationFrame(() => {
          const dd = dayData();
          if (dd.postits && dd.postits.length > 0) {
            centerOnPostit(dd.postits[0], false);
          }
        });
      };
      indicators.appendChild(mapDot);
    }

    if (hasAgenda) {
      const agendaDot = document.createElement("span");
      agendaDot.className = "day-dot has-agenda";
      agendaDot.title = "Clicca per vedere l'agenda";
      agendaDot.onclick = (e) => {
        e.stopPropagation();
        state.currentDay = ds;
        renderDays(false);
        loadDay();
        switchView("agenda", document.querySelector('.nav-tab[onclick*="agenda"]'));
      };
      indicators.appendChild(agendaDot);
    }

    if (hasTodo) {
      const todoDot = document.createElement("span");
      todoDot.className = "day-dot has-todo";
      todoDot.title = "Clicca per vedere i todo";
      todoDot.onclick = (e) => {
        e.stopPropagation();
        state.currentDay = ds;
        renderDays(false);
        loadDay();
        switchView("todo", document.querySelector('.nav-tab[onclick*="todo"]'));
      };
      indicators.appendChild(todoDot);
    }

    const dayNum = document.createElement("span");
    dayNum.className = "day-num";
    dayNum.textContent = i;

    const dayName = document.createElement("span");
    dayName.style.cssText = col;
    dayName.textContent = new Date(y, m, i).toLocaleString("it-IT", {
      weekday: "short",
    });

    item.appendChild(dayNum);
    item.appendChild(dayName);
    item.appendChild(indicators);

    item.onclick = (e) => {
      const now = Date.now();
      const last = state.lastTapTime || 0;
      const lastDay = state.lastTapDay || "";
      const isDoubleTap = now - last < 300 && lastDay === ds;
      state.lastTapTime = now;
      state.lastTapDay = ds;
      state.currentDay = ds;
      renderDays(false);
      loadDay();
      if (isDoubleTap) {
        const tabAgenda = document.querySelector('.nav-tab[onclick*="agenda"]');
        switchView("agenda", tabAgenda);
      }
    };

    list.appendChild(item);
    if (ds === state.currentDay) activeEl = item;
  }

  if (scrollToActive && activeEl) {
    setTimeout(
      () => activeEl.scrollIntoView({ behavior: "smooth", block: "center" }),
      10
    );
  }
}

// ── Modal selezione data ──────────────────────────────────────────────────────
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
    if (isoDate === state.currentDay) cell.classList.add("selected");
    if (isoDate === TODAY_ISO) cell.classList.add("today");
    cell.onclick = () => selectModalDate(isoDate);
    grid.appendChild(cell);
  }
}
