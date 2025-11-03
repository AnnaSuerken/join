// js/board.js
import { db, dbApi } from "./firebase.js";
import { requireAuth } from "./authguard.js";
await requireAuth({ redirectTo: "/login.html" });

const TASKS_ROOT = "/board";
const COLS = ["todo", "inprogress", "await", "done"];

const addTaskButton = document.getElementById("open-add-task-overlay");
addTaskButton?.addEventListener("click", () => openAddTaskOverlay());

const colsEl = {
  todo: document.getElementById("task-table-todo"),
  inprogress: document.getElementById("task-table-progress"),
  await: document.getElementById("task-table-feedback"),
  done: document.getElementById("task-table-done"),
};
const searchInput = document.getElementById("task-search");

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
          (t.headline || "").toLowerCase().includes(filter) ||
          (t.secondline || "").toLowerCase().includes(filter)
        );
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .forEach((t) => colsEl[c].appendChild(taskCard(t)));
  }
}

/* ---------- Task-Karte ---------- */
function taskCard(task) {
  const completed = Number.isFinite(task.subtasksCompleted)
    ? task.subtasksCompleted
    : 0;
  const total = Number.isFinite(task.subtasksTotal)
    ? task.subtasksTotal
    : Array.isArray(task.subtask)
    ? task.subtask.length
    : 0;

  const el = document.createElement("div");
  el.className = "task";
  el.setAttribute("draggable", "true");
  el.dataset.id = task.id;

  el.innerHTML = `
    <div>
      <p class="task-name" style="background-color:${task.categorycolor}">
        ${escapeHtml(task.category || "No Category")}
      </p>
    </div>
    <div class="task-discription">
      <p class="task-discription-headline">${escapeHtml(task.title || "")}</p>
      <p class="task-discription-secontline">${escapeHtml(task.secondline || "")}</p>
    </div>
    <div class="task-subtasks">
      <div class="task-subtask-line">
        <div class="task-subtask-line-fill" style="width:${total ? Math.round((completed/total)*100) : 0}%"></div>
      </div>
      <p>${completed}/${total} Subtasks</p>
    </div>
    <div class="task-users">
      <button class="task-del-btn" title="Delete" type="button">DEL</button>
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

  // Delete Click
  el.querySelector(".task-del-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    delTask(task.id);
  });

  // Karte klicken -> Overlay öffnen
  el.addEventListener("click", async (e) => {
    // während Drag nicht öffnen
    if (el.classList.contains("dragging")) return;
    await openTaskOverlayById(task.id);
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
      // remove old
      updates[`${fromCol}/${id}`] = null;

      // add new with properties
      updates[`${toCol}/${id}/id`] = id;
      updates[`${toCol}/${id}/category`] = taskObj.category || "No Category";
      updates[`${toCol}/${id}/headline`] = taskObj.title || "";
      updates[`${toCol}/${id}/secondline`] = taskObj.secondline || "";
      updates[`${toCol}/${id}/priority`] = taskObj.priority || "";
      updates[`${toCol}/${id}/categorycolor`] = taskObj.categorycolor || "";
      updates[`${toCol}/${id}/deadline`] = taskObj.deadline || "";
      updates[`${toCol}/${id}/title`] = taskObj.title || "";
      updates[`${toCol}/${id}/subtask`] = taskObj.subtask || [];
      updates[`${toCol}/${id}/subtasksCompleted`] = Number.isFinite(taskObj.subtasksCompleted) ? taskObj.subtasksCompleted : 0;
      updates[`${toCol}/${id}/subtasksTotal`] = Number.isFinite(taskObj.subtasksTotal) ? taskObj.subtasksTotal : (Array.isArray(taskObj.subtask) ? taskObj.subtask.length : 0);
      updates[`${toCol}/${id}/order`] = orderMap[id];
      updates[`${toCol}/${id}/createdAt`] = taskObj.createdAt || Date.now();
      updates[`${toCol}/${id}/assignedContact`] = taskObj.assignedContact ?? "";

      for (const [tid, ord] of Object.entries(orderMap)) {
        if (tid === id) continue;
        updates[`${toCol}/${tid}/order`] = ord;
      }

      await dbApi.updateData(TASKS_ROOT, updates);
      await persistColumnOrder(colsEl[fromCol], fromCol);
    } else {
      await persistColumnOrder(zone, toCol);
    }
  });
});

function buildOrderMapForZone(zone, toCol, draggedId) {
  const children = [...zone.querySelectorAll(".task")];
  const orderMap = {};
  children.forEach((el, index) => {
    const tid = el.dataset.id;
    orderMap[tid] = index;
  });
  if (!(draggedId in orderMap)) orderMap[draggedId] = children.length;
  return orderMap;
}

async function persistColumnOrder(zone, col) {
  const children = [...zone.querySelectorAll(".task")];
  const updates = {};
  children.forEach((el, index) => {
    const id = el.dataset.id;
    updates[`${col}/${id}/order`] = index;
  });
  if (Object.keys(updates).length) {
    await dbApi.updateData(TASKS_ROOT, updates);
  }
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
  const candidates = [...container.querySelectorAll(".task:not(.dragging)")];
  return candidates.reduce(
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
searchInput?.addEventListener("input", () => render());

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}
function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

/* ---------- Delete ---------- */
async function delTask(id) {
  const col = findColumnOfTask(id);
  if (!col) return;
  try {
    await dbApi.deleteData(`/board/${col}/${id}`);
    console.log("Task gelöscht:", col, id);
  } catch (err) {
    console.error("Delete fehlgeschlagen:", err);
  }
}
window.delTask = delTask;

/* ---------- Add-Task Overlay (bestehend) ---------- */
function openAddTaskOverlay() {
  const taskOverlay = document.getElementById("add-task-overlay");
  taskOverlay.classList.remove("d_none");
  document.body.classList.add("no-scroll");
}

/* =================================================================
   Task-DETAIL OVERLAY (öffnet beim Klick auf Karte, lädt aus Firebase)
   ================================================================= */

const overlayRoot = document.getElementById("boardOverlay");
const overlayCloseBtns = document.querySelectorAll("[data-close-overlay]");

// Schließen per X/Backdrop
overlayCloseBtns.forEach((btn) =>
  btn.addEventListener("click", () => closeTaskOverlay())
);
// ESC schließt
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeTaskOverlay();
});

function openTaskOverlay() {
  overlayRoot?.classList.add("board-overlay-open");
  overlayRoot?.setAttribute("aria-hidden", "false");
}
function closeTaskOverlay() {
  overlayRoot?.classList.remove("board-overlay-open");
  overlayRoot?.setAttribute("aria-hidden", "true");
}

/** Initialen */
function initialsFromName(name = "") {
  const p = String(name).trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase();
}

/** Overlay füllen */
function renderTaskInOverlay(task) {
  if (!overlayRoot) return;

  // Elemente
  const pill = overlayRoot.querySelector(".bo-category");
  const titleEl = overlayRoot.querySelector(".bo-title");
  const descEl = overlayRoot.querySelector(".bo-desc");
  const dateEl = overlayRoot.querySelector(".bo-date");
  const prioWrap = overlayRoot.querySelector(".bo-prio");
  const prioText = overlayRoot.querySelector(".bo-prio-text");
  const peopleList = overlayRoot.querySelector(".bo-people");
  const subtasksList = overlayRoot.querySelector(".bo-subtask-list");
  const deleteBtn = overlayRoot.querySelector("#bo-delete");
  const editBtn = overlayRoot.querySelector("#bo-edit");

  // Kategorie
  pill.textContent = task.category || "No Category";
  pill.dataset.category = task.category || "";
  pill.style.background = task.categorycolor || "#0038ff";

  // Titel / Beschreibung
  titleEl.textContent = task.title || "";
  descEl.textContent = task.secondline || "";

  // Datum
  dateEl.textContent = formatDate(task.deadline);

  // Prio
  const prio = (task.priority || "low").toLowerCase();
  prioWrap.classList.remove("bo-prio--urgent", "bo-prio--medium", "bo-prio--low");
  prioWrap.classList.add(`bo-prio--${prio}`);
  prioText.textContent = capitalize(prio);

  // Assigned
  peopleList.innerHTML = "";
  const assigned = normalizeAssignees(task.assignedContact);
  assigned.forEach((n) => {
    const li = document.createElement("li");
    li.className = "bo-person";
    const av = document.createElement("span");
    av.className = "bo-avatar";
    av.style.setProperty("--bg", pickColorForName(n));
    av.textContent = initialsFromName(n);
    const nm = document.createElement("span");
    nm.className = "bo-name";
    nm.textContent = n;
    li.append(av, nm);
    peopleList.appendChild(li);
  });

  // Subtasks
  subtasksList.innerHTML = "";
  const subt = normalizeSubtasks(task);
  let doneCount = 0;
  subt.forEach(({ text, done }) => {
    if (done) doneCount++;
    const li = document.createElement("li");
    li.className = "bo-subtask";
    li.innerHTML = `
      <label>
        <input type="checkbox" ${done ? "checked" : ""} disabled />
        <span>${escapeHtml(text)}</span>
      </label>
    `;
    subtasksList.appendChild(li);
  });

  // Footer-Buttons
  deleteBtn.onclick = async () => {
    await delTask(task.id);
    closeTaskOverlay();
  };
  editBtn.onclick = () => {
    // hier könntest du in deinen Edit-Flow springen
    // z.B. openAddTaskOverlay() und Felder vorfüllen
    console.log("Edit task", task.id);
  };

  openTaskOverlay();
}

function normalizeAssignees(val) {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === "string" && val.trim()) return [val.trim()];
  return [];
}

function normalizeSubtasks(task) {
  // unterstützt: task.subtask = ["a","b"]  ODER  task.subtasks = [{text,done}]
  if (Array.isArray(task.subtasks)) {
    return task.subtasks
      .filter((x) => x && typeof x.text === "string")
      .map((x) => ({ text: x.text, done: !!x.done }));
  }
  if (Array.isArray(task.subtask)) {
    return task.subtask.map((t) => ({ text: String(t), done: false }));
  }
  return [];
}

function capitalize(s = "") {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function formatDate(s) {
  if (!s) return "-";
  // akzeptiert YYYY-MM-DD oder 2024-10-25T...
  const d = new Date(s);
  if (isNaN(d)) return s;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function pickColorForName(name = "") {
  const palette = ["#0038FF", "#6E52FF", "#1FD7C1", "#FF7A00", "#29ABE2", "#FF5EB3", "#3EC300", "#FFA800"];
  let h = 0;
  for (const ch of name) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}

/** Öffnen per ID (spaltenunabhängig) */
async function openTaskOverlayById(id) {
  // Wo liegt der Task?
  const col = findColumnOfTask(id);
  if (!col) return;

  // frische Daten von Firebase holen (falls local stale)
  const snap = await dbApi.getData(`${TASKS_ROOT}/${col}/${id}`);
  if (!snap) return;

  // falls subtasksCompleted/Total fehlen -> aus Array ableiten
  if (!Number.isFinite(snap.subtasksTotal) && Array.isArray(snap.subtask)) {
    snap.subtasksTotal = snap.subtask.length;
  }
  if (!Number.isFinite(snap.subtasksCompleted) && Array.isArray(snap.subtasks)) {
    snap.subtasksCompleted = snap.subtasks.filter((x) => x.done).length;
  }

  renderTaskInOverlay(snap);
}
