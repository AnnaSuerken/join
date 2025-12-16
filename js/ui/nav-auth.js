// js/ui/nav-auth.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const navRefSummary = document.getElementById("summary");
  const navRefaddTask = document.getElementById("add-task");
  const navRefBoard = document.getElementById("board");
  const nacRefConnections = document.getElementById("contacts");
  const headerIcons = document.getElementById("dropbtn");

  onAuthStateChanged(window.auth, (user) => {
    const display = user ? "flex" : "none";
    updateSummaryNav(navRefSummary, user);
    toggleNavItem(navRefaddTask, display);
    toggleNavItem(navRefBoard, display);
    toggleNavItem(nacRefConnections, display);
    toggleNavItem(headerIcons, display);
  });
});

function updateSummaryNav(navRefSummary, user) {
  if (!navRefSummary) return;
  if (user) {
    navRefSummary.innerHTML = `
      <img src="./assets/icons/summary.svg" alt="" /> Summary
    `;
    return;
  }
  navRefSummary.innerHTML = `
    <button id="login">
      <img src="./assets/icons/login.svg" alt="" /> Log in
    </button>
  `;
}

function toggleNavItem(el, display) {
  if (!el) return;
  el.style.display = display;
}
