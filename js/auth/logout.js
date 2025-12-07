// js/auth/logout.js
import { auth } from "../core/firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

export async function logout(redirectTo = "/login.html") {
  try {
    await signOut(auth);
  } finally {
    window.location.replace(redirectTo);
  }
}

const btn = document.querySelector("#logout-btn");
if (btn) btn.addEventListener("click", () => logout());
