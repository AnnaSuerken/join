/**
 * board/index.js
 * Entry: importiert alle Module, initialisiert Board.
 */

import { requireAuth } from "../core/auth-guard.js";
import { initAddTaskOverlayBindings } from "./addtask-overlay.js";
import { initListeners } from "./listeners.js";
import { initSearch } from "./render.js";
import { initDropzonesDesktop } from "./dnd-desktop.js";
import { initDragTouchSupport } from "./dnd-touch.js";
import { initDetailBindings } from "./detail.js";
import { initEditBindings } from "./edit.js";
import "./mobile-drag-scroll.js";

await requireAuth({ redirectTo: "/login.html" });

initAddTaskOverlayBindings();
initDetailBindings();
initEditBindings();

initListeners();
initSearch();
initDropzonesDesktop();
initDragTouchSupport();
