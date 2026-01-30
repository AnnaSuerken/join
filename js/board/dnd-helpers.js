import { COLS, getData } from "./state.js";

/**
 * Resolves the board column key for a given dropzone element.
 *
 * @param {HTMLElement} zoneEl
 * Dropzone DOM element.
 */
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

/**
 * Determines the task element after which a dragged element should be inserted.
 *
 * @param {HTMLElement} container
 * Dropzone container element.
 * @param {number} y
 * Current mouse Y position.
 */
export function getDragAfterElement(container, y) {
  const els = [...container.querySelectorAll(".task:not(.dragging)")];
  return els.reduce((closest, child) => pickClosest(closest, child, y), base()).element;
}

/**
 * Finds the column key of a task by its ID.
 *
 * @param {string} id
 * Task ID.
 */
export function findColumnOfTask(id) {
  if (!id) return null;
  const data = getData();
  for (const c of COLS) if (data[c] && data[c][id]) return c;
  return null;
}

/**
 * Creates the initial accumulator for drag position calculation.
 */
function base() {
  return { offset: Number.NEGATIVE_INFINITY, element: null };
}

/**
 * Determines whether the current child element is closer than the previous one.
 *
 * @param {{offset:number, element:HTMLElement|null}} closest
 * Current closest match.
 * @param {HTMLElement} child
 * Task element being evaluated.
 * @param {number} y
 * Mouse Y position.
 */
function pickClosest(closest, child, y) {
  const box = child.getBoundingClientRect();
  const offset = y - box.top - box.height / 2;
  if (offset < 0 && offset > closest.offset) return { offset, element: child };
  return closest;
}
