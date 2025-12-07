// js/summary/summary.js
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

function requireAuthSummary({ redirectTo = "/login.html" } = {}) {
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

function getNextHourDelay(now = new Date()) {
  return (
    (60 - now.getMinutes()) * 60_000 -
    now.getSeconds() * 1000 -
    now.getMilliseconds()
  );
}

function scheduleGreetingRefresh() {
  const msToNextHour = Math.max(getNextHourDelay(), 0);
  setTimeout(() => {
    setGreeting();
    setInterval(setGreeting, 60 * 60 * 1000);
  }, msToNextHour);
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
    awaiting: toArray(
      board?.await || board?.awaitingfeedback || board?.awaitingFeedback
    ),
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

/* ---- Counter Animation ---- */

function getCounterStartValue(element) {
  const text = (element.textContent || "").replace(/[^\d-]/g, "");
  const parsed = parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getCounterDuration(diff, baseDuration = 200) {
  const extra = Math.min(Math.abs(diff) * 20, 600);
  return baseDuration + extra;
}

function runCounterAnimation(element, start, end, totalDuration) {
  const startTime = performance.now();

  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / totalDuration, 1);
    const value = Math.round(start + (end - start) * progress);
    element.textContent = value;
    if (progress < 1) requestAnimationFrame(update);
    else element.textContent = end;
  }

  requestAnimationFrame(update);
}

function animateCounter(element, target) {
  if (!element) return;

  const start = getCounterStartValue(element);
  const end = Number(target) || 0;
  const diff = end - start;

  if (diff === 0) {
    element.textContent = end;
    return;
  }

  const totalDuration = getCounterDuration(diff);
  runCounterAnimation(element, start, end, totalDuration);
}

function setNumberAnimated(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  animateCounter(el, value);
}

/* ---- Board Summary ---- */

function renderEmptyBoardSummary() {
  setNumberAnimated("summary-task-todo-number", 0);
  setNumberAnimated("summary-task-done-number", 0);
  setNumberAnimated("allTasks", 0);
  setNumberAnimated("inProgress", 0);
  setNumberAnimated("awaitingFeedback", 0);
  setNumberAnimated("urgent-count", 0);
  setText("next-deadline", "–");
}

function getBoardArrays(board) {
  const { todo, inProgress, done, awaiting } = normalizeBoard(board);
  const allTasks = [...todo, ...inProgress, ...done, ...awaiting];
  return { todo, inProgress, done, awaiting, allTasks };
}

function updateSummaryCounts(todo, inProgress, done, awaiting, allTasks) {
  setNumberAnimated("summary-task-todo-number", todo.length);
  setNumberAnimated("summary-task-done-number", done.length);
  setNumberAnimated("inProgress", inProgress.length);
  setNumberAnimated("awaitingFeedback", awaiting.length);
  setNumberAnimated("allTasks", allTasks.length);
}

function updateUrgentCount(allTasks) {
  const urgentCount = allTasks.filter(isUrgent).length;
  setNumberAnimated("urgent-count", urgentCount);
}

function updateNextDeadline(allTasks) {
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

function renderBoardSummary(board) {
  if (!board) {
    renderEmptyBoardSummary();
    return;
  }

  const { todo, inProgress, done, awaiting, allTasks } = getBoardArrays(board);
  updateSummaryCounts(todo, inProgress, done, awaiting, allTasks);
  updateUrgentCount(allTasks);
  updateNextDeadline(allTasks);
}

/* ---- Live Board Subscription ---- */

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

/* ---- Navigation ---- */

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

/* ---- Init & Cleanup ---- */

async function initSummary() {
  await requireAuthSummary({ redirectTo: "/login.html" });
  initNavigation();
  setGreeting();
  scheduleGreetingRefresh();
  initLiveName();
  startBoardLiveSubscription();
}

function cleanupSummary() {
  stopBoardLiveSubscription();
}

/* ---- Events ---- */

addEventListener("click", (event) => {
  if (
    event.target.closest(
      ".summary-task-big, .summary-task-medium, .summary-task-small"
    )
  ) {
    window.location.href = "board.html";
  }
});

window.addEventListener("load", initSummary);
window.addEventListener("beforeunload", cleanupSummary);
