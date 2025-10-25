/**
 * This function is used to add new Task to Firebase
 * 
 */

async function createTask() {
  const taskTitle = document.getElementById("task-title");
  const taskDescription = document.getElementById("task-description");
  const taskDueDate = document.getElementById("task-due-date");
  //const taskContacts = document.getElementById("task-contacts");
  const taskCategory = document.getElementById("task-category");
  const subtask = document.getElementById("subtask");

  const key = await dbApi.pushData("/board/todo", {
    headline: taskTitle.value,
    id: "",
    description: taskDescription.value,
    deadline: taskDueDate.value,
    category: taskCategory.value,
    subtask: subtask.value,
  });
  await dbApi.updateData(`board/todo/${key}`, { id: key });
  console.log(taskTitle.value);
  clearTask()
}

/**
 * This functions clears the add-task forms
 * 
 */

function clearTask() {
  document.getElementById("task-title").value = "";
  document.getElementById("task-description").value = "";
  document.getElementById("task-due-date").value = "";
  //const taskContacts = document.getElementById("task-contacts");
  document.getElementById("task-category").value = "Select task category";
  document.getElementById("subtask").value = "";
}

/**
 * This function changes the appearance of priority buttons within add.task.section upon click
 * 
 */
function setPriority(status){
  let priorityStatus = document.getElementById(`prio-${status}`)
  priorityStatus.innerHTML = "";
  priorityStatus.innerHTML += priorityTemplate(status);
}

function priorityTemplate(status){
  return `<div class="priority-btn-${status}" id="prio-${status}">${status}<img src="./assets/icons/${status}-white.svg" alt="${status}" class="${status}-img-active"></div>` 
}
