/**
 * board/listeners.js
 * Firebase Listener -> State updaten -> rendern.
 */

import { dbApi } from "../core/firebase.js";
import { renderBoard } from "./render.js";
import { CONTACTS_ROOT, TASKS_ROOT, initGlobals, setContactsMaps, setData } from "./state.js";

export function initListeners() {
  initGlobals();
  bindTasks();
  bindContacts();
}

function bindTasks() {
  dbApi.onData(TASKS_ROOT, (val) => {
    setData(normalizeBoard(val));
    renderBoard();
  });
}

function bindContacts() {
  dbApi.onData(CONTACTS_ROOT, (val) => {
    const maps = buildContactMaps(val);
    setContactsMaps(maps.byId, maps.byName, maps.byEmail);
    renderBoard();
  });
}

function normalizeBoard(val) {
  return {
    todo: val?.todo || {},
    inprogress: val?.inprogress || {},
    await: val?.await || {},
    done: val?.done || {},
  };
}

function buildContactMaps(val) {
  const byId = new Map();
  const byName = new Map();
  const byEmail = new Map();

  if (val && typeof val === "object") {
    Object.entries(val).forEach(([id, c]) => addContact(id, c, byId, byName, byEmail));
  }
  return { byId, byName, byEmail };
}

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
