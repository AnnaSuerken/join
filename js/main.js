function delTask(id) {
  dbApi.deleteData("/board" + findColumnOfTask(id) + "/" + id);
}
