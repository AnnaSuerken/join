// js/edit.js
import { dbApi } from "../firebase.js";
import {
  escapeHtml,
  normalizeSubtasks,
  toISODateOnly,
  normalizeAssigneesToIds,
} from "../board/helpers.js";
import {
  getCurrentDetail,
  renderDetail,
} from "../board/detail.js";

const TASKS_ROOT = "/board";

/* ---------- DOM ---------- */
const editSection = document.getElementById("task-edit-overlay");
const editCloseBtn = document.getElementById("edit-close-btn");
const editOkBtn = document.getElementById("edit-ok-btn");
const detailEditBtn = document.getElementById("detail-edit");

const editTitle = document.getElementById("edit-title");
const editDesc = document.getElementById("edit-desc");
const editDate = document.getElementById("edit-date");

// Priority Buttons
const prioBtns = {
  urgent: document.getElementById("edit-prio-urgent"),
  medium: document.getElementById("edit-prio-medium"),
  low: document.getElementById("edit-prio-low"),
};
let editPriority = "medium";

Object.entries(prioBtns).forEach(([key, btn]) =>
  btn?.addEventListener("click", () => setEditPriority(key))
);

function setEditPriority(p) {
  editPriority = p;

  Object.entries(prioBtns).forEach(([key, btn]) => {
    if (!btn) return;
    const img = btn.querySelector("img");
    const isActive = key === p;

    btn.classList.toggle("active", isActive);

    if (img) {
      if (key === "urgent") {
        img.src = isActive
          ? "./assets/icons/urgent-white.svg"
          : "./assets/icons/urgent-red.svg";
      } else if (key === "medium") {
        img.src = isActive
          ? "./assets/icons/medium-white.svg"
          : "./assets/icons/medium-orange.svg";
      } else if (key === "low") {
        img.src = isActive
          ? "./assets/icons/low-white.svg"
          : "./assets/icons/low-green.svg";
      }
    }
  });
}

/* ---------- Assignees ---------- */
const editAssigneeSelect = document.getElementById("edit-assignee-select");
const editAssigneeOptions = document.getElementById("edit-assignee-options");
const editAssigneeList = document.getElementById("edit-assignee-list");
let selectedAssigneeIds = [];

editAssigneeSelect?.addEventListener("click", () => {
  const open = editAssigneeOptions.classList.contains("d_none");
  toggleEditAssigneeDropdown(open);
});

document.addEventListener("click", (e) => {
  if (editSection.classList.contains("d_none")) return;
  if (
    !editAssigneeSelect.contains(e.target) &&
    !editAssigneeOptions.contains(e.target)
  ) {
    toggleEditAssigneeDropdown(false);
  }
});

function toggleEditAssigneeDropdown(open) {
  editAssigneeOptions.classList.toggle("d_none", !open);
  editAssigneeSelect.setAttribute("aria-expanded", String(open));
}

function renderEditAssigneeChips() {
  if (!editAssigneeList) return;
  editAssigneeList.innerHTML = "";

  const maps = window.boardContacts || {};
  const contactsById = maps.contactsById || new Map();
  const contacts = selectedAssigneeIds
    .map((id) => contactsById.get(id))
    .filter(Boolean);
  if (!contacts.length) return;

  contacts.forEach((c) => {
    const row = document.createElement("div");
    row.className = "detail-user-row";
    row.innerHTML = `
      <div class="user" style="background:${escapeHtml(c.color || "#999")}">
        ${escapeHtml(c.initials || "?")}
      </div>
      <p>${escapeHtml(c.name || "")}</p>
      <button class="remove-assignee" title="Entfernen" data-id="${escapeHtml(
        c.id
      )}">✕</button>
    `;
    row.querySelector(".remove-assignee").addEventListener("click", () => {
      selectedAssigneeIds = selectedAssigneeIds.filter((x) => x !== c.id);
      renderEditAssigneeChips();
      renderEditAssigneeOptions();
    });
    editAssigneeList.appendChild(row);
  });
}

function renderEditAssigneeOptions() {
  if (!editAssigneeOptions) return;
  editAssigneeOptions.innerHTML = "";

  const maps = window.boardContacts || {};
  const contactsById = maps.contactsById || new Map();
  const all = [...contactsById.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  all.forEach((c) => {
    const selected = selectedAssigneeIds.includes(c.id);
    const li = document.createElement("li");
    li.role = "option";
    li.className = "assignee-option" + (selected ? " is-selected" : "");
    li.tabIndex = 0;
    li.innerHTML = `
      <span class="assignee-avatar" style="background:${escapeHtml(
        c.color
      )}">${escapeHtml(c.initials)}</span>
      <span>${escapeHtml(c.name)}</span>
      <span class="assignee-check">✔</span>
    `;

    const toggle = () => {
      if (selected) {
        selectedAssigneeIds = selectedAssigneeIds.filter((x) => x !== c.id);
      } else {
        selectedAssigneeIds.push(c.id);
      }
      renderEditAssigneeChips();
      renderEditAssigneeOptions();
    };

    li.addEventListener("click", toggle);
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });

    editAssigneeOptions.appendChild(li);
  });
}

/* ---------- Subtasks im Edit ---------- */
const editSubtaskInput = document.getElementById("edit-subtask-input");
const editSubtaskAddBtn = document.getElementById("edit-subtask-add");
const editSubtaskList = document.getElementById("edit-subtask-list");
let editSubtasks = [];

editSubtaskAddBtn?.addEventListener("click", () => addEditSubtask());
editSubtaskInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addEditSubtask();
  }
});

function addEditSubtask() {
  const val = (editSubtaskInput.value || "").trim();
  if (!val) return;
  editSubtasks.push({ text: val, done: false });
  editSubtaskInput.value = "";
  renderEditSubtasks();
}

function renderEditSubtasks() {
  if (!editSubtaskList) return;
  editSubtaskList.innerHTML = "";

  editSubtasks.forEach((st, i) => {
    const row = document.createElement("div");
    row.className = "subtask-edit-row";
    row.innerHTML = `
      <input type="checkbox" ${st.done ? "checked" : ""} data-i="${i}" />
      <input type="text" value="${escapeHtml(st.text)}" data-i="${i}" />
      <button class="icon-btn" title="Löschen" data-i="${i}">
        <img src="./assets/icons/delete.svg" alt="" />
      </button>
    `;
    const checkbox = row.querySelector('input[type="checkbox"]');
    const textInput = row.querySelector('input[type="text"]');
    const delBtn = row.querySelector("button");

    checkbox.addEventListener("change", () => {
      editSubtasks[i].done = checkbox.checked;
    });
    textInput.addEventListener("input", () => {
      editSubtasks[i].text = textInput.value;
    });
    delBtn.addEventListener("click", () => {
      editSubtasks.splice(i, 1);
      renderEditSubtasks();
    });

    editSubtaskList.appendChild(row);
  });
}

/* ---------- Öffnen / Schließen / Speichern ---------- */
detailEditBtn?.addEventListener("click", openEditOverlay);
editCloseBtn?.addEventListener("click", closeEditOverlay);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !editSection.classList.contains("d_none")) {
    closeEditOverlay();
  }
});
editOkBtn?.addEventListener("click", saveEditOverlay);

function openEditOverlay() {
  const detail = getCurrentDetail();
  if (!detail?.task) return;
  const task = detail.task;

  editTitle.value = task.title || "";
  editDesc.value = task.secondline || "";

  const createdAtStr =
    task.createdAt || task.created || task.created_at || null;
  const createdAt = createdAtStr ? new Date(createdAtStr) : new Date();
  const minDateStr = toISODateOnly(createdAt);
  editDate.min = minDateStr;
  const hint = document.getElementById("edit-date-hint");
  if (hint) hint.textContent = `Earliest: ${minDateStr}`;

  if (task.deadline) {
    const d = new Date(task.deadline);
    editDate.value = isNaN(d) ? "" : toISODateOnly(d);
  } else {
    editDate.value = "";
  }

  setEditPriority((task.priority || "medium").toLowerCase());

  selectedAssigneeIds = normalizeAssigneesToIds(task.assignedContact);
  renderEditAssigneeChips();
  renderEditAssigneeOptions();

  const lbl = editAssigneeSelect?.querySelector(".assignee-select-label");
  if (lbl) lbl.textContent = "Select contacts to assign";

  editSubtasks = normalizeSubtasks(task).map((s) => ({
    text: s.text,
    done: !!s.done,
  }));
  renderEditSubtasks();

  document.getElementById("task-detail-overlay")?.classList.add("d_none");
  editSection.classList.remove("d_none");
  document.body.classList.add("board-overlay-open");
}

function closeEditOverlay() {
  editSection.classList.add("d_none");
  document.body.classList.remove("board-overlay-open");
  document.getElementById("task-detail-overlay")?.classList.remove("d_none");
}

async function saveEditOverlay() {
  const detail = getCurrentDetail();
  if (!detail?.id || !detail?.col || !detail.task) return;

  const title = editTitle.value.trim();
  const secondline = editDesc.value.trim();

  const task = detail.task;
  const createdAtStr =
    task.createdAt || task.created || task.created_at || null;
  const minDate = createdAtStr ? new Date(createdAtStr) : new Date();
  minDate.setHours(0, 0, 0, 0);

  let deadlineISO = "";
  if (editDate.value) {
    const chosen = new Date(editDate.value);
    chosen.setHours(0, 0, 0, 0);
    if (chosen < minDate) {
      // showToast kommt aus deiner bestehenden UI
      if (typeof window.showToast === "function") {
        window.showToast(
          `Das Fälligkeitsdatum darf nicht vor dem Erstellungsdatum liegen (${toISODateOnly(
            minDate
          )}).`
        );
      } else {
        alert(
          `Das Fälligkeitsdatum darf nicht vor dem Erstellungsdatum liegen (${toISODateOnly(
            minDate
          )}).`
        );
      }
      return;
    }
    deadlineISO = new Date(
      chosen.getTime() - chosen.getTimezoneOffset() * 60000
    ).toISOString();
  }

  const priority = editPriority;
  const assignedContact = [...selectedAssigneeIds];

  const cleanedSubtasks = editSubtasks
    .map((s) => ({ text: (s.text || "").trim(), done: !!s.done }))
    .filter((s) => s.text.length > 0);
  const doneCount = cleanedSubtasks.filter((s) => s.done).length;
  const totalCount = cleanedSubtasks.length;

  const updatedTask = {
    ...task,
    title,
    secondline,
    deadline: deadlineISO,
    priority,
    assignedContact,
    subtasks: cleanedSubtasks,
    subtasksCompleted: doneCount,
    subtasksTotal: totalCount,
    createdAt:
      task.createdAt ||
      task.created ||
      task.created_at ||
      new Date().toISOString(),
  };

  await dbApi.updateData(TASKS_ROOT, {
    [`${detail.col}/${detail.id}`]: updatedTask,
  });

  // Detail-Ansicht aktualisieren
  const maps = window.boardContacts || {};
  const contactsById = maps.contactsById || new Map();
  const assignedDetailed = assignedContact
    .map((id) => contactsById.get(id))
    .filter(Boolean);

  const newDetail = {
    ...detail,
    task: { ...updatedTask, assignedDetailed },
  };
  // Wir können getCurrentDetail() nicht direkt überschreiben, aber
  // detail.js nutzt das Modul-interne currentDetail, das hier schon geändert ist.
  renderDetail(newDetail.task);

  closeEditOverlay();
  // Board-Render passiert automatisch über onData in board.js
}
