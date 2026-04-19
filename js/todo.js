// ── Todo List ─────────────────────────────────────────────────────────────────

const _GRIP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="16" viewBox="0 0 12 16" fill="currentColor"><circle cx="3" cy="2"  r="1.5"/><circle cx="9" cy="2"  r="1.5"/><circle cx="3" cy="6"  r="1.5"/><circle cx="9" cy="6"  r="1.5"/><circle cx="3" cy="10" r="1.5"/><circle cx="9" cy="10" r="1.5"/><circle cx="3" cy="14" r="1.5"/><circle cx="9" cy="14" r="1.5"/></svg>`;

function renderTodo() {
  const container = document.getElementById("todo-list");
  if (!container) return;
  const dd = dayData();
  if (!dd.todos) dd.todos = [];
  container.innerHTML = "";
  dd.todos.forEach((todo) => container.appendChild(_createTodoItem(todo, dd)));
}

function _createTodoItem(todo, dd) {
  const item = document.createElement("div");
  item.className = "todo-item" + (todo.checked ? " checked" : "");
  item.id = "todo-" + todo.id;

  // ── Drag handle (pointer-based: funziona su mouse e touch) ───────────────
  const handle = document.createElement("div");
  handle.className = "todo-drag-handle";
  handle.innerHTML = _GRIP_SVG;
  handle.title = "Trascina per riordinare";
  handle.style.touchAction = "none";

  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);

    const list = document.getElementById("todo-list");
    const itemRect = item.getBoundingClientRect();
    const startY = e.clientY;

    // Ghost che segue il dito / cursore
    const ghost = document.createElement("div");
    ghost.className = "todo-item";
    ghost.style.cssText = `position:fixed;left:${itemRect.left}px;top:${itemRect.top}px;width:${itemRect.width}px;` +
      `opacity:0.85;pointer-events:none;z-index:9999;` +
      `box-shadow:0 8px 24px rgba(0,0,0,0.2);transform:rotate(1.5deg) scale(1.02);transition:none;` +
      `border:2px solid var(--md-primary);background:var(--md-surface);border-radius:12px;padding:14px 16px;`;
    ghost.innerHTML = item.innerHTML;
    document.body.appendChild(ghost);

    // Placeholder nel posto originale
    const placeholder = document.createElement("div");
    placeholder.className = "todo-placeholder";
    placeholder.style.height = itemRect.height + "px";
    item.before(placeholder);
    item.style.opacity = "0";

    const onMove = (me) => {
      ghost.style.top = (itemRect.top + me.clientY - startY) + "px";
      // Sposta il placeholder nella posizione corretta
      const siblings = [...list.querySelectorAll(".todo-item")].filter(it => it !== item);
      let before = null;
      for (const sib of siblings) {
        const r = sib.getBoundingClientRect();
        if (me.clientY < r.top + r.height / 2) { before = sib; break; }
      }
      if (before) before.before(placeholder);
      else list.appendChild(placeholder);
    };

    const onUp = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onCancel);
      ghost.remove();

      // Calcola indice d'inserimento dalla posizione del placeholder nel DOM
      const children = [...list.children];
      const phIdx = children.indexOf(placeholder);
      let insertAt = 0;
      for (let i = 0; i < phIdx; i++) {
        if (children[i].classList.contains("todo-item")) insertAt++;
      }
      placeholder.remove();
      item.style.opacity = "";

      const fromIdx = dd.todos.findIndex(t => t.id === todo.id);
      if (fromIdx !== -1 && fromIdx !== insertAt) {
        const [moved] = dd.todos.splice(fromIdx, 1);
        if (fromIdx < insertAt) insertAt--;
        dd.todos.splice(insertAt, 0, moved);
        saveMap();
      }
      renderTodo();
    };

    const onCancel = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onCancel);
      ghost.remove();
      placeholder.remove();
      item.style.opacity = "";
      renderTodo();
    };

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onCancel);
  });

  // ── Checkbox ──────────────────────────────────────────────────────────────
  const checkbox = document.createElement("div");
  checkbox.className = "todo-checkbox" + (todo.checked ? " active" : "");
  checkbox.title = todo.checked ? "Segna come non completato" : "Segna come completato";
  checkbox.onclick = () => {
    todo.checked = !todo.checked;
    saveMap();
    renderTodo();
    renderDays(false);
  };

  // ── Textarea (2 righe) ────────────────────────────────────────────────────
  const textarea = document.createElement("textarea");
  textarea.className = "todo-textarea";
  textarea.placeholder = "Aggiungi...";
  textarea.rows = 2;
  textarea.value = todo.text;
  textarea.oninput = (e) => {
    todo.text = e.target.value;
    saveMap();
    renderDays(false);
  };

  // ── Time picker ───────────────────────────────────────────────────────────
  const timePicker = document.createElement("input");
  timePicker.type = "time";
  timePicker.className = "todo-time";
  timePicker.value = todo.time || "";
  timePicker.title = "Orario (opzionale)";
  timePicker.onchange = (e) => {
    todo.time = e.target.value;
    saveMap();
  };

  // ── Copia in Agenda ───────────────────────────────────────────────────────
  const copyBtn = document.createElement("button");
  copyBtn.className = "todo-copy-btn";
  copyBtn.title = "Copia in Agenda con allarme";
  copyBtn.innerHTML = ICONS.calendar;
  copyBtn.onclick = () => _copyTodoToAgenda(todo);

  // ── Pulsante elimina ──────────────────────────────────────────────────────
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "todo-delete-btn";
  deleteBtn.innerHTML = "−";
  deleteBtn.title = "Elimina todo";
  deleteBtn.onclick = () => {
    dd.todos = dd.todos.filter((t) => t.id !== todo.id);
    saveMap();
    renderTodo();
    renderDays(false);
  };

  item.appendChild(handle);
  item.appendChild(checkbox);
  item.appendChild(textarea);
  item.appendChild(timePicker);
  item.appendChild(copyBtn);
  item.appendChild(deleteBtn);

  return item;
}

// ── Aggiungi un nuovo todo ────────────────────────────────────────────────────
function addTodo() {
  const dd = dayData();
  if (!dd.todos) dd.todos = [];
  dd.todos.push({
    id: Date.now(),
    text: "",
    checked: false,
    time: "",
  });
  saveMap();
  renderTodo();
  renderDays(false);

  // Metti il focus sull'ultima textarea aggiunta
  requestAnimationFrame(() => {
    const items = document.querySelectorAll(".todo-textarea");
    if (items.length > 0) items[items.length - 1].focus();
  });
}

// ── Copia todo → Agenda con allarme ──────────────────────────────────────────
function _copyTodoToAgenda(todo) {
  if (!todo.time) {
    showToast("Imposta prima un orario!");
    return;
  }
  const [h, m] = todo.time.split(":").map(Number);
  // Arrotonda ai 5 minuti più vicini (matching granularità agenda)
  const roundedM = Math.round(m / 5) * 5 >= 60 ? 55 : Math.round(m / 5) * 5;
  const slotIndex = h * 12 + Math.floor(roundedM / 5);

  const dd = dayData();
  if (!dd.agenda) dd.agenda = {};
  if (!dd.agenda[slotIndex]) {
    dd.agenda[slotIndex] = { text: "", alarm: false, snoozeUntil: null };
  }
  dd.agenda[slotIndex].text = todo.text;
  dd.agenda[slotIndex].alarm = true;
  saveMap();

  const timeLabel =
    String(h).padStart(2, "0") + ":" + String(roundedM).padStart(2, "0");
  showToast("✓ Copiato in Agenda con allarme alle " + timeLabel);
}
