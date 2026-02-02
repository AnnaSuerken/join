import { escapeHtml, normalizeSubtasks, normalizeAssigneesToIds } from "./helpers.js";

/** Show toast message globally */
export function toast(msg) {
  if (typeof window.showToast === "function") return window.showToast(msg);
  alert(msg);
}

/** Create assignee editor module */
export function createAssigneeEditor({ selectEl, optionsEl, listEl, isEditOpen }) {
  let selectedIds = [];
  bindAssigneeUi();

  return {
    initFromTask,
    getSelectedIds,
    resolveAssignedDetailed,
  };

  /** Bind dropdown event handlers */
  function bindAssigneeUi() {
    selectEl?.addEventListener("click", onSelectClick);
    document.addEventListener("click", onOutsideClick);
  }

  /** Toggle dropdown on click */
  function onSelectClick() {
    toggleDropdown(isClosed());
  }

  /** Close dropdown on outside */
  function onOutsideClick(e) {
    if (!isEditOpen?.()) return;
    if (!isInside(e)) return toggleDropdown(false);
  }

  /** Check click inside elements */
  function isInside(e) {
    if (!selectEl || !optionsEl) return true;
    return selectEl.contains(e.target) || optionsEl.contains(e.target);
  }

  /** Check dropdown closed state */
  function isClosed() {
    return optionsEl?.classList.contains("d_none");
  }

  /** Toggle dropdown open state */
  function toggleDropdown(open) {
    optionsEl?.classList.toggle("d_none", !open);
    document.getElementById("edit-assignee-list")?.classList.toggle("d_none", open);
    selectEl?.setAttribute("aria-expanded", String(open));
  }

  /** Init selection from task */
  function initFromTask(task) {
    selectedIds = normalizeAssigneesToIds(task.assignedContact);
    renderAll();
    setSelectLabel();
  }

  /** Set label text value */
  function setSelectLabel() {
    const lbl = selectEl?.querySelector(".assignee-select-label");
    if (lbl) lbl.textContent = "Select contacts to assign";
  }

  /** Render chips and options */
  function renderAll() {
    renderChips();
    renderOptions();
  }

  /** Return selected id list */
  function getSelectedIds() {
    return [...selectedIds];
  }

  /** Render selected contact chips */
  function renderChips() {
    if (!listEl) return;
    listEl.innerHTML = "";
    getSelectedContacts().forEach((c) => listEl.appendChild(buildChip(c)));
  }

  /** Build single chip row */
  function buildChip(c) {
    const row = document.createElement("div");
    row.className = "detail-user-row";
    row.innerHTML = chipHtml(c);
    bindChipRemove(row, c.id);
    return row;
  }

  /** Create chip HTML string */
  function chipHtml(c) {
    return `
      <div class="user" style="background:${escapeHtml(c.color || "#999")}">${escapeHtml(c.initials || "?")}</div>
      <p>${escapeHtml(c.name || "")}</p>
      <button class="remove-assignee" title="Entfernen" data-id="${escapeHtml(c.id)}">✕</button>
    `;
  }

  /** Bind chip remove handler */
  function bindChipRemove(row, id) {
    row.querySelector(".remove-assignee")?.addEventListener("click", () => removeAssignee(id));
  }

  /** Remove id from selection */
  function removeAssignee(id) {
    selectedIds = selectedIds.filter((x) => x !== id);
    renderAll();
  }

  /** Render dropdown options list */
  function renderOptions() {
    if (!optionsEl) return;
    optionsEl.innerHTML = "";
    getAllContacts().forEach((c) => optionsEl.appendChild(buildOption(c)));
  }

  /** Build single option item */
  function buildOption(c) {
    const li = document.createElement("li");
    const selected = selectedIds.includes(c.id);
    applyOptionAttrs(li, selected);
    li.innerHTML = optionHtml(c);
    bindOptionEvents(li, c.id);
    return li;
  }

  /** Apply option accessibility attrs */
  function applyOptionAttrs(li, selected) {
    li.role = "option";
    li.tabIndex = 0;
    li.className = "assignee-option" + (selected ? " is-selected" : "");
  }

  /** Create option HTML string */
  function optionHtml(c) {
    return `
      <span class="assignee-avatar" style="background:${escapeHtml(c.color)}">${escapeHtml(c.initials)}</span>
      <span>${escapeHtml(c.name)}</span>
      <span class="assignee-check">✔</span>
    `;
  }

  /** Bind click and key events */
  function bindOptionEvents(li, id) {
    li.addEventListener("click", () => toggleAssignee(id));
    li.addEventListener("keydown", (e) => onOptionKey(e, id));
  }

  /** Handle keyboard selection keys */
  function onOptionKey(e, id) {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    toggleAssignee(id);
  }

  /** Toggle selection for id */
  function toggleAssignee(id) {
    selectedIds = selectedIds.includes(id) ? dropId(id) : addId(id);
    renderAll();
  }

  /** Add id to selection */
  function addId(id) {
    return [...selectedIds, id];
  }

  /** Remove id from selection */
  function dropId(id) {
    return selectedIds.filter((x) => x !== id);
  }

  /** Get all contacts sorted */
  function getAllContacts() {
    const byId = getContactsById();
    return [...byId.values()].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  /** Get map contactsById */
  function getContactsById() {
    const maps = window.boardContacts || {};
    return maps.contactsById || new Map();
  }

  /** Resolve selected contacts list */
  function getSelectedContacts() {
    const byId = getContactsById();
    return selectedIds.map((id) => byId.get(id)).filter(Boolean);
  }

  /** Resolve ids to contact objs */
  function resolveAssignedDetailed(idsVal) {
    const byId = getContactsById();
    return normalizeAssigneesToIds(idsVal).map((id) => byId.get(id)).filter(Boolean);
  }
}

/** Create subtask editor module */
export function createSubtaskEditor({ inputEl, addBtnEl, listEl }) {
  let items = [];
  bindSubtaskUi();

  return {
    initFromTask,
    getCleanSubtasks,
  };

  /** Bind add and enter */
  function bindSubtaskUi() {
    addBtnEl?.addEventListener("click", onAddClick);
    inputEl?.addEventListener("keydown", onInputKey);
  }

  /** Handle add button click */
  function onAddClick(e) {
    e.preventDefault();
    addFromInput();
  }

  /** Handle enter key press */
  function onInputKey(e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    addFromInput();
  }

  /** Init list from task */
  function initFromTask(task) {
    items = normalizeSubtasks(task).map((s) => ({ text: s.text, done: !!s.done }));
    render();
  }

  /** Add subtask from input */
  function addFromInput() {
    const val = readInput();
    if (!val) return;
    items.push({ text: val, done: false });
    clearInput();
    render();
  }

  /** Read and trim input */
  function readInput() {
    return (inputEl?.value || "").trim();
  }

  /** Clear input field value */
  function clearInput() {
    if (inputEl) inputEl.value = "";
  }

  /** Render all subtask rows */
  function render() {
    if (!listEl) return;
    listEl.innerHTML = "";
    items.forEach((st, i) => listEl.appendChild(buildRow(st, i)));
  }

  /** Build one row element */
  function buildRow(st, i) {
    const el = document.createElement("div");
    el.className = "subtask-edit-row";
    el.innerHTML = rowHtml(st, i);
    bindRow(el, i);
    return el;
  }

  /** Create row HTML string */
  function rowHtml(st, i) {
    return `
      <input type="checkbox" ${st.done ? "checked" : ""} data-i="${i}" />
      <input type="text" value="${escapeHtml(st.text)}" data-i="${i}" />
      <button class="icon-btn" title="Löschen" data-i="${i}">
        <img src="./assets/icons/delete.svg" alt="" />
      </button>
    `;
  }

  /** Bind row checkbox/text/delete */
  function bindRow(el, i) {
    bindCheckbox(el, i);
    bindText(el, i);
    bindDelete(el, i);
  }

  /** Bind checkbox done toggle */
  function bindCheckbox(el, i) {
    const cb = el.querySelector('input[type="checkbox"]');
    cb?.addEventListener("change", () => (items[i].done = cb.checked));
  }

  /** Bind text value updates */
  function bindText(el, i) {
    const txt = el.querySelector('input[type="text"]');
    txt?.addEventListener("input", () => (items[i].text = txt.value));
  }

  /** Bind delete button action */
  function bindDelete(el, i) {
    const del = el.querySelector("button");
    del?.addEventListener("click", (e) => onDelete(e, i));
  }

  /** Delete one subtask row */
  function onDelete(e, i) {
    e.preventDefault();
    items.splice(i, 1);
    render();
  }

  /** Return cleaned subtasks */
  function getCleanSubtasks() {
    const clean = cleanItems(items);
    const doneCount = countDone(clean);
    return { subtasks: clean, doneCount };
  }

  /** Normalize and filter items */
  function cleanItems(list) {
    return list
      .map((s) => ({ text: (s.text || "").trim(), done: !!s.done }))
      .filter((s) => s.text.length > 0);
  }

  /** Count completed subtasks */
  function countDone(list) {
    return list.filter((s) => s.done).length;
  }
}
