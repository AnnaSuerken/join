/* contacts-ui-main.js */

/* Modal / Overlay */

let modalMode = "create";

/* ====== NON-BLOCKING TOAST  ====== */

function showInlineToast(message, isError = false, duration = 2500) {
  const toast = byId("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.toggle("error", !!isError);
  toast.classList.remove("d_none");

  clearTimeout(showInlineToast._t);
  showInlineToast._t = setTimeout(() => {
    toast.classList.add("d_none");
    toast.classList.remove("error");
    toast.textContent = "";
  }, duration);
}

function notify(message, isError = false) {
  try {
    if (typeof showToast === "function") return showToast(message, isError);
  } catch (e) {
    console.warn("[contacts] showToast failed, fallback to inline toast", e);
  }
  showInlineToast(message, isError);
}

/* ====== VALIDATION  ====== */

const nameError = () => byId("contact-name-error");
const emailError = () => byId("contact-email-error");
const phoneError = () => byId("contact-phone-error");

function clearFieldError(field) {
  const cfg = {
    name: ["contact-name-error", "contact-name-input"],
    email: ["contact-email-error", "contact-email-input"],
    phone: ["contact-phone-error", "contact-phone-input"],
  }[field];
  if (!cfg) return;

  byId(cfg[0]) && (byId(cfg[0]).textContent = "");
  byId(cfg[1])?.classList.remove("error");
}

function clearContactErrors() {
  clearFieldError("name");
  clearFieldError("email");
  clearFieldError("phone");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  const p = String(phone || "").trim();
  if (!p) return false;
  if (!/^[0-9+\-()./\s]+$/.test(p)) return false;
  return (p.match(/\d/g) || []).length >= 6;
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

  if (!phone) {
    showPhoneError("Bitte gib eine Telefonnummer ein.");
    ok = false;
  } else if (!isValidPhone(phone)) {
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
    byId("add-contact-form")?.reset();
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
  els.titleEl && (els.titleEl.textContent = "Edit contact");
  els.primaryBtn && (els.primaryBtn.textContent = "Save ✓");
  updateModalAvatar(els.avatar, contact.color, contact.initials);
}

function resetModalForCreate(els) {
  clearContactErrors();
  els.nameInput.value = "";
  els.emailInput.value = "";
  els.phoneInput.value = "";
  els.titleEl && (els.titleEl.textContent = "Add contact");
  els.primaryBtn && (els.primaryBtn.textContent = "Create contact ✓");
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
  if (!validateContactForm(values)) return notify("Bitte überprüfe deine Eingaben.", true);

  const { name, email, phone } = values;
  const isEdit = modalMode === "edit" && state.selectedId;

  if (isEdit) {
    return saveEdit(name, email, phone).then(() => {
      closeOverlayLegacy();
      notify("Contact updated successfully.");
    });
  }

  const color = colorPool[hashStr(name) % colorPool.length];
  return createContact(name, email, phone, color).then(() => {
    const id = state.selectedId;
    closeOverlayLegacy();
    if (id) {
      renderDetailForId(id);
      setActiveRow(id);
      showDetailFullscreenIfMobile();
      typeof updateFabForContact === "function" && updateFabForContact(id);
    }
    notify("Contact created successfully.");
  });
}

async function onDelete() {
  const id = state.selectedId;
  if (!id) return;

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
  const first = qs(".row") || qs(".contact-row");
  if (first) {
    const cid = first.dataset.id;
    state.selectedId = cid;
    setActiveRow(cid);
    renderDetailForId(cid);
    return;
  }

  const detail = qs(".detail-card");
  if (detail) detail.innerHTML = "<p>No contact selected.</p>";
  else renderEmptyDetailLegacy();
}

function afterRenderSelectFallback() {
  if (restoreSelectedIfExists()) return;
  selectFirstAvailable();
}

function updateFabForContact(id) {
  const btn = byId("contact-menu-btn");
  const menu = byId("contact-menu");
  if (!btn || !menu) return;
  const show = isMobileLayout() && !!id;
  btn.classList.toggle("d_none", !show);
  menu.classList.add("d_none");
}

/* Data normalization */

function normalizeStoreData(raw) {
  if (!raw) return {};
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    if (raw.contacts && typeof raw.contacts === "object") return normalizeStoreData(raw.contacts);
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

/* Render scheduling */

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

/* Handlers */

function attachLegacyOverlayHandlers() {
  const overlay = byId("add-contact-overlay");

  byId("open-add-contact-overlay")?.addEventListener("click", () => openModal("create"));
  byId("close-add-contact-overlay")?.addEventListener("click", closeOverlayLegacy);
  byId("cancel-add-contact-overlay")?.addEventListener("click", closeOverlayLegacy);
  byId("create-contact-btn")?.addEventListener("click", handleCreateClick);

  overlay?.addEventListener("click", (e) => e.target === overlay && closeOverlayLegacy());

  byId("contact-name-input")?.addEventListener("input", () => clearFieldError("name"));
  byId("contact-email-input")?.addEventListener("input", () => clearFieldError("email"));
  byId("contact-phone-input")?.addEventListener("input", () => clearFieldError("phone"));
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
  if (!btn || !menu) return;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("d_none");
  });

  byId("contact-menu-edit")?.addEventListener("click", () => {
    if (!state.selectedId) return;
    openModal("edit", state.selectedId);
    menu.classList.add("d_none");
  });

  byId("contact-menu-delete")?.addEventListener("click", () => {
    if (!state.selectedId) return;
    onDelete();
    menu.classList.add("d_none");
  });

  document.addEventListener("click", (e) => {
    if (menu.classList.contains("d_none")) return;
    if (!menu.contains(e.target) && !btn.contains(e.target)) menu.classList.add("d_none");
  });
}

/* Init */

function init() {
  startLiveView();
  attachModernHandlers();
  attachLegacyOverlayHandlers();
  initFabMenu();

  window.addEventListener("resize", () => {
    if (isMobileLayout()) return;
    hideDetailFullscreen();
    byId("return-arrow")?.classList.add("d_none");
  });
}

window.addEventListener("load", init);

window.addEventListener("beforeunload", () => {
  if (state.unsubscribe) state.unsubscribe();
});
