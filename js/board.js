import { db, dbApi } from "./firebase.js";
import { requireAuth } from "./authguard.js";
await requireAuth({ redirectTo: "/login.html" });

const TASKS_ROOT = "/board";
<<<<<<< HEAD
=======
const addTaskButton = document.getElementById("open-add-task-overlay");

addTaskButton.addEventListener("click", () => {
  openAddTaskOverlay();
});
>>>>>>> origin/main

const COLS = ["todo", "inprogress", "await", "done"];

const colsEl = {
  todo: document.getElementById("task-table-todo"),
  inprogress: document.getElementById("task-table-progress"),
  await: document.getElementById("task-table-feedback"),
  done: document.getElementById("task-table-done"),
};
const searchInput = document.getElementById("task-search");
<<<<<<< HEAD
const addDemoBtn = document.getElementById("add-demo");
=======
>>>>>>> origin/main

let data = { todo: {}, inprogress: {}, await: {}, done: {} };

dbApi.onData(TASKS_ROOT, (val) => {
  data = {
    todo: val?.todo || {},
    inprogress: val?.inprogress || {},
    await: val?.await || {},
    done: val?.done || {},
  };
  render();
});

<<<<<<< HEAD
addDemoBtn?.addEventListener("click", async () => {
  const now = Date.now();
  const key = await dbApi.pushData(`${TASKS_ROOT}/todo`, {
    id: "",
    category: "User Story",
    headline: "Kochwelt Page & Recipe Recommender",
    secondline: "Build start page with recipe recommendation...",
    subtasksCompleted: 1,
    subtasksTotal: 2,
    order: now,
    createdAt: now,
  });
  await dbApi.updateData(`${TASKS_ROOT}/todo/${key}`, { id: key });
});

=======
>>>>>>> origin/main
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

function taskCard(task) {
  const completed = Number.isFinite(task.subtasksCompleted)
    ? task.subtasksCompleted
    : 0;
  const total = Number.isFinite(task.subtasksTotal) ? task.subtasksTotal : 0;

  const el = document.createElement("div");
  el.className = "task";
  el.setAttribute("draggable", "true");
  el.dataset.id = task.id;

  el.innerHTML = `
    <div>
<<<<<<< HEAD
      <p class="task-name">${escapeHtml(task.title || "User Story")}</p>
    </div>
    <div class="task-discription">
      <p class="task-discription-headline">${escapeHtml(
        task.headline || ""
      )}</p>
=======
      <p class="task-name" style="background-color: ${
        task.categorycolor
      }">${escapeHtml(task.category || "No Category")}</p>
    </div>
    <div class="task-discription">
      <p class="task-discription-headline">${escapeHtml(task.title || "")}</p>
>>>>>>> origin/main
      <p class="task-discription-secontline">${escapeHtml(
        task.secondline || ""
      )}</p>
    </div>
    <div class="task-subtask">
      <div class="task-subtask-line task-subtask-line-fill "></div>
      <p>${completed}/${total} Subtasks</p>
    </div>
    <div class="task-users">
    <button onclick="delTask('${task.id}')">DEL</button>
<<<<<<< HEAD
=======
    <div class="task-priority">
    <img src="./assets/icons/${task.priority || "low"}.svg" alt="Priority" />
    </div>
>>>>>>> origin/main
    </div>
  `;

  el.addEventListener("dragstart", (e) => {
    el.classList.add("dragging");
    const id = task.id;
    const fromCol = findColumnOfTask(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({ id, fromCol }));
  });
  el.addEventListener("dragend", () => el.classList.remove("dragging"));

  return el;
}

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

      updates[`${toCol}/${id}/id`] = id;
<<<<<<< HEAD
      updates[`${toCol}/${id}/category`] = taskObj.title || "User Story";
      updates[`${toCol}/${id}/headline`] = taskObj.headline || "";
      updates[`${toCol}/${id}/secondline`] = taskObj.secondline || "";
=======
      updates[`${toCol}/${id}/category`] = taskObj.category || "No Category";
      updates[`${toCol}/${id}/headline`] = taskObj.title || "";
      updates[`${toCol}/${id}/secondline`] = taskObj.secondline || "";
      updates[`${toCol}/${id}/priority`] = taskObj.priority || "";
      updates[`${toCol}/${id}/categorycolor`] = taskObj.categorycolor || "";
      updates[`${toCol}/${id}/deadline`] = taskObj.deadline || "";
<<<<<<< HEAD
>>>>>>> origin/main
=======
      updates[`${toCol}/${id}/title`] = taskObj.title || "";
>>>>>>> a43031b7d67331dd45138999fed00b904219d74c
      updates[`${toCol}/${id}/subtasksCompleted`] = Number.isFinite(
        taskObj.subtasksCompleted
      )
        ? taskObj.subtasksCompleted
        : 0;
      updates[`${toCol}/${id}/subtasksTotal`] = Number.isFinite(
        taskObj.subtasksTotal
      )
        ? taskObj.subtasksTotal
        : 0;
      updates[`${toCol}/${id}/order`] = orderMap[id];
      updates[`${toCol}/${id}/createdAt`] = taskObj.createdAt || Date.now();

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
  if (!(draggedId in orderMap)) {
    orderMap[draggedId] = children.length;
  }
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
  const candidates = [...container.querySelectorAll(".task:not(.dragging)")];
  return candidates.reduce(
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
  for (const c of COLS) {
    if (data[c] && data[c][id]) return c;
  }
  return null;
}

searchInput?.addEventListener("input", () => render());

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[m])
  );
}
function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

async function delTask(id) {
  const col = findColumnOfTask(id);
  if (!col) {
    console.warn("Spalte für Task nicht gefunden:", id);
    return;
  }
  try {
    await dbApi.deleteData(`/board/${col}/${id}`);
    console.log("Task gelöscht:", col, id);
  } catch (err) {
    console.error("Delete fehlgeschlagen:", err);
  }
}

window.delTask = delTask;

//toggle Task Overlay//

function openAddTaskOverlay() {
  const taskOverlay = document.getElementById("add-task-overlay");

  taskOverlay.classList.remove("d_none");
  document.body.classList.add("no-scroll");
}
<<<<<<< HEAD

document.addEventListener("DOMContentLoaded", () => {
  const addTaskButton = document.getElementById("open-add-task-overlay");
  addTaskButton.addEventListener("click", openAddTaskOverlay);
});
=======
>>>>>>> origin/main
