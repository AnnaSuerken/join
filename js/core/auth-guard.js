import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

/**
 * Ensures that a user is authenticated before allowing access
 * to the current page.
 *
 * If no authenticated user is found, the user is redirected
 * to the specified login page.
 *
 * @param {Object} [options]
 * Optional configuration object.
 *
 * @param {string} [options.redirectTo="/login.html"]
 * URL to redirect to if the user is not authenticated.
 *
 * @returns {Promise<Object>}
 * Resolves with the authenticated Firebase user.
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

window.requireAuth = requireAuth;
