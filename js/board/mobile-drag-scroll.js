// === Einstellungen ===
const SCROLL_SPEED = 8; // Scroll-Geschwindigkeit
const SCROLL_AREA = 80; // Bereich oben/unten in px, der Auto-Scroll aktiviert

let scrollInterval = null;

// Den Container auswählen, der gescrollt werden soll
const scrollContainer = document.querySelector(".board-container");
// ❗ Ändere die Klasse auf deinen echten Wrapper: z.B. .board, .columns-wrapper, etc.

// === Auto-Scroll starten ===
function startAutoScroll(direction) {
  stopAutoScroll(); // doppelte Intervalle verhindern
  scrollInterval = setInterval(() => {
    scrollContainer.scrollTop += direction * SCROLL_SPEED;
  }, 16); // 60fps
}

// === Auto-Scroll stoppen ===
function stopAutoScroll() {
  if (scrollInterval) {
    clearInterval(scrollInterval);
    scrollInterval = null;
  }
}

// === Touch-Move überwachen ===
function onTouchMove(e) {
  if (!e.touches?.length) return;
  const touchY = e.touches[0].clientY;
  const rect = scrollContainer.getBoundingClientRect();

  const topZone = rect.top + SCROLL_AREA;
  const bottomZone = rect.bottom - SCROLL_AREA;

  if (touchY < topZone) {
    // Finger oben → nach oben scrollen
    startAutoScroll(-1);
  } else if (touchY > bottomZone) {
    // Finger unten → nach unten scrollen
    startAutoScroll(1);
  } else {
    // Finger ist mittig → Auto-Scroll stoppen
    stopAutoScroll();
  }
}

// === Events binden ===
scrollContainer.addEventListener("touchmove", onTouchMove, { passive: false });
scrollContainer.addEventListener("touchend", stopAutoScroll);
scrollContainer.addEventListener("touchcancel", stopAutoScroll);
