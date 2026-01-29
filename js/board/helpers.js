/**
 * board/helpers.js
 * Allgemeine Helfer + Kontakte/Assign.
 */

/* ---------- General ---------- */

export function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => mapEsc(m));
}

function mapEsc(m) {
  return (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m] || m
  );
}

export function normalizeSubtasks(task) {
  if (Array.isArray(task?.subtasks)) return normalizeNew(task.subtasks);
  if (Array.isArray(task?.subtask)) return normalizeOld(task.subtask);
  return [];
}

function normalizeNew(list) {
  return list.map((s) => ({ text: s.text || s, done: !!s.done }));
}

function normalizeOld(list) {
  return list.map((t) => ({ text: t, done: false }));
}

export function capitalize(s = "") {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDate(s) {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d)) return "-";
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function toISODateOnly(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/* ---------- Assignments ---------- */

export function normalizeAssigneesToIds(val) {
  const maps = getContactMaps();
  const out = [];

  if (!val) return out;
  if (Array.isArray(val)) return parseArray(val, maps, out);
  if (typeof val === "string") return parseString(val, maps, out);

  return out;
}

function getContactMaps() {
  const maps = window.boardContacts || {};
  return {
    contactsById: maps.contactsById || new Map(),
    byName: maps.contactIdByName || new Map(),
    byEmail: maps.contactIdByEmail || new Map(),
  };
}

function parseArray(arr, maps, out) {
  arr.forEach((x) => parseToken(x, maps, out));
  return out;
}

function parseString(s, maps, out) {
  s.split(",").map((x) => x.trim()).filter(Boolean).forEach((t) => parseToken(t, maps, out));
  return out;
}

function parseToken(x, maps, out) {
  if (typeof x === "string") return parseStringToken(x, maps, out);
  if (x && typeof x === "object") return parseObjectToken(x, maps, out);
}

function parseStringToken(s, maps, out) {
  const token = s.trim();
  if (!token) return;
  if (tryById(token, maps, out)) return;
  if (token.includes("@")) return tryByEmail(token, maps, out);
  tryByName(token, maps, out);
}

function parseObjectToken(o, maps, out) {
  const id = (o.id || o.contactId || "").toString().trim();
  if (tryById(id, maps, out)) return;

  const email = (o.email || "").toLowerCase();
  if (email) return tryByEmail(email, maps, out);

  const name = (o.name || "").toLowerCase();
  if (name) tryByName(name, maps, out);
}

function tryById(id, maps, out) {
  if (!id || !maps.contactsById.has(id)) return false;
  out.push(id);
  return true;
}

function tryByEmail(email, maps, out) {
  const id = maps.byEmail.get(email.toLowerCase());
  if (id && maps.contactsById.has(id)) out.push(id);
}

function tryByName(name, maps, out) {
  const id = maps.byName.get(name.toLowerCase());
  if (id && maps.contactsById.has(id)) out.push(id);
}

export function populateAssignedChips(ids, containerEl) {
  if (!containerEl) return;
  const contacts = ids.map(getContactById).filter(Boolean);
  if (!contacts.length) return (containerEl.innerHTML = "");

  const { shown, more } = splitMax(contacts, 4);
  containerEl.innerHTML = shown.map(chipTpl).join("") + moreTpl(more);
}

function getContactById(id) {
  const maps = window.boardContacts || {};
  const byId = maps.contactsById || new Map();
  return byId.get(id);
}

function splitMax(list, max) {
  const shown = list.slice(0, max);
  const more = list.length - shown.length;
  return { shown, more };
}

function chipTpl(c) {
  return `
    <span class="avatar-chip" style="background:${escapeHtml(c.color)}" title="${escapeHtml(c.name)}">
      ${escapeHtml(c.initials)}
    </span>`;
}

function moreTpl(more) {
  return more > 0 ? `<span class="avatar-chip more-chip">+${more}</span>` : "";
}
