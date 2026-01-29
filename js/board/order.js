/**
 * board/order.js
 * Order persist + order-map.
 */

import { dbApi } from "../core/firebase.js";
import { TASKS_ROOT } from "./state.js";

export function buildOrderMapForZone(zone, draggedId) {
  const children = [...zone.querySelectorAll(".task")];
  const map = {};
  children.forEach((el, idx) => setOrder(map, el.dataset.id, idx));
  if (draggedId && !(draggedId in map)) map[draggedId] = children.length;
  return map;
}

export async function persistColumnOrder(zone, col) {
  const updates = buildOrderUpdates(zone, col);
  if (!Object.keys(updates).length) return;
  await dbApi.updateData(TASKS_ROOT, updates);
}

function buildOrderUpdates(zone, col) {
  const updates = {};
  [...zone.querySelectorAll(".task")].forEach((el, idx) => {
    const id = el.dataset.id;
    if (id) updates[`${col}/${id}/order`] = idx;
  });
  return updates;
}

function setOrder(map, id, idx) {
  if (id) map[id] = idx;
}
