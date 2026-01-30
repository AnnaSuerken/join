/**
 * board/addtask-overlay.js
 * UI: Add-Task Overlay open/close + Assignee-Chips klickbar.
 */

import { onClickDelegate } from "./dom-events.js";

window.currentTaskColumn = window.currentTaskColumn || "todo";
window.selectedAssignees = window.selectedAssignees || [];

let chipListenerBound = false;

/**
 * Opens the add-task overlay and initializes its state.
 *
 * @param {HTMLElement} btn
 * Button that triggered the overlay opening (used to detect target column).
 */
export function openAddTaskOverlay(btn) {
  const overlay = $("#add-task-overlay");
  const form = overlay?.querySelector(".task-form");

  overlay?.classList.remove("d_none");
  document.body.classList.add("no-scroll");
  window.getContactsData?.();

  initAssigneeChipToggle();
  if (form) window.clearTask?.(form);
  setCurrentColumnFromBtn(btn);
}

/**
 * Closes the add-task overlay and resets the form.
 */
export function closeAddTaskOverlay() {
  const overlay = $("#add-task-overlay");
  const form = overlay?.querySelector(".task-form");

  if (form) window.clearTask?.(form);
  overlay?.classList.add("d_none");
  document.body.classList.remove("no-scroll");
}

/**
 * Registers global event bindings for opening and closing the add-task overlay.
 */
export function initAddTaskOverlayBindings() {
  onClickDelegate(document, ".open-add-task-overlay", (_, btn) => openAddTaskOverlay(btn));
  onClickDelegate(document, "#add-task-overlay .close-btn", () => closeAddTaskOverlay());
  document.addEventListener("click", (e) => e.target === $("#add-task-overlay") && closeAddTaskOverlay());
}

/**
 * Renders assignee avatar chips inside a container element.
 *
 * @param {Array<Object>} selected
 * Currently selected assignees.
 * @param {HTMLElement} containerEl
 * Container element for the chips.
 */
export function renderAssigneeChipsLocal(selected, containerEl) {
  if (!containerEl) return;
  containerEl.innerHTML = "";
  if (!selected?.length) return;
  containerEl.innerHTML = buildChipHtml(selected);
}

/**
 * Initializes the click listener for assignee chips (once).
 */
function initAssigneeChipToggle() {
  if (chipListenerBound) return;
  const list = $("#assignee-list");
  if (!list) return;

  chipListenerBound = true;
  list.addEventListener("click", onChipClick);
}

/**
 * Handles click events on assignee chips.
 * Removes the clicked assignee from the selection.
 *
 * @param {MouseEvent} e
 */
function onChipClick(e) {
  const chip = e.target.closest(".avatar-chip");
  if (!chip || chip.classList.contains("more-chip")) return;

  const index = Number(chip.dataset.index);
  if (Number.isNaN(index)) return;

  window.selectedAssignees.splice(index, 1);
  window.renderAssignees?.();
  window.buildAssigneeDropdown?._sync?.();
}

/**
 * Sets the current task column based on the triggering button.
 *
 * @param {HTMLElement} btn
 * Button element containing the column information.
 */
function setCurrentColumnFromBtn(btn) {
  const col = btn?.dataset?.column;
  if (col) window.currentTaskColumn = col;
}

/**
 * Builds the HTML string for assignee chips.
 *
 * @param {Array<Object>} selected
 * Selected assignees.
 */
function buildChipHtml(selected) {
  const max = 4;
  const shown = selected.slice(0, max);
  const more = selected.length - shown.length;
  return shown.map(chipTpl).join("") + (more > 0 ? moreTpl(more) : "");
}

/**
 * Returns the HTML for a single assignee chip.
 *
 * @param {{color:string,name:string,initials:string}} a
 * Assignee data.
 * @param {number} i
 * Index in the selected array.
 */
function chipTpl(a, i) {
  return `
    <span class="avatar-chip" data-index="${i}" style="background:${a.color}" title="${a.name}">
      ${a.initials}
    </span>
  `;
}

/**
 * Returns the HTML for the "+N more" chip.
 *
 * @param {number} n
 * Number of hidden assignees.
 */

function moreTpl(n) {
  return `<span class="avatar-chip more-chip">+${n}</span>`;
}

/**
 * Shorthand for document.getElementById.
 *
 * @param {string} id
 * Element ID.
 */
function $(id) {
  return document.getElementById(id);
}
