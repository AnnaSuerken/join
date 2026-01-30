import { dbApi } from "../core/firebase.js";
import { detailCloseBtn, detailDeleteBtn, detailSection } from "./dom.js";
import { TASKS_ROOT, COLS } from "./state.js";
import { escapeHtml, normalizeSubtasks, formatDate, capitalize, normalizeAssigneesToIds } from "./helpers.js";

let currentDetail = { id: null, col: null, task: null };
let subtasksHandlerWired = false;

/**
 * Initializes global event bindings for the detail overlay.
 */
export function initDetailBindings() {
  detailCloseBtn?.addEventListener("click", closeDetailOverlay);
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeDetailOverlay());
  window.addEventListener("click", (e) => e.target === detailSection && closeDetailOverlay());
  detailDeleteBtn?.addEventListener("click", onDeleteClick);
  window.closeDetailOverlay = closeDetailOverlay;
}

/**
 * Returns the currently active task detail.
 */
export function getCurrentDetail() {
  return currentDetail;
}

/**
 * Sets the current task detail state.
 */
export function setCurrentDetail(next) {
  currentDetail = next;
}

/**
 * Closes the task detail overlay and resets state.
 */
export function closeDetailOverlay() {
  document.body.classList.remove("board-overlay-open");
  currentDetail = { id: null, col: null, task: null };
}

/**
 * Opens the detail overlay for a task by its ID.
 *
 * @param {string} id
 * Task ID.
 */
export async function openDetailOverlayById(id) {
  const col = findColumnOfTask(id);
  if (!col) return;

  const snap = await dbApi.getData(`${TASKS_ROOT}/${col}/${id}`);
  if (!snap) return;

  const normalized = normalizeTask(snap);
  const assignedDetailed = buildAssignedDetailed(normalized.assignedContact);

  currentDetail = { id, col, task: { ...normalized, assignedDetailed } };
  renderDetail(currentDetail.task);

  document.body.classList.add("board-overlay-open");
  wireSubtaskToggleHandler();
}

/**
 * Renders all visible task details into the overlay.
 *
 * @param {Object} task
 * Normalized task object.
 */
export function renderDetail(task) {
  setText("detail-category", task.category || "No Category");
  setBg("detail-category", task.categorycolor || "#0038ff");
  setText("detail-title", task.title || "");
  setText("detail-desc", task.secondline || "");
  setText("detail-date", formatDate(task.deadline));

  renderPriority(task.priority);
  renderAssignees(task.assignedDetailed || []);
  renderSubtasks(task.subtasks || []);
}

/**
 * Finds the column of a task by its ID.
 *
 * @param {string} id
 * Task ID.
 */
function findColumnOfTask(id) {
  const data = window.boardData || {};
  for (const c of COLS) if (data[c] && data[c][id]) return c;
  return null;
}

/**
 * Normalizes a task snapshot from the database.
 *
 * @param {Object} snap
 * Raw task data.
 */
function normalizeTask(snap) {
  const subtasks = normalizeSubtasks(snap);
  return {
    ...snap,
    subtasks,
    subtasksTotal: subtasks.length,
    subtasksCompleted: subtasks.filter((x) => x.done).length,
  };
}

/**
 * Builds detailed assignee objects from assigned contact IDs.
 *
 * @param {string|string[]} assignedContact
 * Raw assigned contact reference(s).
 */
function buildAssignedDetailed(assignedContact) {
  const ids = normalizeAssigneesToIds(assignedContact);
  const maps = window.boardContacts || {};
  const byId = maps.contactsById || new Map();
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

/**
 * Renders the task priority text and icon.
 *
 * @param {string} priority
 */
function renderPriority(priority) {
  const prio = (priority || "low").toLowerCase();
  setText("detail-priority-text", capitalize(prio));
  const icon = document.getElementById("detail-priority-icon");
  if (icon) icon.src = `./assets/icons/${prio}.svg`;
}

/**
 * Renders the assignee list.
 *
 * @param {Array<Object>} list
 */
function renderAssignees(list) {
  const box = document.getElementById("detail-assignees");
  if (!box) return;
  box.innerHTML = "";
  list.forEach((u) => (box.innerHTML += assigneeRow(u)));
}

/**
 * Returns the HTML for a single assignee row.
 *
 * @param {Object} u
 * Assignee data.
 */
function assigneeRow(u) {
  return `
    <div class="detail-user-row">
      <div class="user" style="background:${escapeHtml(u.color || "#999")}">${escapeHtml(u.initials || "?")}</div>
      <p>${escapeHtml(u.name || "")}</p>
    </div>
  `;
}

/**
 * Renders the task subtasks list.
 *
 * @param {Array<Object>} subtasks
 */
function renderSubtasks(subtasks) {
  const stList = document.getElementById("task-overlay-open-subtask-list");
  if (!stList) return;
  stList.innerHTML = "";
  subtasks.forEach((s, i) => (stList.innerHTML += subtaskRow(s, i)));
}

/**
 * Returns the HTML for a single subtask row.
 *
 * @param {{text:string,done:boolean}} s
 * Subtask data.
 * @param {number} i
 * Subtask index.
 */
function subtaskRow(s, i) {
  return `
    <div class="task-overlay-open-subtask-item">
      <input type="checkbox" data-st-index="${i}" ${s.done ? "checked" : ""} />
      <p>${escapeHtml(s.text)}</p>
    </div>
  `;
}

/**
 * Sets the text content of an element by ID.
 *
 * @param {string} id
 * Element ID.
 * @param {string} txt
 * Text content.
 */
function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

/**
 * Sets the background color of an element by ID.
 *
 * @param {string} id
 * Element ID.
 * @param {string} color
 * CSS color value.
 */
function setBg(id, color) {
  const el = document.getElementById(id);
  if (el) el.style.backgroundColor = color;
}

/**
 * Wires the subtask checkbox toggle handler once.
 */
function wireSubtaskToggleHandler() {
  if (subtasksHandlerWired) return;
  subtasksHandlerWired = true;

  const list = document.getElementById("task-overlay-open-subtask-list");
  list?.addEventListener("change", onSubtaskChange);
}

/**
 * Handles subtask checkbox toggle events.
 *
 * @param {Event} e
 */
async function onSubtaskChange(e) {
  const cb = e.target.closest('input[type="checkbox"][data-st-index]');
  if (!cb || !currentDetail.task?.subtasks) return;

  const idx = Number(cb.dataset.stIndex);
  currentDetail.task.subtasks[idx].done = cb.checked;

  const done = currentDetail.task.subtasks.filter((x) => x.done).length;
  const total = currentDetail.task.subtasks.length;

  await saveSubtasks(currentDetail.col, currentDetail.id, currentDetail.task.subtasks, done, total);
}

/**
 * Persists updated subtask state to the database.
 *
 * @param {string} col
 * Task column.
 * @param {string} id
 * Task ID.
 * @param {Array<Object>} subtasks
 * Subtask list.
 * @param {number} doneCount
 * Completed subtask count.
 * @param {number} totalCount
 * Total subtask count.
 */
async function saveSubtasks(col, id, subtasks, doneCount, totalCount) {
  const updates = {};
  updates[`${col}/${id}/subtasks`] = subtasks;
  updates[`${col}/${id}/subtasksCompleted`] = doneCount;
  updates[`${col}/${id}/subtasksTotal`] = totalCount;
  await dbApi.updateData(TASKS_ROOT, updates);
}

/**
 * Handles delete button click inside the detail overlay.
 *
 * @param {MouseEvent} e
 */
async function onDeleteClick(e) {
  e.preventDefault();
  e.stopPropagation();
  const { id } = currentDetail || {};
  if (!id) return;
  await delTask(id);
  detailCloseBtn?.click();
}

/**
 * Deletes a task by ID.
 *
 * @param {string} id
 * Task ID.
 */
async function delTask(id) {
  const col = findColumnOfTask(id);
  if (!col) return;
  await dbApi.deleteData(`${TASKS_ROOT}/${col}/${id}`);
}
