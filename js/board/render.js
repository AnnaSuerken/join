import { colsEl, searchInput } from "./dom.js";
import { COLS, getData } from "./state.js";
import { taskCard } from "./task-card.js";

/**
 * Initializes live board search.
 */
export function initSearch() {
  searchInput?.addEventListener("input", renderBoard);
}

/**
 * Renders the entire board.
 */
export function renderBoard() {
  clearColumns();
  const filter = getFilter();
  COLS.forEach((col) => renderColumn(col, filter));
}

/**
 * Clears all task columns.
 */
function clearColumns() {
  COLS.forEach((c) => colsEl[c] && (colsEl[c].innerHTML = ""));
}

/**
 * Returns the current normalized search filter.
 */
function getFilter() {
  return (searchInput?.value || "").trim().toLowerCase();
}


/**
 * Renders a single board column.
 *
 * @param {string} col
 * Column identifier.
 * @param {string} filter
 * Search filter string.
 */
function renderColumn(col, filter) {
  const colEl = colsEl[col];
  if (!colEl) return;

  const list = toTaskList(getData()[col]);
  const filtered = filterTasks(list, filter);
  if (!filtered.length) return renderEmpty(colEl, col);

  filtered.forEach((t) => colEl.appendChild(taskCard(t)));
}

/**
 * Converts a task object map into a list.
 *
 * @param {Object<string,Object>} obj
 * Task object map.
 */
function toTaskList(obj) {
  return Object.entries(obj || {}).map(([id, t]) => ({ ...t, id: t?.id || id }));
}

/**
 * Filters and sorts tasks.
 *
 * @param {Array<Object>} list
 * Task list.
 * @param {string} filter
 * Search filter string.
 */
function filterTasks(list, filter) {
  return list
    .filter((t) => matchesFilter(t, filter))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Checks if a task matches the search filter.
 *
 * @param {Object} t
 * Task object.
 * @param {string} filter
 * Search filter string.
 */
function matchesFilter(t, filter) {
  if (!filter) return true;
  return (
    (t.title || "").toLowerCase().includes(filter) ||
    (t.secondline || "").toLowerCase().includes(filter)
  );
}

/**
 * Renders an empty column placeholder.
 *
 * @param {HTMLElement} colEl
 * Column container element.
 * @param {string} col
 * Column identifier.
 */
function renderEmpty(colEl, col) {
  const div = document.createElement("div");
  div.className = "no-task-placeholder";
  div.textContent = emptyText(col);
  colEl.appendChild(div);
}

/**
 * Returns the empty state text for a column.
 *
 * @param {string} col
 * Column identifier.
 */
function emptyText(col) {
  return (
    {
      todo: "No task to do",
      inprogress: "No task in progress",
      await: "No Tasks Awaiting Feedback",
      done: "No Tasks Done",
    }[col] || "No task to do"
  );
}
