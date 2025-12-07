const MAX_SPEED = 35; // maximale Scrollgeschwindigkeit (je höher, desto schneller)
const SCROLL_ZONE = 600; // Bereich in px (größer = Scroll startet früher)

let scrollRafId = null;
let scrollSpeed = 0;

function getScrollTarget() {
  const board = document.querySelector(".task");
  if (!board) return document.scrollingElement || document.documentElement;

  const canScrollBoard = board.scrollHeight - board.clientHeight > 10;
  return canScrollBoard ? board : document.scrollingElement;
}

function scrollStep(direction) {
  const target = getScrollTarget();

  if (scrollSpeed <= 0) {
    scrollRafId = null;
    return;
  }

  target.scrollTop += direction * scrollSpeed;

  scrollRafId = requestAnimationFrame(() => scrollStep(direction));
}

function calculateSpeed(distanceToEdge) {
  const ratio = 1 - distanceToEdge / SCROLL_ZONE; // 0 → 1
  return Math.min(MAX_SPEED, Math.max(5, ratio * MAX_SPEED));
}

function handleTouchMove(e) {
  if (!e.touches?.length) return;

  const touchY = e.touches[0].clientY;
  const h = window.innerHeight;

  const topZone = SCROLL_ZONE;
  const bottomZone = h - SCROLL_ZONE;

  // Finger oben → hoch scrollen
  if (touchY < topZone) {
    const dist = topZone - touchY;
    scrollSpeed = calculateSpeed(dist);
    if (!scrollRafId) scrollStep(-1);
    return;
  }

  // Finger unten → runter scrollen
  if (touchY > bottomZone) {
    const dist = touchY - bottomZone;
    scrollSpeed = calculateSpeed(dist);
    if (!scrollRafId) scrollStep(1);
    return;
  }

  // Finger in der Mitte → kein Scrollen
  stopAutoScroll();
}

function stopAutoScroll() {
  scrollSpeed = 0;
  if (scrollRafId) cancelAnimationFrame(scrollRafId);
  scrollRafId = null;
}

function initMobileAutoScroll() {
  const board = document.querySelector(".task-board");
  if (!board) return;

  const isTouch =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0;

  if (!isTouch) return;

  board.addEventListener("touchmove", handleTouchMove, { passive: true });
  board.addEventListener("touchend", stopAutoScroll);
  board.addEventListener("touchcancel", stopAutoScroll);
}

window.addEventListener("load", initMobileAutoScroll);
