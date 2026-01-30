/**
 * board/dom.js
 * DOM-References.
 */

export const colsEl = {
  todo: document.getElementById("task-table-todo"),
  inprogress: document.getElementById("task-table-progress"),
  await: document.getElementById("task-table-feedback"),
  done: document.getElementById("task-table-done"),
};

export const searchInput = document.getElementById("task-search");

export const detailSection = document.getElementById("task-detail-overlay");
export const detailCloseBtn = document.getElementById("detail-close-btn");
export const detailDeleteBtn = document.getElementById("detail-delete");

export const editSection = document.getElementById("task-edit-overlay");
export const editCloseBtn = document.getElementById("edit-close-btn");
export const editOkBtn = document.getElementById("edit-ok-btn");
export const detailEditBtn = document.getElementById("detail-edit");

export const editTitle = document.getElementById("edit-title");
export const editDesc = document.getElementById("edit-desc");
export const editDate = document.getElementById("edit-date");

export const prioBtns = {
  urgent: document.getElementById("edit-prio-urgent"),
  medium: document.getElementById("edit-prio-medium"),
  low: document.getElementById("edit-prio-low"),
};

export const editAssigneeSelect = document.getElementById("edit-assignee-select");
export const editAssigneeOptions = document.getElementById("edit-assignee-options");
export const editAssigneeList = document.getElementById("edit-assignee-list");

export const editSubtaskInput = document.getElementById("edit-subtask-input");
export const editSubtaskAddBtn = document.getElementById("edit-subtask-add");
export const editSubtaskList = document.getElementById("edit-subtask-list");
