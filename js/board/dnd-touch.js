import { dbApi } from "../core/firebase.js";
import { TASKS_ROOT, getData } from "./state.js";
import { buildOrderMapForZone, persistColumnOrder } from "./order.js";
import { findColumnOfTask, getDragAfterElement, getZoneStatus } from "./dnd-helpers.js";

let enabled = false;

/**
 * Enables touch drag & drop support if touch events are available.
 */
export function initDragTouchSupport() {
  enabled = "ontouchstart" in window;
}

/**
 * Wires touch drag handlers to a task element.
 *
 * @param {HTMLElement} el
 * Task DOM element.
 * @param {{id:string}} task
 * Task data object.
 */
export function wireTouchDragHandlers(el, task) {
  if (!enabled) return;
  el.addEventListener("touchstart", () => onTouchStart(el, task), { passive: false });
  el.addEventListener("touchmove", (e) => onTouchMove(e), { passive: false });
  el.addEventListener("touchend", (e) => onTouchEnd(e, el, task));
}

let currentZone = null;

/**
 * Handles the start of a touch drag gesture.
 *
 * @param {HTMLElement} el
 * Task element being dragged.
 * @param {{id:string}} task
 * Task data object.
 */

function onTouchStart(el, task) {
  if (!task?.id) return;
  el.classList.add("dragging");
  el.dataset.fromCol = findColumnOfTask(task.id) || "";
}

/**
 * Handles touch movement during dragging.
 *
 * @param {TouchEvent} e
 * Touch move event.
 */
function onTouchMove(e) {
  e.preventDefault();
  const touch = e.touches?.[0];
  if (!touch) return;
  currentZone = markZoneAt(touch.clientX, touch.clientY);
}

/**
 * Highlights the dropzone under the given coordinates.
 *
 * @param {number} x
 * Client X position.
 * @param {number} y
 * Client Y position.
 */
function markZoneAt(x, y) {
  const target = document.elementFromPoint(x, y);
  const zone = target?.closest(".dropzone");
  clearZoneMarks();
  if (zone) zone.classList.add("over");
  return zone || null;
}

/**
 * Clears all dropzone highlight states.
 */
function clearZoneMarks() {
  document.querySelectorAll(".dropzone.over").forEach((z) => z.classList.remove("over"));
}

/**
 * Handles the end of a touch drag gesture.
 *
 * @param {TouchEvent} e
 * Touch end event.
 * @param {HTMLElement} el
 * Dragged task element.
 * @param {{id:string}} task
 * Task data object.
 */
async function onTouchEnd(e, el, task) {
  el.classList.remove("dragging");
  clearZoneMarks();

  const fromCol = el.dataset.fromCol;
  const zone = currentZone;
  currentZone = null;

  if (!zone || !fromCol || !task?.id) return;
  const toCol = getZoneStatus(zone);
  if (!toCol) return;

  const y = e.changedTouches?.[0]?.clientY || 0;
  placeTouchEl(zone, el, y);
  await touchMoveOrReorder(zone, fromCol, toCol, task.id);
}

/**
 * Inserts the dragged element at the correct position inside a dropzone.
 *
 * @param {HTMLElement} zone
 * Target dropzone.
 * @param {HTMLElement} el
 * Dragged task element.
 * @param {number} y
 * Touch Y position.
 */
function placeTouchEl(zone, el, y) {
  const afterEl = getDragAfterElement(zone, y);
  if (!afterEl) zone.appendChild(el);
  else zone.insertBefore(el, afterEl);
}

/**
 * Moves or reorders a task depending on its target column.
 *
 * @param {HTMLElement} zone
 * Target dropzone.
 * @param {string} fromCol
 * Source column key.
 * @param {string} toCol
 * Target column key.
 * @param {string} id
 * Task ID.
 */
async function touchMoveOrReorder(zone, fromCol, toCol, id) {
  if (fromCol !== toCol) return await touchMoveTask(zone, fromCol, toCol, id);
  await persistColumnOrder(zone, toCol);
}

/**
 * Moves a task to another column and persists its order.
 *
 * @param {HTMLElement} zone
 * Target dropzone.
 * @param {string} fromCol
 * Source column key.
 * @param {string} toCol
 * Target column key.
 * @param {string} id
 * Task ID.
 */
async function touchMoveTask(zone, fromCol, toCol, id) {
  const taskObj = getData()[fromCol]?.[id];
  if (!taskObj) return;

  const orderMap = buildOrderMapForZone(zone, id);
  const updates = {};
  updates[`${fromCol}/${id}`] = null;
  updates[`${toCol}/${id}`] = { ...taskObj, id, order: orderMap[id] };

  await dbApi.updateData(TASKS_ROOT, updates);
  await persistColumnOrder(zone, toCol);
}
