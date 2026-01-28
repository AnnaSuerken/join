/**
 * Combines all functions that should be executed upon load within one function
 *
 * 
 */
function init(){
  getContactsData();
  initAssigneeChipToggle();
}

/* ---------- Konfiguration ---------- */

/**
 * Mapping of task categories to their associated display colors.
 * Used to visually distinguish different task types.
 *
 */
let taskCategoryColor = [
  { name: "Technical Task", color: "#20D7C1" },
  { name: "User Story", color: "#0038FF" },
];

/**
 * Escapes special HTML characters to prevent HTML injection
 * and ensure safe text rendering inside the DOM.
 *
 * Converts:
 * - &  → &amp;
 * - <  → &lt;
 * - >  → &gt;
 * - "  → &quot;
 * - '  → &#039;
 *
 * @param {string} str
 * The input string that should be HTML-escaped.
 */
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Generates initials from a full name string.
 *
 * - Uses the first character of the first and second name parts.
 * - If only one word is provided, only one initial is used.
 * - The result is always uppercase and limited to two characters.
 *
 * @param {string} [name=""]
 * The full name from which initials should be generated.
 */
function makeInitials(name = "") {
  const parts = name.trim().split(/\s+/);
  const first = (parts[0]?.[0] || "").toUpperCase();
  const last = (parts[1]?.[0] || "").toUpperCase();
  return (first + last).slice(0, 2);
}

/**
 * Generates a color value based on a name string.
 *
 * The same name will always produce the same color.
 *
 * @param {string} [name=""]
 */
function colorFromName(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h} 70% 45%)`;
}

/* ---------- Contacts / Custom Dropdown ---------- */

let contactsData = [];
let selectedAssignees = [];

/**
 * Fetches contact data from the database and prepares it
 * for usage inside the assignee dropdown.
 *
 * - Loads contacts from the backend
 * - Normalizes initials and colors
 * - Builds the assignee dropdown UI
 * - Renders already selected assignees
 */
async function getContactsData() {
  const data = await dbApi.getData("contacts/");
  const contactsArray = Object.values(data || {});

  contactsData = contactsArray.map((c) => ({
    name: c.name,
    initials: c.initials || makeInitials(c.name),
    color: c.color || colorFromName(c.name),
  }));

  buildAssigneeDropdown();
  renderAssignees();
}

/**
 * Builds the assignee dropdown list based on available contacts.
 *
 */
function buildAssigneeDropdown() {
  const trigger = document.getElementById("assignee-select");
  const list = document.getElementById("assignee-options");
  if (!trigger || !list) return;

  list.innerHTML = contactsData.map(buildAssigneeOptionHtml).join("");
  trigger.setAttribute("aria-expanded", "false");

  if (!trigger._listenersAdded) {
    wireAssigneeDropdown(trigger, list);
    trigger._listenersAdded = true;
  }

  syncOptionSelectedStates();
  buildAssigneeDropdown._sync = syncOptionSelectedStates;
}

/**
 * Creates the HTML template for a single assignee option.
 *
 * @param {{ name: string, initials: string, color: string }} c
 * The contact data for the option.
 *
 * @param {number} i
 * Index of the contact inside the contactsData array.
 */
function buildAssigneeOptionHtml(c, i) {
  return `
    <li class="assignee-option" role="option" aria-selected="false" data-index="${i}">
      <span class="assignee-avatar" style="background:${escapeHtml(
        c.color
      )}">${escapeHtml(c.initials)}</span>
      <span class="assignee-option-name">${escapeHtml(c.name)}</span>
      <span class="assignee-indicator"></span>
    </li>
  `;
}

/**
 * Wires all necessary event listeners for the assignee dropdown.
 *
 * @param {HTMLElement} trigger
 * The dropdown trigger element.
 *
 * @param {HTMLElement} list
 * The dropdown list element.
 */
function wireAssigneeDropdown(trigger, list) {
  trigger.addEventListener("click", () => toggleAssigneeList(trigger, list));
  document.addEventListener("click", (e) =>
    closeAssigneeListOnOutsideClick(e, trigger, list)
  );
  list.addEventListener("click", (e) => handleAssigneeListClick(e));
}

/**
 * Toggles the visibility state of the assignee dropdown.
 *
 * @param {HTMLElement} trigger
 * The dropdown trigger element.
 *
 * @param {HTMLElement} list
 * The dropdown list element.
 */
function toggleAssigneeList(trigger, list) {
  const isOpen = trigger.getAttribute("aria-expanded") === "true";
  list.classList.toggle("d_none", isOpen);
  trigger.setAttribute("aria-expanded", isOpen ? "false" : "true");
}

/**
 * Closes the assignee dropdown when clicking outside of it.
 *
 * @param {MouseEvent} e
 * The click event.
 *
 * @param {HTMLElement} trigger
 * The dropdown trigger element.
 *
 * @param {HTMLElement} list
 * The dropdown list element.
 */
function closeAssigneeListOnOutsideClick(e, trigger, list) {
  if (!trigger.contains(e.target) && !list.contains(e.target)) {
    list.classList.add("d_none");
    trigger.setAttribute("aria-expanded", "false");
  }
}

/**
 * Handles click events inside the assignee dropdown list.
 *
 * Determines which contact was clicked and toggles its selection.
 *
 * @param {MouseEvent} e
 * The click event triggered on the dropdown list.
 */
function handleAssigneeListClick(e) {
  const item = e.target.closest(".assignee-option");
  if (!item) return;
  const idx = Number(item.dataset.index);
  toggleAssigneeByContactIndex(idx);
  syncOptionSelectedStates();
}

/**
 * Synchronizes the visual selected state of all dropdown options
 * with the current selectedAssignees list.
 */
function syncOptionSelectedStates() {
  const list = document.getElementById("assignee-options");
  if (!list) return;

  const selectedNames = new Set(
    selectedAssignees.map((a) => a.name.toLowerCase())
  );

  list.querySelectorAll(".assignee-option").forEach((node) => {
    const i = Number(node.dataset.index);
    const name = (contactsData[i]?.name || "").toLowerCase();
    const isSel = selectedNames.has(name);
    node.setAttribute("aria-selected", String(isSel));
    node.classList.toggle("is-selected", isSel);
  });
}

/**
 * Toggles a contact's selection state based on its index.
 *
 * - Adds the contact if not selected
 * - Removes the contact if already selected
 * - Updates assignee chips and dropdown state
 *
 * @param {number} contactIndex
 * Index of the contact inside contactsData.
 */
function toggleAssigneeByContactIndex(contactIndex) {
  const c = contactsData[contactIndex];
  if (!c) return;

  const pos = selectedAssignees.findIndex(
    (a) => a.name.toLowerCase() === c.name.toLowerCase()
  );

  if (pos >= 0) selectedAssignees.splice(pos, 1);
  else
    selectedAssignees.push({
      name: c.name,
      initials: c.initials,
      color: c.color,
    });

  renderAssignees();
  buildAssigneeDropdown._sync?.();
}

/**
 * Renders avatar chips for the selected assignees.
 *
 * Limits the display to a maximum number of visible chips
 * and adds a "+X" indicator for additional assignees.
 *
 * @param {Array<{ name: string, initials: string, color: string }>} selectedAssignees
 * The list of currently selected assignees.
 *
 * @param {HTMLElement} containerEl
 * The container element where chips should be rendered.
 */
function renderAssigneeChipsLocal(selectedAssignees, containerEl) {
  if (!containerEl) return;

  containerEl.innerHTML = "";
  if (!selectedAssignees.length) return;

  const { shown, more } = getVisibleAssignees(selectedAssignees, 4);
  containerEl.innerHTML =
    renderAssigneeChips(shown) + renderMoreChip(more);
}

function getVisibleAssignees(list, max) {
  return {
    shown: list.slice(0, max),
    more: list.length - Math.min(list.length, max),
  };
}

function renderAssigneeChips(list) {
  return list
    .map(
      (a, i) => `
        <span class="avatar-chip" data-index="${i}"
              style="background:${a.color}" title="${a.name}">
          ${a.initials}
        </span>
      `
    )
    .join("");
}

function renderMoreChip(count) {
  return count > 0
    ? `<span class="avatar-chip more-chip">+${count}</span>`
    : "";
}

/**
 * Renders the currently selected assignees
 * inside the assignee chip container.
 */
function renderAssignees() {
  const wrap = document.getElementById("assignee-list");
  if (!wrap) return;

  renderAssigneeChipsLocal(selectedAssignees, wrap);
}

/**
 * Creates the HTML markup for a single assignee avatar.
 *
 * This function is kept for legacy or inline usage
 * but is not used in the current chip-based rendering logic.
 *
 * @param {{ name: string, initials: string, color: string }} a
 * The assignee data.
 *
 * @param {number} i
 * Index of the assignee.
 *
 * @returns {string}
 * HTML string representing an assignee avatar.
 */
function buildAssigneeAvatarHtml(a, i) {
  return `
    <span
      class="assignee-avatar"
      title="${escapeHtml(a.name)}"
      style="background:${escapeHtml(a.color)}"
      onclick="toggleAssigneeByIndex(${i})"
    >
      ${escapeHtml(a.initials)}
    </span>
  `;
}

/**
 * Removes a selected assignee by index.
 *
 * @param {number} i
 * Index of the assignee inside selectedAssignees.
 */
function toggleAssigneeByIndex(i) {
  selectedAssignees.splice(i, 1);
  renderAssignees();
  buildAssigneeDropdown._sync?.();
}

/**
 * Initializes the click handler for assignee avatar chips.
 *
 * Uses event delegation to allow interaction
 * with dynamically rendered avatar chips.
 */
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

/* ----------Inline-Handler ---------- */
window.currentTaskColumn = window.currentTaskColumn || "todo";
window.getContactsData = getContactsData;
window.toggleAssigneeByIndex = toggleAssigneeByIndex;