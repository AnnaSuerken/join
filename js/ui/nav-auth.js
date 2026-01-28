import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

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

function toggleNavItem(el, display) {
  if (!el) return;
  el.style.display = display;
}
