// js/login.js
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

// DOM-Elemente
const form = document.getElementById("login-form");
const guestBtn = document.getElementById("guest-login-btn");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const emailError = document.getElementById("email-error");
const passwordError = document.getElementById("password-error");

function clearErrors() {
  if (emailError) emailError.textContent = "";
  if (passwordError) passwordError.textContent = "";
  if (emailInput) emailInput.classList.remove("error");
  if (passwordInput) passwordInput.classList.remove("error");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();

  const email = e.target.email.value.trim();
  const password = e.target.password.value;

  if (!isValidEmail(email)) {
    if (emailError) emailError.textContent = "Bitte gib eine gültige Email-Adresse ein.";
    if (emailInput) emailInput.classList.add("error");
    return;
  }

  if (!password) {
    if (passwordError) passwordError.textContent = "Bitte gib ein Passwort ein.";
    if (passwordInput) passwordInput.classList.add("error");
    return;
  }

  if (typeof showToast === "function") {
    showToast("Anmeldung läuft");
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);

    if (typeof showToast === "function") {
      showToast("Erfolgreich angemeldet.");
    }

    window.location.href = "/index.html";
  } catch (err) {
    console.error(err);

    switch (err.code) {
      case "auth/user-not-found":
        if (emailError)
          emailError.textContent = "Diese Email ist nicht registriert.";
        if (emailInput) emailInput.classList.add("error");
        break;

      case "auth/invalid-email":
        if (emailError)
          emailError.textContent = "Bitte gib eine gültige Email-Adresse ein.";
        if (emailInput) emailInput.classList.add("error");
        break;

      case "auth/wrong-password":
        if (passwordError) passwordError.textContent = "Falsches Passwort.";
        if (passwordInput) passwordInput.classList.add("error");
        break;

      case "auth/too-many-requests":
        if (passwordError)
          passwordError.textContent =
            "Zu viele fehlgeschlagene Versuche. Bitte später erneut versuchen.";
        break;

      default:
        if (passwordError)
          passwordError.textContent =
            "Login fehlgeschlagen. Bitte überprüfe deine Eingaben.";
        break;
    }
  }
});

// GAST-LOGIN
guestBtn?.addEventListener("click", async () => {
  clearErrors();

  if (typeof showToast === "function") {
    showToast("Gast-Anmeldung läuft...");
  }

  try {
    const cred = await signInAnonymously(auth);
    await update(ref(db, `guests/${cred.user.uid}`), {
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      isAnonymous: true,
    });

    if (typeof showToast === "function") {
      showToast("Als Gast angemeldet.");
    }

    window.location.href = "/index.html";
  } catch (err) {
    console.error(err);
    if (typeof showToast === "function") {
      showToast("Gast-Login fehlgeschlagen.", true);
    }
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "/index.html";
  }
});

setTimeout(() => {
  const loader = document.querySelector(".loader");
  if (loader) loader.style.display = "none";
}, 1000);
