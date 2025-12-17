/* contacts-ui-main.js */

/* Modal / Overlay */

let modalMode = "create";

/* ====== NON-BLOCKING TOAST (ohne OK / ohne alert) ====== */

function showInlineToast(message, isError = false, duration = 2500) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;

  // optional: CSS z.B. .toast.error
  toast.classList.toggle("error", !!isError);

  toast.classList.remove("d_none");

  clearTimeout(showInlineToast._t);
  showInlineToast._t = setTimeout(() => {
    toast.classList.add("d_none");
    toast.classList.remove("error");
    toast.textContent = "";
  }, duration);
}

/**
 * Einheitliche Meldungs-Funktion:
 * - nutzt showToast, wenn vorhanden (dein bestehendes System)
 * - fallback auf showInlineToast, falls showToast fehlt/Probleme macht
 */
function notify(message, isError = false) {
  try {
    if (typeof showToast === "function") {
      // wichtig: KEIN alert hier – wir rufen nur deine showToast-Funktion auf
      showToast(message, isError);
      return;
    }
  } catch (e) {
    console.warn("[contacts] showToast failed, fallback to inline toast", e);
  }
  showInlineToast(message, isError);
}

/* ====== VALIDATION (wie login.js) ====== */

const nameError = () => byId("contact-name-error");
const emailError = () => byId("contact-email-error");
const phoneError = () => byId("contact-phone-error");

function clearContactErrors() {
  const nErr = nameError();
  const eErr = emailError();
  const pErr = phoneError();

  const nIn = byId("contact-name-input");
  const eIn = byId("contact-email-input");
  const pIn = byId("contact-phone-input");

  if (nErr) nErr.textContent = "";
  if (eErr) eErr.textContent = "";
  if (pErr) pErr.textContent = "";

  nIn?.classList.remove("error");
  eIn?.classList.remove("error");
  pIn?.classList.remove("error");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Sehr einfache Phone-Validierung:
 * - erlaubt: +, Zahlen, Leerzeichen, /, -, (), .
 * - mind. 6 Ziffern insgesamt
 */
function isValidPhone(phone) {
  const p = String(phone || "").trim();
  if (!p) return true; // optional
  if (!/^[0-9+\-()./\s]+$/.test(p)) return false;
  const digits = (p.match(/\d/g) || []).length;
  return digits >= 6;
}

function showNameError(msg) {
  const el = nameError();
  const input = byId("contact-name-input");
  if (el) el.textContent = msg;
  input?.classList.add("error");
}

function showEmailError(msg) {
  const el = emailError();
  const input = byId("contact-email-input");
  if (el) el.textContent = msg;
  input?.classList.add("error");
}

function showPhoneError(msg) {
  const el = phoneError();
  const input = byId("contact-phone-input");
  if (el) el.textContent = msg;
  input?.classList.add("error");
}

function validateContactForm({ name, email, phone }) {
  clearContactErrors();

  let ok = true;

  if (!name) {
    showNameError("Bitte gib einen Namen ein.");
    ok = false;
  }

  if (!email) {
    showEmailError("Bitte gib eine Email-Adresse ein.");
    ok = false;
  } else if (!isValidEmail(email)) {
    showEmailError("Bitte gib eine gültige Email-Adresse ein.");
    ok = false;
  }

  if (phone && !isValidPhone(phone)) {
    showPhoneError("Bitte gib eine gültige Telefonnummer ein.");
    ok = false;
  }

  return ok;
}

/* ====== Overlay / Modal ====== */

function openOverlayLegacy() {
  const overlay = byId("add-contact-overlay");
  if (!overlay) return;
  overlay.classList.remove("d_none");
  // Reflow, damit die CSS-Transition sicher triggert
  void overlay.offsetWidth;
  overlay.classList.add("modal-open");
}

function resetOverlayAvatar() {
  const avatar = byId("modal-avatar-preview");
  if (!avatar) return;
  avatar.style.backgroundColor = "#efefef";
  avatar.innerHTML =
    '<img src="./assets/icons/person.svg" alt="avatar placeholder" />';
}

function closeOverlayLegacy() {
  const overlay = byId("add-contact-overlay");
  if (!overlay) return;
  const modal = overlay.querySelector(".add-contact-modal");
  const hide = () => {
    overlay.classList.add("d_none");
    const form = byId("add-contact-form");
    if (form) form.reset();
    resetOverlayAvatar();
    clearContactErrors();
  };
  if (modal) modal.addEventListener("transitionend", hide, { once: true });
  else hide();
  overlay.classList.remove("modal-open");
}

function getModalElements() {
  return {
    nameInput: byId("contact-name-input"),
    emailInput: byId("contact-email-input"),
    phoneInput: byId("contact-phone-input"),
    titleEl: qs(".add-contact-headline"),
    primaryBtn: byId("create-contact-btn"),
    avatar: byId("modal-avatar-preview"),
  };
}

function updateModalAvatar(avatar, color, initials) {
  if (!avatar) return;
  if (!color || !initials) {
    avatar.style.backgroundColor = "#efefef";
    avatar.innerHTML =
      '<img src="./assets/icons/person.svg" alt="avatar placeholder" />';
    return;
  }
  avatar.style.backgroundColor = color;
  avatar.innerHTML = `
    <span style="color:#fff; font-size:24px; font-weight:500;">
      ${initials}
    </span>
  `;
}

function fillModalForEdit(contact, els) {
  clearContactErrors();
  els.nameInput.value = contact.name;
  els.emailInput.value = contact.email;
  els.phoneInput.value = contact.phone || "";
  if (els.titleEl) els.titleEl.textContent = "Edit contact";
  if (els.primaryBtn) els.primaryBtn.textContent = "Save ✓";
  updateModalAvatar(els.avatar, contact.color, contact.initials);
}

function resetModalForCreate(els) {
  clearContactErrors();
  els.nameInput.value = "";
  els.emailInput.value = "";
  els.phoneInput.value = "";
  if (els.titleEl) els.titleEl.textContent = "Add contact";
  if (els.primaryBtn) els.primaryBtn.textContent = "Create contact ✓";
  updateModalAvatar(els.avatar);
}

function openModal(mode = "create", cid = state.selectedId) {
  modalMode = mode;
  const els = getModalElements();
  if (!els.nameInput || !els.emailInput || !els.phoneInput) {
    openOverlayLegacy();
    return;
  }
  const canEdit = mode === "edit" && cid && state.data[cid];
  if (canEdit) {
    const c = normalizeContact(cid, state.data[cid]);
    fillModalForEdit(c, els);
  } else {
    resetModalForCreate(els);
  }
  openOverlayLegacy();
}

function getModalValues() {
  const nameEl = byId("contact-name-input");
  const emailEl = byId("contact-email-input");
  const phoneEl = byId("contact-phone-input");
  return {
    name: nameEl?.value.trim(),
    email: emailEl?.value.trim(),
    phone: phoneEl?.value.trim(),
  };
}

function handleCreateClick() {
  const values = getModalValues();

  // ✅ Validierung wie im Login (nur inline Fehler, kein Popup)
  if (!validateContactForm(values)) {
    notify("Bitte überprüfe deine Eingaben.", true);
    return;
  }

  const { name, email, phone } = values;
  const isEdit = modalMode === "edit" && state.selectedId;

  if (isEdit) {
    saveEdit(name, email, phone).then(() => {
      closeOverlayLegacy();
      notify("Contact updated successfully.");
    });
    return;
  }

  const color = colorPool[hashStr(name) % colorPool.length];
  createContact(name, email, phone, color).then(() => {
    const id = state.selectedId;
    closeOverlayLegacy();
    if (id) {
      renderDetailForId(id);
      setActiveRow(id);
      showDetailFullscreenIfMobile();
      if (typeof updateFabForContact === "function") updateFabForContact(id);
    }
    notify("Contact created successfully.");
  });
}

async function onDelete() {
  const id = state.selectedId;
  if (!id) return;

  // ✅ Kein confirm/alert — direkt löschen
  await deleteContactById(id);

  state.selectedId = null;
  hideDetailFullscreen();
  if (typeof updateFabForContact === "function") updateFabForContact(null);

  notify("Contact deleted successfully.");
}

/* Auswahl / Fallback */

function renderDetailForId(id) {
  if (qs(".detail-card")) updateDetailModern(id);
  else renderContactDetailLegacy(id);
}

function restoreSelectedIfExists() {
  const id = state.selectedId;
  if (!id) return false;
  const modern = qs(`.row[data-id="${id}"]`);
  const legacy = qs(`.contact-row[data-id="${id}"]`);
  if (!modern && !legacy) return false;
  setActiveRow(id);
  renderDetailForId(id);
  return true;
}

function selectFirstAvailable() {
  const firstModern = qs(".row");
  const firstLegacy = qs(".contact-row");
  const first = firstModern || firstLegacy;
  if (first) {
    const cid = first.dataset.id;
    state.selectedId = cid;
    setActiveRow(cid);
    renderDetailForId(cid);
  } else {
    const detail = qs(".detail-card");
    if (detail) detail.innerHTML = "<p>No contact selected.</p>";
    else renderEmptyDetailLegacy();
  }
}

function afterRenderSelectFallback() {
  if (restoreSelectedIfExists()) return;
  selectFirstAvailable();
}

/* FAB / Mobile Menu */

function updateFabForContact(id) {
  const btn = byId("contact-menu-btn");
  const menu = byId("contact-menu");
  if (!btn || !menu) return;
  const show = isMobileLayout() && !!id;
  btn.classList.toggle("d_none", !show);
  menu.classList.add("d_none");
}

function normalizeStoreData(raw) {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw) && raw !== null) {
    if (raw.contacts && typeof raw.contacts === "object") {
      return normalizeStoreData(raw.contacts);
    }
    return raw;
  }
  if (Array.isArray(raw)) {
    const obj = {};
    for (const item of raw) {
      if (!item) continue;
      const id = item.id || genId();
      obj[id] = { ...item, id };
    }
    return obj;
  }
  return {};
}

let scheduled = false;

function scheduleRender() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    const usedModern = renderContactsModern();
    if (!usedModern) renderContactListLegacy();
    attachModernHandlers();
    afterRenderSelectFallback();
  });
}

function startLiveView() {
  if (state.unsubscribe) state.unsubscribe();
  state.unsubscribe = store.onData("contacts", (data) => {
    state.data = normalizeStoreData(data);
    scheduleRender();
  });
}

function attachLegacyOverlayHandlers() {
  const openBtn = byId("open-add-contact-overlay");
  const closeBtn = byId("close-add-contact-overlay");
  const cancelBtn = byId("cancel-add-contact-overlay");
  const createBtn = byId("create-contact-btn");
  const overlay = byId("add-contact-overlay");

  if (openBtn) openBtn.addEventListener("click", () => openModal("create"));
  if (closeBtn) closeBtn.addEventListener("click", closeOverlayLegacy);
  if (cancelBtn) cancelBtn.addEventListener("click", closeOverlayLegacy);
  if (createBtn) createBtn.addEventListener("click", handleCreateClick);
  if (overlay)
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeOverlayLegacy();
    });

  // Optional: beim Tippen Errors sofort entfernen
  const nIn = byId("contact-name-input");
  const eIn = byId("contact-email-input");
  const pIn = byId("contact-phone-input");
  [nIn, eIn, pIn].forEach((el) => {
    el?.addEventListener("input", () => clearContactErrors());
  });
}

function attachModernHandlers() {
  const addBtn = byId("openAddModal");
  if (addBtn) addBtn.addEventListener("click", () => openModal("create"));
  const backBtn = byId("return-arrow");
  if (backBtn && !backBtn.dataset.bound) {
    backBtn.addEventListener("click", () => {
      backBtn.classList.add("d_none");
      hideDetailFullscreen();
    });
    backBtn.dataset.bound = "1";
  }
}

function initFabMenu() {
  const btn = byId("contact-menu-btn");
  const menu = byId("contact-menu");
  const edit = byId("contact-menu-edit");
  const del = byId("contact-menu-delete");
  if (!btn || !menu) return;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("d_none");
  });

  if (edit)
    edit.addEventListener("click", () => {
      if (!state.selectedId) return;
      openModal("edit", state.selectedId);
      menu.classList.add("d_none");
    });

  if (del)
    del.addEventListener("click", () => {
      if (!state.selectedId) return;
      onDelete();
      menu.classList.add("d_none");
    });

  document.addEventListener("click", (e) => {
    if (menu.classList.contains("d_none")) return;
    if (!menu.contains(e.target) && !btn.contains(e.target)) {
      menu.classList.add("d_none");
    }
  });
}

/* Init */

function init() {
  startLiveView();
  attachModernHandlers();
  attachLegacyOverlayHandlers();
  initFabMenu();

  window.addEventListener("resize", () => {
    if (!isMobileLayout()) {
      hideDetailFullscreen();
      const backBtn = byId("return-arrow");
      if (backBtn) backBtn.classList.add("d_none");
    }
  });
}

window.addEventListener("load", init);

window.addEventListener("beforeunload", () => {
  if (state.unsubscribe) state.unsubscribe();
});
