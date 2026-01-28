/**
 * Generates the HTML template for the "Add new contact" button.
 *
 */
export function addButtonTemplate() {
  return `
    <div class="list-head">
      <button class="btn" id="openAddModal" type="button">
        Add new contact ▾
      </button>
    </div>
  `;
}
