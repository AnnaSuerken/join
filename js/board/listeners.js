import { dbApi } from "../core/firebase.js";
import { renderBoard } from "./render.js";
import { CONTACTS_ROOT, TASKS_ROOT, initGlobals, setContactsMaps, setData } from "./state.js";

/**
 * Initializes all Firebase listeners for tasks and contacts.
 */
export function initListeners() {
  initGlobals();
  bindTasks();
  bindContacts();
}

/**
 * Subscribes to task updates and updates board state.
 */
function bindTasks() {
  dbApi.onData(TASKS_ROOT, (val) => {
    setData(normalizeBoard(val));
    renderBoard();
  });
}

/**
 * Subscribes to contact updates and rebuilds contact lookup maps.
 */
function bindContacts() {
  dbApi.onData(CONTACTS_ROOT, (val) => {
    const maps = buildContactMaps(val);
    setContactsMaps(maps.byId, maps.byName, maps.byEmail);
    renderBoard();
  });
}

/**
 * Normalizes board data to ensure all columns exist.
 *
 * @param {object|null} val
 * Raw board data from Firebase.
 */
function normalizeBoard(val) {
  return {
    todo: val?.todo || {},
    inprogress: val?.inprogress || {},
    await: val?.await || {},
    done: val?.done || {},
  };
}

/**
 * Builds lookup maps for contacts.
 *
 * @param {object|null} val
 * Raw contacts data from Firebase.
 */
function buildContactMaps(val) {
  const byId = new Map();
  const byName = new Map();
  const byEmail = new Map();

  if (val && typeof val === "object") {
    Object.entries(val).forEach(([id, c]) => addContact(id, c, byId, byName, byEmail));
  }
  return { byId, byName, byEmail };
}

/**
 * Normalizes and registers a single contact in lookup maps.
 *
 * @param {string} id
 * Contact id.
 * @param {object} c
 * Raw contact data.
 * @param {Map} byId
 * Map of contacts by id.
 * @param {Map} byName
 * Map of contact ids by lowercase name.
 * @param {Map} byEmail
 * Map of contact ids by lowercase email.
 */
function addContact(id, c, byId, byName, byEmail) {
  const contact = {
    id,
    name: c?.name ?? "",
    initials: c?.initials ?? "?",
    color: c?.color ?? "#999",
    email: c?.email ?? "",
    phone: c?.phone ?? "",
  };

  byId.set(id, contact);
  if (contact.name) byName.set(contact.name.toLowerCase(), id);
  if (contact.email) byEmail.set(contact.email.toLowerCase(), id);
}
