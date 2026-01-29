/**
 * board/dnd-desktop.js
 * Desktop Drag&Drop: dragstart/dragend + dropzones.
 */

import { dbApi } from "../core/firebase.js";
import { safeParse } from "./helpers.js";
import { TASKS_ROOT, getData } from "./state.js";
import { buildOrderMapForZone, persistColumnOrder } from "./order.js";
import { findColumnOfTask, getDragAfterElement, getZoneStatus } from "./dnd-helpers.js";

export function initDropzonesDesktop() {
  document.querySelectorAll(".dropzone").forEach(bindZone);
}

export function wireDesktopDragHandlers(el, task) {
  el.addEventListener("dragstart", (e) => onDragStart(e, el, task));
  el.addEventListener("dragend", () => el.classList.remove("dragging"));
}

function bindZone(zone) {
  zone.addEventListener("dragover", (e) => onDragOver(e, zone));
  zone.addEventListener("dragleave", () => zone.classList.remove("over"));
  zone.addEventListener("drop", (e) => onDrop(e, zone));
}

function onDragOver(e, zone) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  zone.classList.add("over");
}

function onDragStart(e, el, task) {
  const id = task.id || el.dataset.id;
  const fromCol = findColumnOfTask(id);
  if (!id || !fromCol) return cancelDrag(e, el);

  el.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", JSON.stringify({ id, fromCol }));
}

function cancelDrag(e, el) {
  e.preventDefault();
  el.classList.remove("dragging");
}

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

function placeDraggedEl(zone, id, y) {
  const afterEl = getDragAfterElement(zone, y);
  const draggedEl = document.querySelector(`.task[data-id="${CSS.escape(id)}"]`);
  if (!draggedEl) return;
  if (!afterEl) zone.appendChild(draggedEl);
  else zone.insertBefore(draggedEl, afterEl);
}

async function moveOrReorder(zone, fromCol, toCol, id) {
  if (fromCol !== toCol) return await moveTask(zone, fromCol, toCol, id);
  await persistColumnOrder(zone, toCol);
}

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
