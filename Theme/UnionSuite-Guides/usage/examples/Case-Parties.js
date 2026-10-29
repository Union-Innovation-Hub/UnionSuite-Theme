/* Supported offline simulation of US-CASE-PARTIES. The list, preview,
   search, Select toggle and lead-first order are the theme's own code; only
   the sample rows, the party details IQA (GET /api/query) and the three case
   actions are stand-ins. Runs before zUnionSuite.js, so the stubs are in
   place when the theme starts. */
(function () {
  'use strict';

  const parties = [
    {Ordinal: '208', ContactId: '20544', ContactName: 'Priya Natarajan', ContactUrl: '#party-20544', ContactIsLead: 'true', ContactRole: 'Primary party',
      ContactType: 'Member', MemberType: 'Full member', MemberStatus: 'Unfinancial', MemberStanding: 'Unfinancial', MemberStandingTone: 'danger',
      MemberLine: 'Member 20544 · Full member'},
    {Ordinal: '209', ContactId: '20903', ContactName: 'Josh Kemp', ContactUrl: '#party-20903', ContactIsLead: 'false', ContactRole: 'Party',
      ContactType: 'Member', MemberType: 'Full member', MemberStatus: 'Financial', MemberStanding: 'New member', MemberStandingTone: 'warning',
      MemberLine: 'Member 20903 · Full member'},
    {Ordinal: '210', ContactId: '20871', ContactName: 'Lee Hartley', ContactUrl: '#party-20871', ContactIsLead: 'false', ContactRole: 'Party',
      ContactType: 'Former member', MemberType: 'Full member', MemberStatus: 'Resigned', MemberStanding: 'Former member', MemberStandingTone: 'danger',
      MemberLine: 'Member 20871 · Full member'},
    {Ordinal: '211', ContactId: '30112', ContactName: 'Northside Distribution Pty Ltd', ContactUrl: '#party-30112', ContactIsLead: 'false', ContactRole: 'Party',
      ContactType: 'Employer', MemberType: 'Employer', MemberStatus: '', MemberStanding: '', MemberStandingTone: '',
      MemberLine: 'Employer 30112'}
  ];

  // The party details IQA's one row for each ID: column names lay it out
  // (US-FIELD-GROUPS), and the Alert-* columns are the membership warning.
  const work = {'Work-Employer': 'Northside Distribution Pty Ltd', 'Work-Workplace': 'Dandenong DC – night shift', 'Work-Delegate': 'Alex Keaton'};
  const details = {
    20544: {'Alert-Title': 'Unfinancial', 'Alert-Message': 'Paid to 30 Jun 2026. Check eligibility before providing assistance.', 'Alert-Tone': 'danger',
      'Contact-Mobile': '0412 555 019', 'Contact-Email': 'priya.n@example.com', 'Membership-Paid to': '2026-06-30T00:00:00', 'Membership-Joined': '2019-02-11T00:00:00',
      ...work, 'Work-Classification': 'Storeperson Grade 2'},
    20903: {'Alert-Title': 'New member', 'Alert-Message': 'Joined 3 Sep 2026. Check the new member rules before providing assistance.', 'Alert-Tone': 'warning',
      'Contact-Mobile': '', 'Contact-Email': 'josh.kemp@example.com', 'Membership-Paid to': '2027-06-30T00:00:00', 'Membership-Joined': '2026-09-03T00:00:00',
      ...work, 'Work-Classification': 'Storeperson Grade 1'},
    20871: {'Alert-Title': 'No longer a member', 'Alert-Message': 'Resigned 14 Aug 2026. Check whether the union can continue to act.', 'Alert-Tone': 'danger',
      'Contact-Mobile': '0433 555 802', 'Contact-Email': '', 'Membership-Paid to': '2026-08-14T00:00:00', 'Membership-Joined': '2021-05-03T00:00:00',
      ...work, 'Work-Workplace': 'Dandenong DC – day shift', 'Work-Classification': 'Forklift driver'},
    30112: {'Contact-Phone': '(03) 9555 0140', 'Contact-Email': 'hr@northside.example', 'Organisation-ABN': '51 824 753 556',
      'Organisation-Site': 'Dandenong DC, 14 Frankston Road, Dandenong VIC 3175'}
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const fill = (template, row) => template.replace(/\{#query\.(\w+)\}/g, (_, field) => escapeHtml(row[field]));

  // The Query Template Display as iMIS renders it: the iPart CSS class div,
  // the panel, and one section per result.
  const template = window.casePartiesTemplate.replace(/<!--[\s\S]*?-->/g, '').trim();
  document.getElementById('parties-demo').innerHTML =
    '<div class="ContentItemContainer"><div class="us-case-parties"><div class="panel">' +
    '<div class="panel-heading"><h2 class="panel-title">Parties</h2></div>' +
    '<div class="panel-body-container"><div class="panel-body"><div class="QueryTemplateSet">' +
    parties.map(row => '<section><div class="QueryTemplateItem">' + fill(template, row) + '</div></section>').join('') +
    '</div></div></div></div></div></div>';

  const status = text => { document.getElementById('demo-status').textContent = text; };
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    // A srcdoc frame's own address is about:srcdoc, which cannot resolve a path.
    const url = new URL(String(input?.url || input), 'https://guide.example/');
    if (!url.pathname.endsWith('/api/query')) return nativeFetch(input, init);
    const row = details[url.searchParams.get('ID')];
    const body = JSON.stringify({Items: {$values: row ? [row] : []}});
    return new Promise(resolve => setTimeout(() => resolve(new Response(body, {status: 200, headers: {'Content-Type': 'application/json'}})), 250));
  };

  // The theme's case actions (Scripts/ActionDefinitions.js) save through
  // CloudToolz and open the send page; the example replaces them
  // (configure, the registry's intentional replacement) with ones that
  // report what they would do.
  document.addEventListener('DOMContentLoaded', () => {
    const actions = window.UnionSuiteActions;
    const define = (key, presentation, run) => actions.configure('cases.' + key, {
      className: 'us-action-cases-' + key, owner: 'guide', source: 'Case-Parties.js:' + key,
      presentation, action: {type: 'function', run}
    });
    define('add-party', {label: 'Add party', icon: 'ti-user-plus', default: 'button'},
      () => status('Add party: your site’s composer or form adds a contact to the case.'));
    define('email-parties', {label: 'Email parties', icon: 'ti-send', default: 'icon', header: 'icon'}, () => {
      const rows = [...document.querySelectorAll('.us-parties .QueryTemplateSet > section')];
      const ticked = rows.filter(section => section.querySelector('.us-party__check:checked'));
      const shown = rows.filter(section => !section.hidden && !section.hasAttribute('data-us-query-search-hidden'));
      const to = (document.querySelector('.us-parties--selecting') ? ticked : shown)
        .map(section => section.querySelector('.us-party__name').textContent.trim());
      status(to.length ? 'Email parties would open the send page for: ' + to.join(', ') + '.' : 'No parties chosen to email.');
    });
    // In place, as the site's action does: the chosen party takes the
    // crown, and US-LEAD-FIRST moves their row to the top.
    define('set-primary-party', {label: 'Make primary party', icon: 'ti-crown', default: 'icon', row: 'icon'}, ({trigger}) => {
      const pane = trigger.closest('.us-parties__preview');
      const chosen = document.querySelector('.us-party__select[aria-pressed="true"]')?.closest('.us-party');
      if (!pane || !chosen) return;
      document.querySelectorAll('.us-parties .us-party').forEach(row => {
        const lead = row === chosen;
        row.setAttribute('data-us-contact-lead', String(lead));
        row.querySelector('.us-party__select .sr-only').textContent = lead ? ', Primary party' : ', Party';
      });
      pane.setAttribute('data-us-contact-lead', 'true');
      pane.setAttribute('data-us-lead-arrived', '');
      setTimeout(() => pane.removeAttribute('data-us-lead-arrived'), 440);
      status(chosen.querySelector('.us-party__name').textContent.trim() + ' is now the primary party (simulated; nothing is saved).');
    });
  });
})();
