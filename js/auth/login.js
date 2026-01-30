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

/**
 * displays a toast message if a toast handler is available.
 *
 * @param {string} message
 * Message to display.
 * @param {boolean} [isError=false]
 * Whether the message represents an error.
 */
function safeShowToast(message, isError = false) {
  const fn =
    typeof showToast === "function"
      ? showToast
      : typeof window !== "undefined" && typeof window.showToast === "function"
        ? window.showToast
        : null;

  if (fn) fn(message, isError);
}


/**
 * Clears all login form validation errors and error styles.
 */
function clearErrors() {
  if (emailError) emailError.textContent = "";
  if (passwordError) passwordError.textContent = "";
  if (emailInput) emailInput.classList.remove("error");
  if (passwordInput) passwordInput.classList.remove("error");
}

/**
 * Validates an email address format.
 *
 * @param {string} email
 * Email address.
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Extracts login credentials from the submit event.
 *
 * @param {SubmitEvent} e
 * Form submit event.
 */
function extractLoginValues(e) {
  const email = e.target.email.value.trim();
  const password = e.target.password.value;
  return { email, password };
}

/**
 * Displays an invalid email error message.
 */
function showInvalidEmailError() {
  if (emailError) {
    emailError.textContent = "Bitte gib eine gültige Email-Adresse ein.";
  }
  if (emailInput) emailInput.classList.add("error");
}

/**
 * Displays an empty password error message.
 */
function showEmptyPasswordError() {
  if (passwordError) {
    passwordError.textContent = "Bitte gib ein Passwort ein.";
  }
  if (passwordInput) passwordInput.classList.add("error");
}

/**
 * Performs a Firebase email/password login.
 *
 * @param {string} email
 * User email.
 * @param {string} password
 * User password.
 */
async function performLogin(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Handles Firebase authentication errors.
 *
 * @param {any} err
 * Firebase authentication error object.
 */

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

/**
 * Validates login form input fields.
 */
function validateLoginInputs() {
  resetLoginErrors();

  const emailVal = emailInput?.value?.trim() ?? "";
  const pwdVal = passwordInput?.value?.trim() ?? "";

  let valid = true;
  if (!validateEmailField(emailVal)) valid = false;
  if (!validatePasswordField(pwdVal)) valid = false;

  return valid;
}

function resetLoginErrors() {
  emailError && (emailError.textContent = "");
  passwordError && (passwordError.textContent = "");
  emailInput?.classList.remove("error");
  passwordInput?.classList.remove("error");
}

function validateEmailField(value) {
  if (!value) {
    emailError && (emailError.textContent = "Bitte E-Mail eingeben.");
    emailInput?.classList.add("error");
    return false;
  }
  if (!isValidEmail(value)) {
    showInvalidEmailError();
    return false;
  }
  return true;
}

function validatePasswordField(value) {
  if (!value) {
    passwordError && (passwordError.textContent = "Bitte Passwort eingeben.");
    passwordInput?.classList.add("error");
    return false;
  }
  return true;
}

/**
 * Handles login form submission.
 *
 * @param {SubmitEvent} e
 * Form submit event.
 */
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

/**
 * Handles anonymous guest login.
 */
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

/**
 * Redirects already authenticated users away from the login page.
 */
onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = "/index.html";
});

/**
 * Hides the loader animation after a fixed delay.
 */
setTimeout(() => {
  const loader = document.querySelector(".loader");
  if (loader) loader.style.display = "none";
}, 1800);
