import { escapeHtml, normalizeAssigneesToIds } from "./helpers.js";
import { populateAssignedChips } from "./helpers.js";
import { openDetailOverlayById } from "./detail.js";
import { wireDesktopDragHandlers } from "./dnd-desktop.js";
import { wireTouchDragHandlers } from "./dnd-touch.js";

/**
 * Creates a draggable task card element.
 *
 * @param {Object} task
 * Task data object.
 * @param {string} task.id
 * Unique task identifier.
 */
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

/**
 * Returns an empty node for invalid tasks.
 *
 * @param {Object} task
 * Invalid task object.
 */
function emptyNode(task) {
  console.warn("Task without id skipped:", task);
  return document.createElement("div");
}

/**
 * Builds the task card DOM element.
 *
 * @param {Object} task
 * Task data object.
 */
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

/**
 * Calculates subtask progress values.
 *
 * @param {Object} task
 * Task data object.
 */
function getProgress(task) {
  const st = Array.isArray(task.subtasks) ? task.subtasks : null;
  const old = Array.isArray(task.subtask) ? task.subtask : null;
  const total = Number.isFinite(task.subtasksTotal) ? task.subtasksTotal : st?.length || old?.length || 0;
  const completed = Number.isFinite(task.subtasksCompleted) ? task.subtasksCompleted : st?.filter((x) => x?.done).length || 0;
  return { completed, total };
}

/**
 * Generates the inner HTML for a task card.
 *
 * @param {Object} task
 * Task data object.
 * @param {number} completed
 * Number of completed subtasks.
 * @param {number} total
 * Total number of subtasks.
 * @param {string} prioIcon
 * Priority icon identifier.
 */
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

/**
 * Wires click handler to open the task detail overlay.
 *
 * @param {HTMLElement} el
 * Task card element.
 * @param {Object} task
 * Task data object.
 */
function wireClickToDetail(el, task) {
  el.addEventListener("click", async () => {
    if (el.classList.contains("dragging")) return;
    if (!task?.id) return;
    window.openTaskDetailOverlay?.();
    await openDetailOverlayById(task.id);
  });
}
