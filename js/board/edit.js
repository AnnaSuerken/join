/**
 * board/edit.js
 * Edit Overlay: öffnen/schließen/speichern + assignees + subtasks + priority.
 */

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

export function initEditBindings() {
  bindPriorityButtons();
  bindOpenClose();
  bindSave();
  bindAssigneeDropdown();
  bindSubtaskEditor();
}

function bindOpenClose() {
  detailEditBtn?.addEventListener("click", openEditOverlay);
  editCloseBtn?.addEventListener("click", closeEditOverlay);
  document.addEventListener("keydown", (e) => isEditOpen() && e.key === "Escape" && closeEditOverlay());
}

function bindSave() {
  editOkBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    saveEditOverlay();
  });
}

/* ---------- Priority ---------- */

function bindPriorityButtons() {
  Object.entries(prioBtns).forEach(([key, btn]) => {
    btn?.addEventListener("click", (e) => {
      e.preventDefault();
      setEditPriority(key);
    });
  });
}

function setEditPriority(p) {
  const allowed = ["urgent", "medium", "low"];
  editPriority = allowed.includes(p) ? p : "medium";
  Object.entries(prioBtns).forEach(([k, btn]) => togglePrioBtn(k, btn, editPriority));
}

function togglePrioBtn(key, btn, active) {
  if (!btn) return;
  btn.classList.toggle("is-active", key === active);
  updatePrioIcon(btn, key, key === active);
}

function updatePrioIcon(btn, key, isActive) {
  const img = btn.querySelector("img");
  if (!img) return;
  img.src = prioIconPath(key, isActive);
}

function prioIconPath(key, active) {
  if (key === "urgent") return active ? "./assets/icons/urgent-white.svg" : "./assets/icons/urgent-red.svg";
  if (key === "medium") return active ? "./assets/icons/medium-white.svg" : "./assets/icons/medium-orange.svg";
  return active ? "./assets/icons/low-white.svg" : "./assets/icons/low-green.svg";
}

/* ---------- Open / Close ---------- */

function openEditOverlay() {
  const detail = getCurrentDetail();
  if (!detail?.task) return;

  fillFields(detail.task);
  initMinDate(detail.task);
  initAssignees(detail.task);
  initSubtasks(detail.task);

  hideDetailShowEdit();
}

function closeEditOverlay() {
  editSection?.classList.add("d_none");
  document.body.classList.remove("board-overlay-open");
  document.getElementById("task-detail-overlay")?.classList.remove("d_none");
}

function hideDetailShowEdit() {
  document.getElementById("task-detail-overlay")?.classList.add("d_none");
  editSection?.classList.remove("d_none");
  document.body.classList.add("board-overlay-open");
}

function isEditOpen() {
  return editSection && !editSection.classList.contains("d_none");
}

/* ---------- Fill Fields ---------- */

function fillFields(task) {
  editTitle.value = task.title || "";
  editDesc.value = task.secondline || "";
  setDateValue(task.deadline);
  setEditPriority((task.priority || "medium").toString().toLowerCase());
}

function setDateValue(deadline) {
  if (!deadline) return (editDate.value = "");
  const d = new Date(deadline);
  editDate.value = isNaN(d) ? "" : toISODateOnly(d);
}

function initMinDate(task) {
  const createdAt = getCreatedAt(task);
  const minStr = toISODateOnly(createdAt);
  editDate.min = minStr;
  const hint = document.getElementById("edit-date-hint");
  if (hint) hint.textContent = `Earliest: ${minStr}`;
}

function getCreatedAt(task) {
  const s = task.createdAt || task.created || task.created_at || null;
  const d = s ? new Date(s) : new Date();
  return isNaN(d) ? new Date() : d;
}

/* ---------- Assignees ---------- */

function bindAssigneeDropdown() {
  editAssigneeSelect?.addEventListener("click", () => toggleEditAssigneeDropdown(isAssigneeClosed()));
  document.addEventListener("click", (e) => closeAssigneeOnOutside(e));
}

function closeAssigneeOnOutside(e) {
  if (!isEditOpen()) return;
  if (!editAssigneeSelect.contains(e.target) && !editAssigneeOptions.contains(e.target)) {
    toggleEditAssigneeDropdown(false);
  }
}

function isAssigneeClosed() {
  return editAssigneeOptions?.classList.contains("d_none");
}

function toggleEditAssigneeDropdown(open) {
  editAssigneeOptions?.classList.toggle("d_none", !open);
  document.getElementById("edit-assignee-list")?.classList.toggle("d_none", open);
  editAssigneeSelect?.setAttribute("aria-expanded", String(open));
}

function initAssignees(task) {
  selectedAssigneeIds = normalizeAssigneesToIds(task.assignedContact);
  renderEditAssigneeChips();
  renderEditAssigneeOptions();
  const lbl = editAssigneeSelect?.querySelector(".assignee-select-label");
  if (lbl) lbl.textContent = "Select contacts to assign";
}

function renderEditAssigneeChips() {
  if (!editAssigneeList) return;
  editAssigneeList.innerHTML = "";
  getSelectedContacts().forEach((c) => editAssigneeList.appendChild(chipRow(c)));
}

function chipRow(c) {
  const row = document.createElement("div");
  row.className = "detail-user-row";
  row.innerHTML = chipRowHtml(c);
  row.querySelector(".remove-assignee")?.addEventListener("click", () => removeAssignee(c.id));
  return row;
}

function chipRowHtml(c) {
  return `
    <div class="user" style="background:${escapeHtml(c.color || "#999")}">${escapeHtml(c.initials || "?")}</div>
    <p>${escapeHtml(c.name || "")}</p>
    <button class="remove-assignee" title="Entfernen" data-id="${escapeHtml(c.id)}">✕</button>
  `;
}

function removeAssignee(id) {
  selectedAssigneeIds = selectedAssigneeIds.filter((x) => x !== id);
  renderEditAssigneeChips();
  renderEditAssigneeOptions();
}

function renderEditAssigneeOptions() {
  if (!editAssigneeOptions) return;
  editAssigneeOptions.innerHTML = "";
  getAllContacts().forEach((c) => editAssigneeOptions.appendChild(optionLi(c)));
}

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

function optionHtml(c) {
  return `
    <span class="assignee-avatar" style="background:${escapeHtml(c.color)}">${escapeHtml(c.initials)}</span>
    <span>${escapeHtml(c.name)}</span>
    <span class="assignee-check">✔</span>
  `;
}

function onOptionKey(e, id) {
  if (e.key !== "Enter" && e.key !== " ") return;
  e.preventDefault();
  toggleAssignee(id);
}

function toggleAssignee(id) {
  selectedAssigneeIds = selectedAssigneeIds.includes(id)
    ? selectedAssigneeIds.filter((x) => x !== id)
    : [...selectedAssigneeIds, id];

  renderEditAssigneeChips();
  renderEditAssigneeOptions();
}

function getAllContacts() {
  const maps = window.boardContacts || {};
  const byId = maps.contactsById || new Map();
  return [...byId.values()].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

function getSelectedContacts() {
  const maps = window.boardContacts || {};
  const byId = maps.contactsById || new Map();
  return selectedAssigneeIds.map((id) => byId.get(id)).filter(Boolean);
}

/* ---------- Subtasks ---------- */

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

function initSubtasks(task) {
  editSubtasks = normalizeSubtasks(task).map((s) => ({ text: s.text, done: !!s.done }));
  renderEditSubtasks();
}

function addEditSubtask() {
  const val = (editSubtaskInput?.value || "").trim();
  if (!val) return;
  editSubtasks.push({ text: val, done: false });
  editSubtaskInput.value = "";
  renderEditSubtasks();
}

function renderEditSubtasks() {
  if (!editSubtaskList) return;
  editSubtaskList.innerHTML = "";
  editSubtasks.forEach((st, i) => editSubtaskList.appendChild(subtaskRow(st, i)));
}

function subtaskRow(st, i) {
  const row = document.createElement("div");
  row.className = "subtask-edit-row";
  row.innerHTML = subtaskRowHtml(st, i);

  wireSubtaskRow(row, i);
  return row;
}

function subtaskRowHtml(st, i) {
  return `
    <input type="checkbox" ${st.done ? "checked" : ""} data-i="${i}" />
    <input type="text" value="${escapeHtml(st.text)}" data-i="${i}" />
    <button class="icon-btn" title="Löschen" data-i="${i}">
      <img src="./assets/icons/delete.svg" alt="" />
    </button>
  `;
}

function wireSubtaskRow(row, i) {
  const cb = row.querySelector('input[type="checkbox"]');
  const txt = row.querySelector('input[type="text"]');
  const del = row.querySelector("button");

  cb?.addEventListener("change", () => (editSubtasks[i].done = cb.checked));
  txt?.addEventListener("input", () => (editSubtasks[i].text = txt.value));
  del?.addEventListener("click", (e) => onDelSubtask(e, i));
}

function onDelSubtask(e, i) {
  e.preventDefault();
  editSubtasks.splice(i, 1);
  renderEditSubtasks();
}

/* ---------- Save ---------- */

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

function buildDeadlineISO(createdAt) {
  if (!editDate.value) return "";
  const chosen = new Date(editDate.value);
  chosen.setHours(0, 0, 0, 0);

  const min = new Date(createdAt);
  min.setHours(0, 0, 0, 0);

  if (chosen < min) return failMinDate(min);
  return toUTCISODateOnly(chosen);
}

function failMinDate(min) {
  const msg = `Das Fälligkeitsdatum darf nicht vor dem Erstellungsdatum liegen (${toISODateOnly(min)}).`;
  toast(msg);
  return null;
}

function toUTCISODateOnly(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
}

function cleanSubtasks(list) {
  return list
    .map((s) => ({ text: (s.text || "").trim(), done: !!s.done }))
    .filter((s) => s.text.length > 0);
}

function syncDetailAfterSave(detail, updatedTask) {
  const assignedDetailed = buildAssignedDetailed(updatedTask.assignedContact);
  setCurrentDetail({ ...detail, task: { ...updatedTask, assignedDetailed } });
  renderDetail({ ...updatedTask, assignedDetailed });
}

function buildAssignedDetailed(idsVal) {
  const maps = window.boardContacts || {};
  const byId = maps.contactsById || new Map();
  return normalizeAssigneesToIds(idsVal).map((id) => byId.get(id)).filter(Boolean);
}

function toast(msg) {
  if (typeof window.showToast === "function") window.showToast(msg);
  else alert(msg);
}
