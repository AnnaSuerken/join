// js/ui/nav.js
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;
  const file = path.split("/").pop() || "";
  const current = (file || "index.html").split("?")[0].split("#")[0];

  document
    .querySelectorAll(".nav-bar button")
    .forEach((btn) => toggleActiveOnMatch(btn, current));
});

function normalizeHref(href) {
  if (!href) return "";
  return href.split("/").pop().split("?")[0].split("#")[0] || "index.html";
}

function toggleActiveOnMatch(btn, current) {
  const link = btn.querySelector("a");
  if (!link) return;

  const href = normalizeHref(link.getAttribute("href"));
  const activeClass = "nav-bar-button-active";

  if (href === current) btn.classList.add(activeClass);
  else btn.classList.remove(activeClass);
}
