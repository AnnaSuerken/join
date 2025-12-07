// js/board/mobile-drag-scroll.js

/**
 * Auto-Scroll beim Draggen von Tasks (.task.dragging)
 * - funktioniert auf Desktop (dragover) und Mobile (touchmove)
 * - nutzt die vorhandene Klasse .dragging aus board.js
 */

const EDGE_SIZE = 140; // Randbereich in px oben/unten
const MAX_SPEED = 50; // maximale Scrollgeschwindigkeit (sehr schnell)
const MIN_SPEED = 10; // minimale Geschwindigkeit

let scrollDir = 0; // -1 = hoch, 1 = runter
let scrollSpeed = 0;
let scrollRafId = null;

/* ----------------- Helper ----------------- */

function isDraggingTask() {
  return !!document.querySelector(".task.dragging");
}

/**
 * Wählt den besten Scroll-Container:
 * 1) .task-board, wenn sie scrollbar ist
 * 2) .content-right, wenn die scrollbar ist
 * 3) ansonsten Dokument
 */
function getScrollTarget() {
  const candidates = [
    document.querySelector(".task-board"),
    document.querySelector(".content-right"),
    document.scrollingElement || document.documentElement,
  ];

  for (const el of candidates) {
    if (!el) continue;
    const canScroll = el.scrollHeight - el.clientHeight > 5;
    if (canScroll) return el;
  }

  return document.scrollingElement || document.documentElement;
}

function stopAutoScroll() {
  scrollDir = 0;
  scrollSpeed = 0;
  if (scrollRafId !== null) {
    cancelAnimationFrame(scrollRafId);
    scrollRafId = null;
  }
}

function stepScroll() {
  if (!scrollDir || !isDraggingTask()) {
    stopAutoScroll();
    return;
  }

  const el = getScrollTarget();
  el.scrollTop += scrollDir * scrollSpeed;

  scrollRafId = requestAnimationFrame(stepScroll);
}

/**
 * direction: -1 (hoch) oder 1 (runter)
 * intensity: 0..1 wie nah am Rand
 */
function setScroll(direction, intensity) {
  scrollDir = direction;

  const speed = MIN_SPEED + intensity * (MAX_SPEED - MIN_SPEED);
  scrollSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed));

  if (!scrollRafId) {
    scrollRafId = requestAnimationFrame(stepScroll);
  }
}

/**
 * Nimmt eine clientY-Position und entscheidet,
 * ob oben / unten gescrollt wird und wie stark.
 */
function handleY(clientY) {
  if (!isDraggingTask()) {
    stopAutoScroll();
    return;
  }

  const h = window.innerHeight;
  const topZone = EDGE_SIZE;
  const bottomZone = h - EDGE_SIZE;

  // oberer Rand
  if (clientY < topZone) {
    const dist = topZone - clientY; // 0 .. EDGE_SIZE
    const intensity = Math.min(1, dist / EDGE_SIZE);
    setScroll(-1, intensity);
    return;
  }

  // unterer Rand
  if (clientY > bottomZone) {
    const dist = clientY - bottomZone;
    const intensity = Math.min(1, dist / EDGE_SIZE);
    setScroll(1, intensity);
    return;
  }

  // Mitte -> kein Scrollen
  stopAutoScroll();
}

/* ----------------- Desktop: dragover ----------------- */

function onDragOver(e) {
  if (!isDraggingTask()) return;
  if (typeof e.clientY !== "number") return;
  handleY(e.clientY);
}

/* ----------------- Mobile: touchmove ----------------- */

function onTouchMove(e) {
  if (!isDraggingTask()) return;
  if (!e.touches || !e.touches.length) return;
  const touch = e.touches[0];
  handleY(touch.clientY);
}

/* ----------------- Drag-End-Events ----------------- */

function onDragEndOrCancel() {
  stopAutoScroll();
}

/* ----------------- Init ----------------- */

function initDragAutoScroll() {
  // Desktop: während HTML5-Drag laufen dragover-Events
  document.addEventListener("dragover", onDragOver);

  // Mobile: deine board.js macht eigenes touch-Dragging mit .dragging
  document.addEventListener("touchmove", onTouchMove, { passive: true });

  // Drag-End auf Desktop
  document.addEventListener("dragend", onDragEndOrCancel);
  document.addEventListener("drop", onDragEndOrCancel);
  document.addEventListener("mouseleave", onDragEndOrCancel);
  window.addEventListener("blur", onDragEndOrCancel);

  // Drag-End auf Mobile
  document.addEventListener("touchend", onDragEndOrCancel);
  document.addEventListener("touchcancel", onDragEndOrCancel);
}

window.addEventListener("load", initDragAutoScroll);
