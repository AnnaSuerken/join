// js/core/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  push,
  get,
  child,
  onValue,
  off,
  update,
  remove,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCLJlzAaU0yw1uT3SgPseFDz0TzGmi8TIY",
  authDomain: "join-1338.firebaseapp.com",
  databaseURL:
    "https://join-1338-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "join-1338",
  storageBucket: "join-1338.firebasestorage.app",
  messagingSenderId: "227907404609",
  appId: "1:227907404609:web:1ac57eac5a62bbab4c17c0",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

export const dbApi = {
  async setData(path, data) {
    await set(ref(db, path), data);
  },

  async pushData(path, data) {
    const r = push(ref(db, path));
    await set(r, data);
    return r.key;
  },

  async getData(path) {
    const snap = await get(child(ref(db), path));
    return snap.exists() ? snap.val() : null;
  },

  onData(path, callback) {
    const r = ref(db, path);
    const handler = (snap) => callback(snap.exists() ? snap.val() : null);
    onValue(r, handler);
    return () => off(r, "value", handler);
  },

  async updateData(path, partial) {
    await update(ref(db, path), partial);
  },

  async deleteData(path) {
    await remove(ref(db, path));
  },
};

// global verfügbar lassen, damit alte Skripte weiterlaufen
window.dbApi = dbApi;
window.auth = auth;
