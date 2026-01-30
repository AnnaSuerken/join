/**
 * Opens the legacy contact overlay with animation.
 */
function openOverlayLegacy() {
  const overlay = byId("add-contact-overlay");
  if (!overlay) return;
  overlay.classList.remove("d_none");
  void overlay.offsetWidth;
  overlay.classList.add("modal-open");
}

/**
 * Resets the avatar preview inside the modal.
 */
function resetOverlayAvatar() {
  const avatar = byId("modal-avatar-preview");
  if (!avatar) return;
  avatar.style.backgroundColor = "#efefef";
  avatar.innerHTML =
    '<img src="./assets/icons/person.svg" alt="avatar placeholder" />';
}

/**
 * Closes the legacy contact overlay and resets form state.
 */
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

/**
 * Returns all relevant modal DOM elements.
 *
 * @returns {Object}
 */
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

/**
 * Updates the modal avatar preview.
 *
 * @param {HTMLElement} avatar
 * Avatar element.
 *
 * @param {string} [color]
 * Avatar background color.
 *
 * @param {string} [initials]
 * Avatar initials.
 */
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

/**
 * Fills the contact modal with existing contact data for editing.
 *
 * @param {Object} contact
 * Normalized contact object.
 *
 * @param {Object} els
 * Cached modal DOM elements.
 */
function fillModalForEdit(contact, els) {
  clearContactErrors();
  els.nameInput.value = contact.name;
  els.emailInput.value = contact.email;
  els.phoneInput.value = contact.phone || "";
  els.titleEl && (els.titleEl.textContent = "Edit contact");
  els.primaryBtn && (els.primaryBtn.textContent = "Save ✓");
  updateModalAvatar(els.avatar, contact.color, contact.initials);
}

/**
 * Resets the contact modal for creating a new contact.
 *
 * @param {Object} els
 * Cached modal DOM elements.
 */
function resetModalForCreate(els) {
  clearContactErrors();
  els.nameInput.value = "";
  els.emailInput.value = "";
  els.phoneInput.value = "";
  els.titleEl && (els.titleEl.textContent = "Add contact");
  els.primaryBtn && (els.primaryBtn.textContent = "Create contact ✓");
  updateModalAvatar(els.avatar);
}

/**
 * Opens the contact modal in either create or edit mode.
 *
 * @param {"create"|"edit"} [mode="create"]
 * Modal operation mode.
 *
 * @param {string|null} [cid]
 * Contact ID to edit.
 */
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

/**
 * Reads and normalizes values from the contact modal form.
 */
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

/**
 * Handles the primary create / save button click inside the modal.
 *
 * Creates or updates a contact depending on the current modal mode.
 */
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

/**
 * Deletes the currently selected contact.
 */
async function onDelete() {
  const id = state.selectedId;
  if (!id) return;

  await deleteContactById(id);

  state.selectedId = null;
  hideDetailFullscreen();
  if (typeof updateFabForContact === "function") updateFabForContact(null);

  notify("Contact deleted successfully.");
}

/**
 * Renders the detail view for a contact ID.
 *
 * @param {string} id
 */
function renderDetailForId(id) {
  if (qs(".detail-card")) updateDetailModern(id);
  else renderContactDetailLegacy(id);
}

/**
 * Restores previously selected contact if still present.
 */
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

/**
 * Selects the first available contact as fallback.
 */
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

/**
 * Ensures a valid contact is selected after rendering.
 */
function afterRenderSelectFallback() {
  if (restoreSelectedIfExists()) return;
  selectFirstAvailable();
}


/**
 * Updates the visibility of the floating action button (FAB)
 * depending on the selected contact and current layout.
 *
 * @param {string|null} id
 * The currently selected contact ID.
 */
function updateFabForContact(id) {
  const btn = byId("contact-menu-btn");
  const menu = byId("contact-menu");
  if (!btn || !menu) return;
  const show = isMobileLayout() && !!id;
  btn.classList.toggle("d_none", !show);
  menu.classList.add("d_none");
}

/**
 * Normalizes raw contact data from the database into
 * a consistent object-based structure.
 *
 * @param {any} raw
 * Raw data returned from the database.
 */
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

let scheduled = false;

/**
 * Schedules a single render cycle for the contact list.
 */
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

/**
 * Starts the live database subscription for contacts.
 */
function startLiveView() {
  if (state.unsubscribe) state.unsubscribe();
  state.unsubscribe = store.onData("contacts", (data) => {
    state.data = normalizeStoreData(data);
    scheduleRender();
  });
}

/**
 * Attaches event handlers for legacy contact overlay elements.
 */
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

/**
 * Attaches event handlers for the modern contact UI.
 */
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

/**
 * Initializes the floating action button (FAB) menu for contacts.
 *
 * Handles opening/closing the menu, edit/delete actions,
 * and closing on outside click.
 */
function initFabMenu() {
  const btn = byId("contact-menu-btn");
  const menu = byId("contact-menu");
  if (!btn || !menu) return;

  wireFabToggle(btn, menu);
  wireFabActions(menu);
  wireFabOutsideClose(btn, menu);
}

function wireFabToggle(btn, menu) {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("d_none");
  });
}

function wireFabActions(menu) {
  byId("contact-menu-edit")?.addEventListener("click", () =>
    handleFabAction(menu, () => openModal("edit", state.selectedId))
  );

  byId("contact-menu-delete")?.addEventListener("click", () =>
    handleFabAction(menu, onDelete)
  );
}

function handleFabAction(menu, action) {
  if (!state.selectedId) return;
  action();
  menu.classList.add("d_none");
}

function wireFabOutsideClose(btn, menu) {
  document.addEventListener("click", (e) => {
    if (!menu.classList.contains("d_none") &&
        !menu.contains(e.target) &&
        !btn.contains(e.target)) {
      menu.classList.add("d_none");
    }
  });
}

/**
 * Initializes the contacts UI and starts live data subscription.
 */
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
