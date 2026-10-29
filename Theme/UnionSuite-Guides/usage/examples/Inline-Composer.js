// Guide only: the stand-ins for what iMIS and CloudToolz do. The page read
// returns this list from `rows` (as iMIS renders the page again after a
// save), the save adds a row after a short wait, and the native popup is
// replaced by a status message that closes with the value chosen above.
(() => {
  const status = document.getElementById('demo-status');
  const template = window.composerDemoTemplate;
  let nextOrdinal = 503;
  const rows = [
    {TaskOrdinal: '501', TaskTitle: 'Call Alex about the roster change', TaskNote: 'Confirm the new start times.', IsCompleted: 'false', TaskDateLabel: 'Due 14/10/2026', MemberName: 'Alex Morgan', MemberId: '104019'},
    {TaskOrdinal: '502', TaskTitle: 'Send the meeting summary to HR', TaskNote: '', IsCompleted: 'false', TaskDateLabel: 'Due 16/10/2026', MemberName: 'Alex Morgan', MemberId: '104019'}
  ];

  function ipart() {
    const items = rows.map(record => '<section><div class="QueryTemplateItem">' +
      template.replace(/\{#query\.(\w+)\}/g, (_, key) => String(record[key] ?? '').replace(/[&<>"]/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[char]))) +
      '</div></section>').join('');
    return '<div id="composer-demo-ipart" class="ContentItemContainer"><div class="us-action-guide-add-task">' +
      '<div class="panel"><div class="panel-heading"><h2 class="panel-title">My tasks</h2></div>' +
      '<div class="panel-body-container"><div class="panel-body"><div class="QueryTemplateSet">' + items +
      '</div></div></div></div></div></div>';
  }
  document.getElementById('composer-demo').innerHTML = ipart();

  function addRow(task, due) {
    const ordinal = String(nextOrdinal++);
    rows.push({TaskOrdinal: ordinal, TaskTitle: task, TaskNote: '', IsCompleted: 'false',
      TaskDateLabel: due ? 'Due ' + due.split('-').reverse().map(part => String(Number(part))).join('/') : '', MemberName: 'Alex Morgan', MemberId: '104019'});
    return ordinal;
  }

  // The page read: the iPart as the server would render it now. The
  // sandboxed frame has no address of its own, so the composer reads
  // about:blank (pageUrl) and this answers instead.
  const fetchPage = window.fetch;
  window.fetch = async (url, options) => {
    if (url !== 'about:blank') return fetchPage(url, options);
    await new Promise(resolve => setTimeout(resolve, 900));
    return new Response('<!doctype html><body>' + ipart() + '</body>', {status: 200, headers: {'Content-Type': 'text/html'}});
  };

  // The native popup: reads the draft the way the popup page's theme would,
  // then closes with the value a form passes (POPUP-FORMS contract).
  window.ShowDialog_NoReturnValue = (href, args, width, height, title, icon, templateType, beforeClose, name, commit, preserve, close) => {
    const token = new URL(href, location.href).searchParams.get('usDraft');
    const draft = token ? UnionSuiteComposers.takeDraft(token) : null;
    const choice = document.getElementById('demo-popup-result').value;
    status.textContent = draft
      ? 'The full form opens filled in: Task “' + (draft.values.Task || '') + '”' + (draft.values.DueDate ? ', due ' + draft.values.DueDate : '') + '.'
      : 'The full form opens empty (no composer was open).';
    setTimeout(() => {
      if (choice === 'saved') {
        addRow(draft?.values.Task || 'Task added in the full form', draft?.values.DueDate);
        status.textContent += ' It saved: the task slides into the list and the composer clears.';
      } else if (choice === 'cancel') {
        status.textContent += ' It was cancelled: the composer is still there as typed.';
      } else {
        status.textContent += ' It closed with nothing passed: the list is read, and with no new row the composer stays.';
      }
      close?.(null, {get_argument: () => choice ? {[choice]: true} : null});
    }, 1200);
  };

  const today = () => {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  };

  UnionSuiteComposers.define('guide.add-task', {
    label: 'Add task',
    owner: 'guide', source: 'Inline-Composer.js',
    form: {href: 'https://example.invalid/Tasks_Create', title: 'Add task'},
    lists: () => ['us-action-guide-add-task'],
    arrive: 'bottom',
    pageUrl: 'about:blank',
    composer: {
      kind: 'task', label: 'New task', save: 'Save task', keepOpen: true,
      main: {type: 'text', name: 'Task', label: 'Task', placeholder: 'What needs doing…', required: 'Write the task first.'},
      fields: [{type: 'date', name: 'DueDate', label: 'Due date'}],
      confirm: values => values.DueDate && values.DueDate < today() ? 'That date has passed. Save the task anyway?' : null,
      submit: async values => {
        await new Promise(resolve => setTimeout(resolve, 600));
        if (document.getElementById('demo-save-fails').checked) throw new Error('Simulated failure.');
        return {Ordinal: addRow(values.Task, values.DueDate)};
      },
      saved: 'Task added.',
      failed: 'The task could not be added. Try again.'
    }
  });
})();
