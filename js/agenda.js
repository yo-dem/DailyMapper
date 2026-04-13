// ── Granularità agenda ────────────────────────────────────────────────────────
// I dati sono sempre indicizzati ogni 5 minuti (288 slot = 24h).
// La granularità cambia solo quanti slot vengono visualizzati.
const GRANULARITY_KEY = "dm_v3_agenda_granularity";
const GRANULARITY_OPTIONS = [
  { label: "1h",   minutes: 60 },
  { label: "30m",  minutes: 30 },
  { label: "15m",  minutes: 15 },
  { label: "10m",  minutes: 10 },
  { label: "5m",   minutes:  5 },
];

// Step in unità di slot (ogni slot = 5 min)
function granularityStep() {
  return state.agendaGranularity / 5;
}

// Inizializza la granularità dallo storage, default 60 min
function initAgendaGranularity() {
  if (state.agendaGranularity) return; // già inizializzata
  const saved = parseInt(localStorage.getItem(GRANULARITY_KEY) || "60");
  state.agendaGranularity = GRANULARITY_OPTIONS.some((o) => o.minutes === saved)
    ? saved
    : 60;
}

function setAgendaGranularity(minutes) {
  state.agendaGranularity = minutes;
  state.expandedHours = new Set(); // reset espansioni al cambio granularità
  localStorage.setItem(GRANULARITY_KEY, minutes);
  renderAgenda();
  scrollToCurrentTime();
}

// ── Toolbar granularità ───────────────────────────────────────────────────────
function renderGranularityToolbar() {
  const toolbar = document.getElementById("agenda-granularity-toolbar");
  if (!toolbar) return;
  toolbar.innerHTML = "";

  GRANULARITY_OPTIONS.forEach(({ label: lbl, minutes }) => {
    const btn = document.createElement("button");
    btn.className =
      "agenda-gran-btn" + (state.agendaGranularity === minutes ? " active" : "");
    btn.textContent = lbl;
    btn.onclick = () => setAgendaGranularity(minutes);
    toolbar.appendChild(btn);
  });
}

// ── Rendering agenda ──────────────────────────────────────────────────────────
function renderAgenda() {
  initAgendaGranularity();
  renderGranularityToolbar();

  // Reset espansioni se cambia giorno
  if (state.expandedHoursDay !== state.currentDay) {
    state.expandedHours = new Set();
    state.expandedHoursDay = state.currentDay;
  }

  const list = document.getElementById("agenda-list");
  if (!list) return;
  list.innerHTML = "";
  const dd = dayData();
  const step = granularityStep();

  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const isToday = state.currentDay === todayISO;
  const currentSlot = now.getHours() * 12 + Math.floor(now.getMinutes() / 5);
  // Slot sotto cui non mostrare il pulsante sveglia:
  // giorno passato → tutti i 288 slot; oggi → solo quelli prima dell'ora attuale; futuro → nessuno
  const cutoffSlot = state.currentDay < todayISO ? 288 : isToday ? currentSlot : -1;

  const handledHours = new Set();

  for (let i = 0; i < 288; i += step) {
    const h = Math.floor(i / 12);
    const isExpanded = step > 1 && state.expandedHours.has(h);

    if (isExpanded) {
      if (handledHours.has(h)) continue;
      handledHours.add(h);

      // Riga padre = lo slot :00 dell'ora, con pulsante collassa
      list.appendChild(
        _createAgendaRow(h * 12, dd, cutoffSlot, {
          isSubSlot: false,
          hour: h,
          showExpand: false,
          showCollapse: true,
        })
      );

      // Wrapper figli (slot :05 → :55)
      const wrapper = document.createElement("div");
      wrapper.className = "agenda-hour-expanded";
      wrapper.dataset.hour = h;
      for (let sub = h * 12 + 1; sub < (h + 1) * 12; sub++) {
        wrapper.appendChild(
          _createAgendaRow(sub, dd, cutoffSlot, {
            isSubSlot: true,
            hour: h,
            showExpand: false,
            showCollapse: false,
          })
        );
      }
      list.appendChild(wrapper);
    } else {
      // Solo sulle righe :00 di ogni ora viene mostrato l'expand
      const showExpand = step > 1 && i % 12 === 0;
      list.appendChild(
        _createAgendaRow(i, dd, cutoffSlot, {
          isSubSlot: false,
          hour: h,
          showExpand,
          showCollapse: false,
        })
      );
    }
  }
}

function _createAgendaRow(i, dd, cutoffSlot, opts) {
  if (!dd.agenda[i]) dd.agenda[i] = { text: "", alarm: false, snoozeUntil: null };
  const hourData = dd.agenda[i];
  const h = Math.floor(i / 12);
  const m = (i % 12) * 5;
  const timeStr = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  const isPast = i < cutoffSlot;

  const row = document.createElement("div");
  row.className = "agenda-row" + (opts.isSubSlot ? " agenda-sub-row" : "");
  row.id = "agenda-row-" + i;

  const timeSpan = document.createElement("span");
  timeSpan.className = "agenda-time";
  timeSpan.textContent = timeStr;

  const textarea = document.createElement("textarea");
  textarea.className = "agenda-input";
  textarea.placeholder = "...";
  textarea.rows = 2;
  textarea.value = hourData.text;
  textarea.oninput = (e) => {
    dd.agenda[i].text = e.target.value;
    saveMap();
  };

  row.appendChild(timeSpan);
  row.appendChild(textarea);

  if (!isPast) {
    const clock = document.createElement("button");
    clock.className = "agenda-clock-btn" + (hourData.alarm ? " active" : "");
    clock.innerHTML = ICONS.alarm;
    clock.onclick = () => {
      dd.agenda[i].alarm = !dd.agenda[i].alarm;
      dd.agenda[i].snoozeUntil = null;
      saveMap();
      renderAgenda();
    };
    row.appendChild(clock);
  }

  if (opts.showExpand) {
    const btn = document.createElement("button");
    btn.className = "agenda-expand-btn";
    btn.innerHTML = ICONS.chevronDown;
    btn.title = "Espandi ora";
    btn.onclick = () => _expandHour(opts.hour);
    row.appendChild(btn);
  } else if (opts.showCollapse) {
    const btn = document.createElement("button");
    btn.className = "agenda-expand-btn agenda-expand-btn--active";
    btn.innerHTML = ICONS.chevronUp;
    btn.title = "Comprimi ora";
    btn.onclick = () => _collapseHour(opts.hour);
    row.appendChild(btn);
  } else if (granularityStep() > 1) {
    const spacer = document.createElement("span");
    spacer.className = "agenda-expand-btn";
    spacer.style.visibility = "hidden";
    spacer.style.pointerEvents = "none";
    spacer.innerHTML = ICONS.chevronDown;
    row.appendChild(spacer);
  }

  return row;
}

function _expandHour(h) {
  state.expandedHours.add(h);
  renderAgenda();
  requestAnimationFrame(() => {
    const wrapper = document.querySelector(`.agenda-hour-expanded[data-hour="${h}"]`);
    if (!wrapper) return;
    const height = wrapper.scrollHeight;
    wrapper.style.maxHeight = "0px";
    wrapper.style.overflow = "hidden";
    requestAnimationFrame(() => {
      wrapper.style.transition = "max-height 0.35s ease-out";
      wrapper.style.maxHeight = height + "px";
      setTimeout(() => {
        wrapper.style.maxHeight = "";
        wrapper.style.overflow = "";
        wrapper.style.transition = "";
      }, 370);
    });
  });
}

function _collapseHour(h) {
  const wrapper = document.querySelector(`.agenda-hour-expanded[data-hour="${h}"]`);
  if (!wrapper) {
    state.expandedHours.delete(h);
    renderAgenda();
    return;
  }
  wrapper.style.maxHeight = wrapper.scrollHeight + "px";
  wrapper.style.overflow = "hidden";
  requestAnimationFrame(() => {
    wrapper.style.transition = "max-height 0.3s ease-in";
    wrapper.style.maxHeight = "0px";
  });
  setTimeout(() => {
    state.expandedHours.delete(h);
    renderAgenda();
  }, 320);
}

// ── Scroll all'ora corrente ───────────────────────────────────────────────────
function scrollToCurrentTime() {
  const now = new Date();
  const step = granularityStep();
  const rawIndex = now.getHours() * 12 + Math.floor(now.getMinutes() / 5);
  const snappedIndex = Math.floor(rawIndex / step) * step;
  const targetRow = document.getElementById("agenda-row-" + snappedIndex);
  if (targetRow) {
    setTimeout(() => {
      targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
      targetRow.style.transition = "background-color 0.5s";
      targetRow.style.backgroundColor = "var(--today-color)";
      setTimeout(() => (targetRow.style.backgroundColor = ""), 2000);
    }, 50);
  }
}

// ── Motore audio (Web Audio API) ──────────────────────────────────────────────
let audioCtx;
let alarmInterval;

function playAlarmSound() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();

  const playBeep = () => {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  };

  playBeep();
  alarmInterval = setInterval(playBeep, 1000);
}

function stopAlarmSound() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
}

// ── Motore allarmi (controllo ogni 10 secondi) ────────────────────────────────
// Itera sempre tutti i 288 slot a 5 min: gli allarmi funzionano
// indipendentemente dalla granularità di visualizzazione scelta.
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
  activeAlarm = { ds: dateString, index };
  const messageEl = document.getElementById("alarm-message");
  const modalEl = document.getElementById("alarm-modal");
  const displayDate = dateString === TODAY_ISO ? "Oggi" : dateString;
  const timeStr = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  messageEl.innerHTML = `<strong>Data:</strong> ${displayDate} - <strong>Ore:</strong> ${timeStr}<br><br>
                         <i>${text || "Nessun appunto inserito."}</i>`;
  modalEl.classList.remove("hidden");
  modalEl.classList.add("flashing-overlay");
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
      const step = granularityStep();
      const snappedIndex = Math.floor(index / step) * step;
      const row = document.getElementById("agenda-row-" + snappedIndex);
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
