<<<<<<< HEAD
/**
 * This function is used to add new Task to Firebase
 *
 */
=======
let taskCategoryColor = [
  { name: "Technical Task", color: "#20D7C1" },
  { name: "User Story", color: "#0038FF" },
];
>>>>>>> origin/main

async function createTask() {
  const taskTitle = document.getElementById("task-title");
  const taskDescription = document.getElementById("task-description");
  const taskDueDate = document.getElementById("task-due-date");
  //const taskContacts = document.getElementById("task-contacts");
  const taskCategory = document.getElementById("task-category");
  const subtask = document.getElementById("subtask");

  const key = await dbApi.pushData("/board/todo", {
<<<<<<< HEAD
    headline: taskTitle.value,
=======
    title: taskTitle.value,
>>>>>>> origin/main
    id: "",
    secondline: taskDescription.value,
    deadline: taskDueDate.value,
    category: taskCategory.value,
<<<<<<< HEAD
=======
    categorycolor:
      taskCategoryColor.find((c) => c.name === taskCategory.value)?.color || "",
>>>>>>> origin/main
    subtask: subtask.value,
    priority: currentPriority,
  });
  await dbApi.updateData(`board/todo/${key}`, { id: key });
  console.log(taskTitle.value);
  clearTask();
}

/**
 * This functions clears the add-task forms
 *
 */

function clearTask() {
  const priorities = ["urgent", "medium", "low"];
  document.getElementById("task-title").value = "";
  document.getElementById("task-description").value = "";
  document.getElementById("task-due-date").value = "";
  //const taskContacts = document.getElementById("task-contacts");
  document.getElementById("task-category").value = "Select task category";
  document.getElementById("subtask").value = "";
  priorities.forEach((prio) => {
    document.getElementById(`prio-${prio}`).classList.remove("d_none");
    document.getElementById(`prio-${prio}-active`).classList.add("d_none");
  });
  currentPriority = [];
}

/**
 * This function changes the appearance of priority buttons within add.task.section upon click
 *
 */

let currentPriority = [];

function setPriority(status) {
  const priorities = ["urgent", "medium", "low"];

<<<<<<< HEAD

=======
>>>>>>> origin/main
  if (currentPriority === status) {
    priorities.forEach((prio) => {
      document.getElementById(`prio-${prio}`).classList.remove("d_none");
      document.getElementById(`prio-${prio}-active`).classList.add("d_none");
    });

    currentPriority = null;
    return;
  }

  priorities.forEach((prio) => {
    document.getElementById(`prio-${prio}`).classList.remove("d_none");
    document.getElementById(`prio-${prio}-active`).classList.add("d_none");
  });

  document.getElementById(`prio-${status}`).classList.add("d_none");
  document.getElementById(`prio-${status}-active`).classList.remove("d_none");

  currentPriority = status;
<<<<<<< HEAD
  console.log(currentPriority)
}

console.log(currentPriority)
=======
  console.log(currentPriority);
}
>>>>>>> origin/main
