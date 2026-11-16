/* Remove staff from a case (candidate; owner, 16 November 2026: "a remove
   button on the card", with warnings when removing the lead staff member
   or the last staff member on an Individual-access case, both allowed;
   removal with Undo when there is nothing to warn about).
   Target: Theme/UnionSuite/Scripts/ActionDefinitions.js, beside
   cases.set-lead-staff. Load after zUnionSuite.js and ActionDefinitions.js.
   Nothing here is in the theme yet; index.html loads it.

   cases.remove-staff: the theme's trash icon on a staff card, grey until
   hover or focus like the card's crown and pencil (no danger tone).

   1. The check. Pressed, the icon shows the theme's busy spinner while it
      reads the case as it is now, not as the list was drawn (owner: the
      case may have changed through a quick action on the page, or in
      another tab). STAFF_CHECK, through GET /api/query, has one row per
      staff member on the case, filtered on CaseNum:
        Ordinal      the case staff row's ordinal (the card's data-ordinal)
        IsLead       'true' for the case's lead staff member
        CaseAccess   the case's Access: Open, Team or Individual (the same
                     on every row)
        CanOpen      optional: 'false' for a row that does not let that
                     person open an Individual case (if delegates don't
                     count); left out or blank, every row counts
      Nothing can be removed until the check answers, whether it succeeds
      or fails.

   2a. Nothing to warn about: the card closes up at once and a notice says
      "<name> removed from the case." with Undo. The save waits until the
      notice runs out (UNDO_MS; the countdown pauses while the pointer or
      focus is on the notice), so Undo only cancels the wait: nothing was
      saved and nothing is logged (owner: change-log entries cannot be
      deleted). Leaving or hiding the page saves anything still waiting at
      once (keepalive). A failed save brings the card back with an error.

   2b. Something to warn about, or the check failed: the card asks on
      itself (no dialog), "Remove <name> from this case?" ("Remove
      yourself…" for your own card), Cancel focused:
        - first, in red: removing yourself from an Individual case, "You'll
          lose access to this case." (it allows for managers and system
          administrators, who keep access);
        - then one amber list: the lead staff member (the case will have no
          lead), and no staff left who can open an Individual case;
        - a failed check says the access couldn't be checked.
      The card's border takes a hint of danger, the crown and pencil are
      inert, and the buttons are kept in view. Remove saves straight away
      (it was confirmed); Escape or Cancel puts focus back on the icon.

   2c. The person is no longer on the case (removed in another tab): the
      card says so with OK, and the list reloads.

   The save is the proposed CloudToolz endpoint
   POST /cases/quick-update/remove-staff {CaseID, CaseNum, StaffID,
   StaffOrdinal}: it removes the case staff row, clears the case's lead when
   it was this person, and logs "Staff removed". Then the list re-renders
   and the banner's Lead staff fact reloads. */
(function () {
  'use strict';
  const actions = window.UnionSuiteActions;
  if (!actions?.define) throw new Error('Load the current zUnionSuite.js before remove-staff.candidate.js.');

  const STAFF_CHECK = '$/_i4u_/Core/Cases/UnionSuite/Manage Case/API - Manage Case - Staff Removal Check';
  const REMOVE = '/cases/quick-update/remove-staff';
  const UNDO_MS = 6000;

  const caseId = {from: 'query', parameter: 'CaseID', required: true, validate: value => /^[A-Za-z0-9_-]+$/.test(String(value)) || 'Invalid case ID.'};
  const caseNum = {from: 'query', parameter: 'CaseNum', required: true, validate: value => /^\d+$/.test(String(value)) || 'Invalid case number.'};
  const rowOrdinal = {from: 'trigger', attribute: 'data-ordinal', required: true, validate: value => /^\d+$/.test(String(value)) || 'Invalid record ordinal.'};
  const staffId = {from: 'closest', selector: '[data-us-contact-id]', attribute: 'data-us-contact-id', required: true,
    validate: value => /^[A-Za-z0-9_-]+$/.test(String(value)) || 'Invalid staff ID.'};

  const CARD = '[data-us-contact-ordinal]';
  const EASE = 'cubic-bezier(.2, 0, 0, 1)';
  const reducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const isTrue = value => /^(true|1|yes)$/i.test(String(value ?? '').trim());
  const isFalse = value => /^(false|0|no)$/i.test(String(value ?? '').trim());
  // A row's column by name, whatever its case, spaces or underscores.
  const columnKey = name => String(name).replace(/[\s_]/g, '').toLowerCase();
  const column = (row, name) => row?.[Object.keys(row || {}).find(key => columnKey(key) === columnKey(name))];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function icon(name) {
    const node = element('i', 'ti ' + name);
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  // ── The check ───────────────────────────────────────────────

  // The case's staff as they are now (STAFF_CHECK).
  async function staffNow(caseNumber) {
    const params = new URLSearchParams({QueryName: STAFF_CHECK, CaseNum: String(caseNumber), offset: '0', limit: '200'});
    const token = document.querySelector('input[name="__RequestVerificationToken"], input#__RequestVerificationToken')?.value;
    const response = await fetch('/api/query?' + params, {credentials: 'same-origin',
      headers: {Accept: 'application/json', ...(token ? {RequestVerificationToken: token} : {})}});
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const rows = (await response.json())?.Items?.$values || [];
    return {
      access: String(column(rows[0], 'CaseAccess') ?? '').trim().toLowerCase(),
      staff: rows.map(row => ({
        ordinal: String(column(row, 'Ordinal') ?? '').trim(),
        lead: isTrue(column(row, 'IsLead')),
        canOpen: !isFalse(column(row, 'CanOpen'))
      }))
    };
  }

  // The signed-in staff member's iMIS ID, from the page's client context.
  function signedInId() {
    try { return String(JSON.parse(document.getElementById('__ClientContext')?.value || '{}').loggedInPartyId || ''); }
    catch (_) { return ''; }
  }

  const LEAD = (name, self) => (self ? "You're" : name + ' is') + ' the lead staff member. The case will have no lead until ' +
    (self ? 'someone else is made lead.' : 'you make someone else lead.');
  const LAST = 'No staff will be left on this case. Its access is Individual, ' +
    'so only managers and system administrators will be able to open it.';
  const UNCHECKED = "The case's access couldn't be checked just now. If it is Individual and " +
    'no other staff are on the case, only managers and system administrators will be able to open it.';
  // Removing yourself from an Individual case (owner, 16 November 2026: "a
  // loud alert saying you will lose access to this case"). Managers and
  // system administrators keep access, so the wording allows for them
  // rather than the theme guessing the viewer's roles.
  const SELF = {
    title: "You'll lose access to this case.",
    text: "You're removing yourself, and its access is Individual. You won't be able to open it again " +
      "unless you're a manager or system administrator."
  };
  const SELF_UNCHECKED = {
    title: 'You may lose access to this case.',
    text: "You're removing yourself. If its access is Individual, you won't be able to open it again " +
      "unless you're a manager or system administrator."
  };

  // What this removal needs said, from the case as it is now.
  function findingsFor(name, ordinal, self, now) {
    const me = now.staff.find(row => row.ordinal === ordinal);
    const othersWhoCanOpen = now.staff.filter(row => row.ordinal !== ordinal && row.canOpen).length;
    const individual = now.access === 'individual';
    const warnings = [];
    if (me?.lead) warnings.push(LEAD(name, self));
    if (individual && !othersWhoCanOpen) warnings.push(LAST);
    return {alert: self && individual ? SELF : null, warnings};
  }

  // ── The question (2b) and the notice that someone has gone (2c) ──

  // The loud alert: its own heading, in danger red, first.
  function alertBlock({title, text}) {
    const block = element('div', 'us-staff-remove__alert');
    const body = element('div');
    body.append(element('strong', '', title), element('span', '', text));
    block.append(icon('ti-alert-octagon'), body);
    return block;
  }

  // The warnings, as one block with one icon and a list (impeccable
  // critique, 16 November 2026: two stacked boxes were heavy in a narrow
  // column).
  function warningBlock(lines) {
    const block = element('div', 'us-staff-remove__warning');
    const list = element('ul');
    lines.forEach(line => list.append(element('li', '', line)));
    block.append(icon('ti-alert-triangle'), list);
    return block;
  }

  // A box on the card, with its buttons. Resolves with the pressed
  // button's value; Escape is the first (safe) one. While it shows, the
  // card's border takes a hint of danger and its other controls are inert.
  function askOnCard(card, trigger, label, lines, choices) {
    const box = element('div', 'us-staff-remove');
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', label);
    const row = element('div', 'us-staff-remove__buttons');
    const buttons = choices.map(({text, value, danger}) => {
      const button = element('button', 'TextButton ' + (danger ? 'DangerButton' : 'us-outline-button'), text);
      button.type = 'button';
      button.dataset.value = String(value);
      row.append(button);
      return button;
    });
    box.append(...lines, row);
    const locked = [...card.querySelectorAll('.us-contact-tile__actions > :is(button, a)')].filter(node => node !== trigger && !node.inert);
    locked.forEach(node => { node.inert = true; });
    card.setAttribute('data-us-staff-removing', '');
    card.append(box);
    buttons[0].focus({preventScroll: true});
    box.scrollIntoView?.({block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth'});
    return new Promise(resolve => {
      const finish = value => {
        box.remove();
        locked.forEach(node => { node.inert = false; });
        card.removeAttribute('data-us-staff-removing');
        resolve(value);
      };
      buttons.forEach((button, index) => button.addEventListener('click', () => finish(choices[index].value)));
      box.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); finish(choices[0].value); }
      });
    });
  }

  function question(text, name) {
    const line = element('p', 'us-staff-remove__question');
    line.append(...text(element('strong', '', name)));
    return line;
  }

  // ── Removal with Undo (2a) ──────────────────────────────────

  // Removals waiting out their Undo, by case staff ordinal.
  const waiting = new Map();
  let notices = null;

  function noticeArea() {
    if (notices?.isConnected) return notices;
    notices = element('div', 'us-undo-notices');
    notices.setAttribute('role', 'status');
    notices.setAttribute('aria-live', 'polite');
    document.body.append(notices);
    return notices;
  }

  function showNotice(text, actionsList) {
    const notice = element('div', 'us-undo-notice');
    notice.append(element('span', 'us-undo-notice__text', text));
    actionsList.forEach(({label, run}) => {
      const button = element('button', 'us-undo-notice__button', label);
      button.type = 'button';
      button.addEventListener('click', run);
      notice.append(button);
    });
    noticeArea().append(notice);
    return notice;
  }

  function closeNotice(notice) {
    if (!notice?.isConnected) return;
    if (reducedMotion() || !notice.animate) { notice.remove(); return; }
    notice.animate([{opacity: 1}, {opacity: 0, transform: 'translateY(6px)'}], {duration: 160, easing: EASE})
      .finished.then(() => notice.remove(), () => notice.remove());
  }

  // The card's result section closes up, then stays hidden.
  async function hideItem(item) {
    if (!reducedMotion() && item.animate) {
      const height = item.getBoundingClientRect().height;
      item.style.overflow = 'hidden';
      await item.animate([
        {height: height + 'px', opacity: 1},
        {height: '0px', opacity: 0, marginTop: '0px', marginBottom: '0px', paddingTop: '0px', paddingBottom: '0px'}
      ], {duration: 220, easing: EASE}).finished.catch(() => {});
      item.style.removeProperty('overflow');
    }
    item.hidden = true;
  }

  function showItem(item) {
    item.hidden = false;
    if (!reducedMotion() && item.animate) item.animate([{opacity: 0}, {opacity: 1}], {duration: 180, easing: EASE});
  }

  function save(context, {keepalive = false} = {}) {
    const cloudToolz = window.UnionSuiteAgreements?.cloudToolz;
    if (!cloudToolz) return Promise.reject(new Error('The CloudToolz call (UnionSuiteAgreements) is unavailable.'));
    return cloudToolz(REMOVE, {method: 'POST', keepalive,
      body: JSON.stringify({CaseID: context.caseId, CaseNum: context.caseNum, StaffID: context.staffId, StaffOrdinal: context.ordinal})});
  }

  // After a save: the list as it is now, and the banner's Lead staff fact.
  function afterSave(env) {
    window.UnionSuiteBannerFacts?.reload?.();
    return env.refresh.originReport();
  }

  async function removeWithUndo(env, card, name) {
    const ordinal = String(env.context.ordinal);
    const item = card.closest('.QueryTemplateSet > section') || card;
    const entry = {env, item, name, notice: null, timer: 0, state: 'waiting'};
    waiting.set(ordinal, entry);
    await hideItem(item);

    const undo = () => {
      if (entry.state !== 'waiting') return;
      entry.state = 'undone';
      clearTimeout(entry.timer);
      waiting.delete(ordinal);
      closeNotice(entry.notice);
      const current = currentItem(ordinal) || item;
      showItem(current);
      current.querySelector('.us-action-cases-remove-staff')?.focus({preventScroll: true});
    };
    entry.notice = showNotice(name + ' removed from the case.', [{label: 'Undo', run: undo}]);
    const restart = () => { clearTimeout(entry.timer); entry.timer = setTimeout(() => commit(ordinal), UNDO_MS); };
    entry.notice.addEventListener('pointerenter', () => clearTimeout(entry.timer));
    entry.notice.addEventListener('pointerleave', restart);
    entry.notice.addEventListener('focusin', () => clearTimeout(entry.timer));
    entry.notice.addEventListener('focusout', restart);
    restart();
    // Focus would otherwise fall to the page: Undo is the next thing to do.
    entry.notice.querySelector('button')?.focus({preventScroll: true});
  }

  // The card for an ordinal in the list now (the list may have re-rendered).
  function currentItem(ordinal) {
    const card = document.querySelector('.us-case-staff ' + CARD + '[data-us-contact-ordinal="' + CSS.escape(ordinal) + '"]');
    return card ? card.closest('.QueryTemplateSet > section') || card : null;
  }

  async function commit(ordinal, {keepalive = false} = {}) {
    const entry = waiting.get(ordinal);
    if (!entry || entry.state !== 'waiting') return;
    entry.state = 'saving';
    clearTimeout(entry.timer);
    closeNotice(entry.notice);
    try {
      const response = await save(entry.env.context, {keepalive});
      if (response && response.ok === false) throw new Error('HTTP ' + response.status);
      waiting.delete(ordinal);
      if (!keepalive) await afterSave(entry.env);
    } catch (error) {
      waiting.delete(ordinal);
      console.error('[cases.remove-staff] The removal could not be saved:', error);
      if (keepalive) return;
      showItem(currentItem(ordinal) || entry.item);
      const notice = showNotice(entry.name + " couldn't be removed. Check your connection and try again.",
        [{label: 'Dismiss', run: () => closeNotice(notice)}]);
      notice.classList.add('us-undo-notice--error');
    }
  }

  // Leaving or hiding the page saves what is still waiting, at once.
  function flushAll() {
    [...waiting.keys()].forEach(ordinal => commit(ordinal, {keepalive: true}));
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushAll(); });
  window.addEventListener('pagehide', flushAll);

  // A list refreshed by another action brings back a card still waiting
  // out its Undo: hide it again.
  document.addEventListener('us:query-template-refreshed', () => {
    waiting.forEach((entry, ordinal) => {
      if (entry.state !== 'waiting') return;
      const item = currentItem(ordinal);
      if (item) { item.hidden = true; entry.item = item; }
    });
  });

  // ── The press ───────────────────────────────────────────────

  // The action's confirm step: true saves now (a confirmed question);
  // false ends the action (cancelled, already gone, or removing with Undo,
  // which saves later by itself). One press per card at a time.
  const busy = new WeakMap();
  function press(env) {
    const trigger = env.trigger;
    const card = trigger?.closest(CARD);
    if (!card) return Promise.resolve(window.confirm('Remove this staff member from the case?'));
    if (busy.has(card)) return busy.get(card);
    const name = card.getAttribute('data-us-contact-name') || 'this person';
    const ordinal = String(env.context.ordinal);
    const me = signedInId();
    const self = !!me && me === String(card.getAttribute('data-us-contact-id') || '');
    const who = self ? 'yourself' : name;

    const pending = (async () => {
      let found;
      try {
        const now = await staffNow(env.context.caseNum);
        if (!now.staff.some(row => row.ordinal === ordinal)) {
          await askOnCard(card, trigger, 'Remove ' + name, [
            question(strong => [strong, ' no longer on this case. It was changed somewhere else.'], self ? 'You are' : name + ' is')
          ], [{text: 'OK', value: false}]);
          env.refresh.originReport();
          return false;
        }
        found = findingsFor(name, ordinal, self, now);
      } catch (error) {
        console.warn('[cases.remove-staff] The staff check failed:', error.message);
        const lead = isTrue(card.getAttribute('data-us-contact-lead'));
        found = {alert: self ? SELF_UNCHECKED : null, warnings: [...(lead ? [LEAD(name, self)] : []), UNCHECKED]};
      }

      if (!found.alert && !found.warnings.length) {
        removeWithUndo(env, card, name);
        return false;
      }
      const lines = [
        question(strong => ['Remove ', strong, ' from this case?'], who),
        ...(found.alert ? [alertBlock(found.alert)] : []),
        ...(found.warnings.length ? [warningBlock(found.warnings)] : [])
      ];
      const answer = await askOnCard(card, trigger, 'Remove ' + name, lines,
        [{text: 'Cancel', value: false}, {text: 'Remove', value: true, danger: true}]);
      if (!answer && card.isConnected) trigger.focus({preventScroll: true});
      return answer;
    })().finally(() => busy.delete(card));
    busy.set(card, pending);
    return pending;
  }

  // The card closes up and fades; the list's re-render then drops it.
  async function closeUp(card) {
    const item = card?.closest('.QueryTemplateSet > section') || card;
    if (item) await hideItem(item);
  }

  actions.define('cases.remove-staff', {
    className: 'us-action-cases-remove-staff',
    owner: 'UnionSuite',
    source: 'remove-staff.candidate.js:cases.remove-staff',
    presentation: {label: 'Remove from case', icon: 'trash', default: 'button', row: 'icon', menu: 'menu-item'},
    context: {caseId, caseNum, ordinal: rowOrdinal, staffId},
    action: {type: 'function', recordKey: ['caseId', 'ordinal'],
      confirm: env => press(env),
      // A confirmed question saves now; its warnings were the second look.
      run: async ({context, trigger}) => {
        const response = await save(context);
        if (response && response.ok === false) throw new Error('HTTP ' + response.status);
        await closeUp(trigger?.closest(CARD));
      },
      refresh: {when: 'success', run: afterSave},
      successMessage: 'Removed from the case.'}
  });
})();
