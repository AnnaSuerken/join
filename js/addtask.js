async function createTask() {
  const taskTitle = document.getElementById("task-title");
  const key = await dbApi.pushData("/board/todo", {
    headline: taskTitle.value,
    id: "",
  });
  await dbApi.updateData(`board/todo/${key}`, { id: key });
  console.log(taskTitle.value);
}
