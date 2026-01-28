/* ---------- UI: Add-Task Overlay open/close ---------- */

window.currentTaskColumn = window.currentTaskColumn || "todo";

function openAddTaskOverlay(btn) {
  const overlay = document.getElementById("add-task-overlay");
  const form = overlay?.querySelector(".task-form");
  overlay?.classList.remove("d_none");
  document.body.classList.add("no-scroll");
  window.getContactsData?.();
   initAssigneeChipToggle();
  if (form) window.clearTask?.(form);
  if (btn.dataset.column) window.currentTaskColumn = btn.dataset.column;
}

function closeAddTaskOverlay() {
  const overlay = document.getElementById("add-task-overlay");
  const form = overlay?.querySelector(".task-form");
  if (form) window.clearTask?.(form);
  overlay?.classList.add("d_none");
  document.body.classList.remove("no-scroll");
}

document.addEventListener("click", (e) => {
  const openBtn = e.target.closest(".open-add-task-overlay");
  if (openBtn) return openAddTaskOverlay(openBtn);

  if (e.target.closest("#add-task-overlay .close-btn"))
    return closeAddTaskOverlay();
});

addEventListener("click", (e) => {
  if (e.target === document.getElementById("add-task-overlay")) {
    closeAddTaskOverlay();
  }
});


function renderAssigneeChipsLocal(selectedAssignees, containerEl) {
  if (!containerEl) return;

  containerEl.innerHTML = "";
  if (!selectedAssignees.length) return;

  const max = 4;
  const shown = selectedAssignees.slice(0, max);
  const more = selectedAssignees.length - shown.length;

  containerEl.innerHTML =
    shown
      .map(
        (a, i) => `
          <span class="avatar-chip" data-index="${i}" style="background:${a.color}" title="${a.name}">
            ${a.initials}
          </span>
        `
      )
      .join("") +
    (more > 0 ? `<span class="avatar-chip more-chip">+${more}</span>` : "");
}

function toggleAssigneeByIndex(i) {
  selectedAssignees.splice(i, 1);
  renderAssignees();
  buildAssigneeDropdown._sync?.();
}

function initAssigneeChipToggle() {
  const assigneeList = document.getElementById("assignee-list");
  if (!assigneeList) return;

  assigneeList.addEventListener("click", function (e) {
    const chip = e.target.closest(".avatar-chip");
    if (!chip || chip.classList.contains("more-chip")) return;

    const index = Number(chip.dataset.index);
    if (isNaN(index)) return;

    toggleAssigneeByIndex(index);
  });
}

