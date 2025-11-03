// js/board.js
import { db, dbApi } from "./firebase.js";
import { requireAuth } from "./authguard.js";
await requireAuth({ redirectTo: "/login.html" });

const TASKS_ROOT = "/board";
const COLS = ["todo", "inprogress", "await", "done"];

/* ---------- Add-Task Button ---------- */
const addTaskButton = document.getElementById("open-add-task-overlay");
addTaskButton?.addEventListener("click", () => openAddTaskOverlay());

/* ---------- Spalten-Referenzen ---------- */
const colsEl = {
  todo: document.getElementById("task-table-todo"),
  inprogress: document.getElementById("task-table-progress"),
  await: document.getElementById("task-table-feedback"),
  done: document.getElementById("task-table-done"),
};
const searchInput = document.getElementById("task-search");

/* ---------- Daten-Cache ---------- */
let data = { todo: {}, inprogress: {}, await: {}, done: {} };

/* ---------- Live-Daten vom Board ---------- */
dbApi.onData(TASKS_ROOT, (val) => {
  data = {
    todo: val?.todo || {},
    inprogress: val?.inprogress || {},
    await: val?.await || {},
    done: val?.done || {},
  };
  render();
});

/* ---------- Render Board-Spalten ---------- */
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
searchInput?.addEventListener("input", () => render());

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

  const assigned = normalizeAssigneesDetailed(task.assignedContact);
  const avatarsHTML = renderAssignedAvatars(assigned);

  const el = document.createElement("div");
  el.className = "task";
  el.setAttribute("draggable", "true");
  el.dataset.id = task.id;

  el.innerHTML = `
    <div>
      <p class="task-name" style="background-color:${task.categorycolor || "#0038ff"}">
        ${escapeHtml(task.category || "No Category")}
      </p>
    </div>
    <div class="task-discription">
      <p class="task-discription-headline">${escapeHtml(task.title || "")}</p>
      <p class="task-discription-secontline">${escapeHtml(task.secondline || "")}</p>
    </div>
    <div class="task-subtasks">
      <div class="task-subtask-line">
          <progress value="${completed}" max="${total}"></progress>
      </div>
      <p>${completed}/${total} Subtasks</p>
    </div>
    <div class="task-users">
      <div class="assigned-avatars">${avatarsHTML}</div>
      <div class="task-priority">
        <img src="./assets/icons/${task.priority || "low"}.svg" alt="Priority" />
      </div>
    </div>
  `;

  // Drag
  el.addEventListener("dragstart", (e) => {
    el.classList.add("dragging");
    const id = task.id;
    const fromCol = findColumnOfTask(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({ id, fromCol }));
  });
  el.addEventListener("dragend", () => el.classList.remove("dragging"));

  // Klick -> Detail Overlay
  el.addEventListener("click", async () => {
    if (el.classList.contains("dragging")) return;
    await openDetailOverlayById(task.id);
  });

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
    const draggedEl = document.querySelector(`.task[data-id="${CSS.escape(id)}"]`);
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
  children.forEach((el, index) => (updates[`${col}/${el.dataset.id}/order`] = index));
  if (Object.keys(updates).length) await dbApi.updateData(TASKS_ROOT, updates);
}

function getZoneStatus(zoneEl) {
  switch (zoneEl.id) {
    case "task-table-todo": return "todo";
    case "task-table-progress": return "inprogress";
    case "task-table-feedback": return "await";
    case "task-table-done": return "done";
    default: return null;
  }
}
function getDragAfterElement(container, y) {
  const els = [...container.querySelectorAll(".task:not(.dragging)")];
  return els.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}
function findColumnOfTask(id) {
  for (const c of COLS) if (data[c] && data[c][id]) return c;
  return null;
}
function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m])
  );
}

/* ---------- Delete ---------- */
async function delTask(id) {
  const col = findColumnOfTask(id);
  if (!col) return;
  await dbApi.deleteData(`/board/${col}/${id}`);
}
window.delTask = delTask;

/* ---------- Add-Task Overlay ---------- */
function openAddTaskOverlay() {
  const taskOverlay = document.getElementById("add-task-overlay");
  taskOverlay.classList.remove("d_none");
  document.body.classList.add("no-scroll");
}

/* =====================================================
   DETAIL OVERLAY + SUBTASK SYNC
===================================================== */
const detailSection = document.getElementById("task-detail-overlay");
const detailCloseBtn = document.getElementById("detail-close-btn");
let currentDetail = { id: null, col: null, task: null };

detailCloseBtn?.addEventListener("click", closeDetailOverlay);
document.addEventListener("keydown", (e) => e.key === "Escape" && closeDetailOverlay());

async function openDetailOverlayById(id) {
  const col = findColumnOfTask(id);
  if (!col) return;
  const snap = await dbApi.getData(`${TASKS_ROOT}/${col}/${id}`);
  if (!snap) return;

  const normalized = { ...snap, subtasks: normalizeSubtasks(snap) };
  normalized.subtasksTotal = normalized.subtasks.length;
  normalized.subtasksCompleted = normalized.subtasks.filter((x) => x.done).length;
  currentDetail = { id, col, task: normalized };

  renderDetail(normalized);
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
  document.getElementById("detail-category").textContent = task.category || "No Category";
  document.getElementById("detail-category").style.backgroundColor = task.categorycolor || "#0038ff";
  document.getElementById("detail-title").textContent = task.title || "";
  document.getElementById("detail-desc").textContent = task.secondline || "";
  document.getElementById("detail-date").textContent = formatDate(task.deadline);

  const prio = (task.priority || "low").toLowerCase();
  document.getElementById("detail-priority").className = `prio-${prio}`;
  document.getElementById("detail-priority-text").textContent = capitalize(prio);
  document.getElementById("detail-priority-icon").src = `./assets/icons/${prio}.svg`;

  const assigneesBox = document.getElementById("detail-assignees");
  assigneesBox.innerHTML = "";
  normalizeAssigneesDetailed(task.assignedContact).forEach(({ name, color }) => {
    assigneesBox.innerHTML += `
      <div class="detail-user-row">
        <div class="user" style="background:${color || pickColorForName(name)}">${escapeHtml(initialsFromName(name))}</div>
        <p>${escapeHtml(name)}</p>
      </div>`;
  });

  const stList = document.getElementById("task-overlay-open-subtask-list");
  stList.innerHTML = "";
  task.subtasks.forEach(({ text, done }, i) => {
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
  const container = document.getElementById("task-overlay-open-subtask-list");
  container.addEventListener("change", async (e) => {
    const cb = e.target.closest('input[type="checkbox"][data-st-index]');
    if (!cb) return;
    const idx = Number(cb.dataset.stIndex);
    currentDetail.task.subtasks[idx].done = cb.checked;
    const doneCount = currentDetail.task.subtasks.filter((x) => x.done).length;
    const totalCount = currentDetail.task.subtasks.length;
    await saveSubtasksToFirebase(currentDetail.col, currentDetail.id, currentDetail.task.subtasks, doneCount, totalCount);
    render();
  });
}

async function saveSubtasksToFirebase(col, id, subtasks, doneCount, totalCount) {
  const updates = {};
  updates[`${col}/${id}/subtasks`] = subtasks;
  updates[`${col}/${id}/subtasksCompleted`] = doneCount;
  updates[`${col}/${id}/subtasksTotal`] = totalCount;
  await dbApi.updateData(TASKS_ROOT, updates);
}

/* ---------- Helper ---------- */
function normalizeSubtasks(task) {
  if (Array.isArray(task.subtasks))
    return task.subtasks.map((s) => ({ text: s.text || s, done: !!s.done }));
  if (Array.isArray(task.subtask))
    return task.subtask.map((t) => ({ text: t, done: false }));
  return [];
}
function normalizeAssigneesDetailed(val) {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((x) => (typeof x === "object" ? x : { name: x, color: null })).filter(Boolean);
  }
  if (typeof val === "string" && val.trim()) return [{ name: val.trim(), color: null }];
  return [];
}
function renderAssignedAvatars(items = []) {
  if (!items.length) return "";
  const max = 3;
  const shown = items.slice(0, max);
  const more = items.length - shown.length;
  const chips = shown
    .map((it, i) => {
      const init = escapeHtml(initialsFromName(it.name));
      const col = it.color || pickColorForName(it.name);
      return `<span class="avatar-chip" style="z-index:${10 - i}; background:${col}" title="${escapeHtml(it.name)}">${init}</span>`;
    })
    .join("");
  const moreChip = more > 0 ? `<span class="avatar-chip more-chip">+${more}</span>` : "";
  return chips + moreChip;
}
function initialsFromName(name = "") {
  const p = String(name).trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase();
}
function pickColorForName(name = "") {
  const palette = ["#0038FF","#6E52FF","#1FD7C1","#FF7A00","#29ABE2","#FF5EB3","#3EC300","#FFA800"];
  let h = 0;
  for (const ch of name) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}
function capitalize(s = "") { return s.charAt(0).toUpperCase() + s.slice(1); }
function formatDate(s) {
  if (!s) return "-";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}
