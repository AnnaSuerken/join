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

/* LocalStore ohne IIFE */

const LOCAL_STORE_KEY = "contactsStoreV1";

function loadLocalMem() {
  try {
    const raw = localStorage.getItem(LOCAL_STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn("Local store load failed", e);
    return {};
  }
}

function saveLocalMem(obj) {
  try {
    localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(obj || {}));
  } catch (e) {
    console.warn("Local store save failed", e);
  }
}

let localMem = loadLocalMem();
const localListeners = new Set();

function emitLocalMem() {
  for (const cb of localListeners) {
    cb(localMem);
  }
}

const localStore = {
  async pushData(path, payload) {
    const id = payload.id || genId();
    localMem[id] = { ...payload, id };
    saveLocalMem(localMem);
    emitLocalMem();
    return id;
  },

  async updateData(path, patch) {
    const id = path.split("/").pop();
    if (!localMem[id]) {
      localMem[id] = { id };
    }
    localMem[id] = { ...localMem[id], ...patch };
    saveLocalMem(localMem);
    emitLocalMem();
  },

  async deleteData(path) {
    const id = path.split("/").pop();
    delete localMem[id];
    saveLocalMem(localMem);
    emitLocalMem();
  },

  onData(path, cb) {
    localListeners.add(cb);
    cb(localMem);
    return () => localListeners.delete(cb);
  },

  seedIfEmpty(seedArr) {
    if (Object.keys(localMem).length) {
      return;
    }
    for (const c of seedArr) {
      const id = c.id || genId();
      localMem[id] = { ...c, id };
    }
    saveLocalMem(localMem);
  },
};

const store =
  typeof window !== "undefined" && window.dbApi
    ? {
        pushData: (p, v) => window.dbApi.pushData(p, v),
        updateData: (p, v) => window.dbApi.updateData(p, v),
        deleteData: (p) => window.dbApi.deleteData(p),
        onData: (p, cb) => window.dbApi.onData(p, cb),
        seedIfEmpty: () => {},
      }
    : localStore;

function normalizeContact(id, raw) {
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

function contactsArrayFromState() {
  const entries = Object.entries(state.data || {});
  return entries.map(([id, raw]) => normalizeContact(id, raw));
}

function sortContactsInPlace(arr) {
  arr.sort((a, b) => {
    return a.name.localeCompare(b.name, "de", { sensitivity: "base" });
  });
}

function showStoreError(msg, e) {
  console.error(e);
  if (typeof showToast === "function") {
    showToast(msg);
  }
}

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
    console.error(e);
  }
}

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

async function deleteContactById(id) {
  try {
    await store.deleteData(`contacts/${id}`);
  } catch (e) {
    showStoreError("Delete failed", e);
  }
}
