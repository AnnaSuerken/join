/**
 * board/task-card.js
 * Erstellt eine Task-Karte + bindet Click/Drag.
 */

import { escapeHtml, normalizeAssigneesToIds } from "./helpers.js";
import { populateAssignedChips } from "./helpers.js";
import { openDetailOverlayById } from "./detail.js";
import { wireDesktopDragHandlers } from "./dnd-desktop.js";
import { wireTouchDragHandlers } from "./dnd-touch.js";

export function taskCard(task) {
  if (!task?.id) return emptyNode(task);

  const el = buildCardEl(task);
  wireDesktopDragHandlers(el, task);
  wireTouchDragHandlers(el, task);
  wireClickToDetail(el, task);

  const ids = normalizeAssigneesToIds(task.assignedContact);
  populateAssignedChips(ids, el.querySelector(".assigned-avatars"));

  return el;
}

function emptyNode(task) {
  console.warn("Task without id skipped:", task);
  return document.createElement("div");
}

function buildCardEl(task) {
  const { completed, total } = getProgress(task);
  const prioIcon = escapeHtml(task.priority || "low");

  const el = document.createElement("div");
  el.className = "task";
  el.setAttribute("draggable", "true");
  el.dataset.id = task.id;

  el.innerHTML = cardHtml(task, completed, total, prioIcon);
  return el;
}

function getProgress(task) {
  const st = Array.isArray(task.subtasks) ? task.subtasks : null;
  const old = Array.isArray(task.subtask) ? task.subtask : null;
  const total = Number.isFinite(task.subtasksTotal) ? task.subtasksTotal : st?.length || old?.length || 0;
  const completed = Number.isFinite(task.subtasksCompleted) ? task.subtasksCompleted : st?.filter((x) => x?.done).length || 0;
  return { completed, total };
}

function cardHtml(task, completed, total, prioIcon) {
  return `
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
      <div class="assigned-avatars"></div>
      <div class="task-priority">
        <img src="./assets/icons/${prioIcon}.svg" alt="Priority" />
      </div>
    </div>
  `;
}

function wireClickToDetail(el, task) {
  el.addEventListener("click", async () => {
    if (el.classList.contains("dragging")) return;
    if (!task?.id) return;
    window.openTaskDetailOverlay?.();
    await openDetailOverlayById(task.id);
  });
}
