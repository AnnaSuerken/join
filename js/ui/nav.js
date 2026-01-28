// js/ui/nav.js

/**
 * Initializes active state handling for navigation buttons
 * after loading.
 *
 * Determines the current page from the URL and highlights
 * the matching navigation button.
 */
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;
  const file = path.split("/").pop() || "";
  const current = (file || "index.html").split("?")[0].split("#")[0];

  document
    .querySelectorAll(".nav-bar button")
    .forEach((btn) => toggleActiveOnMatch(btn, current));
});

/**
 * Normalizes a URL or href value to a comparable file name.
 *
 *
 * @param {string|null} href
 * The href attribute value to normalize.
 *
 * @returns {string}
 * Normalized file name (e.g. "index.html").
 */
function normalizeHref(href) {
  if (!href) return "";
  return href.split("/").pop().split("?")[0].split("#")[0] || "index.html";
}

/**
 * Toggles the active CSS class on a navigation button
 * if its link matches the current page.
 *
 * @param {HTMLButtonElement} btn
 * The navigation button element.
 *
 * @param {string} current
 * The normalized current page file name.
 */
function toggleActiveOnMatch(btn, current) {
  const link = btn.querySelector("a");
  if (!link) return;

  const href = normalizeHref(link.getAttribute("href"));
  const activeClass = "nav-bar-button-active";

  if (href === current) btn.classList.add(activeClass);
  else btn.classList.remove(activeClass);
}
