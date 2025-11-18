// nav-auth.js
import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const navRefSummary = document.getElementById("summary");
  const navRefaddTask = document.getElementById("add-task");
  const navRefBoard = document.getElementById("board");
  const nacRefConnections = document.getElementById("contacts");

  onAuthStateChanged(auth, (user) => {
    const display = user ? "flex" : "none";

    navRefSummary.innerHTML = user
      ? `<img src="./assets/icons/summary.svg" alt="" /> Summary`
      : `<button id="login"> <img src="./assets/icons/login.svg" alt="" /> Log in </button>`;
    navRefaddTask.style.display = display;
    navRefBoard.style.display = display;
    nacRefConnections.style.display = display;
  });
});
