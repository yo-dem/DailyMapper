// ── Todo List ─────────────────────────────────────────────────────────────────

let _dragTodoId     = null;
let _dragFromHandle = false;
let _placeholder    = null;

const _GRIP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="16" viewBox="0 0 12 16" fill="currentColor"><circle cx="3" cy="2"  r="1.5"/><circle cx="9" cy="2"  r="1.5"/><circle cx="3" cy="6"  r="1.5"/><circle cx="9" cy="6"  r="1.5"/><circle cx="3" cy="10" r="1.5"/><circle cx="9" cy="10" r="1.5"/><circle cx="3" cy="14" r="1.5"/><circle cx="9" cy="14" r="1.5"/></svg>`;

function _cleanupDrag(restoreItem) {
  if (restoreItem) restoreItem.style.display = "";
  _placeholder?.remove();
  _placeholder    = null;
  _dragTodoId     = null;
  _dragFromHandle = false;
}

function renderTodo() {
  const container = document.getElementById("todo-list");
  if (!container) return;
  const dd = dayData();
  if (!dd.todos) dd.todos = [];
  container.innerHTML = "";

  dd.todos.forEach((todo) => container.appendChild(_createTodoItem(todo, dd)));

  // ── Drop sul container (bubbling da qualsiasi figlio) ──────────────────────
  container.ondragover = (e) => {
    e.preventDefault();
    if (!_placeholder || _dragTodoId === null) return;
    const target = e.target.closest(".todo-item");
    if (!target || target.style.display === "none") return; // ignora item nascosto o spazio vuoto
    const rect   = target.getBoundingClientRect();
    const isTop  = e.clientY < rect.top + rect.height / 2;
    if (isTop) target.before(_placeholder);
    else       target.after(_placeholder);
  };

  container.ondrop = (e) => {
    e.preventDefault();
    if (!_placeholder || _dragTodoId === null) return;
    // Conta gli item visibili che precedono il placeholder nel DOM
    const children  = [...container.children];
    const phIdx     = children.indexOf(_placeholder);
    let   insertAt  = 0;
    for (let i = 0; i < phIdx; i++) {
      const ch = children[i];
      if (ch.classList.contains("todo-item") && ch.style.display !== "none") insertAt++;
    }
    const fromIdx = dd.todos.findIndex((t) => t.id === _dragTodoId);
    if (fromIdx === -1) { _cleanupDrag(); return; }
    const [moved] = dd.todos.splice(fromIdx, 1);
    dd.todos.splice(insertAt, 0, moved);
    _cleanupDrag();
    saveMap();
    renderTodo();
  };
}

function _createTodoItem(todo, dd) {
  const item = document.createElement("div");
  item.className = "todo-item" + (todo.checked ? " checked" : "");
  item.id = "todo-" + todo.id;
  item.draggable = true;

  // ── Drag handle ───────────────────────────────────────────────────────────
  const handle = document.createElement("div");
  handle.className = "todo-drag-handle";
  handle.innerHTML = _GRIP_SVG;
  handle.title = "Trascina per riordinare";
  handle.addEventListener("mousedown", () => { _dragFromHandle = true; });

  item.addEventListener("dragstart", (e) => {
    if (!_dragFromHandle) { e.preventDefault(); return; }
    _dragTodoId = todo.id;
    e.dataTransfer.effectAllowed = "move";
    // Crea la placeholder con la stessa altezza dell'item
    _placeholder = document.createElement("div");
    _placeholder.className = "todo-placeholder";
    _placeholder.style.height = item.offsetHeight + "px";
    item.after(_placeholder);
    // Nasconde l'item dopo che il browser ha catturato il ghost di drag
    setTimeout(() => { item.style.display = "none"; }, 0);
  });

  item.addEventListener("dragend", () => {
    // Se drop non è avvenuto (drag annullato) ripristina l'item
    if (_dragTodoId !== null) _cleanupDrag(item);
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
