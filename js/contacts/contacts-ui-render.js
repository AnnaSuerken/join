function isMobileLayout() {
  return window.innerWidth <= 820;
}

function showDetailFullscreenIfMobile() {
  if (!isMobileLayout()) return;
  const cm = qs(".contacts-main");
  const backBtn = byId("return-arrow");
  if (backBtn) backBtn.classList.remove("d_none");
  if (cm) cm.classList.add("show-detail");
}

function hideDetailFullscreen() {
  const cm = qs(".contacts-main");
  if (cm) cm.classList.remove("show-detail");
}

/* Legacy Render */

function createLetterHeader(letter, listEl) {
  const el = document.createElement("div");
  el.className = "contacts-letter";
  el.textContent = letter;
  listEl.appendChild(el);
}

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

function legacyRowTemplate(c) {
  return `
    <div class="avatar-small" style="background-color:${c.color}">${c.initials}</div>
    <div class="contact-row-text">
      <div class="contact-row-name">${c.name}</div>
      <div class="contact-row-email">${c.email}</div>
    </div>
  `;
}

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

function legacyDetailTemplate(c) {
  return `
    <div class="contact-header-row">
      <div class="contact-avatar-circle" style="background-color:${c.color}">
        ${c.initials}
      </div>
      <div class="contact-main-info">
        <div class="contact-name-row">
          <h2 class="contact-name">${c.name}</h2>
          <div class="contact-actions">
            <button class="contact-action-link" id="legacyEdit">✎ Edit</button>
            <button class="contact-action-link" id="legacyDelete">🗑 Delete</button>
          </div>
        </div>
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
            <div class="phone-icon-bubble">
              <img src="./assets/icons/call.svg" alt="phone icon" class="phone-icon-img" />
            </div>
            <span class="contact-info-value">
               ${c.phone || "-"}
            </span>
          </div>
        </div>
      </div>
    </div>
  `;
}

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

function renderEmptyDetailLegacy() {
  const detailEl = byId("contact-detail");
  if (!detailEl) return;
  detailEl.innerHTML = `
    <p style="color:#aaa; font-size:16px; margin:0;">
      Select a contact to view details.
    </p>
  `;
}

/* Modern Render */

function findGroupByLetter(letter, list) {
  const groups = qsa(".group", list);
  for (const g of groups) {
    const titleEl = qs(".group-title", g);
    const text = titleEl?.textContent.trim().toUpperCase();
    if (text === letter) return g;
  }
  return null;
}

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

function makeRowTemplate(c) {
  return `
    <div class="avatar" style="background:${c.color}">${c.initials}</div>
    <div>
      <div class="row-name">${c.name}</div>
      <a class="row-email" href="mailto:${c.email}">${c.email}</a>
    </div>
  `;
}

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

function addButtonTemplate() {
  return `
    <div class="list-head">
      <button class="btn" id="openAddModal" type="button">
        Add new contact ▾
      </button>
    </div>
  `;
}

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
