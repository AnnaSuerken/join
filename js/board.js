// js/board.js
import { db, dbApi } from "./firebase.js";
import { requireAuth } from "./authguard.js";
await requireAuth({ redirectTo: "/login.html" });

const TASKS_ROOT = "/board";
const CONTACTS_ROOT = "/contacts";
const COLS = ["todo", "inprogress", "await", "done"];

/* ---------- UI: Add-Task öffnen/schließen ---------- */
document.querySelectorAll(".open-add-task-overlay").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.getElementById("add-task-overlay")?.classList.remove("d_none");
    document.body.classList.add("no-scroll");
    getContactsData?.();
    clearTask?.();
    if (btn.dataset.column) currentTaskColumn = btn.dataset.column;
  });
});

const closeButton = document.getElementById("close-btn");
closeButton?.addEventListener("click", () => {
  document.getElementById("add-task-overlay")?.classList.add("d_none");
  document.body.classList.remove("no-scroll");
  currentTaskColumn = "todo";
});

/* ---------- DOM-Referenzen ---------- */
const colsEl = {
  todo: document.getElementById("task-table-todo"),
  inprogress: document.getElementById("task-table-progress"),
  await: document.getElementById("task-table-feedback"),
  done: document.getElementById("task-table-done"),
};
const searchInput = document.getElementById("task-search");

/* ---------- State ---------- */
let data = { todo: {}, inprogress: {}, await: {}, done: {} };

// Kontakte-Indizes
let contactsById = new Map();
let contactIdByName = new Map();
let contactIdByEmail = new Map();

/* ---------- Live-Listener ---------- */
dbApi.onData(TASKS_ROOT, (val) => {
  data = {
    todo: val?.todo || {},
    inprogress: val?.inprogress || {},
    await: val?.await || {},
    done: val?.done || {},
  };
  render();
});

dbApi.onData(CONTACTS_ROOT, (val) => {
  contactsById = new Map();
  contactIdByName = new Map();
  contactIdByEmail = new Map();

  if (val && typeof val === "object") {
    for (const [id, c] of Object.entries(val)) {
      const contact = {
        id,
        name: c?.name ?? "",
        initials: c?.initials ?? "?",
        color: c?.color ?? "#999",
        email: c?.email ?? "",
        phone: c?.phone ?? "",
      };
      contactsById.set(id, contact);
      if (contact.name) contactIdByName.set(contact.name.toLowerCase(), id);
      if (contact.email) contactIdByEmail.set(contact.email.toLowerCase(), id);
    }
  }
  render();
});

/* ---------- Render Board ---------- */
function render() {
  COLS.forEach((c) => (colsEl[c].innerHTML = ""));
  const filter = (searchInput?.value || "").trim().toLowerCase();

  for (const c of COLS) {
    const list = Object.values(data[c] || {});
    list
      .filter((t) => {
        if (!filter) return true;
        return (
          (t.title || "").toLowerCase().includes(filter) ||
          (t.secondline || "").toLowerCase().includes(filter)
        );
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .forEach((t) => colsEl[c].appendChild(taskCard(t)));
  }
}
searchInput?.addEventListener("input", render);

/* ---------- Task-Karte ---------- */
function taskCard(task) {
  let completed = Number.isFinite(task.subtasksCompleted)
    ? task.subtasksCompleted
    : 0;
  let total = Number.isFinite(task.subtasksTotal) ? task.subtasksTotal : 0;

  if ((!total || total < 0) && Array.isArray(task.subtasks)) {
    total = task.subtasks.length;
    completed = task.subtasks.filter((x) => x && x.done).length;
  } else if ((!total || total < 0) && Array.isArray(task.subtask)) {
    total = task.subtask.length;
    completed = 0;
  }

  const el = document.createElement("div");
  el.className = "task";
  el.setAttribute("draggable", "true");
  el.dataset.id = task.id;

  const prioIcon = escapeHtml(task.priority || "low");
  el.innerHTML = `
    <div>
      <p class="task-name" style="background-color:${
        task.categorycolor || "#0038ff"
      }">
        ${escapeHtml(task.category || "No Category")}
      </p>
    </div>
    <div class="task-discription">
      <p class="task-discription-headline">${escapeHtml(task.title || "")}</p>
      <p class="task-discription-secontline">${escapeHtml(
        task.secondline || ""
      )}</p>
    </div>
    <div class="task-subtasks">
      <div class="task-subtask-line">
        <progress value="${completed}" max="${total}"></progress>
      </div>
      <p>${completed}/${total} Subtasks</p>
    </div>
    <div class="task-users">
      <div class="assigned-avatars"></div>
      <div class="task-priority"><img src="./assets/icons/${prioIcon}.svg" alt="Priority" /></div>
    </div>
  `;

  // Drag & Drop
  el.addEventListener("dragstart", (e) => {
    el.classList.add("dragging");
    const id = task.id;
    const fromCol = findColumnOfTask(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({ id, fromCol }));
  });
  el.addEventListener("dragend", () => el.classList.remove("dragging"));

  // Klick -> Detail
  el.addEventListener("click", async () => {
    if (el.classList.contains("dragging")) return;
    await openDetailOverlayById(task.id);
  });

  // Assigned-Chips
  const assigneeIds = normalizeAssigneesToIds(task.assignedContact);
  populateAssignedChips(assigneeIds, el.querySelector(".assigned-avatars"));

  return el;
}

/* ---------- Dropzones ---------- */
document.querySelectorAll(".dropzone").forEach((zone) => {
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    zone.classList.add("over");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("over"));
  zone.addEventListener("drop", async (e) => {
    e.preventDefault();
    zone.classList.remove("over");

    const payload = safeParse(e.dataTransfer.getData("text/plain"));
    if (!payload) return;
    const { id, fromCol } = payload;
    const toCol = getZoneStatus(zone);
    if (!toCol) return;

    const afterEl = getDragAfterElement(zone, e.clientY);
    const draggedEl = document.querySelector(
      `.task[data-id="${CSS.escape(id)}"]`
    );
    if (draggedEl) {
      if (afterEl == null) zone.appendChild(draggedEl);
      else zone.insertBefore(draggedEl, afterEl);
    }

    if (fromCol && fromCol !== toCol) {
      const taskObj = data[fromCol]?.[id];
      if (!taskObj) return;

      const orderMap = buildOrderMapForZone(zone, toCol, id);
      const updates = {};
      updates[`${fromCol}/${id}`] = null;
      updates[`${toCol}/${id}`] = { ...taskObj, order: orderMap[id] };

      await dbApi.updateData(TASKS_ROOT, updates);
      await persistColumnOrder(zone, toCol);
    } else {
      await persistColumnOrder(zone, toCol);
    }
  });
});

function buildOrderMapForZone(zone, toCol, draggedId) {
  const children = [...zone.querySelectorAll(".task")];
  const orderMap = {};
  children.forEach((el, index) => (orderMap[el.dataset.id] = index));
  if (!(draggedId in orderMap)) orderMap[draggedId] = children.length;
  return orderMap;
}

async function persistColumnOrder(zone, col) {
  const children = [...zone.querySelectorAll(".task")];
  const updates = {};
  children.forEach(
    (el, index) => (updates[`${col}/${el.dataset.id}/order`] = index)
  );
  if (Object.keys(updates).length) await dbApi.updateData(TASKS_ROOT, updates);
}

function getZoneStatus(zoneEl) {
  switch (zoneEl.id) {
    case "task-table-todo":
      return "todo";
    case "task-table-progress":
      return "inprogress";
    case "task-table-feedback":
      return "await";
    case "task-table-done":
      return "done";
    default:
      return null;
  }
}
function getDragAfterElement(container, y) {
  const els = [...container.querySelectorAll(".task:not(.dragging)")];
  return els.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset)
        return { offset, element: child };
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}
function findColumnOfTask(id) {
  for (const c of COLS) if (data[c] && data[c][id]) return c;
  return null;
}
function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[
        m
      ])
  );
}

/* ---------- Löschen ---------- */
const detailDeleteBtn = document.getElementById("detail-delete");
detailDeleteBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  e.stopPropagation();
  const { id } = currentDetail || {};
  if (!id) return;
  await delTask(id);
  closeDetailOverlay();
  render();
});
async function delTask(id) {
  const col = findColumnOfTask(id);
  if (!col) return;
  await dbApi.deleteData(`${TASKS_ROOT}/${col}/${id}`);
}

/* ---------- Detail-Overlay ---------- */
const detailSection = document.getElementById("task-detail-overlay");
const detailCloseBtn = document.getElementById("detail-close-btn");
let currentDetail = { id: null, col: null, task: null };

detailCloseBtn?.addEventListener("click", closeDetailOverlay);
document.addEventListener(
  "keydown",
  (e) => e.key === "Escape" && closeDetailOverlay()
);

async function openDetailOverlayById(id) {
  const col = findColumnOfTask(id);
  if (!col) return;
  const snap = await dbApi.getData(`${TASKS_ROOT}/${col}/${id}`);
  if (!snap) return;

  const normalized = { ...snap, subtasks: normalizeSubtasks(snap) };
  normalized.subtasksTotal = normalized.subtasks.length;
  normalized.subtasksCompleted = normalized.subtasks.filter(
    (x) => x.done
  ).length;

  const assigneeIds = normalizeAssigneesToIds(normalized.assignedContact);
  const assignedDetailed = assigneeIds
    .map((id2) => contactsById.get(id2))
    .filter(Boolean);

  currentDetail = { id, col, task: { ...normalized, assignedDetailed } };

  renderDetail(currentDetail.task);
  detailSection.classList.remove("d_none");
  document.body.classList.add("board-overlay-open");
  wireSubtaskToggleHandler();
}

function closeDetailOverlay() {
  detailSection.classList.add("d_none");
  document.body.classList.remove("board-overlay-open");
  currentDetail = { id: null, col: null, task: null };
}

function renderDetail(task) {
  document.getElementById("detail-category").textContent =
    task.category || "No Category";
  document.getElementById("detail-category").style.backgroundColor =
    task.categorycolor || "#0038ff";
  document.getElementById("detail-title").textContent = task.title || "";
  document.getElementById("detail-desc").textContent = task.secondline || "";
  document.getElementById("detail-date").textContent = formatDate(
    task.deadline
  );

  const prio = (task.priority || "low").toLowerCase();
  document.getElementById("detail-priority-text").textContent =
    capitalize(prio);
  document.getElementById(
    "detail-priority-icon"
  ).src = `./assets/icons/${prio}.svg`;

  const box = document.getElementById("detail-assignees");
  box.innerHTML = "";
  (task.assignedDetailed || []).forEach(({ name, color, initials }) => {
    box.innerHTML += `
      <div class="detail-user-row">
        <div class="user" style="background:${escapeHtml(
          color || "#999"
        )}">${escapeHtml(initials || "?")}</div>
        <p>${escapeHtml(name || "")}</p>
      </div>`;
  });

  const stList = document.getElementById("task-overlay-open-subtask-list");
  stList.innerHTML = "";
  (task.subtasks || []).forEach(({ text, done }, i) => {
    stList.innerHTML += `
      <div class="task-overlay-open-subtask-item">
        <input type="checkbox" data-st-index="${i}" ${done ? "checked" : ""} />
        <p>${escapeHtml(text)}</p>
      </div>`;
  });
}

let subtasksHandlerWired = false;
function wireSubtaskToggleHandler() {
  if (subtasksHandlerWired) return;
  subtasksHandlerWired = true;
  document
    .getElementById("task-overlay-open-subtask-list")
    .addEventListener("change", async (e) => {
      const cb = e.target.closest('input[type="checkbox"][data-st-index]');
      if (!cb) return;
      const idx = Number(cb.dataset.stIndex);
      currentDetail.task.subtasks[idx].done = cb.checked;
      const doneCount = currentDetail.task.subtasks.filter(
        (x) => x.done
      ).length;
      const totalCount = currentDetail.task.subtasks.length;
      await saveSubtasksToFirebase(
        currentDetail.col,
        currentDetail.id,
        currentDetail.task.subtasks,
        doneCount,
        totalCount
      );
      render();
    });
}

async function saveSubtasksToFirebase(
  col,
  id,
  subtasks,
  doneCount,
  totalCount
) {
  const updates = {};
  updates[`${col}/${id}/subtasks`] = subtasks;
  updates[`${col}/${id}/subtasksCompleted`] = doneCount;
  updates[`${col}/${id}/subtasksTotal`] = totalCount;
  await dbApi.updateData(TASKS_ROOT, updates);
}

/* ---------- Kontakte auflösen ---------- */
function normalizeAssigneesToIds(val) {
  if (!val) return [];
  const out = [];
  const pushIf = (id) => {
    if (id && contactsById.has(id)) out.push(id);
  };

  if (Array.isArray(val)) {
    for (const x of val) {
      if (typeof x === "string") {
        const s = x.trim();
        if (contactsById.has(s)) {
          pushIf(s);
          continue;
        }
        if (s.includes("@")) {
          pushIf(contactIdByEmail.get(s.toLowerCase()));
          continue;
        }
        pushIf(contactIdByName.get(s.toLowerCase()));
      } else if (x && typeof x === "object") {
        const byId = (x.id || x.contactId || "").toString().trim();
        if (contactsById.has(byId)) {
          pushIf(byId);
          continue;
        }
        const byEmail = (x.email || "").toLowerCase();
        if (byEmail) {
          pushIf(contactIdByEmail.get(byEmail));
          continue;
        }
        const byName = (x.name || "").toLowerCase();
        if (byName) {
          pushIf(contactIdByName.get(byName));
        }
      }
    }
  } else if (typeof val === "string") {
    for (const token of val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)) {
      if (contactsById.has(token)) {
        pushIf(token);
        continue;
      }
      if (token.includes("@")) {
        pushIf(contactIdByEmail.get(token.toLowerCase()));
        continue;
      }
      pushIf(contactIdByName.get(token.toLowerCase()));
    }
  }
  return out;
}

/* ---------- Karten: Assigned-Chips ---------- */
function populateAssignedChips(ids, containerEl) {
  if (!containerEl) return;
  containerEl.innerHTML = "";
  const contacts = ids.map((id) => contactsById.get(id)).filter(Boolean);
  if (!contacts.length) return;

  const max = 4;
  const shown = contacts.slice(0, max);
  const more = contacts.length - shown.length;

  const chips = shown
    .map(
      (c) => `
      <span class="avatar-chip" style="background:${escapeHtml(
        c.color
      )}" title="${escapeHtml(c.name)}">
        ${escapeHtml(c.initials)}
      </span>`
    )
    .join("");

  containerEl.innerHTML =
    chips +
    (more > 0 ? `<span class="avatar-chip more-chip">+${more}</span>` : "");
}

/* ---------- Helpers ---------- */
function normalizeSubtasks(task) {
  if (Array.isArray(task?.subtasks))
    return task.subtasks.map((s) => ({ text: s.text || s, done: !!s.done }));
  if (Array.isArray(task?.subtask))
    return task.subtask.map((t) => ({ text: t, done: false }));
  return [];
}
function capitalize(s = "") {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function formatDate(s) {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d)) return "-";
  return `${String(d.getDate()).padStart(2, "0")}.${String(
    d.getMonth() + 1
  ).padStart(2, "0")}.${d.getFullYear()}`;
}
function toISODateOnly(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

/* ====================================================================== */
/* ============================ EDIT OVERLAY ============================ */
/* ====================================================================== */
const editSection = document.getElementById("task-edit-overlay");
const editCloseBtn = document.getElementById("edit-close-btn");
const editOkBtn = document.getElementById("edit-ok-btn");
const detailEditBtn = document.getElementById("detail-edit");

const editTitle = document.getElementById("edit-title");
const editDesc = document.getElementById("edit-desc");
const editDate = document.getElementById("edit-date");
const editDateHint = document.getElementById("edit-date-hint");
const editCategory = document.getElementById("edit-category");

// Priority Buttons
const prioBtns = {
  urgent: document.getElementById("edit-prio-urgent"),
  medium: document.getElementById("edit-prio-medium"),
  low: document.getElementById("edit-prio-low"),
};
let editPriority = "medium";
Object.entries(prioBtns).forEach(([key, btn]) =>
  btn?.addEventListener("click", () => setEditPriority(key))
);
function setEditPriority(p) {
  editPriority = p;
  Object.entries(prioBtns).forEach(([key, btn]) =>
    btn?.classList.toggle("active", key === p)
  );
}

// Assignees im Edit
const editAssigneeSelect = document.getElementById("edit-assignee-select");
const editAssigneeOptions = document.getElementById("edit-assignee-options");
const editAssigneeList = document.getElementById("edit-assignee-list");
let selectedAssigneeIds = [];

editAssigneeSelect?.addEventListener("click", () => {
  const open = editAssigneeOptions.classList.contains("d_none");
  toggleEditAssigneeDropdown(open);
});
document.addEventListener("click", (e) => {
  if (editSection.classList.contains("d_none")) return;
  if (
    !editAssigneeSelect.contains(e.target) &&
    !editAssigneeOptions.contains(e.target)
  ) {
    toggleEditAssigneeDropdown(false);
  }
});
function toggleEditAssigneeDropdown(open) {
  editAssigneeOptions.classList.toggle("d_none", !open);
  editAssigneeSelect.setAttribute("aria-expanded", String(open));
}
function renderEditAssigneeChips() {
  editAssigneeList.innerHTML = "";
  const contacts = selectedAssigneeIds
    .map((id) => contactsById.get(id))
    .filter(Boolean);
  contacts.forEach((c) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "assignee-chip";
    chip.title = `Entfernen: ${c.name}`;
    chip.dataset.id = c.id;
    chip.innerHTML = `
      <span class="assignee-chip-initials" style="background:${escapeHtml(
        c.color
      )}">${escapeHtml(c.initials)}</span>
      <span>${escapeHtml(c.name)}</span>
      <span aria-hidden="true">✕</span>
    `;
    chip.addEventListener("click", () => {
      selectedAssigneeIds = selectedAssigneeIds.filter((x) => x !== c.id);
      renderEditAssigneeChips();
      renderEditAssigneeOptions();
    });
    editAssigneeList.appendChild(chip);
  });
}
function renderEditAssigneeOptions() {
  editAssigneeOptions.innerHTML = "";
  const all = [...contactsById.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  all.forEach((c) => {
    const li = document.createElement("li");
    li.role = "option";
    li.className = "assignee-option";
    li.tabIndex = 0;
    const selected = selectedAssigneeIds.includes(c.id);
    li.setAttribute("aria-selected", String(selected));
    li.innerHTML = `
      <span class="assignee-chip-initials" style="background:${escapeHtml(
        c.color
      )}">${escapeHtml(c.initials)}</span>
      <span>${escapeHtml(c.name)}</span>
      ${selected ? "<span>• ausgewählt</span>" : ""}
    `;
    const toggle = () => {
      if (selectedAssigneeIds.includes(c.id)) {
        selectedAssigneeIds = selectedAssigneeIds.filter((x) => x !== c.id);
      } else {
        selectedAssigneeIds.push(c.id);
      }
      renderEditAssigneeChips();
      renderEditAssigneeOptions();
    };
    li.addEventListener("click", toggle);
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
    editAssigneeOptions.appendChild(li);
  });
}

/* Subtasks im Edit */
const editSubtaskInput = document.getElementById("edit-subtask-input");
const editSubtaskAddBtn = document.getElementById("edit-subtask-add");
const editSubtaskList = document.getElementById("edit-subtask-list");
let editSubtasks = [];

editSubtaskAddBtn?.addEventListener("click", () => addEditSubtask());
editSubtaskInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addEditSubtask();
  }
});
function addEditSubtask() {
  const val = (editSubtaskInput.value || "").trim();
  if (!val) return;
  editSubtasks.push({ text: val, done: false });
  editSubtaskInput.value = "";
  renderEditSubtasks();
}
function renderEditSubtasks() {
  editSubtaskList.innerHTML = "";
  editSubtasks.forEach((st, i) => {
    const row = document.createElement("div");
    row.className = "subtask-edit-row";
    row.innerHTML = `
      <input type="checkbox" ${st.done ? "checked" : ""} data-i="${i}" />
      <input type="text" value="${escapeHtml(st.text)}" data-i="${i}" />
      <button class="icon-btn" title="Löschen" data-i="${i}">🗑️</button>
    `;
    const checkbox = row.querySelector('input[type="checkbox"]');
    const textInput = row.querySelector('input[type="text"]');
    const delBtn = row.querySelector("button");

    checkbox.addEventListener("change", () => {
      editSubtasks[i].done = checkbox.checked;
    });
    textInput.addEventListener("input", () => {
      editSubtasks[i].text = textInput.value;
    });
    delBtn.addEventListener("click", () => {
      editSubtasks.splice(i, 1);
      renderEditSubtasks();
    });

    editSubtaskList.appendChild(row);
  });
}

/* Öffnen / Schließen / Speichern */
detailEditBtn?.addEventListener("click", openEditOverlay);
editCloseBtn?.addEventListener("click", closeEditOverlay);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !editSection.classList.contains("d_none"))
    closeEditOverlay();
});
editOkBtn?.addEventListener("click", saveEditOverlay);

function openEditOverlay() {
  if (!currentDetail?.task) return;
  const task = currentDetail.task;

  editTitle.value = task.title || "";
  editDesc.value = task.secondline || "";

  const createdAtStr =
    task.createdAt || task.created || task.created_at || null;
  const createdAt = createdAtStr ? new Date(createdAtStr) : new Date();
  const minDateStr = toISODateOnly(createdAt);
  editDate.min = minDateStr;
  const hint = document.getElementById("edit-date-hint");
  if (hint) hint.textContent = `Earliest: ${minDateStr}`;

  if (task.deadline) {
    const d = new Date(task.deadline);
    editDate.value = isNaN(d) ? "" : toISODateOnly(d);
  } else {
    editDate.value = "";
  }

  setEditPriority((task.priority || "medium").toLowerCase());

  selectedAssigneeIds = normalizeAssigneesToIds(task.assignedContact);
  renderEditAssigneeChips();
  renderEditAssigneeOptions();

  editSubtasks = normalizeSubtasks(task).map((s) => ({
    text: s.text,
    done: !!s.done,
  }));
  renderEditSubtasks();

  document.getElementById("task-detail-overlay")?.classList.add("d_none");
  editSection.classList.remove("d_none");
  document.body.classList.add("board-overlay-open");
}

function closeEditOverlay() {
  editSection.classList.add("d_none");
  document.body.classList.remove("board-overlay-open");
}

async function saveEditOverlay() {
  if (!currentDetail?.id || !currentDetail?.col) return;

  const title = editTitle.value.trim();
  const secondline = editDesc.value.trim();

  const task = currentDetail.task;
  const createdAtStr =
    task.createdAt || task.created || task.created_at || null;
  const minDate = createdAtStr ? new Date(createdAtStr) : new Date();
  minDate.setHours(0, 0, 0, 0);
  let deadlineISO = "";
  if (editDate.value) {
    const chosen = new Date(editDate.value);
    chosen.setHours(0, 0, 0, 0);
    if (chosen < minDate) {
      alert(
        `Das Fälligkeitsdatum darf nicht vor dem Erstellungsdatum liegen (${toISODateOnly(
          minDate
        )}).`
      );
      return;
    }
    deadlineISO = new Date(
      chosen.getTime() - chosen.getTimezoneOffset() * 60000
    ).toISOString();
  }

  const priority = editPriority;
  const assignedContact = [...selectedAssigneeIds];

  const cleanedSubtasks = editSubtasks
    .map((s) => ({ text: (s.text || "").trim(), done: !!s.done }))
    .filter((s) => s.text.length > 0);
  const doneCount = cleanedSubtasks.filter((s) => s.done).length;
  const totalCount = cleanedSubtasks.length;

  const updatedTask = {
    ...task,
    title,
    secondline,
    deadline: deadlineISO,
    priority,
    assignedContact,
    subtasks: cleanedSubtasks,
    subtasksCompleted: doneCount,
    subtasksTotal: totalCount,
    createdAt:
      task.createdAt ||
      task.created ||
      task.created_at ||
      new Date().toISOString(),
  };

  await dbApi.updateData(TASKS_ROOT, {
    [`${currentDetail.col}/${currentDetail.id}`]: updatedTask,
  });

  currentDetail.task = {
    ...updatedTask,
    assignedDetailed: assignedContact
      .map((id) => contactsById.get(id))
      .filter(Boolean),
  };

  renderDetail(currentDetail.task);
  editSection.classList.add("d_none");
  document.getElementById("task-detail-overlay")?.classList.remove("d_none");
  render();
}
