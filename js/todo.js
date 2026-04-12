// ── Todo List ─────────────────────────────────────────────────────────────────

function renderTodo() {
  const container = document.getElementById("todo-list");
  if (!container) return;
  const dd = dayData();
  if (!dd.todos) dd.todos = [];
  container.innerHTML = "";

  dd.todos.forEach((todo) => {
    container.appendChild(_createTodoItem(todo, dd));
  });
}

function _createTodoItem(todo, dd) {
  const item = document.createElement("div");
  item.className = "todo-item" + (todo.checked ? " checked" : "");
  item.id = "todo-" + todo.id;

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
  textarea.placeholder = "Nota...";
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
  copyBtn.innerHTML = "📅";
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
