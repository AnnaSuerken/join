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

function setStatus(msg, isError = false) {
  statusBox.style.display = "flex";
  statusBox.textContent = msg;
  statusBox.style.color = isError ? "crimson" : "inherit";
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const displayName = e.target.displayName.value.trim();
  const email = e.target.email.value.trim();
  const password = e.target.password.value;

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
