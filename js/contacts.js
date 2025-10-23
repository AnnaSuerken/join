/* ---------- State ---------- */
const state = {
  data: {}, // {contactId: contactObj, ...}
  selectedId: null, // aktuell gewählte Kontakt-ID
  unsubscribe: null, // Live-Listener cleanup
};

const colorPool = [
  "#FF7A00",
  "#29ABE2",
  "#6E52FF",
  "#1FD7C1",
  "#FC71FF",
  "#FFBB2B",
];
let modalMode = "create";

/* ---------- DOM helpers ---------- */
const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => [...r.querySelectorAll(s)];
const byId = (id) => document.getElementById(id);

/* ---------- utils ---------- */
const initialsFromName = (n) => {
  const p = String(n || "")
    .trim()
    .split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase();
};
const telHref = (s) => `tel:${(s || "").replace(/\s+/g, "")}`;
const getLetter = (n) => (n?.[0] || "#").toUpperCase();
const hashStr = (s = "") =>
  Array.from(s).reduce((acc, ch) => (acc * 33 + ch.charCodeAt(0)) >>> 0, 5381);

/** sorge für vollständige Felder + stabile Farbe */
function normalizeContact(id, raw) {
  const name = raw?.name ?? "";
  const email = raw?.email ?? "";
  const phone = raw?.phone ?? "";
  const initials = raw?.initials || initialsFromName(name);
  const color = raw?.color || colorPool[hashStr(id) % colorPool.length];
  return { id, name, email, phone, initials, color };
}

function getContact(id) {
  const raw = state.data?.[id];
  return raw ? normalizeContact(id, raw) : null;
}

/* ---------- focus trap ---------- */
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

/* ---------- groups ---------- */
function ensureGroup(letter) {
  letter = (letter || "#").toUpperCase();
  const list = qs(".list"),
    groups = qsa(".group", list);
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

/* ---------- rows / selection ---------- */
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
    updateDetail(c.id);
  });
  return b;
}

function setActiveRow(cid) {
  state.selectedId = cid;
  qsa(".row").forEach((r) =>
    r.classList.toggle("active", r.dataset.id === String(cid))
  );
}

/* ---------- detail ---------- */
function updateDetail(cid) {
  const c = getContact(cid);
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
    <div class="info-row"><div class="info-key">Email</div>
      <div><a class="row-email" href="mailto:${c.email}">${
    c.email
  }</a></div></div>
    <div class="info-row"><div class="info-key">Phone</div>
      <div><a class="row-email" href="${telHref(c.phone)}">${
    c.phone
  }</a></div></div>`;

  byId("editBtn").addEventListener("click", () => openModal("edit", cid));
  byId("deleteBtn").addEventListener("click", onDelete);
}

/* ---------- render ---------- */
function addButtonTemplate() {
  return `
    <div class="list-head">
      <button class="btn" id="openAddModal" type="button">Add new contact ▾</button>
    </div>`;
}

function renderContacts() {
  const list = qs(".list");
  if (!list) return;

  list.innerHTML = "";
  list.insertAdjacentHTML("beforeend", addButtonTemplate());

  const arr = Object.entries(state.data || {}).map(([id, raw]) =>
    normalizeContact(id, raw)
  );

  const sorted = arr.sort((a, b) =>
    a.name.localeCompare(b.name, "de", { sensitivity: "base" })
  );

  for (const c of sorted) {
    const g = ensureGroup(getLetter(c.name));
    insertRowSorted(g, makeRow(c));
  }
}

/* ---------- modal ---------- */
function openModal(mode = "create", cid = state.selectedId) {
  modalMode = mode;
  const form = byId("contactForm"),
    name = byId("nameInput"),
    email = byId("emailInput"),
    phone = byId("phoneInput");

  if (mode === "edit") {
    const c = getContact(cid);
    if (!c) return;
    name.value = c.name;
    email.value = c.email;
    phone.value = c.phone;
    byId("formAvatar").textContent = c.initials;
  } else {
    form.reset();
    byId("formAvatar").textContent = "?";
  }

  byId("modalTitle").textContent =
    mode === "edit" ? "Edit contact" : "Add contact";
  byId("submitBtn").textContent =
    mode === "edit" ? "Save changes ▾" : "Create contact ▾";

  const overlay = byId("contactModal"),
    card = overlay.querySelector(".modal");
  overlay.hidden = false;
  overlay.classList.add("is-open");
  card.classList.remove("is-leaving");
  void card.offsetWidth;
  card.classList.add("is-entering");
  setTimeout(() => name.focus(), 0);

  const cleanupTrap = trapFocus(card),
    doClose = () => {
      cleanupTrap();
      closeModal();
    };

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") doClose();
    },
    { once: true }
  );
  overlay.addEventListener(
    "click",
    (e) => {
      if (e.target === overlay) doClose();
    },
    { once: true }
  );
  card.addEventListener(
    "animationend",
    (e) => {
      if (e.animationName === "modalIn") card.classList.remove("is-entering");
    },
    { once: true }
  );
}

function closeModal() {
  const overlay = byId("contactModal"),
    card = overlay.querySelector(".modal"),
    form = byId("contactForm");
  card.classList.remove("is-entering");
  card.classList.add("is-leaving");
  const onEnd = (e) => {
    if (e.animationName !== "modalOut") return;
    card.removeEventListener("animationend", onEnd);
    overlay.classList.remove("is-open");
    overlay.hidden = true;
    card.classList.remove("is-leaving");
    form.reset();
    byId("formAvatar").textContent = "?";
  };
  card.addEventListener("animationend", onEnd);
}

function onSubmitForm(e) {
  e.preventDefault();
  const btn = byId("submitBtn");
  if (btn.dataset.busy) return;
  btn.dataset.busy = "1";

  const name = byId("nameInput").value.trim(),
    email = byId("emailInput").value.trim(),
    phone = byId("phoneInput").value.trim();

  if (!name || !email || !phone) {
    btn.dataset.busy = "";
    return;
  }

  modalMode === "create"
    ? createContact(name, email, phone)
    : saveEdit(name, email, phone);

  btn.dataset.busy = "";
  closeModal();
}

/* ---------- CRUD (direkt DB, /contacts) ---------- */
async function createContact(name, email, phone) {
  const payload = { name, email, phone, initials: initialsFromName(name) };

  try {
    const key = await dbApi.pushData(`contacts`, payload);
    await dbApi.updateData(`contacts/${key}`, { id: key });
    state.selectedId = key;
  } catch (e) {
    console.error(e);
    alert("Could not save contact");
  }
}

async function saveEdit(name, email, phone) {
  const id = state.selectedId;
  if (!id) return;

  try {
    await dbApi.updateData(`contacts/${id}`, {
      name,
      email,
      phone,
      initials: initialsFromName(name),
    });
  } catch (e) {
    console.error(e);
    alert("Update failed");
  }
}

async function onDelete() {
  const id = state.selectedId;
  if (!id) return;

  try {
    await dbApi.deleteData(`contacts/${id}`);
    state.selectedId = null;
  } catch (e) {
    console.error(e);
    alert("Delete failed");
  }
}

/* ---------- wiring ---------- */
function attachGlobalHandlers() {
  byId("openAddModal")?.addEventListener("click", () => openModal("create"));
  byId("cancelBtn")?.addEventListener("click", closeModal);
  byId("modalCloseBtn")?.addEventListener("click", closeModal);
  byId("contactForm")?.addEventListener("submit", onSubmitForm);
  byId("nameInput")?.addEventListener(
    "input",
    (e) =>
      (byId("formAvatar").textContent = initialsFromName(e.target.value) || "?")
  );
}

/** Auswahl bestmöglich beibehalten, sonst ersten Kontakt wählen */
function afterRenderSelectFallback() {
  if (state.selectedId && qs(`.row[data-id="${state.selectedId}"]`)) {
    setActiveRow(state.selectedId);
    updateDetail(state.selectedId);
    return;
  }
  const first = qs(".row");
  if (first) {
    const cid = first.dataset.id;
    setActiveRow(cid);
    updateDetail(cid);
  } else {
    const d = qs(".detail-card");
    if (d) d.innerHTML = "<p>No contact selected.</p>";
  }
}

/* ---------- Live subscription ---------- */
let scheduled = false;
function scheduleRender() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    renderContacts();
    attachGlobalHandlers();
    afterRenderSelectFallback();
  });
}

function startLiveView() {
  state.unsubscribe?.();
  state.unsubscribe = dbApi.onData("contacts", (data) => {
    state.data = data || {};
    scheduleRender();
  });
}

/* ---------- boot ---------- */
function init() {
  startLiveView();
}

window.addEventListener("load", init);
window.addEventListener("beforeunload", () => state.unsubscribe?.());

(() => {
  const overlay = document.getElementById('contactModal');
  const dialog  = overlay?.querySelector('.modal');
  const openBtn = document.getElementById('openAddModal');
  const closeBtn= document.getElementById('modalCloseBtn');
  const cancel  = document.getElementById('cancelBtn');

  const open = () => {
    overlay.hidden = false;
    overlay.classList.add('is-open');
    dialog.classList.remove('is-leaving');
    dialog.classList.add('is-entering');
    setTimeout(() => document.getElementById('nameInput')?.focus(), 10);
  };

  const close = () => {
    dialog.classList.remove('is-entering');
    dialog.classList.add('is-leaving');
    setTimeout(() => {
      overlay.classList.remove('is-open');
      overlay.hidden = true;
      dialog.classList.remove('is-leaving');
    }, 300);
  };

  openBtn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  cancel?.addEventListener('click', (e) => { e.preventDefault(); close(); });
  overlay?.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) close(); });
})();

/* ---------- JOIN HELP SYSTEM (Add-on, keine Konflikte) ---------- */
(function(){
  const HTML = `
    <div class="jh-overlay" data-jh="overlay"></div>
    <div class="jh-dialog" role="dialog" aria-modal="true" aria-labelledby="jh-help-title" data-jh="dialog">
      <div class="jh-dialog-header">
        <div class="jh-title-wrap">
          <span class="jh-badge">Kanban Project Management Tool</span>
          <span class="jh-subtle">Help</span>
        </div>
        <button class="jh-close" type="button" aria-label="Close Help" data-jh="close">&times;</button>
      </div>
      <div class="jh-dialog-body">
        <article class="jh-help">
          <a href="#" class="jh-back-link" data-jh="close">&larr; Back</a>
          <h1 id="jh-help-title">Help</h1>
          <p>Welcome to the help page for <strong>Join</strong>, your guide to using our kanban project management tool.</p>
          <h2>What is Join?</h2>
          <p><strong>Join</strong> is a kanban-based project management tool built by students at the Developer Akademie.</p>
          <h2>How to use it</h2>
          <ol>
            <li>Explore the board and task lists.</li>
            <li>Create contacts to collaborate with.</li>
            <li>Add cards (tasks) and assign contacts.</li>
            <li>Drag cards to change progress state.</li>
            <li>Delete cards when finished.</li>
          </ol>
          <p><strong>Enjoy using Join!</strong></p>
        </article>
      </div>
    </div>
  `;

  const JoinHelp = {
    _mounted:false, _els:{},
    init(){
      if(this._mounted) return; this._mounted = true;
      let trigger = document.querySelector('.topbar .top-right .small-icon');
      if (!trigger) {
        trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'jh-help-fab';
        trigger.textContent = '?';
        document.body.appendChild(trigger);
      } else trigger.classList.add('jh-help-btn');
      const wrap = document.createElement('div');
      wrap.innerHTML = HTML;
      const overlay = wrap.querySelector('[data-jh="overlay"]');
      const dialog  = wrap.querySelector('[data-jh="dialog"]');
      document.body.appendChild(overlay);
      document.body.appendChild(dialog);
      const open = () => {
        overlay.classList.add('jh-visible');
        dialog.classList.add('jh-visible');
        dialog.querySelector('[data-jh="close"]').focus();
        document.documentElement.style.overflow='hidden';
      };
      const close = () => {
        overlay.classList.remove('jh-visible');
        dialog.classList.remove('jh-visible');
        document.documentElement.style.overflow='';
      };
      trigger.addEventListener('click', open);
      overlay.addEventListener('click', e => { if(e.target===overlay) close(); });
      dialog.querySelectorAll('[data-jh="close"]').forEach(b => b.addEventListener('click', e => {e.preventDefault();close();}));
      window.addEventListener('keydown', e => { if(e.key==='Escape') close(); });
      this._els = { trigger, overlay, dialog };
    }
  };
  window.JoinHelp = JoinHelp;
  document.addEventListener('DOMContentLoaded', () => JoinHelp.init());
})();
