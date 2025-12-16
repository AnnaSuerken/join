// js/auth/signup.js
import { auth, db } from "../core/firebase.js";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {
  ref,
  set,
  serverTimestamp,
  update as dbUpdate,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

const form = document.getElementById("register-form");
const signupbutton = document.getElementById("signupbutton");

const nameInput = document.getElementById("displayName");
const emailInput = document.getElementById("email");
const password = document.getElementById("password");
const password2 = document.getElementById("password2");
const checkBox = document.getElementById("checkbox");

const nameError = document.getElementById("name-error");
const emailError = document.getElementById("email-error");
const passwordError = document.getElementById("password-error");
const password2Error = document.getElementById("password2-error");
const checkboxError = document.getElementById("checkbox-error");

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function clearErrors() {
  [nameError, emailError, passwordError, password2Error, checkboxError].forEach(
    (el) => el && (el.textContent = "")
  );

  [nameInput, emailInput, password, password2].forEach((input) => {
    if (input) input.classList.remove("error");
  });
}

function validateName(nameVal) {
  if (!nameVal) {
    nameError.textContent = "Bitte gib deinen Namen ein.";
    nameInput.classList.add("error");
    return false;
  }
  return true;
}

function validateEmailValue(emailVal) {
  if (!emailVal) {
    emailError.textContent = "Bitte gib eine Email-Adresse ein.";
    emailInput.classList.add("error");
    return false;
  }
  if (!isValidEmail(emailVal)) {
    emailError.textContent = "Bitte gib eine gültige Email-Adresse ein.";
    emailInput.classList.add("error");
    return false;
  }
  return true;
}

function validatePasswordValue(pwdVal) {
  if (!pwdVal) {
    passwordError.textContent = "Bitte gib ein Passwort ein.";
    password.classList.add("error");
    return false;
  }
  if (pwdVal.length < 6) {
    passwordError.textContent =
      "Das Passwort muss mindestens 6 Zeichen lang sein.";
    password.classList.add("error");
    return false;
  }
  return true;
}

function validatePasswordConfirmation(pwdVal, pwd2Val) {
  if (!pwd2Val) {
    password2Error.textContent = "Bitte wiederhole dein Passwort.";
    password2.classList.add("error");
    return false;
  }
  if (pwdVal && pwdVal !== pwd2Val) {
    password2Error.textContent = "Die Passwörter stimmen nicht überein.";
    password2.classList.add("error");
    password.classList.add("error");
    return false;
  }
  return true;
}

function validatePrivacyBox() {
  if (!checkBox.checked) {
    checkboxError.textContent =
      "Bitte akzeptiere die Datenschutzerklärung, um fortzufahren.";
    return false;
  }
  return true;
}

function validateForm() {
  clearErrors();
  let isValid = true;

  const nameVal = nameInput.value.trim();
  const emailVal = emailInput.value.trim();
  const pwdVal = password.value;
  const pwd2Val = password2.value;

  if (!validateName(nameVal)) isValid = false;
  if (!validateEmailValue(emailVal)) isValid = false;
  if (!validatePasswordValue(pwdVal)) isValid = false;
  if (!validatePasswordConfirmation(pwdVal, pwd2Val)) isValid = false;
  if (!validatePrivacyBox()) isValid = false;

  return isValid;
}

function getSignupFormValues() {
  return {
    displayName: nameInput.value.trim(),
    email: emailInput.value.trim(),
    pwd: password.value,
  };
}


function showSignupRunningToast() {
  if (typeof showToast === "function") {
    showToast("Registrierung läuft");
  }
}

function showSignupSuccessToast() {
  if (typeof showToast === "function") {
    showToast("Registrierung erfolgreich.");
  }
}

async function registerUser(email, pwd) {
  return createUserWithEmailAndPassword(auth, email, pwd);
}

async function saveUserProfile(user, displayName, email) {
  await updateProfile(user, { displayName });
  await set(ref(db, `users/${user.uid}`), {
    uid: user.uid,
    email,
    displayName,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    provider: "password",
    isAnonymous: false,
  });
}

function redirectToLoginDelayed() {
  setTimeout(() => {
    window.location.href = "/login.html";
  }, 1500);
}

function applySignupErrorToForm(err) {
  switch (err.code) {
    case "auth/email-already-in-use":
      emailError.textContent =
        "Diese Email wird bereits von einem anderen Konto verwendet.";
      emailInput.classList.add("error");
      break;
    case "auth/invalid-email":
      emailError.textContent = "Bitte gib eine gültige Email-Adresse ein.";
      emailInput.classList.add("error");
      break;
    case "auth/weak-password":
      passwordError.textContent =
        "Das Passwort ist zu schwach. Bitte verwende ein stärkeres Passwort.";
      password.classList.add("error");
      break;
    default:
      checkboxError.textContent =
        "Registrierung fehlgeschlagen. Bitte versuche es erneut.";
      break;
  }
}

function showSignupErrorToast(err) {
  if (typeof showToast === "function") {
    showToast(err.message || "Registrierung fehlgeschlagen.", true);
  }
}

async function handleSignup() {
  if (!validateForm()) {
    showValidationToast();
    return;
  }

  const { displayName, email, pwd } = getSignupFormValues();
  showSignupRunningToast();

  try {
    const cred = await registerUser(email, pwd);
    await saveUserProfile(cred.user, displayName, email);
    showSignupSuccessToast();
    redirectToLoginDelayed();
  } catch (err) {
    console.error(err);
    applySignupErrorToForm(err);
    showSignupErrorToast(err);
  }
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  await handleSignup();
});

signupbutton?.addEventListener("click", async (e) => {
  e.preventDefault();
  await handleSignup();
});

onAuthStateChanged(auth, async (user) => {
  if (!user?.isAnonymous) return;
  try {
    await dbUpdate(ref(db, `guests/${user.uid}`), {
      lastLoginAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("Konnte Gast-Datensatz nicht aktualisieren:", e);
  }
});
