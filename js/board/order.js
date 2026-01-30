import { dbApi } from "../core/firebase.js";
import { TASKS_ROOT } from "./state.js";

/**
 * Builds an order map for a given dropzone.
 *
 * @param {HTMLElement} zone
 * Dropzone element containing task cards.
 * @param {string} [draggedId]
 * Optional task ID that was just dragged.
 */
export function buildOrderMapForZone(zone, draggedId) {
  const children = [...zone.querySelectorAll(".task")];
  const map = {};
  children.forEach((el, idx) => setOrder(map, el.dataset.id, idx));
  if (draggedId && !(draggedId in map)) map[draggedId] = children.length;
  return map;
}

/**
 * Persists the current task order of a column to the database.
 *
 * @param {HTMLElement} zone
 * Dropzone element containing tasks.
 * @param {string} col
 * Column identifier.
 */
export async function persistColumnOrder(zone, col) {
  const updates = buildOrderUpdates(zone, col);
  if (!Object.keys(updates).length) return;
  await dbApi.updateData(TASKS_ROOT, updates);
}

/**
 * Builds database update payload for task order.
 *
 * @param {HTMLElement} zone
 * Dropzone element.
 * @param {string} col
 * Column identifier.
 */
function buildOrderUpdates(zone, col) {
  const updates = {};
  [...zone.querySelectorAll(".task")].forEach((el, idx) => {
    const id = el.dataset.id;
    if (id) updates[`${col}/${id}/order`] = idx;
  });
  return updates;
}

/**
 * Sets an order value in an order map.
 *
 * @param {Object<string, number>} map
 * Order map.
 * @param {string} id
 * Task ID.
 * @param {number} idx
 * Order index.
 */
function setOrder(map, id, idx) {
  if (id) map[id] = idx;
}
