/* =======================
   CONTACTS – Allman + ≤15 lines/func
   ======================= */

let contacts = [
  {
    name: "Anton Mayer",
    email: "antonm@gmail.com",
    phone: "+49 1111 111 11 1",
    color: "#FF7A00",
  },
  {
    name: "Anja Schulz",
    email: "schulz@hotmail.com",
    phone: "+49 2222 222 22 2",
    color: "#29ABE2",
  },
  {
    name: "Benedikt Ziegler",
    email: "benedikt@gmail.com",
    phone: "+49 3333 333 33 3",
    color: "#6E52FF",
  },
  {
    name: "David Eisenberg",
    email: "davidberg@gmail.com",
    phone: "+49 4444 444 44 4",
    color: "#1FD7C1",
  },
  {
    name: "Eva Fischer",
    email: "eva@gmail.com",
    phone: "+49 5555 555 55 5",
    color: "#FC71FF",
  },
  {
    name: "Emmanuel Mauer",
    email: "emmanuelma@gmail.com",
    phone: "+49 6666 666 66 6",
    color: "#FFBB2B",
  },
];

const colorPool = [
  "#FF7A00",
  "#29ABE2",
  "#6E52FF",
  "#1FD7C1",
  "#FC71FF",
  "#FFBB2B",
];
let selectedId = null,
  modalMode = "create",
  nextId = 1;

const qs = (s, r = document) => r.querySelector(s),
  qsa = (s, r = document) => [...r.querySelectorAll(s)],
  byId = (id) => document.getElementById(id);
const initialsFromName = (n) => {
  const p = String(n || "")
    .trim()
    .split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase();
};
const telHref = (s) => `tel:${(s || "").replace(/\s+/g, "")}`,
  getLetter = (n) => (n?.[0] || "#").toUpperCase(),
  idxById = (id) => contacts.findIndex((c) => c.id === id);

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
  const rows = qsa(".row", groupEl),
    newName = qs(".row-name", rowEl).textContent.trim();
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
  b.innerHTML = `<div class="avatar" style="background:${c.color}">${c.initials}</div><div><div class="row-name">${c.name}</div><a class="row-email" href="mailto:${c.email}">${c.email}</a></div>`;
  b.addEventListener("click", () => {
    setActiveRow(c.id);
    updateDetail(c.id);
  });
  return b;
}

function setActiveRow(cid) {
  selectedId = cid;
  qsa(".row").forEach((r) =>
    r.classList.toggle("active", r.dataset.id === String(cid))
  );
}

/* ---------- detail ---------- */
function updateDetail(cid) {
  const i = idxById(cid);
  if (i < 0) return;
  const c = contacts[i],
    d = qs(".detail-card");
  if (!d) return;
  d.innerHTML = `<div class="detail-header"><div class="avatar big" style="background:${
    c.color
  }">${c.initials}</div><div class="who"><div class="big-name">${
    c.name
  }</div><div class="actions"><button class="link-btn" id="editBtn" type="button">Edit</button><button class="link-btn" id="deleteBtn" type="button">Delete</button></div></div></div><h2 class="mini-title">Contact Information</h2><div class="info-row"><div class="info-key">Email</div><div><a class="row-email" href="mailto:${
    c.email
  }">${
    c.email
  }</a></div></div><div class="info-row"><div class="info-key">Phone</div><div><a class="row-email" href="${telHref(
    c.phone
  )}">${c.phone}</a></div></div>`;
  byId("editBtn").addEventListener("click", () => openModal("edit", cid));
  byId("deleteBtn").addEventListener("click", onDelete);
}

/* ---------- boot list ---------- */
function syncListFromContacts() {
  contacts = contacts.map((c) => ({
    ...c,
    id: c.id ?? nextId++,
    initials: c.initials || initialsFromName(c.name),
  }));
  qsa(".row").forEach((r) => {
    const nm = qs(".row-name", r)?.textContent.trim(),
      em = qs(".row-email", r)?.textContent.trim();
    const c = contacts.find((x) => x.name === nm && x.email === em);
    if (!c) return;
    r.dataset.id = String(c.id);
    const av = qs(".avatar", r);
    if (av) {
      av.textContent = c.initials;
      av.style.background = c.color;
    }
    const emA = qs(".row-email", r);
    if (emA) emA.href = `mailto:${c.email}`;
    r.addEventListener("click", () => {
      setActiveRow(c.id);
      updateDetail(c.id);
    });
  });
}

/* ---------- modal (mit federndem Slide via Keyframes) ---------- */
function openModal(mode = "create", cid = selectedId) {
  modalMode = mode;
  const form = byId("contactForm"),
    name = byId("nameInput"),
    email = byId("emailInput"),
    phone = byId("phoneInput");
  if (mode === "edit") {
    const c = contacts[idxById(cid)];
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

/* ---------- CRUD ---------- */
function createContact(name, email, phone) {
  const c = {
    id: nextId++,
    name,
    email,
    phone,
    color: colorPool[contacts.length % colorPool.length],
    initials: initialsFromName(name),
  };
  contacts.push(c);
  const group = ensureGroup(getLetter(c.name));
  insertRowSorted(group, makeRow(c));
  setActiveRow(c.id);
  updateDetail(c.id);
}

function saveEdit(name, email, phone) {
  const i = idxById(selectedId);
  if (i < 0) return;
  const c = contacts[i];
  Object.assign(c, { name, email, phone, initials: initialsFromName(name) });
  const row = qs(`.row[data-id="${c.id}"]`);
  if (!row) return;
  const oldGroup = row.closest(".group"),
    oldLetter = qs(".group-title", oldGroup).textContent.trim().toUpperCase(),
    newLetter = getLetter(c.name);
  qs(".row-name", row).textContent = c.name;
  const em = qs(".row-email", row);
  em.textContent = c.email;
  em.href = `mailto:${c.email}`;
  qs(".avatar", row).textContent = c.initials;
  if (oldLetter !== newLetter) {
    row.remove();
    insertRowSorted(ensureGroup(newLetter), row);
    if (!qsa(".row", oldGroup).length) oldGroup.remove();
  } else {
    row.remove();
    insertRowSorted(oldGroup, row);
  }
  updateDetail(c.id);
}

function onDelete() {
  if (!confirm("Delete this contact?")) return;
  const i = idxById(selectedId);
  if (i < 0) return;
  contacts.splice(i, 1);
  const row = qs(`.row[data-id="${selectedId}"]`),
    group = row?.closest(".group");
  if (row) row.remove();
  if (group && !qsa(".row", group).length) group.remove();
  const any = qs(".row");
  if (any) {
    const cid = Number(any.dataset.id);
    setActiveRow(cid);
    updateDetail(cid);
  } else {
    selectedId = null;
    const d = qs(".detail-card");
    if (d) d.innerHTML = "<p>No contact selected.</p>";
  }
}

/* ---------- wiring / init ---------- */
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

function init() {
  syncListFromContacts();
  const first = qs(".row");
  if (first) {
    const cid = Number(first.dataset.id) || 1;
    setActiveRow(cid);
    updateDetail(cid);
  }
  attachGlobalHandlers();
}

window.addEventListener("load", init);
