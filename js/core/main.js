// js/core/main.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

/**
 * Fallback-requireAuth, falls du hier ohne ES-Module lädst.
 * Wenn du auth-guard.js als Modul verwendest, kannst du das hier entfernen.
 */
function requireAuthLocal({ redirectTo = "/login.html" } = {}) {
  return new Promise((resolve) => {
    onAuthStateChanged(window.auth, (user) => {
      if (user) resolve(user);
      else window.location.href = redirectTo;
    });
  });
}

function preventEnterSubmit() {
  addEventListener("keypress", (e) => {
    if (e.key === "Enter") e.preventDefault();
  });
}

function nameToInitials(displayName, email) {
  const n = (displayName || "").trim();
  if (n) return getInitialsFromName(n);
  if (email) return getInitialsFromEmail(email);
  return "G";
}

function getInitialsFromName(name) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase(
      "de-DE"
    );
  }
  return name.slice(0, 2).toLocaleUpperCase("de-DE");
}

function getInitialsFromEmail(email) {
  const [local] = email.split("@");
  const bits = (local || "").split(/[._-]+/).filter(Boolean);
  if (bits.length >= 2) {
    return (bits[0][0] + bits[1][0]).toLocaleUpperCase("de-DE");
  }
  return (local || "").slice(0, 2).toLocaleUpperCase("de-DE");
}

async function loadNameHeader() {
  const userNameRef = document.getElementById("dropbtn");
  if (!userNameRef) return;

  onAuthStateChanged(window.auth, async (user) => {
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

function delTask(id) {
  dbApi.deleteData("/board" + findColumnOfTask(id) + "/" + id);
}

function setupGlobalNavClicks() {
  addEventListener("click", (event) => {
    if (event.target.closest("#login")) window.location.href = "./login.html";
    if (event.target.closest("#summary")) window.location.href = "./index.html";
    if (event.target.closest("#add-task"))
      window.location.href = "./add-task.html";
    if (event.target.closest("#board")) window.location.href = "./board.html";
    if (event.target.closest("#contacts"))
      window.location.href = "./contacts.html";
  });
}

function setupUserDropdown() {
  document.addEventListener("DOMContentLoaded", () => {
    const dropBtn = document.getElementById("dropbtn");
    const dropdown = document.querySelector(".dropdown-content");
    if (!dropBtn || !dropdown) return;

    dropBtn.style.cursor = "pointer";
    dropBtn.addEventListener("click", (e) => toggleDropdown(e, dropdown));
    document.addEventListener("click", (e) =>
      closeDropdownOnOutsideClick(e, dropdown, dropBtn)
    );
  });
}

function toggleDropdown(e, dropdown) {
  e.stopPropagation();
  dropdown.classList.toggle("show");
}

function closeDropdownOnOutsideClick(e, dropdown, button) {
  if (!dropdown.contains(e.target) && e.target !== button) {
    dropdown.classList.remove("show");
  }
}

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  if (!toast) {
    alert(message);
    return;
  }
  toast.textContent = message;
  toast.style.background = isError ? "#C62828" : "#2fff28";
  toast.classList.remove("d_none");
  void toast.offsetWidth;
  toast.classList.add("show");
  setTimeout(() => hideToast(toast), 2000);
}

function hideToast(toast) {
  toast.classList.remove("show");
  setTimeout(() => toast.classList.add("d_none"), 250);
}

function hideLoadingOverlay() {
  const overlay = document.getElementById("loading-overlay");
  if (!overlay) return;
  setTimeout(() => overlay.classList.add("hidden"), 700);
}

function guardProtectedPages() {
  const p = window.location.pathname;
  const publicPages = [
    "/login.html",
    "/signup.html",
    "/legal-notice.html",
    "/privacy-policy.html",
    "/help.html",
  ];
  if (publicPages.includes(p)) return;

  // hier kannst du stattdessen requireAuth aus auth-guard nutzen
  (window.requireAuth || requireAuthLocal)();
}

addEventListener("load", () => {
  preventEnterSubmit();
  loadNameHeader();
  hideLoadingOverlay();
  guardProtectedPages();
});

setupGlobalNavClicks();
setupUserDropdown();

window.delTask = delTask;
window.showToast = showToast;
window.requireAuth = window.requireAuth || requireAuthLocal;
