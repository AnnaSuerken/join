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
      // ✅ Kontakt markieren + Detail rendern
      setActiveRow(c.id);
      renderContactDetailLegacy(c.id);
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
    // ✅ markiert bleiben
    setActiveRow(c.id);
    updateDetailModern(c.id);
  });
  return b;
}

/** 🔥 Hier wird der aktive Kontakt in beiden Layouts markiert */
function setActiveRow(cid) {
  state.selectedId = cid;
  const targetId = String(cid);

  // Modern
  qsa(".row").forEach((r) => {
    r.classList.toggle("active", r.dataset.id === targetId);
  });

  // Legacy
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
}

function attachLegacyOverlayHandlers() {
  byId("open-add-contact-overlay")?.addEventListener(
    "click",
    openOverlayLegacy
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
    const color = colorPool[hashStr(name) % colorPool.length];
    if (!name || !email) return;
    createContact(name, email, phone, color).then(closeOverlayLegacy);
  });
}

function openModal(mode = "create", cid = state.selectedId) {
  modalMode = mode;
  const overlay = byId("contactModal");
  const card = overlay?.querySelector(".modal");
  const form = byId("contactForm");
  const name = byId("nameInput");
  const email = byId("emailInput");
  const phone = byId("phoneInput");
  if (!overlay || !card || !form || !name || !email || !phone) {
    // Fallback: Legacy-Overlay
    if (mode === "create") openOverlayLegacy();
    else if (cid) {
      byId("contact-name-input") &&
        (byId("contact-name-input").value = state.data[cid]?.name || "");
      byId("contact-email-input") &&
        (byId("contact-email-input").value = state.data[cid]?.email || "");
      byId("contact-phone-input") &&
        (byId("contact-phone-input").value = state.data[cid]?.phone || "");
      openOverlayLegacy();
    }
    return;
  }

  if (mode === "edit") {
    const c = normalizeContact(cid, state.data[cid]);
    name.value = c.name;
    email.value = c.email;
    phone.value = c.phone;
    byId("formAvatar") && (byId("formAvatar").textContent = c.initials);
  } else {
    form.reset();
    byId("formAvatar") && (byId("formAvatar").textContent = "?");
  }

  byId("modalTitle") &&
    (byId("modalTitle").textContent =
      mode === "edit" ? "Edit contact" : "Add contact");
  byId("submitBtn") &&
    (byId("submitBtn").textContent =
      mode === "edit" ? "Save changes ▾" : "Create contact ▾");

  overlay.hidden = false;
  overlay.classList.add("is-open");
  card.classList.remove("is-leaving");
  void card.offsetWidth;
  card.classList.add("is-entering");
  setTimeout(() => name.focus(), 0);

  const cleanupTrap = trapFocus(card);
  const doClose = () => {
    cleanupTrap();
    closeModal();
  };

  const escHandler = (e) => {
    if (e.key === "Escape") {
      document.removeEventListener("keydown", escHandler);
      doClose();
    }
  };
  document.addEventListener("keydown", escHandler);
  const clickHandler = (e) => {
    if (e.target === overlay) {
      overlay.removeEventListener("click", clickHandler);
      doClose();
    }
  };
  overlay.addEventListener("click", clickHandler);
  const animHandler = (e) => {
    if (e.animationName === "modalIn") card.classList.remove("is-entering");
  };
  card.addEventListener("animationend", animHandler, { once: true });
}

function closeModal() {
  const overlay = byId("contactModal");
  const card = overlay?.querySelector(".modal");
  const form = byId("contactForm");
  if (!overlay || !card) return;
  card.classList.remove("is-entering");
  card.classList.add("is-leaving");
  const onEnd = (e) => {
    if (e.animationName !== "modalOut") return;
    card.removeEventListener("animationend", onEnd);
    overlay.classList.remove("is-open");
    overlay.hidden = true;
    card.classList.remove("is-leaving");
    form?.reset();
    byId("formAvatar") && (byId("formAvatar").textContent = "?");
  };
  card.addEventListener("animationend", onEnd);
}

function onSubmitForm(e) {
  e?.preventDefault?.();
  const btn = byId("submitBtn");
  if (btn?.dataset?.busy) return;
  if (btn) btn.dataset.busy = "1";

  const name = (
    byId("nameInput")?.value ||
    byId("contact-name-input")?.value ||
    ""
  ).trim();
  const email = (
    byId("emailInput")?.value ||
    byId("contact-email-input")?.value ||
    ""
  ).trim();
  const phone = (
    byId("phoneInput")?.value ||
    byId("contact-phone-input")?.value ||
    ""
  ).trim();
  if (!name || !email) {
    if (btn) btn.dataset.busy = "";
    return;
  }

  const op =
    modalMode === "edit"
      ? saveEdit(name, email, phone)
      : createContact(name, email, phone);
  Promise.resolve(op).finally(() => {
    if (btn) btn.dataset.busy = "";
    closeModal();
    closeOverlayLegacy();
  });
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
    showToast("Update failed");
  }
}

async function onDelete() {
  const id = state.selectedId;
  if (!id) return;
  if (!confirm("Delete this contact?")) return;
  try {
    await store.deleteData(`contacts/${id}`);
    state.selectedId = null;
  } catch (e) {
    console.error(e);
    showToast("Delete failed");
  }
}

qsa(".contact-row").forEach((r) => {
  r.classList.toggle("active", r.dataset.id === targetId);
});

qsa(".row").forEach((r) => {
  r.classList.toggle("active", r.dataset.id === targetId);
});

function attachModernHandlers() {
  byId("openAddModal")?.addEventListener("click", () => openModal("create"));
  byId("cancelBtn")?.addEventListener("click", closeModal);
  byId("modalCloseBtn")?.addEventListener("click", closeModal);
  byId("contactForm")?.addEventListener("submit", onSubmitForm);
  byId("nameInput")?.addEventListener("input", (e) => {
    const v = e.target.value;
    const el = byId("formAvatar");
    if (el) el.textContent = initialsFromName(v) || "?";
  });
}

/** Nach jedem Render aktive Zeile erneut setzen */
function afterRenderSelectFallback() {
  if (
    state.selectedId &&
    (qs(`.row[data-id="${state.selectedId}"]`) ||
      qs(`.contact-row[data-id="${state.selectedId}"]`))
  ) {
    // 🔥 aktive Markierung wiederherstellen
    setActiveRow(state.selectedId);

    if (qs(".detail-card")) updateDetailModern(state.selectedId);
    else renderContactDetailLegacy(state.selectedId);
    return;
  }

  // Wenn noch nichts gewählt -> ersten Kontakt auswählen
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

function init() {
  startLiveView();
  attachModernHandlers();
  attachLegacyOverlayHandlers();
}

window.addEventListener("load", init);
window.addEventListener("beforeunload", () => state.unsubscribe?.());
