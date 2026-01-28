import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

export function requireAuth({ redirectTo = "/login.html" } = {}) {
  document.documentElement.style.visibility = "hidden";

  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub?.();
      if (!user) {
        window.location.replace(redirectTo);
        return;
      }
      document.documentElement.style.visibility = "visible";
      resolve(user);
    });
  });
}

window.requireAuth = requireAuth;
