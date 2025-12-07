/* ---------- Subtasks ---------- */

let subtasks = [];
let editingIndex = null;

function setSubtaskModeEdit(i) {
  const input = document.getElementById("subtask");
  if (!input) return;

  editingIndex = i;
  input.value = subtasks[i] ?? "";
  input.placeholder = "Subtask bearbeiten – Enter speichert, Esc bricht ab";
  input.classList.add("is-editing");
  focusAndToggleAddButton(input);
}

function focusAndToggleAddButton(input) {
  input.focus();
  input.select();
  const addBtn = document.getElementById("subtask-add-btn");
  if (!addBtn) return;
  const hasValue = input.value.trim().length > 0;
  addBtn.classList.toggle("d_none", !hasValue);
}

function setSubtaskModeAdd() {
  const input = document.getElementById("subtask");
  if (!input) return;

  editingIndex = null;
  input.value = "";
  input.placeholder = "Add new subtask";
  input.classList.remove("is-editing");
  hideSubtaskAddButton();
}

function hideSubtaskAddButton() {
  const addBtn = document.getElementById("subtask-add-btn");
  if (addBtn) addBtn.classList.add("d_none");
}

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

function cancelEdit() {
  setSubtaskModeAdd();
}

function renderSubtasks() {
  const list = document.getElementById("subtask-list");
  if (!list) return;

  list.innerHTML = subtasks.map((t, i) => buildSubtaskHtml(t, i)).join("");

  if (editingIndex !== null && editingIndex >= subtasks.length) {
    setSubtaskModeAdd();
  }
}

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

function removeSubtask(index) {
  const list = document.getElementById("subtask-list");
  subtasks.splice(index, 1);
  renderSubtasks();
  adjustEditingIndexAfterRemoval(index);
  list?.classList.remove("add-scroll-bar");
}

function adjustEditingIndexAfterRemoval(index) {
  if (editingIndex === index) {
    setSubtaskModeAdd();
  } else if (editingIndex !== null && index < editingIndex) {
    editingIndex -= 1;
  }
}

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

function toggleSubtaskAddButton(input, addBtn) {
  if (!addBtn) return;
  const hasValue = input.value.trim().length > 0;
  addBtn.classList.toggle("d_none", !hasValue);
}

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

function wireSubtaskAddButton(addBtn) {
  if (!addBtn || addBtn._wired) return;
  addBtn.addEventListener("click", () => {
    if (editingIndex === null) addSubtaskFromInput();
    else saveEditFromInput();
  });
  addBtn._wired = true;
}

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