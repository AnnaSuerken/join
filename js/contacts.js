let contacts = [
  {
    name: "Anton Mayer",
    initials: "AM",
    email: "antonm@gmail.com",
    phone: "+49 1111 111 11 1",
    color: "#FF7A00"
  },
  {
    name: "Anja Schulz",
    initials: "AS",
    email: "schulz@hotmail.com",
    phone: "+49 2222 222 22 2",
    color: "#29ABE2"
  },
  {
    name: "Benedikt Ziegler",
    initials: "BZ",
    email: "benedikt@gmail.com",
    phone: "+49 3333 333 33 3",
    color: "#6E52FF"
  },
  {
    name: "David Eisenberg",
    initials: "DE",
    email: "davidberg@gmail.com",
    phone: "+49 4444 444 44 4",
    color: "#1FD7C1"
  },
  {
    name: "Eva Fischer",
    initials: "EF",
    email: "eva@gmail.com",
    phone: "+49 5555 555 55 5",
    color: "#FC71FF"
  },
  {
    name: "Emmanuel Mauer",
    initials: "EM",
    email: "emmanuelma@gmail.com",
    phone: "+49 6666 666 66 6",
    color: "#FFBB2B"
  }
];

function initContacts() {
  const buttons = document.querySelectorAll(".row");
  for (let i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener("click", () => {
      showContact(i);
      markActive(i);
    });
  }
}

function markActive(index) {
  const rows = document.querySelectorAll(".row");
  rows.forEach(r => r.classList.remove("active"));
  if (rows[index]) rows[index].classList.add("active");
}

function showContact(i) {
  const c = contacts[i];
  const detail = document.querySelector(".detail-card");
  if (!detail) return;

  detail.innerHTML = `
    <div class="detail-header">
      <div class="avatar big" style="background:${c.color}">${c.initials}</div>
      <div class="who">
        <div class="big-name">${c.name}</div>
        <div class="actions">
          <button class="link-btn" type="button">Edit</button>
          <button class="link-btn" type="button">Delete</button>
        </div>
      </div>
    </div>

    <h2 class="mini-title">Contact Information</h2>
    <div class="info-row">
      <div class="info-key">Email</div>
      <div><a href="mailto:${c.email}" class="row-email">${c.email}</a></div>
    </div>
    <div class="info-row">
      <div class="info-key">Phone</div>
      <div><a href="tel:${c.phone}" class="row-email">${c.phone}</a></div>
    </div>
  `;
}

//  ersten Kontakt direkt anzeigen
window.addEventListener("load", () => {
  initContacts();
  showContact(0);
  markActive(0);
});
