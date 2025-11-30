// js/board.js
import { dbApi } from "../firebase.js";
import { requireAuth } from "../authguard.js";
import {
  escapeHtml,
  safeParse,
  normalizeAssigneesToIds,
  populateAssignedChips,
} from "../board/helpers.js";
import { openDetailOverlayById } from "./detail.js";
import "../board/edit.js";
import "../addtask.js";

await requireAuth({ redirectTo: "/login.html" });

const TASKS_ROOT = "/board";
const CONTACTS_ROOT = "/contacts";
const COLS = ["todo", "inprogress", "await", "done"];

/* ---------- UI: Add-Task Overlay open/close ---------- */

window.currentTaskColumn = "todo";

function openAddTaskOverlay(btn) {
  const overlay = document.getElementById("add-task-overlay");
  const form = overlay?.querySelector(".task-form");
  overlay?.classList.remove("d_none");
  document.body.classList.add("no-scroll");
  window.getContactsData?.();
  if (form) window.clearTask?.(form);
  if (btn.dataset.column) window.currentTaskColumn = btn.dataset.column;
    console.log(window.currentTaskColumn)
}

function closeAddTaskOverlay() {
  const overlay = document.getElementById("add-task-overlay");
  const form = overlay?.querySelector(".task-form");
  if (form) window.clearTask?.(form);
  overlay?.classList.add("d_none");
  document.body.classList.remove("no-scroll");
}

document.addEventListener("click", e => {
  const openBtn = e.target.closest(".open-add-task-overlay");
  if (openBtn) return openAddTaskOverlay(openBtn);

  if (e.target.closest("#add-task-overlay .close-btn")) return closeAddTaskOverlay();
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

// Kontakte
let contactsById = new Map();
let contactIdByName = new Map();
let contactIdByEmail = new Map();

// global verfügbar für detail.js / edit.js / helpers.js
window.boardData = data;
window.boardContacts = { contactsById, contactIdByName, contactIdByEmail };

/* ---------- Live-Firebase-Listener ---------- */
dbApi.onData(TASKS_ROOT, (val) => {
  data = {
    todo: val?.todo || {},
    inprogress: val?.inprogress || {},
    await: val?.await || {},
    done: val?.done || {},
  };
  window.boardData = data;
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

  window.boardContacts = { contactsById, contactIdByName, contactIdByEmail };
  render();
});

/* ---------- Render Board ---------- */
function render() {
  COLS.forEach((c) => {
    if (colsEl[c]) colsEl[c].innerHTML = "";
  });

  const filter = (searchInput?.value || "").trim().toLowerCase();

  const emptyText = {
    todo: "No task to do",
    inprogress: "No task in progress",
    await: "No Tasks Awaiting Feedback",
    done: "No Tasks Done",
  };

  for (const c of COLS) {
    const colEl = colsEl[c];
    if (!colEl) continue;

    const list = Object.values(data[c] || {});

    const filtered = list
      .filter((t) => {
        if (!filter) return true;
        return (
          (t.title || "").toLowerCase().includes(filter) ||
          (t.secondline || "").toLowerCase().includes(filter)
        );
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    if (!filtered.length) {
      const placeholder = document.createElement("div");
      placeholder.className = "no-task-placeholder";
      placeholder.textContent = emptyText[c] || "No task to do";
      colEl.appendChild(placeholder);
      continue;
    }

    filtered.forEach((t) => colEl.appendChild(taskCard(t)));
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

  /* Desktop Drag&Drop */
  el.addEventListener("dragstart", (e) => {
    el.classList.add("dragging");
    const id = task.id;
    const fromCol = findColumnOfTask(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({ id, fromCol }));
  });
  el.addEventListener("dragend", () => el.classList.remove("dragging"));

  /* Touch Drag&Drop */
  if ("ontouchstart" in window) {
    let currentZone = null;

    const onTouchStart = () => {
      el.classList.add("dragging");
      el.dataset.fromCol = findColumnOfTask(task.id) || "";
    };

    const onTouchMove = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;

      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const zone = target?.closest(".dropzone");

      document
        .querySelectorAll(".dropzone.over")
        .forEach((z) => z.classList.remove("over"));

      if (zone) {
        zone.classList.add("over");
        currentZone = zone;
      } else {
        currentZone = null;
      }
    };

    const onTouchEnd = async (e) => {
      el.classList.remove("dragging");
      document
        .querySelectorAll(".dropzone.over")
        .forEach((z) => z.classList.remove("over"));

      const fromCol = el.dataset.fromCol;
      const zone = currentZone;
      currentZone = null;
      if (!zone || !fromCol) return;

      const toCol = getZoneStatus(zone);
      if (!toCol) return;

      const touch = e.changedTouches[0];
      const y = touch ? touch.clientY : 0;

      const afterEl = getDragAfterElement(zone, y);

      if (afterEl == null) zone.appendChild(el);
      else zone.insertBefore(el, afterEl);

      if (fromCol && fromCol !== toCol) {
        const taskObj = data[fromCol]?.[task.id];
        if (!taskObj) return;

        const orderMap = buildOrderMapForZone(zone, toCol, task.id);
        const updates = {};
        updates[`${fromCol}/${task.id}`] = null;
        updates[`${toCol}/${task.id}`] = {
          ...taskObj,
          order: orderMap[task.id],
        };

        await dbApi.updateData(TASKS_ROOT, updates);
        await persistColumnOrder(zone, toCol);
      } else {
        await persistColumnOrder(zone, toCol);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
  }

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

/* ---------- Drag&Drop-Helfer ---------- */
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
