import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCLJlzAaU0yw1uT3SgPseFDz0TzGmi8TIY",
  authDomain: "join-1338.firebaseapp.com",
  databaseURL:"https://join-1338-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "join-1338",
  storageBucket: "join-1338.firebasestorage.app",
  messagingSenderId: "227907404609",
  appId: "1:227907404609:web:1ac57eac5a62bbab4c17c0",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);



export const dbApi = {
  /**
   * 
   * @param {string} path
   * @param {any} data
   * @returns {Promise<void>}
   */
  async setData(path, data) {
    await set(ref(db, path), data);
  },

  /**
   * 
   * @param {string} path 
   * @param {any} data
   * @returns {Promise<string>} 
   */
  async pushData(path, data) {
    const r = push(ref(db, path));
    await set(r, data);
    return r.key;
  },

  /**
   * 
   * @param {string} path
   * @returns {Promise<any>} 
   */
  async getData(path) {
    const snap = await get(child(ref(db), path));
    return snap.exists() ? snap.val() : null;
  },

  /**
   * 
   * @param {string} path
   * @param {(value:any)=>void} callback
   * @returns {() => void} unsubscribe
   */
  onData(path, callback) {
    const r = ref(db, path);
    const handler = (snap) => callback(snap.exists() ? snap.val() : null);
    onValue(r, handler);
    return () => off(r, "value", handler);
  },

  /**
   * 
   * @param {string} path
   * @param {Record<string, any>} partial
   * @returns {Promise<void>}
   */
  async updateData(path, partial) {
    await update(ref(db, path), partial);
  },

  /**
   * 
   * @param {string} path
   * @returns {Promise<void>}
   */
  async deleteData(path) {
    await remove(ref(db, path));
  },
};
// 
