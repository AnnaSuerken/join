/* Modal / Overlay */

let modalMode = "create";

function openOverlayLegacy() {
  const overlay = byId("add-contact-overlay");
  if (overlay) {
    overlay.classList.remove("d_none");
  }
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
  if (overlay) {
    overlay.classList.add("d_none");
  }

  const form = byId("add-contact-form");
  if (form) {
    form.reset();
  }

  resetOverlayAvatar();
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
  els.nameInput.value = contact.name;
  els.emailInput.value = contact.email;
  els.phoneInput.value = contact.phone || "";

  if (els.titleEl) {
    els.titleEl.textContent = "Edit contact";
  }
  if (els.primaryBtn) {
    els.primaryBtn.textContent = "Save contact ✓";
  }

  updateModalAvatar(els.avatar, contact.color, contact.initials);
}

function resetModalForCreate(els) {
  els.nameInput.value = "";
  els.emailInput.value = "";
  els.phoneInput.value = "";

  if (els.titleEl) {
    els.titleEl.textContent = "Add contact";
  }
  if (els.primaryBtn) {
    els.primaryBtn.textContent = "Create contact ✓";
  }

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

function handleCreateClick() {
  const nameEl = byId("contact-name-input");
  const emailEl = byId("contact-email-input");
  const phoneEl = byId("contact-phone-input");

  const name = nameEl?.value.trim();
  const email = emailEl?.value.trim();
  const phone = phoneEl?.value.trim();

  if (!name || !email) return;

  const isEdit = modalMode === "edit" && state.selectedId;

  if (isEdit) {
    saveEdit(name, email, phone).then(() => closeOverlayLegacy());
  } else {
    const color = colorPool[hashStr(name) % colorPool.length];
    createContact(name, email, phone, color).then(() => closeOverlayLegacy());
  }
}

async function onDelete() {
  const id = state.selectedId;
  if (!id) return;

  await deleteContactById(id);
  state.selectedId = null;
  hideDetailFullscreen();
}

/* Auswahl / Fallback */

function restoreSelectedIfExists() {
  const id = state.selectedId;
  if (!id) return false;

  const modern = qs(`.row[data-id="${id}"]`);
  const legacy = qs(`.contact-row[data-id="${id}"]`);

  if (!modern && !legacy) {
    return false;
  }

  setActiveRow(id);

  if (qs(".detail-card")) {
    updateDetailModern(id);
  } else {
    renderContactDetailLegacy(id);
  }

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

    if (qs(".detail-card")) {
      updateDetailModern(cid);
    } else {
      renderContactDetailLegacy(cid);
    }
  } else {
    const detail = qs(".detail-card");
    if (detail) {
      detail.innerHTML = "<p>No contact selected.</p>";
    } else {
      renderEmptyDetailLegacy();
    }
  }
}

function afterRenderSelectFallback() {
  if (restoreSelectedIfExists()) return;
  selectFirstAvailable();
}

/* Live View + Handlers */

let scheduled = false;

function scheduleRender() {
  if (scheduled) return;
  scheduled = true;

  requestAnimationFrame(() => {
    scheduled = false;

    const usedModern = renderContactsModern();
    if (!usedModern) {
      renderContactListLegacy();
    }

    attachModernHandlers();
    afterRenderSelectFallback();
  });
}

function startLiveView() {
  if (state.unsubscribe) {
    state.unsubscribe();
  }

  state.unsubscribe = store.onData("contacts", (data) => {
    state.data = data || {};
    scheduleRender();
  });
}

function attachLegacyOverlayHandlers() {
  const openBtn = byId("open-add-contact-overlay");
  const closeBtn = byId("close-add-contact-overlay");
  const cancelBtn = byId("cancel-add-contact-overlay");
  const createBtn = byId("create-contact-btn");

  if (openBtn) {
    openBtn.addEventListener("click", () => openModal("create"));
  }
  if (closeBtn) {
    closeBtn.addEventListener("click", closeOverlayLegacy);
  }
  if (cancelBtn) {
    cancelBtn.addEventListener("click", closeOverlayLegacy);
  }
  if (createBtn) {
    createBtn.addEventListener("click", handleCreateClick);
  }
}

function attachModernHandlers() {
  const addBtn = byId("openAddModal");
  if (addBtn) {
    addBtn.addEventListener("click", () => openModal("create"));
  }

  const backBtn = byId("return-arrow");
  if (backBtn && !backBtn.dataset.bound) {
    backBtn.addEventListener("click", () => {
      backBtn.classList.add("d_none");
      hideDetailFullscreen();
    });
    backBtn.dataset.bound = "1";
  }
}

/* Init */

function init() {
  startLiveView();
  attachModernHandlers();
  attachLegacyOverlayHandlers();

  window.addEventListener("resize", () => {
    if (!isMobileLayout()) {
      hideDetailFullscreen();
      const backBtn = byId("return-arrow");
      if (backBtn) {
        backBtn.classList.add("d_none");
      }
    }
  });
}

window.addEventListener("load", init);

window.addEventListener("beforeunload", () => {
  if (state.unsubscribe) {
    state.unsubscribe();
  }
});
