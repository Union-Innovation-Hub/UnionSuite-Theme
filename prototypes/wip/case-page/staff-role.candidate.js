/* US-CASE-STAFF-ROLE (candidate; owner, 16 November 2026: option A of
   staff-edit-compare.html). The role on a staff card is a button that opens
   the role menu, as the Work label opens the jobs menu on the member card
   (US-CASE-WORKPLACE): the same menu, the case's choice tinted with a
   leading bar. Choosing a role saves it. There is no Edit staff pencil.
   Target: zUnionSuite.js, beside US-CASE-WORKPLACE; its styles are the C44
   section of case-page.candidate.css (target: US-CONTACT-TILES).
   Nothing here is in the theme yet; index.html loads it.

   The button (Case-Staff-Query-Template.html):
     <button type="button" class="us-contact-tile__role us-case-staff__role"
       data-ordinal="{#query.Ordinal}" data-us-staff-role-code="{#query.ContactRoleCode}"
       aria-haspopup="menu" aria-expanded="false">
       <span class="us-case-staff__role-text">{#query.ContactRole}</span>
       <i class="ti ti-chevron-down" aria-hidden="true"></i></button>

   The roles are the case contact types, ROLES (the Add staff composer's
   Role list; owner, 16 November 2026): value and label columns, read once for the page. The menu ticks
   the card's role by code (data-us-staff-role-code) or, without one, by
   name.

   Choosing another role shows it at once (its text fades in) while it
   saves through the proposed CloudToolz endpoint
   POST /cases/quick-update/set-staff-role {CaseID, CaseNum, StaffOrdinal,
   Role}, which logs "Staff updated". A failed save puts the old role back
   and says "Not saved. Try again." under the card's details. The list is
   not redrawn, so nothing flashes; the card's search text follows the new
   role.

   Keyboard: Enter or Space opens the menu on the chosen role; the arrows,
   Home and End move; Enter chooses; Escape closes and returns to the
   button; Tab closes. A press elsewhere, a scroll or a resize closes it. */
(function () {
  'use strict';
  if (window.UnionSuiteCaseStaffRole) return;

  const ROLES = '$/_i4u_/Core/Cases/Value Lists/Case - Form Data/Case Value List - Case Contact Types';
  const SAVE = '/cases/quick-update/set-staff-role';
  const BUTTON = '.us-case-staff .us-case-staff__role';
  const CARD = '[data-us-contact-ordinal]';
  const EASE = 'cubic-bezier(.2, 0, 0, 1)';
  const reducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const columnKey = name => String(name).replace(/[\s_]/g, '').toLowerCase();
  const column = (row, name) => row?.[Object.keys(row || {}).find(key => columnKey(key) === columnKey(name))];
  const same = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

  // ── The roles, read once ────────────────────────────────────
  let roles = null;
  function loadRoles() {
    roles ||= (async () => {
      const params = new URLSearchParams({QueryName: ROLES, offset: '0', limit: '100'});
      const token = document.querySelector('input[name="__RequestVerificationToken"], input#__RequestVerificationToken')?.value;
      const response = await fetch('/api/query?' + params, {credentials: 'same-origin',
        headers: {Accept: 'application/json', ...(token ? {RequestVerificationToken: token} : {})}});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return ((await response.json())?.Items?.$values || [])
        .map(row => ({value: String(column(row, 'value') ?? '').trim(), label: String(column(row, 'label') ?? '').trim()}))
        .filter(role => role.value)
        .map(role => ({...role, label: role.label || role.value}));
    })().catch(error => {
      roles = null;
      throw error;
    });
    return roles;
  }

  // ── The card ────────────────────────────────────────────────
  const textOf = button => button.querySelector('.us-case-staff__role-text') || button;
  const caseValue = name => new URLSearchParams(location.search).get(name) || '';

  function chosen(button, list) {
    const code = button.getAttribute('data-us-staff-role-code');
    return list.find(role => code ? same(role.value, code) : same(role.label, textOf(button).textContent)) || null;
  }

  function show(button, role) {
    const text = textOf(button);
    text.textContent = role.label;
    button.setAttribute('data-us-staff-role-code', role.value);
    button.setAttribute('aria-label', 'Role on this case: ' + role.label + '. Change role');
    const card = button.closest(CARD);
    if (card) {
      const before = card.getAttribute('data-us-contact-role') || '';
      card.setAttribute('data-us-contact-role', role.label);
      const search = card.getAttribute('data-us-search');
      if (search != null && before) card.setAttribute('data-us-search', search.replace(before, role.label));
    }
    if (!reducedMotion() && text.animate) text.animate([{opacity: .25}, {opacity: 1}], {duration: 220, easing: EASE});
  }

  // One line under the card's details, for a failed save or roles that
  // could not be read; the next press clears it.
  function report(button, message) {
    const card = button.closest(CARD);
    const body = card?.querySelector('.us-contact-tile__body');
    if (!body) return;
    let line = body.querySelector('.us-case-staff__role-error');
    if (!message) { line?.remove(); return; }
    if (!line) {
      line = document.createElement('p');
      line.className = 'us-case-staff__role-error';
      line.setAttribute('role', 'alert');
      body.append(line);
    }
    line.textContent = message;
  }

  async function save(button, role) {
    const cloudToolz = window.UnionSuiteAgreements?.cloudToolz;
    if (!cloudToolz) throw new Error('The CloudToolz call (UnionSuiteAgreements) is unavailable.');
    const response = await cloudToolz(SAVE, {method: 'POST', body: JSON.stringify({
      CaseID: caseValue('CaseID'), CaseNum: caseValue('CaseNum'), StaffOrdinal: button.getAttribute('data-ordinal'), Role: role.value
    })});
    if (response && response.ok === false) throw new Error('HTTP ' + response.status);
  }

  async function choose(button, role, list) {
    const previous = chosen(button, list) || {value: button.getAttribute('data-us-staff-role-code') || '', label: textOf(button).textContent.trim()};
    if (same(previous.value, role.value)) return;
    report(button, '');
    show(button, role);
    button.setAttribute('aria-busy', 'true');
    try {
      await save(button, role);
      document.dispatchEvent(new CustomEvent('us:case-staff-role-changed', {detail: {ordinal: button.getAttribute('data-ordinal'), role}}));
    } catch (error) {
      console.warn('[UnionSuiteCaseStaffRole]', error.message);
      show(button, previous);
      report(button, 'Not saved. Try again.');
    } finally {
      button.removeAttribute('aria-busy');
    }
  }

  // ── The menu (US-CASE-WORKPLACE's) ──────────────────────────
  let menu = null;
  let owner = null;
  let shown = [];

  function buildMenu() {
    const node = document.createElement('div');
    node.className = 'us-case-workplace-menu us-case-staff-role-menu';
    node.setAttribute('role', 'menu');
    node.setAttribute('aria-label', 'Role on this case');
    node.hidden = true;
    node.addEventListener('click', event => {
      const item = event.target.closest('.us-case-workplace-menu__item');
      if (!item || !owner) return;
      const button = owner;
      const role = shown[Number(item.dataset.index)];
      const list = shown;
      close(true);
      if (role) void choose(button, role, list);
    });
    node.addEventListener('keydown', onMenuKey);
    document.body.append(node);
    return node;
  }

  const items = () => [...menu.querySelectorAll('.us-case-workplace-menu__item')];

  function render(list, current) {
    const group = document.createElement('div');
    group.className = 'us-case-workplace-menu__group';
    const heading = document.createElement('div');
    heading.className = 'us-case-workplace-menu__heading';
    heading.textContent = 'Role on this case';
    group.append(heading);
    list.forEach((role, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'us-case-workplace-menu__item';
      item.setAttribute('role', 'menuitemradio');
      item.setAttribute('aria-checked', String(role === current));
      item.dataset.index = String(index);
      const title = document.createElement('span');
      title.className = 'us-case-workplace-menu__title';
      title.textContent = role.label;
      item.append(title);
      group.append(item);
    });
    menu.replaceChildren(group);
  }

  // Under the button, or above it when the window has no room below.
  function place(button) {
    const rect = button.getBoundingClientRect();
    const height = menu.offsetHeight;
    const below = rect.bottom + 4;
    const top = below + height > window.innerHeight - 8 ? Math.max(8, rect.top - 4 - height) : below;
    const left = rect.left + menu.offsetWidth > window.innerWidth - 8 ? rect.right - menu.offsetWidth : rect.left;
    menu.style.top = top + 'px';
    menu.style.left = Math.max(8, left) + 'px';
  }

  async function open(button) {
    menu ||= buildMenu();
    if (owner === button) { close(true); return; }
    if (owner) close(false);
    if (button.getAttribute('aria-busy') === 'true') return;
    report(button, '');
    button.setAttribute('aria-busy', 'true');
    let list;
    try {
      list = await loadRoles();
    } catch (error) {
      console.warn('[UnionSuiteCaseStaffRole] The roles could not be read:', error.message);
      report(button, 'The roles could not be loaded. Try again.');
      return;
    } finally {
      button.removeAttribute('aria-busy');
    }
    if (!button.isConnected || !list.length) return;
    owner = button;
    shown = list;
    render(list, chosen(button, list));
    menu.hidden = false;
    place(button);
    button.setAttribute('aria-expanded', 'true');
    if (!reducedMotion() && menu.animate) {
      menu.animate([{opacity: 0, transform: 'translateY(-4px)'}, {opacity: 1, transform: 'none'}], {duration: 140, easing: EASE});
    }
    (items().find(item => item.getAttribute('aria-checked') === 'true') || items()[0]).focus({preventScroll: true});
  }

  function close(returnFocus) {
    if (!menu || !owner) return;
    const button = owner;
    owner = null;
    button.setAttribute('aria-expanded', 'false');
    if (returnFocus) button.focus({preventScroll: true});
    if (reducedMotion() || !menu.animate) { menu.hidden = true; return; }
    menu.animate([{opacity: 1}, {opacity: 0}], {duration: 100, easing: 'ease-out'}).finished.then(() => {
      if (!owner) menu.hidden = true;
    }, () => {});
  }

  function onMenuKey(event) {
    const list = items();
    const index = list.indexOf(document.activeElement);
    const moves = {ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: list.length - 1};
    if (event.key in moves) {
      event.preventDefault();
      list[(moves[event.key] + list.length) % list.length].focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (event.key === 'Tab') {
      close(false);
    }
  }

  // ── Wiring ──────────────────────────────────────────────────
  document.addEventListener('click', event => {
    const button = event.target.closest(BUTTON);
    if (!button) return;
    event.preventDefault();
    void open(button);
  });

  document.addEventListener('pointerdown', event => {
    if (owner && !menu.contains(event.target) && !owner.contains(event.target)) close(false);
  }, true);
  addEventListener('scroll', event => {
    if (owner && !menu.contains(event.target)) close(false);
  }, true);
  addEventListener('resize', () => close(false));

  // Read the roles early, so the first press opens at once.
  if (document.querySelector('.us-case-staff')) loadRoles().catch(() => {});

  window.UnionSuiteCaseStaffRole = Object.freeze({version: 'candidate'});
})();
