/**
 * Checks whether the current viewport matches the mobile layout.
 */
function isMobileLayout() {
  return window.innerWidth <= 820;
}

/**
 * Displays the contact detail view in fullscreen mode on mobile devices.
 */
function showDetailFullscreenIfMobile() {
  if (!isMobileLayout()) return;
  const cm = qs(".contacts-main");
  const backBtn = byId("return-arrow");
  if (backBtn) backBtn.classList.remove("d_none");
  if (cm) cm.classList.add("show-detail");
}

/**
 * Hides the fullscreen contact detail view.
 */
function hideDetailFullscreen() {
  const cm = qs(".contacts-main");
  if (cm) cm.classList.remove("show-detail");
}

/**
 * Creates and appends a letter header element to the legacy contact list.
 *
 * @param {string} letter
 * Uppercase grouping letter.
 * @param {HTMLElement} listEl
 * Target list container.
 */
function createLetterHeader(letter, listEl) {
  const el = document.createElement("div");
  el.className = "contacts-letter";
  el.textContent = letter;
  listEl.appendChild(el);
}

/**
 * Creates and appends a legacy contact row.
 *
 * @param {Object} c
 * Normalized contact object.
 * @param {HTMLElement} listEl
 * Target list container.
 */
function createLegacyRow(c, listEl) {
  const row = document.createElement("div");
  row.className = "contact-row";
  row.dataset.id = String(c.id);
  row.innerHTML = legacyRowTemplate(c);
  row.addEventListener("click", () => {
    setActiveRow(c.id);
    renderContactDetailLegacy(c.id);
    showDetailFullscreenIfMobile();
  });
  listEl.appendChild(row);
}

/**
 * Generates the HTML template for a legacy contact row.
 *
 * @param {Object} c
 * Normalized contact object.
 */
function legacyRowTemplate(c) {
  return `
    <div class="avatar-small" style="background-color:${c.color}">${c.initials}</div>
    <div class="contact-row-text">
      <div class="contact-row-name">${c.name}</div>
      <div class="contact-row-email">${c.email}</div>
    </div>
  `;
}

/**
 * Renders the legacy contact list grouped by first letter.
 *
 * @returns {boolean}
 * True if rendering was successful.
 */
function renderContactListLegacy() {
  const listEl = byId("contacts-scroll");
  if (!listEl) return false;
  const contacts = contactsArrayFromState();
  sortContactsInPlace(contacts);
  listEl.innerHTML = "";
  let currentLetter = null;
  contacts.forEach((c) => {
    const letter = getLetter(c.name);
    if (letter !== currentLetter) {
      currentLetter = letter;
      createLetterHeader(letter, listEl);
    }
    createLegacyRow(c, listEl);
  });
  return true;
}

/**
 * Generates the legacy contact detail HTML template.
 *
 * @param {Object} c
 * Normalized contact object.
 */
function legacyDetailTemplate(c) {
  return `
    <div class="contact-header-row">
      <div class="contact-detail-name-header">
      <div class="contact-avatar-circle" style="background-color:${c.color}">
        ${c.initials}
      </div>
      <div class="contact-name-row">
      <h2 class="contact-name">${c.name}</h2>
                <div class="contact-actions">
            <img src="./assets/icons/edit_icon.svg" class="contact-edit-icon contact-action-link"" id="legacyEdit">
            <img src="./assets/icons/delete_icon.svg" class="contact-delete-icon contact-action-link" id="legacyDelete">
          </div>
          </div>
      </div>
      <div class="contact-main-info">
        <div class="contact-section-title">Contact Information</div>
        <div class="contact-info-block">
          <div class="contact-info-label">Email</div>
          <a class="contact-info-value" href="mailto:${c.email}">
            ${c.email}
          </a>
        </div>
        <div class="contact-info-block">
          <div class="contact-info-label">Phone</div>
          <div class="contact-phone-row">
            <span class="contact-info-value">
              ${c.phone || "-"}
            </span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders the legacy contact detail view for a given contact ID.
 *
 * @param {string} id
 * Contact identifier.
 */
function renderContactDetailLegacy(id) {
  const detailEl = byId("contact-detail");
  if (!detailEl) return;
  const c = normalizeContact(id, state.data[id]);
  if (!c) return;
  detailEl.innerHTML = legacyDetailTemplate(c);
  const editBtn = byId("legacyEdit");
  const delBtn = byId("legacyDelete");
  if (editBtn) editBtn.addEventListener("click", () => openModal("edit", c.id));
  if (delBtn) delBtn.addEventListener("click", onDelete);
  if (typeof updateFabForContact === "function") updateFabForContact(c.id);
}

/**
 * Renders an empty legacy contact detail placeholder.
 */
function renderEmptyDetailLegacy() {
  const detailEl = byId("contact-detail");
  if (!detailEl) return;
  detailEl.innerHTML = `
    <p style="color:#aaa; font-size:16px; margin:0;">
      Select a contact to view details.
    </p>
  `;
}

/**
 * Finds an existing contact group by letter.
 *
 * @param {string} letter
 * Grouping letter.
 * @param {HTMLElement} list
 * Contact list container.
 */
function findGroupByLetter(letter, list) {
  const groups = qsa(".group", list);
  for (const g of groups) {
    const titleEl = qs(".group-title", g);
    const text = titleEl?.textContent.trim().toUpperCase();
    if (text === letter) return g;
  }
  return null;
}

/**
 * Inserts a contact group element into the list in alphabetical order.
 *
 * @param {string} letter
 * Grouping letter.
 * @param {HTMLElement} list
 * List container.
 * @param {HTMLElement} newGroup
 * Group element to insert.
 */
function insertGroupSorted(letter, list, newGroup) {
  const groups = qsa(".group", list);
  let placed = false;
  for (const node of groups) {
    const titleEl = qs(".group-title", node);
    const text = titleEl?.textContent.trim().toUpperCase();
    if (text && text > letter) {
      list.insertBefore(newGroup, node);
      placed = true;
      break;
    }
  }
  if (!placed) list.appendChild(newGroup);
}

/**
 * Ensures a contact group exists for a given letter.
 *
 * @param {string} letter
 * Grouping letter.
 */
function ensureGroup(letter) {
  const upper = (letter || "#").toUpperCase();
  const list = qs(".list");
  if (!list) return null;
  const existing = findGroupByLetter(upper, list);
  if (existing) return existing;
  const g = document.createElement("div");
  g.className = "group";
  g.innerHTML = `<div class="group-title">${upper}</div>`;
  insertGroupSorted(upper, list, g);
  return g;
}

/**
 * Inserts a contact row into a group in sorted order.
 *
 * @param {HTMLElement} groupEl
 * Target group element.
 * @param {HTMLElement} rowEl
 * Contact row element.
 */
function insertRowSorted(groupEl, rowEl) {
  const rows = qsa(".row", groupEl);
  const newName = qs(".row-name", rowEl).textContent.trim();
  for (const r of rows) {
    const nm = qs(".row-name", r).textContent.trim();
    const cmp = nm.localeCompare(newName, "de", { sensitivity: "base" });
    if (cmp > 0) {
      groupEl.insertBefore(rowEl, r);
      return;
    }
  }
  groupEl.appendChild(rowEl);
}

/**
 * Creates the HTML template for a modern contact row.
 *
 * @param {Object} c
 * Normalized contact object.
 */
function makeRowTemplate(c) {
  return `
    <div class="avatar" style="background:${c.color}">${c.initials}</div>
    <div>
      <div class="row-name">${c.name}</div>
      <a class="row-email" href="mailto:${c.email}">${c.email}</a>
    </div>
  `;
}

/**
 * Creates a clickable modern contact row button.
 *
 * @param {Object} c
 * Normalized contact object.
 */
function makeRow(c) {
  const button = document.createElement("button");
  button.className = "row";
  button.type = "button";
  button.dataset.id = String(c.id);
  button.innerHTML = makeRowTemplate(c);
  button.addEventListener("click", () => {
    setActiveRow(c.id);
    updateDetailModern(c.id);
    showDetailFullscreenIfMobile();
  });
  return button;
}

/**
 * Sets the active contact row across legacy and modern layouts.
 *
 * @param {string} cid
 * Contact identifier.
 */
function setActiveRow(cid) {
  state.selectedId = cid;
  const targetId = String(cid);
  qsa(".row").forEach((r) => {
    r.classList.toggle("active", r.dataset.id === targetId);
  });
  qsa(".contact-row").forEach((r) => {
    r.classList.toggle("active", r.dataset.id === targetId);
  });
}

/**
 * Generates the modern contact detail HTML template.
 *
 * @param {Object} c
 * Normalized contact object.
 */
function modernDetailTemplate(c) {
  return `
    <div class="detail-header">
      <div class="avatar big" style="background:${c.color}">${c.initials}</div>
      <div class="who">
        <div class="big-name">${c.name}</div>
        <div class="actions">
          <button class="link-btn" id="editBtn" type="button">Edit</button>
          <button class="link-btn" id="deleteBtn" type="button">Delete</button>
        </div>
      </div>
    </div>
    <h2 class="mini-title">Contact Information</h2>
    <div class="info-row">
      <div class="info-key">Email</div>
      <div>
        <a class="row-email" href="mailto:${c.email}">${c.email}</a>
      </div>
    </div>
    <div class="info-row">
      <div class="info-key">Phone</div>
      <div>
        <a class="row-email" href="${telHref(c.phone)}">${c.phone}</a>
      </div>
    </div>
  `;
}

/**
 * Updates the modern contact detail view.
 *
 * @param {string} cid
 * Contact identifier.
 */
function updateDetailModern(cid) {
  const c = normalizeContact(cid, state.data[cid]);
  if (!c) return;
  const detail = qs(".detail-card");
  if (!detail) return;
  detail.innerHTML = modernDetailTemplate(c);
  const editBtn = byId("editBtn");
  const delBtn = byId("deleteBtn");
  if (editBtn) editBtn.addEventListener("click", () => openModal("edit", cid));
  if (delBtn) delBtn.addEventListener("click", onDelete);
  if (typeof updateFabForContact === "function") updateFabForContact(c.id);
}

/**
 * Returns the header template containing the "Add contact" button.
 */
function addButtonTemplate() {
  return `
    <div class="list-head">
      <button class="btn" id="openAddModal" type="button">
        Add new contact ▾
      </button>
    </div>
  `;
}

/**
 * Renders the modern contact list view.
 */
function renderContactsModern() {
  const list = qs(".list");
  if (!list) return false;
  list.innerHTML = "";
  list.insertAdjacentHTML("beforeend", addButtonTemplate());
  const arr = contactsArrayFromState();
  sortContactsInPlace(arr);
  for (const c of arr) {
    const group = ensureGroup(getLetter(c.name));
    if (group) insertRowSorted(group, makeRow(c));
  }
  return true;
}
