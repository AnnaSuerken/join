let taskCategoryColor = [
  { name: "Technical Task", color: "#20D7C1" },
  { name: "User Story", color: "#0038FF" },
];

async function createTask() {
  const taskTitle = document.getElementById("task-title");
  const taskDescription = document.getElementById("task-description");
  const taskDueDate = document.getElementById("task-due-date");
  const taskContacts = document.getElementById("assigned-contacts");
  const taskCategory = document.getElementById("task-category");
  const subtask = document.getElementById("subtask");

  const key = await dbApi.pushData("/board/todo", {
    title: taskTitle.value,
    id: "",
    secondline: taskDescription.value,
    deadline: taskDueDate.value,
    assignedContact: taskContacts.value,
    category: taskCategory.value,
    categorycolor:
      taskCategoryColor.find((c) => c.name === taskCategory.value)?.color || "",
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
  document.getElementById("task-deion").value = "";
  document.getElementById("task-due-date").value = "";
  document.getElementById("assigned-contacts").value = "";
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
}

/**
 * This function pulls contacts data from firebase and creates array for assign to template
 *
 */
let contactsData = [];

async function getContactsData() {

  const data= await dbApi.getData(`contacts/`);
  const contactsArray = Object.values(data)

  for (let i = 0; i < contactsArray.length; i++) {
    const contacts = contactsArray[i];

    contactsData.push({
      initials: contacts.initials,
      name: contacts.name,
    })
    
  }
   console.log(contactsData)
   assignToTemplate();
}

function assignToTemplate() {
  let contentRef = document.getElementById('assigned-contacts');
  contentRef.innerHTML = "";

  for (let i = 0; i < contactsData.length; i++) {
    contentRef.innerHTML += getAssignToTemplate(i);
  }
}

function getAssignToTemplate(i){
  return `<option>${contactsData[i].name}</option>`
}