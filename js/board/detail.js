/**
 * board/detail.js
 * Detail Overlay: öffnen, rendern, subtasks toggeln, löschen.
 */

import { dbApi } from "../core/firebase.js";
import { detailCloseBtn, detailDeleteBtn, detailSection } from "./dom.js";
import { TASKS_ROOT, COLS } from "./state.js";
import { escapeHtml, normalizeSubtasks, formatDate, capitalize, normalizeAssigneesToIds } from "./helpers.js";

let currentDetail = { id: null, col: null, task: null };
let subtasksHandlerWired = false;

export function initDetailBindings() {
  detailCloseBtn?.addEventListener("click", closeDetailOverlay);
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeDetailOverlay());
  window.addEventListener("click", (e) => e.target === detailSection && closeDetailOverlay());
  detailDeleteBtn?.addEventListener("click", onDeleteClick);
  window.closeDetailOverlay = closeDetailOverlay;
}

export function getCurrentDetail() {
  return currentDetail;
}

export function setCurrentDetail(next) {
  currentDetail = next;
}

export function closeDetailOverlay() {
  document.body.classList.remove("board-overlay-open");
  currentDetail = { id: null, col: null, task: null };
}

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

/* ---------- Helpers ---------- */

function findColumnOfTask(id) {
  const data = window.boardData || {};
  for (const c of COLS) if (data[c] && data[c][id]) return c;
  return null;
}

function normalizeTask(snap) {
  const subtasks = normalizeSubtasks(snap);
  return {
    ...snap,
    subtasks,
    subtasksTotal: subtasks.length,
    subtasksCompleted: subtasks.filter((x) => x.done).length,
  };
}

function buildAssignedDetailed(assignedContact) {
  const ids = normalizeAssigneesToIds(assignedContact);
  const maps = window.boardContacts || {};
  const byId = maps.contactsById || new Map();
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

function renderPriority(priority) {
  const prio = (priority || "low").toLowerCase();
  setText("detail-priority-text", capitalize(prio));
  const icon = document.getElementById("detail-priority-icon");
  if (icon) icon.src = `./assets/icons/${prio}.svg`;
}

function renderAssignees(list) {
  const box = document.getElementById("detail-assignees");
  if (!box) return;
  box.innerHTML = "";
  list.forEach((u) => (box.innerHTML += assigneeRow(u)));
}

function assigneeRow(u) {
  return `
    <div class="detail-user-row">
      <div class="user" style="background:${escapeHtml(u.color || "#999")}">${escapeHtml(u.initials || "?")}</div>
      <p>${escapeHtml(u.name || "")}</p>
    </div>
  `;
}

function renderSubtasks(subtasks) {
  const stList = document.getElementById("task-overlay-open-subtask-list");
  if (!stList) return;
  stList.innerHTML = "";
  subtasks.forEach((s, i) => (stList.innerHTML += subtaskRow(s, i)));
}

function subtaskRow(s, i) {
  return `
    <div class="task-overlay-open-subtask-item">
      <input type="checkbox" data-st-index="${i}" ${s.done ? "checked" : ""} />
      <p>${escapeHtml(s.text)}</p>
    </div>
  `;
}

function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

function setBg(id, color) {
  const el = document.getElementById(id);
  if (el) el.style.backgroundColor = color;
}

/* ---------- Subtasks Toggle ---------- */

function wireSubtaskToggleHandler() {
  if (subtasksHandlerWired) return;
  subtasksHandlerWired = true;

  const list = document.getElementById("task-overlay-open-subtask-list");
  list?.addEventListener("change", onSubtaskChange);
}

async function onSubtaskChange(e) {
  const cb = e.target.closest('input[type="checkbox"][data-st-index]');
  if (!cb || !currentDetail.task?.subtasks) return;

  const idx = Number(cb.dataset.stIndex);
  currentDetail.task.subtasks[idx].done = cb.checked;

  const done = currentDetail.task.subtasks.filter((x) => x.done).length;
  const total = currentDetail.task.subtasks.length;

  await saveSubtasks(currentDetail.col, currentDetail.id, currentDetail.task.subtasks, done, total);
}

async function saveSubtasks(col, id, subtasks, doneCount, totalCount) {
  const updates = {};
  updates[`${col}/${id}/subtasks`] = subtasks;
  updates[`${col}/${id}/subtasksCompleted`] = doneCount;
  updates[`${col}/${id}/subtasksTotal`] = totalCount;
  await dbApi.updateData(TASKS_ROOT, updates);
}

/* ---------- Delete ---------- */

async function onDeleteClick(e) {
  e.preventDefault();
  e.stopPropagation();
  const { id } = currentDetail || {};
  if (!id) return;
  await delTask(id);
  detailCloseBtn?.click();
}

async function delTask(id) {
  const col = findColumnOfTask(id);
  if (!col) return;
  await dbApi.deleteData(`${TASKS_ROOT}/${col}/${id}`);
}
