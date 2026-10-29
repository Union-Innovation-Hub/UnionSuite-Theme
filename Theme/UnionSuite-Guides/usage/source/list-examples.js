// Reference-only copy controls and honest feedback for fictional destinations.
(() => {
  const status = document.getElementById('list-reference-status');
  let timer;
  function announce(message) {
    status.textContent = message;
    clearTimeout(timer);
    timer = setTimeout(() => { status.textContent = ''; }, 5000);
  }
  // Only this reference wires the generated plus to a sample message.
  // Live task creation is configured separately by the site's existing handler.
  // The page also loads the site's definitions (for the task rows' title link
  // and pencil), so the sample replaces the site's Add task rather than
  // registering beside it, which would be a conflict.
  const actions = window.UnionSuiteActions;
  (actions.has('home.add-task') ? actions.configure : actions.define).call(actions, 'home.add-task', {
    className:'us-action-home-add-task',owner:'guide',source:'list-examples.js',
    presentation:{label:'Add task',icon:'plus',default:'button'},context:{},
    action:{type:'function',run:function () { announce('Add task — sample action. Connect your task editor in the live site.'); }}
  });
  document.addEventListener('click', async event => {
    const control = event.target.closest('[data-copy-text], [data-copy], a[href="#example"], a[href="#example-announcement"], a[href="#example-policy"]');
    if (!control) return;
    event.preventDefault();
    if (control.matches('a')) {
      announce(control.classList.contains('us-bulletin__link') ? 'Card link: ' + control.closest('.BulletinCard').querySelector('h3').textContent + ' (sample destination).' : 'Inline link — sample destination.');
      return;
    }
    const value = control.dataset.copyText || document.getElementById(control.dataset.copy).textContent;
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
      else {
        const field = document.createElement('textarea');
        field.value = value;
        field.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand('copy');
        field.remove();
        control.focus();
        if (!copied) throw Error('Clipboard unavailable');
      }
      announce(control.dataset.copyText ? 'Copied: ' + value : 'HTML template copied.');
    } catch (_) {
      announce('Copy unavailable in this browser. Select the class or HTML and copy it manually.');
    }
  });
})();
