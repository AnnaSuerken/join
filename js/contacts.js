function genId() {
  return Date.now().toString(16) + Math.random().toString(16).slice(2);
}

const colorPool = [
  "#FF7A00",
  "#29ABE2",
  "#6E52FF",
  "#1FD7C1",
  "#FC71FF",
  "#FFBB2B",
];

const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => [...r.querySelectorAll(s)];
const byId = (id) => document.getElementById(id);

const initialsFromName = (n) => {
  const p = String(n || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (p.length === 0) return "";
  if (p.length === 1) return p[0].substring(0, 2).toUpperCase();
  return (p[0][0] + p[1][0]).toUpperCase();
};
const telHref = (s) => `tel:${(s || "").replace(/\s+/g, "")}`;
const getLetter = (n) => (n?.[0] || "#").toUpperCase();
const hashStr = (s = "") =>
  Array.from(s).reduce((acc, ch) => (acc * 33 + ch.charCodeAt(0)) >>> 0, 5381);

const state = {
  data: {},
  selectedId: null,
  unsubscribe: null,
};

const localStore = (() => {
  const KEY = "contactsStoreV1";
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn("Local store load failed", e);
      return {};
    }
  }
  function save(obj) {
    try {
      localStorage.setItem(KEY, JSON.stringify(obj || {}));
    } catch (e) {
      console.warn("Local store save failed", e);
    }
  }
  let mem = load();
  const listeners = new Set();
  function emit() {
    for (const cb of listeners) cb(mem);
  }
  return {
    async pushData(path, payload) {
      const id = payload.id || genId();
      mem[id] = { ...payload, id };
      save(mem);
      emit();
      return id;
    },
    async updateData(path, patch) {
      const id = path.split("/").pop();
      if (!mem[id]) mem[id] = { id };
      mem[id] = { ...mem[id], ...patch };
      save(mem);
      emit();
    },
    async deleteData(path) {
      const id = path.split("/").pop();
      delete mem[id];
      save(mem);
      emit();
    },
    onData(path, cb) {
      listeners.add(cb);
      cb(mem);
      return () => listeners.delete(cb);
    },
    seedIfEmpty(seedArr) {
      if (Object.keys(mem).length) return;
      for (const c of seedArr) {
        const id = c.id || genId();
        mem[id] = { ...c, id };
      }
      save(mem);
    },
  };
})();

const store =
  typeof window !== "undefined" && window.dbApi
    ? {
        pushData: (p, v) => window.dbApi.pushData(p, v),
        updateData: (p, v) => window.dbApi.updateData(p, v),
        deleteData: (p) => window.dbApi.deleteData(p),
        onData: (p, cb) => window.dbApi.onData(p, cb),
        seedIfEmpty: () => {},
      }
    : localStore;

/*************** Mobile Helper ***************/

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

/*************** Normalisierung & Helper ***************/

function normalizeContact(id, raw) {
  const name = raw?.name ?? "";
  const email = raw?.email ?? "";
  const phone = raw?.phone ?? "";
  const initials = raw?.initials || initialsFromName(name);

  const baseColor = raw?.color || colorPool[hashStr(id) % colorPool.length];
  return { id, name, email, phone, initials, color: baseColor };
}

function contactsArrayFromState() {
  return Object.entries(state.data || {}).map(([id, raw]) =>
    normalizeContact(id, raw)
  );
}

function sortContactsInPlace(arr) {
  arr.sort((a, b) =>
    a.name.localeCompare(b.name, "de", { sensitivity: "base" })
  );
}

/**************** Legacy-Render ****************/

function renderContactListLegacy() {
  const listEl = byId("contacts-scroll");
  if (!listEl) return false;

  const contacts = contactsArrayFromState();
  sortContactsInPlace(contacts);

  listEl.innerHTML = "";
  let currentLetter = null;

  contacts.forEach((c) => {
    const firstLetter = getLetter(c.name);
    if (firstLetter !== currentLetter) {
      currentLetter = firstLetter;
      const letterEl = document.createElement("div");
      letterEl.className = "contacts-letter";
      letterEl.textContent = currentLetter;
      listEl.appendChild(letterEl);
    }
    const row = document.createElement("div");
    row.className = "contact-row";
    row.dataset.id = String(c.id);
    row.innerHTML = `
      <div class="avatar-small" style="background-color:${c.color}">${c.initials}</div>
      <div class="contact-row-text">
        <div class="contact-row-name">${c.name}</div>
        <div class="contact-row-email">${c.email}</div>
      </div>`;
    row.addEventListener("click", () => {
      setActiveRow(c.id);
      renderContactDetailLegacy(c.id);
      showDetailFullscreenIfMobile();
    });
    listEl.appendChild(row);
  });
  return true;
}

function renderContactDetailLegacy(id) {
  const detailEl = byId("contact-detail");
  if (!detailEl) return;
  const c = normalizeContact(id, state.data[id]);
  if (!c) return;
  detailEl.innerHTML = `
    <div class="contact-header-row">
      <div class="contact-avatar-circle" style="background-color:${c.color}">${
    c.initials
  }</div>
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
          <a class="contact-info-value" href="mailto:${c.email}">${c.email}</a>
        </div>
        <div class="contact-info-block">
          <div class="contact-info-label">Phone</div>
          <div class="contact-phone-row">
            <div class="phone-icon-bubble">
              <img src="./assets/icons/call.svg" alt="phone icon" class="phone-icon-img" />
            </div>
            <span class="contact-info-value">${c.phone || "-"}</span>
          </div>
        </div>
      </div>
    </div>`;
  byId("legacyEdit")?.addEventListener("click", () => openModal("edit", c.id));
  byId("legacyDelete")?.addEventListener("click", onDelete);
}

function renderEmptyDetailLegacy() {
  const detailEl = byId("contact-detail");
  if (!detailEl) return;
  detailEl.innerHTML = `<p style="color:#aaa; font-size:16px; margin:0;">Select a contact to view details.</p>`;
}

/**************** Modern-Render ****************/

function ensureGroup(letter) {
  letter = (letter || "#").toUpperCase();
  const list = qs(".list");
  if (!list) return null;
  const groups = qsa(".group", list);
  for (const g of groups) {
    const t = qs(".group-title", g)?.textContent.trim().toUpperCase();
    if (t === letter) return g;
  }
  const g = document.createElement("div");
  g.className = "group";
  g.innerHTML = `<div class="group-title">${letter}</div>`;
  let placed = false;
  for (const node of groups) {
    const t = qs(".group-title", node)?.textContent.trim().toUpperCase();
    if (t && t > letter) {
      list.insertBefore(g, node);
      placed = true;
      break;
    }
  }
  if (!placed) list.appendChild(g);
  return g;
}

function insertRowSorted(groupEl, rowEl) {
  const rows = qsa(".row", groupEl);
  const newName = qs(".row-name", rowEl).textContent.trim();
  for (const r of rows) {
    const nm = qs(".row-name", r).textContent.trim();
    if (nm.localeCompare(newName, "de", { sensitivity: "base" }) > 0) {
      groupEl.insertBefore(rowEl, r);
      return;
    }
  }
  groupEl.appendChild(rowEl);
}

function makeRow(c) {
  const b = document.createElement("button");
  b.className = "row";
  b.type = "button";
  b.dataset.id = String(c.id);
  b.innerHTML = `
    <div class="avatar" style="background:${c.color}">${c.initials}</div>
    <div>
      <div class="row-name">${c.name}</div>
      <a class="row-email" href="mailto:${c.email}">${c.email}</a>
    </div>`;
  b.addEventListener("click", () => {
    setActiveRow(c.id);
    updateDetailModern(c.id);
    showDetailFullscreenIfMobile();
  });
  return b;
}

/** aktive Kontaktzeile markieren */
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

function updateDetailModern(cid) {
  const c = normalizeContact(cid, state.data[cid]);
  if (!c) return;
  const d = qs(".detail-card");
  if (!d) return;
  d.innerHTML = `
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
      <div><a class="row-email" href="mailto:${c.email}">${c.email}</a></div>
    </div>
    <div class="info-row">
      <div class="info-key">Phone</div>
      <div><a class="row-email" href="${telHref(c.phone)}">${c.phone}</a></div>
    </div>`;
  byId("editBtn")?.addEventListener("click", () => openModal("edit", cid));
  byId("deleteBtn")?.addEventListener("click", onDelete);
}

function addButtonTemplate() {
  return `
    <div class="list-head">
      <button class="btn" id="openAddModal" type="button">Add new contact ▾</button>
    </div>`;
}

function renderContactsModern() {
  const list = qs(".list");
  if (!list) return false;
  list.innerHTML = "";
  list.insertAdjacentHTML("beforeend", addButtonTemplate());
  const arr = contactsArrayFromState();
  sortContactsInPlace(arr);
  for (const c of arr) {
    const g = ensureGroup(getLetter(c.name));
    insertRowSorted(g, makeRow(c));
  }
  return true;
}

/*************************
 * Modal & Overlay
 *************************/
let modalMode = "create";

function trapFocus(scope) {
  const f = scope.querySelectorAll(
    'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
  );
  const first = f[0],
    last = f[f.length - 1];
  function onKey(e) {
    if (e.key !== "Tab") return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  scope.addEventListener("keydown", onKey);
  return () => scope.removeEventListener("keydown", onKey);
}

function openOverlayLegacy() {
  const overlay = byId("add-contact-overlay");
  if (overlay) overlay.classList.remove("d_none");
}

function closeOverlayLegacy() {
  const overlay = byId("add-contact-overlay");
  if (overlay) overlay.classList.add("d_none");
  byId("add-contact-form")?.reset();

  // Avatar im Overlay wieder zurück auf Standard
  const avatar = byId("modal-avatar-preview");
  if (avatar) {
    avatar.style.backgroundColor = "#efefef";
    avatar.innerHTML =
      '<img src="./assets/icons/person.svg" alt="avatar placeholder" />';
  }
}

/**
 * Gemeinsamer Einstieg für Create & Edit – nutzt den Legacy-Overlay
 */
function openModal(mode = "create", cid = state.selectedId) {
  modalMode = mode;

  const nameInput = byId("contact-name-input");
  const emailInput = byId("contact-email-input");
  const phoneInput = byId("contact-phone-input");
  const titleEl = qs(".add-contact-headline");
  const primaryBtn = byId("create-contact-btn");
  const avatar = byId("modal-avatar-preview");

  if (!nameInput || !emailInput || !phoneInput) {
    openOverlayLegacy();
    return;
  }

  if (mode === "edit" && cid && state.data[cid]) {
    const c = normalizeContact(cid, state.data[cid]);
    nameInput.value = c.name;
    emailInput.value = c.email;
    phoneInput.value = c.phone || "";

    if (titleEl) titleEl.textContent = "Edit contact";
    if (primaryBtn) primaryBtn.textContent = "Save contact ✓";

    // 🔥 Avatar des Kontakts im Overlay anzeigen
    if (avatar) {
      avatar.style.backgroundColor = c.color;
      avatar.innerHTML = `<span style="color:#fff; font-size:24px; font-weight:500;">${c.initials}</span>`;
    }
  } else {
    // Create-Modus
    nameInput.value = "";
    emailInput.value = "";
    phoneInput.value = "";

    if (titleEl) titleEl.textContent = "Add contact";
    if (primaryBtn) primaryBtn.textContent = "Create contact ✓";

    // Standard-Avatar (Icon)
    if (avatar) {
      avatar.style.backgroundColor = "#efefef";
      avatar.innerHTML =
        '<img src="./assets/icons/person.svg" alt="avatar placeholder" />';
    }
  }

  openOverlayLegacy();
}

function attachLegacyOverlayHandlers() {
  byId("open-add-contact-overlay")?.addEventListener("click", () =>
    openModal("create")
  );

  byId("close-add-contact-overlay")?.addEventListener(
    "click",
    closeOverlayLegacy
  );
  byId("cancel-add-contact-overlay")?.addEventListener(
    "click",
    closeOverlayLegacy
  );

  byId("create-contact-btn")?.addEventListener("click", () => {
    const name = byId("contact-name-input")?.value.trim();
    const email = byId("contact-email-input")?.value.trim();
    const phone = byId("contact-phone-input")?.value.trim();

    if (!name || !email) return;

    if (modalMode === "edit" && state.selectedId) {
      saveEdit(name, email, phone).then(() => {
        closeOverlayLegacy();
      });
    } else {
      const color = colorPool[hashStr(name) % colorPool.length];
      createContact(name, email, phone, color).then(() => {
        closeOverlayLegacy();
      });
    }
  });
}

function closeModal() {
  // moderner Modal wird aktuell nicht genutzt
}

function onSubmitForm(e) {
  e?.preventDefault?.();
}

/****************
 * CRUD actions *
 ****************/
async function createContact(name, email, phone, color) {
  const payload = {
    name,
    email,
    phone,
    initials: initialsFromName(name),
    color,
  };
  try {
    const key = await store.pushData(`contacts`, payload);
    state.selectedId = key;
  } catch (e) {
    console.error(e);
    ("Could not save contact");
  }
}

async function saveEdit(name, email, phone) {
  const id = state.selectedId;
  if (!id) return;
  try {
    await store.updateData(`contacts/${id}`, {
      name,
      email,
      phone,
      initials: initialsFromName(name),
      color: state.data[id]?.color,
    });
  } catch (e) {
    console.error(e);
    typeof showToast === "function" && showToast("Update failed");
  }
}

async function onDelete() {
  const id = state.selectedId;
  if (!id) return;
  if (!confirm("Delete this contact?")) return;
  try {
    await store.deleteData(`contacts/${id}`);
    state.selectedId = null;
    hideDetailFullscreen();
  } catch (e) {
    console.error(e);
    typeof showToast === "function" && showToast("Delete failed");
  }
}

/** Nach jedem Render aktive Zeile erneut setzen */
function afterRenderSelectFallback() {
  if (
    state.selectedId &&
    (qs(`.row[data-id="${state.selectedId}"]`) ||
      qs(`.contact-row[data-id="${state.selectedId}"]`))
  ) {
    setActiveRow(state.selectedId);

    if (qs(".detail-card")) updateDetailModern(state.selectedId);
    else renderContactDetailLegacy(state.selectedId);
    return;
  }

  const firstModern = qs(".row");
  const firstLegacy = qs(".contact-row");
  const first = firstModern || firstLegacy;
  if (first) {
    const cid = first.dataset.id;
    state.selectedId = cid;
    setActiveRow(cid);

    if (qs(".detail-card")) updateDetailModern(cid);
    else renderContactDetailLegacy(cid);
  } else {
    const d = qs(".detail-card");
    if (d) d.innerHTML = "<p>No contact selected.</p>";
    else renderEmptyDetailLegacy();
  }
}

let scheduled = false;
function scheduleRender() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;

    const usedModern = renderContactsModern();
    if (!usedModern) renderContactListLegacy();

    attachModernHandlers();
    afterRenderSelectFallback();
  });
}

function startLiveView() {
  state.unsubscribe?.();
  state.unsubscribe = store.onData("contacts", (data) => {
    state.data = data || {};
    scheduleRender();
  });
}

function attachModernHandlers() {
  byId("openAddModal")?.addEventListener("click", () => openModal("create"));

  const backBtn = byId("return-arrow");
  if (backBtn && !backBtn.dataset.bound) {
    backBtn.addEventListener("click", () => {
      backBtn.classList.add("d_none");
      hideDetailFullscreen();
    });
    backBtn.dataset.bound = "1";
  }
}

function init() {
  startLiveView();
  attachModernHandlers();
  attachLegacyOverlayHandlers();

  window.addEventListener("resize", () => {
    if (!isMobileLayout()) {
      hideDetailFullscreen();
      const backBtn = byId("return-arrow");
      if (backBtn) backBtn.classList.add("d_none");
    }
  });
}

window.addEventListener("load", init);
window.addEventListener("beforeunload", () => state.unsubscribe?.());
