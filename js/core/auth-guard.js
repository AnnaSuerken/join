// js/core/auth-guard.js
import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

/**
 * Blendet die Seite erst ein, wenn Auth-Status feststeht,
 * und leitet ab, wenn kein User eingeloggt ist.
 *
 * @param {Object} options
 * @param {string} options.redirectTo Pfad zur Login-Seite
 */
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

// global, falls du irgendwo window.requireAuth nutzt
window.requireAuth = requireAuth;
