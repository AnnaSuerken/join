/**
 * board/dom-events.js
 * Delegate + Outside click helper.
 */

export function onClickDelegate(root, sel, fn) {
  root.addEventListener("click", (e) => {
    const el = e.target.closest(sel);
    if (el) fn(e, el);
  });
}

export function onOutsideClick(root, sel, guard, fn) {
  root.addEventListener("click", (e) => {
    if (!guard()) return;
    if (!e.target.closest(sel)) fn();
  });
}
