/**
 * board/dnd-touch.js
 * Touch Drag&Drop: nutzt .dragging + dropzone highlight + order persist.
 */

import { dbApi } from "../core/firebase.js";
import { TASKS_ROOT, getData } from "./state.js";
import { buildOrderMapForZone, persistColumnOrder } from "./order.js";
import { findColumnOfTask, getDragAfterElement, getZoneStatus } from "./dnd-helpers.js";

let enabled = false;

export function initDragTouchSupport() {
  enabled = "ontouchstart" in window;
}

export function wireTouchDragHandlers(el, task) {
  if (!enabled) return;
  el.addEventListener("touchstart", () => onTouchStart(el, task), { passive: false });
  el.addEventListener("touchmove", (e) => onTouchMove(e), { passive: false });
  el.addEventListener("touchend", (e) => onTouchEnd(e, el, task));
}

let currentZone = null;

function onTouchStart(el, task) {
  if (!task?.id) return;
  el.classList.add("dragging");
  el.dataset.fromCol = findColumnOfTask(task.id) || "";
}

function onTouchMove(e) {
  e.preventDefault();
  const touch = e.touches?.[0];
  if (!touch) return;
  currentZone = markZoneAt(touch.clientX, touch.clientY);
}

function markZoneAt(x, y) {
  const target = document.elementFromPoint(x, y);
  const zone = target?.closest(".dropzone");
  clearZoneMarks();
  if (zone) zone.classList.add("over");
  return zone || null;
}

function clearZoneMarks() {
  document.querySelectorAll(".dropzone.over").forEach((z) => z.classList.remove("over"));
}

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

function placeTouchEl(zone, el, y) {
  const afterEl = getDragAfterElement(zone, y);
  if (!afterEl) zone.appendChild(el);
  else zone.insertBefore(el, afterEl);
}

async function touchMoveOrReorder(zone, fromCol, toCol, id) {
  if (fromCol !== toCol) return await touchMoveTask(zone, fromCol, toCol, id);
  await persistColumnOrder(zone, toCol);
}

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
