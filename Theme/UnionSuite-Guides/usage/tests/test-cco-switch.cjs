/* Offline checks for US-CCO-SWITCH in zUnionSuite.js, run with the complete
 * shared theme (CSS and JS), zzDarkMode.css and the client Config.js.
 *
 * PageRequestManager, Sys.Application, $create and the iMIS pages are
 * synthetic doubles: this checks identification, switching, form state,
 * registration, initialization, loading states, the queue, URL keys and
 * fallbacks, not iMIS server behaviour or real Telerik controls.
 *
 * Run from the repository root: node Theme/UnionSuite-Guides/usage/tests/test-cco-switch.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const { chromium } = require(path.join(root, '.tmp-iqa-integration/node_modules/playwright'));

const base = 'ctl01_TemplateBody_WebPartManager1_gwpciAccountpagetabs_ciAccountpagetabs_';
const uniqueBase = base.replaceAll('_', '$');
const outerKey = 'b511e4d055d8';
const pathname = '/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Individual/Account_Page_Staff.aspx';
const captions = ['Overview', 'About', 'Finance', 'Notes', 'Preferences', 'Security', 'Alerts', 'Participation', 'Cases'];

// A CCO nested in the Finance tab, selected by its own URL key.
const innerPrefix = base + 'FinanceTabs_ciFinanceTabs_';
const innerKey = 'c0ffee123456';
const innerCaptions = ['Invoices', 'Payments'];

const tabLinks = (names, selected) => names.map((name, index) =>
  `<li class="rtsLI"><a class="rtsLink${index === selected ? ' rtsSelected' : ''}" role="tab" href="#"><span class="rtsOut"><span class="rtsIn"><span class="rtsTxt">${name}</span></span></span></a></li>`).join('');

function nestedCco(selected) {
  const views = innerCaptions.map((name, index) =>
    `<div id="${innerPrefix}Page_${index + 1}" class="rmpView${index === selected ? '' : ' rmpHidden'}">${index === selected ? `<div id="${name.toLowerCase()}Content">${name}</div>` : '<span class="Info">Loading...</span>'}</div>`).join('');
  return `<div class="cco tabs-wrapper tabs-horizontal tabs-top">
    <div id="${innerPrefix}radTab_Top" class="RadTabStrip RadTabStrip_Orion"><div class="rtsLevel rtsLevel1"><ul class="rtsUL">${tabLinks(innerCaptions, selected)}</ul></div><input type="hidden" id="${innerPrefix}radTab_Top_ClientState" name="${innerPrefix}radTab_Top_ClientState" value=""></div>
    <div id="${innerPrefix}radPage" class="RadMultiPage RadMultiPage_Default">${views}<input type="hidden" id="${innerPrefix}radPage_ClientState" name="${innerPrefix}radPage_ClientState" value=""></div>
  </div>`;
}

// An Address-like strip: its own tab strip and multipage, but not a CCO.
const addressStrip = `<div class="address-tabs">
  <div id="${base}About_Address_radTab_Top" class="RadTabStrip RadTabStrip_Orion"><div class="rtsLevel rtsLevel1"><ul class="rtsUL">${tabLinks(['Home address', 'Work address'], 0)}</ul></div></div>
  <div id="${base}About_Address_radPage" class="RadMultiPage"><div id="${base}About_Address_Page_1" class="rmpView">Home</div><div id="${base}About_Address_Page_2" class="rmpView rmpHidden"></div></div>
</div>`;

const lister = name => `<div id="${base}${name}_ListerPanel"><div class="RadGrid RadGrid_MetroTouch" id="${base}${name}_ResultsGrid_Grid1"></div>
  <input type="image" id="${base}${name}_ResultsGrid_RefreshButton" name="${uniqueBase}${name}$ResultsGrid$RefreshButton" data-ajaxupdatedcontrolid="${base}${name}_ResultsGrid_Grid1"></div>`;

function viewContent(name, options, inner) {
  if (name === 'About') {
    return `<div id="aboutContent"><input name="aboutField" value="PRIVATE-ABOUT">
      <span id="${base}About_EditButton" class="RadButton RadButton_Orion"></span>
      <div id="${base}About_Combo" class="RadComboBox"></div>
      <div class="RadAjaxPanel" id="${base}About_radAjaxPanel1Panel"><div id="${base}About_radAjaxPanel1"></div></div>
      <div id="${base}About_CommunicationGrid" class="RadGrid RadGrid_MetroTouch"></div>
      ${addressStrip}
      ${lister('ContactDetailsList')}${lister('Jobs')}
      <script>window.aboutScriptRuns = (window.aboutScriptRuns || 0) + 1;</script></div>`;
  }
  if (name === 'Finance') {
    // A control whose disposal leaves its load handler behind, plus a view
    // script that registers page-level handlers, as on the live Finance tab.
    return `<div id="financeContent"><div id="${base}Finance_Menu" class="RadMenu"></div>${nestedCco(inner)}
      <script>
        window.financeLoad = () => { window.financeLoadRuns = (window.financeLoadRuns || 0) + 1; };
        window.financePageLoaded = () => {};
        Sys.Application.add_load(window.financeLoad);
        Sys.WebForms.PageRequestManager.getInstance().add_pageLoaded(window.financePageLoaded);
      </script></div>`;
  }
  if (name === 'Cases') {
    return `<div class="ContentWizardDisplay"><div id="ste_container_Cases">
      <div id="${base}Cases_UpdateProgress1" style="display:none"><img alt="Loading"></div>
      ${lister('Cases')}
      <div id="casesFormPlaceholder"></div>
      <script>window.casesScriptRuns = (window.casesScriptRuns || 0) + 1;window.casesScriptPlaceholder = document.currentScript?.previousElementSibling?.id;${options.badViewScript ? 'undefinedHelper();' : ''}</script>
      <script type="application/json">{"not": "executed"}</script></div></div>`;
  }
  if (name === 'Participation') {
    // A report that hides its results until Find: filters only, so no grid
    // and no refresh button, with two Chosen multi-selects.
    const list = field => `<select size="4" multiple="multiple" id="${base}Participation_${field}_ListBox" class="chosen-select"><option value="A">A</option></select>`;
    return `<div id="${base}Participation_ListerPanel"><div class="FilterPanel">${list('Category')}${list('Status')}</div>
      <div class="ListSearchPrompt">Please enter your search criteria to view results</div></div>`;
  }
  return '<span class="Info">Loading...</span>';
}

// Global startup blocks, as emitted at the end of the native page.
function startupScript(selected) {
  const creates = [
    ['Telerik.Web.UI.RadTabStrip', base + 'radTab_Top'],
    ['Sys.UI._UpdateProgress', base + 'Cases_UpdateProgress1'],
    ['Telerik.Web.UI.RadGrid', base + 'Cases_ResultsGrid_Grid1'],
    ['Telerik.Web.UI.RadButton', base + 'About_EditButton'],
    ['Telerik.Web.UI.RadAjaxPanel', base + 'About_radAjaxPanel1'],
    ['Telerik.Web.UI.RadGrid', base + 'ContactDetailsList_ResultsGrid_Grid1'],
    ['Telerik.Web.UI.RadMenu', base + 'Finance_Menu']
  ].map(([type, target]) => `Sys.Application.add_init(function() {\n    $create(${type}, {"text":"PRIVATE-SETTING"}, null, null, $get("${target}"));\n});`).join('\n');
  // A grid outside listers needs its page-level manager first, emitted among
  // other startup statements (as for Email Communications on the Notes tab).
  const grid = base + 'About_CommunicationGrid';
  const manager = `window['${grid}_jsmanager']=new Asi_Web_BusinessDataGrid2({"GridClientId":"${grid}","Note":"a (b); c"});;(function(){window.otherStartupRan=true;})();`;
  const gridCreate = `Sys.Application.add_init(function() {\n    $create(Telerik.Web.UI.RadGrid, {"ClientID":"${grid}"}, {"gridCreated":window['${grid}_jsmanager'].OnGridCreated}, null, $get("${grid}"));\n});`;
  const listers = { 8: ['Cases'], 1: ['ContactDetailsList', 'Jobs'] }[selected] || [];
  const panels = listers.map(name => `,'t${uniqueBase}${name}$ListerPanel',''`).join('');
  // iMIS enhances multi-select filters from one page-level line.
  const chosen = selected === 7 ? "jQuery('.chosen-select').chosen({placeholder_text_multiple: '(Any)'});" : '';
  return `Sys.WebForms.PageRequestManager._initialize('ctl01$ScriptManager1', 'aspnetForm', ['tctl01$UserMessagesUpdatePanel',''${panels}], ['ctl01$ScriptManager1','','${uniqueBase}radTab_Top',''], ['btnExportWord',''], 3600, 'ctl01');\n${manager}${chosen}${creates}\n${gridCreate}`;
}

// PageRequestManager, Sys.Application and $create doubles, installed before
// the theme scripts as the native page scripts are.
function installDoubles() {
  const registry = new Map();
  window.fixtureDisposed = [];
  window.fixtureCreated = [];
  window.postBacks = [];
  window.nativeClicks = [];
  window.samples = [];
  window.$get = id => document.getElementById(id);
  window.$find = id => registry.get(id) || null;
  window.$create = (type, properties, events, references, element) => {
    if (registry.has(element.id)) throw new Error('Two components with the same id');
    const component = {
      get_id: () => element.id,
      get_element: () => element,
      dispose() { fixtureDisposed.push(element.id); registry.delete(element.id); }
    };
    registry.set(element.id, component);
    fixtureCreated.push(element.id);
    // Models the live failure: this control's disposal leaves its load
    // handler registered, and the handler fails once the control is gone.
    if (type === Telerik.Web.UI.RadMenu) {
      Sys.Application.add_load(() => { if (!registry.has(element.id)) throw new Error("can't access property \"_item\", e is undefined"); });
    }
    return component;
  };
  window.fixtureRegister = (id, extra) => registry.set(id, { get_id: () => id, get_element: () => document.getElementById(id), dispose() {}, ...extra });
  window.Telerik = { Web: { UI: { RadTabStrip: {}, RadGrid: {}, RadButton: {}, RadAjaxPanel: {}, RadMenu: {} } } };
  window.Asi_Web_BusinessDataGrid2 = function (settings) {
    this.settings = settings;
    this.OnGridCreated = () => {};
  };
  const lists = {};
  const remove = (list, handler) => { const index = list.indexOf(handler); if (index >= 0) list.splice(index, 1); };
  const prm = {
    _updatePanelIDs: ['ctl01$UserMessagesUpdatePanel'],
    _updatePanelClientIDs: ['ctl01_UserMessagesUpdatePanel'],
    _updatePanelHasChildrenAsTriggers: [true],
    _scriptManagerID: 'ctl01$ScriptManager1',
    inPostBack: false,
    get_isInAsyncPostBack() { return this.inPostBack; },
    handlers: name => lists[name] || [],
    raise(name, args) { for (const handler of [...(lists[name] || [])]) handler(prm, args); },
    _uniqueIDToClientID: id => id.replaceAll('$', '_'),
    // ASP.NET 4 format: server/client ID pairs with a 't'/'f' prefix on panels.
    _updateControls(panels, async, postBack) {
      const even = list => list.filter((item, index) => index % 2 === 0);
      this._updatePanelIDs = even(panels).map(id => id.slice(1));
      this._updatePanelClientIDs = this._updatePanelIDs.map(id => id.replaceAll('$', '_'));
      this._updatePanelHasChildrenAsTriggers = even(panels).map(id => id.charAt(0) === 't');
      this._asyncPostBackControlIDs = even(async);
      this._postBackControlIDs = even(postBack);
    },
    _destroyTree(element) {
      for (const component of [...registry.values()]) if (element.contains(component.get_element())) component.dispose();
    }
  };
  for (const name of ['initializeRequest', 'beginRequest', 'pageLoading', 'pageLoaded', 'endRequest']) {
    prm['add_' + name] = handler => (lists[name] ||= []).push(handler);
    prm['remove_' + name] = handler => remove(lists[name] || [], handler);
  }
  window.fixturePrm = prm;
  const loads = [];
  window.fixtureLoads = loads;
  window.Sys = {
    UI: { _UpdateProgress: {} },
    Application: {
      add_init: handler => handler(),
      add_load: handler => loads.push(handler),
      remove_load: handler => remove(loads, handler),
      getComponents: () => [...registry.values()]
    },
    WebForms: { PageRequestManager: { getInstance: () => prm } }
  };
  // A native lister refresh updates every lister panel on the tab, creates
  // their grids, raises Sys.Application load, then endRequest. A load handler
  // error aborts the sequence before endRequest, as in the live stack trace.
  // A tab-strip postback would navigate; it is only recorded.
  window.__doPostBack = (target, argument) => {
    postBacks.push([target, argument]);
    if (target.endsWith('radTab_Top')) return;
    prm.inPostBack = true;
    for (const progress of document.querySelectorAll('[id$="_UpdateProgress1"]')) progress.style.display = 'block';
    prm.raise('beginRequest', { get_postBackElement: () => document.getElementsByName(target)[0] || null });
    const sample = () => ({
      progress: [...document.querySelectorAll('[id$="_UpdateProgress1"]')].map(node => getComputedStyle(node).display),
      overlays: [...document.querySelectorAll('.us-iqa-refresh-overlay, .us-iqa-find-overlay')].map(node => getComputedStyle(node).display),
      tabSpinners: document.querySelectorAll('.us-tab-loading-spinner').length
    });
    samples.push(sample());
    setTimeout(() => {
      for (const grid of document.querySelectorAll('[id$="_ListerPanel"] .RadGrid')) {
        if (!registry.has(grid.id)) $create(Telerik.Web.UI.RadGrid, {}, null, null, grid);
      }
      for (const progress of document.querySelectorAll('[id$="_UpdateProgress1"]')) progress.style.display = 'none';
      for (const handler of [...loads]) handler();
      prm.inPostBack = false;
      prm.raise('endRequest', { get_error: () => null, set_errorHandled() {} });
    }, 20);
  };
  // Stands in for Telerik's own tab handling: reached only when the theme
  // leaves a click native.
  document.addEventListener('click', event => {
    const link = event.target.closest('a.rtsLink');
    if (!link) return;
    event.preventDefault();
    nativeClicks.push(link.textContent.trim());
  });
}

// A jQuery with only the Chosen plugin: it adds the container after each
// select it has not enhanced yet, as the real plugin does.
function installChosen() {
  window.chosenCalls = [];
  window.jQuery = selector => ({
    chosen(settings) {
      window.chosenCalls.push(settings);
      for (const select of document.querySelectorAll(selector)) {
        if (document.getElementById(select.id + '_chosen')) continue;
        const container = document.createElement('div');
        container.id = select.id + '_chosen';
        container.className = 'chosen-container chosen-container-multi';
        container.dataset.placeholder = settings.placeholder_text_multiple;
        select.style.display = 'none';
        select.after(container);
      }
    }
  });
  window.jQuery.fn = { chosen() {} };
}

function page(selected, state, options) {
  const views = captions.map((name, index) => {
    const shown = index === selected;
    if (shown && options.missingView && !state.live) return '';
    const body = shown ? viewContent(name, options, state.inner) : '<span class="Info">Loading...</span>';
    return `<div id="${base}Page_${index + 1}" class="rmpView${shown ? '' : ' rmpHidden'}">${body}</div>`;
  }).join('');
  const validation = state.validation ? `<input type="hidden" name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="${state.validation}">` : '';
  // Native startup statements are not executed by the fixture's live page.
  const startup = state.live ? '' : `<script type="text/x-fixture-startup">${startupScript(selected)}</script>`;
  const doubles = state.live ? `<script>(${installDoubles})();${options.easyEdit ? 'window.gIsEasyEditEnabled = true;' : ''}${options.chosen ? `(${installChosen})();` : ''}</script>` : '';
  const created = state.live ? `<script>if ($get('${base}About_EditButton')) $create(Telerik.Web.UI.RadButton, {}, null, null, $get('${base}About_EditButton'));</script>` : '';
  const signIn = options.signIn && !state.live ? '<input type="submit" class="SignInButton" value="Sign In">' : '';
  // Telerik's embedded multipage rule is not part of the theme files.
  const styles = '<link rel="stylesheet" href="/theme/99-Orion.css"><link rel="stylesheet" href="/theme/zUnionSuite.css"><link rel="stylesheet" href="/theme/zzDarkMode.css"><link rel="stylesheet" href="/telerik.css">';
  const cco = `<div class="cco tabs-wrapper tabs-vertical tabs-left">
    <div id="${base}radTab_Top" class="RadTabStripVertical RadTabStrip_Orion RadTabStripLeft_Orion RadTabStripLeft"><div class="rtsLevel rtsLevel1"><ul class="rtsUL">${tabLinks(captions, selected)}</ul></div><input type="hidden" id="${base}radTab_Top_ClientState" name="${base}radTab_Top_ClientState" value=""></div>
    <div id="${base}radPage" class="RadMultiPage RadMultiPage_Default">${views}<input type="hidden" id="${base}radPage_ClientState" name="${base}radPage_ClientState" value="PRIVATE-PAGE"></div>
    </div>`;
  const owner = options.embedded ? 'EmbeddedCCO' : options.noStyling ? 'us-report-no-styling' : options.sticky ? 'us-cco-sticky-tabs' : '';
  const container = `<div class="ContentItemContainer" id="ste_container_ciAccountpagetabs">${owner ? `<div class="${owner}">${cco}</div>` : cco}</div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fixture</title>${styles}${doubles}</head><body>${signIn}<form method="post" action="./Account_Page_Staff.aspx?ID=1001&amp;${outerKey}=${selected + 1}" id="aspnetForm">
    <input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="${state.name}-VIEWSTATE">
    <input type="hidden" name="__RequestVerificationToken" id="__RequestVerificationToken" value="${state.name}-TOKEN">
    <input type="hidden" name="PageInstanceKey" id="PageInstanceKey" value="${state.name}-INSTANCE">
    <input type="hidden" name="__EVENTTARGET" id="__EVENTTARGET" value="">
    <input type="hidden" name="__EVENTARGUMENT" id="__EVENTARGUMENT" value="">
    ${validation}
    ${container}
    <input type="hidden" name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="BD015436">
  </form>${startup}${created}<script src="/theme/zUnionSuite.js"></script><script src="/client/Config.js" defer></script></body></html>`;
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let passed = 0;
  try {
    async function scenario(name, run, options = {}) {
      const context = await browser.newContext({ colorScheme: options.dark ? 'dark' : 'light', viewport: { width: 1200, height: 800 } });
      const tab = await context.newPage();
      const errors = [];
      const fetches = [];
      const posts = [];
      tab.on('pageerror', error => errors.push(error.message));
      await tab.route('http://cco.test/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.pathname === '/telerik.css') return route.fulfill({ contentType: 'text/css', body: '.rmpHidden { display: none; }' });
        if (url.pathname.startsWith('/theme/') || url.pathname.startsWith('/client/')) {
          const folder = url.pathname.startsWith('/client/') ? 'Theme/UnionSuite-Client' : 'Theme/UnionSuite';
          const file = path.join(root, folder, path.basename(url.pathname));
          if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
          return route.fulfill({ contentType: file.endsWith('.js') ? 'text/javascript' : 'text/css', body: fs.readFileSync(file, 'utf8') });
        }
        // Theme fonts and images are not needed for these checks.
        if (url.pathname !== pathname) return route.fulfill({ status: 404, body: '' });
        const selected = Number(url.searchParams.get(outerKey) || (options.start ?? 1) + 1) - 1;
        const inner = Number(url.searchParams.get(innerKey) || 1) - 1;
        // A tab-strip postback answers with a redirect to the tab's URL.
        if (request.method() === 'POST') {
          const body = new URLSearchParams(request.postData());
          const eventTarget = body.get('__EVENTTARGET');
          const index = Number(JSON.parse(body.get('__EVENTARGUMENT')).index);
          posts.push({ target: eventTarget, index, scriptManager: body.get('ctl01$ScriptManager1'), viewState: body.get('__VIEWSTATE') });
          const query = eventTarget.includes('FinanceTabs')
            ? `ID=1001&${outerKey}=${selected + 1}&${innerKey}=${index + 1}#${innerKey}`
            : `ID=1001&${outerKey}=${index + 1}#${outerKey}`;
          const target = encodeURIComponent(`${pathname}?${query}`);
          return route.fulfill({ contentType: 'text/plain', body: `1|#||4|${target.length}|pageRedirect||${target}|` });
        }
        const live = request.isNavigationRequest();
        if (!live) fetches.push(url.searchParams.has(innerKey) ? selected + ':' + inner : selected);
        if (!live && options.delay) await new Promise(resolve => setTimeout(resolve, options.delay));
        if (!live && options.failFetch) return route.fulfill({ status: 500, body: 'Server error' });
        const html = page(live ? (options.start ?? 1) : selected, { name: live ? 'LIVE' : 'FETCHED' + selected, live, inner, validation: live ? 'LIVE-VALIDATION' : '' }, options);
        return route.fulfill({ contentType: 'text/html', body: html });
      });
      try {
        await tab.goto('http://cco.test' + pathname + (options.query ?? `?ID=1001&${outerKey}=2`));
        await tab.waitForFunction(() => window.UnionSuiteCcoSwitch && window.UnionSuiteCcoSwitchConfig);
        await run(tab, fetches, posts);
        assert.deepEqual(errors.filter(message => !(options.expectedError && options.expectedError.test(message))), []);
        console.log('PASS ' + name);
        passed++;
      } finally {
        await context.close();
      }
    }

    const click = (tab, name) => tab.locator('a.rtsLink', { hasText: name }).first().click();
    // Click without letting the test runner scroll the tab into view.
    const clickInPlace = (tab, name) => tab.evaluate(text => [...document.querySelectorAll('a.rtsLink')].find(link => link.textContent.trim() === text).click(), name);
    const switches = tab => tab.evaluate(() => UnionSuiteCcoSwitch.report().log);
    const idle = (tab, count) => tab.waitForFunction(count => {
      const report = UnionSuiteCcoSwitch.report();
      return report.log.length >= count && !report.switching && !report.queued && !document.querySelector('[aria-busy="true"]');
    }, count);
    const lastSwitch = async tab => (await switches(tab)).at(-1);
    const selected = (tab, prefix = base) => tab.evaluate(prefix => document.querySelector('#' + prefix + 'radTab_Top a.rtsSelected').textContent.trim(), prefix);
    const storedKeys = tab => tab.evaluate(() => JSON.parse(localStorage.getItem('UnionSuiteCcoSwitch:keys') || '{}'));

    await scenario('About to Cases: disposes About, switches state, registers panels, initializes and refreshes natively', async (tab, fetches) => {
      assert.equal(await tab.evaluate(() => UnionSuiteCcoSwitchConfig.enabled), true, 'client Config.js is loaded');
      await click(tab, 'Cases');
      await idle(tab, 1);
      const entry = await lastSwitch(tab);
      assert.equal(entry.status, 'shown', entry.error);
      assert.equal(entry.key, 'url');
      assert.deepEqual(fetches, [8]);
      const state = await tab.evaluate(({ base, outerKey }) => ({
        casesShown: !!document.querySelector('#' + base + 'Page_9:not(.rmpHidden) #ste_container_Cases'),
        aboutCleared: document.getElementById(base + 'Page_2').classList.contains('rmpHidden') && !document.getElementById('aboutContent'),
        aboutDisposed: fixtureDisposed.includes(base + 'About_EditButton'),
        viewState: document.querySelector('[name="__VIEWSTATE"]').value,
        validationRemoved: !document.querySelector('[name="__EVENTVALIDATION"]'),
        action: new URL(document.getElementById('aspnetForm').action).searchParams.get(outerKey),
        initialAction: document.getElementById('aspnetForm')._initialAction === document.getElementById('aspnetForm').action,
        locationTab: new URL(location.href).searchParams.get(outerKey),
        tabState: JSON.parse(document.getElementById(base + 'radTab_Top_ClientState').value).selectedIndexes,
        pageState: document.getElementById(base + 'radPage_ClientState').value,
        panels: fixturePrm._updatePanelIDs,
        created: fixtureCreated,
        casesScriptRuns: window.casesScriptRuns,
        casesScriptPlaceholder: window.casesScriptPlaceholder,
        jsonBlockKept: !!document.querySelector('#ste_container_Cases > script[type="application/json"]'),
        postBacks,
        progressRegistered: !!$find(base + 'Cases_UpdateProgress1'),
        gridRegistered: !!$find(base + 'Cases_ResultsGrid_Grid1')
      }), { base, outerKey });
      assert.equal(state.casesShown, true);
      assert.equal(state.aboutCleared, true);
      assert.equal(state.aboutDisposed, true);
      assert.equal(state.viewState, 'FETCHED8-VIEWSTATE');
      assert.equal(state.validationRemoved, true);
      assert.equal(state.action, '9');
      assert.equal(state.initialAction, true);
      assert.equal(state.locationTab, '9');
      assert.deepEqual(state.tabState, ['8']);
      assert.equal(state.pageState, '');
      assert.equal(await selected(tab), 'Cases');
      assert.deepEqual(state.panels, ['ctl01$UserMessagesUpdatePanel', uniqueBase + 'Cases$ListerPanel']);
      assert.equal(state.casesScriptRuns, 1);
      // Each view script runs in place, as BeyondFormz relies on.
      assert.equal(state.casesScriptPlaceholder, 'casesFormPlaceholder');
      assert.equal(state.jsonBlockKept, true);
      // The tab strip is outside the view; the grid is left to the native refresh.
      assert.equal(state.created.includes(base + 'radTab_Top'), false);
      assert.equal(state.progressRegistered, true);
      assert.equal(state.gridRegistered, true);
      assert.deepEqual(state.postBacks, [[uniqueBase + 'Cases$ResultsGrid$RefreshButton', '']]);
      assert.equal(entry.registration.path, 'native');
      assert.deepEqual({ inline: entry.scripts.inline, skipped: entry.scripts.skipped }, { inline: 1, skipped: 1 });
      assert.deepEqual(entry.creates, { run: 1, skippedInListers: 1, errors: [] });
      assert.equal(entry.listers.length, 1);
      assert.equal(entry.listers[0].gridRegistered, true);
      assert.deepEqual(entry.uninitialized, []);
      // The key learned from the URL is stored for 7 days.
      const keys = await storedKeys(tab);
      const stored = keys[pathname + '|' + base + 'radTab_Top'];
      assert.equal(stored.key, outerKey);
      const days = (stored.expires - Date.now()) / 86400000;
      assert(days > 6.99 && days <= 7, 'stored for 7 days');
      assert.doesNotMatch(JSON.stringify(await tab.evaluate(() => UnionSuiteCcoSwitch.report())), /PRIVATE-|-VIEWSTATE|-TOKEN|-INSTANCE/);
    });

    await scenario('Cases back to About: re-creates About controls, replays grid managers and reports uninitialized ones', async (tab, fetches) => {
      await click(tab, 'Cases');
      await idle(tab, 1);
      await click(tab, 'About');
      await idle(tab, 2);
      const entry = await lastSwitch(tab);
      assert.equal(entry.status, 'shown', entry.error);
      assert.equal(entry.key, 'stored');
      assert.deepEqual(fetches, [8, 1]);
      const state = await tab.evaluate(base => ({
        aboutShown: !!document.querySelector('#' + base + 'Page_2:not(.rmpHidden) #aboutContent'),
        casesCleared: !document.getElementById('ste_container_Cases'),
        gridDisposed: fixtureDisposed.includes(base + 'Cases_ResultsGrid_Grid1'),
        buttonRegistered: !!$find(base + 'About_EditButton'),
        aboutScriptRuns: window.aboutScriptRuns,
        viewState: document.querySelector('[name="__VIEWSTATE"]').value,
        panels: fixturePrm._updatePanelIDs,
        managed: {
          registered: !!$find(base + 'About_CommunicationGrid'),
          settings: window[base + 'About_CommunicationGrid_jsmanager']?.settings?.Note,
          otherStartupRan: !!window.otherStartupRan
        }
      }), base);
      assert.equal(state.aboutShown, true);
      assert.equal(state.casesCleared, true);
      assert.equal(state.gridDisposed, true);
      assert.equal(state.buttonRegistered, true);
      // Initial native load plus the fetched About view.
      assert.equal(state.aboutScriptRuns, 2);
      assert.equal(state.viewState, 'FETCHED1-VIEWSTATE');
      assert.deepEqual(state.panels, ['ctl01$UserMessagesUpdatePanel', uniqueBase + 'ContactDetailsList$ListerPanel', uniqueBase + 'Jobs$ListerPanel']);
      assert.deepEqual(entry.creates, { run: 3, skippedInListers: 1, errors: [] });
      // The grid outside listers gets its page-level manager first; the
      // neighbouring startup statement is not replayed.
      assert.deepEqual(entry.managers, { run: 1, errors: [] });
      assert.deepEqual(state.managed, { registered: true, settings: 'a (b); c', otherStartupRan: false });
      // One refresh initializes both About listers; the second is skipped.
      assert.equal(entry.listers.length, 2);
      assert.equal(entry.listers[0].gridRegistered, true);
      assert.equal(entry.listers[0].skipped, undefined);
      assert.equal(entry.listers[1].skipped, 'already initialized');
      assert.equal(await tab.evaluate(() => postBacks.length), 2);
      // The RadAjaxPanel wrapper is not reported: its child holds the component.
      // The Address-like fixture strip has no $create block, so it is reported too.
      assert.deepEqual(entry.uninitialized.map(item => item.id.slice(base.length)), ['About_Combo', 'About_Address_radTab_Top', 'About_Address_radPage']);
      assert.deepEqual(entry.orphans, []);
    });

    await scenario('handlers registered by a left view are removed, so later native updates do not fail', async tab => {
      await click(tab, 'Cases');
      await idle(tab, 1);
      await click(tab, 'Finance');
      await idle(tab, 2);
      const finance = await lastSwitch(tab);
      assert.equal(finance.status, 'shown', finance.error);
      // Two from the view script, one from the leaking control's creation.
      assert.equal(finance.trackedHandlers, 3);
      await click(tab, 'About');
      await idle(tab, 3);
      const about = await lastSwitch(tab);
      assert.equal(about.status, 'shown', about.error);
      assert.equal(about.releasedHandlers, 3);
      assert.deepEqual(about.pageErrors, []);
      assert.equal(about.listers[0].error, null);
      assert.equal(about.listers[0].gridRegistered, true);
      assert.deepEqual(await tab.evaluate(() => [
        fixtureLoads.includes(window.financeLoad),
        fixturePrm.handlers('pageLoaded').includes(window.financePageLoaded),
        window.financeLoadRuns || 0
      ]), [false, false, 0]);
      assert.equal(await tab.evaluate(base => fixtureDisposed.includes(base + 'Finance_Menu'), base), true);
    });

    await scenario('view script errors are reported and the switch completes', async tab => {
      await click(tab, 'Cases');
      await idle(tab, 1);
      const entry = await lastSwitch(tab);
      assert.equal(entry.status, 'shown');
      assert.equal(entry.scripts.errors.length, 1);
      assert.match(entry.scripts.errors[0].message, /undefinedHelper/);
      assert.equal(entry.listers[0].gridRegistered, true);
    }, { badViewScript: true, expectedError: /undefinedHelper/ });

    await scenario('a report that hides results until Find gets its Chosen multi-selects from the native startup line', async tab => {
      await click(tab, 'Participation');
      await idle(tab, 1);
      const entry = await lastSwitch(tab);
      assert.equal(entry.status, 'shown');
      assert.deepEqual(entry.listers, []);
      assert.equal(entry.chosen.bare, 2);
      assert.equal(entry.chosen.remaining, 0);
      assert.deepEqual(entry.chosen.errors, []);
      const placeholders = await tab.evaluate(() => [...document.querySelectorAll('.chosen-container')].map(node => node.dataset.placeholder));
      assert.deepEqual(placeholders, ['(Any)', '(Any)']);
      // Back and forth: the re-inserted lists are enhanced again, once each.
      await click(tab, 'About');
      await idle(tab, 2);
      await click(tab, 'Participation');
      await idle(tab, 3);
      assert.equal(await tab.evaluate(() => document.querySelectorAll('.chosen-container').length), 2);
      assert.equal((await lastSwitch(tab)).chosen.remaining, 0);
    }, { chosen: true });

    await scenario('loading states: tab and section spinners after the delay, one tab spinner, suppressed native indicators, full cleanup', async tab => {
      await click(tab, 'Cases');
      // Before the 150 ms delay: selected and busy, but no spinner yet.
      const early = await tab.evaluate(base => ({
        selected: document.querySelector('#' + base + 'radTab_Top a.rtsSelected').textContent.trim(),
        busy: document.querySelector('#' + base + 'radTab_Top a.rtsSelected').getAttribute('aria-busy'),
        spinner: !!document.querySelector('.us-tab-loading-spinner'),
        blocked: getComputedStyle(document.getElementById(base + 'radPage')).pointerEvents
      }), base);
      assert.deepEqual(early, { selected: 'Cases', busy: 'true', spinner: false, blocked: 'none' });
      await tab.waitForTimeout(300);
      const loading = await tab.evaluate(base => {
        const link = document.querySelector('#' + base + 'radTab_Top a.rtsSelected');
        const multiPage = document.getElementById(base + 'radPage');
        const cover = multiPage.querySelector(':scope > .us-cco-switch__cover');
        const loader = cover.querySelector('.section-loader-spinning-circles');
        const box = loader.getBoundingClientRect();
        const area = multiPage.getBoundingClientRect();
        const covered = cover.getBoundingClientRect();
        const x = box.left + box.width / 2;
        const y = box.top + box.height / 2;
        cover.style.pointerEvents = 'auto';
        const top = document.elementFromPoint(x, y);
        cover.style.pointerEvents = '';
        return {
          tabMarker: link.hasAttribute('data-us-tab-loading'),
          tabSpinners: document.querySelectorAll('.us-tab-loading-spinner').length,
          spinnerOnTab: !!link.querySelector('.us-tab-loading-spinner'),
          tabSpinnerAnimated: getComputedStyle(link.querySelector('.us-tab-loading-spinner')).animationName !== 'none',
          loaderAnimated: getComputedStyle(loader).animationName !== 'none',
          loaderInside: box.left >= area.left && box.right <= area.right && box.top >= area.top && box.bottom <= area.bottom,
          loaderOnTop: cover.contains(top),
          // The cover fills the padding box, inside any theme border.
          coversContent: Math.round(covered.width) === multiPage.clientWidth && Math.round(covered.height) === multiPage.clientHeight,
          opaque: getComputedStyle(cover).backgroundColor,
          minHeight: getComputedStyle(multiPage).minHeight,
          rootMarked: document.documentElement.hasAttribute('data-us-cco-switching'),
          status: document.querySelector('.us-cco-switch__status[role="status"]')?.textContent,
          statusHidden: getComputedStyle(document.querySelector('.us-cco-switch__status')).clipPath
        };
      }, base);
      assert.deepEqual(loading, {
        tabMarker: true,
        tabSpinners: 1,
        spinnerOnTab: true,
        tabSpinnerAnimated: true,
        loaderAnimated: true,
        loaderInside: true,
        loaderOnTop: true,
        coversContent: true,
        opaque: 'rgb(255, 255, 255)',
        minHeight: '260px',
        rootMarked: true,
        status: 'Loading Cases',
        statusHidden: 'inset(50%)'
      });
      if (process.env.US_CCO_SCREENSHOT) await tab.screenshot({ path: process.env.US_CCO_SCREENSHOT });
      await idle(tab, 1);
      // During the internal lister refresh the theme's own report overlay and
      // native progress were present but hidden, and only one tab spinner showed.
      const [sample] = await tab.evaluate(() => samples);
      assert.deepEqual(sample.progress, ['none']);
      assert.deepEqual(sample.overlays.length > 0 && sample.overlays.every(display => display === 'none'), true);
      assert.equal(sample.tabSpinners, 1);
      const done = await tab.evaluate(base => {
        const link = document.querySelector('#' + base + 'radTab_Top a.rtsSelected');
        const multiPage = document.getElementById(base + 'radPage');
        return {
          selected: link.textContent.trim(),
          tabClear: !link.hasAttribute('data-us-tab-loading') && !link.hasAttribute('aria-busy') && !document.querySelector('.us-tab-loading-spinner'),
          contentClear: !multiPage.hasAttribute('aria-busy') && !multiPage.hasAttribute('data-us-cco-switch-busy') && !multiPage.hasAttribute('data-us-cco-switch-loading') && !multiPage.querySelector('.us-cco-switch__cover'),
          pointer: getComputedStyle(multiPage).pointerEvents,
          rootClear: !document.documentElement.hasAttribute('data-us-cco-switching'),
          statusRemoved: !document.querySelector('.us-cco-switch__status')
        };
      }, base);
      assert.deepEqual(done, { selected: 'Cases', tabClear: true, contentClear: true, pointer: 'auto', rootClear: true, statusRemoved: true });
    }, { delay: 400 });

    await scenario('the section spinner stays in view when the page is scrolled down to the tabs', async tab => {
      await tab.evaluate(base => {
        document.getElementById(base + 'Page_2').style.minHeight = '2400px';
        window.scrollTo(0, 1200);
      }, base);
      await clickInPlace(tab, 'Cases');
      await tab.waitForTimeout(300);
      const position = await tab.evaluate(() => {
        const box = document.querySelector('.us-cco-switch__cover .section-loader-spinning-circles').getBoundingClientRect();
        return { scrolled: scrollY, visible: box.top >= 0 && box.bottom <= innerHeight };
      });
      assert.deepEqual(position, { scrolled: 1200, visible: true });
      await idle(tab, 1);
    }, { delay: 400 });

    await scenario('dark mode: the cover uses the dark surface token', async tab => {
      await click(tab, 'Cases');
      await tab.waitForTimeout(300);
      assert.equal(await tab.evaluate(() => getComputedStyle(document.querySelector('.us-cco-switch__cover')).backgroundColor), 'rgb(27, 39, 47)');
      await idle(tab, 1);
    }, { delay: 400, dark: true });

    await scenario('queued clicks: the latest wins, the tab spinner moves at once and the cover stays', async (tab, fetches) => {
      await click(tab, 'Cases');
      await tab.waitForTimeout(250);
      await tab.evaluate(base => {
        window.coverRemovals = 0;
        new MutationObserver(records => {
          for (const record of records) {
            window.coverRemovals += [...record.removedNodes].filter(node => node.classList?.contains('us-cco-switch__cover')).length;
          }
        }).observe(document.getElementById(base + 'radPage'), { childList: true });
      }, base);
      const spinnerOn = () => tab.evaluate(() => [...document.querySelectorAll('.us-tab-loading-spinner')].map(node => node.closest('a').textContent.trim()));
      await click(tab, 'Finance');
      assert.equal(await selected(tab), 'Finance');
      assert.deepEqual(await spinnerOn(), ['Finance']);
      await click(tab, 'Notes');
      assert.equal(await selected(tab), 'Notes');
      assert.deepEqual(await spinnerOn(), ['Notes']);
      assert.equal(await tab.evaluate(() => document.querySelector('.us-cco-switch__status').textContent), 'Loading Notes');
      assert.deepEqual(await tab.evaluate(() => UnionSuiteCcoSwitch.report().queued.tab), 'Notes');
      await idle(tab, 2);
      assert.deepEqual(fetches, [8, 3]);
      assert.equal(await tab.evaluate(base => !document.getElementById(base + 'Page_4').classList.contains('rmpHidden'), base), true);
      // The cover was removed once, when the final tab was ready.
      assert.equal(await tab.evaluate(() => coverRemovals), 1);
      assert.equal(await tab.evaluate(() => nativeClicks.length), 0);
    }, { delay: 400 });

    await scenario('clicking the tab being loaded clears the queue', async (tab, fetches) => {
      await click(tab, 'Cases');
      await tab.waitForTimeout(250);
      await click(tab, 'Finance');
      await click(tab, 'Cases');
      assert.equal(await selected(tab), 'Cases');
      assert.equal(await tab.evaluate(() => UnionSuiteCcoSwitch.report().queued), null);
      await idle(tab, 1);
      await tab.waitForTimeout(150);
      assert.deepEqual(fetches, [8]);
      assert.equal(await selected(tab), 'Cases');
    }, { delay: 400 });

    await scenario('a click during a native partial postback waits for it; the displayed tab clears the queue', async (tab, fetches) => {
      await tab.evaluate(() => { fixturePrm.inPostBack = true; });
      await click(tab, 'Cases');
      await tab.waitForTimeout(250);
      assert.deepEqual(fetches, []);
      assert.equal(await selected(tab), 'Cases');
      assert.equal(await tab.evaluate(() => document.querySelectorAll('.us-tab-loading-spinner').length), 1);
      // The displayed tab cancels the queued switch.
      await click(tab, 'About');
      assert.equal(await selected(tab), 'About');
      assert.equal(await tab.evaluate(() => document.querySelectorAll('.us-tab-loading-spinner, [aria-busy="true"]').length), 0);
      await click(tab, 'Notes');
      await tab.evaluate(() => { fixturePrm.inPostBack = false; });
      await idle(tab, 1);
      assert.deepEqual(fetches, [3]);
      assert.equal(await selected(tab), 'Notes');
    });

    await scenario('a CCO nested in a tab switches in place: first by discovering its URL key, then directly', async (tab, fetches, posts) => {
      await click(tab, 'Finance');
      await idle(tab, 1);
      await click(tab, 'Payments');
      await idle(tab, 2);
      const log = await switches(tab);
      const first = log[1];
      assert.equal(first.status, 'shown', first.error);
      assert.equal(first.cco, innerPrefix);
      assert.equal(first.tab, 'Payments');
      assert.equal(first.key, 'discovered');
      assert.equal(first.discovery.found, true);
      // One discovery postback with the tab strip event and current state.
      assert.equal(posts.length, 1);
      assert.deepEqual(posts[0], { target: innerPrefix.replaceAll('_', '$') + 'radTab_Top', index: 1, scriptManager: 'ctl01$ScriptManager1|' + innerPrefix.replaceAll('_', '$') + 'radTab_Top', viewState: 'FETCHED2-VIEWSTATE' });
      const state = await tab.evaluate(({ base, innerPrefix, innerKey, outerKey }) => ({
        payments: !!document.querySelector('#' + innerPrefix + 'Page_2:not(.rmpHidden) #paymentsContent'),
        invoicesCleared: !document.getElementById('invoicesContent'),
        outerStillFinance: !document.getElementById(base + 'Page_3').classList.contains('rmpHidden') && !!document.getElementById('financeContent'),
        innerState: JSON.parse(document.getElementById(innerPrefix + 'radTab_Top_ClientState').value).selectedIndexes,
        location: [new URL(location.href).searchParams.get(outerKey), new URL(location.href).searchParams.get(innerKey)],
        viewState: document.querySelector('[name="__VIEWSTATE"]').value
      }), { base, innerPrefix, innerKey, outerKey });
      assert.deepEqual(state, { payments: true, invoicesCleared: true, outerStillFinance: true, innerState: ['1'], location: ['3', '2'], viewState: 'FETCHED2-VIEWSTATE' });
      assert.equal(await selected(tab), 'Finance');
      assert.equal(await selected(tab, innerPrefix), 'Payments');
      const keys = await storedKeys(tab);
      assert.equal(keys[pathname + '|' + innerPrefix + 'radTab_Top'].key, innerKey);
      // The key is now known: back to Invoices is a direct fetch, no postback.
      await click(tab, 'Invoices');
      await idle(tab, 3);
      const third = await lastSwitch(tab);
      assert.equal(third.status, 'shown', third.error);
      assert.equal(third.key, 'stored');
      assert.equal(posts.length, 1);
      assert.deepEqual(fetches, [2, '2:1', '2:0']);
      assert.equal(await tab.evaluate(() => !!document.getElementById('invoicesContent')), true);
    });

    await scenario('EmbeddedCCO: the outer strip is hidden and a nested CCO still switches in place', async (tab, fetches) => {
      assert.equal(await tab.evaluate(base => getComputedStyle(document.getElementById(base + 'radTab_Top')).display, base), 'none');
      await click(tab, 'Payments');
      await idle(tab, 1);
      const entry = await lastSwitch(tab);
      assert.equal(entry.status, 'shown', entry.error);
      assert.equal(entry.cco, innerPrefix);
      assert.deepEqual(fetches, ['2:1']);
      assert.equal(await tab.evaluate(() => nativeClicks.length), 0);
    }, { start: 2, embedded: true, query: `?ID=1001&${outerKey}=3` });

    await scenario('us-cco-sticky-tabs: the cover stays on the content, not the sticky strip', async tab => {
      await click(tab, 'Cases');
      await tab.waitForTimeout(300);
      const state = await tab.evaluate(base => {
        const cover = document.querySelector('.us-cco-switch__cover');
        const link = [...document.querySelectorAll('#' + base + 'radTab_Top a.rtsLink')].find(node => node.textContent.trim() === 'Notes');
        const box = link.getBoundingClientRect();
        return {
          coverOwner: cover.parentElement.id,
          tabReachable: link.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2))
        };
      }, base);
      assert.deepEqual(state, { coverOwner: base + 'radPage', tabReachable: true });
      await idle(tab, 1);
    }, { delay: 400, sticky: true });

    await scenario('identification: an Address-like tab strip stays native', async (tab, fetches) => {
      await click(tab, 'Work address');
      await tab.waitForTimeout(100);
      assert.deepEqual(await tab.evaluate(() => nativeClicks), ['Work address']);
      assert.deepEqual(fetches, []);
    });

    await scenario('the us-report-no-styling opt-out leaves CCO clicks native', async (tab, fetches) => {
      await click(tab, 'Cases');
      await tab.waitForTimeout(100);
      assert.deepEqual(await tab.evaluate(() => nativeClicks), ['Cases']);
      assert.deepEqual(fetches, []);
    }, { noStyling: true });

    await scenario('Easy Edit leaves CCO clicks native', async (tab, fetches) => {
      await click(tab, 'Cases');
      await tab.waitForTimeout(100);
      assert.deepEqual(await tab.evaluate(() => nativeClicks), ['Cases']);
      assert.deepEqual(fetches, []);
    }, { easyEdit: true });

    await scenario('off switches: the site setting is read at click time; the session switch survives reloads', async (tab, fetches) => {
      // A Config.js change arriving after the theme script.
      await tab.evaluate(() => { window.UnionSuiteCcoSwitchConfig = { ...window.UnionSuiteCcoSwitchConfig, enabled: false }; });
      await click(tab, 'Cases');
      await tab.waitForTimeout(100);
      assert.deepEqual(await tab.evaluate(() => nativeClicks), ['Cases']);
      assert.deepEqual(fetches, []);
      assert.match(await tab.evaluate(() => UnionSuiteCcoSwitch.disable()), /off in this browser tab/);
      await tab.reload();
      await tab.waitForFunction(() => window.UnionSuiteCcoSwitch && window.UnionSuiteCcoSwitchConfig);
      assert.equal(await tab.evaluate(() => UnionSuiteCcoSwitchConfig.enabled), true);
      await click(tab, 'Cases');
      await tab.waitForTimeout(100);
      assert.deepEqual(await tab.evaluate(() => nativeClicks), ['Cases']);
      assert.deepEqual(fetches, []);
      assert.equal(await tab.evaluate(() => UnionSuiteCcoSwitch.report().sessionDisabled), true);
      assert.match(await tab.evaluate(() => UnionSuiteCcoSwitch.enable()), /on in this browser tab\.$/);
      await click(tab, 'Notes');
      await idle(tab, 1);
      assert.deepEqual(fetches, [3]);
    });

    await scenario('URL keys: expired entries are pruned; an ambiguous URL is discovered through the strip postback reference', async (tab, fetches, posts) => {
      await tab.evaluate(({ pathname, base }) => {
        localStorage.setItem('UnionSuiteCcoSwitch:keys', JSON.stringify({
          [pathname + '|' + base + 'radTab_Top']: { key: 'b511e4d055d8', expires: Date.now() - 1000 },
          ['/Other.aspx|x_radTab_Top']: { key: 'aaaaaaaaaaaa', expires: Date.now() + 1000 }
        }));
        fixtureRegister(base + 'radTab_Top', { _postBackReference: "__doPostBack('custom$Unique$radTab_Top','arguments')" });
      }, { pathname, base });
      await click(tab, 'Cases');
      await idle(tab, 1);
      const entry = await lastSwitch(tab);
      assert.equal(entry.status, 'shown', entry.error);
      assert.equal(entry.key, 'discovered');
      assert.deepEqual(posts.map(post => [post.target, post.index]), [['custom$Unique$radTab_Top', 8]]);
      assert.deepEqual(fetches, [8]);
      const keys = await storedKeys(tab);
      assert.deepEqual(Object.keys(keys).sort(), ['/Other.aspx|x_radTab_Top', pathname + '|' + base + 'radTab_Top']);
      assert.equal(keys[pathname + '|' + base + 'radTab_Top'].key, outerKey);
    }, { query: `?ID=1001&${outerKey}=2&0123456789ab=2` });

    await scenario('a stale key: the fetched page lacks the view, so the key is discarded and the tab posts back natively', async (tab, fetches) => {
      await click(tab, 'Cases');
      await tab.waitForFunction(() => UnionSuiteCcoSwitch.report().log.length === 1);
      const entry = await lastSwitch(tab);
      assert.equal(entry.status, 'fallback');
      assert.match(entry.error, /lacks the tab view/);
      assert.deepEqual(fetches, [8]);
      const state = await tab.evaluate(base => ({
        aboutShown: !!document.querySelector('#' + base + 'Page_2:not(.rmpHidden) #aboutContent'),
        viewState: document.querySelector('[name="__VIEWSTATE"]').value,
        aboutRegistered: !!$find(base + 'About_EditButton'),
        lastPostBack: postBacks.at(-1),
        stripState: JSON.parse(document.getElementById(base + 'radTab_Top_ClientState').value).selectedIndexes,
        cover: !!document.querySelector('.us-cco-switch__cover, [data-us-cco-switch-busy]'),
        root: document.documentElement.hasAttribute('data-us-cco-switching')
      }), base);
      assert.deepEqual(state, {
        aboutShown: true,
        viewState: 'LIVE-VIEWSTATE',
        aboutRegistered: true,
        lastPostBack: [uniqueBase + 'radTab_Top', '{"type":0,"index":"8"}'],
        stripState: ['8'],
        cover: false,
        root: false
      });
      // Native navigation is under way to the clicked tab, with the theme's
      // native tab indicator only.
      assert.equal(await selected(tab), 'Cases');
      await tab.waitForTimeout(200);
      assert.equal(await tab.evaluate(() => document.querySelectorAll('.us-tab-loading-spinner').length), 1);
      assert.deepEqual(await storedKeys(tab), {});
    }, { missingView: true });

    await scenario('a failed fetch falls back to the native tab postback', async (tab, fetches) => {
      await click(tab, 'Cases');
      await tab.waitForFunction(() => UnionSuiteCcoSwitch.report().log.length === 1);
      assert.match((await lastSwitch(tab)).error, /Unexpected tab response \(500\)/);
      assert.deepEqual(await tab.evaluate(() => postBacks.at(-1)[0]), uniqueBase + 'radTab_Top');
      assert.deepEqual(fetches, [8]);
    }, { failFetch: true });

    await scenario('a sign-in response is detected and falls back natively', async tab => {
      await click(tab, 'Cases');
      await tab.waitForFunction(() => UnionSuiteCcoSwitch.report().log.length === 1);
      assert.match((await lastSwitch(tab)).error, /sign-in page/);
      assert.deepEqual(await tab.evaluate(() => postBacks.at(-1)[0]), uniqueBase + 'radTab_Top');
      // A sign-in page does not prove the key wrong.
      assert.equal(Object.keys(await storedKeys(tab)).length, 1);
    }, { signIn: true });

    await scenario('back-forward cache: a restored page has no loading state or queue', async (tab, fetches) => {
      await tab.evaluate(() => { fixturePrm.inPostBack = true; });
      await click(tab, 'Cases');
      await tab.waitForTimeout(200);
      await tab.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
      const state = await tab.evaluate(() => ({
        busy: document.querySelectorAll('[aria-busy="true"], .us-tab-loading-spinner, .us-cco-switch__status').length,
        queued: UnionSuiteCcoSwitch.report().queued
      }));
      assert.deepEqual(state, { busy: 0, queued: null });
      assert.equal(await selected(tab), 'About');
      await tab.evaluate(() => { fixturePrm.inPostBack = false; });
      await tab.waitForTimeout(250);
      assert.deepEqual(fetches, []);
    });

    await scenario('report hygiene: the log keeps the last 20 switches and no form state', async tab => {
      for (let count = 1; count <= 22; count++) {
        await click(tab, count % 2 ? 'Overview' : 'Alerts');
        await idle(tab, Math.min(count, 20));
      }
      const report = await tab.evaluate(() => UnionSuiteCcoSwitch.report());
      assert.equal(report.log.length, 20);
      assert(report.log.every(entry => entry.status === 'shown'));
      assert.equal(report.storedKeys, 1);
      assert.doesNotMatch(JSON.stringify(report), /PRIVATE-|-VIEWSTATE|-TOKEN|-INSTANCE|1001/);
    });

    console.log(`${passed} CCO switching scenarios passed (synthetic doubles; no iMIS server behaviour).`);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
