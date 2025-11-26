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
    // 🔴 Hier angepasst: Firebase-Feld heißt "await"
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

function animateCounter(element, target, duration = 200) {
  if (!element) return;

  const currentText = (element.textContent || "").replace(/[^\d-]/g, "");
  const start = Number.isFinite(parseInt(currentText, 10))
    ? parseInt(currentText, 10)
    : 0;
  const end = Number(target) || 0;

  const diff = end - start;
  if (diff === 0) {
    element.textContent = end;
    return;
  }

  // kleine dynamische Anpassung: große Sprünge dauern minimal länger
  const baseDuration = duration;
  const extra = Math.min(Math.abs(diff) * 20, 600); // max +600ms
  const totalDuration = baseDuration + extra;

  const startTime = performance.now();

  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / totalDuration, 1); // 0..1
    const value = Math.round(start + diff * progress);
    element.textContent = value;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = end; // sicherheitshalber
    }
  }

  requestAnimationFrame(update);
}

function setNumberAnimated(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  animateCounter(el, value);
}

/* ---------------------------------------------------------- */

function renderBoardSummary(board) {
  if (!board) {
    // auch bei leerem Board animiert von aktuellem Wert auf 0
    setNumberAnimated("summary-task-todo-number", 0);
    setNumberAnimated("summary-task-done-number", 0);
    setNumberAnimated("allTasks", 0);
    setNumberAnimated("inProgress", 0);
    setNumberAnimated("awaitingFeedback", 0);
    setNumberAnimated("urgent-count", 0);
    setText("next-deadline", "–");
    return;
  }

  const { todo, inProgress, done, awaiting } = normalizeBoard(board);
  const allTasks = [...todo, ...inProgress, ...done, ...awaiting];

  setNumberAnimated("summary-task-todo-number", todo.length);
  setNumberAnimated("summary-task-done-number", done.length);
  setNumberAnimated("inProgress", inProgress.length);
  setNumberAnimated("awaitingFeedback", awaiting.length);
  setNumberAnimated("allTasks", allTasks.length);

  // Urgent (über alle Spalten)
  const urgentCount = allTasks.filter(isUrgent).length;
  setNumberAnimated("urgent-count", urgentCount);


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
  // dbApi.onData gibt eine Unsubscribe-Funktion zurück
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
