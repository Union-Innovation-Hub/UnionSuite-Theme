/* Agreement page — proposed theme JS (candidate, not installed).
   Target: Theme/UnionSuite/zUnionSuite.js, after US-TASK-ROWS. Load after
   zUnionSuite.js and agreement-actions.candidate.js.

   The agreement IQAs are kept as they are (owner, 2 October 2026): templates
   change, queries do not. Where a theme component needs a value the old
   queries do not return directly, these blocks derive it in the browser:
   - task and milestone completion from the old CSS-class fields ("done");
   - past meetings from the meeting date.
   All three end up as data-us-task-completed, which the theme's
   us-task-completed-filter and US-TASK-ROWS already understand. */

/* US-QUERY-STATES:START — derive data-us-task-completed from existing fields. */
(function () {
  'use strict';
  if (window.UnionSuiteQueryStates) return;

  // ISO (2026-05-20), dd/MM/yyyy (20/05/2026) or d/MM/yyyy dates; null otherwise.
  function parseDate(value) {
    const text = String(value || '').trim();
    const dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const parts = dmy ? [dmy[3], dmy[2], dmy[1]] : iso ? [iso[1], iso[2], iso[3]] : null;
    if (!parts) return null;
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function today() {
    // Prototypes can pin "today" so past/upcoming stays fixed in samples.
    const pinned = parseDate(window.UnionSuiteQueryStatesConfig?.today);
    const date = pinned || new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function set(node, completed) {
    const value = String(completed);
    if (node.getAttribute('data-us-task-completed') !== value) node.setAttribute('data-us-task-completed', value);
  }

  function sync(scope = document) {
    // Task rows: data-us-task-state carries the old TAskCheckCSS value.
    scope.querySelectorAll('.us-task[data-us-task-state]').forEach(task => {
      if (task.hasAttribute('data-us-task-changing')) return;
      set(task, /^(done|true|1)$/i.test(task.getAttribute('data-us-task-state').trim()));
      task.removeAttribute('data-us-task-state');
    });
    scope.querySelectorAll('.us-milestone[data-us-milestone-status]').forEach(milestone => {
      set(milestone, milestone.getAttribute('data-us-milestone-status').trim().toLowerCase() === 'done');
    });
    const now = today();
    scope.querySelectorAll('.us-meeting[data-us-meeting-date]').forEach(meeting => {
      const date = parseDate(meeting.getAttribute('data-us-meeting-date'));
      set(meeting, !!date && date < now);
    });
  }

  // The completed toggle is generic; name what it shows for these lists.
  // Meetings are past rather than done, so they also swap the theme's
  // checkbox for a history icon (owner, 3 October 2026).
  const toggleLabels = [
    ['.us-milestones', 'Show completed milestones'],
    ['.us-meetings', 'Show past meetings', 'ti-history']
  ];

  function labelToggles() {
    toggleLabels.forEach(([selector, label, iconName]) => {
      document.querySelectorAll(selector + ' .us-task-completed-toggle').forEach(toggle => {
        if (toggle.title !== label) {
          toggle.title = label;
          toggle.setAttribute('aria-label', label);
        }
        const icon = toggle.querySelector('i.ti');
        if (iconName && icon && !icon.classList.contains(iconName)) icon.className = 'ti ' + iconName;
      });
    });
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      sync();
      labelToggles();
    });
  }

  // Runs once now, before DOMContentLoaded, so US-TASK-ROWS sees settled state.
  sync();
  new MutationObserver(records => {
    if (records.some(record => record.type === 'childList' || record.attributeName === 'data-us-task-state')) schedule();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-us-task-state']});
  document.addEventListener('DOMContentLoaded', schedule);

  window.UnionSuiteQueryStates = Object.freeze({refresh: schedule, parseDate});
})();
/* US-QUERY-STATES:END */

/* US-PAST-EMPTY:START — placeholder when the completed filter hides every row.
   Target: US-QUERY-SEARCH in zUnionSuite.js, as an option on the completed
   toggle beside its label. Lists opt in through the table below. The
   placeholder shows only while the toggle is off, no search text is entered
   and every row on the page is marked completed (for meetings: past). Its
   button presses the panel's own toggle, so the theme keeps the state. */
(function () {
  'use strict';
  if (window.UnionSuitePastEmpty) return;

  const lists = [
    {
      selector: '.us-meetings',
      icon: 'ti-calendar-off',
      title: 'No upcoming meetings',
      hidden: count => count + (count === 1 ? ' past meeting is' : ' past meetings are') + ' hidden.',
      action: 'Show past meetings'
    }
  ];

  function rowsOf(set) {
    return [...set.children].filter(row => row.matches('.QueryTemplateItem') ||
      (row.localName === 'section' && row.querySelector(':scope > .QueryTemplateItem')));
  }

  function build(config, wrapper) {
    const empty = document.createElement('div');
    empty.className = 'us-past-empty';
    empty.setAttribute('role', 'status');
    empty.innerHTML = '<i class="ti us-past-empty__icon" aria-hidden="true"></i>' +
      '<p class="us-past-empty__title"></p><p class="us-past-empty__text"></p>' +
      '<button type="button" class="TextButton SmallButton us-outline-button us-past-empty__show"></button>';
    empty.querySelector('.us-past-empty__icon').classList.add(config.icon);
    empty.querySelector('.us-past-empty__title').textContent = config.title;
    const show = empty.querySelector('.us-past-empty__show');
    show.textContent = config.action;
    show.addEventListener('click', () => {
      const toggle = wrapper.querySelector('.us-task-completed-toggle');
      if (!toggle) return;
      toggle.click();
      // The placeholder goes once past rows show; keep focus on the toggle.
      toggle.focus({preventScroll: true});
    });
    return empty;
  }

  function update(config, wrapper) {
    const set = wrapper.querySelector(':scope > .panel > .panel-body-container > .panel-body > .QueryTemplateSet');
    const toggle = wrapper.querySelector('.us-task-completed-toggle');
    let empty = wrapper.querySelector('.us-past-empty');
    const rows = set ? rowsOf(set) : [];
    const query = wrapper.querySelector('.us-query-search-controls input')?.value.trim();
    const allPast = rows.length > 0 && rows.every(row => row.hasAttribute('data-us-task-completed-row'));
    const show = !!toggle && toggle.getAttribute('aria-pressed') !== 'true' && !query && allPast;

    if (!show) {
      empty?.remove();
      wrapper.removeAttribute('data-us-past-empty');
      return;
    }
    if (!empty) {
      empty = build(config, wrapper);
      set.after(empty);
    }
    const text = config.hidden(rows.length);
    const line = empty.querySelector('.us-past-empty__text');
    // Write only on change: a text change would reschedule this update.
    if (line.textContent !== text) line.textContent = text;
    if (!wrapper.hasAttribute('data-us-past-empty')) wrapper.setAttribute('data-us-past-empty', '');
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      lists.forEach(config => {
        document.querySelectorAll(config.selector + '.us-task-completed-filter').forEach(wrapper => {
          if (!wrapper.closest('.us-report-no-styling')) update(config, wrapper);
        });
      });
    });
  }

  new MutationObserver(records => {
    if (records.some(record => record.type === 'childList' ||
      record.attributeName === 'aria-pressed' ||
      record.attributeName === 'data-us-task-completed-row')) schedule();
  }).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['aria-pressed', 'data-us-task-completed-row']
  });
  document.addEventListener('input', event => {
    if (event.target.closest?.('.us-query-search-controls')) schedule();
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();

  window.UnionSuitePastEmpty = Object.freeze({refresh: schedule, version: '0.1-candidate'});
})();
/* US-PAST-EMPTY:END */

/* US-MILESTONES:START — progress rail and status select for us-milestones lists. */
(function () {
  'use strict';
  if (window.UnionSuiteMilestones) return;

  const wrapperSelector = '.us-milestones';
  const labels = {future: 'Not started', current: 'In progress', done: 'Complete'};
  const saveActions = {future: 'Not Complete', current: 'In Progress', done: 'Complete'};
  const tick = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg>';

  function status(milestone) {
    const value = (milestone.getAttribute('data-us-milestone-status') || '').trim().toLowerCase();
    return labels[value] ? value : 'future';
  }

  function setOf(wrapper) {
    return wrapper.querySelector(':scope > .panel > .panel-body-container > .panel-body > .QueryTemplateSet');
  }

  // The rail is a summary of every milestone, including completed ones the
  // filter hides, so it is built from all rows in result order.
  function renderRail(wrapper) {
    const set = setOf(wrapper);
    const body = set?.parentElement;
    if (!body) return;
    const milestones = [...set.querySelectorAll('.us-milestone')];
    let rail = body.querySelector(':scope > .us-milestones__rail');
    if (!milestones.length) {
      rail?.remove();
      return;
    }
    if (!rail) {
      rail = document.createElement('ol');
      rail.className = 'us-milestones__rail';
      rail.setAttribute('aria-label', 'Milestone progress');
      body.prepend(rail);
    }
    const states = milestones.map(status);
    // Progress reaches the last completed node, as the old rail did.
    const lastDone = states.lastIndexOf('done');
    rail.style.setProperty('--milestones-progress', milestones.length > 1 && lastDone > 0 ? String(lastDone / (milestones.length - 1)) : '0');
    rail.replaceChildren(...milestones.map((milestone, index) => {
      const state = states[index];
      const title = milestone.querySelector('.us-milestone__title')?.textContent.trim() || 'Milestone';
      const node = document.createElement('li');
      node.className = 'us-milestones__node';
      node.setAttribute('data-us-milestone-status', state);
      node.title = title + ' — ' + labels[state];
      const circle = document.createElement('span');
      circle.className = 'us-milestones__circle';
      circle.setAttribute('aria-hidden', 'true');
      if (state === 'done') circle.innerHTML = tick;
      else circle.textContent = String(index + 1);
      const label = document.createElement('span');
      label.className = 'us-milestones__label';
      label.textContent = title;
      const hidden = document.createElement('span');
      hidden.className = 'sr-only';
      hidden.textContent = ', ' + labels[state];
      label.append(hidden);
      node.append(circle, label);
      return node;
    }));
  }

  function syncSelects(wrapper) {
    wrapper.querySelectorAll('.us-milestone').forEach(milestone => {
      const select = milestone.querySelector('.us-milestone__status');
      if (select && !milestone.hasAttribute('aria-busy') && select.value !== status(milestone)) select.value = status(milestone);
    });
  }

  function syncAll() {
    document.querySelectorAll(wrapperSelector).forEach(wrapper => {
      if (wrapper.closest('.us-report-no-styling')) return;
      syncSelects(wrapper);
      renderRail(wrapper);
    });
  }

  function apply(milestone, state) {
    milestone.setAttribute('data-us-milestone-status', state);
    window.UnionSuiteQueryStates?.refresh();
    const wrapper = milestone.closest(wrapperSelector);
    if (wrapper) renderRail(wrapper);
  }

  function reportFailure(milestone) {
    milestone.querySelectorAll(':scope > .us-milestone__error').forEach(node => node.remove());
    const message = document.createElement('span');
    message.className = 'us-milestone__error';
    message.setAttribute('role', 'status');
    message.textContent = 'Not saved. Try again.';
    milestone.append(message);
    setTimeout(() => message.remove(), 6000);
  }

  async function change(select) {
    const milestone = select.closest('.us-milestone');
    const ordinal = (milestone?.getAttribute('data-us-milestone-ordinal') || '').trim();
    const previous = status(milestone);
    const next = labels[select.value] ? select.value : 'future';
    if (!milestone || next === previous) return;
    if (!/^\d+$/.test(ordinal)) {
      select.value = previous;
      reportFailure(milestone);
      return;
    }
    milestone.setAttribute('aria-busy', 'true');
    // Optimistic, as tasks are: the effect plays while the save is in flight.
    // A completed milestone stays in place until the save settles, then the
    // completed filter hides it unless completed milestones are shown.
    const celebration = next === 'done' ? window.UnionSuiteTaskRows?.celebrate?.(select) : null;
    milestone.setAttribute('data-us-milestone-status', next);
    const wrapper = milestone.closest(wrapperSelector);
    if (wrapper) renderRail(wrapper);
    let saved = true;
    try {
      await window.UnionSuiteAgreements.saveItemStatus(ordinal, saveActions[next], 'Milestone');
    } catch (error) {
      saved = false;
      console.warn(error.message);
    }
    await celebration;
    milestone.removeAttribute('aria-busy');
    if (saved) apply(milestone, next);
    else {
      select.value = previous;
      apply(milestone, previous);
      reportFailure(milestone);
    }
  }

  document.addEventListener('change', event => {
    const select = event.target.closest(wrapperSelector + ' .us-milestone__status');
    if (select && !select.closest('.us-report-no-styling')) void change(select);
  });

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      syncAll();
    });
  }

  document.addEventListener('us:query-template-refreshed', schedule);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, {once: true});
  else schedule();

  window.UnionSuiteMilestones = Object.freeze({refresh: schedule, version: '0.1-candidate'});
})();
/* US-MILESTONES:END */

/* US-ATTACHMENTS:START — inline name and tag editor for us-attachments rows. */
(function () {
  'use strict';
  if (window.UnionSuiteAttachments) return;

  // Tag list for suggestions. The IQA path is the existing sandbox query;
  // it moves with the other agreement IQAs for production.
  const tagQuery = '$/_i4u_/SandBox/CA/ZenFileTags';
  let tagCache = null;

  // /api/query rows are flat alias-keyed objects; older endpoints return
  // Name/Value property lists. Read either, ignoring case.
  function propertyValue(item, name) {
    const unwrap = value => value && typeof value === 'object' && '$value' in value ? value.$value : value;
    const properties = unwrap(item?.Properties)?.$values;
    if (Array.isArray(properties)) {
      const match = properties.find(entry => String(entry.Name).toLowerCase() === name.toLowerCase());
      return match ? unwrap(match.Value) : undefined;
    }
    const key = Object.keys(item || {}).find(entry => entry.toLowerCase() === name.toLowerCase());
    return key ? unwrap(item[key]) : undefined;
  }

  async function loadTags() {
    if (tagCache) return tagCache;
    try {
      const token = document.getElementById('__RequestVerificationToken')?.value || '';
      const params = new URLSearchParams({QueryName: tagQuery, limit: '500'});
      const response = await fetch('/api/query?' + params, {credentials: 'same-origin', headers: {RequestVerificationToken: token}});
      if (!response.ok) throw new Error('Attachment tags could not be read (HTTP ' + response.status + ').');
      const data = await response.json();
      tagCache = (data?.Items?.$values || [])
        .map(item => ({ordinal: String(propertyValue(item, 'Ordinal') ?? ''), name: String(propertyValue(item, 'TagName') ?? '').trim()}))
        .filter(tag => tag.name && tag.ordinal);
    } catch (error) {
      console.warn(error.message);
      tagCache = [];
    }
    return tagCache;
  }

  function split(value) {
    return String(value || '').split(',').map(part => part.trim()).filter(Boolean);
  }

  function chip(name, ordinal) {
    const node = document.createElement('span');
    node.className = 'us-badge us-attachment__chip';
    node.dataset.ordinal = ordinal;
    node.append(name);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Remove tag ' + name);
    remove.textContent = '×';
    remove.addEventListener('click', () => node.remove());
    node.append(remove);
    return node;
  }

  function renderTags(row, names) {
    const tags = row.querySelector('.us-attachment__tags');
    if (!tags) return;
    tags.replaceChildren(...names.map(name => {
      const badge = document.createElement('span');
      badge.className = 'us-badge';
      badge.textContent = name;
      return badge;
    }));
  }

  function close(row, focusEdit) {
    row.querySelector('.us-attachment__editor')?.remove();
    row.removeAttribute('data-us-editing');
    if (focusEdit) row.querySelector('.us-action-agreements-edit-attachment')?.focus({preventScroll: true});
  }

  async function save(row, editor) {
    const name = editor.querySelector('.us-attachment__name-input').value.trim() || row.dataset.usFileName || '';
    // One chip per tag ordinal; a duplicate pick is ignored.
    const seen = new Set();
    const chips = [...editor.querySelectorAll('.us-attachment__chip')].filter(node => {
      if (seen.has(node.dataset.ordinal)) return false;
      seen.add(node.dataset.ordinal);
      return true;
    });
    const tagNames = chips.map(node => node.firstChild.textContent.trim());
    const tagOrdinals = chips.map(node => node.dataset.ordinal);
    const removed = [...new Set(split(row.dataset.usFileTagOrdinals))].filter(ordinal => !tagOrdinals.includes(ordinal));
    const previous = {name: row.dataset.usFileName, tags: row.dataset.usFileTags, ordinals: row.dataset.usFileTagOrdinals};
    const saveButton = editor.querySelector('.us-attachment__save');
    saveButton.disabled = true;
    editor.setAttribute('aria-busy', 'true');
    try {
      await window.UnionSuiteAgreements.cloudToolz('/ca/update-attachment', {
        method: 'POST',
        body: JSON.stringify({
          FileOrdinal: row.dataset.ordinal,
          FileName: name,
          NewTagOrdinals: tagOrdinals.join(','),
          RemovedTagOrdinals: removed.join(',')
        })
      });
    } catch (error) {
      console.warn(error.message);
      saveButton.disabled = false;
      editor.removeAttribute('aria-busy');
      let message = editor.querySelector('.us-attachment__error');
      if (!message) {
        message = document.createElement('p');
        message.className = 'us-attachment__error';
        message.setAttribute('role', 'status');
        editor.append(message);
      }
      message.textContent = 'Not saved. Try again.';
      Object.assign(row.dataset, {usFileName: previous.name, usFileTags: previous.tags, usFileTagOrdinals: previous.ordinals});
      return;
    }
    row.dataset.usFileName = name;
    row.dataset.usFileTags = tagNames.join(',');
    row.dataset.usFileTagOrdinals = tagOrdinals.join(',');
    row.setAttribute('data-us-search', name + ' ' + tagNames.join(' '));
    const nameNode = row.querySelector('.us-attachment__name');
    if (nameNode) nameNode.textContent = name;
    renderTags(row, tagNames);
    close(row, true);
  }

  function wireSuggestions(editor) {
    const box = editor.querySelector('.us-attachment__chips');
    const input = box.querySelector('input');
    const list = box.querySelector('.us-attachment__suggestions');
    let options = [];
    let active = -1;

    function hide() {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    }

    function pick(tag) {
      box.insertBefore(chip(tag.name, tag.ordinal), input);
      input.value = '';
      hide();
      input.focus();
    }

    async function show() {
      const tags = await loadTags();
      const query = input.value.trim().toLowerCase();
      const chosen = new Set([...box.querySelectorAll('.us-attachment__chip')].map(node => node.dataset.ordinal));
      options = tags.filter(tag => !chosen.has(tag.ordinal) && (!query || tag.name.toLowerCase().includes(query))).slice(0, 8);
      list.replaceChildren(...options.map((tag, index) => {
        const option = document.createElement('li');
        option.id = list.id + '-' + index;
        option.setAttribute('role', 'option');
        option.textContent = tag.name;
        // mousedown keeps focus in the input, so blur does not close the list first.
        option.addEventListener('mousedown', event => {
          event.preventDefault();
          pick(tag);
        });
        return option;
      }));
      list.hidden = !options.length;
      input.setAttribute('aria-expanded', String(!!options.length));
      active = -1;
    }

    function move(step) {
      if (list.hidden || !options.length) return;
      active = (active + step + options.length) % options.length;
      [...list.children].forEach((option, index) => option.setAttribute('aria-selected', String(index === active)));
      input.setAttribute('aria-activedescendant', list.children[active].id);
    }

    input.addEventListener('focus', show);
    input.addEventListener('input', show);
    input.addEventListener('blur', () => setTimeout(hide, 120));
    input.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') { event.preventDefault(); move(1); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); }
      else if (event.key === 'Enter') {
        // Never submit the iMIS form. Only existing tags can be chosen.
        event.preventDefault();
        if (active >= 0) pick(options[active]);
        else {
          const exact = options.find(tag => tag.name.toLowerCase() === input.value.trim().toLowerCase());
          if (exact) pick(exact);
        }
      } else if (event.key === 'Backspace' && !input.value) {
        box.querySelector('.us-attachment__chip:last-of-type')?.remove();
      }
    });
    box.addEventListener('click', event => { if (event.target === box) input.focus(); });
  }

  let editorId = 0;
  function edit(row) {
    if (!row || row.hasAttribute('data-us-editing')) return {editing: true};
    const id = 'us-attachment-editor-' + (++editorId);
    const names = split(row.dataset.usFileTags);
    const ordinals = split(row.dataset.usFileTagOrdinals);
    const editor = document.createElement('div');
    editor.className = 'us-attachment__editor';
    editor.innerHTML = `
      <label class="us-attachment__editor-label" for="${id}-name">File name</label>
      <input type="text" class="us-attachment__name-input" id="${id}-name" autocomplete="off">
      <span class="us-attachment__editor-label" id="${id}-tags-label">Tags</span>
      <div class="us-attachment__chips">
        <input type="text" role="combobox" aria-autocomplete="list" aria-expanded="false"
          aria-controls="${id}-suggestions" aria-labelledby="${id}-tags-label" placeholder="Add tag…" autocomplete="off">
        <ul class="us-attachment__suggestions" id="${id}-suggestions" role="listbox" hidden></ul>
      </div>
      <div class="us-attachment__editor-actions">
        <button type="button" class="TextButton PrimaryButton SmallButton us-attachment__save">Save</button>
        <button type="button" class="TextButton SmallButton us-attachment__cancel">Cancel</button>
      </div>`;
    editor.querySelector('.us-attachment__name-input').value = row.dataset.usFileName || '';
    const box = editor.querySelector('.us-attachment__chips');
    const input = box.querySelector('input');
    // Names and ordinals arrive as parallel CSV lists from the existing IQA.
    names.forEach((name, index) => { if (ordinals[index]) box.insertBefore(chip(name, ordinals[index]), input); });
    editor.querySelector('.us-attachment__save').addEventListener('click', () => void save(row, editor));
    editor.querySelector('.us-attachment__cancel').addEventListener('click', () => close(row, true));
    editor.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.stopPropagation(); close(row, true); }
      if (event.key === 'Enter' && event.target.matches('.us-attachment__name-input')) { event.preventDefault(); void save(row, editor); }
    });
    wireSuggestions(editor);
    row.setAttribute('data-us-editing', '');
    (row.querySelector('.us-attachment__copy') || row).append(editor);
    editor.querySelector('.us-attachment__name-input').focus();
    void loadTags();
    return {editing: true};
  }

  // Render CSV tags as badges when a row arrives without them.
  function syncTags(scope = document) {
    scope.querySelectorAll('.us-attachment[data-us-file-tags]').forEach(row => {
      const tags = row.querySelector('.us-attachment__tags');
      if (tags && !tags.children.length && !row.hasAttribute('data-us-editing')) renderTags(row, split(row.dataset.usFileTags));
    });
  }

  // Rows can arrive after load (paging, refresh, late rendering), so watch for them.
  let tagsScheduled = false;
  function scheduleTags() {
    if (tagsScheduled) return;
    tagsScheduled = true;
    requestAnimationFrame(() => {
      tagsScheduled = false;
      syncTags();
    });
  }
  new MutationObserver(records => {
    if (records.some(record => record.addedNodes.length)) scheduleTags();
  }).observe(document.documentElement, {subtree: true, childList: true});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleTags, {once: true});
  else scheduleTags();

  window.UnionSuiteAttachments = Object.freeze({edit, version: '0.1-candidate'});
})();
/* US-ATTACHMENTS:END */

/* US-BANNER-FACTS:START — banner details row from a client-editable IQA.
   Put data-us-facts-query on .us-banner__details. The banner's own Query
   Template keeps the fixed identity (ID, title, status, actions); this IQA,
   run for the same record, fills the details row, so clients change what the
   banner shows by editing the IQA's columns only (the contact page's details
   IQA convention, US-ACTIVITY-FEED):
   - Description: optional; shown first with the label "Description"
     (data-us-facts-description-label renames it), clipped with More past
     data-us-facts-description-limit characters (default 300).
   - Every Additional-* column is a fact, labelled with the text after the
     prefix ("Additional-Agreement type" → Agreement type), in column order.
     Blank values are left out; ISO dates read "1 Jan 2026"; true/false Yes/No.
   - Tone-<same name> (success, warning, danger, info) shows that fact as a
     badge, for example Tone-Priority beside Additional-Priority.
   Filter: data-us-facts-filter names the IQA filter. Its value is
   data-us-facts-value, or else the page URL parameter of the same name.
   A failed or empty query leaves the details row out. */
(function () {
  'use strict';
  if (window.UnionSuiteBannerFacts) {
    window.UnionSuiteBannerFacts.refresh();
    return;
  }

  const SELECTOR = '.us-banner .us-banner__details[data-us-facts-query]';
  const PREFIX = /^additional[-_]/i;
  const TONE = /^tone[-_]/i;
  const TONES = ['success', 'warning', 'danger', 'info'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const loaded = new WeakMap();
  let queued = false;

  const unwrap = value => value && typeof value === 'object' && '$value' in value ? value.$value : value;
  const text = value => value == null ? '' : String(value).trim();

  // Columns in IQA order, from either row shape (/api/query rows are flat).
  function columns(row) {
    const properties = unwrap(row?.Properties)?.$values;
    if (Array.isArray(properties)) return properties.map(item => [String(item.Name), unwrap(item.Value)]);
    return Object.entries(row || {}).filter(([name]) => name !== '$type').map(([name, value]) => [name, unwrap(value)]);
  }

  // "Additional-Last updated" keeps the author's wording; "Additional-LeadStaff"
  // becomes "Lead staff". Acronyms (ID, EBA) keep their capitals.
  function label(rest) {
    const name = rest.trim();
    if (!name || /\s/.test(name)) return name;
    const words = name.replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(' ');
    return words.map((word, index) => {
      if (index === 0) return word.charAt(0).toUpperCase() + word.slice(1);
      return /^[A-Z0-9]{2,}$/.test(word) ? word : word.toLowerCase();
    }).join(' ');
  }

  function value(raw) {
    const string = text(raw);
    if (/^(true|false)$/i.test(string)) return /^true$/i.test(string) ? 'Yes' : 'No';
    const iso = string.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ]|$)/);
    if (iso) return Number(iso[3]) + ' ' + MONTHS[Number(iso[2]) - 1] + ' ' + iso[1];
    return string;
  }

  function config(details) {
    const query = text(details.dataset.usFactsQuery);
    const filter = text(details.dataset.usFactsFilter);
    let filterValue = text(details.dataset.usFactsValue);
    if (!filterValue && filter) filterValue = text(new URLSearchParams(location.search).get(filter));
    // Unsubstituted placeholders mean the banner has no record yet.
    if (!/^\$\/.+/.test(query) || !filter || !filterValue || /^[\[{]/.test(filterValue)) return null;
    return {query, filter, value: filterValue};
  }

  function apiRoot() {
    if (!window.gWebRoot) return '/api/';
    const root = new URL(String(window.gWebRoot), window.location.origin);
    return root.pathname.replace(/\/+$/, '') + '/api/';
  }

  async function request(cfg) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const token = document.querySelector('input[name="__RequestVerificationToken"], input#__RequestVerificationToken')?.value;
      const params = new URLSearchParams({QueryName: cfg.query, limit: '1', offset: '0'});
      params.set(cfg.filter, cfg.value);
      const response = await fetch(apiRoot() + 'query?' + params, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
        headers: {Accept: 'application/json', ...(token ? {RequestVerificationToken: token} : {})}
      });
      if (!response.ok) throw Error('HTTP ' + response.status);
      const data = await response.json();
      const rows = unwrap(data.Items)?.$values ?? unwrap(data.Items);
      if (!Array.isArray(rows)) throw Error('Unexpected response');
      return rows[0] || null;
    } finally {
      clearTimeout(timer);
    }
  }

  function render(details, row) {
    const entries = columns(row);
    const find = name => entries.find(([column]) => column.toLowerCase() === name.toLowerCase());
    const nodes = [];

    const description = text(find('Description')?.[1]);
    if (description) {
      const lead = document.createElement('div');
      lead.className = 'us-banner__lead';
      const heading = document.createElement('p');
      heading.className = 'us-banner__lead-label';
      heading.textContent = details.dataset.usFactsDescriptionLabel || 'Description';
      const body = document.createElement('p');
      body.className = 'us-banner__description';
      body.setAttribute('data-us-description-limit', details.dataset.usFactsDescriptionLimit || '300');
      const full = document.createElement('span');
      full.setAttribute('data-us-description-full', '');
      full.textContent = description;
      body.append(full);
      lead.append(heading, body);
      nodes.push(lead);
    }

    const facts = entries
      .filter(([column]) => PREFIX.test(column))
      .map(([column, raw]) => {
        const rest = column.replace(PREFIX, '');
        const toneEntry = entries.find(([other]) => TONE.test(other) && other.replace(TONE, '').toLowerCase() === rest.toLowerCase());
        const tone = text(toneEntry?.[1]).toLowerCase();
        return {label: label(rest), value: value(raw), tone: TONES.includes(tone) ? tone : ''};
      })
      .filter(fact => fact.label && fact.value);

    if (facts.length) {
      const list = document.createElement('dl');
      list.className = 'us-banner__facts';
      facts.forEach(fact => {
        const item = document.createElement('div');
        item.className = 'us-banner__fact';
        const term = document.createElement('dt');
        term.textContent = fact.label;
        const definition = document.createElement('dd');
        if (fact.tone) {
          const badge = document.createElement('span');
          badge.className = 'us-banner__badge us-banner__badge--' + fact.tone;
          badge.textContent = fact.value;
          definition.append(badge);
        } else {
          definition.textContent = fact.value;
        }
        item.append(term, definition);
        list.append(item);
      });
      nodes.push(list);
    }

    details.replaceChildren(...nodes);
    details.setAttribute('data-us-facts-state', nodes.length ? 'ready' : 'empty');
  }

  async function load(details, cfg) {
    const key = cfg.query + '|' + cfg.filter + '|' + cfg.value;
    if (loaded.get(details) === key) return;
    loaded.set(details, key);
    details.setAttribute('data-us-facts-state', 'loading');
    details.setAttribute('aria-busy', 'true');
    try {
      const row = await request(cfg);
      if (loaded.get(details) !== key) return;
      if (row) render(details, row);
      else {
        details.replaceChildren();
        details.setAttribute('data-us-facts-state', 'empty');
      }
    } catch (error) {
      if (loaded.get(details) !== key) return;
      details.replaceChildren();
      details.setAttribute('data-us-facts-state', 'error');
      console.warn('[UnionSuiteBannerFacts] The banner details could not be loaded:', error.message);
    } finally {
      details.removeAttribute('aria-busy');
    }
  }

  function refresh() {
    queued = false;
    document.querySelectorAll(SELECTOR).forEach(details => {
      if (details.closest('.us-report-no-styling')) return;
      const cfg = config(details);
      if (cfg) void load(details, cfg);
    });
  }

  function schedule() {
    if (queued) return;
    queued = true;
    setTimeout(refresh, 0);
  }

  new MutationObserver(records => {
    if (records.some(record => record.type === 'childList' || record.attributeName?.startsWith('data-us-facts'))) schedule();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true,
    attributeFilter: ['data-us-facts-query', 'data-us-facts-filter', 'data-us-facts-value']});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, {once: true});
  else schedule();

  window.UnionSuiteBannerFacts = Object.freeze({refresh: schedule, version: '0.1-candidate'});
})();
/* US-BANNER-FACTS:END */

/* US-FIELD-GROUPS:START — read-only field panel from a client-editable IQA.
   Put data-us-fields-query on a .us-field-groups element. The IQA returns one
   row; its column names lay the panel out, so clients change the panel by
   editing the IQA's columns only (the same idea as US-BANNER-FACTS):
   - Every column is a field, in column order, labelled with its name.
   - Group-Label puts the field under a sub-heading: "Dates-Start date" shows
     Start date under "Dates". The name splits at the first hyphen only, so
     "Dates-Re-negotiation" keeps its hyphen; a column without a group cannot
     have a hyphen in its label.
   - A group whose name is a number ("1-ID", "2-Start date") starts a new line
     with no sub-heading.
   - Columns of the same group are gathered together, groups in the order
     their first column appears. Columns without a group come first.
   - Tone-<Label> (success, warning, danger, info) shows the field with that
     label as a badge, for example Tone-Priority beside Details-Priority.
   - Alert-Title, Alert-Message and Alert-Tone show a status alert above the
     fields (the v1 Resolution banner): the title in bold, the message below,
     coloured by the tone (success, warning, danger, info; else neutral). A
     blank Alert-Title leaves the alert out. Alert-Only true shows the alert
     and no fields, for a record with nothing to show yet (an agreement not
     yet resolved; owner, 3 October 2026).
   Tone and Alert are reserved and are never group names.
   Values: blank shows an em dash; ISO dates read "1 Jan 2026"; true/false
   Yes/No; a web address or email becomes a link. A link or a value longer
   than 60 characters takes the full row. Values are shown as plain text.
   Layout: add us-field-groups--single for one field per line (Key dates).
   Filter: data-us-fields-filter names the IQA filter. Its value is
   data-us-fields-value, or else the page URL parameter of the same name. */
(function () {
  'use strict';
  if (window.UnionSuiteFieldGroups) {
    window.UnionSuiteFieldGroups.refresh();
    return;
  }

  const SELECTOR = '.us-field-groups[data-us-fields-query]';
  const TONES = {success: 'success', warning: 'warning', danger: 'danger', info: 'primary'};
  // Alert tone → native iMIS message class (styled by US-MESSAGES) and icon.
  const ALERTS = {
    success: ['AsiSuccess', 'circle-check'],
    info: ['AsiInformation', 'info-circle'],
    warning: ['AsiWarning', 'hourglass-high'],
    danger: ['AsiError', 'alert-circle'],
    neutral: ['AsiNeutral', 'info-circle']
  };
  const WIDE_LENGTH = 60;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const loaded = new WeakMap();
  let queued = false;

  const unwrap = value => value && typeof value === 'object' && '$value' in value ? value.$value : value;
  const text = value => value == null ? '' : String(value).trim();

  // Columns in IQA order, from either row shape (/api/query rows are flat).
  function columns(row) {
    const properties = unwrap(row?.Properties)?.$values;
    if (Array.isArray(properties)) return properties.map(item => [String(item.Name), unwrap(item.Value)]);
    return Object.entries(row || {}).filter(([name]) => name !== '$type').map(([name, value]) => [name, unwrap(value)]);
  }

  // "Dates-Start date" → group "Dates", name "Start date". Split at the first
  // hyphen only; a leading or trailing hyphen is part of the name.
  function parse(column) {
    const at = column.indexOf('-');
    const group = at > 0 ? column.slice(0, at).trim() : '';
    const name = at > 0 ? column.slice(at + 1).trim() : '';
    return group && name ? {group, name} : {group: '', name: column.trim()};
  }

  // "Last updated" keeps the author's wording; "LeadStaff" becomes
  // "Lead staff". Acronyms (ID, EBA) keep their capitals.
  function label(name) {
    if (!name || /\s/.test(name)) return name;
    const words = name.replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(' ');
    return words.map((word, index) => {
      if (index === 0) return word.charAt(0).toUpperCase() + word.slice(1);
      return /^[A-Z0-9]{2,}$/.test(word) ? word : word.toLowerCase();
    }).join(' ');
  }

  // The text to show, and a link target when the value is an address.
  function format(raw) {
    const string = text(raw);
    if (/^(true|false)$/i.test(string)) return {text: /^true$/i.test(string) ? 'Yes' : 'No'};
    const iso = string.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ]|$)/);
    if (iso) return {text: Number(iso[3]) + ' ' + MONTHS[Number(iso[2]) - 1] + ' ' + iso[1]};
    if (/^https?:\/\/\S+$/i.test(string)) return {text: string.replace(/^https?:\/\//i, '').replace(/\/$/, ''), href: string};
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(string)) return {text: string, href: 'mailto:' + string};
    return {text: string};
  }

  // Groups in first-appearance order, ungrouped fields first. Tone columns
  // colour the field of the same name and Alert columns build the alert,
  // instead of becoming fields.
  function layoutOf(row) {
    const tones = new Map();
    const alert = {};
    const groups = new Map([['', {heading: '', fields: []}]]);
    columns(row).forEach(([column, raw]) => {
      const {group, name} = parse(column);
      if (/^tone$/i.test(group)) {
        tones.set(name.toLowerCase(), text(raw).toLowerCase());
        return;
      }
      if (/^alert$/i.test(group)) {
        alert[name.toLowerCase()] = text(raw);
        return;
      }
      const key = group.toLowerCase();
      if (!groups.has(key)) groups.set(key, {heading: /^\d+$/.test(group) ? '' : label(group), fields: []});
      groups.get(key).fields.push({key: name.toLowerCase(), label: label(name), value: format(raw)});
    });
    groups.forEach(group => group.fields.forEach(field => { field.tone = TONES[tones.get(field.key)] || ''; }));
    return {
      alert: alert.title ? alert : null,
      groups: [...groups.values()].filter(group => group.fields.length)
    };
  }

  function alertNode(alert) {
    const [className, icon] = ALERTS[(alert.tone || '').toLowerCase()] || ALERTS.neutral;
    const node = document.createElement('div');
    node.className = 'us-field-groups__alert ' + className;
    const mark = document.createElement('i');
    mark.className = 'ti ti-' + icon + ' us-field-groups__alert-icon';
    mark.setAttribute('aria-hidden', 'true');
    const copy = document.createElement('div');
    copy.className = 'us-field-groups__alert-copy';
    const title = document.createElement('p');
    title.className = 'us-field-groups__alert-title';
    title.textContent = alert.title;
    copy.append(title);
    if (alert.message) {
      const message = document.createElement('p');
      message.className = 'us-field-groups__alert-message';
      message.textContent = alert.message;
      copy.append(message);
    }
    node.append(mark, copy);
    return node;
  }

  function fieldNode(field) {
    const item = document.createElement('div');
    item.className = 'us-fields__field';
    if (field.value.href || field.value.text.length > WIDE_LENGTH) item.classList.add('us-fields__field--wide');
    const term = document.createElement('dt');
    term.textContent = field.label;
    const definition = document.createElement('dd');
    // A blank value leaves the dd empty, which the A4 CSS shows as an em dash.
    if (field.value.href) {
      const link = document.createElement('a');
      link.href = field.value.href;
      link.textContent = field.value.text;
      if (!field.value.href.startsWith('mailto:')) {
        link.target = '_blank';
        link.rel = 'noopener';
      }
      definition.append(link);
    } else if (field.tone && field.value.text) {
      const badge = document.createElement('span');
      badge.className = 'us-badge us-badge--' + field.tone;
      badge.textContent = field.value.text;
      definition.append(badge);
    } else if (field.value.text) {
      definition.textContent = field.value.text;
    }
    item.append(term, definition);
    return item;
  }

  function note(message) {
    const node = document.createElement('p');
    node.className = 'us-field-groups__note';
    node.textContent = message;
    return node;
  }

  function render(root, row) {
    const single = root.classList.contains('us-field-groups--single');
    const layout = layoutOf(row);
    const nodes = layout.groups.map(group => {
      const section = document.createElement('div');
      section.className = 'us-field-groups__group';
      if (group.heading) {
        const heading = document.createElement('h3');
        heading.className = 'us-field-groups__heading';
        heading.textContent = group.heading;
        section.append(heading);
      }
      const list = document.createElement('dl');
      list.className = single ? 'us-fields us-fields--single' : 'us-fields';
      list.append(...group.fields.map(fieldNode));
      section.append(list);
      return section;
    });
    if (layout.alert) {
      if (/^(true|1|yes)$/i.test(layout.alert.only || '')) nodes.length = 0;
      nodes.unshift(alertNode(layout.alert));
    }
    root.replaceChildren(...(nodes.length ? nodes : [note('No details recorded.')]));
    root.setAttribute('data-us-fields-state', nodes.length ? 'ready' : 'empty');
  }

  function config(root) {
    const query = text(root.dataset.usFieldsQuery);
    const filter = text(root.dataset.usFieldsFilter);
    let filterValue = text(root.dataset.usFieldsValue);
    if (!filterValue && filter) filterValue = text(new URLSearchParams(location.search).get(filter));
    // Unsubstituted placeholders mean the page has no record yet.
    if (!/^\$\/.+/.test(query) || !filter || !filterValue || /^[\[{]/.test(filterValue)) return null;
    return {query, filter, value: filterValue};
  }

  function apiRoot() {
    if (!window.gWebRoot) return '/api/';
    const root = new URL(String(window.gWebRoot), window.location.origin);
    return root.pathname.replace(/\/+$/, '') + '/api/';
  }

  async function request(cfg) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const token = document.querySelector('input[name="__RequestVerificationToken"], input#__RequestVerificationToken')?.value;
      const params = new URLSearchParams({QueryName: cfg.query, limit: '1', offset: '0'});
      params.set(cfg.filter, cfg.value);
      const response = await fetch(apiRoot() + 'query?' + params, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
        headers: {Accept: 'application/json', ...(token ? {RequestVerificationToken: token} : {})}
      });
      if (!response.ok) throw Error('HTTP ' + response.status);
      const data = await response.json();
      const rows = unwrap(data.Items)?.$values ?? unwrap(data.Items);
      if (!Array.isArray(rows)) throw Error('Unexpected response');
      return rows[0] || null;
    } finally {
      clearTimeout(timer);
    }
  }

  async function load(root, cfg, force = false) {
    const key = cfg.query + '|' + cfg.filter + '|' + cfg.value;
    if (!force && loaded.get(root) === key) return;
    loaded.set(root, key);
    root.setAttribute('data-us-fields-state', 'loading');
    root.setAttribute('aria-busy', 'true');
    try {
      const row = await request(cfg);
      if (loaded.get(root) !== key) return;
      if (row) render(root, row);
      else {
        root.replaceChildren(note('No details recorded.'));
        root.setAttribute('data-us-fields-state', 'empty');
      }
    } catch (error) {
      if (loaded.get(root) !== key) return;
      root.replaceChildren(note('These details could not be loaded.'));
      root.setAttribute('data-us-fields-state', 'error');
      console.warn('[UnionSuiteFieldGroups] The details could not be loaded:', error.message);
    } finally {
      root.removeAttribute('aria-busy');
    }
  }

  function refresh() {
    queued = false;
    document.querySelectorAll(SELECTOR).forEach(root => {
      if (root.closest('.us-report-no-styling')) return;
      const cfg = config(root);
      if (cfg) void load(root, cfg);
    });
  }

  function schedule() {
    if (queued) return;
    queued = true;
    setTimeout(refresh, 0);
  }

  // Load one panel again, for example after its edit popup saves.
  function reload(root) {
    const cfg = root?.matches?.(SELECTOR) ? config(root) : null;
    if (cfg) void load(root, cfg, true);
  }

  new MutationObserver(records => {
    if (records.some(record => record.type === 'childList' || record.attributeName?.startsWith('data-us-fields'))) schedule();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true,
    attributeFilter: ['data-us-fields-query', 'data-us-fields-filter', 'data-us-fields-value']});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, {once: true});
  else schedule();

  window.UnionSuiteFieldGroups = Object.freeze({refresh: schedule, reload, version: '0.1-candidate'});
})();
/* US-FIELD-GROUPS:END */

/* US-TASK-PROGRESS:START — us-task-progress count.
   Target: US-QUERY-SEARCH in zUnionSuite.js, where it would read the counts
   directly instead of from the DOM. The heading count for lists with a
   completed state (owner, 3 October 2026: counts go in the heading):
   tasks and milestones read "x of y complete", meetings "x upcoming". */
(function () {
  'use strict';
  if (window.UnionSuiteTaskProgress) return;

  const ROWS = '.us-task, .us-milestone, .us-meeting';

  function setOf(wrapper) {
    return wrapper.querySelector(':scope > .panel > .panel-body-container > .panel-body > .QueryTemplateSet');
  }

  // A row being ticked counts as its new state, so the count moves with the tick
  // rather than after the save and exit animation. Milestones and meetings get
  // data-us-task-completed from US-QUERY-STATES (done; past).
  function isComplete(row) {
    return /^(true|1)$/i.test(row.getAttribute('data-us-task-changing') || row.getAttribute('data-us-task-completed') || '');
  }

  function label(wrapper, done, total) {
    if (wrapper.matches('.us-meetings')) return (total - done) + ' upcoming';
    return done + ' of ' + total + ' complete';
  }

  function renderProgress(wrapper) {
    const set = setOf(wrapper);
    const header = wrapper.querySelector(':scope > .panel > .panel-heading');
    if (!set || !header) return;
    const rows = [...set.querySelectorAll(ROWS)].filter(row => row.closest('.QueryTemplateSet') === set);
    const done = rows.filter(isComplete).length;

    let count = header.querySelector('.us-task-progress__count');
    if (!rows.length) {
      count?.remove();
      return;
    }
    if (!count) {
      count = document.createElement('span');
      count.className = 'us-task-progress__count';
      const actions = header.querySelector(':scope > .us-panel-actions');
      if (actions) actions.prepend(count);
      else header.append(count);
    }
    const text = label(wrapper, done, rows.length);
    // Write only on change: a childList mutation reschedules this render.
    if (count.textContent !== text) count.textContent = text;
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      document.querySelectorAll('.us-task-progress').forEach(wrapper => {
        if (!wrapper.closest('.us-report-no-styling')) renderProgress(wrapper);
      });
    });
  }

  document.addEventListener('us:panel-actions-ready', schedule);
  new MutationObserver(records => {
    if (records.some(record => record.type === 'childList' || /^data-us-task-(completed|changing)$/.test(record.attributeName))) schedule();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-us-task-completed', 'data-us-task-changing']});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();

  window.UnionSuiteTaskProgress = Object.freeze({refresh: schedule, version: '0.1-candidate'});
})();
/* US-TASK-PROGRESS:END */

/* US-NOTES-LEDGER:START — More control for capped notes in us-notes--ledger.
   Target: new block beside US-RECORD-CARDS in zUnionSuite.js.
   The note body is capped at three lines by CSS. This shows the More button
   of a row only when its note actually overflows the cap, and toggles the row
   open (is-expanded) and closed again. Rows are measured when they appear and
   when the window changes width. */
(function () {
  'use strict';
  if (window.UnionSuiteNotesLedger) return;

  function measure(row) {
    const body = row.querySelector('.us-note__body');
    const more = row.querySelector('.us-note__more');
    if (!body || !more) return;
    // Measure against the cap, so an open row is closed for the reading.
    const open = row.classList.contains('is-expanded');
    if (open) row.classList.remove('is-expanded');
    const overflows = body.scrollHeight > body.clientHeight + 1;
    if (open) row.classList.add('is-expanded');
    more.hidden = !overflows && !open;
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      document.querySelectorAll('.us-notes--ledger .us-note--ledger').forEach(row => {
        if (!row.closest('.us-report-no-styling')) measure(row);
      });
    });
  }

  // The record card's fold timing (US-RECORD-CARDS in zUnionSuite.js).
  const EASE = 'cubic-bezier(.2, 0, 0, 1)';
  const DURATION = 220;
  const running = new WeakMap();

  function reducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  // Opening grows the body from three lines to its full height. Closing
  // shrinks it with the full text still showing, and the three-line cap (and
  // its ellipsis) returns only when the fold ends, so the text never jumps.
  function toggle(row, open) {
    const body = row.querySelector('.us-note__body');
    // Measured before cancelling, so a click mid-fold reverses from where it is.
    const before = body.getBoundingClientRect().height;
    running.get(body)?.cancel();
    row.classList.toggle('is-expanded', open);
    const after = body.getBoundingClientRect().height;
    if (reducedMotion() || !body.animate || Math.abs(after - before) < 1) return;

    if (!open) row.classList.add('is-expanded');
    body.style.overflow = 'hidden';
    const animation = body.animate(
      [{height: before + 'px'}, {height: after + 'px'}],
      {duration: DURATION, easing: EASE}
    );
    running.set(body, animation);
    const settle = () => {
      if (running.get(body) !== animation) return;
      running.delete(body);
      body.style.overflow = '';
      if (!open) row.classList.remove('is-expanded');
    };
    animation.finished.then(settle, settle);
  }

  document.addEventListener('click', event => {
    const more = event.target.closest('.us-notes--ledger .us-note__more');
    if (!more) return;
    const row = more.closest('.us-note--ledger');
    const open = more.getAttribute('aria-expanded') !== 'true';
    more.setAttribute('aria-expanded', String(open));
    more.textContent = open ? 'Less' : 'More';
    toggle(row, open);
  });

  new MutationObserver(records => {
    if (records.some(record => record.type === 'childList')) schedule();
  }).observe(document.documentElement, {subtree: true, childList: true});
  window.addEventListener('resize', schedule, {passive: true});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();

  window.UnionSuiteNotesLedger = Object.freeze({refresh: schedule, version: '0.1-candidate'});
})();
/* US-NOTES-LEDGER:END */
