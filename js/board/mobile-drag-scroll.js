/**
 * board/mobile-drag-scroll.js
 * Auto-Scroll beim Dragging in Rand-Zonen (Desktop+Mobile).
 */

const EDGE_SIZE = 140;
const MAX_SPEED = 50;
const MIN_SPEED = 10;

let scrollDir = 0;
let scrollSpeed = 0;
let rafId = null;

window.addEventListener("load", initDragAutoScroll);

function initDragAutoScroll() {
  document.addEventListener("dragover", onDragOver);
  document.addEventListener("touchmove", onTouchMove, { passive: true });
  bindStopEvents();
}

function bindStopEvents() {
  ["dragend", "drop", "mouseleave", "touchend", "touchcancel"].forEach((t) => {
    document.addEventListener(t, stopAutoScroll);
  });
  window.addEventListener("blur", stopAutoScroll);
}

function onDragOver(e) {
  if (!isDraggingTask()) return;
  if (typeof e.clientY !== "number") return;
  handleY(e.clientY);
}

function onTouchMove(e) {
  if (!isDraggingTask()) return;
  const t = e.touches?.[0];
  if (!t) return;
  handleY(t.clientY);
}

function handleY(clientY) {
  if (!isDraggingTask()) return stopAutoScroll();
  const { topZone, bottomZone } = getZones();

  if (clientY < topZone) return setScroll(-1, (topZone - clientY) / EDGE_SIZE);
  if (clientY > bottomZone) return setScroll(1, (clientY - bottomZone) / EDGE_SIZE);

  stopAutoScroll();
}

function getZones() {
  const h = window.innerHeight;
  return { topZone: EDGE_SIZE, bottomZone: h - EDGE_SIZE };
}

function setScroll(dir, intensity) {
  scrollDir = dir;
  scrollSpeed = clampSpeed(MIN_SPEED + clamp01(intensity) * (MAX_SPEED - MIN_SPEED));
  if (!rafId) rafId = requestAnimationFrame(stepScroll);
}

function stepScroll() {
  if (!scrollDir || !isDraggingTask()) return stopAutoScroll();
  getScrollTarget().scrollTop += scrollDir * scrollSpeed;
  rafId = requestAnimationFrame(stepScroll);
}

function stopAutoScroll() {
  scrollDir = 0;
  scrollSpeed = 0;
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
}

function getScrollTarget() {
  const candidates = [
    document.querySelector(".task-board"),
    document.querySelector(".content-right"),
    document.scrollingElement || document.documentElement,
  ];
  return candidates.find(canScroll) || document.scrollingElement || document.documentElement;
}

function canScroll(el) {
  return el && el.scrollHeight - el.clientHeight > 5;
}

function isDraggingTask() {
  return !!document.querySelector(".task.dragging");
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function clampSpeed(x) {
  return Math.max(MIN_SPEED, Math.min(MAX_SPEED, x));
}
