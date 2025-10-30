document.addEventListener("DOMContentLoaded", () => {
  
  const path = window.location.pathname;
  const file = path.split("/").pop() || ""; // z.B. "contacts.html" oder ""
  const cleanCurrent = (file || "index.html").split("?")[0].split("#")[0];

  
  const normalizeHref = (href) => {
    if (!href) return "";
    
    let name = href.split("/").pop();
    
    if (name.startsWith("./")) name = name.slice(2);
    
    name = name.split("?")[0].split("#")[0];
    
    return name || "index.html";
  };

  
  const buttons = document.querySelectorAll(".nav-bar button");

  buttons.forEach((button) => {
    const link = button.querySelector("a");
    if (!link) return;

    const linkPage = normalizeHref(link.getAttribute("href"));

    if (linkPage === cleanCurrent) {
      button.classList.add("nav-bar-button-active");
    } else {
      button.classList.remove("nav-bar-button-active");
    }
  });
});
