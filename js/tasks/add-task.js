// js/tasks/add-task.js

/* ---------- Konfiguration ---------- */
let taskCategoryColor = [
  { name: "Technical Task", color: "#20D7C1" },
  { name: "User Story", color: "#0038FF" },
];

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function makeInitials(name = "") {
  const parts = name.trim().split(/\s+/);
  const first = (parts[0]?.[0] || "").toUpperCase();
  const last = (parts[1]?.[0] || "").toUpperCase();
  return (first + last).slice(0, 2);
}

function colorFromName(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h} 70% 45%)`;
}

/* ---------- Subtasks ---------- */

let subtasks = [];
let editingIndex = null;

function setSubtaskModeEdit(i) {
  const input = document.getElementById("subtask");
  if (!input) return;

  editingIndex = i;
  input.value = subtasks[i] ?? "";
  input.placeholder = "Subtask bearbeiten – Enter speichert, Esc bricht ab";
  input.classList.add("is-editing");
  focusAndToggleAddButton(input);
}

function focusAndToggleAddButton(input) {
  input.focus();
  input.select();
  const addBtn = document.getElementById("subtask-add-btn");
  if (!addBtn) return;
  const hasValue = input.value.trim().length > 0;
  addBtn.classList.toggle("d_none", !hasValue);
}

function setSubtaskModeAdd() {
  const input = document.getElementById("subtask");
  if (!input) return;

  editingIndex = null;
  input.value = "";
  input.placeholder = "Add new subtask";
  input.classList.remove("is-editing");
  hideSubtaskAddButton();
}

function hideSubtaskAddButton() {
  const addBtn = document.getElementById("subtask-add-btn");
  if (addBtn) addBtn.classList.add("d_none");
}

function addSubtaskFromInput() {
  const input = document.getElementById("subtask");
  const list = document.getElementById("subtask-list");
  if (!input || !list) return;

  const value = input.value.trim();
  if (!value) return;

  subtasks.push(value);
  list.classList.add("add-scroll-bar");
  setSubtaskModeAdd();
  renderSubtasks();
}

function saveEditFromInput() {
  if (editingIndex === null) return;

  const input = document.getElementById("subtask");
  if (!input) return;
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

  list.innerHTML = subtasks.map((t, i) => buildSubtaskHtml(t, i)).join("");

  if (editingIndex !== null && editingIndex >= subtasks.length) {
    setSubtaskModeAdd();
  }
}

function buildSubtaskHtml(text, index) {
  return `
    <div class="subtask-item" data-index="${index}">
      <span class="subtask-text">${escapeHtml(text)}</span>
      <div class="subtask-actions">
        <button class="btn-edit" type="button" aria-label="Edit subtask" title="Edit">
          <img src="./assets/icons/edit.svg" alt="edit">
        </button>
        <button class="btn-delete" type="button" aria-label="Delete subtask" title="Delete">
          <img src="./assets/icons/delete.svg" alt="delete">
        </button>
      </div>
    </div>
  `;
}

function removeSubtask(index) {
  const list = document.getElementById("subtask-list");
  subtasks.splice(index, 1);
  renderSubtasks();
  adjustEditingIndexAfterRemoval(index);
  list?.classList.remove("add-scroll-bar");
}

function adjustEditingIndexAfterRemoval(index) {
  if (editingIndex === index) {
    setSubtaskModeAdd();
  } else if (editingIndex !== null && index < editingIndex) {
    editingIndex -= 1;
  }
}

function wireSubtaskEvents() {
  const input = document.getElementById("subtask");
  const list = document.getElementById("subtask-list");
  const addBtn = document.getElementById("subtask-add-btn");
  if (!input || !list) return;

  input.addEventListener("input", () => toggleSubtaskAddButton(input, addBtn));
  input.addEventListener("keydown", handleSubtaskKeydown);
  wireSubtaskAddButton(addBtn);
  wireSubtaskListClick(list);
}

function toggleSubtaskAddButton(input, addBtn) {
  if (!addBtn) return;
  const hasValue = input.value.trim().length > 0;
  addBtn.classList.toggle("d_none", !hasValue);
}

function handleSubtaskKeydown(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    if (editingIndex === null) addSubtaskFromInput();
    else saveEditFromInput();
  } else if (e.key === "Escape") {
    e.preventDefault();
    if (editingIndex !== null) cancelEdit();
  }
}

function wireSubtaskAddButton(addBtn) {
  if (!addBtn || addBtn._wired) return;
  addBtn.addEventListener("click", () => {
    if (editingIndex === null) addSubtaskFromInput();
    else saveEditFromInput();
  });
  addBtn._wired = true;
}

function wireSubtaskListClick(list) {
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
let selectedAssignees = [];

async function getContactsData() {
  const data = await dbApi.getData("contacts/");
  const contactsArray = Object.values(data || {});

  contactsData = contactsArray.map((c) => ({
    name: c.name,
    initials: c.initials || makeInitials(c.name),
    color: c.color || colorFromName(c.name),
  }));

  buildAssigneeDropdown();
  renderAssignees();
}

function buildAssigneeDropdown() {
  const trigger = document.getElementById("assignee-select");
  const list = document.getElementById("assignee-options");
  if (!trigger || !list) return;

  list.innerHTML = contactsData.map(buildAssigneeOptionHtml).join("");
  trigger.setAttribute("aria-expanded", "false");
  if (!trigger._listenersAdded) {
    wireAssigneeDropdown(trigger, list);
    trigger._listenersAdded = true;
  }
  syncOptionSelectedStates();
  buildAssigneeDropdown._sync = syncOptionSelectedStates;
}

function buildAssigneeOptionHtml(c, i) {
  return `
    <li class="assignee-option" role="option" aria-selected="false" data-index="${i}">
      <span class="assignee-avatar" style="background:${escapeHtml(
        c.color
      )}">${escapeHtml(c.initials)}</span>
      <span class="assignee-option-name">${escapeHtml(c.name)}</span>
      <span class="assignee-check" aria-hidden="true">✓</span>
    </li>
  `;
}

function wireAssigneeDropdown(trigger, list) {
  trigger.addEventListener("click", () => toggleAssigneeList(trigger, list));
  document.addEventListener("click", (e) =>
    closeAssigneeListOnOutsideClick(e, trigger, list)
  );
  list.addEventListener("click", (e) => handleAssigneeListClick(e));
}

function toggleAssigneeList(trigger, list) {
  const isOpen = trigger.getAttribute("aria-expanded") === "true";
  list.classList.toggle("d_none", isOpen);
  trigger.setAttribute("aria-expanded", isOpen ? "false" : "true");
}

function closeAssigneeListOnOutsideClick(e, trigger, list) {
  if (!trigger.contains(e.target) && !list.contains(e.target)) {
    list.classList.add("d_none");
    trigger.setAttribute("aria-expanded", "false");
  }
}

function handleAssigneeListClick(e) {
  const item = e.target.closest(".assignee-option");
  if (!item) return;
  const idx = Number(item.dataset.index);
  toggleAssigneeByContactIndex(idx);
  syncOptionSelectedStates();
}

function syncOptionSelectedStates() {
  const list = document.getElementById("assignee-options");
  if (!list) return;

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

function toggleAssigneeByContactIndex(contactIndex) {
  const c = contactsData[contactIndex];
  if (!c) return;

  const pos = selectedAssignees.findIndex(
    (a) => a.name.toLowerCase() === c.name.toLowerCase()
  );

  if (pos >= 0) selectedAssignees.splice(pos, 1);
  else
    selectedAssignees.push({
      name: c.name,
      initials: c.initials,
      color: c.color,
    });

  renderAssignees();
  buildAssigneeDropdown._sync?.();
}

function renderAssignees() {
  const wrap = document.getElementById("assignee-list");
  if (!wrap) return;

  wrap.innerHTML = selectedAssignees
    .map((a, i) => buildAssigneeAvatarHtml(a, i))
    .join("");
}

function buildAssigneeAvatarHtml(a, i) {
  return `
    <span
      class="assignee-avatar"
      title="${escapeHtml(a.name)}"
      style="background:${escapeHtml(a.color)}"
      onclick="toggleAssigneeByIndex(${i})"
    >
      ${escapeHtml(a.initials)}
    </span>
  `;
}

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
    resetAllPriorities(priorities);
    currentPriority = null;
    return;
  }

  resetAllPriorities(priorities);
  activateSelectedPriority(status);
  currentPriority = status;
}

function resetAllPriorities(priorities) {
  priorities.forEach((priority) => {
    document.getElementById(`prio-${priority}`)?.classList.remove("d_none");
    document.getElementById(`prio-${priority}-active`)?.classList.add("d_none");
  });
}

function activateSelectedPriority(status) {
  document.getElementById(`prio-${status}`)?.classList.add("d_none");
  document.getElementById(`prio-${status}-active`)?.classList.remove("d_none");
}

/* ---------- Edit-Priority im Overlay ---------- */

function setEditPriority(status) {
  currentPriority = status;
  const priorities = ["urgent", "medium", "low"];

  priorities.forEach((prio) => {
    const btn = document.getElementById(`edit-prio-${prio}`);
    if (!btn) return;
    btn.classList.toggle("is-active", prio === status);
  });
}

function wireEditPriorityButtons() {
  const config = [
    { id: "edit-prio-urgent", status: "urgent" },
    { id: "edit-prio-medium", status: "medium" },
    { id: "edit-prio-low", status: "low" },
  ];

  config.forEach(({ id, status }) => {
    const btn = document.getElementById(id);
    if (!btn || btn._wired) return;

    btn.addEventListener("click", () => toggleEditPriority(status, config));
    btn._wired = true;
  });
}

function toggleEditPriority(status, config) {
  if (currentPriority === status) {
    currentPriority = null;
    config.forEach(({ id }) => {
      const b = document.getElementById(id);
      if (b) b.classList.remove("is-active");
    });
  } else {
    setEditPriority(status);
  }
}

/* ---------- Task erstellen ---------- */

function getAssigneeNames() {
  return selectedAssignees.map((assignee) => assignee.name);
}

function createPayload(formElements, assigneeNames) {
  return {
    title: formElements.taskTitle.value,
    id: "",
    secondline: formElements.taskDescription?.value || "",
    deadline: formElements.taskDueDate.value,
    assignedContacts: assigneeNames,
    assignedContact: assigneeNames.join(", "),
    category: formElements.taskCategory?.value || "",
    categorycolor:
      taskCategoryColor.find((c) => c.name === formElements.taskCategory?.value)
        ?.color || "",
    subtask: subtasks,
    priority: currentPriority,
  };
}

async function progressTablePush(payload, currentTaskColumn, form) {
  switch (currentTaskColumn) {
    case "todo":
    case "inprogress":
    case "await":
    case "done": {
      const key = await dbApi.pushData(`/board/${currentTaskColumn}`, payload);
      await dbApi.updateData(`/board/${currentTaskColumn}/${key}`, { id: key });
      showToast("Task was added.");
      clearTask(form);
      break;
    }
  }
}

async function createTask(form) {
  if (!setMandatoryInputs(form)) return;

  const formElements = getTaskFormElements(form);
  const assigneeNames = getAssigneeNames();
  const payload = createPayload(formElements, assigneeNames);

  progressTablePush(payload, currentTaskColumn || "todo", form);
  clearTask(form);
}

/* ---------- Form-Reset ---------- */

function resetTaskInputs(
  taskTitle,
  taskDescription,
  taskDueDate,
  taskCategory
) {
  if (taskTitle) taskTitle.value = "";
  if (taskDescription) taskDescription.value = "";
  if (taskDueDate) taskDueDate.value = "";
  if (taskCategory) taskCategory.value = "Select task category";
}

function resetSubtaskFields(subtaskInput, subtaskList, addBtn) {
  if (subtaskInput) {
    subtaskInput.value = "";
    subtaskInput.placeholder = "Add new subtask";
    subtaskInput.classList.remove("is-editing");
  }
  if (subtaskList) {
    subtaskList.innerHTML = "";
    subtaskList.classList.remove("add-scroll-bar");
  }
  if (addBtn) addBtn.classList.add("d_none");
}

function resetGlobalArrays() {
  currentPriority = null;
  subtasks = [];
  editingIndex = null;
  selectedAssignees = [];
  renderAssignees();
  buildAssigneeDropdown._sync?.();
  ["urgent", "medium", "low"].forEach((prio) => {
    document.getElementById(`edit-prio-${prio}`)?.classList.remove("is-active");
  });
}

function clearTask(form) {
  if (!form) return;

  const { taskTitle, taskDescription, taskDueDate, taskCategory } =
    getTaskFormElements(form);
  const subtaskInput = document.getElementById("subtask");
  const subtaskList = document.getElementById("subtask-list");
  const addBtn = document.getElementById("subtask-add-btn");

  clearAddTaskErrors(form);
  resetTaskInputs(taskTitle, taskDescription, taskDueDate, taskCategory);
  resetSubtaskFields(subtaskInput, subtaskList, addBtn);
  resetAllPriorities(["urgent", "medium", "low"]);
  resetGlobalArrays();
}

/* ---------- Init ---------- */

addEventListener("load", () => {
  const dayRef = document.querySelector(".task-due-date");
  if (dayRef) {
    const day = new Date();
    dayRef.min = day.toISOString().split("T")[0];
  }
  wireSubtaskEvents();
  renderSubtasks();
  wireEditPriorityButtons();
});

/* ---------- Exports für Inline-Handler ---------- */
window.currentTaskColumn = window.currentTaskColumn || "todo";
window.createTask = createTask;
window.clearTask = clearTask;
window.setPriority = setPriority;
window.getContactsData = getContactsData;
window.toggleAssigneeByIndex = toggleAssigneeByIndex;
