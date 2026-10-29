// Supported offline example of the case page lists promoted on
// 20 October 2026: the case team (us-case-staff: one card per row and the
// lead staff crowns), a detailed meeting row (us-meeting--full) under
// filters that start open (us-query-search-open), a restricted attachment
// (US-RESTRICTED-ATTACHMENTS) and a compact empty state
// (us-placeholder--compact). The rows are authored samples in the iMIS
// wrapper; the styling and behaviour are the theme's own code. The access
// check is a stand-in that grants the first press.
const sources = ['Theme/UnionSuite-Guides/usage/build/case-lists-example.cjs'];

const esc = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

// One Query Template Display iPart: the class wrapper iMIS inserts, the
// panel and its rows.
function ipart(classes, title, rows) {
  return '<div class="ContentItemContainer"><div class="' + classes + '"><div class="panel">' +
    '<div class="panel-heading"><h2 class="panel-title">' + esc(title) + '</h2></div>' +
    '<div class="panel-body-container"><div class="panel-body"><div class="QueryTemplateSet">' + rows +
    '</div></div></div></div></div></div>';
}

const section = html => '<section><div class="QueryTemplateItem">' + html + '</div></section>';

function staff(ordinal, id, name, role, type, lead, email) {
  return section('<article class="us-contact-tile us-contact-tile--card" data-us-contact-id="' + id + '" data-us-contact-ordinal="' + ordinal + '" data-us-contact-name="' + esc(name) + '"' +
    ' data-us-contact-lead="' + lead + '" data-us-contact-group="Case team" data-us-contact-group-tone="info" data-us-contact-role="' + esc(role) + '" data-us-contact-type="' + esc(type) + '">' +
    '<span class="us-avatar us-avatar--md" data-us-avatar-name="' + esc(name) + '" aria-hidden="true"></span>' +
    '<div class="us-contact-tile__body"><p class="us-contact-tile__name"><a href="#case-lists">' + esc(name) + '</a></p>' +
    '<p class="us-contact-tile__meta us-contact-tile__meta--inline"><span class="us-contact-tile__role">' + esc(role) + '</span><span class="us-contact-tile__type">' + esc(type) + '</span></p>' +
    '<p class="us-contact-tile__reach"><span class="us-contact-tile__email"><button type="button" class="us-contact-tile__copy" aria-label="Copy email address" title="Copy email address"><i class="ti ti-mail" aria-hidden="true"></i></button><span class="us-contact-tile__value">' + esc(email) + '</span></span></p></div>' +
    '<div class="us-contact-tile__actions"><span class="us-case-staff__crown" role="img" aria-label="Lead staff member" title="Lead staff member"><i class="ti ti-crown" aria-hidden="true"></i></span>' +
    '<button type="button" class="us-case-staff__make-lead us-action-cases-set-lead-staff" data-ordinal="' + ordinal + '">Make lead staff</button></div>' +
    '</article>');
}

const meeting = section('<div class="us-meeting us-meeting--full" data-us-meeting-date="2099-10-14" data-us-search="Employer meeting Bullying Northside">' +
  '<span class="us-meeting__tile" aria-hidden="true"><span class="us-meeting__month">Oct</span><span class="us-meeting__day">14</span></span>' +
  '<span class="us-meeting__copy"><span class="us-meeting__title">Employer meeting – Bullying</span>' +
  '<span class="us-meeting__meta"><span>10:00 AM</span><span>Northside Distribution, Dandenong</span>' +
  '<span class="us-meeting__people"><i class="ti ti-users" aria-hidden="true"></i><span class="sr-only">Attending: </span><span>Priya Natarajan, Mary O’Conner, HR Manager</span></span></span>' +
  '<span class="us-meeting__notes">Raise the night shift supervisor’s comments, ask for the roster and CCTV log for 22 September, and agree interim arrangements.</span>' +
  '<span class="us-meeting__outcome"><strong>Outcome</strong> <span></span></span></span></div>');

function file(ordinal, name, access) {
  return section('<div class="us-attachment" data-ordinal="' + ordinal + '" data-us-attachment-access="' + access + '">' +
    '<span class="us-attachment__file" aria-hidden="true"><i class="ti ti-file-text"></i></span>' +
    '<div class="us-attachment__copy"><span class="us-attachment__name">' + esc(name) + '</span><p class="us-attachment__meta"><span>Mary O’Conner</span><span>8/10/2026</span></p></div>' +
    '<div class="us-attachment__actions"><button type="button" class="TextButton us-outline-button">View</button></div></div>');
}

const empty = '<div class="us-placeholder us-placeholder--compact"><span class="us-placeholder__icon" aria-hidden="true"><i class="ti ti-paperclip"></i></span>' +
  '<h3>No attachments yet</h3><p>Upload statements, letters and other documents.</p></div>';

function documentHtml({css, themeJs}) {
  const check = 'window.UnionSuiteRestrictedAttachments.defineCheck(()=>new Promise(resolve=>setTimeout(resolve,600)));';
  // Stand-ins for the site's case actions (Scripts/ActionDefinitions.js),
  // through configure, the registry's intentional replacement: Add staff
  // reports what it would do; Make lead staff moves the crown in place.
  const actions = String(() => {
    const status = text => { document.getElementById('demo-status').textContent = text; };
    const define = (key, presentation, run) => window.UnionSuiteActions.configure('cases.' + key, {
      className: 'us-action-cases-' + key, owner: 'guide', source: 'case-lists-example:' + key,
      presentation, action: {type: 'function', run}
    });
    define('add-staff', {label: 'Add staff', icon: 'plus', default: 'button'},
      () => status('Add staff: your site’s composer adds a staff member to the case.'));
    define('set-lead-staff', {label: 'Make lead staff', icon: 'ti-crown', default: 'icon', row: 'icon'}, ({trigger}) => {
      const card = trigger.closest('.us-contact-tile');
      document.querySelectorAll('.us-case-staff .us-contact-tile').forEach(tile => tile.setAttribute('data-us-contact-lead', String(tile === card)));
      card.setAttribute('data-us-lead-arrived', '');
      setTimeout(() => card.removeAttribute('data-us-lead-arrived'), 440);
      status(card.querySelector('.us-contact-tile__name').textContent.trim() + ' is now the lead staff member (simulated; nothing is saved).');
    });
  });
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css +
    'html{height:auto}body{height:auto;min-height:0;padding:16px;margin:0;background:var(--bg-page)}' +
    '.demo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));gap:16px;align-items:start}' +
    '#demo-status{margin:0 0 12px;font-size:13px;color:var(--text-muted)}</style><body>' +
    '<p id="demo-status">Press Unlock on the restricted file, or the crown on a staff card. Sample rows; the access check and actions are stand-ins.</p>' +
    '<div class="demo-grid">' +
    ipart('us-case-staff', 'Case team', staff('11', '104203', 'Mary O’Conner', 'Case manager', 'Staff', 'true', 'moconner@example.com') + staff('12', '104477', 'Dani Sundara', 'Support', 'Staff', 'false', 'dsundara@example.com')) +
    '<div>' + ipart('us-query-template us-meetings us-query-search us-query-search-open', 'Meetings', meeting) +
    '<div style="height:16px"></div>' +
    ipart('us-query-template us-attachments', 'Attachments', file('803', 'Statement – Priya Natarajan', 'restricted') + file('802', 'Night shift roster September', '')) +
    '<div style="height:16px"></div>' +
    ipart('us-query-template us-attachments', 'Attachments (empty)', empty) + '</div>' +
    '</div>' +
    '<script>' + themeJs + '<\/script>' +
    '<script>' + check + '(' + actions + ')();<\/script></body></html>';
}

module.exports = {sources, documentHtml};
