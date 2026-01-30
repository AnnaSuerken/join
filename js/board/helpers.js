/**
 * Safely parses a JSON string.
 *
 * @param {string} s
 * JSON string.
 */
export function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/**
 * Escapes HTML special characters to prevent XSS.
 *
 * @param {string} str
 * Input string.
 */
export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => mapEsc(m));
}


/**
 * Maps a single character to its HTML escape.
 *
 * @param {string} m
 * Character.
 */
function mapEsc(m) {
  return (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m] || m
  );
}

/**
 * Normalizes subtasks from new or legacy formats.
 *
 * @param {object} task
 * Task object.
 */
export function normalizeSubtasks(task) {
  if (Array.isArray(task?.subtasks)) return normalizeNew(task.subtasks);
  if (Array.isArray(task?.subtask)) return normalizeOld(task.subtask);
  return [];
}

/**
 * Normalizes new subtask format.
 *
 * @param {Array} list
 */
function normalizeNew(list) {
  return list.map((s) => ({ text: s.text || s, done: !!s.done }));
}

/**
 * Normalizes legacy subtask format.
 *
 * @param {Array} list
 */
function normalizeOld(list) {
  return list.map((t) => ({ text: t, done: false }));
}

/**
 * Capitalizes the first letter of a string.
 *
 * @param {string} [s=""]
 * Input string.
 */
export function capitalize(s = "") {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Formats a date string to DD.MM.YYYY.
 *
 * @param {string|Date} s
 * Date value.
 */
export function formatDate(s) {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d)) return "-";
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/**
 * Pads a number to two digits.
 *
 * @param {number} n
 */
function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * Converts a Date to an ISO date string without time.
 *
 * @param {Date} d
 */
export function toISODateOnly(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/**
 * Normalizes assigned contacts into an array of contact IDs.
 *
 * @param {string|Array|object|null} val
 * Assignment input.
 */
export function normalizeAssigneesToIds(val) {
  const maps = getContactMaps();
  const out = [];

  if (!val) return out;
  if (Array.isArray(val)) return parseArray(val, maps, out);
  if (typeof val === "string") return parseString(val, maps, out);

  return out;
}

/**
 * Retrieves contact lookup maps from global board state.
 */
function getContactMaps() {
  const maps = window.boardContacts || {};
  return {
    contactsById: maps.contactsById || new Map(),
    byName: maps.contactIdByName || new Map(),
    byEmail: maps.contactIdByEmail || new Map(),
  };
}

/**
 * Parses an array of assignment tokens.
 */
function parseArray(arr, maps, out) {
  arr.forEach((x) => parseToken(x, maps, out));
  return out;
}

/**
 * Parses a comma-separated assignment string.
 */
function parseString(s, maps, out) {
  s.split(",").map((x) => x.trim()).filter(Boolean).forEach((t) => parseToken(t, maps, out));
  return out;
}

/**
 * Parses a single assignment token.
 */
function parseToken(x, maps, out) {
  if (typeof x === "string") return parseStringToken(x, maps, out);
  if (x && typeof x === "object") return parseObjectToken(x, maps, out);
}

/**
 * Resolves assignment from a string token.
 */
function parseStringToken(s, maps, out) {
  const token = s.trim();
  if (!token) return;
  if (tryById(token, maps, out)) return;
  if (token.includes("@")) return tryByEmail(token, maps, out);
  tryByName(token, maps, out);
}

/**
 * Resolves assignment from an object token.
 */
function parseObjectToken(o, maps, out) {
  const id = (o.id || o.contactId || "").toString().trim();
  if (tryById(id, maps, out)) return;

  const email = (o.email || "").toLowerCase();
  if (email) return tryByEmail(email, maps, out);

  const name = (o.name || "").toLowerCase();
  if (name) tryByName(name, maps, out);
}

/**
 * Attempts to resolve contact by id.
 */
function tryById(id, maps, out) {
  if (!id || !maps.contactsById.has(id)) return false;
  out.push(id);
  return true;
}

/**
 * Attempts to resolve contact by email.
 */
function tryByEmail(email, maps, out) {
  const id = maps.byEmail.get(email.toLowerCase());
  if (id && maps.contactsById.has(id)) out.push(id);
}


/**
 * Attempts to resolve contact by name.
 */
function tryByName(name, maps, out) {
  const id = maps.byName.get(name.toLowerCase());
  if (id && maps.contactsById.has(id)) out.push(id);
}

/**
 * Renders assigned contact avatar chips into a container.
 *
 * @param {string[]} ids
 * Contact ids.
 * @param {HTMLElement} containerEl
 * Target container.
 */
export function populateAssignedChips(ids, containerEl) {
  if (!containerEl) return;
  const contacts = ids.map(getContactById).filter(Boolean);
  if (!contacts.length) return (containerEl.innerHTML = "");

  const { shown, more } = splitMax(contacts, 4);
  containerEl.innerHTML = shown.map(chipTpl).join("") + moreTpl(more);
}

/**
 * Returns a contact by id from global board state.
 */
function getContactById(id) {
  const maps = window.boardContacts || {};
  const byId = maps.contactsById || new Map();
  return byId.get(id);
}

/**
 * Splits a list into visible items and overflow count.
 */
function splitMax(list, max) {
  const shown = list.slice(0, max);
  const more = list.length - shown.length;
  return { shown, more };
}

/**
 * Generates HTML for a single avatar chip.
 */
function chipTpl(c) {
  return `
    <span class="avatar-chip" style="background:${escapeHtml(c.color)}" title="${escapeHtml(c.name)}">
      ${escapeHtml(c.initials)}
    </span>`;
}

/**
 * Generates HTML for overflow indicator.
 */
function moreTpl(more) {
  return more > 0 ? `<span class="avatar-chip more-chip">+${more}</span>` : "";
}
