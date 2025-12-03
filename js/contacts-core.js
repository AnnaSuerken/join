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

const localStore = (() => {
  const KEY = "contactsStoreV1";

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn("Local store load failed", e);
      return {};
    }
  }

  function save(obj) {
    try {
      localStorage.setItem(KEY, JSON.stringify(obj || {}));
    } catch (e) {
      console.warn("Local store save failed", e);
    }
  }

  let mem = load();
  const listeners = new Set();

  function emit() {
    for (const cb of listeners) {
      cb(mem);
    }
  }

  async function pushData(path, payload) {
    const id = payload.id || genId();
    mem[id] = { ...payload, id };
    save(mem);
    emit();
    return id;
  }

  async function updateData(path, patch) {
    const id = path.split("/").pop();
    if (!mem[id]) {
      mem[id] = { id };
    }
    mem[id] = { ...mem[id], ...patch };
    save(mem);
    emit();
  }

  async function deleteData(path) {
    const id = path.split("/").pop();
    delete mem[id];
    save(mem);
    emit();
  }

  function onData(path, cb) {
    listeners.add(cb);
    cb(mem);
    return () => listeners.delete(cb);
  }

  function seedIfEmpty(seedArr) {
    if (Object.keys(mem).length) {
      return;
    }
    for (const c of seedArr) {
      const id = c.id || genId();
      mem[id] = { ...c, id };
    }
    save(mem);
  }

  return {
    pushData,
    updateData,
    deleteData,
    onData,
    seedIfEmpty,
  };
})();

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
    console.error(e);
    if (typeof showToast === "function") {
      showToast("Update failed");
    }
  }
}

async function deleteContactById(id) {
  try {
    await store.deleteData(`contacts/${id}`);
  } catch (e) {
    console.error(e);
    if (typeof showToast === "function") {
      showToast("Delete failed");
    }
  }
}
