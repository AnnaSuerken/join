// js/core/main.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

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
    return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase("de-DE");
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
      userNameRef.innerText = user ? await initialsForUser(user) : "G";
    } catch (err) {
      console.error(err);
      userNameRef.innerText = "G";
    }
  });
}

async function initialsForUser(user) {
  const dbName = await dbApi.getData(`users/${user.uid}/displayName`);
  const name = (dbName || user.displayName || "").trim();
  return nameToInitials(name, user.email);
}

function delTask(id) {
  dbApi.deleteData("/board" + findColumnOfTask(id) + "/" + id);
}

/* --------- NAV: refactor --------- */

function setupGlobalNavClicks() {
  addEventListener("click", (event) => handleNavClick(event));
}

function handleNavClick(event) {
  const routes = navRoutes();
  const path = matchRoute(event.target, routes);
  if (path) window.location.href = path;
}

function navRoutes() {
  return [
    ["#login", "./login.html"],
    ["#summary", "./index.html"],
    ["#add-task", "./add-task.html"],
    ["#board", "./board.html"],
    ["#contacts", "./contacts.html"],
    ["#m-login", "./login.html"],
    ["#m-summary", "./index.html"],
    ["#m-add-task", "./add-task.html"],
    ["#m-board", "./board.html"],
    ["#m-contacts", "./contacts.html"],
  ];
}

function matchRoute(target, routes) {
  for (const [selector, href] of routes) {
    if (target.closest(selector)) return href;
  }
  return null;
}

/* --------- DROPDOWN: ok --------- */

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

  (window.requireAuth || requireAuthLocal)();
}

addEventListener("load", () => {
  guardProtectedPages();
  preventEnterSubmit();
  loadNameHeader();
});

/* --------- LOADER: refactor --------- */

window.addEventListener("load", () => {
  const cfg = getLoaderConfig();
  if (!cfg) return;

  resetLoaderAnimation(cfg.loaderLogo);
  startLoaderAnimation(cfg.fixedLogo, cfg.loaderLogo);
});

function getLoaderConfig() {
  const fixedLogo = document.getElementById("fix-logo");
  if (!fixedLogo) return null;

  const loaderDesktop = document.getElementById("loader-img");
  const loaderMobile = document.getElementById("loader-img-mobile");
  const loaderLogo = pickLoaderLogo(loaderDesktop, loaderMobile);

  return loaderLogo ? { fixedLogo, loaderLogo } : null;
}

function pickLoaderLogo(loaderDesktop, loaderMobile) {
  const isMobile = window.matchMedia("(max-width: 660px)").matches;
  return isMobile ? loaderMobile : loaderDesktop;
}

function resetLoaderAnimation(loaderLogo) {
  loaderLogo.classList.remove("animate");
}

function startLoaderAnimation(fixedLogo, loaderLogo) {
  const start = () => animateLoaderToLogo(fixedLogo, loaderLogo, start);
  waitForLoaderImage(loaderLogo, start);
}

function waitForLoaderImage(loaderLogo, start) {
  if (loaderLogo.tagName === "IMG" && !loaderLogo.complete) {
    loaderLogo.addEventListener("load", start, { once: true });
  } else {
    requestAnimationFrame(start);
  }
}

function animateLoaderToLogo(fixedLogo, loaderLogo, retry) {
  const data = calcAnimationData(fixedLogo, loaderLogo);
  if (!data) return requestAnimationFrame(retry);

  applyAnimationVars(loaderLogo, data);
  void loaderLogo.offsetWidth;
  loaderLogo.classList.add("animate");
}

function calcAnimationData(fixedLogo, loaderLogo) {
  const logoRect = fixedLogo.getBoundingClientRect();
  const loaderRect = loaderLogo.getBoundingClientRect();
  if (!logoRect.width || !loaderRect.width) return null;

  const startX = window.innerWidth / 2;
  const startY = window.innerHeight / 2;

  const targetX = logoRect.left + logoRect.width / 2;
  const targetY = logoRect.top + logoRect.height / 2;

  return {
    dx: targetX - startX,
    dy: targetY - startY,
    scale: logoRect.width / loaderRect.width,
  };
}

function applyAnimationVars(loaderLogo, { dx, dy, scale }) {
  loaderLogo.style.setProperty("--dx", `${dx}px`);
  loaderLogo.style.setProperty("--dy", `${dy}px`);
  loaderLogo.style.setProperty("--scale", `${scale}`);
}

setupGlobalNavClicks();
setupUserDropdown();

window.delTask = delTask;
window.showToast = showToast;
window.requireAuth = window.requireAuth || requireAuthLocal;
