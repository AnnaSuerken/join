// js/helpers.js

/* ---------- generelle Helfer ---------- */
export function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[m])
  );
}

export function normalizeSubtasks(task) {
  if (Array.isArray(task?.subtasks)) {
    return task.subtasks.map((s) => ({
      text: s.text || s,
      done: !!s.done,
    }));
  }
  if (Array.isArray(task?.subtask)) {
    return task.subtask.map((t) => ({ text: t, done: false }));
  }
  return [];
}

export function capitalize(s = "") {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDate(s) {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d)) return "-";
  return `${String(d.getDate()).padStart(2, "0")}.${String(
    d.getMonth() + 1
  ).padStart(2, "0")}.${d.getFullYear()}`;
}

export function toISODateOnly(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

/* ---------- Kontakte / Assignments ---------- */
/** nutzt window.boardContacts (wird in board.js gesetzt) */
export function normalizeAssigneesToIds(val) {
  const maps = window.boardContacts || {};
  const contactsById = maps.contactsById || new Map();
  const contactIdByName = maps.contactIdByName || new Map();
  const contactIdByEmail = maps.contactIdByEmail || new Map();

  if (!val) return [];
  const out = [];
  const pushIf = (id) => {
    if (id && contactsById.has(id)) out.push(id);
  };

  if (Array.isArray(val)) {
    for (const x of val) {
      if (typeof x === "string") {
        const s = x.trim();
        if (contactsById.has(s)) {
          pushIf(s);
          continue;
        }
        if (s.includes("@")) {
          pushIf(contactIdByEmail.get(s.toLowerCase()));
          continue;
        }
        pushIf(contactIdByName.get(s.toLowerCase()));
      } else if (x && typeof x === "object") {
        const byId = (x.id || x.contactId || "").toString().trim();
        if (contactsById.has(byId)) {
          pushIf(byId);
          continue;
        }
        const byEmail = (x.email || "").toLowerCase();
        if (byEmail) {
          pushIf(contactIdByEmail.get(byEmail));
          continue;
        }
        const byName = (x.name || "").toLowerCase();
        if (byName) {
          pushIf(contactIdByName.get(byName));
        }
      }
    }
  } else if (typeof val === "string") {
    for (const token of val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)) {
      if (contactsById.has(token)) {
        pushIf(token);
        continue;
      }
      if (token.includes("@")) {
        pushIf(contactIdByEmail.get(token.toLowerCase()));
        continue;
      }
      pushIf(contactIdByName.get(token.toLowerCase()));
    }
  }
  return out;
}

export function populateAssignedChips(ids, containerEl) {
  if (!containerEl) return;
  const maps = window.boardContacts || {};
  const contactsById = maps.contactsById || new Map();

  containerEl.innerHTML = "";
  const contacts = ids.map((id) => contactsById.get(id)).filter(Boolean);
  if (!contacts.length) return;

  const max = 4;
  const shown = contacts.slice(0, max);
  const more = contacts.length - shown.length;

  const chips = shown
    .map(
      (c) => `
      <span class="avatar-chip" style="background:${escapeHtml(
        c.color
      )}" title="${escapeHtml(c.name)}">
        ${escapeHtml(c.initials)}
      </span>`
    )
    .join("");

  containerEl.innerHTML =
    chips +
    (more > 0 ? `<span class="avatar-chip more-chip">+${more}</span>` : "");
}
