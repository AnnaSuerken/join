/**
 * board/dnd-helpers.js
 * Kleine DnD Helper (Zone, AfterElement, Column-Finder).
 */

import { COLS, getData } from "./state.js";

export function getZoneStatus(zoneEl) {
  return (
    {
      "task-table-todo": "todo",
      "task-table-progress": "inprogress",
      "task-table-feedback": "await",
      "task-table-done": "done",
    }[zoneEl?.id] || null
  );
}

export function getDragAfterElement(container, y) {
  const els = [...container.querySelectorAll(".task:not(.dragging)")];
  return els.reduce((closest, child) => pickClosest(closest, child, y), base()).element;
}

export function findColumnOfTask(id) {
  if (!id) return null;
  const data = getData();
  for (const c of COLS) if (data[c] && data[c][id]) return c;
  return null;
}

function base() {
  return { offset: Number.NEGATIVE_INFINITY, element: null };
}

function pickClosest(closest, child, y) {
  const box = child.getBoundingClientRect();
  const offset = y - box.top - box.height / 2;
  if (offset < 0 && offset > closest.offset) return { offset, element: child };
  return closest;
}
