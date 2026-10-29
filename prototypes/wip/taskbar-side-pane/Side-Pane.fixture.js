/* Offline mockup fixture: no iMIS requests and no navigation.
   Runs after the guide's taskbar fixture, which answers Quick Search. */
(function () {
  'use strict';

  // The theme's own switch for Pip (Biscuit), the taskbar's greeting mascot.
  window.UnionSuiteTaskbarConfig = {
    ...window.UnionSuiteTaskbarConfig,
    pipGreeting: false,
    historyStoragePrefix: 'union-suite:side-pane:quick-search-history:'
  };

  const status = text => {
    document.querySelector('#demo-taskbar-status').textContent = text;
  };
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const json = data => new Response(JSON.stringify(data), {status: 200, headers: {'Content-Type': 'application/json'}});
  const hoursAgo = hours => {
    // UpdatedOn arrives from iMIS without a timezone and is read as local time.
    const when = new Date(Date.now() - hours * 3600000);
    return new Date(when.getTime() - when.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
  };

  // Bookmarks live in the i4u_UT_UserSettings row; here, for this preview session only.
  const sampleBookmarks = ['community.find-contacts', 'community.add-contact', 'membership.membership-dashboard', 'events.events'];
  let bookmarks = [...sampleBookmarks];

  const recents = {
    iqa: [
      ['Active members by branch', '$/_i4u_/Core/Membership/Active members by branch', 1],
      ['Renewal follow-up list', '$/_i4u_/Core/Membership/Renewal follow-up list', 5],
      ['Open cases by organiser', '$/_i4u_/Core/Cases/Open cases by organiser', 26],
      ['New applications this month', '$/_i4u_/Core/Membership/New applications this month', 74]
    ],
    content: [
      ['Staff home', '$/Staff/Home', 2],
      ['Contact profile', '$/Staff/Contact profile', 20],
      ['Case', '$/Staff/Cases/Case', 50]
    ]
  };

  function recentRows(address) {
    const type = /Recent%20IQAs|Recent\+IQAs|Recent IQAs/i.test(decodeURIComponent(address)) ? 'iqa' : 'content';
    const sitewide = / - All/.test(decodeURIComponent(address).replace(/\+/g, ' '));
    return recents[type].map(([name, path, hours], index) => ({
      DocumentName: name,
      Path: path,
      DocumentVersionKey: '00000000-0000-0000-0000-00000000000' + index,
      UpdatedOn: hoursAgo(hours),
      UpdatedByUserID: sitewide && index % 2 ? '104019' : '100',
      UpdatedByUsername: sitewide && index % 2 ? 'Alex Morgan' : 'James Driscoll'
    }));
  }

  const searchFetch = window.fetch;
  window.fetch = async (url, options = {}) => {
    const address = String(url);
    if (address.includes('/api/i4u_UT_UserSettings')) {
      await delay(250);
      if ((options.method || 'GET') === 'GET') {
        return json({Items: {$values: [{Properties: {$values: [
          {Name: 'Ordinal', Value: {$type: 'System.Int32', $value: 1}},
          {Name: 'Value', Value: JSON.stringify(bookmarks)}
        ]}}]}});
      }
      const value = JSON.parse(options.body).Properties.$values.find(property => property.Name === 'Value')?.Value;
      if (value) bookmarks = JSON.parse(value);
      return json({Ordinal: 1});
    }
    if (address.includes('/api/query?queryname=')) {
      await delay(450);
      return json({Items: {$values: recentRows(address)}});
    }
    return searchFetch(url, options);
  };

  // iMIS opens Recents items in its own dialog.
  window.ShowDialog_NoReturnValue = (url, _, width, height, title) => status('Example only: ' + title + ' would open in an iMIS dialog.');

  // Bookmarks, palette destinations and native header links would navigate away.
  document.addEventListener('click', event => {
    const link = event.target.closest('#hd a[href], #us-tb-palette a[href]');
    if (!link || link.closest('#sp-pane')) return;
    event.preventDefault();
    const account = link.closest('.account-toggle-wrapper');
    if (link.classList.contains('account-toggle')) {
      const open = account.classList.toggle('open');
      link.setAttribute('aria-expanded', String(open));
      return;
    }
    if (!link.closest('.us-taskbar__results')) {
      const label = link.getAttribute('aria-label') || link.title || link.textContent.trim();
      status('Example only: ' + label + ' would open here.');
    }
  });

  window.UnionSuiteMockup = {
    resetBookmarks() {
      bookmarks = [...sampleBookmarks];
    }
  };
})();
