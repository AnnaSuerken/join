/* =======================
   CONTACTS – clean version
   ======================= */

let contacts = [
  { name: "Anton Mayer",    initials: "AM", email: "antonm@gmail.com",    phone: "+49 1111 111 11 1", color: "#FF7A00" },
  { name: "Anja Schulz",    initials: "AS", email: "schulz@hotmail.com",  phone: "+49 2222 222 22 2", color: "#29ABE2" },
  { name: "Benedikt Ziegler", initials: "BZ", email: "benedikt@gmail.com", phone: "+49 3333 333 33 3", color: "#6E52FF" },
  { name: "David Eisenberg",  initials: "DE", email: "davidberg@gmail.com", phone: "+49 4444 444 44 4", color: "#1FD7C1" },
  { name: "Eva Fischer",      initials: "EF", email: "eva@gmail.com",       phone: "+49 5555 555 55 5", color: "#FC71FF" },
  { name: "Emmanuel Mauer",   initials: "EM", email: "emmanuelma@gmail.com",phone: "+49 6666 666 66 6", color: "#FFBB2B" }
];

let selectedIndex = 0;
let modalMode = "create";
const colorPool = ["#FF7A00","#29ABE2","#6E52FF","#1FD7C1","#FC71FF","#FFBB2B"];

/* ---------- helpers ---------- */
const qs  = (s, r=document)=>r.querySelector(s);
const qsa = (s, r=document)=>[...r.querySelectorAll(s)];
const byId = id => document.getElementById(id);

const initialsFromName = n => {
  const p = n.trim().split(/\s+/);
  return ((p[0]?.[0]||"") + (p[1]?.[0]||"")).toUpperCase();
};

function telHref(s){ return `tel:${(s||"").replace(/\s+/g,"")}`; }

/* ---------- list wiring ---------- */
function refreshRowIndices(){
  qsa(".row").forEach((b,i)=> b.dataset.index = i);
}

function markActive(i){
  selectedIndex = i;
  qsa(".row").forEach(r=>r.classList.remove("active"));
  const rows = qsa(".row");
  if (rows[i]) rows[i].classList.add("active");
}

function updateDetail(i){
  selectedIndex = i;
  const c = contacts[i];
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

  byId("editBtn").addEventListener("click", ()=> openModal("edit", i));
  byId("deleteBtn").addEventListener("click", onDelete);
}

function attachRowHandlers(){
  qsa(".row").forEach((b,i)=>{
    b.dataset.index = i;
    b.addEventListener("click", ()=>{
      markActive(i);
      updateDetail(i);
    });
  });
}

/* ---------- init: sync static HTML rows mit contacts[] ---------- */
function syncListFromContacts(){
  const rows = qsa(".row");
  rows.forEach((b,i)=>{
    const c = contacts[i];
    if (!c) return;
    // Visuelle Daten in die Row injizieren (Farbe/Phone)
    const av = b.querySelector(".avatar");
    if (av){
      av.textContent = c.initials;
      av.style.background = c.color;
    }
    const nm = b.querySelector(".row-name");
    const em = b.querySelector(".row-email");
    if (nm) nm.textContent = c.name;
    if (em){ em.textContent = c.email; em.href = `mailto:${c.email}`; }
    b.dataset.phone = c.phone;
    b.dataset.index = i;
  });
}

/* ---------- modal ---------- */
function openModal(mode="create", index = selectedIndex){
  modalMode = mode;

  if (mode === "edit"){
    const c = contacts[index];
    byId("nameInput").value  = c.name;
    byId("emailInput").value = c.email;
    byId("phoneInput").value = c.phone;
    const av = byId("formAvatar");
    av.textContent = c.initials;
    av.style.background = c.color;
  } else {
    byId("contactForm").reset();
    const av = byId("formAvatar");
    av.textContent = "?";
    av.style.background = "#E5E7EB";
  }

  byId("modalTitle").textContent = mode === "edit" ? "Edit contact" : "Add contact";
  byId("submitBtn").textContent  = mode === "edit" ? "Save changes ▾" : "Create contact ▾";

  const overlay = byId("contactModal");
  overlay.hidden = false;

  // Esc + Außenklick
  const onKey = e => { if (e.key === "Escape") closeModal(); };
  const onClickOutside = e => { if (e.target === overlay) closeModal(); };
  overlay.dataset._esc = "1";
  document.addEventListener("keydown", onKey, { once:true });
  overlay.addEventListener("click", onClickOutside, { once:true });
}

function closeModal(){
  const overlay = byId("contactModal");
  overlay.hidden = true;
}

function onSubmitForm(e){
  e.preventDefault();
  const name  = byId("nameInput").value.trim();
  const email = byId("emailInput").value.trim();
  const phone = byId("phoneInput").value.trim();
  if (!name || !email || !phone) return;

  if (modalMode === "create") {
    createContact(name, email, phone);
  } else {
    saveEdit(name, email, phone);
  }
  closeModal();
}

/* ---------- add / edit / delete ---------- */
function ensureGroup(letter){
  letter = (letter || "#").toUpperCase();
  const list = qs(".list");
  const groups = qsa(".group", list);
  // gibt es Gruppe schon?
  for (const g of groups){
    const t = qs(".group-title", g);
    if (t && t.textContent.trim().toUpperCase() === letter) return g;
  }
  // neu anlegen (ans Ende; reicht hier)
  const g = document.createElement("div");
  g.className = "group";
  g.innerHTML = `<div class="group-title">${letter}</div>`;
  list.appendChild(g);
  return g;
}

function makeRow(c){
  const b = document.createElement("button");
  b.className = "row";
  b.type = "button";
  b.dataset.phone = c.phone;
  b.innerHTML = `
    <div class="avatar" style="background:${c.color}">${c.initials}</div>
    <div>
      <div class="row-name">${c.name}</div>
      <a href="mailto:${c.email}" class="row-email">${c.email}</a>
    </div>`;
  b.addEventListener("click", ()=>{
    const i = Number(b.dataset.index);
    markActive(i);
    updateDetail(i);
  });
  return b;
}

function createContact(name,email,phone){
  const color = colorPool[contacts.length % colorPool.length];
  const initials = initialsFromName(name);
  const c = { name, email, phone, color, initials };
  // in Daten
  contacts.push(c);

  // richtige Gruppe nach Buchstabe
  const letter = (name[0] || "#").toUpperCase();
  const group = ensureGroup(letter);
  const row = makeRow(c);
  group.appendChild(row);

  refreshRowIndices();
  const idx = contacts.length - 1;
  markActive(idx);
  updateDetail(idx);
}

function saveEdit(name,email,phone){
  const i = selectedIndex;
  const c = contacts[i];
  c.name = name;
  c.email = email;
  c.phone = phone;
  c.initials = initialsFromName(name);

  const btn = qs(`.row[data-index="${i}"]`);
  if (btn){
    btn.querySelector(".row-name").textContent = c.name;
    const em = btn.querySelector(".row-email");
    em.textContent = c.email; em.href = `mailto:${c.email}`;
    const av = btn.querySelector(".avatar");
    av.textContent = c.initials;
  }
  updateDetail(i);
}

function onDelete(){
  if (!confirm("Delete this contact?")) return;

  // Dom entfernen
  const btn = qs(`.row[data-index="${selectedIndex}"]`);
  if (btn) btn.remove();

  // Daten entfernen
  contacts.splice(selectedIndex, 1);

  refreshRowIndices();
  const next = Math.max(0, selectedIndex - 1);

  if (contacts[next]){
    markActive(next);
    updateDetail(next);
  } else {
    const d = qs(".detail-card");
    if (d) d.innerHTML = "<p>No contact selected.</p>";
  }
}

/* ---------- boot ---------- */
function init(){
  // Klicks
  attachRowHandlers();

  // Buttons Top
  const add = byId("openAddModal");
  if (add) add.addEventListener("click", ()=> openModal("create"));

  byId("cancelBtn").addEventListener("click", closeModal);
  byId("modalCloseBtn").addEventListener("click", closeModal);
  byId("contactForm").addEventListener("submit", onSubmitForm);

  // Tippen im Name-Feld → Avatar-Initialen live
  document.addEventListener("input", (e)=>{
    if (e.target && e.target.id === "nameInput"){
      const av = byId("formAvatar");
      av.textContent = initialsFromName(e.target.value) || "?";
    }
  });

  // Liste gemäß contacts[] einfärben/verdrahten
  syncListFromContacts();

  // Startzustand
  markActive(0);
  updateDetail(0);
}

window.addEventListener("load", init);
