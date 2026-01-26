let subtasks = [];
let editingIndex = null;

/**
 * Switches the subtask input into edit mode for a specific subtask.
 *
 * @param {number} i
 * Index of the subtask to edit.
 */
function setSubtaskModeEdit(i) {
  const input = document.getElementById("subtask");
  if (!input) return;

  editingIndex = i;
  input.value = subtasks[i] ?? "";
  input.placeholder = "Subtask bearbeiten – Enter speichert, Esc bricht ab";
  input.classList.add("is-editing");
  focusAndToggleAddButton(input);
}

/**
 * Focuses the subtask input and toggles the visibility
 * of the add button based on the input value.
 *
 * @param {HTMLInputElement} input
 * The subtask input field.
 */
function focusAndToggleAddButton(input) {
  input.focus();
  input.select();
  const addBtn = document.getElementById("subtask-add-btn");
  if (!addBtn) return;
  const hasValue = input.value.trim().length > 0;
  addBtn.classList.toggle("d_none", !hasValue);
}

/**
 * Switches the subtask input into add mode.
 *
 * Clears editing state, resets input value and placeholder,
 * and hides the add button.
 */
function setSubtaskModeAdd() {
  const input = document.getElementById("subtask");
  if (!input) return;

  editingIndex = null;
  input.value = "";
  input.placeholder = "Add new subtask";
  input.classList.remove("is-editing");
  hideSubtaskAddButton();
}

/**
 * Hides the subtask add button.
 */
function hideSubtaskAddButton() {
  const addBtn = document.getElementById("subtask-add-btn");
  if (addBtn) addBtn.classList.add("d_none");
}

/**
 * Adds a new subtask using the current input value.
 */
function addSubtaskFromInput() {
  const input = document.getElementById("subtask");
  const list = document.getElementById("subtask-list");
  if (!input || !list) return;

  const value = input.value.trim();
  if (!value) return;

  subtasks.push(value);
  list.classList.add("add-scroll-bar");
  setSubtaskModeAdd();
  renderSubtasks();
}

/**
 * Saves changes to the currently edited subtask.
 */
function saveEditFromInput() {
  if (editingIndex === null) return;

  const input = document.getElementById("subtask");
  if (!input) return;
  const value = input.value.trim();
  if (!value) return;

  subtasks[editingIndex] = value;
  setSubtaskModeAdd();
  renderSubtasks();
}

/**
 * Cancels the current subtask edit operation.
 */
function cancelEdit() {
  setSubtaskModeAdd();
}

/**
 * Renders all subtasks into the subtask list container.
 */
function renderSubtasks() {
  const list = document.getElementById("subtask-list");
  if (!list) return;

  list.innerHTML = subtasks.map((t, i) => buildSubtaskHtml(t, i)).join("");

  if (editingIndex !== null && editingIndex >= subtasks.length) {
    setSubtaskModeAdd();
  }
}

/**
 * Creates the HTML template for a single subtask entry.
 *
 * @param {string} text
 * Subtask text.
 *
 * @param {number} index
 * Index of the subtask.
 */
function buildSubtaskHtml(text, index) {
  return `
    <div class="subtask-item" data-index="${index}">
      <span class="subtask-text">${escapeHtml(text)}</span>
      <div class="subtask-actions">
        <button class="btn-edit" type="button" aria-label="Edit subtask" title="Edit">
          <img src="./assets/icons/edit.svg" alt="edit">
        </button>
        <button class="btn-delete" type="button" aria-label="Delete subtask" title="Delete">
          <img src="./assets/icons/delete.svg" alt="delete">
        </button>
      </div>
    </div>
  `;
}

/**
 * Removes a subtask by index.
 *
 * @param {number} index
 * Index of the subtask to remove.
 */
function removeSubtask(index) {
  const list = document.getElementById("subtask-list");
  subtasks.splice(index, 1);
  renderSubtasks();
  adjustEditingIndexAfterRemoval(index);
  if (subtasks.length === 0) {
    list.classList.remove("add-scroll-bar");
  } else {
    list.classList.add("add-scroll-bar");
  }
}

/**
 * Adjusts the editing index after a subtask has been removed.
 *
 * @param {number} index
 * Index of the removed subtask.
 */
function adjustEditingIndexAfterRemoval(index) {
  if (editingIndex === index) {
    setSubtaskModeAdd();
  } else if (editingIndex !== null && index < editingIndex) {
    editingIndex -= 1;
  }
}

/**
 * Wires all event listeners related to subtask interactions.
 */
function wireSubtaskEvents() {
  const input = document.getElementById("subtask");
  const list = document.getElementById("subtask-list");
  const addBtn = document.getElementById("subtask-add-btn");
  if (!input || !list) return;

  input.addEventListener("input", () => toggleSubtaskAddButton(input, addBtn));
  input.addEventListener("keydown", handleSubtaskKeydown);
  wireSubtaskAddButton(addBtn);
  wireSubtaskListClick(list);
}

/**
 * Toggles the visibility of the subtask add button
 * based on the input value.
 *
 * @param {HTMLInputElement} input
 * The subtask input field.
 *
 * @param {HTMLButtonElement} addBtn
 * The add button element.
 */
function toggleSubtaskAddButton(input, addBtn) {
  if (!addBtn) return;
  const hasValue = input.value.trim().length > 0;
  addBtn.classList.toggle("d_none", !hasValue);
}

/**
 * Handles keyboard interactions for the subtask input.
 *
 * @param {KeyboardEvent} e
 * The keyboard event.
 */
function handleSubtaskKeydown(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    if (editingIndex === null) addSubtaskFromInput();
    else saveEditFromInput();
  } else if (e.key === "Escape") {
    e.preventDefault();
    if (editingIndex !== null) cancelEdit();
  }
}

/**
 * Wires the click handler for the subtask add button.
 *
 * @param {HTMLButtonElement} addBtn
 * The add subtask button.
 */
function wireSubtaskAddButton(addBtn) {
  if (!addBtn || addBtn._wired) return;
  addBtn.addEventListener("click", () => {
    if (editingIndex === null) addSubtaskFromInput();
    else saveEditFromInput();
  });
  addBtn._wired = true;
}

/**
 * Wires click handling for subtask list actions
 * (edit and delete buttons).
 *
 * @param {HTMLElement} list
 * The subtask list container.
 */
function wireSubtaskListClick(list) {
  list.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const row = e.target.closest(".subtask-item");
    if (!row) return;
    const index = Number(row.dataset.index);
    if (btn.classList.contains("btn-edit")) setSubtaskModeEdit(index);
    else if (btn.classList.contains("btn-delete")) removeSubtask(index);
  });
}