/**
 * Collects and returns all relevant task form elements.
 *
 * @param {HTMLFormElement} form
 * The task form element.
 */
function getTaskFormElements(form) {
  return {
    taskTitle: form.querySelector(".task-title"),
    taskDescription: form.querySelector(".task-description"),
    taskDueDate: form.querySelector(".task-due-date"),
    taskCategory: form.querySelector(".task-category"),
    titleError: form.querySelector(".title-error, #add-task-title-error"),
    dateError: form.querySelector(".date-error, #add-task-date-error"),
    categoryError: form.querySelector(
      ".category-error, #add-task-category-error"
    ),
  };
}

/**
 * Clears all validation error messages and error styles
 * from the task form.
 *
 * @param {HTMLFormElement} form
 * The task form element.
 */
function clearAddTaskErrors(form) {
  const {
    taskTitle,
    taskDueDate,
    taskCategory,
    titleError,
    dateError,
    categoryError,
  } = getTaskFormElements(form);

  [titleError, dateError, categoryError].forEach(
    (el) => el && (el.textContent = "")
  );
  [taskTitle, taskDueDate, taskCategory].forEach(
    (el) => el && el.classList.remove("error")
  );
}

/**
 * Validates the task title input.
 *
 * @param {HTMLInputElement} taskTitle
 * The task title input field.
 *
 * @param {HTMLElement} titleError
 * The element used to display title validation errors.
 */
function validateTitle(taskTitle, titleError) {
  if (!taskTitle?.value.trim()) {
    titleError.textContent = "This field is required";
    taskTitle.classList.add("error");
    return false;
  }
  return true;
}

/**
 * Validates the task due date input.
 *
 * @param {HTMLInputElement} taskDueDate
 * The task due date input field.
 *
 * @param {HTMLElement} dateError
 * The element used to display date validation errors.
 */
function validateDueDate(taskDueDate, dateError) {
  if (!taskDueDate?.value) {
    dateError.textContent = "This field is required";
    taskDueDate.classList.add("error");
    return false;
  }
  return true;
}

/**
 * Validates the task category selection.
 *
 * @param {HTMLSelectElement} taskCategory
 * The task category select field.
 *
 * @param {HTMLElement} categoryError
 * The element used to display category validation errors.
 */
function validateCategory(taskCategory, categoryError) {
  if (taskCategory?.value === "Select task category") {
    categoryError.textContent = "This field is required";
    taskCategory.classList.add("error");
    return false;
  }
  return true;
}

/**
 * Validates all mandatory task form inputs.
 *
 * @param {HTMLFormElement} form
 * The task form element.
 */
function setMandatoryInputs(form) {
  const {
    taskTitle,
    taskDueDate,
    taskCategory,
    titleError,
    dateError,
    categoryError,
  } = getTaskFormElements(form);

  clearAddTaskErrors(form);

  let isValid = true;
  if (!validateTitle(taskTitle, titleError)) isValid = false;
  if (!validateDueDate(taskDueDate, dateError)) isValid = false;
  if (!validateCategory(taskCategory, categoryError)) isValid = false;

  return isValid;
}

// Exports for other scripts
window.getTaskFormElements = getTaskFormElements;
window.clearAddTaskErrors = clearAddTaskErrors;
window.setMandatoryInputs = setMandatoryInputs;
