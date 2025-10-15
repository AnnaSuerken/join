let contacts = [
  { name: "Anton Mayer", initials: "AM", email: "antonm@gmail.com", phone: "+49 1111 111 11 1", color: "#FF7A00" },
  { name: "Anja Schulz", initials: "AS", email: "schulz@hotmail.com", phone: "+49 2222 222 22 2", color: "#29ABE2" },
  { name: "Benedikt Ziegler", initials: "BZ", email: "benedikt@gmail.com", phone: "+49 3333 333 33 3", color: "#6E52FF" },
  { name: "David Eisenberg", initials: "DE", email: "davidberg@gmail.com", phone: "+49 4444 444 44 4", color: "#1FD7C1" },
  { name: "Eva Fischer", initials: "EF", email: "eva@gmail.com", phone: "+49 5555 555 55 5", color: "#FC71FF" },
  { name: "Emmanuel Mauer", initials: "EM", email: "emmanuelma@gmail.com", phone: "+49 6666 666 66 6", color: "#FFBB2B" }
];

let selectedIndex = 0;
let modalMode = "create";
const colorPool = ["#FF7A00","#29ABE2","#6E52FF","#1FD7C1","#FC71FF","#FFBB2B"];

function initialsFromName(n)
{
  let p = n.trim().split(/\s+/);
  return ((p[0]?.[0]||"") + (p[1]?.[0]||"")).toUpperCase();
}

function refreshRowIndices()
{
  let rows = document.querySelectorAll(".row");
  rows.forEach((b,i) =>
  {
    b.dataset.index = i;
  });
}

function attachRowHandlers()
{
  let rows = document.querySelectorAll(".row");
  rows.forEach((b,i) =>
  {
    b.dataset.index = i;
    b.addEventListener("click", () =>
    {
      showContact(i);
      markActive(i);
    });
  });
}

function initContacts()
{
  attachRowHandlers();
  let add = document.getElementById("openAddModal");
  if (add) add.addEventListener("click", () => openModal("create"));
  byId("cancelBtn").addEventListener("click", closeModal);
  byId("modalCloseBtn").addEventListener("click", closeModal);
  byId("contactForm").addEventListener("submit", onSubmitForm);
  showContact(0);
  markActive(0);
}

function markActive(i)
{
  selectedIndex = i;
  let rows = document.querySelectorAll(".row");
  rows.forEach(r => r.classList.remove("active"));
  if (rows[i]) rows[i].classList.add("active");
}

function showContact(i)
{
  selectedIndex = i;
  let c = contacts[i];
  let d = document.querySelector(".detail-card");
  if (!d) return;
  d.innerHTML =
    '<div class="detail-header">' +
      '<div class="avatar big" style="background:'+c.color+'">'+c.initials+'</div>' +
      '<div class="who">' +
        '<div class="big-name">'+c.name+'</div>' +
        '<div class="actions">' +
          '<button class="link-btn" id="editBtn" type="button">Edit</button>' +
          '<button class="link-btn" id="deleteBtn" type="button">Delete</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<h2 class="mini-title">Contact Information</h2>' +
    '<div class="info-row"><div class="info-key">Email</div>' +
    '<div><a class="row-email" href="mailto:'+c.email+'">'+c.email+'</a></div></div>' +
    '<div class="info-row"><div class="info-key">Phone</div>' +
    '<div><a class="row-email" href="tel:'+c.phone+'">'+c.phone+'</a></div></div>';
  byId("editBtn").addEventListener("click", () => openModal("edit", i));
  byId("deleteBtn").addEventListener("click", onDelete);
}

function openModal(mode, i)
{
  modalMode = mode;
  if (mode === "edit") fillFormFrom(i ?? selectedIndex);
  else clearForm();
  byId("modalTitle").textContent = mode === "edit" ? "Edit contact" : "Add contact";
  byId("submitBtn").textContent = mode === "edit" ? "Save ▾" : "Create contact ▾";
  let modal = byId("contactModal");
  modal.hidden = false;
  modal.style.display = "grid";
}

function closeModal()
{
  let modal = byId("contactModal");
  modal.hidden = true;
  modal.style.display = "none";
}

function clearForm()
{
  byId("nameInput").value = "";
  byId("emailInput").value = "";
  byId("phoneInput").value = "";
  let av = byId("formAvatar");
  av.textContent = "?";
  av.style.background = "#E5E7EB";
}

function fillFormFrom(i)
{
  let c = contacts[i];
  byId("nameInput").value = c.name;
  byId("emailInput").value = c.email;
  byId("phoneInput").value = c.phone;
  let av = byId("formAvatar");
  av.textContent = c.initials;
  av.style.background = c.color;
}

function onSubmitForm(e)
{
  e.preventDefault();
  let n = byId("nameInput").value.trim();
  let m = byId("emailInput").value.trim();
  let p = byId("phoneInput").value.trim();
  if (!n || !m || !p) return;
  if (modalMode === "create") createContact(n,m,p);
  else saveEdit(n,m,p);
  closeModal();
}

function createContact(n,m,p)
{
  let col = colorPool[contacts.length % colorPool.length];
  let c = { name:n, email:m, phone:p, color:col, initials:initialsFromName(n) };
  contacts.push(c);
  appendRow(c);
  refreshRowIndices();
  showContact(contacts.length - 1);
  markActive(contacts.length - 1);
}

function saveEdit(n,m,p)
{
  let i = selectedIndex;
  let c = contacts[i];
  c.name = n;
  c.email = m;
  c.phone = p;
  c.initials = initialsFromName(n);
  let btn = document.querySelector('.row[data-index="'+i+'"]');
  if (btn)
  {
    btn.querySelector(".row-name").textContent = c.name;
    btn.querySelector(".row-email").textContent = c.email;
    btn.querySelector(".avatar").textContent = c.initials;
  }
  showContact(i);
}

function onDelete()
{
  if (!confirm("Delete this contact?")) return;
  contacts.splice(selectedIndex, 1);
  let btn = document.querySelector('.row[data-index="'+selectedIndex+'"]');
  if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
  refreshRowIndices();
  let nxt = Math.max(0, selectedIndex - 1);
  if (contacts[nxt]) { showContact(nxt); markActive(nxt); }
  else
  {
    let d = document.querySelector(".detail-card");
    if (d) d.innerHTML = "<p>No contact selected.</p>";
  }
}

function appendRow(c)
{
  let list = document.querySelector(".list");
  let group = list.querySelector(".group:last-of-type") || list;
  let b = document.createElement("button");
  b.className = "row";
  b.type = "button";
  b.innerHTML =
    '<div class="avatar">'+c.initials+'</div>' +
    '<div><div class="row-name">'+c.name+'</div>' +
    '<a href="#" class="row-email">'+c.email+'</a></div>';
  group.appendChild(b);
  b.dataset.index = document.querySelectorAll(".row").length - 1;
  b.addEventListener("click", () =>
  {
    let i = Number(b.dataset.index);
    showContact(i);
    markActive(i);
  });
}

document.addEventListener("input", (e) =>
{
  if (e.target && e.target.id === "nameInput")
  {
    let av = byId("formAvatar");
    av.textContent = initialsFromName(e.target.value) || "?";
  }
});

function byId(id)
{
  return document.getElementById(id);
}

window.addEventListener("load", initContacts);
