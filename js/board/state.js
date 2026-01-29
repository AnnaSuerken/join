/**
 * board/state.js
 * Zentraler State + globals für andere Module (detail/edit/helpers).
 */

export const TASKS_ROOT = "/board";
export const CONTACTS_ROOT = "/contacts";
export const COLS = ["todo", "inprogress", "await", "done"];

let data = { todo: {}, inprogress: {}, await: {}, done: {} };

let contactsById = new Map();
let contactIdByName = new Map();
let contactIdByEmail = new Map();

export function getData() {
  return data;
}

export function setData(next) {
  data = next;
  window.boardData = data;
}

export function setContactsMaps(nextById, nextByName, nextByEmail) {
  contactsById = nextById;
  contactIdByName = nextByName;
  contactIdByEmail = nextByEmail;
  window.boardContacts = { contactsById, contactIdByName, contactIdByEmail };
}

export function getContactsMaps() {
  return { contactsById, contactIdByName, contactIdByEmail };
}

/** init globals once */
export function initGlobals() {
  window.currentTaskColumn = window.currentTaskColumn || "todo";
  window.boardData = window.boardData || data;
  window.boardContacts = window.boardContacts || getContactsMaps();
}
