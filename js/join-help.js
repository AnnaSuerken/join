// join-help.js
// Verhalten:
// - Klick auf "?" (oben rechts) geht eine Seite zurück (wie der Back-Pfeil im Screenshot).
// - Falls keine History vorhanden ist, geht's zur contacts.html.

(function () {
  function back() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "./contacts.html";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.querySelector(".help-btn");
    if (btn) btn.addEventListener("click", back);
  });
})();

// join-help.js – EIN Overlay + EIN Text für alle Seiten
// Voraussetzungen: join-help.css eingebunden, Button hat Klasse .jh-help-btn
// Einbindung: <script src="./js/join-help.js"></script>
//             <script>document.addEventListener('DOMContentLoaded',()=>JoinHelp.init());</script>

const JoinHelp = (() => {
  const HELP_HTML = `
    <div class="jh-overlay" data-help="overlay"></div>
    <div class="jh-modal" role="dialog" aria-modal="true" aria-labelledby="jh-h1" data-help="modal">
      <div class="jh-head">
        <div class="jh-title">Kanban Project Management Tool <span style="opacity:.6;font-weight:600">Help</span></div>
        <button class="jh-close" type="button" aria-label="Close">✕</button>
      </div>
      <div class="jh-body">
        <h1 id="jh-h1">Help</h1>

        <p>Welcome to the help page for <a class="jh-link" href="./index.html">Join</a>, your guide to using our kanban project management tool. Here, we'll provide an overview of what <a class="jh-link" href="./index.html">Join</a> is, how it can benefit you, and how to use it.</p>

        <h2>What is Join?</h2>
        <p><a class="jh-link" href="./index.html">Join</a> is a kanban-based project management tool designed and built by a group of dedicated students as part of their web development bootcamp at the Developer Akademie.</p>
        <p>Kanban, a Japanese term meaning "billboard", is a highly effective method to visualize work, limit work-in-progress, and maximize efficiency (or flow). <a class="jh-link" href="./index.html">Join</a> leverages the principles of kanban to help users manage their tasks and projects in an intuitive, visual interface.</p>
        <p>It is important to note that <a class="jh-link" href="./index.html">Join</a> is designed as an educational exercise and is not intended for extensive business usage. While we strive to ensure the best possible user experience, we cannot guarantee consistent availability, reliability, accuracy, or other aspects of quality regarding <a class="jh-link" href="./index.html">Join</a>.</p>

        <h2>How to use it</h2>
        <p>Here is a step-by-step guide on how to use <a class="jh-link" href="./index.html">Join</a>:</p>

        <ol>
          <li><strong>Exploring the Board</strong><br>
            When you log in to <a class="jh-link" href="./login.html">Join</a>, you'll find a default board. This board represents your project and contains four default lists: "To Do", "In Progress", "Await feedback" and "Done".</li>
          <li><strong>Creating Contacts</strong><br>
            In <a class="jh-link" href="./contacts.html">Join</a>, you can add contacts to collaborate on your projects. Go to the "Contacts" section, click on "New contact", and fill in the required information. Once added, these contacts can be assigned tasks and they can interact with the tasks on the board.</li>
          <li><strong>Adding Cards</strong><br>
            Now that you've added your contacts, you can start adding cards. Cards represent individual tasks. Click the "+" button under the appropriate list to create a new card. Fill in the task details in the card, like task name, description, due date, assignees, etc.</li>
          <li><strong>Moving Cards</strong><br>
            As the task moves from one stage to another, you can reflect that on the board by dragging and dropping the card from one list to another.</li>
          <li><strong>Deleting Cards</strong><br>
            Once a task is completed, you can either move it to the "Done" list or delete it. Deleting a card will permanently remove it from the board. Please exercise caution when deleting cards, as this action is irreversible.</li>
        </ol>

        <p>Remember that using <a class="jh-link" href="./index.html">Join</a> effectively requires consistent updates from you and your team to ensure the board reflects the current state of your project.</p>
        <p>Have more questions about <a class="jh-link" href="./index.html">Join</a>? Feel free to contact us at [Your Contact Email]. We're here to help you!</p>

        <h2 style="margin-top:24px">Enjoy using Join!</h2>
      </div>
    </div>
  `;

  function ensureNodes(){
    if(document.querySelector('[data-help="modal"]')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = HELP_HTML;
    document.body.appendChild(wrap);

    const overlay = document.querySelector('[data-help="overlay"]');
    const modal   = document.querySelector('[data-help="modal"]');
    const close   = modal.querySelector('.jh-close');

    overlay.addEventListener('click', JoinHelp.close);
    close.addEventListener('click', JoinHelp.close);
    modal.addEventListener('click', e => e.stopPropagation());
    document.addEventListener('keydown', e => {
      if(e.key === 'Escape') JoinHelp.close();
    });
  }

  function open(){
    ensureNodes();
    document.querySelector('[data-help="overlay"]').classList.add('jh-visible');
    document.querySelector('[data-help="modal"]').classList.add('jh-visible');
  }
  function close(){
    const ov = document.querySelector('[data-help="overlay"]');
    const md = document.querySelector('[data-help="modal"]');
    if(ov) ov.classList.remove('jh-visible');
    if(md) md.classList.remove('jh-visible');
  }
  function init(){
    ensureNodes();
    const btns = document.querySelectorAll('.jh-help-btn, [data-help-open]');
    if(btns.length){
      btns.forEach(b => b.addEventListener('click', open));
    } else {
      // Fallback-FAB, falls eine Seite keinen Button hat
      const fab = document.createElement('button');
      fab.className = 'jh-help-btn jh-fab';
      fab.type = 'button';
      fab.textContent = '?';
      document.body.appendChild(fab);
      fab.addEventListener('click', open);
    }
  }

  return { init, open, close };
})();

