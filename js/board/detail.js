// js/detail.js
import { dbApi } from "../core/firebase.js";
import {
  escapeHtml,
  normalizeSubtasks,
  formatDate,
  capitalize,
  normalizeAssigneesToIds,
} from "../board/helpers.js";

const TASKS_ROOT = "/board";
const COLS = ["todo", "inprogress", "await", "done"];

/* ---------- State + DOM ---------- */
const detailSection = document.getElementById("task-detail-overlay");
const detailCloseBtn = document.getElementById("detail-close-btn");
const detailDeleteBtn = document.getElementById("detail-delete");

let currentDetail = { id: null, col: null, task: null };

export function getCurrentDetail() {
  return currentDetail;
}
export function setCurrentDetail(newDetail) {
  currentDetail = newDetail;
}

/* ---------- Close ---------- */
export function closeDetailOverlay() {
  document.body.classList.remove("board-overlay-open");
  currentDetail = { id: null, col: null, task: null };
}

detailCloseBtn?.addEventListener("click", closeDetailOverlay);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDetailOverlay();
});

/* ---------- Column / Data ---------- */
function findColumnOfTask(id) {
  const data = window.boardData || {};
  for (const c of COLS) {
    if (data[c] && data[c][id]) return c;
  }
  return null;
}

/* ---------- Render Detail ---------- */
export function renderDetail(task) {
  document.getElementById("detail-category").textContent =
    task.category || "No Category";
  document.getElementById("detail-category").style.backgroundColor =
    task.categorycolor || "#0038ff";

  document.getElementById("detail-title").textContent = task.title || "";
  document.getElementById("detail-desc").textContent = task.secondline || "";
  document.getElementById("detail-date").textContent = formatDate(
    task.deadline
  );

  const prio = (task.priority || "low").toLowerCase();
  document.getElementById("detail-priority-text").textContent =
    capitalize(prio);
  document.getElementById(
    "detail-priority-icon"
  ).src = `./assets/icons/${prio}.svg`;

  const box = document.getElementById("detail-assignees");
  box.innerHTML = "";
  (task.assignedDetailed || []).forEach(({ name, color, initials }) => {
    box.innerHTML += `
      <div class="detail-user-row">
        <div class="user" style="background:${escapeHtml(
          color || "#999"
        )}">${escapeHtml(initials || "?")}</div>
        <p>${escapeHtml(name || "")}</p>
      </div>`;
  });

  const stList = document.getElementById("task-overlay-open-subtask-list");
  stList.innerHTML = "";
  (task.subtasks || []).forEach(({ text, done }, i) => {
    stList.innerHTML += `
      <div class="task-overlay-open-subtask-item">
        <input type="checkbox" data-st-index="${i}" ${done ? "checked" : ""} />
        <p>${escapeHtml(text)}</p>
      </div>`;
  });
}

/* ---------- Overlay öffnen ---------- */
export async function openDetailOverlayById(id) {
  const col = findColumnOfTask(id);
  if (!col) return;

  const snap = await dbApi.getData(`${TASKS_ROOT}/${col}/${id}`);
  if (!snap) return;

  const normalized = { ...snap, subtasks: normalizeSubtasks(snap) };
  normalized.subtasksTotal = normalized.subtasks.length;
  normalized.subtasksCompleted = normalized.subtasks.filter(
    (x) => x.done
  ).length;

  const assigneeIds = normalizeAssigneesToIds(normalized.assignedContact);
  const maps = window.boardContacts || {};
  const contactsById = maps.contactsById || new Map();
  const assignedDetailed = assigneeIds
    .map((id2) => contactsById.get(id2))
    .filter(Boolean);

  currentDetail = { id, col, task: { ...normalized, assignedDetailed } };

  renderDetail(currentDetail.task);

  document.body.classList.add("board-overlay-open");
  wireSubtaskToggleHandler();
}

/* ---------- Subtasks toggeln ---------- */
let subtasksHandlerWired = false;
function wireSubtaskToggleHandler() {
  if (subtasksHandlerWired) return;
  subtasksHandlerWired = true;

  document
    .getElementById("task-overlay-open-subtask-list")
    .addEventListener("change", async (e) => {
      const cb = e.target.closest('input[type="checkbox"][data-st-index]');
      if (!cb) return;
      const idx = Number(cb.dataset.stIndex);
      if (!currentDetail.task?.subtasks) return;

      currentDetail.task.subtasks[idx].done = cb.checked;
      const doneCount = currentDetail.task.subtasks.filter(
        (x) => x.done
      ).length;
      const totalCount = currentDetail.task.subtasks.length;

      await saveSubtasksToFirebase(
        currentDetail.col,
        currentDetail.id,
        currentDetail.task.subtasks,
        doneCount,
        totalCount
      );
      // Board-Render übernimmt der onData-Listener in board.js
    });
}

async function saveSubtasksToFirebase(
  col,
  id,
  subtasks,
  doneCount,
  totalCount
) {
  const updates = {};
  updates[`${col}/${id}/subtasks`] = subtasks;
  updates[`${col}/${id}/subtasksCompleted`] = doneCount;
  updates[`${col}/${id}/subtasksTotal`] = totalCount;
  await dbApi.updateData(TASKS_ROOT, updates);
}

/* ---------- Löschen ---------- */
async function delTask(id) {
  const col = findColumnOfTask(id);
  if (!col) return;
  await dbApi.deleteData(`${TASKS_ROOT}/${col}/${id}`);
}

detailDeleteBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  e.stopPropagation();
  const { id } = currentDetail || {};
  if (!id) return;
  await delTask(id);
  closeDetailOverlay();
  // onData-Listener in board.js aktualisiert die Spalten
});
