let modalMode = "create";

/**
 * Displays a lightweight inline toast message.
 *
 * @param {string} message
 * Message text to display.
 *
 * @param {boolean} [isError=false]
 * Whether the toast represents an error state.
 *
 * @param {number} [duration=2500]
 * Display duration in milliseconds.
 */
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

/**
 * Displays a notification using the global toast if available,
 *
 * @param {string} message
 * Message text.
 *
 * @param {boolean} [isError=false]
 * Whether the message is an error.
 */
function notify(message, isError = false) {
  try {
    if (typeof showToast === "function") return showToast(message, isError);
  } catch (e) {
    console.warn("[contacts] showToast failed, fallback to inline toast", e);
  }
  showInlineToast(message, isError);
}


const nameError = () => byId("contact-name-error");
const emailError = () => byId("contact-email-error");
const phoneError = () => byId("contact-phone-error");

/**
 * Clears validation error state for a specific field.
 *
 * @param {"name"|"email"|"phone"} field
 * Field identifier.
 */
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

/**
 * Clears all contact form validation errors.
 */
function clearContactErrors() {
  clearFieldError("name");
  clearFieldError("email");
  clearFieldError("phone");
}

/**
 * Validates an email address.
 *
 * @param {string} email
 * Email address.
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validates a phone number.
 *
 * @param {string} phone
 * Phone number.
 */
function isValidPhone(phone) {
  const p = String(phone || "").trim();
  if (!p) return false;
  if (!/^[0-9+\-()./\s]+$/.test(p)) return false;
  return (p.match(/\d/g) || []).length >= 6;
}

/**
 * Displays a validation error for the name field.
 *
 * @param {string} msg
 * Error message.
 */
function showNameError(msg) {
  const el = nameError();
  const input = byId("contact-name-input");
  if (el) el.textContent = msg;
  input?.classList.add("error");
}

/**
 * Displays a validation error for the email field.
 *
 * @param {string} msg
 * Error message.
 */
function showEmailError(msg) {
  const el = emailError();
  const input = byId("contact-email-input");
  if (el) el.textContent = msg;
  input?.classList.add("error");
}

/**
 * Displays a validation error for the phone field.
 *
 * @param {string} msg
 * Error message.
 */
function showPhoneError(msg) {
  const el = phoneError();
  const input = byId("contact-phone-input");
  if (el) el.textContent = msg;
  input?.classList.add("error");
}

/**
 * Validates the contact form values.
 *
 * @param {{name:string,email:string,phone:string}} values
 * Contact form values.
 */
function validateContactForm(values) {
  clearContactErrors();

  return (
    validateName(values.name) &
    validateEmail(values.email) &
    validatePhone(values.phone)
  );
}

function validateName(name) {
  if (!name) {
    showNameError("Bitte gib einen Namen ein.");
    return false;
  }
  return true;
}

function validateEmail(email) {
  if (!email) {
    showEmailError("Bitte gib eine Email-Adresse ein.");
    return false;
  }
  if (!isValidEmail(email)) {
    showEmailError("Bitte gib eine gültige Email-Adresse ein.");
    return false;
  }
  return true;
}

function validatePhone(phone) {
  if (!phone) {
    showPhoneError("Bitte gib eine Telefonnummer ein.");
    return false;
  }
  if (!isValidPhone(phone)) {
    showPhoneError("Bitte gib eine gültige Telefonnummer ein.");
    return false;
  }
  return true;
}
