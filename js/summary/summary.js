// js/summary/summary.js
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

/**
 * Ensures that the user is authenticated before accessing the summary page.
 * Redirects to login page if no user is authenticated.
 *
 * @param {Object} [options]
 * Optional configuration object.
 *
 * @param {string} [options.redirectTo="/login.html"]
 * URL to redirect to if the user is not authenticated.
 */
function requireAuthSummary({ redirectTo = "/login.html" } = {}) {
  return new Promise((resolve) => {
    onAuthStateChanged(window.auth, (user) => {
      if (user) resolve(user);
      else window.location.href = redirectTo;
    });
  });
}

/**
 * Signs the current user out and redirects to the login page.
 */
async function handleLogout() {
  try {
    await signOut(window.auth);
    window.location.href = "/login.html";
  } catch (e) {
    console.error(e);
    alert("Logout fehlgeschlagen. Bitte erneut versuchen.");
  }
}
/**
 * Returns a greeting string based on the current time of day.
 *
 * @param {Date} [now=new Date()]
 * The current date and time.
 */
function getGreeting(now = new Date()) {
  const h = now.getHours();
  if (h >= 5 && h < 12) return "Good Morning,";
  if (h >= 12 && h < 17) return "Good Afternoon,";
  return "Good Evening,";
}

/**
 * Sets the greeting text in the summary header.
 */
function setGreeting() {
  const el = document.getElementById("summary-greeting");
  if (el) el.textContent = getGreeting();
}

/**
 * Calculates the delay until the next full hour.
 *
 * @param {Date} [now=new Date()]
 * The current date and time.
 */
function getNextHourDelay(now = new Date()) {
  return (
    (60 - now.getMinutes()) * 60_000 -
    now.getSeconds() * 1000 -
    now.getMilliseconds()
  );
}

/**
 * Schedules automatic greeting updates at every full hour.
 */
function scheduleGreetingRefresh() {
  const msToNextHour = Math.max(getNextHourDelay(), 0);
  setTimeout(() => {
    setGreeting();
    setInterval(setGreeting, 60 * 60 * 1000);
  }, msToNextHour);
}

/**
 * Displays the current user's name live in the summary view.
 */
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

/**
 * Converts a value into an array.
 *
 * @param {*} x
 * Input value.
 */
function toArray(x) {
  if (Array.isArray(x)) return x;
  if (x && typeof x === "object") return Object.values(x);
  return [];
}

/**
 * Normalizes the board object structure.
 *
 * @param {Object} board
 * Raw board data.
 */
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

/**
 * Extracts and parses a due date from a task object.
 *
 * @param {Object} task
 * Task object.
 */
function parseDueDate(task) {
  const raw = task?.dueDate || task?.deadline || task?.date;
  const d = raw ? new Date(raw) : null;
  return d && !isNaN(+d) ? d : null;
}

/**
 * Checks whether a task has urgent priority.
 *
 * @param {Object} task
 * Task object.
 */
function isUrgent(task) {
  const p = (task?.priority || "").toString().toLowerCase();
  return p === "urgent";
}

/**
 * Formats a date into german date.
 *
 * @param {Date} date
 * Date to format.
 */
function formatDateDE(date) {
  return new Intl.DateTimeFormat("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * Sets text content for a DOM element by ID.
 *
 * @param {string} id
 * Element ID.
 *
 * @param {string|number} value
 * Text value to set.
 */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/**
 * Reads the numeric start value from a counter element.
 *
 * @param {HTMLElement} element
 * Counter element.
 */
function getCounterStartValue(element) {
  const text = (element.textContent || "").replace(/[^\d-]/g, "");
  const parsed = parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Calculates animation duration based on value difference.
 *
 * @param {number} diff
 * Difference between start and end value.
 *
 * @param {number} [baseDuration=200]
 * Base animation duration in milliseconds.
 */
function getCounterDuration(diff, baseDuration = 200) {
  const extra = Math.min(Math.abs(diff) * 20, 600);
  return baseDuration + extra;
}

/**
 * Runs a smooth counter animation.
 *
 * @param {HTMLElement} element
 * Counter element.
 *
 * @param {number} start
 * Start value.
 *
 * @param {number} end
 * End value.
 *
 * @param {number} totalDuration
 * Total animation duration in milliseconds.
 */
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

/**
 * Animates a counter element to a target value.
 *
 * @param {HTMLElement} element
 * Counter element.
 *
 * @param {number|string} target
 * Target value.
 */
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

/**
 * Animates a numeric value into a DOM element.
 *
 * @param {string} id
 * Element ID.
 *
 * @param {number} value
 * Target value.
 */
function setNumberAnimated(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  animateCounter(el, value);
}

/**
 * Renders an empty summary state.
 */
function renderEmptyBoardSummary() {
  setNumberAnimated("summary-task-todo-number", 0);
  setNumberAnimated("summary-task-done-number", 0);
  setNumberAnimated("allTasks", 0);
  setNumberAnimated("inProgress", 0);
  setNumberAnimated("awaitingFeedback", 0);
  setNumberAnimated("urgent-count", 0);
  setText("next-deadline", "–");
}

/**
 * Extracts task arrays from board data.
 *
 * @param {Object} board
 * Board data.
 */
function getBoardArrays(board) {
  const { todo, inProgress, done, awaiting } = normalizeBoard(board);
  const allTasks = [...todo, ...inProgress, ...done, ...awaiting];
  return { todo, inProgress, done, awaiting, allTasks };
}

/**
 * Updates all summary counters.
 *
 * @param {Array} todo
 * @param {Array} inProgress
 * @param {Array} done
 * @param {Array} awaiting
 * @param {Array} allTasks
 */
function updateSummaryCounts(todo, inProgress, done, awaiting, allTasks) {
  setNumberAnimated("summary-task-todo-number", todo.length);
  setNumberAnimated("summary-task-done-number", done.length);
  setNumberAnimated("inProgress", inProgress.length);
  setNumberAnimated("awaitingFeedback", awaiting.length);
  setNumberAnimated("allTasks", allTasks.length);
}

/**
 * Updates the urgent task counter.
 *
 * @param {Array} allTasks
 * List of all tasks.
 */
function updateUrgentCount(allTasks) {
  const urgentCount = allTasks.filter(isUrgent).length;
  setNumberAnimated("urgent-count", urgentCount);
}

/**
 * Updates the next upcoming deadline display.
 *
 * @param {Array} allTasks
 * List of all tasks.
 */
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

/**
 * Renders the board summary based on board data.
 *
 * @param {Object|null} board
 * Board data.
 */
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

let unsubscribeBoard = null;

/**
 * Starts live subscription to board data.
 */
function startBoardLiveSubscription() {
  unsubscribeBoard = window.dbApi.onData("board", (data) => {
    renderBoardSummary(data);
  });
}

/**
 * Stops the live board data subscription.
 */
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

/**
 * Initializes navigation button click handlers.
 */
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

/**
 * Initializes the summary page.
 */
async function initSummary() {
  await requireAuthSummary({ redirectTo: "/login.html" });
  initNavigation();
  setGreeting();
  scheduleGreetingRefresh();
  initLiveName();
  startBoardLiveSubscription();
}

/**
 * Cleans up summary-related resources.
 */
function cleanupSummary() {
  stopBoardLiveSubscription();
}

/**
 * Click-Events.
 */
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
