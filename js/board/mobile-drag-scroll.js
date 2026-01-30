const EDGE_SIZE = 140;
const MAX_SPEED = 50;
const MIN_SPEED = 10;

let scrollDir = 0;
let scrollSpeed = 0;
let rafId = null;

window.addEventListener("load", initDragAutoScroll);

/**
 * Initializes global listeners for drag- and touch-based auto scrolling.
 */
function initDragAutoScroll() {
  document.addEventListener("dragover", onDragOver);
  document.addEventListener("touchmove", onTouchMove, { passive: true });
  bindStopEvents();
}

/**
 * Binds events that stop auto scrolling.
 */
function bindStopEvents() {
  ["dragend", "drop", "mouseleave", "touchend", "touchcancel"].forEach((t) => {
    document.addEventListener(t, stopAutoScroll);
  });
  window.addEventListener("blur", stopAutoScroll);
}

/**
 * Handles dragover events and updates scroll direction.
 *
 * @param {DragEvent} e
 */
function onDragOver(e) {
  if (!isDraggingTask()) return;
  if (typeof e.clientY !== "number") return;
  handleY(e.clientY);
}

/**
 * Handles touchmove events and updates scroll direction.
 *
 * @param {TouchEvent} e
 */
function onTouchMove(e) {
  if (!isDraggingTask()) return;
  const t = e.touches?.[0];
  if (!t) return;
  handleY(t.clientY);
}

/**
 * Evaluates the Y position and starts or stops auto scrolling.
 *
 * @param {number} clientY
 * Vertical pointer position.
 */
function handleY(clientY) {
  if (!isDraggingTask()) return stopAutoScroll();
  const { topZone, bottomZone } = getZones();

  if (clientY < topZone) return setScroll(-1, (topZone - clientY) / EDGE_SIZE);
  if (clientY > bottomZone) return setScroll(1, (clientY - bottomZone) / EDGE_SIZE);

  stopAutoScroll();
}

/**
 * Calculates the top and bottom edge zones.
 */
function getZones() {
  const h = window.innerHeight;
  return { topZone: EDGE_SIZE, bottomZone: h - EDGE_SIZE };
}

/**
 * Activates auto scrolling.
 *
 * @param {-1|1} dir
 * Scroll direction.
 * @param {number} intensity
 * Normalized distance to edge (0–1+).
 */
function setScroll(dir, intensity) {
  scrollDir = dir;
  scrollSpeed = clampSpeed(MIN_SPEED + clamp01(intensity) * (MAX_SPEED - MIN_SPEED));
  if (!rafId) rafId = requestAnimationFrame(stepScroll);
}

/**
 * Performs one scroll animation frame.
 */
function stepScroll() {
  if (!scrollDir || !isDraggingTask()) return stopAutoScroll();
  getScrollTarget().scrollTop += scrollDir * scrollSpeed;
  rafId = requestAnimationFrame(stepScroll);
}

/**
 * Stops auto scrolling and resets state.
 */
function stopAutoScroll() {
  scrollDir = 0;
  scrollSpeed = 0;
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
}

/**
 * Finds the best scrollable container.
 */
function getScrollTarget() {
  const candidates = [
    document.querySelector(".task-board"),
    document.querySelector(".content-right"),
    document.scrollingElement || document.documentElement,
  ];
  return candidates.find(canScroll) || document.scrollingElement || document.documentElement;
}

/**
 * Checks whether an element can scroll vertically.
 *
 * @param {HTMLElement} el
 */
function canScroll(el) {
  return el && el.scrollHeight - el.clientHeight > 5;
}

/**
 * Determines whether a task card is currently being dragged.
 */
function isDraggingTask() {
  return !!document.querySelector(".task.dragging");
}

/**
 * Clamps a value between 0 and 1.
 *
 * @param {number} x
 */
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

/**
 * Clamps scroll speed to allowed min/max.
 *
 * @param {number} x
 */
function clampSpeed(x) {
  return Math.max(MIN_SPEED, Math.min(MAX_SPEED, x));
}
