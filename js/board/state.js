export const TASKS_ROOT = "/board";
export const CONTACTS_ROOT = "/contacts";
export const COLS = ["todo", "inprogress", "await", "done"];

let data = { todo: {}, inprogress: {}, await: {}, done: {} };

let contactsById = new Map();
let contactIdByName = new Map();
let contactIdByEmail = new Map();

/**
 * Returns the current board data object.
 *
 * @returns {Object}
 * Board task data grouped by column.
 */
export function getData() {
  return data;
}

/**
 * Sets and synchronizes board data.
 *
 * @param {Object} next
 * New board data object.
 */
export function setData(next) {
  data = next;
  window.boardData = data;
}

/**
 * Updates all contact lookup maps.
 *
 * @param {Map<string,Object>} nextById
 * Map of contactId → contact object.
 * @param {Map<string,string>} nextByName
 * Map of lowercase contact name → contactId.
 * @param {Map<string,string>} nextByEmail
 * Map of lowercase email → contactId.
 */
export function setContactsMaps(nextById, nextByName, nextByEmail) {
  contactsById = nextById;
  contactIdByName = nextByName;
  contactIdByEmail = nextByEmail;
  window.boardContacts = { contactsById, contactIdByName, contactIdByEmail };
}

/**
 * Returns all contact lookup maps.
 */
export function getContactsMaps() {
  return { contactsById, contactIdByName, contactIdByEmail };
}

/** *
 * init globals once 
 * */
export function initGlobals() {
  window.currentTaskColumn = window.currentTaskColumn || "todo";
  window.boardData = window.boardData || data;
  window.boardContacts = window.boardContacts || getContactsMaps();
}
