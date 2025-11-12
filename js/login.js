// auth-login.js
import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {
  ref,
  set,
  serverTimestamp,
  update,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

const form = document.getElementById("login-form");
const guestBtn = document.getElementById("guest-login-btn");

function setStatus(msg, isError = false) {
  statusBox.style.display = "flex";
  statusBox.textContent = msg;
  statusBox.style.color = isError ? "crimson" : "inherit";
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = e.target.email.value.trim();
  const password = e.target.password.value;

  showToast("Anmeldung läuft");

  try {
    await signInWithEmailAndPassword(auth, email, password);
    showToast("Erfolgreich angemeldet.");
    window.location.href = "/index.html";
  } catch (err) {
    console.error(err);
    await setTimeout(() => {
      showToast(
        "Login fehlgeschlagen überprüfe deine Email oder Passwort",
        true
      );
    }, 3000);
    form.reset();
  }
});

guestBtn?.addEventListener("click", async () => {
  showToast("Gast-Anmeldung läuft...");
  try {
    const cred = await signInAnonymously(auth);
    await update(ref(db, `guests/${cred.user.uid}`), {
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      isAnonymous: true,
    });
    showToast("Als Gast angemeldet.");
    window.location.href = "/index.html";
  } catch (err) {
    console.error(err);
    showToast("Gast-Login fehlgeschlagen.", true);
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "/index.html";
  }
});

setTimeout(() => {
  const loader = document.querySelector(".loader");
  loader.style.display = "none";
}, 1000);
