import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

/**
 * Initializes navigation visibility and content
 * after loading.
 *
 * Listens to authentication state changes and updates
 * navigation items accordingly.
 */
document.addEventListener("DOMContentLoaded", () => {
  const summary = document.getElementById("summary");
  const addTask = document.getElementById("add-task");
  const board = document.getElementById("board");
  const contacts = document.getElementById("contacts");
  const headerIcons = document.getElementById("dropbtn");

  const mSummary = document.getElementById("m-summary");
  const mAddTask = document.getElementById("m-add-task");
  const mBoard = document.getElementById("m-board");
  const mContacts = document.getElementById("m-contacts");

  onAuthStateChanged(window.auth, (user) => {
    const display = user ? "flex" : "none";

    updateSummaryNav(summary, user);
    updateSummaryNav(mSummary, user);

    toggleNavItem(addTask, display);
    toggleNavItem(board, display);
    toggleNavItem(contacts, display);

    toggleNavItem(mAddTask, display);
    toggleNavItem(mBoard, display);
    toggleNavItem(mContacts, display);

    toggleNavItem(headerIcons, display);
  });
});

/**
 * Updates the summary navigation entry
 *
 * If a user is logged in, the element shows "Summary".
 * If not, it switches to a "Log in" link.
 *
 * @param {HTMLElement|null} el
 * The navigation element to update.
 *
 * @param {Object|null} user
 * The authenticated Firebase user object or null.
 */
function updateSummaryNav(el, user) {
  if (!el) return;

  if (user) {
    el.innerHTML = `
      <img src="./assets/icons/summary.svg" alt="" />
      Summary
    `;
  } else {
    el.id = "login";
    el.innerHTML = `
      <img src="./assets/icons/login.svg" alt="" />
      Log in
    `;
  }
}

/**
 * Toggles the visibility of a navigation item.
 *
 * @param {HTMLElement|null} el
 * The navigation element to show or hide.
 *
 * @param {string} display
 * CSS display value (e.g. "flex" or "none").
 */
function toggleNavItem(el, display) {
  if (!el) return;
  el.style.display = display;
}
