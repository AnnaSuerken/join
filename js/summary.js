// summary.js
// Voraussetzung: firebase.js lädt vorher und stellt window.auth & window.dbApi bereit.
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

function requireAuth({ redirectTo = "/login.html" } = {}) {
  return new Promise((resolve) => {
    onAuthStateChanged(window.auth, (user) => {
      if (user) resolve(user);
      else window.location.href = redirectTo;
    });
  });
}

async function handleLogout() {
  try {
    await signOut(window.auth);
    window.location.href = "/login.html";
  } catch (e) {
    console.error(e);
    alert("Logout fehlgeschlagen. Bitte erneut versuchen.");
  }
}

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

function initLiveName() {
  const userNameRef = document.getElementById("summary-name");
  onAuthStateChanged(window.auth, async (user) => {
    try {
      if (!user) {
        userNameRef.textContent = "Gast";
        return;
      }
      const displayName = await window.dbApi.getData(
        `users/${user.uid}/displayName`
      );
      userNameRef.textContent = displayName || "Gast";
    } catch (err) {
      console.error(err);
      userNameRef.textContent = "Gast";
    }
  });
}

function toArray(x) {
  if (Array.isArray(x)) return x;
  if (x && typeof x === "object") return Object.values(x);
  return [];
}

function normalizeBoard(board) {
  return {
    todo: toArray(board?.todo),
    inProgress: toArray(board?.inprogress || board?.inProgress),
    done: toArray(board?.done),
    awaiting: toArray(board?.awaitingfeedback || board?.awaitingFeedback),
  };
}

function parseDueDate(task) {
  const raw = task?.dueDate || task?.deadline || task?.date;
  const d = raw ? new Date(raw) : null;
  return d && !isNaN(+d) ? d : null;
}

function isUrgent(task) {
  const p = (task?.priority || "").toString().toLowerCase();
  return p === "urgent";
}

function formatDateDE(date) {
  return new Intl.DateTimeFormat("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
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
  await requireAuth({ redirectTo: "/login.html" });
  initNavigation();
  setGreeting();
  scheduleGreetingRefresh();
  initLiveName();
  startBoardLiveSubscription();
}

function cleanup() {
  stopBoardLiveSubscription();
}

// === Click auf Tasks führt zur Board-Seite ===
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
window.addEventListener("beforeunload", cleanup);
