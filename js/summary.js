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

function renderBoardSummary(board) {
  if (!board) {
    setText("summary-task-todo-number", 0);
    setText("summary-task-done-number", 0);
    setText("allTasks", 0);
    setText("inProgress", 0);
    setText("awaitingFeedback", 0);
    setText("urgent-count", 0);
    setText("next-deadline", "–");
    return;
  }

  const { todo, inProgress, done, awaiting } = normalizeBoard(board);
  const allTasks = [...todo, ...inProgress, ...done, ...awaiting];

  // Spaltenzähler
  setText("summary-task-todo-number", todo.length);
  setText("summary-task-done-number", done.length);
  setText("inProgress", inProgress.length);
  setText("awaitingFeedback", awaiting.length);
  setText("allTasks", allTasks.length);

  // Urgent (über alle Spalten)
  const urgentCount = allTasks.filter(isUrgent).length;
  setText("urgent-count", urgentCount);

  // Nächste zukünftige Deadline
  const now = new Date();
  const futureDueDates = allTasks
    .map(parseDueDate)
    .filter((d) => d && d.getTime() > now.getTime())
    .sort((a, b) => a - b);

  setText(
    "next-deadline",
    futureDueDates.length ? formatDateDE(futureDueDates[0]) : "–"
  );
}

let unsubscribeBoard = null;

function startBoardLiveSubscription() {
  unsubscribeBoard = window.dbApi.onData("board", (data) => {
    renderBoardSummary(data);
  });
}

function stopBoardLiveSubscription() {
  try {
    if (typeof unsubscribeBoard === "function") {
      unsubscribeBoard();
      unsubscribeBoard = null;
    }
  } catch (e) {
    console.warn("Unsubscribe board listener failed:", e);
  }
}

function initNavigation() {
  const links = {
    "add-task": "add_task.html",
    board: "board.html",
    contacts: "contacts.html",
    summary: "index.html",
  };

  Object.entries(links).forEach(([id, href]) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener("click", () => (window.location.href = href));
  });

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
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
