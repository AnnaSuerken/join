/**
 * board/render.js
 * Rendert das Board + Search.
 */

import { colsEl, searchInput } from "./dom.js";
import { COLS, getData } from "./state.js";
import { taskCard } from "./task-card.js";

export function initSearch() {
  searchInput?.addEventListener("input", renderBoard);
}

export function renderBoard() {
  clearColumns();
  const filter = getFilter();
  COLS.forEach((col) => renderColumn(col, filter));
}

function clearColumns() {
  COLS.forEach((c) => colsEl[c] && (colsEl[c].innerHTML = ""));
}

function getFilter() {
  return (searchInput?.value || "").trim().toLowerCase();
}

function renderColumn(col, filter) {
  const colEl = colsEl[col];
  if (!colEl) return;

  const list = toTaskList(getData()[col]);
  const filtered = filterTasks(list, filter);
  if (!filtered.length) return renderEmpty(colEl, col);

  filtered.forEach((t) => colEl.appendChild(taskCard(t)));
}

function toTaskList(obj) {
  return Object.entries(obj || {}).map(([id, t]) => ({ ...t, id: t?.id || id }));
}

function filterTasks(list, filter) {
  return list
    .filter((t) => matchesFilter(t, filter))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function matchesFilter(t, filter) {
  if (!filter) return true;
  return (
    (t.title || "").toLowerCase().includes(filter) ||
    (t.secondline || "").toLowerCase().includes(filter)
  );
}

function renderEmpty(colEl, col) {
  const div = document.createElement("div");
  div.className = "no-task-placeholder";
  div.textContent = emptyText(col);
  colEl.appendChild(div);
}

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
