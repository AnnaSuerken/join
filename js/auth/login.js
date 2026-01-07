// js/auth/login.js
import { auth, db } from "../core/firebase.js";
import {
  signInWithEmailAndPassword,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {
  ref,
  serverTimestamp,
  update,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

const form = document.getElementById("login-form");
const guestBtn = document.getElementById("guest-login-btn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const emailError = document.getElementById("email-error");
const passwordError = document.getElementById("password-error");

// ---- Toast Helpers ----
function safeShowToast(message, isError = false) {
  const fn =
    typeof showToast === "function"
      ? showToast
      : typeof window !== "undefined" && typeof window.showToast === "function"
        ? window.showToast
        : null;

  if (fn) fn(message, isError);
}
// ------------------------

function clearErrors() {
  if (emailError) emailError.textContent = "";
  if (passwordError) passwordError.textContent = "";
  if (emailInput) emailInput.classList.remove("error");
  if (passwordInput) passwordInput.classList.remove("error");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function extractLoginValues(e) {
  const email = e.target.email.value.trim();
  const password = e.target.password.value;
  return { email, password };
}

function showInvalidEmailError() {
  if (emailError) {
    emailError.textContent = "Bitte gib eine gültige Email-Adresse ein.";
  }
  if (emailInput) emailInput.classList.add("error");
}

function showEmptyPasswordError() {
  if (passwordError) {
    passwordError.textContent = "Bitte gib ein Passwort ein.";
  }
  if (passwordInput) passwordInput.classList.add("error");
}

async function performLogin(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

function handleLoginError(err) {
  console.error(err);

  switch (err.code) {
    case "auth/user-not-found":
      if (emailError) {
        emailError.textContent = "Diese Email ist nicht registriert.";
      }
      if (emailInput) emailInput.classList.add("error");
      safeShowToast("Diese Email ist nicht registriert.", true);
      break;

    case "auth/invalid-email":
      showInvalidEmailError();
      safeShowToast("Bitte gib eine gültige Email-Adresse ein.", true);
      break;

    case "auth/wrong-password":
      if (passwordError) {
        passwordError.textContent = "Falsches Passwort.";
      }
      if (passwordInput) passwordInput.classList.add("error");
      safeShowToast("Falsches Passwort.", true);
      break;

    case "auth/too-many-requests":
      if (passwordError) {
        passwordError.textContent =
          "Zu viele fehlgeschlagene Versuche. Bitte später erneut versuchen.";
      }
      safeShowToast(
        "Zu viele Versuche. Bitte später erneut probieren.",
        true
      );
      break;

    default:
      if (passwordError) {
        passwordError.textContent =
          "Login fehlgeschlagen. Bitte überprüfe deine Eingaben.";
      }
      safeShowToast("Login fehlgeschlagen. Bitte versuche es erneut.", true);
      break;
  }
}

function validateLoginInputs() {
  let valid = true;

  if (emailError) emailError.textContent = "";
  if (passwordError) passwordError.textContent = "";
  if (emailInput) emailInput.classList.remove("error");
  if (passwordInput) passwordInput.classList.remove("error");

  const emailVal = emailInput?.value?.trim() ?? "";
  const pwdVal = passwordInput?.value?.trim() ?? "";

  if (!emailVal) {
    if (emailError) emailError.textContent = "Bitte E-Mail eingeben.";
    if (emailInput) emailInput.classList.add("error");
    valid = false;
  } else if (!isValidEmail(emailVal)) {
    showInvalidEmailError();
    valid = false;
  }

  if (!pwdVal) {
    if (passwordError) passwordError.textContent = "Bitte Passwort eingeben.";
    if (passwordInput) passwordInput.classList.add("error");
    valid = false;
  }

  return valid;
}

async function handleFormSubmit(e) {
  e.preventDefault();
  clearErrors();

  if (!validateLoginInputs()) {
    safeShowToast("Bitte überprüfe deine Eingaben.", true);
    return;
  }

  const { email, password } = extractLoginValues(e);

  try {
    await performLogin(email, password);

    safeShowToast("Erfolgreich angemeldet.");
    window.location.href = "/index.html";
  } catch (err) {
    handleLoginError(err);
  }
}

async function handleGuestLogin() {
  clearErrors();

  try {
    const cred = await signInAnonymously(auth);

    await update(ref(db, `guests/${cred.user.uid}`), {
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      isAnonymous: true,
    });

    safeShowToast("Als Gast angemeldet.");
    window.location.href = "/index.html";
  } catch (err) {
    console.error(err);
    safeShowToast("Gast-Login fehlgeschlagen.", true);
  }
}

form?.addEventListener("submit", handleFormSubmit);
guestBtn?.addEventListener("click", handleGuestLogin);


onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = "/index.html";
});

setTimeout(() => {
  const loader = document.querySelector(".loader");
  if (loader) loader.style.display = "none";
}, 1000);
