// I4U_UT_LOGGING PROBE: paste this whole file into the browser console on any
// signed-in staff page of the website (for example the case page).
//
// Read-only: GET requests to the iMIS REST API only. It reads the change log
// panel source i4u_UT_Logging (a multi-instance iMIS data source, one row per
// logged field), newest rows first, and shows them as a table.
//
// Set the options below before pasting, or run it again with
//   usLoggingProbe({id: 'C34', contains: 'Set Task Status'})
//
// When finished: copy(JSON.stringify(window.usLoggingProbeReport, null, 2))
// and paste it back.
(() => {
  'use strict';

  const SOURCE = 'i4u_UT_Logging';
  const DEFAULTS = {
    // The row ID (the party or record the change was logged against). Blank
    // reads every row. LogChangesToIMIS is given profileID: the cases flows
    // send the case's CaseID (for example C34).
    id: '',
    // How many of the newest rows to show.
    latest: 25,
    // Only rows with this text in any column (for example the flow's Note,
    // "Set Task Status", a table name or a workflow definition ID). Blank
    // keeps every row.
    contains: '',
    // Extra REST filters on the source's columns, passed as they are:
    // {Table: 'Zen_CloudFiles_Notes'} or iMIS operators such as
    // {Table: 'contains:Notes'}.
    filters: {}
  };

  // The website's /api/ (several websites can share one domain).
  function apiRoot() {
    if (!window.gWebRoot) return '/api/';
    return new URL(String(window.gWebRoot), location.origin).pathname.replace(/\/+$/, '') + '/api/';
  }

  function token() {
    return document.querySelector('input[name="__RequestVerificationToken"], input#__RequestVerificationToken')?.value || '';
  }

  // {$type, $value} wrappers and GenericEntityData rows to plain values.
  const unwrap = value => value && typeof value === 'object' && '$value' in value ? value.$value : value;
  function flatten(item) {
    const row = {};
    for (const p of unwrap(item?.Properties)?.$values || []) row[p.Name] = unwrap(p.Value);
    const identity = item?.Identity?.IdentityElements?.$values;
    if (identity && !('ID' in row)) row.ID = identity[0];
    if (identity && !('Ordinal' in row) && identity.length > 1) row.Ordinal = identity[1];
    return row;
  }

  async function get(params) {
    const url = apiRoot() + SOURCE + '?' + new URLSearchParams(params);
    const started = performance.now();
    const response = await fetch(url, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {Accept: 'application/json', RequestVerificationToken: token()}
    });
    const text = await response.text();
    let data = null;
    try { data = JSON.parse(text); } catch (_) {}
    return {url, status: response.status, ok: response.ok, ms: Math.round(performance.now() - started), data, text: data ? null : text.slice(0, 500)};
  }

  async function probe(options = {}) {
    const settings = {...DEFAULTS, ...options, filters: {...DEFAULTS.filters, ...(options.filters || {})}};
    const base = {...settings.filters};
    if (String(settings.id).trim()) base.ID = String(settings.id).trim();
    const report = window.usLoggingProbeReport = {
      probe: 'i4u_UT_Logging probe', version: 1, source: SOURCE, startedAt: new Date().toISOString(),
      page: location.pathname + location.search, apiRoot: apiRoot(), settings, requests: [], totalCount: null,
      columns: [], rows: [], findings: []
    };

    // 1. One row, for the total and to check access.
    const first = await get({...base, limit: '1', offset: '0'});
    report.requests.push({url: first.url, status: first.status, ms: first.ms});
    if (!first.ok) {
      report.findings.push(first.status === 401 || first.status === 403
        ? 'HTTP ' + first.status + ': this user may not read ' + SOURCE + ' through the API. Check the panel source\'s access and that you are signed in.'
        : first.status === 404
          ? 'HTTP 404: no API entity named ' + SOURCE + '. Check the panel source name and that it is a REST-enabled business object.'
          : 'HTTP ' + first.status + ' from ' + first.url + (first.text ? ': ' + first.text : '') + '.');
      return finish(report);
    }
    const total = Number(unwrap(first.data?.TotalCount) ?? 0);
    report.totalCount = total;
    if (!total) {
      report.findings.push(base.ID
        ? 'No rows for ID ' + base.ID + '. Nothing has been logged against it, or the flow logs under a different ID (LogChangesToIMIS is given profileID). Run usLoggingProbe({id: \'\'}) to see the newest rows for every ID.'
        : 'The table is empty: nothing has been logged yet.');
      return finish(report);
    }

    // 2. The newest rows: iMIS returns rows by key (ID, Ordinal), so read the
    //    last pages back to front. With an ID filter the last pages are that
    //    ID's newest rows; without one, the newest of the highest IDs.
    //    With contains set, at most the newest 2,000 rows are searched.
    const wanted = Math.max(1, Number(settings.latest) || 25), pageSize = 100, limit = settings.contains ? 2000 : wanted;
    const needle = String(settings.contains || '').toLowerCase();
    let offset = total, scanned = 0, rows = [];
    while (offset > 0 && scanned < limit && rows.length < wanted) {
      const size = Math.min(pageSize, offset, settings.contains ? pageSize : wanted - scanned);
      offset -= size;
      const page = await get({...base, limit: String(size), offset: String(offset)});
      report.requests.push({url: page.url, status: page.status, ms: page.ms});
      if (!page.ok) { report.findings.push('HTTP ' + page.status + ' reading offset ' + offset + '.'); break; }
      const batch = (unwrap(page.data?.Items)?.$values || []).map(flatten);
      scanned += batch.length;
      if (!batch.length) break;
      rows = batch.filter(row => !needle || JSON.stringify(row).toLowerCase().includes(needle)).concat(rows);
    }
    // Newest first, by Ordinal when there is one.
    rows.sort((a, b) => (Number(b.Ordinal) || 0) - (Number(a.Ordinal) || 0));
    report.rows = rows.slice(0, wanted);
    report.columns = [...new Set(report.rows.flatMap(Object.keys))];
    if (!report.rows.length) report.findings.push('No rows contain "' + settings.contains + '" in the newest ' + scanned + ' rows.');
    else {
      report.findings.push(total + ' row(s) in total' + (base.ID ? ' for ID ' + base.ID : '') + '; showing the newest ' + report.rows.length + (settings.contains ? ' containing "' + settings.contains + '"' : '') + '.');
      if (!base.ID) report.findings.push('Without an ID, rows come back by ID then Ordinal, so these are the newest rows of the highest IDs. Set id to a record to see its newest changes.');
    }
    return finish(report);
  }

  function finish(report) {
    report.finishedAt = new Date().toISOString();
    console.group('i4u_UT_Logging probe');
    report.findings.forEach(line => console.log(line));
    if (report.rows.length) console.table(report.rows);
    console.log('Columns:', report.columns.join(', ') || '(none)');
    console.log('Requests:', report.requests.map(r => r.status + ' ' + r.url).join('\n'));
    console.log('Report: copy(JSON.stringify(window.usLoggingProbeReport, null, 2))');
    console.groupEnd();
    return report;
  }

  window.usLoggingProbe = probe;
  return probe();
})();
