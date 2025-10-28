
function genId() {
  return (
    Date.now().toString(16) + Math.random().toString(16).slice(2)
  );
}

let contacts = [
  {
    id: genId(),
    name: "Anton Mayer",
    email: "antonm@gmail.com",
    phone: "",
    color: "#FF7A00",
  },
  {
    id: genId(),
    name: "Anja Schulz",
    email: "schulz@hotmail.com",
    phone: "",
    color: "#462F8A",
  },
  {
    id: genId(),
    name: "Benedikt Ziegler",
    email: "benedikt@gmail.com",
    phone: "",
    color: "#2A3647",
  },
  {
    id: genId(),
    name: "David Eisenberg",
    email: "davidberg@gmail.com",
    phone: "",
    color: "#FF5EB3",
  },
  {
    id: genId(),
    name: "Eva Fischer",
    email: "eva@gmail.com",
    phone: "",
    color: "#FFA800",
  },
  {
    id: genId(),
    name: "Emmanuel Mauer",
    email: "emmanuelma@gmail.com",
    phone: "",
    color: "#29ABE2",
  },
];


const avatarColors = [
  "#FF7A00",
  "#462F8A",
  "#2A3647",
  "#FF5EB3",
  "#FFA800",
  "#29ABE2",
  "#9D00FF",
  "#3EC300",
];


function getInitials(fullName) {
  const parts = fullName.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (
    parts[0][0].toUpperCase() + parts[1][0].toUpperCase()
  );
}


function sortContacts() {
  contacts.sort((a, b) =>
    a.name.localeCompare(b.name, "de", { sensitivity: "base" })
  );
}


function pickColor() {
  const idx = Math.floor(Math.random() * avatarColors.length);
  return avatarColors[idx];
}


function renderContactList() {
  sortContacts();

  const listEl = document.getElementById("contacts-scroll");
  if (!listEl) return;

  listEl.innerHTML = "";

  let currentLetter = null;

  contacts.forEach((contact) => {
    const firstLetter = contact.name[0].toUpperCase();

    // buchstaben header (A / B / D / E ...)
    if (firstLetter !== currentLetter) {
      currentLetter = firstLetter;
      const letterEl = document.createElement("div");
      letterEl.className = "contacts-letter";
      letterEl.textContent = currentLetter;
      listEl.appendChild(letterEl);
    }

    
    const row = document.createElement("div");
    row.className = "contact-row";
    row.setAttribute("data-id", contact.id);

    row.innerHTML = `
      <div class="avatar-small" style="background-color:${contact.color}">
        ${getInitials(contact.name)}
      </div>
      <div class="contact-row-text">
        <div class="contact-row-name">${contact.name}</div>
        <div class="contact-row-email">${contact.email}</div>
      </div>
    `;

    row.addEventListener("click", () => {
      renderContactDetail(contact);
    });

    listEl.appendChild(row);
  });
}


function renderEmptyDetail() {
  const detailEl = document.getElementById("contact-detail");
  if (!detailEl) return;

  detailEl.innerHTML = `
    <p style="color:#aaa; font-size:16px; margin:0;">
      Select a contact to view details.
    </p>
  `;
}


function renderContactDetail(contact) {
  const detailEl = document.getElementById("contact-detail");
  if (!detailEl) return;

  const initials = getInitials(contact.name);

  detailEl.innerHTML = `
    <div class="contact-header-row">
      <div
        class="contact-avatar-circle"
        style="background-color:${contact.color}"
      >
        ${initials}
      </div>

      <div class="contact-main-info">
        <div class="contact-name-row">
          <h2 class="contact-name">${contact.name}</h2>
          <div class="contact-actions">
            <button class="contact-action-link">✎ Edit</button>
            <button class="contact-action-link">🗑 Delete</button>
          </div>
        </div>

        <div class="contact-section-title">Contact Information</div>

        <div class="contact-info-block">
          <div class="contact-info-label">Email</div>
          <a class="contact-info-value" href="mailto:${contact.email}">
            ${contact.email}
          </a>
        </div>

        <div class="contact-info-block">
          <div class="contact-info-label">Phone</div>

          <div class="contact-phone-row">
            <div class="phone-icon-bubble">
              <img
                src="./assets/icons/call.svg"
                alt="phone icon"
                class="phone-icon-img"
              />
            </div>
            <span class="contact-info-value">
              ${contact.phone || "-"}
            </span>
          </div>
        </div>
      </div>
    </div>
  `;
}



const overlay   = document.getElementById("add-contact-overlay");
const openBtn   = document.getElementById("open-add-contact-overlay");
const closeBtn  = document.getElementById("close-add-contact-overlay");
const cancelBtn = document.getElementById("cancel-add-contact-overlay");

function openOverlay() {
  if (overlay) overlay.classList.remove("d_none");
}

function closeOverlay() {
  if (overlay) overlay.classList.add("d_none");
  resetForm();
}

if (openBtn)   openBtn.addEventListener("click", openOverlay);
if (closeBtn)  closeBtn.addEventListener("click", closeOverlay);
if (cancelBtn) cancelBtn.addEventListener("click", closeOverlay);

const formEl    = document.getElementById("add-contact-form");
const createBtn = document.getElementById("create-contact-btn");

function resetForm() {
  if (!formEl) return;
  formEl.reset();
}

function createContact() {
  const nameInput  = document.getElementById("contact-name-input");
  const emailInput = document.getElementById("contact-email-input");
  const phoneInput = document.getElementById("contact-phone-input");

  const name  = nameInput.value.trim();
  const email = emailInput.value.trim();
  const phone = phoneInput.value.trim();

  if (!name || !email) return;

  const newContact = {
    id: genId(),
    name,
    email,
    phone,
    color: pickColor(),
  };

  contacts.push(newContact);
  renderContactList();
  renderContactDetail(newContact);
  closeOverlay();
}

if (createBtn) createBtn.addEventListener("click", createContact);



function init() {
  renderContactList();
  renderEmptyDetail();
}

init();
