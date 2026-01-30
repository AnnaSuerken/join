// js/core/main.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

/**
 * Ensures that a user is authenticated before accessing protected pages.
 * Redirects to a login page if no user is authenticated.
 *
 * @param {Object} [options]
 * Optional configuration object.
 *
 * @param {string} [options.redirectTo="/login.html"]
 * URL to redirect to if the user is not authenticated.
 */
function requireAuthLocal({ redirectTo = "/login.html" } = {}) {
  return new Promise((resolve) => {
    onAuthStateChanged(window.auth, (user) => {
      if (user) resolve(user);
      else window.location.href = redirectTo;
    });
  });
}

/**
 * Prevents form submission via the Enter key globally.
 */
function preventEnterSubmit() {
  addEventListener("keypress", (e) => {
    if (e.key === "Enter") e.preventDefault();
  });
}

/**
 * Resolves user initials based on display name or email.
 *
 * @param {string|null} displayName
 * User display name.
 *
 * @param {string|null} email
 * User email address.
 */
function nameToInitials(displayName, email) {
  const n = (displayName || "").trim();
  if (n) return getInitialsFromName(n);
  if (email) return getInitialsFromEmail(email);
  return "G";
}

/**
 * Generates initials from a full name.
 *
 * @param {string} name
 * Full name.
 */
function getInitialsFromName(name) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase("de-DE");
  }
  return name.slice(0, 2).toLocaleUpperCase("de-DE");
}

/**
 * Generates initials from an email address.
 *
 * @param {string} email
 * Email address.
 */
function getInitialsFromEmail(email) {
  const [local] = email.split("@");
  const bits = (local || "").split(/[._-]+/).filter(Boolean);
  if (bits.length >= 2) {
    return (bits[0][0] + bits[1][0]).toLocaleUpperCase("de-DE");
  }
  return (local || "").slice(0, 2).toLocaleUpperCase("de-DE");
}

/**
 * Loads and displays the current user's initials
 * in the header dropdown button.
 */
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

/**
 * Resolves initials for a Firebase user.
 *
 * @param {Object} user
 * Firebase authenticated user.
 */
async function initialsForUser(user) {
  const dbName = await dbApi.getData(`users/${user.uid}/displayName`);
  const name = (dbName || user.displayName || "").trim();
  return nameToInitials(name, user.email);
}

/**
 * Deletes a task by ID from the board.
 *
 * @param {string} id
 * Task ID.
 */
function delTask(id) {
  dbApi.deleteData("/board" + findColumnOfTask(id) + "/" + id);
}

/**
 * Sets up global navigation click handling.
 */
function setupGlobalNavClicks() {
  addEventListener("click", (event) => handleNavClick(event));
}

/**
 * Handles navigation click events and routes accordingly.
 *
 * @param {MouseEvent} event
 * Click event.
 */
function handleNavClick(event) {
  const routes = navRoutes();
  const path = matchRoute(event.target, routes);
  if (path) window.location.href = path;
}

/**
 * Returns all navigation route mappings.
 */
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

/**
 * Matches a clicked element against navigation routes.
 *
 * @param {HTMLElement} target
 * Event target element.
 *
 * @param {Array<Array<string>>} routes
 * Navigation routes.
 */
function matchRoute(target, routes) {
  for (const [selector, href] of routes) {
    if (target.closest(selector)) return href;
  }
  return null;
}

/**
 * Initializes the user dropdown menu.
 */
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

/**
 * Toggles the visibility of the user dropdown.
 *
 * @param {MouseEvent} e
 * Click event.
 *
 * @param {HTMLElement} dropdown
 * Dropdown container.
 */
function toggleDropdown(e, dropdown) {
  e.stopPropagation();
  dropdown.classList.toggle("show");
}

/**
 * Closes the dropdown when clicking outside.
 *
 * @param {MouseEvent} e
 * Click event.
 *
 * @param {HTMLElement} dropdown
 * Dropdown container.
 *
 * @param {HTMLElement} button
 * Dropdown toggle button.
 */
function closeDropdownOnOutsideClick(e, dropdown, button) {
  if (!dropdown.contains(e.target) && e.target !== button) {
    dropdown.classList.remove("show");
  }
}

/**
 * Displays a toast notification.
 *
 * @param {string} message
 * Message to display.
 *
 * @param {boolean} [isError=false]
 * Whether the toast represents an error.
 */
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

/**
 * Hides a toast notification.
 *
 * @param {HTMLElement} toast
 * Toast element.
 */
function hideToast(toast) {
  toast.classList.remove("show");
  setTimeout(() => toast.classList.add("d_none"), 250);
}

/**
 * Guards protected pages and redirects unauthenticated users.
 */
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

window.addEventListener("load", () => {
  const cfg = getLoaderConfig();
  if (!cfg) return;

  resetLoaderAnimation(cfg.loaderLogo);
  startLoaderAnimation(cfg.fixedLogo, cfg.loaderLogo);
});

/**
 * Retrieves the loader animation configuration.
 *
 * @returns {Object|null}
 * Loader configuration or null.
 */
function getLoaderConfig() {
  const fixedLogo = document.getElementById("fix-logo");
  if (!fixedLogo) return null;

  const loaderDesktop = document.getElementById("loader-img");
  const loaderMobile = document.getElementById("loader-img-mobile");
  const loaderLogo = pickLoaderLogo(loaderDesktop, loaderMobile);

  return loaderLogo ? { fixedLogo, loaderLogo } : null;
}

/**
 * Selects the appropriate loader logo based on viewport size.
 *
 * @param {HTMLElement|null} loaderDesktop
 * Desktop loader logo.
 *
 * @param {HTMLElement|null} loaderMobile
 * Mobile loader logo.
 */
function pickLoaderLogo(loaderDesktop, loaderMobile) {
  const isMobile = window.matchMedia("(max-width: 660px)").matches;
  return isMobile ? loaderMobile : loaderDesktop;
}

/**
 * Resets the loader animation state.
 *
 * @param {HTMLElement} loaderLogo
 * Loader logo element.
 */
function resetLoaderAnimation(loaderLogo) {
  loaderLogo.classList.remove("animate");
}

/**
 * Starts the loader animation.
 *
 * @param {HTMLElement} fixedLogo
 * Final logo position.
 *
 * @param {HTMLElement} loaderLogo
 * Animated loader logo.
 */
function startLoaderAnimation(fixedLogo, loaderLogo) {
  const start = () => animateLoaderToLogo(fixedLogo, loaderLogo, start);
  waitForLoaderImage(loaderLogo, start);
}

/**
 * Waits for the loader image to load before animation.
 *
 * @param {HTMLElement} loaderLogo
 * Loader logo element.
 *
 * @param {Function} start
 * Animation start callback.
 */
function waitForLoaderImage(loaderLogo, start) {
  if (loaderLogo.tagName === "IMG" && !loaderLogo.complete) {
    loaderLogo.addEventListener("load", start, { once: true });
  } else {
    requestAnimationFrame(start);
  }
}

/**
 * Animates the loader logo to the fixed logo position.
 *
 * @param {HTMLElement} fixedLogo
 * Target logo.
 *
 * @param {HTMLElement} loaderLogo
 * Animated logo.
 *
 * @param {Function} retry
 * Retry callback if layout data is unavailable.
 */
function animateLoaderToLogo(fixedLogo, loaderLogo, retry) {
  const data = calcAnimationData(fixedLogo, loaderLogo);
  if (!data) return requestAnimationFrame(retry);

  applyAnimationVars(loaderLogo, data);
  void loaderLogo.offsetWidth;
  loaderLogo.classList.add("animate");
}

/**
 * Calculates animation translation and scale values.
 *
 * @param {HTMLElement} fixedLogo
 * Target logo element.
 *
 * @param {HTMLElement} loaderLogo
 * Loader logo element.
 *
 * @returns {Object|null}
 * Animation data or null.
 */
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

/**
 * Applies CSS animation variables to the loader logo.
 *
 * @param {HTMLElement} loaderLogo
 * Loader logo element.
 *
 * @param {Object} vars
 * Animation variables.
 */
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
