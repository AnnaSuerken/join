/**
 * board/addtask-overlay.js
 * UI: Add-Task Overlay open/close + Assignee-Chips klickbar.
 */

import { onClickDelegate } from "./dom-events.js";

window.currentTaskColumn = window.currentTaskColumn || "todo";
window.selectedAssignees = window.selectedAssignees || [];

let chipListenerBound = false;

/* ---------- Public API ---------- */

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

export function closeAddTaskOverlay() {
  const overlay = $("#add-task-overlay");
  const form = overlay?.querySelector(".task-form");

  if (form) window.clearTask?.(form);
  overlay?.classList.add("d_none");
  document.body.classList.remove("no-scroll");
}

export function initAddTaskOverlayBindings() {
  onClickDelegate(document, ".open-add-task-overlay", (_, btn) => openAddTaskOverlay(btn));
  onClickDelegate(document, "#add-task-overlay .close-btn", () => closeAddTaskOverlay());
  document.addEventListener("click", (e) => e.target === $("#add-task-overlay") && closeAddTaskOverlay());
}

/* ---------- Chips (Local Render) ---------- */

export function renderAssigneeChipsLocal(selected, containerEl) {
  if (!containerEl) return;
  containerEl.innerHTML = "";
  if (!selected?.length) return;
  containerEl.innerHTML = buildChipHtml(selected);
}

/* ---------- Internal ---------- */

function initAssigneeChipToggle() {
  if (chipListenerBound) return;
  const list = $("#assignee-list");
  if (!list) return;

  chipListenerBound = true;
  list.addEventListener("click", onChipClick);
}

function onChipClick(e) {
  const chip = e.target.closest(".avatar-chip");
  if (!chip || chip.classList.contains("more-chip")) return;

  const index = Number(chip.dataset.index);
  if (Number.isNaN(index)) return;

  window.selectedAssignees.splice(index, 1);
  window.renderAssignees?.();
  window.buildAssigneeDropdown?._sync?.();
}

function setCurrentColumnFromBtn(btn) {
  const col = btn?.dataset?.column;
  if (col) window.currentTaskColumn = col;
}

function buildChipHtml(selected) {
  const max = 4;
  const shown = selected.slice(0, max);
  const more = selected.length - shown.length;
  return shown.map(chipTpl).join("") + (more > 0 ? moreTpl(more) : "");
}

function chipTpl(a, i) {
  return `
    <span class="avatar-chip" data-index="${i}" style="background:${a.color}" title="${a.name}">
      ${a.initials}
    </span>
  `;
}

function moreTpl(n) {
  return `<span class="avatar-chip more-chip">+${n}</span>`;
}

function $(id) {
  return document.getElementById(id);
}
