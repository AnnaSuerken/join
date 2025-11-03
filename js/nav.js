document.addEventListener("DOMContentLoaded", () => {
  
  const path = window.location.pathname;
  const file = path.split("/").pop() || "";
  const current = (file || "index.html").split("?")[0].split("#")[0];

  const normalize = (href) => {
    if (!href) return "";
    let name = href.split("/").pop().split("?")[0].split("#")[0];
    return name || "index.html";
  };

  document.querySelectorAll(".nav-bar button").forEach((btn) => {
    const link = btn.querySelector("a");
    if (!link) return;

    const href = normalize(link.getAttribute("href"));
    if (href === current) {
      btn.classList.add("nav-bar-button-active");
    } else {
      btn.classList.remove("nav-bar-button-active");
    }
  });
});
