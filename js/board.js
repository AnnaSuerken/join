// js/board.js
import { db, dbApi } from "./firebase.js";
import { requireAuth } from "./authguard.js";
await requireAuth({ redirectTo: "/login.html" });

const TASKS_ROOT = "/board";
const CONTACTS_ROOT = "/contacts";
const COLS = ["todo", "inprogress", "await", "done"];

/* ---------- UI ---------- */
//const addTaskButton = document.getElementById("open-add-task-overlay");

document.querySelectorAll(".open-add-task-overlay").forEach((btn)=>{
  btn.addEventListener("click", () => {
  document.getElementById("add-task-overlay")?.classList.remove("d_none");
  document.body.classList.add("no-scroll");
  clearTask();
  getContactsData();
  window.currentTaskColumn = btn.dataset.column; 
})
});


const closeButton = document.getElementById("close-btn");
closeButton?.addEventListener("click", () => {
  document.getElementById("add-task-overlay")?.classList.add("d_none");
  document.body.classList.remove("no-scroll");
  window.currentTaskColumn = null;
});


const colsEl = {
  todo: document.getElementById("task-table-todo"),
  inprogress: document.getElementById("task-table-progress"),
  await: document.getElementById("task-table-feedback"),
  done: document.getElementById("task-table-done"),
};
const searchInput = document.getElementById("task-search");

/* ---------- State ---------- */
let data = { todo: {}, inprogress: {}, await: {}, done: {} };

/** Live-Index aller Kontakte (für robuste Auflösung) */
let contactsById = new Map(); // id -> contact
let contactIdByName = new Map(); // lower(name) -> id
let contactIdByEmail = new Map(); // lower(email) -> id

/* ---------- Live-Listener ---------- */
// Board
dbApi.onData(TASKS_ROOT, (val) => {
  data = {
    todo: val?.todo || {},
    inprogress: val?.inprogress || {},
    await: val?.await || {},
    done: val?.done || {},
  };
  render();
});

// Kontakte-Index
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
  // Nachlade-Render (z. B. wenn beim ersten Render die Kontakte noch nicht da waren)
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
      <div class="task-priority">
        <img src="./assets/icons/${prioIcon}.svg" alt="Priority" />
      </div>
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

  // Assigned-Chips füllen (IDs robust auflösen)
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

  // Assignees auf IDs auflösen + Kontakte aus Index holen
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
        // ID direkt?
        if (contactsById.has(s)) {
          pushIf(s);
          continue;
        }
        // Email?
        if (s.includes("@")) {
          pushIf(contactIdByEmail.get(s.toLowerCase()));
          continue;
        }
        // Name?
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

/* ---------- kleine Helper ---------- */
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
