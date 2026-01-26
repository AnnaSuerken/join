

/* ---------- Priority ---------- */

/**
 * Holds the currently selected priority.
 * Defaults to "medium", as every task must always have a priority.
 * 
 */
let currentPriority = "medium";

/**
 * Sets the priority for the current task.
 *
 * - Clicking an already active priority ("urgent" or "low")
 *   resets the selection back to "medium".
 *
 * @param {"urgent"|"medium"|"low"} status
 */
function setPriority(status) {
  const priorities = ["urgent", "medium", "low"];

 if (currentPriority === status && status !== "medium") {
    resetAllPriorities(priorities);
    activateSelectedPriority("medium");
    currentPriority = "medium";
    return;
  }

  resetAllPriorities(priorities);
  activateSelectedPriority(status);
  currentPriority = status;
}

/**
 * Resets the visual state of all priority buttons.
 *
 * This shows all inactive buttons and hides all active buttons,
 * preparing the UI for a new priority selection.
 *
 * @param {Array<"urgent"|"medium"|"low">} priorities
 */
function resetAllPriorities(priorities) {
  priorities.forEach((priority) => {
    document.getElementById(`prio-${priority}`)?.classList.remove("d_none");
    document.getElementById(`prio-${priority}-active`)?.classList.add("d_none");
  });
}


/**
 * Resets the priority UI to its initial default state.
 *
 * This function ensures that "medium" is visually active
 * while "urgent" and "low" are inactive.
 * Typically used when resetting or creating a new task.
 */
function resetStartPriorities() {
  document.getElementById("prio-low")?.classList.remove("d_none");
  document.getElementById("prio-urgent")?.classList.remove("d_none");
  document.getElementById("prio-medium")?.classList.add("d_none");
  document.getElementById("prio-urgent-active")?.classList.add("d_none");
  document.getElementById("prio-low-active")?.classList.add("d_none");
  document.getElementById("prio-medium-active")?.classList.remove("d_none");
}

/**
 * Activates the given priority in the UI.
 *
 * Hides the inactive button and shows the active version
 * of the selected priority.
 *
 * @param {"urgent"|"medium"|"low"} status

 */
function activateSelectedPriority(status) {
  document.getElementById(`prio-${status}`)?.classList.add("d_none");
  document.getElementById(`prio-${status}-active`)?.classList.remove("d_none");
}


/* ---------- Create Task---------- */

/**
 * Returns a list of assignee names from the currently selected assignees.
 *
 */
function getAssigneeNames() {
  return selectedAssignees.map((assignee) => assignee.name);
}

/**
 * Creates the task payload object that will be stored in the database.
 *
 * @param {Object} formElements
 * Collection of form input references.
 *
 * @param {string[]} assigneeNames
 * List of selected assignee names.
 */
function createPayload(formElements, assigneeNames) {
  return {
    title: formElements.taskTitle.value,
    id: "", // wird nach push auf key gesetzt
    secondline: formElements.taskDescription?.value || "",
    deadline: formElements.taskDueDate.value,
    assignedContacts: assigneeNames,
    assignedContact: assigneeNames.join(", "),
    category: formElements.taskCategory?.value || "",
    categorycolor:
      taskCategoryColor.find((c) => c.name === formElements.taskCategory?.value)
        ?.color || "",
    subtask: subtasks,
    priority: currentPriority || "low", // ✅ niemals null in DB, falls du Icons erwartest
  };
}

/**
 * Pushes a task payload into the correct board column.
 *
 * @param {Object} payload
 * Task payload to store.
 *
 * @param {string} col
 * Target board column identifier.
 *
 * @param {HTMLFormElement} form
 * The form element that was submitted.
 */
async function progressTablePush(payload, col, form) {
  switch (col) {
    case "todo":
    case "inprogress":
    case "await":
    case "done": {
      const key = await dbApi.pushData(`/board/${col}`, payload);
      await dbApi.updateData(`/board/${col}/${key}`, { id: key });

      showToast("Task was added.");
      clearTask(form);
      return key;
    }
    default:
      console.warn("Unknown column:", col);
      return null;
  }
}

/**
 * Creates a new task from the given form.
 *
 * @param {HTMLFormElement} form
 * The task creation form.
 */
async function createTask(form) {
  if (!setMandatoryInputs(form)) return;

  const formElements = getTaskFormElements(form);
  const assigneeNames = getAssigneeNames();
  const payload = createPayload(formElements, assigneeNames);

  const col = window.currentTaskColumn || "todo";

  await progressTablePush(payload, col, form);

  if (window.location.pathname.endsWith("board.html")) {
    document.getElementById("close-btn")?.click();
  } else {
    setTimeout(() => {
      window.location.href = "/board.html";
    }, 1000);
  }
}

/**
 * Resets the main task input fields.
 *
 * @param {HTMLInputElement} taskTitle
 * Title input field.
 *
 * @param {HTMLTextAreaElement} taskDescription
 * Description input field.
 *
 * @param {HTMLInputElement} taskDueDate
 * Due date input field.
 *
 * @param {HTMLSelectElement} taskCategory
 * Category select field.
 */
function resetTaskInputs(
  taskTitle,
  taskDescription,
  taskDueDate,
  taskCategory
) {
  if (taskTitle) taskTitle.value = "";
  if (taskDescription) taskDescription.value = "";
  if (taskDueDate) taskDueDate.value = "";
  if (taskCategory) taskCategory.value = "Select task category";
}

/**
 * Resets subtask input fields and UI state.
 *
 * @param {HTMLInputElement} subtaskInput
 * Subtask input field.
 *
 * @param {HTMLElement} subtaskList
 * Container for subtasks.
 *
 * @param {HTMLButtonElement} addBtn
 * Button for adding a subtask.
 */
function resetSubtaskFields(subtaskInput, subtaskList, addBtn) {
  if (subtaskInput) {
    subtaskInput.value = "";
    subtaskInput.placeholder = "Add new subtask";
    subtaskInput.classList.remove("is-editing");
  }
  if (subtaskList) {
    subtaskList.innerHTML = "";
    subtaskList.classList.remove("add-scroll-bar");
  }
  if (addBtn) addBtn.classList.add("d_none");
}

/**
 * Resets all global task-related state variables.
 */
function resetGlobalArrays() {
  currentPriority = null;
  subtasks = [];
  editingIndex = null;
  selectedAssignees = [];
  renderAssignees();
  buildAssigneeDropdown._sync?.();
  ["urgent", "medium", "low"].forEach((prio) => {
    document.getElementById(`edit-prio-${prio}`)?.classList.remove("is-active");
  });
}

/**
 * Clears the task form and resets all related UI state.
 *
 * @param {HTMLFormElement} form
 * The task form to reset.
 */
function clearTask(form) {
  if (!form) return;

  const { taskTitle, taskDescription, taskDueDate, taskCategory } =
    getTaskFormElements(form);

  const subtaskInput = document.getElementById("subtask");
  const subtaskList = document.getElementById("subtask-list");
  const addBtn = document.getElementById("subtask-add-btn");

  clearAddTaskErrors(form);
  resetTaskInputs(taskTitle, taskDescription, taskDueDate, taskCategory);
  resetSubtaskFields(subtaskInput, subtaskList, addBtn);
  resetStartPriorities();
  resetGlobalArrays();
}

/**
 * Sets the priority inside the edit overlay.
 *
 * @param {"urgent"|"medium"|"low"} status
 * Priority to activate.
 */
function setEditPriority(status) {
  currentPriority = status;
  const priorities = ["urgent", "medium", "low"];

  priorities.forEach((prio) => {
    const btn = document.getElementById(`edit-prio-${prio}`);
    if (!btn) return;
    btn.classList.toggle("is-active", prio === status);
  });
}

/**
 * Wires click handlers for edit-priority buttons.
 */
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

/**
 * Toggles the edit-priority selection state.
 *
 * @param {"urgent"|"medium"|"low"} status
 * Priority that was clicked.
 *
 * @param {Array<{id: string, status: string}>} config
 * Button configuration list.
 */
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

/**
 * Opens the task detail overlay with animation.
 */
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

/**
 * Closes the task detail overlay with animation.
 */
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

/**
 * Initializes task-related UI behavior on page load.
 */
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

  const overlay = document.getElementById("task-detail-overlay");
  const closeBtn = document.getElementById("detail-close-btn");

  closeBtn?.addEventListener("click", closeTaskDetailOverlay);

  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) closeTaskDetailOverlay();
  });
});

// Global exports
window.openTaskDetailOverlay = openTaskDetailOverlay;
window.closeTaskDetailOverlay = closeTaskDetailOverlay;
window.createTask = createTask;
window.clearTask = clearTask;
window.setPriority = setPriority;