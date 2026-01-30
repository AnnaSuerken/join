/**
 * Generates a unique identifier based on timestamp and randomness.
 *
 * @returns {string}
 * Generated unique ID.
 */
function genId() {
  return Date.now().toString(16) + Math.random().toString(16).slice(2);
}

const colorPool = [
  "#FF7A00",
  "#29ABE2",
  "#6E52FF",
  "#1FD7C1",
  "#FC71FF",
  "#FFBB2B",
];

const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => [...r.querySelectorAll(s)];
const byId = (id) => document.getElementById(id);

const initialsFromName = (n) => {
  const p = String(n || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!p.length) return "";
  if (p.length === 1) {
    return p[0].substring(0, 2).toUpperCase();
  }
  return (p[0][0] + p[1][0]).toUpperCase();
};

const telHref = (s) => `tel:${(s || "").replace(/\s+/g, "")}`;

const getLetter = (n) => (n?.[0] || "#").toUpperCase();

const hashStr = (s = "") => {
  return Array.from(s).reduce((acc, ch) => {
    return (acc * 33 + ch.charCodeAt(0)) >>> 0;
  }, 5381);
};

const state = {
  data: {},
  selectedId: null,
  unsubscribe: null,
};

/**
 * Ensures that the global dbApi is available.
 */
function assertDbApi() {
  if (!window.dbApi) {
    console.error(
      "[contacts] window.dbApi ist nicht definiert. Stelle sicher, dass dein DB-Skript VOR contacts-core.js geladen wird."
    );
    throw new Error("dbApi not available");
  }
}

const store = {
  async pushData(path, payload) {
    assertDbApi();
    return window.dbApi.pushData(path, payload);
  },

  async updateData(path, patch) {
    assertDbApi();
    return window.dbApi.updateData(path, patch);
  },

  async deleteData(path) {
    assertDbApi();
    return window.dbApi.deleteData(path);
  },

  onData(path, cb) {
    assertDbApi();
    return window.dbApi.onData(path, cb);
  },

  seedIfEmpty() {
    
  },
};

/**
 * Normalizes raw contact data into a consistent structure.
 *
 * @param {string} id
 * Contact ID.
 *
 * @param {Object} raw
 * Raw contact data.
 */
function normalizeContact(id, raw) {
  if (!raw) return null;
  const name = raw?.name ?? "";
  const email = raw?.email ?? "";
  const phone = raw?.phone ?? "";
  const initials = raw?.initials || initialsFromName(name);
  const baseColor = raw?.color || colorPool[hashStr(id) % colorPool.length];

  return {
    id,
    name,
    email,
    phone,
    initials,
    color: baseColor,
  };
}

/**
 * Converts the internal state object into a contacts array.
 *
 * @returns {Object[]}
 * Array of normalized contacts.
 */
function contactsArrayFromState() {
  const entries = Object.entries(state.data || {});
  return entries.map(([id, raw]) => normalizeContact(id, raw)).filter(Boolean);
}

/**
 * Sorts contacts array alphabetically by name.
 *
 * @param {Object[]} arr
 * Contacts array.
 */
function sortContactsInPlace(arr) {
  arr.sort((a, b) => {
    return a.name.localeCompare(b.name, "de", { sensitivity: "base" });
  });
}

/**
 * Displays and logs a store-related error.
 *
 * @param {string} msg
 * Error message.
 *
 * @param {Error} e
 * Error object.
 */
function showStoreError(msg, e) {
  console.error(e);
  if (typeof showToast === "function") {
    showToast(msg);
  }
}

/**
 * Creates a new contact entry.
 *
 * @param {string} name
 * Contact name.
 *
 * @param {string} email
 * Contact email.
 *
 * @param {string} phone
 * Contact phone number.
 *
 * @param {string} color
 * Contact color.
 */
async function createContact(name, email, phone, color) {
  const payload = {
    name,
    email,
    phone,
    initials: initialsFromName(name),
    color,
  };
  try {
    const key = await store.pushData("contacts", payload);
    state.selectedId = key;
  } catch (e) {
    showStoreError("Create failed", e);
  }
}

/**
 * Saves changes to the currently selected contact.
 *
 * @param {string} name
 * Updated name.
 *
 * @param {string} email
 * Updated email.
 *
 * @param {string} phone
 * Updated phone number.
 */
async function saveEdit(name, email, phone) {
  const id = state.selectedId;
  if (!id) return;

  const patch = {
    name,
    email,
    phone,
    initials: initialsFromName(name),
    color: state.data[id]?.color,
  };

  try {
    await store.updateData(`contacts/${id}`, patch);
  } catch (e) {
    showStoreError("Update failed", e);
  }
}

/**
 * Deletes a contact by its ID.
 *
 * @param {string} id
 * Contact ID.
 */
async function deleteContactById(id) {
  try {
    await store.deleteData(`contacts/${id}`);
  } catch (e) {
    showStoreError("Delete failed", e);
  }
}
