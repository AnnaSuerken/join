
/* ---------- UI: Add-Task Overlay open/close ---------- */

window.currentTaskColumn = window.currentTaskColumn || "todo";

/**opens and closes add-task-overlay within board.html
 */
function openAddTaskOverlay(btn) {
  const overlay = document.getElementById("add-task-overlay");
  const form = overlay?.querySelector(".task-form");
  overlay?.classList.remove("d_none");
  document.body.classList.add("no-scroll");
  window.getContactsData?.();
  if (form) window.clearTask?.(form);
  if (btn.dataset.column) window.currentTaskColumn = btn.dataset.column;
  console.log(window.currentTaskColumn);
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


