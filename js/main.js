import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

function requireAuth({ redirectTo = "/login.html" } = {}) {
  return new Promise((resolve) => {
    onAuthStateChanged(window.auth, (user) => {
      if (user) resolve(user);
      else window.location.href = redirectTo;
    });
  });
}

addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
  }
});

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
      return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase(
        "de-DE"
      );
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

function delTask(id) {
  dbApi.deleteData("/board" + findColumnOfTask(id) + "/" + id);
}

addEventListener("load", async () => {
  loadNameHeader();
});

addEventListener("click", async (event) => {
  if (event.target.closest("#login")) {
    window.location.href = "./login.html";
  }
  if (event.target.closest("#summary")) {
    window.location.href = "./index.html";
  }
  if (event.target.closest("#add-task")) {
    window.location.href = "./add-task.html";
  }
  if (event.target.closest("#board")) {
    window.location.href = "./board.html";
  }
  if (event.target.closest("#contacts")) {
    window.location.href = "./contacts.html";
  }
});

window.delTask = delTask;

// === Dropdown Toggle (oben rechts "G"-Button) ===
document.addEventListener("DOMContentLoaded", () => {
  const dropBtn = document.getElementById("dropbtn");
  const dropdown = document.querySelector(".dropdown-content");

  if (!dropBtn || !dropdown) return;

  dropBtn.style.cursor = "pointer";

  dropBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("show");
  });

  // Klick außerhalb schließt das Dropdown
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && e.target !== dropBtn) {
      dropdown.classList.remove("show");
    }
  });
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

addEventListener("load", async () => {
  const overlay = document.getElementById("loading-overlay");
  setTimeout(() => {
    overlay.classList.add("hidden");
  }, 500);
});

window.addEventListener("load", () => {
  if (
    window.location.pathname === "/login.html" ||
    window.location.pathname === "/signup.html" ||
    window.location.pathname === "/legal-notice.html" ||
    window.location.pathname === "/privacy-policy.html" ||
    window.location.pathname === "/help.html"
  )
    return;
  requireAuth();
});

window.showToast = showToast;
window.requireAuth = requireAuth;
