import { dbApi } from "../core/firebase.js";
import {
  editSection, editCloseBtn, editOkBtn, detailEditBtn,
  editTitle, editDesc, editDate, prioBtns,
  editAssigneeSelect, editAssigneeOptions, editAssigneeList,
  editSubtaskInput, editSubtaskAddBtn, editSubtaskList,
} from "./dom.js";

import { TASKS_ROOT } from "./state.js";
import { toISODateOnly } from "./helpers.js";
import { getCurrentDetail, renderDetail, setCurrentDetail } from "./detail.js";

import { createAssigneeEditor, createSubtaskEditor, toast } from "./edit-helpers.js";

let editPriority = "medium";
let assignees = null;
let subtasks = null;

/** Init all edit bindings */
export function initEditBindings() {
  initEditors();
  bindPriorityButtons();
  bindOpenClose();
  bindSave();
}

/** Create editor instances */
function initEditors() {
  assignees = createAssigneeEditor({
    selectEl: editAssigneeSelect,
    optionsEl: editAssigneeOptions,
    listEl: editAssigneeList,
    isEditOpen,
  });
  subtasks = createSubtaskEditor({
    inputEl: editSubtaskInput,
    addBtnEl: editSubtaskAddBtn,
    listEl: editSubtaskList,
  });
}

/** Bind overlay open/close */
function bindOpenClose() {
  detailEditBtn?.addEventListener("click", openEditOverlay);
  editCloseBtn?.addEventListener("click", closeEditOverlay);
  document.addEventListener("keydown", onEscClose);
}

/** Close on Escape key */
function onEscClose(e) {
  if (!isEditOpen()) return;
  if (e.key !== "Escape") return;
  closeEditOverlay();
}

/** Bind save button click */
function bindSave() {
  editOkBtn?.addEventListener("click", onSaveClick);
}

/** Handle save button click */
function onSaveClick(e) {
  e.preventDefault();
  saveEditOverlay();
}

/** Bind priority button actions */
function bindPriorityButtons() {
  Object.entries(prioBtns).forEach(([key, btn]) => {
    btn?.addEventListener("click", (e) => onPrioClick(e, key));
  });
}

/** Handle priority button click */
function onPrioClick(e, key) {
  e.preventDefault();
  setEditPriority(key);
}

/** Set active edit priority */
function setEditPriority(p) {
  editPriority = normalizePriority(p);
  Object.entries(prioBtns).forEach(([k, btn]) => applyPrioState(k, btn));
}

/** Normalize priority value */
function normalizePriority(p) {
  const allowed = ["urgent", "medium", "low"];
  return allowed.includes(p) ? p : "medium";
}

/** Apply priority button state */
function applyPrioState(key, btn) {
  if (!btn) return;
  const active = key === editPriority;
  btn.classList.toggle("is-active", active);
  setPrioIcon(btn, key, active);
}

/** Set correct priority icon */
function setPrioIcon(btn, key, active) {
  const img = btn.querySelector("img");
  if (!img) return;
  img.src = prioIconPath(key, active);
}

/** Resolve priority icon path */
function prioIconPath(key, active) {
  if (key === "urgent") return active ? "./assets/icons/urgent-white.svg" : "./assets/icons/urgent-red.svg";
  if (key === "medium") return active ? "./assets/icons/medium-white.svg" : "./assets/icons/medium-orange.svg";
  return active ? "./assets/icons/low-white.svg" : "./assets/icons/low-green.svg";
}

/** Open edit overlay */
function openEditOverlay() {
  const detail = getCurrentDetail();
  if (!detail?.task) return;
  initOverlayFields(detail.task);
  showEditOverlay();
}

/** Initialize overlay form fields */
function initOverlayFields(task) {
  fillFields(task);
  initMinDate(task);
  assignees?.initFromTask(task);
  subtasks?.initFromTask(task);
}

/** Fill form from task */
function fillFields(task) {
  setTitleValue(task);
  setDescValue(task);
  setDeadlineValue(task);
  setEditPriority((task.priority || "medium").toString().toLowerCase());
}

/** Set title input value */
function setTitleValue(task) {
  editTitle.value = task.title || "";
}

/** Set description input value */
function setDescValue(task) {
  editDesc.value = task.secondline || "";
}

/** Set date input value */
function setDeadlineValue(task) {
  setDateValue(task.deadline);
}

/** Convert deadline to input */
function setDateValue(deadline) {
  if (!deadline) return (editDate.value = "");
  const d = new Date(deadline);
  editDate.value = isNaN(d) ? "" : toISODateOnly(d);
}

/** Initialize min allowed date */
function initMinDate(task) {
  const createdAt = getCreatedAt(task);
  const minStr = toISODateOnly(createdAt);
  applyMinDate(minStr);
  applyMinDateHint(minStr);
}

/** Apply min date attribute */
function applyMinDate(minStr) {
  editDate.min = minStr;
}

/** Show earliest date hint */
function applyMinDateHint(minStr) {
  const hint = document.getElementById("edit-date-hint");
  if (hint) hint.textContent = `Earliest: ${minStr}`;
}

/** Read task creation date */
function getCreatedAt(task) {
  const s = task.createdAt || task.created || task.created_at || null;
  const d = s ? new Date(s) : new Date();
  return isNaN(d) ? new Date() : d;
}

/** Show edit, hide detail */
function showEditOverlay() {
  document.getElementById("task-detail-overlay")?.classList.add("d_none");
  editSection?.classList.remove("d_none");
  document.body.classList.add("board-overlay-open");
}

/** Close edit overlay */
function closeEditOverlay() {
  editSection?.classList.add("d_none");
  document.body.classList.remove("board-overlay-open");
  document.getElementById("task-detail-overlay")?.classList.remove("d_none");
}

/** Check overlay open state */
function isEditOpen() {
  return !!editSection && !editSection.classList.contains("d_none");
}

/** Save updated task data */
async function saveEditOverlay() {
  const detail = getCurrentDetail();
  if (!isValidDetail(detail)) return;

  const updated = buildUpdatedTask(detail.task);
  if (!updated) return;

  await persistTask(detail, updated);
  syncDetail(detail, updated);
  closeEditOverlay();
  toast("Task updated successfully.");
}

/** Validate current detail payload */
function isValidDetail(detail) {
  return !!detail?.id && !!detail?.col && !!detail?.task;
}

/** Persist task into database */
async function persistTask(detail, updated) {
  const path = `${detail.col}/${detail.id}`;
  await dbApi.updateData(TASKS_ROOT, { [path]: updated });
}

/** Build updated task object */
function buildUpdatedTask(task) {
  const base = buildBaseEdits(task);
  const deadline = buildDeadlineField(task);
  if (deadline === null) return null;

  const assigneeIds = assignees?.getSelectedIds?.() || [];
  const sub = subtasks?.getCleanSubtasks?.() || { subtasks: [], doneCount: 0 };

  return composeUpdated(task, base, deadline, assigneeIds, sub);
}

/** Build title and desc */
function buildBaseEdits() {
  return {
    title: editTitle.value.trim(),
    secondline: editDesc.value.trim(),
    priority: editPriority,
  };
}

/** Build validated deadline field */
function buildDeadlineField(task) {
  const createdAt = getCreatedAt(task);
  return buildDeadlineISO(createdAt);
}

/** Build ISO deadline string */
function buildDeadlineISO(createdAt) {
  if (!editDate.value) return "";
  const chosen = toMidnight(new Date(editDate.value));
  const min = toMidnight(new Date(createdAt));
  if (chosen < min) return failMinDate(min);
  return toUTCISODateOnly(chosen);
}

/** Set date to midnight */
function toMidnight(d) {
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Show invalid deadline toast */
function failMinDate(min) {
  toast(`Das Fälligkeitsdatum darf nicht vor dem Erstellungsdatum liegen (${toISODateOnly(min)}).`);
  return null;
}

/** Convert date to UTC ISO */
function toUTCISODateOnly(d) {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString();
}

/** Compose final updated task */
function composeUpdated(task, base, deadline, assigneeIds, sub) {
  const createdAt = task.createdAt || task.created || task.created_at || new Date().toISOString();
  return {
    ...task,
    ...base,
    deadline,
    assignedContact: assigneeIds,
    subtasks: sub.subtasks,
    subtasksCompleted: sub.doneCount,
    subtasksTotal: sub.subtasks.length,
    createdAt,
  };
}

/** Sync detail view state */
function syncDetail(detail, updatedTask) {
  const assignedDetailed = assignees?.resolveAssignedDetailed?.(updatedTask.assignedContact) || [];
  setCurrentDetail({ ...detail, task: { ...updatedTask, assignedDetailed } });
  renderDetail({ ...updatedTask, assignedDetailed });
}
