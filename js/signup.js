import { auth, db } from "./firebase.js";
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
const statusBox = document.getElementById("status");
const password = document.getElementById("password");
const password2 = document.getElementById("password2");
const checkBox = document.getElementById("checkbox");

function setStatus(msg, isError = false) {
  statusBox.style.display = "flex";
  statusBox.textContent = msg;
  statusBox.style.color = isError ? "crimson" : "inherit";
}

function checkForm() {
  if ((password.value === password2.value) & checkBox.checked) {
    return true;
  } else {
    setStatus(
      "Passwörter stimmen nicht überein oder AGB nicht akzeptiert",
      true
    );
    return false;
  }
}

signupbutton?.addEventListener("click", async (e) => {
  e.preventDefault();
  if (!checkForm()) return;
  const displayName = document.getElementById("displayName").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  setStatus("Registrierung läuft");
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    await set(ref(db, `users/${cred.user.uid}`), {
      uid: cred.user.uid,
      email,
      displayName,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      provider: "password",
      isAnonymous: false,
    });
    setStatus("Registrierung erfolgreich.");
    setTimeout(() => {
      window.location.href = "/login.html";
    }, 1500);
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Registrierung fehlgeschlagen.", true);
  }
});

onAuthStateChanged(auth, async (user) => {
  if (user?.isAnonymous) {
    try {
      await dbUpdate(ref(db, `guests/${user.uid}`), {
        lastLoginAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn("Konnte Gast-Datensatz nicht aktualisieren:", e);
    }
  }
});
