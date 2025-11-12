import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

/* ===== DEBUG START ===== */
console.log("main.js läuft ✅");
/* ===== DEBUG END ===== */

addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
  }
});

/* ===========================
   Benutzername laden & Initialen anzeigen
=========================== */
async function loadNameHeader() {
  const userNameRef = document.getElementById("dropbtn");

  onAuthStateChanged(auth, async (user) => {
    try {
      if (!user) {
        userNameRef.innerText = "G";
        return;
      }

      const dbName = await dbApi.getData(`users/${user.uid}/displayName`);
      const name = (dbName || user.displayName || "").trim();
      userNameRef.innerText = nameToInitials(name, user.email);
    } catch (err) {
      console.error(err);
      userNameRef.innerText = "G";
    }
  });
}

function nameToInitials(displayName, email) {
  const n = (displayName || "").trim();

  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase("de-DE");
    } else {
      return n.slice(0, 2).toLocaleUpperCase("de-DE");
    }
  }

  if (email) {
    const [local] = email.split("@");
    const bits = (local || "").split(/[._-]+/).filter(Boolean);
    if (bits.length >= 2) {
      return (bits[0][0] + bits[1][0]).toLocaleUpperCase("de-DE");
    }
    if (local) return local.slice(0, 2).toLocaleUpperCase("de-DE");
  }

  return "G";
}

/* ===========================
   Aufgaben-Handling
=========================== */
function delTask(id) {
  dbApi.deleteData("/board" + findColumnOfTask(id) + "/" + id);
}
window.delTask = delTask;

/* ===========================
   Navigation
=========================== */
addEventListener("click", async (event) => {
  if (event.target.closest("#summary")) {
    window.location.href = "./index.html";
  }
  if (event.target.closest("#add-task")) {
    window.location.href = "./add-task.html?column=todo";
  }
  if (event.target.closest("#board")) {
    window.location.href = "./board.html";
  }
  if (event.target.closest("#contacts")) {
    window.location.href = "./contacts.html";
  }
});

addEventListener("load", async () => {
  loadNameHeader();
});

/* ===========================
   Dropdown Toggle ("G"-Button)
=========================== */
document.addEventListener("DOMContentLoaded", () => {
  const dropBtn = document.getElementById("dropbtn");
  const dropdown = document.querySelector(".dropdown-content");

  console.log("dropBtn gefunden:", !!dropBtn);
  console.log("dropdown gefunden:", !!dropdown);

  if (!dropBtn || !dropdown) {
    console.warn("⚠️ Dropdown-Elemente nicht gefunden – HTML prüfen.");
    return;
  }

  dropBtn.style.cursor = "pointer";
  let isOpen = false; // Kontroll-Flag

  // Klick auf G-Button
  dropBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("G-Button geklickt ✅");

    isOpen = !isOpen;
    dropdown.classList.toggle("show", isOpen);
  });

  // Klick außerhalb schließt Dropdown
  document.addEventListener("click", (e) => {
    const clickedInside = dropBtn.contains(e.target) || dropdown.contains(e.target);
    if (!clickedInside && isOpen) {
      dropdown.classList.remove("show");
      isOpen = false;
    }
  });

  // Schließen bei Fenster-Resize
  window.addEventListener("resize", () => {
    dropdown.classList.remove("show");
    isOpen = false;
  });
});

/* ===== SAFETY CHECK ===== */
window.addEventListener("load", () => {
  const btn = document.getElementById("dropbtn");
  if (!btn) {
    console.error("❌ Kein #dropbtn im DOM – HTML prüfen oder Script zu früh geladen!");
  }
});

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  if (!toast) {
    alert(message);
    return;
  }
  toast.textContent = message;
  toast.style.background = isError ? "#C62828" : "#2a3647";
  toast.classList.remove("d_none");
  void toast.offsetWidth; // Reflow für Transition
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("d_none"), 250);
  }, 2000);
}

window.showToast = showToast;
