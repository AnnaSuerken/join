import { dbApi } from "../core/firebase.js";
import { safeParse } from "./helpers.js";
import { TASKS_ROOT, getData } from "./state.js";
import { buildOrderMapForZone, persistColumnOrder } from "./order.js";
import { findColumnOfTask, getDragAfterElement, getZoneStatus } from "./dnd-helpers.js";

/**
 * Initializes all desktop dropzones.
 */
export function initDropzonesDesktop() {
  document.querySelectorAll(".dropzone").forEach(bindZone);
}

/**
 * Wires drag handlers to a draggable task element.
 *
 * @param {HTMLElement} el
 * Draggable task element.
 * @param {Object} task
 * Task data object.
 */
export function wireDesktopDragHandlers(el, task) {
  el.addEventListener("dragstart", (e) => onDragStart(e, el, task));
  el.addEventListener("dragend", () => el.classList.remove("dragging"));
}

/**
 * Attaches drag & drop listeners to a dropzone.
 *
 * @param {HTMLElement} zone
 * Dropzone element.
 */
function bindZone(zone) {
  zone.addEventListener("dragover", (e) => onDragOver(e, zone));
  zone.addEventListener("dragleave", () => zone.classList.remove("over"));
  zone.addEventListener("drop", (e) => onDrop(e, zone));
}

/**
 * Handles dragover events on a dropzone.
 *
 * @param {DragEvent} e
 * @param {HTMLElement} zone
 */
function onDragOver(e, zone) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  zone.classList.add("over");
}

/**
 * Handles drag start on a task element.
 *
 * @param {DragEvent} e
 * @param {HTMLElement} el
 * @param {Object} task
 */
function onDragStart(e, el, task) {
  const id = task.id || el.dataset.id;
  const fromCol = findColumnOfTask(id);
  if (!id || !fromCol) return cancelDrag(e, el);

  el.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", JSON.stringify({ id, fromCol }));
}

/**
 * Cancels an invalid drag operation.
 *
 * @param {DragEvent} e
 * @param {HTMLElement} el
 */
function cancelDrag(e, el) {
  e.preventDefault();
  el.classList.remove("dragging");
}

/**
 * Handles dropping a task into a dropzone.
 *
 * @param {DragEvent} e
 * @param {HTMLElement} zone
 */
async function onDrop(e, zone) {
  e.preventDefault();
  zone.classList.remove("over");

  const payload = safeParse(e.dataTransfer.getData("text/plain"));
  if (!payload?.id || !payload?.fromCol) return;

  const toCol = getZoneStatus(zone);
  if (!toCol) return;

  placeDraggedEl(zone, payload.id, e.clientY);
  await moveOrReorder(zone, payload.fromCol, toCol, payload.id);
}

/**
 * Inserts the dragged task element at the correct position.
 *
 * @param {HTMLElement} zone
 * @param {string} id
 * Task ID.
 * @param {number} y
 * Mouse Y coordinate.
 */
function placeDraggedEl(zone, id, y) {
  const afterEl = getDragAfterElement(zone, y);
  const draggedEl = document.querySelector(`.task[data-id="${CSS.escape(id)}"]`);
  if (!draggedEl) return;
  if (!afterEl) zone.appendChild(draggedEl);
  else zone.insertBefore(draggedEl, afterEl);
}

/**
 * Decides whether to move a task between columns or just reorder.
 *
 * @param {HTMLElement} zone
 * @param {string} fromCol
 * @param {string} toCol
 * @param {string} id
 */
async function moveOrReorder(zone, fromCol, toCol, id) {
  if (fromCol !== toCol) return await moveTask(zone, fromCol, toCol, id);
  await persistColumnOrder(zone, toCol);
}

/**
 * Moves a task to another column and persists order.
 *
 * @param {HTMLElement} zone
 * @param {string} fromCol
 * @param {string} toCol
 * @param {string} id
 */
async function moveTask(zone, fromCol, toCol, id) {
  const taskObj = getData()[fromCol]?.[id];
  if (!taskObj) return;

  const orderMap = buildOrderMapForZone(zone, id);
  const updates = {};
  updates[`${fromCol}/${id}`] = null;
  updates[`${toCol}/${id}`] = { ...taskObj, id, order: orderMap[id] };

  await dbApi.updateData(TASKS_ROOT, updates);
  await persistColumnOrder(zone, toCol);
}
