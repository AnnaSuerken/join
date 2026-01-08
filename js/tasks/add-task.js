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
      <span class="assignee-indicator"></span>
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

// ✅ konsistent: null statt "null" string
let currentPriority = null;

function setPriority(status) {
  const priorities = ["urgent", "medium", "low"];

  // Toggle off
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

// (Dein UI-Startzustand – ich lasse deine Logik drin)
function resetStartPriorities() {
  document.getElementById("prio-low")?.classList.remove("d_none");
  document.getElementById("prio-urgent")?.classList.remove("d_none");
  document.getElementById("prio-medium")?.classList.add("d_none");
  document.getElementById("prio-urgent-active")?.classList.add("d_none");
  document.getElementById("prio-low-active")?.classList.add("d_none");
  document.getElementById("prio-medium-active")?.classList.remove("d_none");
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
    id: "", // wird nach push auf key gesetzt
    secondline: formElements.taskDescription?.value || "",
    deadline: formElements.taskDueDate.value,
    assignedContacts: assigneeNames,
    assignedContact: assigneeNames.join(", "),
    category: formElements.taskCategory?.value || "",
    categorycolor:
      taskCategoryColor.find((c) => c.name === formElements.taskCategory?.value)
        ?.color || "",
    subtask: subtasks,
    priority: currentPriority || "low", // ✅ niemals null in DB, falls du Icons erwartest
  };
}

async function progressTablePush(payload, col, form) {
  switch (col) {
    case "todo":
    case "inprogress":
    case "await":
    case "done": {
      const key = await dbApi.pushData(`/board/${col}`, payload);
      await dbApi.updateData(`/board/${col}/${key}`, { id: key });

      showToast("Task was added.");
      clearTask(form);
      return key;
    }
    default:
      console.warn("Unknown column:", col);
      return null;
  }
}

async function createTask(form) {
  if (!setMandatoryInputs(form)) return;

  const formElements = getTaskFormElements(form);
  const assigneeNames = getAssigneeNames();
  const payload = createPayload(formElements, assigneeNames);

  const col = window.currentTaskColumn || "todo";

  await progressTablePush(payload, col, form);

  if (window.location.pathname.endsWith("board.html")) {
    document.getElementById("close-btn")?.click();
  } else {
    setTimeout(() => {
      window.location.href = "/board.html";
    }, 1000);
  }
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
  resetStartPriorities();
  resetGlobalArrays();
}

/* ---------- ✅ Task Detail Overlay Animation ---------- */

function openTaskDetailOverlay() {
  const overlay = document.getElementById("task-detail-overlay");
  if (!overlay) return;

  overlay.classList.remove("d_none", "is-closing");
  overlay.classList.add("task-detail-overlay");
  overlay.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => {
    overlay.classList.add("is-open");
  });
}

function closeTaskDetailOverlay() {
  const overlay = document.getElementById("task-detail-overlay");
  if (!overlay) return;

  overlay.classList.remove("is-open");
  overlay.classList.add("is-closing");
  overlay.setAttribute("aria-hidden", "true");

  const panel = overlay.querySelector(".task-overlay-open");
  if (!panel) {
    overlay.classList.add("d_none");
    overlay.classList.remove("is-closing");
    return;
  }

  const onEnd = (e) => {
    if (e.propertyName !== "transform") return;
    panel.removeEventListener("transitionend", onEnd);

    overlay.classList.add("d_none");
    overlay.classList.remove("is-closing");
  };

  panel.addEventListener("transitionend", onEnd);
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

  // Close Button + Backdrop Click
  const overlay = document.getElementById("task-detail-overlay");
  const closeBtn = document.getElementById("detail-close-btn");

  closeBtn?.addEventListener("click", closeTaskDetailOverlay);

  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) closeTaskDetailOverlay();
  });
});

/* ---------- Exports für Inline-Handler ---------- */
window.currentTaskColumn = window.currentTaskColumn || "todo";
window.createTask = createTask;
window.clearTask = clearTask;
window.setPriority = setPriority;
window.getContactsData = getContactsData;
window.toggleAssigneeByIndex = toggleAssigneeByIndex;

// Exports für Detail Overlay (für board.js)
window.openTaskDetailOverlay = openTaskDetailOverlay;
window.closeTaskDetailOverlay = closeTaskDetailOverlay;
