function createTask() {
    const taskTitle = document.getElementById("task-title");
    dbApi.pushData('/board/todo', {
        taskTitle: taskTitle.value,
        id: "",})
        console.log(taskTitle.value);
        
}
