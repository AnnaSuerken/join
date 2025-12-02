
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


/**distributes the new task into different progress groupd within oard overview (todo, in progress, await feedback, done)
 * @param {string} form - defines which form is currently used (within add-task.html or within board.html/overlay)
 * @param {string} payload - defines whichinput values are pushed into database
 * @param {string} currentTaskColumn - defines with progress status is currently active
 */

async function progressTablePush(payload, currentTaskColumn, form) {
  switch (currentTaskColumn) {
    case "todo":
    case "inprogress":
    case "await":
    case "done": {
      const key = await dbApi.pushData(`/board/${currentTaskColumn}`, payload);
      await dbApi.updateData(`/board/${currentTaskColumn}/${key}`, { id: key });
      showToast("Task was added.");
      clearTask(form);
      break;
    }
  }
}