/***** Add Task – Subtasks unten im gleichen Input bearbeiten (Enter = speichern, Esc = abbrechen) *****/

/* ---------- Konfiguration ---------- */
let taskCategoryColor = [
  { name: "Technical Task", color: "#20D7C1" },
  { name: "User Story", color: "#0038FF" },
];

/* ---------- Subtasks ---------- */
let subtasks = [];
let editingIndex = null; // null = Add-Modus, Zahl = Edit-Modus auf Index

/** HTML-escaping (falls jemand < > & usw. eingibt) */
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------- Subtask-Logik ---------- */

function setSubtaskModeEdit(i) {
  const input = document.getElementById("subtask");
  if (!input) return;
  editingIndex = i;
  input.value = subtasks[i] ?? "";
  input.placeholder = "Subtask bearbeiten – Enter speichert, Esc bricht ab";
  input.classList.add("is-editing");
  input.focus();
  input.select();
}

function setSubtaskModeAdd() {
  const input = document.getElementById("subtask");
  if (!input) return;
  editingIndex = null;
  input.value = "";
  input.placeholder = "Add new subtask";
  input.classList.remove("is-editing");
}

function addSubtaskFromInput() {
  const input = document.getElementById("subtask");
  const value = input.value.trim();
  if (!value) return;
  subtasks.push(value);
  setSubtaskModeAdd();
  renderSubtasks();
}

function saveEditFromInput() {
  if (editingIndex === null) return;
  const input = document.getElementById("subtask");
  const value = input.value.trim();
  if (!value) return; // optional: leere Eingabe nicht speichern
  subtasks[editingIndex] = value;
  setSubtaskModeAdd();
  renderSubtasks();
}

function cancelEdit() {
  setSubtaskModeAdd();
}

function renderSubtasks() {
  const list = document.getElementById("subtask-list");
  if (!list) return;

  list.innerHTML = subtasks
    .map(
      (t, i) => `
      <div class="subtask-item" data-index="${i}">
        <span class="subtask-text">${escapeHtml(t)}</span>
        <div class="subtask-actions">
          <button class="btn-edit" type="button" aria-label="Edit subtask" title="Edit">
            <img src="./assets/icons/edit.svg" alt="edit">
          </button>
          <button class="btn-delete" type="button" aria-label="Delete subtask" title="Delete">
            <img src="./assets/icons/delete.svg" alt="delete">
          </button>
        </div>
      </div>
    `
    )
    .join("");

  if (
    editingIndex !== null &&
    (editingIndex < 0 || editingIndex >= subtasks.length)
  ) {
    setSubtaskModeAdd();
  }
}

function removeSubtask(index) {
  subtasks.splice(index, 1);
  renderSubtasks();
  if (editingIndex === index) {
    setSubtaskModeAdd();
  } else if (editingIndex !== null && index < editingIndex) {
    editingIndex -= 1;
  }
}

function wireSubtaskEvents() {
  const input = document.getElementById("subtask");
  const list = document.getElementById("subtask-list");
  if (!input || !list) return;

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (editingIndex === null) addSubtaskFromInput();
      else saveEditFromInput();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (editingIndex !== null) cancelEdit();
    }
  });

  list.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const row = e.target.closest(".subtask-item");
    if (!row) return;
    const index = Number(row.dataset.index);
    if (btn.classList.contains("btn-edit")) {
      setSubtaskModeEdit(index); // unten im selben Input bearbeiten
    } else if (btn.classList.contains("btn-delete")) {
      removeSubtask(index);
    }
  });
}

addEventListener("load", function () {
  const dayRef = document.getElementById("task-due-date");
  if (dayRef) {
    const day = new Date();
    dayRef.min = day.toISOString().split("T")[0];
  }

  wireSubtaskEvents();
  renderSubtasks();
});

/* ---------- Task-Erstellung ---------- */

async function createTask() {
  const taskTitle = document.getElementById("task-title");
  const taskDescription = document.getElementById("task-description");
  const taskDueDate = document.getElementById("task-due-date");
  const taskContacts = document.getElementById("assigned-contacts");
  const taskCategory = document.getElementById("task-category");

  if (!taskTitle?.value.trim() || !taskDueDate?.value) {
    alert("Bitte Titel und Fälligkeitsdatum ausfüllen.");
    return;
  }

  const payload = {
    title: taskTitle.value,
    id: "",
    secondline: taskDescription?.value || "",
    deadline: taskDueDate.value,
    assignedContact: taskContacts?.value || "",
    category: taskCategory?.value || "",
    categorycolor:
      taskCategoryColor.find((c) => c.name === taskCategory?.value)?.color ||
      "",
    subtask: subtasks,
    priority: currentPriority,
  };

  const key = await dbApi.pushData("/board/todo", payload);
  await dbApi.updateData(`board/todo/${key}`, { id: key });

  clearTask();
}

/**
 * Formular-Reset
 */
function clearTask() {
  const priorities = ["urgent", "medium", "low"];
  const titleEl = document.getElementById("task-title");
  const descEl = document.getElementById("task-description"); // Bugfix
  const dateEl = document.getElementById("task-due-date");
  const contactsEl = document.getElementById("assigned-contacts");
  const categoryEl = document.getElementById("task-category");
  const subtaskInput = document.getElementById("subtask");
  const subtaskList = document.getElementById("subtask-list");

  if (titleEl) titleEl.value = "";
  if (descEl) descEl.value = "";
  if (dateEl) dateEl.value = "";
  if (contactsEl) contactsEl.value = "";
  if (categoryEl) categoryEl.value = "Select task category";
  if (subtaskInput) {
    subtaskInput.value = "";
    subtaskInput.placeholder = "Add new subtask";
    subtaskInput.classList.remove("is-editing");
  }

  priorities.forEach((prio) => {
    document.getElementById(`prio-${prio}`)?.classList.remove("d_none");
    document.getElementById(`prio-${prio}-active`)?.classList.add("d_none");
  });

  currentPriority = null;
  subtasks = [];
  editingIndex = null;
  if (subtaskList) subtaskList.innerHTML = "";
}

/* ---------- Priority ---------- */

let currentPriority = null;

function setPriority(status) {
  const priorities = ["urgent", "medium", "low"];

  if (currentPriority === status) {
    priorities.forEach((prio) => {
      document.getElementById(`prio-${prio}`)?.classList.remove("d_none");
      document.getElementById(`prio-${prio}-active`)?.classList.add("d_none");
    });
    currentPriority = null;
    return;
  }

  priorities.forEach((prio) => {
    document.getElementById(`prio-${prio}`)?.classList.remove("d_none");
    document.getElementById(`prio-${prio}-active`)?.classList.add("d_none");
  });

  document.getElementById(`prio-${status}`)?.classList.add("d_none");
  document.getElementById(`prio-${status}-active`)?.classList.remove("d_none");

  currentPriority = status;
}

/* ---------- Contacts (Firebase) ---------- */
let contactsData = [];

async function getContactsData() {
  const data = await dbApi.getData(`contacts/`);
  const contactsArray = Object.values(data || {});

  contactsData = contactsArray.map((c) => ({
    initials: c.initials,
    name: c.name,
  }));

  assignToTemplate();
}

function assignToTemplate() {
  const contentRef = document.getElementById("assigned-contacts");
  if (!contentRef) return;
  contentRef.innerHTML = "";
  for (let i = 0; i < contactsData.length; i++) {
    contentRef.innerHTML += getAssignToTemplate(i);
  }
}

function getAssignToTemplate(i) {
  return `<option>${contactsData[i].name}</option>`;
}

/* ---------- Exports in globalem Scope (für inline-Handler in HTML) ---------- */
window.createTask = createTask;
window.clearTask = clearTask;
window.setPriority = setPriority;
window.getContactsData = getContactsData;
