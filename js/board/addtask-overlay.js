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

/* ---------- Edit-Priority im Overlay ---------- */

function setEditPriority(status) {
  currentPriority = status;
  const priorities = ["urgent", "medium", "low"];

  priorities.forEach((prio) => {
    const btn = document.getElementById(`edit-prio-${prio}`);
    if (!btn) return;
    btn.classList.toggle("is-active", prio === status);
  });
}

function wireEditPriorityButtons() {
  const config = [
    { id: "edit-prio-urgent", status: "urgent" },
    { id: "edit-prio-medium", status: "medium" },
    { id: "edit-prio-low", status: "low" },
  ];

  config.forEach(({ id, status }) => {
    const btn = document.getElementById(id);
    if (!btn || btn._wired) return;

    btn.addEventListener("click", () => toggleEditPriority(status, config));
    btn._wired = true;
  });
}

function toggleEditPriority(status, config) {
  if (currentPriority === status) {
    currentPriority = null;
    config.forEach(({ id }) => {
      const b = document.getElementById(id);
      if (b) b.classList.remove("is-active");
    });
  } else {
    setEditPriority(status);
  }
}

/* ---------- ✅ Task Detail Overlay Animation ---------- */

function openTaskDetailOverlay() {
  const overlay = document.getElementById("task-detail-overlay");
  if (!overlay) return;

  overlay.classList.remove("d_none", "is-closing");
  overlay.classList.add("task-detail-overlay");
  overlay.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => {
    overlay.classList.add("is-open");
  });
}

function closeTaskDetailOverlay() {
  const overlay = document.getElementById("task-detail-overlay");
  if (!overlay) return;

  overlay.classList.remove("is-open");
  overlay.classList.add("is-closing");
  overlay.setAttribute("aria-hidden", "true");

  const panel = overlay.querySelector(".task-overlay-open");
  if (!panel) {
    overlay.classList.add("d_none");
    overlay.classList.remove("is-closing");
    return;
  }

  const onEnd = (e) => {
    if (e.propertyName !== "transform") return;
    panel.removeEventListener("transitionend", onEnd);

    overlay.classList.add("d_none");
    overlay.classList.remove("is-closing");
  };

  panel.addEventListener("transitionend", onEnd);
}

/* ---------- Init ---------- */

addEventListener("load", () => {
  const dayRef = document.querySelector(".task-due-date");
  if (dayRef) {
    const day = new Date();
    dayRef.min = day.toISOString().split("T")[0];
  }

  wireSubtaskEvents();
  renderSubtasks();

  const isBoard = window.location.pathname.endsWith("board.html");
  if (!isBoard) {
    wireEditPriorityButtons();
  }

  // Close Button + Backdrop Click
  const overlay = document.getElementById("task-detail-overlay");
  const closeBtn = document.getElementById("detail-close-btn");

  closeBtn?.addEventListener("click", closeTaskDetailOverlay);

  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) closeTaskDetailOverlay();
  });
});

// Exports für Detail Overlay (für board.js)
window.openTaskDetailOverlay = openTaskDetailOverlay;
window.closeTaskDetailOverlay = closeTaskDetailOverlay;