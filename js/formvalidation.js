/**clears add-task form of all mandatory field errors
 * @param {string} form - defines which form is currently used (within add-task.html or within board.html/overlay)
 */

function clearAddTaskErrors(form) {
  const {taskTitle, taskDueDate, taskCategory, titleError, dateError, categoryError,} = getTaskFormElements(form);

  [titleError, dateError, categoryError].forEach(
    (el) => el && (el.textContent = "")
  );
  [taskTitle, taskDueDate, taskCategory].forEach(
    (el) => el && el.classList.remove("error")
  );
}

/**Form Validation for Add-Task form
 * @param {string} form - defines which form is currently used (within add-task.html or within board.html/overlay)
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

function validateTitle(taskTitle, titleError) {
  if (!taskTitle?.value.trim()) {
    titleError.textContent = "This field is required";
    taskTitle.classList.add("error");
    return false;
  }
  return true;
}

function validateDueDate(taskDueDate, dateError) {
  if (!taskDueDate?.value) {
    dateError.textContent = "This field is required";
    taskDueDate.classList.add("error");
    return false;
  }
  return true;
}

function validateCategory(taskCategory, categoryError) {
  if (taskCategory?.value === "Select task category") {
    categoryError.textContent = "This field is required";
    taskCategory.classList.add("error");
    return false;
  }
  return true;
}

function setMandatoryInputs(form) {
  const {taskTitle, taskDueDate, taskCategory, titleError, dateError, categoryError,} = getTaskFormElements(form);

  clearAddTaskErrors(form);

  let isValid = true;

  if (!validateTitle(taskTitle, titleError)) isValid = false;
  if (!validateDueDate(taskDueDate, dateError)) isValid = false;
  if (!validateCategory(taskCategory, categoryError)) isValid = false;

  return isValid;
}