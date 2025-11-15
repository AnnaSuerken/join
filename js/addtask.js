/***** Add Task – Subtasks, Custom-Assignee-Dropdown mit Avatar-Initialen in der Liste *****/

/* ---------- Konfiguration ---------- */
let taskCategoryColor = [
  { name: "Technical Task", color: "#20D7C1" },
  { name: "User Story", color: "#0038FF" },
];

/* ---------- Utilities ---------- */

/** HTML-escaping */
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Initialen aus Name (max 2) */
function makeInitials(name = "") {
  const parts = name.trim().split(/\s+/);
  const first = (parts[0]?.[0] || "").toUpperCase();
  const last = (parts[1]?.[0] || "").toUpperCase();
  return (first + last).slice(0, 2);
}

/** stabile Farbe (Fallback), wenn Kontakt keine Farbe hat */
function colorFromName(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return `hsl(${h} 70% 45%)`;
}

/* ---------- Subtasks ---------- */

let subtasks = [];
let editingIndex = null; // null = Add, Zahl = Edit-Index

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
  const subtaskList = document.getElementById("subtask-list");
  if (!value) return;
  subtasks.push(value);
  subtaskList.classList.add("add-scroll-bar");
  setSubtaskModeAdd();
  renderSubtasks();
}

function saveEditFromInput() {
  if (editingIndex === null) return;
  const input = document.getElementById("subtask");
  const value = input.value.trim();
  if (!value) return;
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
  const subtaskList = document.getElementById("subtask-list");
  subtasks.splice(index, 1);
  renderSubtasks();
  if (editingIndex === index) setSubtaskModeAdd();
  else if (editingIndex !== null && index < editingIndex) editingIndex -= 1;
  subtaskList.classList.remove("add-scroll-bar");
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
    if (btn.classList.contains("btn-edit")) setSubtaskModeEdit(index);
    else if (btn.classList.contains("btn-delete")) removeSubtask(index);
  });
}

/* ---------- Contacts / Custom Dropdown ---------- */

let contactsData = [];
let selectedAssignees = []; // [{ name, initials, color }]

async function getContactsData() {
  const data = await dbApi.getData(`contacts/`);
  const contactsArray = Object.values(data || {});

  contactsData = contactsArray.map((c) => ({
    name: c.name,
    initials: c.initials || makeInitials(c.name),
    color: c.color || colorFromName(c.name),
    // id: c.id,
  }));

  buildAssigneeDropdown();
  renderAssignees();
}

/** Custom „Select“: Button + Options-Liste mit Avatar-Layout */

function buildAssigneeDropdown() {
  const trigger = document.getElementById("assignee-select");
  const list = document.getElementById("assignee-options");
  if (!trigger || !list) return;

  // Optionen rendern (mit Avatar + Name)
  list.innerHTML = contactsData
    .map(
      (c, i) => `
      <li class="assignee-option" role="option" aria-selected="false" data-index="${i}">
        <span class="assignee-avatar" style="background:${escapeHtml(
          c.color
        )}">${escapeHtml(c.initials)}</span>
        <span class="assignee-option-name">${escapeHtml(c.name)}</span>
        <span class="assignee-check" aria-hidden="true">✓</span>
      </li>
    `
    )
    .join("");

  // initial Zustand
  trigger.setAttribute("aria-expanded", "false");

  // Öffnen/Schließen
  if (!trigger._listenersAdded) {
    trigger.addEventListener("click", () => {
      const isOpen = trigger.getAttribute("aria-expanded") === "true";
      if (isOpen) {
        list.classList.add("d_none");
        trigger.setAttribute("aria-expanded", "false");
      } else {
        list.classList.remove("d_none");
        trigger.setAttribute("aria-expanded", "true");
      }
    });

    document.addEventListener("click", (e) => {
      if (!trigger.contains(e.target) && !list.contains(e.target)) {
        list.classList.add("d_none");
        trigger.setAttribute("aria-expanded", "false");
      }
    });

    // Option Klick -> Toggle Auswahl
    list.addEventListener("click", (e) => {
      const item = e.target.closest(".assignee-option");
      if (!item) return;
      const idx = Number(item.dataset.index);
      toggleAssigneeByContactIndex(idx);
      // ausgewählten Zustand visuell updaten
      syncOptionSelectedStates();
    });

    trigger._listenersAdded = true;

    // visuelle Selektionsmarkierung initial
    syncOptionSelectedStates();

    function syncOptionSelectedStates() {
      const selectedNames = new Set(
        selectedAssignees.map((a) => a.name.toLowerCase())
      );
      list.querySelectorAll(".assignee-option").forEach((node) => {
        const i = Number(node.dataset.index);
        const name = (contactsData[i]?.name || "").toLowerCase();
        const isSel = selectedNames.has(name);
        node.setAttribute("aria-selected", String(isSel));
        node.classList.toggle("is-selected", isSel);
      });
    }

    // Expose intern, falls nach getContactsData() erneut gebraucht
    buildAssigneeDropdown._sync = syncOptionSelectedStates;
  }
}

/** Toggle per Index aus contactsData (aus Liste geklickt) */
function toggleAssigneeByContactIndex(contactIndex) {
  const c = contactsData[contactIndex];
  if (!c) return;

  const pos = selectedAssignees.findIndex(
    (a) => a.name.toLowerCase() === c.name.toLowerCase()
  );

  if (pos >= 0) {
    selectedAssignees.splice(pos, 1);
  } else {
    selectedAssignees.push({
      name: c.name,
      initials: c.initials,
      color: c.color,
    });
  }

  renderAssignees();
  // Selektionszustand der Liste aktualisieren (falls Funktion vorhanden)
  buildAssigneeDropdown._sync?.();
}

/** Avatare nebeneinander unter dem Feld (nur Initialen), Klick entfernt */
function renderAssignees() {
  const wrap = document.getElementById("assignee-list");
  if (!wrap) return;

  wrap.innerHTML = selectedAssignees
    .map(
      (a, i) => `
      <span
        class="assignee-avatar"
        title="${escapeHtml(a.name)}"
        style="background:${escapeHtml(a.color)}"
        onclick="toggleAssigneeByIndex(${i})"
      >
        ${escapeHtml(a.initials)}
      </span>
    `
    )
    .join("");
}

/** Entfernen per Klick auf Avatar-Chip */
function toggleAssigneeByIndex(i) {
  selectedAssignees.splice(i, 1);
  renderAssignees();
  buildAssigneeDropdown._sync?.();
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

/* ---------- Task-Erstellung ---------- */
let currentTaskColumn = "todo";

async function createTask() {
  const taskTitle = document.getElementById("task-title");
  const taskDescription = document.getElementById("task-description");
  const taskDueDate = document.getElementById("task-due-date");
  const taskCategory = document.getElementById("task-category");

  if (
    !taskTitle?.value.trim() ||
    !taskDueDate?.value ||
    taskCategory?.value === "Select task category"
  ) {
    showToast("Please enter Title, Due date and Category");
    return;
  }

  const assigneeNames = selectedAssignees.map((a) => a.name);

  const payload = {
    title: taskTitle.value,
    id: "",
    secondline: taskDescription?.value || "",
    deadline: taskDueDate.value,
    assignedContacts: assigneeNames, // Array (neu)
    assignedContact: assigneeNames.join(", "), // String (kompatibel)
    category: taskCategory?.value || "",
    categorycolor:
      taskCategoryColor.find((c) => c.name === taskCategory?.value)?.color ||
      "",
    subtask: subtasks,
    priority: currentPriority,
  };

  progressTablePush(payload, currentTaskColumn);
}

async function progressTablePush(payload, currentTaskColumn) {
  switch (currentTaskColumn) {
    case "todo":
    case "inprogress":
    case "await":
    case "done": {
      const key = await dbApi.pushData(`/board/${currentTaskColumn}`, payload);
      await dbApi.updateData(`/board/${currentTaskColumn}/${key}`, { id: key });
      showToast("Task was added.");
      clearTask();
      break;
    }
  }
}

/* ---------- Formular-Reset ---------- */

function clearTask() {
  const priorities = ["urgent", "medium", "low"];
  const titleEl = document.getElementById("task-title");
  const descEl = document.getElementById("task-description");
  const dateEl = document.getElementById("task-due-date");
  const categoryEl = document.getElementById("task-category");
  const subtaskInput = document.getElementById("subtask");
  const subtaskList = document.getElementById("subtask-list");

  if (titleEl) titleEl.value = "";
  if (descEl) descEl.value = "";
  if (dateEl) dateEl.value = "";
  if (categoryEl) categoryEl.value = "Select task category";
  if (subtaskInput) {
    subtaskInput.value = "";
    subtaskInput.placeholder = "Add new subtask";
    subtaskInput.classList.remove("is-editing");
    subtaskList.classList.remove("add-scroll-bar");
  }

  priorities.forEach((prio) => {
    document.getElementById(`prio-${prio}`)?.classList.remove("d_none");
    document.getElementById(`prio-${prio}-active`)?.classList.add("d_none");
  });

  currentPriority = null;
  subtasks = [];
  editingIndex = null;
  if (subtaskList) subtaskList.innerHTML = "";

  selectedAssignees = [];
  renderAssignees();
  buildAssigneeDropdown._sync?.();
}

/* ---------- Init ---------- */

addEventListener("load", function () {
  const dayRef = document.getElementById("task-due-date");
  if (dayRef) {
    const day = new Date();
    dayRef.min = day.toISOString().split("T")[0];
  }
  wireSubtaskEvents();
  renderSubtasks();
});

/* ---------- Exports für Inline-Handler ---------- */
window.createTask = createTask;
window.clearTask = clearTask;
window.setPriority = setPriority;
window.getContactsData = getContactsData;
window.toggleAssigneeByIndex = toggleAssigneeByIndex;
