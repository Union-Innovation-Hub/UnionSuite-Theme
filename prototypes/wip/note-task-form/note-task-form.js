/* Note and task form mock-up (owner, 18 November 2026). Draws the form into
   a shadow root with the forms runtime's stylesheet and this mock-up's
   additions, then answers every control on sample data. Nothing saves:
   Save and Cancel write what would be sent, logged and closed into the
   notes column. */
(function () {
  'use strict';

  // ── Sample data ──────────────────────────────────────────────

  const RECORDS = {
    case: {id: 'C217', ordinal: '214', word: 'case', label: 'Case C217', name: 'Priya Sharma: show cause'}
  };
  const ME = {id: '104002', name: 'James Driscoll'};
  const STAFF = [ME, {id: '104118', name: 'Sam Carter'}, {id: '104140', name: 'Chris Tan'}];
  const TAGS = [
    {value: '3', name: 'Representation'},
    {value: '4', name: 'Evidence'},
    {value: '5', name: 'Correspondence'},
    {value: '6', name: 'Discrimination'}
  ];
  const SUBTAGS = [
    {value: '31', parent: '3', name: 'Meeting prep'},
    {value: '32', parent: '3', name: 'Hearing'},
    {value: '41', parent: '4', name: 'Witness statement'},
    {value: '51', parent: '5', name: 'Letter'},
    {value: '61', parent: '6', name: 'Age'}
  ];
  // Attachments keep their own tags (owner, 18 November 2026): the
  // attachment tag list (GET /cases/quick-add/AttachmentTagList, as Upload
  // reads it), not the note tags above.
  const ATTACHMENT_TAGS = [
    {value: '12', name: 'Letter of demand'},
    {value: '13', name: 'Documentation'},
    {value: '14', name: 'Forms'},
    {value: '15', name: 'Minutes'},
    {value: '16', name: 'Contracts'}
  ];
  // One save per module (owner, 18 November 2026); the case one matches the
  // Create case and Resolve case forms' /Cases/US/… flows.
  // Agreements are parked (owner, 18 November 2026); theirs would link by
  // AgreementOrdinal.
  const SAVE_PATH = {case: '/cases/US/note'};
  const ACCESS = {
    Open: {icon: 'world', text: word => 'Standard. Anyone who can see this ' + word + ' can read the note.'},
    Team: {icon: 'users', text: word => 'Only the ' + word + ' team, managers and system administrators can read the note.'},
    Individual: {icon: 'lock', text: word => 'Only the staff assigned to this ' + word + ', managers and system administrators can read the note.'}
  };

  // A saved note and a saved task, for Edit.
  const SAVED = {
    note: {
      Ordinal: '9902', Kind: 'note', Title: '',
      Note: 'Rang Priya. She has the allegations letter and wants to meet before Thursday.',
      ActionedNotes: '', DueDate: '', DueTime: '', AssignTo: '', HighPriority: false, Completed: false,
      Tags: ['5'], Subtags: ['51'], Access: 'Team',
      Files: [{name: 'Allegations letter.pdf', size: '182 KB', tags: ['12']}],
      added: 'Added by Sam Carter on 12 November 2026'
    },
    task: {
      Ordinal: '9874', Kind: 'task', Title: 'Prepare Priya for the show cause meeting',
      Note: 'Go through the allegations letter with her.',
      ActionedNotes: '', DueDate: '2026-11-20', DueTime: '14:30', AssignTo: '104118', HighPriority: true, Completed: false,
      Tags: ['3'], Subtags: ['31'], Access: 'Open', Files: [],
      added: 'Added by James Driscoll on 15 October 2026'
    }
  };

  const blank = kind => ({
    Ordinal: '', Kind: kind, Title: '', Note: '', ActionedNotes: '', DueDate: '', DueTime: '',
    AssignTo: kind === 'task' ? ME.id : '', HighPriority: false, Completed: false,
    Tags: [], Subtags: [], Access: 'Open', Files: [], added: ''
  });

  // ── Icons (inline, as the runtime draws them) ────────────────

  const PATHS = {
    case: 'M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13a20 20 0 0 0 18 0',
    note: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 8h8M8 12h8M8 16h5',
    task: 'M9 11l3 3 8-8M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9',
    flag: 'M5 5a5 5 0 0 1 7 0 5 5 0 0 0 7 0v9a5 5 0 0 1-7 0 5 5 0 0 0-7 0V5zM5 21v-7',
    plus: 'M12 5v14M5 12h14',
    x: 'M18 6 6 18M6 6l12 12',
    chevron: 'm6 9 6 6 6-6',
    check: 'm5 12 5 5L20 7',
    clock: 'M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 7v5l3 3',
    upload: 'M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 9l5-5 5 5M12 4v12',
    file: 'M14 3v4a1 1 0 0 0 1 1h4M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z',
    world: 'M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0M3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18',
    users: 'M5 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.85',
    lock: 'M5 13a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM8 11V7a4 4 0 1 1 8 0v4'
  };
  const icon = (name, filled) =>
    '<svg class="usf-icon' + (filled ? ' usf-icon--filled' : '') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + PATHS[name] + '"></path></svg>';
  const esc = value => String(value ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);

  // ── Page state (the toolbar) ─────────────────────────────────

  const query = new URLSearchParams(location.search);
  const pick = (name, allowed) => allowed.includes(query.get(name)) ? query.get(name) : allowed[0];
  const page = {
    module: pick('module', ['case']),
    mode: pick('mode', ['add', 'edit']),
    type: pick('type', ['note', 'task']),
    scheme: pick('scheme', ['light', 'dark'])
  };

  let host;
  let root;
  let values;
  let original;
  let detailsOpen;
  let timeShown;

  // ── Drawing ──────────────────────────────────────────────────

  const record = () => RECORDS[page.module];

  function selectHtml(name, label, chosen) {
    return '<div class="usf__field" data-field="' + name + '">' +
      '<span class="usf__label" id="nt-' + name + '-label">' + label + ' <span class="usf__optional">(optional)</span></span>' +
      '<div class="usf__select" data-select="' + name + '" aria-labelledby="nt-' + name + '-label">' +
      '<div class="usf__control">' + chipsHtml(name, chosen) +
      '<button type="button" class="usf__toggle" aria-haspopup="listbox" aria-expanded="false" aria-label="' + label + '"><span></span>' + icon('chevron') + '</button>' +
      '</div><div class="usf__panel" role="listbox" hidden></div></div></div>';
  }

  const fileIndex = name => name.startsWith('FileTags-') ? Number(name.slice(9)) : -1;
  function chosenFor(name) {
    const index = fileIndex(name);
    if (index >= 0) return values.Files[index].tags;
    return name === 'AssignTo' ? values.AssignTo : values[name];
  }

  function optionsFor(name) {
    if (fileIndex(name) >= 0) return ATTACHMENT_TAGS;
    if (name === 'AssignTo') return STAFF.map(person => ({value: person.id, name: person.name}));
    if (name === 'Tags') return TAGS;
    return SUBTAGS.filter(sub => values.Tags.includes(sub.parent));
  }

  function chipsHtml(name, chosen) {
    const list = [].concat(chosen).filter(Boolean);
    if (!list.length) return '<span class="usf__empty">Choose…</span>';
    return list.map(value => {
      const option = (name === 'Subtags' ? SUBTAGS : optionsFor(name)).find(item => item.value === value);
      if (!option) return '';
      const parent = name === 'Subtags' ? '<span class="usf__option-parent">' + esc(TAGS.find(tag => tag.value === option.parent)?.name) + ' ›&nbsp;</span>' : '';
      return '<span class="usf__chip">' + parent + esc(option.name) +
        '<button type="button" class="usf__chip-remove" data-remove="' + value + '" aria-label="Remove ' + esc(option.name) + '">' + icon('x') + '</button></span>';
    }).join('');
  }

  // A new attachment picks its tags here; a saved one shows them (they change
  // through the attachment's own quick edit).
  function filesHtml() {
    return values.Files.map((file, index) => {
      const head = '<div class="usf__file-head">' + icon('file') + '<span class="usf__file-name">' + esc(file.name) + '</span>' +
        '<span class="usf__file-size">' + esc(file.size) + '</span>' +
        (file.added ? '<button type="button" class="usf__chip-remove" data-remove-file="' + index + '" aria-label="Remove ' + esc(file.name) + '">' + icon('x') + '</button>' : '') +
        '</div>';
      // A new file's tags wait behind Add tags, as Details does on a task
      // (owner, 18 November 2026); they stay open once opened or chosen.
      const picker = file.tagsOpen || file.tags.length
        ? selectHtml('FileTags-' + index, 'File tags', file.tags)
        : '<button type="button" class="usf__link" data-add-file-tags="' + index + '">' + icon('plus') + ' Add tags</button>';
      const tags = file.added
        ? picker
        : '<div class="usf__file-tags">' + file.tags.map(value =>
          '<span class="usf__chip">' + esc(ATTACHMENT_TAGS.find(tag => tag.value === value)?.name) + '</span>').join('') + '</div>';
      return '<li class="usf__file">' + head + tags + '</li>';
    }).join('');
  }

  function formHtml() {
    const rec = record();
    const recordLine = icon(page.module) + '<span class="usf__record-text"><strong>' + rec.label + '</strong> · ' + esc(rec.name) + '</span>';
    // A saved task stays a task (owner, 18 November 2026): no choice once it
    // is saved. A saved note can still be given follow-up.
    const locked = page.mode === 'edit' && original.Kind === 'task';
    const kind = locked ? '' :
      '<div class="usf__kind" role="radiogroup" aria-label="Note or task">' +
      '<button type="button" role="radio" data-kind="note">' + icon('note') + 'Note</button>' +
      '<button type="button" role="radio" data-kind="task">' + icon('task') + 'Task</button></div>';
    const assign = selectHtml('AssignTo', 'Assign to', values.AssignTo);
    const extras =
      '<div class="usf__section">' +
      '<div class="usf__field" data-field="Files"><span class="usf__label">Attachments <span class="usf__optional">(optional)</span></span>' +
      '<div class="usf__drop"><span class="usf__drop-text">' + icon('upload') + '<span>Drop files here or <button type="button" data-choose-files>choose files</button></span></span><span>Up to 20 MB each</span></div>' +
      '<ul class="usf__files" data-files></ul></div>' +
      '<div class="usf__field" data-field="Access"><label class="usf__label" for="nt-access">Access</label>' +
      '<div class="usf__access"><select class="usf__native" id="nt-access" data-name="Access">' +
      Object.keys(ACCESS).map(level => '<option value="' + level + '">' + level + '</option>').join('') +
      '</select><p class="usf__access-hint" aria-live="polite" data-access-hint></p></div></div>' +
      '</div>';

    return '<div class="usf" data-form="note-task" data-mode="' + page.mode + '">' +
      '<div class="usf__body">' +
      '<div class="usf__top"><p class="usf__record">' + recordLine + '</p>' + kind + '</div>' +

      '<div class="usf__reveal" data-reveal="title"><div>' +
      '<div class="usf__field" data-field="Title">' +
      '<div class="usf__head"><label class="usf__label" for="nt-title-input">What needs doing? <span class="usf__required" aria-hidden="true">*</span></label><span class="usf__badge" aria-hidden="true">High Priority</span></div>' +
      '<div class="usf__title-row"><input class="usf__input usf__input--large" id="nt-title-input" type="text" autocomplete="off" data-name="Title" placeholder="e.g. Send the revised log of claims to HR" aria-required="true">' +
      '<button type="button" class="usf__flag" aria-pressed="false" aria-label="High priority" title="High priority" data-flag>' + icon('flag') + icon('flag', true) + '</button></div>' +
      '<p class="usf__error" data-error="Title" hidden></p>' +
      '<button type="button" class="usf__link" data-add-details>' + icon('plus') + ' Add details</button>' +
      '</div></div></div>' +

      '<div class="usf__reveal" data-reveal="note"><div>' +
      '<div class="usf__field" data-field="Note">' +
      '<label class="usf__label" for="nt-note"><span data-note-label></span> <span class="usf__required" aria-hidden="true" data-note-required>*</span><span class="usf__optional" data-note-optional>(optional)</span></label>' +
      '<textarea class="usf__textarea" id="nt-note" data-name="Note"></textarea>' +
      '<p class="usf__error" data-error="Note" hidden></p>' +
      '</div></div></div>' +

      '<div class="usf__reveal" data-reveal="when"><div>' +
      '<div class="usf__row" data-row="when">' +
      '<div class="usf__field" data-field="DueDate"><label class="usf__label" for="nt-due">Due date <span class="usf__optional">(optional)</span></label>' +
      '<div class="usf__due"><input class="usf__input" id="nt-due" type="date" data-name="DueDate">' +
      '<input class="usf__input usf__time" type="time" step="900" data-name="DueTime" aria-label="Due time (optional)" hidden></div>' +
      '<div class="usf__quick" role="group" aria-label="Quick dates"><button type="button" data-days="0">Today</button><button type="button" data-days="1">Tomorrow</button><button type="button" data-days="7">In a week</button>' +
      '<button type="button" class="usf__quiet" data-add-time hidden>' + icon('clock') + ' Add time</button>' +
      '<button type="button" class="usf__quiet" data-clear-date hidden>' + icon('x') + ' Clear date</button></div></div>' +
      assign +
      '</div></div></div>' +

      '<div class="usf__row" data-row="tags">' + selectHtml('Tags', 'Tags', values.Tags) +
      '<div class="usf__reveal" data-reveal="Subtags"><div>' + selectHtml('Subtags', 'Subtags', values.Subtags) + '</div></div></div>' +

      '<div class="usf__reveal" data-reveal="done"><div>' +
      '<div class="usf__row" data-row="done">' +
      '<label class="usf__check" data-field="Completed"><input type="checkbox" data-name="Completed"><span class="usf__box" aria-hidden="true">' + icon('check') + '</span>Completed</label>' +
      '<p class="usf__meta">' + esc(values.added) + '</p>' +
      '<div class="usf__reveal usf__done-notes" data-reveal="actioned"><div>' +
      '<div class="usf__field usf__field--inset" data-field="ActionedNotes"><label class="usf__label" for="nt-actioned">What was done <span class="usf__optional">(optional)</span></label>' +
      '<textarea class="usf__textarea usf__textarea--short" id="nt-actioned" data-name="ActionedNotes" placeholder="What you did, and anything the next person should know…"></textarea></div>' +
      '</div></div>' +
      '</div></div></div>' +

      extras +
      '<p class="usf__alert" role="alert" data-alert hidden></p>' +
      '</div>' +
      '<footer class="usf__foot"><span class="usf__hint"><kbd>Ctrl</kbd> + <kbd>Enter</kbd> to save</span>' +
      '<button type="button" class="usf__button" data-cancel>Cancel</button>' +
      '<button type="button" class="usf__button usf__button--primary" data-save></button></footer>' +
      '</div>';
  }

  // ── Keeping the drawn form in step with the values ───────────

  const $ = selector => root.querySelector(selector);
  // A reveal clips while it moves and lets dropdowns overflow once settled
  // open (the runtime's data-settled).
  function reveal(name, open) {
    const node = root.querySelector('[data-reveal="' + name + '"]');
    if (!node) return;
    const wasOpen = !node.hasAttribute('data-closed');
    node.toggleAttribute('data-closed', !open);
    if (open && wasOpen) return;
    node.removeAttribute('data-settled');
    if (open) setTimeout(() => { if (!node.hasAttribute('data-closed')) node.setAttribute('data-settled', ''); }, 240);
  }

  function fillInputs() {
    $('[data-name="Title"]').value = values.Title;
    $('[data-name="Note"]').value = values.Note;
    $('[data-name="DueDate"]').value = values.DueDate;
    $('[data-name="DueTime"]').value = values.DueTime;
    $('[data-name="Completed"]').checked = values.Completed;
    $('[data-name="ActionedNotes"]').value = values.ActionedNotes;
    const access = $('[data-name="Access"]');
    if (access) access.value = values.Access;
  }

  function sync() {
    const task = values.Kind === 'task';
    const editing = page.mode === 'edit';
    root.querySelectorAll('[data-kind]').forEach(button => button.setAttribute('aria-checked', String(button.dataset.kind === values.Kind)));
    reveal('title', task);
    reveal('note', !task || detailsOpen);
    reveal('when', task);
    reveal('done', task && editing);
    reveal('actioned', values.Completed || !!values.ActionedNotes.trim());
    reveal('Subtags', values.Tags.length > 0);
    $('[data-add-details]').hidden = !task || detailsOpen;

    // The one Note column: a note's text, a task's details.
    $('[data-note-label]').textContent = task ? 'Details' : 'Note';
    $('[data-note-required]').hidden = task;
    $('[data-note-optional]').hidden = !task;
    const note = $('[data-name="Note"]');
    note.placeholder = task ? 'Anything the person doing it needs to know…' : 'What happened, what was said or agreed…';
    note.classList.toggle('usf__textarea--short', task);
    note.setAttribute('aria-required', String(!task));

    // The due time, as the runtime has it: Add time once there is a date,
    // in 15-minute steps; clearing the date clears the time.
    if (!values.DueDate) {
      values.DueTime = '';
      timeShown = false;
    }
    const time = $('[data-name="DueTime"]');
    time.value = values.DueTime;
    time.hidden = !timeShown;
    $('[data-add-time]').hidden = !values.DueDate || timeShown;
    $('[data-clear-date]').hidden = !values.DueDate;

    $('.usf').toggleAttribute('data-flagged', task && values.HighPriority);
    $('[data-flag]').setAttribute('aria-pressed', String(values.HighPriority));
    root.querySelector('[data-field="Title"]').toggleAttribute('data-done', values.Completed);

    const files = $('[data-files]');
    if (files) files.innerHTML = filesHtml();
    const hint = $('[data-access-hint]');
    if (hint) {
      const level = ACCESS[values.Access];
      hint.innerHTML = icon(level.icon) + '<span>' + esc(level.text(record().word)) + '</span>';
    }

    $('[data-save]').textContent = editing ? 'Save changes' : task ? 'Save task' : 'Save note';
    document.getElementById('nt-title').textContent =
      (editing ? 'Edit ' : 'Add ') + (task ? 'task' : 'note');
    syncAddress();
  }

  function redrawSelect(name) {
    const chosen = chosenFor(name);
    const control = root.querySelector('[data-select="' + name + '"] .usf__control');
    control.querySelectorAll('.usf__chip, .usf__empty').forEach(node => node.remove());
    control.insertAdjacentHTML('afterbegin', chipsHtml(name, chosen));
  }

  // ── Dropdowns ────────────────────────────────────────────────

  function closePanels(except) {
    root.querySelectorAll('.usf__select').forEach(select => {
      if (select === except) return;
      select.querySelector('.usf__panel').hidden = true;
      select.querySelector('.usf__toggle').setAttribute('aria-expanded', 'false');
    });
  }

  function openPanel(select) {
    const name = select.dataset.select;
    const panel = select.querySelector('.usf__panel');
    if (!panel.hidden) { closePanels(); return; }
    closePanels(select);
    const chosen = [].concat(chosenFor(name)).filter(Boolean);
    const options = optionsFor(name).filter(option => name === 'AssignTo' || !chosen.includes(option.value));
    panel.innerHTML = options.length
      ? options.map(option => {
        const parent = option.parent ? '<span class="usf__option-parent">' + esc(TAGS.find(tag => tag.value === option.parent)?.name) + ' ›&nbsp;</span>' : '';
        return '<button type="button" class="usf__option" role="option" aria-selected="' + chosen.includes(option.value) + '" data-option="' + option.value + '">' + parent + esc(option.name) + '</button>';
      }).join('')
      : '<p class="usf__empty">No more to choose.</p>';
    panel.hidden = false;
    select.querySelector('.usf__toggle').setAttribute('aria-expanded', 'true');
  }

  function choose(name, value) {
    if (name === 'AssignTo') values.AssignTo = value;
    else if (!chosenFor(name).includes(value)) chosenFor(name).push(value);
    redrawSelect(name);
    sync();
  }

  function unchoose(name, value) {
    if (name === 'AssignTo') values.AssignTo = '';
    else chosenFor(name).splice(chosenFor(name).indexOf(value), 1);
    // A tag's subtags go with it.
    if (name === 'Tags') {
      values.Subtags = values.Subtags.filter(sub => values.Tags.includes(SUBTAGS.find(item => item.value === sub)?.parent));
      redrawSelect('Subtags');
    }
    redrawSelect(name);
    sync();
  }

  // ── Save, log and close ──────────────────────────────────────

  const staffName = id => STAFF.find(person => person.id === id)?.name || '';
  const names = (list, source) => list.map(value => source.find(item => item.value === value)?.name).filter(Boolean).join(', ');

  // The row's columns (owner, 18 November 2026): Zidebar.Zen_CloudFiles_Notes
  // in CloudToolz, Zen_CloudFiles_Notes in iMIS. A note carries no task
  // fields.
  function columns(source) {
    const task = source.Kind === 'task';
    return {
      FollowUpRequired: task,
      Title: task ? source.Title.trim() : '',
      Note: source.Note.trim(),
      ActionedNotes: task ? source.ActionedNotes.trim() : '',
      // One datetime: the date, and the time when one is added.
      Deadline: task && source.DueDate ? source.DueDate + 'T' + (source.DueTime || '00:00') + ':00' : '',
      PrimaryStaffLead: task ? source.AssignTo : '',
      HighPriority: task && source.HighPriority,
      Actioned: task && source.Completed,
      Tags: source.Tags.join(','),
      Subtags: source.Subtags.join(','),
      Access: source.Access
    };
  }

  // The record the row belongs to, as the module's other saves send it.
  const recordKeys = () => ({CaseID: record().id, CaseNum: record().ordinal});

  // What the form would send.
  function payload() {
    return {
      ...recordKeys(),
      ...(values.Ordinal ? {Ordinal: values.Ordinal} : {}),
      ...columns(values),
      Files: values.Files.filter(file => file.added).map(file => ({FileName: file.name, TagOrdinals: file.tags.join(',')}))
    };
  }

  // A column's value as the change history shows it.
  function shown(column, value) {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (column === 'PrimaryStaffLead') return value ? staffName(value) + ' (' + value + ')' : '';
    if (column === 'Deadline') return value.replace('T', ' ').replace(/:00$/, '').replace(/ 00:00$/, '');
    if (column === 'Tags') return names(value.split(',').filter(Boolean), TAGS);
    if (column === 'Subtags') return names(value.split(',').filter(Boolean), SUBTAGS);
    return value;
  }

  // LogChangesToIMIS, Table Zen_CloudFiles_Notes, against the record: an Add
  // with what was set, an Edit with each changed column old → new.
  function logLines(sent) {
    const kindWord = sent.FollowUpRequired ? 'Task' : 'Note';
    const head = record().label + ': ' + (page.mode === 'add' ? 'Add ' : 'Update ') + kindWord + ' (Table Zen_CloudFiles_Notes)';
    const after = columns(values);
    if (page.mode === 'add') {
      const set = Object.entries(after).filter(([, value]) => value !== '' && value !== false);
      return ['Add · ' + head].concat(set.map(([column, value]) => '  ' + column + ': ' + shown(column, value)));
    }
    const before = columns(original);
    const changed = Object.keys(after).filter(column => String(before[column]) !== String(after[column]));
    if (!changed.length) return ['Nothing changed: nothing logged.'];
    return ['Edit · ' + head].concat(changed.map(column =>
      '  ' + column + ': ' + (shown(column, before[column]) || 'Empty') + ' → ' + (shown(column, after[column]) || 'Empty')));
  }

  function validate() {
    const task = values.Kind === 'task';
    const field = task ? 'Title' : 'Note';
    const empty = !values[field].trim();
    root.querySelectorAll('[data-error]').forEach(node => { node.hidden = true; });
    if (!empty) return true;
    const error = root.querySelector('[data-error="' + field + '"]');
    error.textContent = task ? 'Say what needs doing.' : 'Write the note.';
    error.hidden = false;
    root.querySelector('[data-name="' + field + '"]').focus();
    return false;
  }

  function save() {
    if (!validate()) return;
    const sent = payload();
    const files = sent.Files.length
      ? ['', 'Then uploads ' + sent.Files.length + ' attachment' + (sent.Files.length > 1 ? 's' : '') + ', each with its own attachment tags, to the ' + (sent.FollowUpRequired ? 'task' : 'note') + '’s record.']
      : [];
    result(['POST ' + SAVE_PATH[page.module], JSON.stringify(sent, null, 2), '', 'Logs:']
      .concat(logLines(sent), files, ['', 'Closes the popup with {Saved: true}; the page’s list refreshes.']).join('\n'));
  }

  const result = text => { document.querySelector('[data-result]').textContent = text; };

  // ── Events ───────────────────────────────────────────────────

  function wire() {
    root.addEventListener('click', event => {
      const target = event.target.closest('button, .usf__control');
      if (!target) { closePanels(); return; }

      if (target.dataset.kind) {
        values.Kind = target.dataset.kind;
        // Text already typed stays: a note's text becomes the details.
        if (values.Kind === 'task') detailsOpen = detailsOpen || !!values.Note.trim();
        if (values.Kind === 'task' && !values.AssignTo && page.mode === 'add') {
          values.AssignTo = ME.id;
          redrawSelect('AssignTo');
        }
        sync();
        setTimeout(() => root.querySelector(values.Kind === 'task' ? '[data-name="Title"]' : '[data-name="Note"]').focus(), 230);
        return;
      }
      if (target.hasAttribute('data-flag')) { values.HighPriority = !values.HighPriority; sync(); return; }
      if (target.hasAttribute('data-add-details')) {
        detailsOpen = true;
        sync();
        setTimeout(() => $('[data-name="Note"]').focus(), 230);
        return;
      }
      if (target.dataset.days != null) {
        const date = new Date();
        date.setDate(date.getDate() + Number(target.dataset.days));
        // The local date, not toISOString's UTC one.
        const pad = number => String(number).padStart(2, '0');
        values.DueDate = date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
        $('[data-name="DueDate"]').value = values.DueDate;
        sync();
        return;
      }
      if (target.hasAttribute('data-clear-date')) { values.DueDate = ''; $('[data-name="DueDate"]').value = ''; sync(); return; }
      if (target.hasAttribute('data-add-time')) {
        timeShown = true;
        sync();
        $('[data-name="DueTime"]').focus();
        return;
      }
      if (target.dataset.remove) {
        unchoose(target.closest('[data-select]').dataset.select, target.dataset.remove);
        return;
      }
      if (target.dataset.option) {
        const select = target.closest('[data-select]');
        choose(select.dataset.select, target.dataset.option);
        closePanels();
        return;
      }
      if (target.classList.contains('usf__control') || target.classList.contains('usf__toggle')) {
        openPanel(target.closest('[data-select]'));
        return;
      }
      if (target.hasAttribute('data-choose-files')) {
        const count = values.Files.length + 1;
        values.Files.push({name: 'Scanned document ' + count + '.pdf', size: (120 + count * 37) + ' KB', added: true, tags: []});
        sync();
        return;
      }
      // Add tags opens the file's tag picker with its list showing.
      if (target.dataset.addFileTags != null) {
        const index = Number(target.dataset.addFileTags);
        values.Files[index].tagsOpen = true;
        sync();
        const select = root.querySelector('[data-select="FileTags-' + index + '"]');
        openPanel(select);
        select.querySelector('.usf__toggle').focus();
        return;
      }
      if (target.dataset.removeFile != null) {
        values.Files.splice(Number(target.dataset.removeFile), 1);
        sync();
        return;
      }
      if (target.hasAttribute('data-save')) { save(); return; }
      if (target.hasAttribute('data-cancel')) { result('Closes the popup with {Saved: false}. Nothing sent, nothing logged.'); }
    });

    root.addEventListener('input', event => {
      const name = event.target.dataset.name;
      if (!name) return;
      values[name] = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
      if (['Completed', 'Access', 'ActionedNotes', 'DueDate'].includes(name)) sync();
    });
    root.addEventListener('change', event => {
      if (event.target.dataset.name === 'Access') { values.Access = event.target.value; sync(); }
    });
    // An empty time closes again when it loses focus.
    root.addEventListener('focusout', event => {
      if (event.target.dataset.name === 'DueTime' && !event.target.value) {
        timeShown = false;
        sync();
      }
    });
    root.addEventListener('keydown', event => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); save(); }
      if (event.key === 'Escape') closePanels();
    });
  }

  // ── The page around the form ─────────────────────────────────

  function syncAddress() {
    const params = new URLSearchParams({Type: values.Kind, ID: ME.id, ModuleID: record().id, ModuleOrdinal: record().ordinal});
    if (page.mode === 'edit') params.set('Ordinal', values.Ordinal);
    document.querySelector('[data-placeholder]').textContent = '<div data-us-form="note"\n     data-module="' + page.module + '"></div>';
    document.querySelector('[data-address]').textContent = '?' + params.toString().replace(/&/g, '\n &');
  }

  function syncToolbar() {
    document.querySelectorAll('[data-control]').forEach(group => {
      group.querySelectorAll('button').forEach(button =>
        button.setAttribute('aria-pressed', String(page[group.dataset.control] === button.dataset.value)));
    });
    document.documentElement.setAttribute('data-us-color-scheme', page.scheme);
    history.replaceState(null, '', '?' + new URLSearchParams(page));
  }

  function draw() {
    const kind = page.type;
    const saved = SAVED[kind];
    values = page.mode === 'edit'
      ? {...saved, Tags: [...saved.Tags], Subtags: [...saved.Subtags], Files: saved.Files.map(file => ({...file, tags: [...file.tags]}))}
      : blank(kind);
    original = {...values, Tags: [...values.Tags], Subtags: [...values.Subtags]};
    detailsOpen = !!values.Note.trim();
    timeShown = !!values.DueTime;
    root.innerHTML = formHtml();
    fillInputs();
    sync();
    // The reveals settle open without animating on first draw.
    root.querySelectorAll('.usf__reveal:not([data-closed])').forEach(node => node.setAttribute('data-settled', ''));
    result('Save or Cancel to see what the form would send, what it would log and how it would close.');
    syncToolbar();
  }

  document.querySelector('.nt-toolbar').addEventListener('click', event => {
    const button = event.target.closest('[data-control] button');
    if (!button) return;
    page[button.closest('[data-control]').dataset.control] = button.dataset.value;
    if (button.closest('[data-control="scheme"]')) { syncToolbar(); return; }
    draw();
  });

  async function start() {
    host = document.getElementById('nt-host');
    root = host.attachShadow({mode: 'open'});
    const sheets = await Promise.all(['../../../Theme/UnionSuite/Forms/UnionSuiteForms.css', 'note-task-form.css'].map(async path => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(await (await fetch(path, {cache: 'no-cache'})).text());
      return sheet;
    }));
    root.adoptedStyleSheets = sheets;
    wire();
    draw();
  }

  start();
})();
