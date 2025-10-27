// auth-guard.js
import { auth } from "./firebase.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

/**
 * Blendet die Seite erst ein, wenn Auth-Status feststeht,
 * und leitet ab, wenn kein User eingeloggt ist.
 * 
 * @param {Object} options
 * @param {string} options.redirectTo Pfad zur Login-Seite
 * @returns {Promise<import("https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js").User>}
 */
export function requireAuth({ redirectTo = "/login.html" } = {}) {
  // Body vorläufig verstecken (gegen FOUC)
  document.documentElement.style.visibility = "hidden";

  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub?.();
      if (!user) {
        // Nicht eingeloggt -> umleiten
        window.location.replace(redirectTo);
        return;
      }
      // Eingeloggt -> Seite anzeigen
      document.documentElement.style.visibility = "visible";
      resolve(user);
    });
  });
}
