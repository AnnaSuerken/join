import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

function getGreeting(now = new Date()) {
  const h = now.getHours();
  if (h >= 5 && h < 12) return "Good Morning,";
  if (h >= 12 && h < 17) return "Good Afternoon,";
  return "Good Evening,";
}

function setGreeting() {
  const el = document.getElementById("summary-greeting");
  if (el) el.textContent = getGreeting();
}

function scheduleGreetingRefresh() {
  const now = new Date();
  const msToNextHour =
    (60 - now.getMinutes()) * 60_000 -
    now.getSeconds() * 1000 -
    now.getMilliseconds();

  setTimeout(() => {
    setGreeting();
    setInterval(setGreeting, 60 * 60 * 1000);
  }, Math.max(msToNextHour, 0));
}

async function loadName() {
  const userNameRef = document.getElementById("summary-name");
  onAuthStateChanged(auth, async (user) => {
    try {
      if (!user) {
        userNameRef.textContent = "Gast";
        return;
      }
      const displayName = await dbApi.getData(`users/${user.uid}/displayName`);
      userNameRef.textContent = displayName || "Gast";
    } catch (err) {
      console.error(err);
      userNameRef.textContent = "Gast";
    }
  });
}

function toArray(x) {
  if (Array.isArray(x)) return x;
  if (x && typeof x === "object") return Object.values(x); // Map -> Werte
  return [];
}

async function loadTasksInBoard() {
  let allTasksRef = document.getElementById("allTasks");
  const board = await dbApi.getData("board");
  const todoRaw = board.todo;
  const inprogressRaw = board.inprogress || board.inProgress;
  const doneRaw = board.done;
  const awaitingRaw = board.awaitingfeedback || board.awaitingFeedback;
  const taskToDo = toArray(todoRaw);
  const taskInProgress = toArray(inprogressRaw);
  const taskDone = toArray(doneRaw);
  const taskAwaitingFeedback = toArray(awaitingRaw);
  const mergeArrays = [
    ...taskToDo,
    ...taskInProgress,
    ...taskDone,
    ...taskAwaitingFeedback,
  ];
  allTasksRef.textContent = mergeArrays.length;
}
async function loadTasksInProgress() {
  let inProgressRef = document.getElementById("inProgress");
  const board = await dbApi.getData("board");
  const inprogressRaw = board.inprogress || board.inProgress;
  const taskInProgress = toArray(inprogressRaw);
  inProgressRef.textContent = taskInProgress.length;
}
async function loadTasksAwaitingFeedback() {
  let awaitingRef = document.getElementById("awaitingFeedback");
  const board = await dbApi.getData("board");
  const awaitingRaw = board.await || board.await;
  const taskAwaitingFeedback = toArray(awaitingRaw);
  awaitingRef.textContent = taskAwaitingFeedback.length;
}

async function init() {
  setGreeting();
  scheduleGreetingRefresh();
  await loadName();
  await loadTasksInBoard();
  await loadTasksInProgress();
  await loadTasksAwaitingFeedback();
}

addEventListener("click", async (event) => {
  if (
    event.target.closest(
      ".summary-task-big, .summary-task-medium, .summary-task-small"
    )
  ) {
    window.location.href = "board.html";
  }
});

window.addEventListener("load", init);
