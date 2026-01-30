import { dbApi } from "../core/firebase.js";
import {
  editSection, editCloseBtn, editOkBtn, detailEditBtn,
  editTitle, editDesc, editDate, prioBtns,
  editAssigneeSelect, editAssigneeOptions, editAssigneeList,
  editSubtaskInput, editSubtaskAddBtn, editSubtaskList,
} from "./dom.js";

import { TASKS_ROOT } from "./state.js";
import { escapeHtml, normalizeSubtasks, toISODateOnly, normalizeAssigneesToIds } from "./helpers.js";
import { getCurrentDetail, renderDetail, setCurrentDetail } from "./detail.js";

let editPriority = "medium";
let selectedAssigneeIds = [];
let editSubtasks = [];

/**
 * Initializes all edit overlay bindings.
 */
export function initEditBindings() {
  bindPriorityButtons();
  bindOpenClose();
  bindSave();
  bindAssigneeDropdown();
  bindSubtaskEditor();
}

/**
 * Binds open/close actions for the edit overlay.
 */
function bindOpenClose() {
  detailEditBtn?.addEventListener("click", openEditOverlay);
  editCloseBtn?.addEventListener("click", closeEditOverlay);
  document.addEventListener("keydown", (e) => isEditOpen() && e.key === "Escape" && closeEditOverlay());
}

/**
 * Binds save button handler.
 */
function bindSave() {
  editOkBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    saveEditOverlay();
  });
}

/**
 * Wires priority button click handlers.
 */
function bindPriorityButtons() {
  Object.entries(prioBtns).forEach(([key, btn]) => {
    btn?.addEventListener("click", (e) => {
      e.preventDefault();
      setEditPriority(key);
    });
  });
}

/**
 * Sets the active edit priority.
 *
 * @param {string} p
 * Priority value.
 */
function setEditPriority(p) {
  const allowed = ["urgent", "medium", "low"];
  editPriority = allowed.includes(p) ? p : "medium";
  Object.entries(prioBtns).forEach(([k, btn]) => togglePrioBtn(k, btn, editPriority));
}

/**
 * Toggles priority button active state.
 */
function togglePrioBtn(key, btn, active) {
  if (!btn) return;
  btn.classList.toggle("is-active", key === active);
  updatePrioIcon(btn, key, key === active);
}

/**
 * Updates priority icon depending on active state.
 */
function updatePrioIcon(btn, key, isActive) {
  const img = btn.querySelector("img");
  if (!img) return;
  img.src = prioIconPath(key, isActive);
}

/**
 * Returns the icon path for a priority.
 */
function prioIconPath(key, active) {
  if (key === "urgent") return active ? "./assets/icons/urgent-white.svg" : "./assets/icons/urgent-red.svg";
  if (key === "medium") return active ? "./assets/icons/medium-white.svg" : "./assets/icons/medium-orange.svg";
  return active ? "./assets/icons/low-white.svg" : "./assets/icons/low-green.svg";
}

/**
 * Opens the edit overlay and initializes fields.
 */
function openEditOverlay() {
  const detail = getCurrentDetail();
  if (!detail?.task) return;

  fillFields(detail.task);
  initMinDate(detail.task);
  initAssignees(detail.task);
  initSubtasks(detail.task);

  hideDetailShowEdit();
}

/**
 * Closes the edit overlay.
 */
function closeEditOverlay() {
  editSection?.classList.add("d_none");
  document.body.classList.remove("board-overlay-open");
  document.getElementById("task-detail-overlay")?.classList.remove("d_none");
}

/**
 * Hides detail view and shows edit overlay.
 */
function hideDetailShowEdit() {
  document.getElementById("task-detail-overlay")?.classList.add("d_none");
  editSection?.classList.remove("d_none");
  document.body.classList.add("board-overlay-open");
}

/**
 * Checks if the edit overlay is currently open.
 */
function isEditOpen() {
  return editSection && !editSection.classList.contains("d_none");
}

/**
 * Fills edit form fields with task data.
 *
 * @param {object} task
 */
function fillFields(task) {
  editTitle.value = task.title || "";
  editDesc.value = task.secondline || "";
  setDateValue(task.deadline);
  setEditPriority((task.priority || "medium").toString().toLowerCase());
}

/**
 * Sets the date input value from a deadline.
 */
function setDateValue(deadline) {
  if (!deadline) return (editDate.value = "");
  const d = new Date(deadline);
  editDate.value = isNaN(d) ? "" : toISODateOnly(d);
}

/**
 * Initializes minimum selectable date based on creation date.
 */
function initMinDate(task) {
  const createdAt = getCreatedAt(task);
  const minStr = toISODateOnly(createdAt);
  editDate.min = minStr;
  const hint = document.getElementById("edit-date-hint");
  if (hint) hint.textContent = `Earliest: ${minStr}`;
}

/**
 * Resolves the task creation date.
 *
 * @param {object} task
 */
function getCreatedAt(task) {
  const s = task.createdAt || task.created || task.created_at || null;
  const d = s ? new Date(s) : new Date();
  return isNaN(d) ? new Date() : d;
}

/**
 * Binds dropdown open/close logic for assignee selection.
 */
function bindAssigneeDropdown() {
  editAssigneeSelect?.addEventListener("click", () => toggleEditAssigneeDropdown(isAssigneeClosed()));
  document.addEventListener("click", (e) => closeAssigneeOnOutside(e));
}

/**
 * Closes assignee dropdown when clicking outside.
 *
 * @param {MouseEvent} e
 */
function closeAssigneeOnOutside(e) {
  if (!isEditOpen()) return;
  if (!editAssigneeSelect.contains(e.target) && !editAssigneeOptions.contains(e.target)) {
    toggleEditAssigneeDropdown(false);
  }
}

/**
 * Checks whether the assignee dropdown is closed.
 */
function isAssigneeClosed() {
  return editAssigneeOptions?.classList.contains("d_none");
}

/**
 * Toggles assignee dropdown visibility.
 *
 * @param {boolean} open
 */
function toggleEditAssigneeDropdown(open) {
  editAssigneeOptions?.classList.toggle("d_none", !open);
  document.getElementById("edit-assignee-list")?.classList.toggle("d_none", open);
  editAssigneeSelect?.setAttribute("aria-expanded", String(open));
}

/**
 * Initializes assignees from the given task.
 *
 * @param {object} task
 */
function initAssignees(task) {
  selectedAssigneeIds = normalizeAssigneesToIds(task.assignedContact);
  renderEditAssigneeChips();
  renderEditAssigneeOptions();
  const lbl = editAssigneeSelect?.querySelector(".assignee-select-label");
  if (lbl) lbl.textContent = "Select contacts to assign";
}

/**
 * Renders selected assignee chips.
 */
function renderEditAssigneeChips() {
  if (!editAssigneeList) return;
  editAssigneeList.innerHTML = "";
  getSelectedContacts().forEach((c) => editAssigneeList.appendChild(chipRow(c)));
}

/**
 * Creates a chip row element for a contact.
 *
 * @param {object} c
 */
function chipRow(c) {
  const row = document.createElement("div");
  row.className = "detail-user-row";
  row.innerHTML = chipRowHtml(c);
  row.querySelector(".remove-assignee")?.addEventListener("click", () => removeAssignee(c.id));
  return row;
}

/**
 * Returns HTML for an assignee chip row.
 */
function chipRowHtml(c) {
  return `
    <div class="user" style="background:${escapeHtml(c.color || "#999")}">${escapeHtml(c.initials || "?")}</div>
    <p>${escapeHtml(c.name || "")}</p>
    <button class="remove-assignee" title="Entfernen" data-id="${escapeHtml(c.id)}">✕</button>
  `;
}

/**
 * Removes an assignee by id.
 *
 * @param {string} id
 */
function removeAssignee(id) {
  selectedAssigneeIds = selectedAssigneeIds.filter((x) => x !== id);
  renderEditAssigneeChips();
  renderEditAssigneeOptions();
}

/**
 * Renders assignee dropdown options.
 */
function renderEditAssigneeOptions() {
  if (!editAssigneeOptions) return;
  editAssigneeOptions.innerHTML = "";
  getAllContacts().forEach((c) => editAssigneeOptions.appendChild(optionLi(c)));
}

/**
 * Creates an option list item for a contact.
 *
 * @param {object} c
 */
function optionLi(c) {
  const li = document.createElement("li");
  const selected = selectedAssigneeIds.includes(c.id);

  li.role = "option";
  li.tabIndex = 0;
  li.className = "assignee-option" + (selected ? " is-selected" : "");
  li.innerHTML = optionHtml(c);

  li.addEventListener("click", () => toggleAssignee(c.id));
  li.addEventListener("keydown", (e) => onOptionKey(e, c.id));

  return li;
}

/**
 * Returns HTML for an assignee dropdown option.
 */
function optionHtml(c) {
  return `
    <span class="assignee-avatar" style="background:${escapeHtml(c.color)}">${escapeHtml(c.initials)}</span>
    <span>${escapeHtml(c.name)}</span>
    <span class="assignee-check">✔</span>
  `;
}

/**
 * Handles keyboard selection on dropdown options.
 */
function onOptionKey(e, id) {
  if (e.key !== "Enter" && e.key !== " ") return;
  e.preventDefault();
  toggleAssignee(id);
}

/**
 * Toggles assignee selection.
 *
 * @param {string} id
 */
function toggleAssignee(id) {
  selectedAssigneeIds = selectedAssigneeIds.includes(id)
    ? selectedAssigneeIds.filter((x) => x !== id)
    : [...selectedAssigneeIds, id];

  renderEditAssigneeChips();
  renderEditAssigneeOptions();
}

/**
 * Returns all contacts sorted by name.
 *
 * @returns {object[]}
 */
function getAllContacts() {
  const maps = window.boardContacts || {};
  const byId = maps.contactsById || new Map();
  return [...byId.values()].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

/**
 * Returns selected contacts.
 *
 * @returns {object[]}
 */
function getSelectedContacts() {
  const maps = window.boardContacts || {};
  const byId = maps.contactsById || new Map();
  return selectedAssigneeIds.map((id) => byId.get(id)).filter(Boolean);
}

/**
 * Binds subtask editor events.
 */
function bindSubtaskEditor() {
  editSubtaskAddBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    addEditSubtask();
  });

  editSubtaskInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addEditSubtask();
    }
  });
}

/**
 * Initializes subtasks from task data.
 *
 * @param {object} task
 */
function initSubtasks(task) {
  editSubtasks = normalizeSubtasks(task).map((s) => ({ text: s.text, done: !!s.done }));
  renderEditSubtasks();
}

/**
 * Adds a new subtask from input.
 */
function addEditSubtask() {
  const val = (editSubtaskInput?.value || "").trim();
  if (!val) return;
  editSubtasks.push({ text: val, done: false });
  editSubtaskInput.value = "";
  renderEditSubtasks();
}

/**
 * Renders all editable subtasks.
 */
function renderEditSubtasks() {
  if (!editSubtaskList) return;
  editSubtaskList.innerHTML = "";
  editSubtasks.forEach((st, i) => editSubtaskList.appendChild(subtaskRow(st, i)));
}

/**
 * Creates a subtask edit row.
 */
function subtaskRow(st, i) {
  const row = document.createElement("div");
  row.className = "subtask-edit-row";
  row.innerHTML = subtaskRowHtml(st, i);

  wireSubtaskRow(row, i);
  return row;
}

/**
 * Returns HTML for subtask edit row.
 */
function subtaskRowHtml(st, i) {
  return `
    <input type="checkbox" ${st.done ? "checked" : ""} data-i="${i}" />
    <input type="text" value="${escapeHtml(st.text)}" data-i="${i}" />
    <button class="icon-btn" title="Löschen" data-i="${i}">
      <img src="./assets/icons/delete.svg" alt="" />
    </button>
  `;
}

/**
 * Binds subtask row interactions.
 */
function wireSubtaskRow(row, i) {
  const cb = row.querySelector('input[type="checkbox"]');
  const txt = row.querySelector('input[type="text"]');
  const del = row.querySelector("button");

  cb?.addEventListener("change", () => (editSubtasks[i].done = cb.checked));
  txt?.addEventListener("input", () => (editSubtasks[i].text = txt.value));
  del?.addEventListener("click", (e) => onDelSubtask(e, i));
}

/**
 * Deletes a subtask.
 */
function onDelSubtask(e, i) {
  e.preventDefault();
  editSubtasks.splice(i, 1);
  renderEditSubtasks();
}

/**
 * Saves edited task data to database.
 */
async function saveEditOverlay() {
  const detail = getCurrentDetail();
  if (!detail?.id || !detail?.col || !detail.task) return;

  const updated = buildUpdatedTask(detail.task);
  if (!updated) return;

  await dbApi.updateData(TASKS_ROOT, { [`${detail.col}/${detail.id}`]: updated });
  syncDetailAfterSave(detail, updated);
  closeEditOverlay();
  toast("Task updated successfully.");
}

/**
 * Builds the updated task object from edit form values.
 *
 * @param {object} task
 * Original task data.
 */
function buildUpdatedTask(task) {
  const title = editTitle.value.trim();
  const secondline = editDesc.value.trim();

  const createdAt = getCreatedAt(task);
  const deadlineISO = buildDeadlineISO(createdAt);
  if (deadlineISO === null) return null;

  const subtasks = cleanSubtasks(editSubtasks);
  const doneCount = subtasks.filter((s) => s.done).length;

  return {
    ...task,
    title,
    secondline,
    deadline: deadlineISO,
    priority: editPriority,
    assignedContact: [...selectedAssigneeIds],
    subtasks,
    subtasksCompleted: doneCount,
    subtasksTotal: subtasks.length,
    createdAt: task.createdAt || task.created || task.created_at || new Date().toISOString(),
  };
}

/**
 * Builds an ISO deadline string and validates against creation date.
 *
 * @param {Date} createdAt
 */

function buildDeadlineISO(createdAt) {
  if (!editDate.value) return "";
  const chosen = new Date(editDate.value);
  chosen.setHours(0, 0, 0, 0);

  const min = new Date(createdAt);
  min.setHours(0, 0, 0, 0);

  if (chosen < min) return failMinDate(min);
  return toUTCISODateOnly(chosen);
}

/**
 * Shows validation error for invalid deadline.
 *
 * @param {Date} min
 */
function failMinDate(min) {
  const msg = `Das Fälligkeitsdatum darf nicht vor dem Erstellungsdatum liegen (${toISODateOnly(min)}).`;
  toast(msg);
  return null;
}

/**
 * Converts a date to UTC ISO string (date only).
 *
 * @param {Date} d
 */
function toUTCISODateOnly(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
}

/**
 * Cleans and normalizes subtasks.
 *
 * @param {Array} list
 */
function cleanSubtasks(list) {
  return list
    .map((s) => ({ text: (s.text || "").trim(), done: !!s.done }))
    .filter((s) => s.text.length > 0);
}

/**
 * Syncs detail overlay after saving task.
 *
 * @param {object} detail
 * @param {object} updatedTask
 */
function syncDetailAfterSave(detail, updatedTask) {
  const assignedDetailed = buildAssignedDetailed(updatedTask.assignedContact);
  setCurrentDetail({ ...detail, task: { ...updatedTask, assignedDetailed } });
  renderDetail({ ...updatedTask, assignedDetailed });
}

/**
 * Resolves assignee IDs to full contact objects.
 *
 * @param {string[]|string} idsVal
 */
function buildAssignedDetailed(idsVal) {
  const maps = window.boardContacts || {};
  const byId = maps.contactsById || new Map();
  return normalizeAssigneesToIds(idsVal).map((id) => byId.get(id)).filter(Boolean);
}

/**
 * Shows a toast message.
 *
 * @param {string} msg
 */
function toast(msg) {
  if (typeof window.showToast === "function") window.showToast(msg);
  else alert(msg);
}
