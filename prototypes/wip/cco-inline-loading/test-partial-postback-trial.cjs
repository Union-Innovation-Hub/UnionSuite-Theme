/* Offline checks for Native-Partial-Postback-Trial.js. PageRequestManager,
 * Sys.Application, $create and the page are synthetic doubles: this checks the
 * switching, form-state, registration and initialization steps, not iMIS
 * server behaviour or real Telerik controls. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(path.resolve(__dirname, '../../../.tmp-iqa-integration/node_modules/playwright'));
const source = fs.readFileSync(path.join(__dirname, 'Native-Partial-Postback-Trial.js'), 'utf8');
const themeDirectory = path.resolve(__dirname, '../../../Theme/UnionSuite');

const base = 'ctl01_TemplateBody_WebPartManager1_gwpciAccountpagetabs_ciAccountpagetabs_';
const uniqueBase = base.replaceAll('_', '$');
const pathname = '/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Individual/Account_Page_Staff.aspx';
const captions = ['Overview', 'About', 'Finance', 'Notes', 'Preferences', 'Security', 'Alerts', 'Participation', 'Cases'];

// A CCO nested in the Finance tab, selected by its own URL key.
const innerPrefix = base + 'FinanceTabs_ciFinanceTabs_';
const innerKey = 'c0ffee123456';
const innerCaptions = ['Invoices', 'Payments'];
const nestedCco = selected => {
  const links = innerCaptions.map((caption, index) => `<li class="rtsLI"><a class="rtsLink${index === selected ? ' rtsSelected' : ''}" href="#"><span class="rtsOut"><span class="rtsIn"><span class="rtsTxt">${caption}</span></span></span></a></li>`).join('');
  const views = innerCaptions.map((caption, index) => `<div id="${innerPrefix}Page_${index + 1}" class="rmpView${index === selected ? '' : ' rmpHidden'}">${index === selected ? `<div id="${caption.toLowerCase()}Content">${caption}</div>` : '<span class="Info">Loading...</span>'}</div>`).join('');
  return `<div class="cco tabs-wrapper tabs-horizontal">
    <div id="${innerPrefix}radTab_Top" class="RadTabStrip RadTabStrip_Orion"><div class="rtsLevel rtsLevel1"><ul class="rtsUL">${links}</ul></div><input type="hidden" id="${innerPrefix}radTab_Top_ClientState" name="${innerPrefix}radTab_Top_ClientState" value=""></div>
    <div id="${innerPrefix}radPage" class="RadMultiPage RadMultiPage_Default">${views}<input type="hidden" id="${innerPrefix}radPage_ClientState" name="${innerPrefix}radPage_ClientState" value=""></div>
  </div>`;
};

const lister = name => `<div id="${base}${name}_ListerPanel"><div class="RadGrid RadGrid_MetroTouch" id="${base}${name}_ResultsGrid_Grid1"></div>
  <input type="image" id="${base}${name}_ResultsGrid_RefreshButton" name="${uniqueBase}${name}$ResultsGrid$RefreshButton"></div>`;

function viewContent(caption, options, inner = 0) {
  if (caption === 'About') {
    return `<div id="aboutContent"><input name="aboutField" value="PRIVATE-ABOUT">
      <span id="${base}About_EditButton" class="RadButton RadButton_Orion"></span>
      <div id="${base}About_Combo" class="RadComboBox"></div>
      <div class="RadAjaxPanel" id="${base}About_radAjaxPanel1Panel"><div id="${base}About_radAjaxPanel1"></div></div>
      <div id="${base}About_CommunicationGrid" class="RadGrid RadGrid_MetroTouch"></div>
      ${lister('ContactDetailsList')}${lister('Jobs')}
      <script>window.aboutScriptRuns = (window.aboutScriptRuns || 0) + 1;</script></div>`;
  }
  if (caption === 'Finance') {
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
  if (caption === 'Cases') {
    return `<div class="ContentWizardDisplay"><div id="ste_container_Cases">
      <div id="${base}Cases_UpdateProgress1" style="display:none"></div>
      <div id="${base}Cases_ListerPanel"><div class="RadGrid RadGrid_MetroTouch" id="${base}Cases_ResultsGrid_Grid1"></div>
        <input type="image" id="${base}Cases_ResultsGrid_RefreshButton" name="${uniqueBase}Cases$ResultsGrid$RefreshButton"></div>
      <script>window.casesScriptRuns = (window.casesScriptRuns || 0) + 1;${options.badViewScript ? 'undefinedHelper();' : ''}</script>
      <script type="application/json">{"not": "executed"}</script></div></div>`;
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
  // A grid outside listers: its events need a page-level manager statement,
  // emitted separately among other startup statements (as for Email
  // Communications on the live Notes tab).
  const grid = base + 'About_CommunicationGrid';
  const manager = `window['${grid}_jsmanager']=new Asi_Web_BusinessDataGrid2({"GridClientId":"${grid}","Note":"a (b); c"});;(function(){window.otherStartupRan=true;})();`;
  const gridCreate = `Sys.Application.add_init(function() {\n    $create(Telerik.Web.UI.RadGrid, {"ClientID":"${grid}"}, {"gridCreated":window['${grid}_jsmanager'].OnGridCreated}, null, $get("${grid}"));\n});`;
  const listers = { 8: ['Cases'], 1: ['ContactDetailsList', 'Jobs'] }[selected] || [];
  const panels = listers.map(name => `,'t${uniqueBase}${name}$ListerPanel',''`).join('');
  return `Sys.WebForms.PageRequestManager._initialize('ctl01$ScriptManager1', 'aspnetForm', ['tctl01$UserMessagesUpdatePanel',''${panels}], ['ctl01$ScriptManager1','','${uniqueBase}radTab_Top',''], ['btnExportWord',''], 3600, 'ctl01');\n${manager}${creates}\n${gridCreate}`;
}

function page(selected, state, options = {}) {
  const views = captions.map((caption, index) => {
    const shown = index === selected;
    if (shown && options.missingView && !state.live) return '';
    const body = shown ? viewContent(caption, options, state.inner) : '<span class="Info">Loading...</span>';
    return `<div id="${base}Page_${index + 1}" class="rmpView${shown ? '' : ' rmpHidden'}">${body}</div>`;
  }).join('');
  const links = captions.map((caption, index) => `<li class="rtsLI"><a class="rtsLink${index === selected ? ' rtsSelected' : ''}" href="#"><span class="rtsOut"><span class="rtsIn"><span class="rtsTxt">${caption}</span></span></span></a></li>`).join('');
  const validation = state.validation ? `<input type="hidden" name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="${state.validation}">` : '';
  // The live page's own startup script is not replayed in the fixture.
  const startup = state.live ? '' : `<script type="text/x-fixture-startup">${startupScript(selected)}</script>`;
  // The installed theme's own stylesheets supply the spinner styles.
  // Telerik's embedded multipage rule is not part of the theme files.
  const theme = '<link rel="stylesheet" href="/theme/99-Orion.css"><link rel="stylesheet" href="/theme/zUnionSuite.css"><link rel="stylesheet" href="/telerik.css">';
  return `<!doctype html><html><head><title>Fixture</title>${theme}</head><body><form method="post" action="./Account_Page_Staff.aspx?ID=1001&amp;b511e4d055d8=${selected + 1}" id="aspnetForm">
    <input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="${state.name}-VIEWSTATE">
    <input type="hidden" name="__RequestVerificationToken" id="__RequestVerificationToken" value="${state.name}-TOKEN">
    <input type="hidden" name="PageInstanceKey" id="PageInstanceKey" value="${state.name}-INSTANCE">
    <input type="hidden" name="__EVENTTARGET" id="__EVENTTARGET" value="">
    <input type="hidden" name="__EVENTARGUMENT" id="__EVENTARGUMENT" value="">
    ${validation}
    <div class="cco tabs-wrapper tabs-vertical tabs-left">
    <div id="${base}radTab_Top" class="RadTabStripVertical RadTabStrip_Orion RadTabStripLeft_Orion RadTabStripLeft"><div class="rtsLevel rtsLevel1"><ul class="rtsUL">${links}</ul></div><input type="hidden" id="${base}radTab_Top_ClientState" name="${base}radTab_Top_ClientState" value=""></div>
    <div id="${base}radPage" class="RadMultiPage RadMultiPage_Default">${views}<input type="hidden" id="${base}radPage_ClientState" name="${base}radPage_ClientState" value="PRIVATE-PAGE"></div>
    </div>
    <input type="hidden" name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="BD015436">
  </form>${startup}</body></html>`;
}

function installDoubles() {
  const registry = new Map();
  window.fixtureRegistry = registry;
  window.fixtureDisposed = [];
  window.fixtureCreated = [];
  window.postBacks = [];
  window.fixtureHandlers = {};
  window.$get = id => document.getElementById(id);
  window.$find = id => registry.get(id) || null;
  window.$create = (type, properties, events, references, element) => {
    if (registry.has(element.id)) throw new Error('Two components with the same id');
    const component = {
      get_id: () => element.id,
      get_element: () => element,
      dispose() { fixtureDisposed.push(element.id); registry.delete(element.id); element.control = null; }
    };
    element.control = component;
    registry.set(element.id, component);
    fixtureCreated.push(element.id);
    // Models the live failure: this control's disposal leaves its load
    // handler registered, and the handler fails once the control is gone.
    if (type === Telerik.Web.UI.RadMenu) {
      Sys.Application.add_load(() => { if (!registry.has(element.id)) throw new Error("can't access property \"_item\", e is undefined"); });
    }
    return component;
  };
  window.Telerik = { Web: { UI: { RadTabStrip: {}, RadGrid: {}, RadButton: {}, RadAjaxPanel: {}, RadMenu: {} } } };
  window.Asi_Web_BusinessDataGrid2 = function (settings) {
    this.settings = settings;
    this.OnGridCreated = () => {};
  };
  const handlers = (list, handler) => { const index = list.indexOf(handler); if (index >= 0) list.splice(index, 1); };
  window.fixtureLoad = [];
  window.fixturePageLoaded = [];
  const prm = {
    _updatePanelIDs: ['ctl01$UserMessagesUpdatePanel'],
    _updatePanelClientIDs: ['ctl01_UserMessagesUpdatePanel'],
    _updatePanelHasChildrenAsTriggers: [true],
    get_isInAsyncPostBack: () => false,
    add_endRequest(handler) { fixtureHandlers.endRequest = handler; },
    add_pageLoaded(handler) { fixturePageLoaded.push(handler); },
    remove_pageLoaded(handler) { handlers(fixturePageLoaded, handler); },
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
  window.fixturePrm = prm;
  window.Sys = {
    UI: { _UpdateProgress: {} },
    Application: {
      add_init: handler => handler(),
      add_load: handler => fixtureLoad.push(handler),
      remove_load: handler => handlers(fixtureLoad, handler),
      getComponents: () => [...registry.values()]
    },
    WebForms: { PageRequestManager: { getInstance: () => prm } },
    Net: { WebRequestManager: { add_invokingRequest() {}, add_completedRequest() {} } }
  };
  // A native lister refresh updates every lister panel on the tab, creates
  // their grids, raises Sys.Application load, then endRequest. A load handler
  // error aborts the sequence before endRequest, as in the live stack trace.
  window.__doPostBack = (target, argument) => {
    postBacks.push([target, argument]);
    window.progressHiddenDuringRefresh = !!document.querySelector('[id$="_UpdateProgress1"][data-us-iqa-progress-replaced]');
    // The theme's report-refresh overlay reacts to lister refresh buttons.
    const themeOverlay = document.createElement('div');
    themeOverlay.className = 'us-iqa-refresh-overlay';
    document.body.append(themeOverlay);
    // Mutation observers run after this task's microtasks, before painting.
    queueMicrotask(() => { window.themeOverlayDisplay = getComputedStyle(themeOverlay).display; });
    setTimeout(() => {
      themeOverlay.remove();
      for (const grid of document.querySelectorAll('[id$="_ListerPanel"] .RadGrid')) {
        if (!registry.has(grid.id)) $create(Telerik.Web.UI.RadGrid, {}, null, null, grid);
      }
      for (const handler of [...fixtureLoad]) handler();
      fixtureHandlers.endRequest(null, { get_error: () => null, set_errorHandled() {} });
    }, 20);
  };
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let passed = 0;
  try {
    async function scenario(name, run, options = {}) {
      const context = await browser.newContext();
      const tab = await context.newPage();
      const errors = [], fetches = [], posts = [];
      tab.on('pageerror', error => errors.push(error.message));
      await tab.route('http://cco.test/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.pathname === '/telerik.css') return route.fulfill({ contentType: 'text/css', body: '.rmpHidden { display: none; }' });
        if (url.pathname.startsWith('/theme/')) {
          return route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(themeDirectory, path.basename(url.pathname)), 'utf8') });
        }
        // Theme fonts and images are not needed for these checks.
        if (url.pathname !== pathname) return route.fulfill({ status: 404, body: '' });
        const selected = Number(url.searchParams.get('b511e4d055d8')) - 1;
        const inner = Number(url.searchParams.get(innerKey) || 1) - 1;
        // A tab-strip postback answers with a redirect to the tab's URL.
        if (request.method() === 'POST') {
          const body = new URLSearchParams(request.postData());
          posts.push({ target: body.get('__EVENTTARGET'), argument: body.get('__EVENTARGUMENT'), viewState: body.get('__VIEWSTATE') });
          const index = Number(JSON.parse(body.get('__EVENTARGUMENT')).index);
          const target = encodeURIComponent(`${pathname}?ID=1001&b511e4d055d8=${selected + 1}&${innerKey}=${index + 1}#${innerKey}`);
          return route.fulfill({ contentType: 'text/plain', body: `1|#||4|${target.length}|pageRedirect||${target}|` });
        }
        const live = request.isNavigationRequest();
        if (!live) fetches.push(url.searchParams.has(innerKey) ? selected + ':' + inner : selected);
        if (!live && options.delay) await new Promise(resolve => setTimeout(resolve, options.delay === true ? 150 : options.delay));
        const html = page(live ? (options.start ?? 1) : selected, { name: live ? 'LIVE' : 'FETCHED' + selected, live, inner, validation: live ? 'LIVE-VALIDATION' : '' }, options);
        // A policy that blocks inline <style> elements, as the live page appeared to.
        const headers = options.csp ? { 'Content-Security-Policy': "style-src 'self'" } : {};
        return route.fulfill({ contentType: 'text/html', body: html, headers });
      });
      try {
        await tab.goto('http://cco.test' + pathname + '?ID=1001&b511e4d055d8=2');
        await tab.evaluate(installDoubles);
        // The native About controls exist before the trial starts.
        await tab.evaluate(id => $create(Telerik.Web.UI.RadButton, {}, null, null, $get(id)), base + 'About_EditButton');
        await tab.evaluate(source);
        await tab.evaluate(() => usCcoPartial.start());
        await run(tab, fetches, posts);
        assert.deepEqual(errors.filter(message => !(options.expectedError && options.expectedError.test(message))), []);
        console.log('PASS ' + name); passed++;
      } finally { await context.close(); }
    }
    const click = (tab, caption) => tab.locator('a.rtsLink', { hasText: caption }).click();
    const waitIdle = tab => tab.waitForFunction(() => !document.getElementById('ctl01_TemplateBody_WebPartManager1_gwpciAccountpagetabs_ciAccountpagetabs_radPage').hasAttribute('aria-busy') && usCcoPartial.report().log.some(entry => entry.event === 'switch'));
    const lastSwitch = tab => tab.evaluate(() => usCcoPartial.report().log.filter(entry => entry.event === 'switch').at(-1));

    await scenario('About to Cases: disposes About, switches state, registers panels, initializes and refreshes natively', async (tab, fetches) => {
      await click(tab, 'Cases');
      await waitIdle(tab);
      const entry = await lastSwitch(tab);
      assert.equal(entry.status, 'shown', entry.error);
      assert.deepEqual(fetches, [8]);
      const state = await tab.evaluate(({ base, uniqueBase }) => ({
        casesShown: !!document.querySelector('#' + base + 'Page_9:not(.rmpHidden) #ste_container_Cases'),
        aboutCleared: document.getElementById(base + 'Page_2').classList.contains('rmpHidden') && !document.getElementById('aboutContent'),
        aboutDisposed: fixtureDisposed.includes(base + 'About_EditButton'),
        viewState: document.querySelector('[name="__VIEWSTATE"]').value,
        validationRemoved: !document.querySelector('[name="__EVENTVALIDATION"]'),
        action: new URL(document.getElementById('aspnetForm').action).searchParams.get('b511e4d055d8'),
        locationTab: new URL(location.href).searchParams.get('b511e4d055d8'),
        tabState: JSON.parse(document.getElementById(base + 'radTab_Top_ClientState').value).selectedIndexes,
        selected: document.querySelector('a.rtsSelected').textContent,
        panels: fixturePrm._updatePanelIDs,
        created: fixtureCreated,
        casesScriptRuns: window.casesScriptRuns,
        postBacks,
        progressRegistered: !!$find(base + 'Cases_UpdateProgress1'),
        gridRegistered: !!$find(base + 'Cases_ResultsGrid_Grid1')
      }), { base, uniqueBase });
      assert.equal(state.casesShown, true);
      assert.equal(state.aboutCleared, true);
      assert.equal(state.aboutDisposed, true);
      assert.equal(state.viewState, 'FETCHED8-VIEWSTATE');
      assert.equal(state.validationRemoved, true);
      assert.equal(state.action, '9');
      assert.equal(state.locationTab, '9');
      assert.deepEqual(state.tabState, ['8']);
      assert.equal(state.selected, 'Cases');
      assert.deepEqual(state.panels, ['ctl01$UserMessagesUpdatePanel', uniqueBase + 'Cases$ListerPanel']);
      assert.equal(state.casesScriptRuns, 1);
      // Tab strip is outside the view; the grid is left to the native refresh.
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
      assert.doesNotMatch(JSON.stringify(await tab.evaluate(() => usCcoPartial.report())), /PRIVATE-|-VIEWSTATE|-TOKEN|-INSTANCE/);
    });

    await scenario('Cases back to About: disposes Cases, re-creates About controls and reports uninitialized ones', async (tab, fetches) => {
      await click(tab, 'Cases');
      await waitIdle(tab);
      await click(tab, 'About');
      await tab.waitForFunction(() => usCcoPartial.report().log.filter(entry => entry.event === 'switch').length === 2 && !document.querySelector('[aria-busy]'));
      const entry = await lastSwitch(tab);
      assert.equal(entry.status, 'shown', entry.error);
      assert.deepEqual(fetches, [8, 1]);
      const state = await tab.evaluate(base => ({
        aboutShown: !!document.querySelector('#' + base + 'Page_2:not(.rmpHidden) #aboutContent'),
        casesCleared: !document.getElementById('ste_container_Cases'),
        gridDisposed: fixtureDisposed.includes(base + 'Cases_ResultsGrid_Grid1'),
        buttonRegistered: !!$find(base + 'About_EditButton'),
        aboutScriptRuns: window.aboutScriptRuns,
        viewState: document.querySelector('[name="__VIEWSTATE"]').value,
        panels: fixturePrm._updatePanelIDs
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
      assert.deepEqual(await tab.evaluate(base => ({
        registered: !!$find(base + 'About_CommunicationGrid'),
        settings: window[base + 'About_CommunicationGrid_jsmanager']?.settings?.Note,
        otherStartupRan: !!window.otherStartupRan
      }), base), { registered: true, settings: 'a (b); c', otherStartupRan: false });
      // One refresh initializes both About listers; the second is skipped.
      assert.equal(entry.listers.length, 2);
      assert.equal(entry.listers[0].gridRegistered, true);
      assert.equal(entry.listers[0].skipped, undefined);
      assert.equal(entry.listers[1].skipped, 'already initialized');
      assert.equal(await tab.evaluate(() => postBacks.length), 2);
      // The RadAjaxPanel wrapper is not reported: its child holds the component.
      assert.deepEqual(entry.uninitialized, [{ id: base + 'About_Combo', type: 'RadComboBox' }]);
      assert.deepEqual(entry.orphans, []);
    });

    await scenario('handlers registered by a left view are removed, so later native updates do not fail', async tab => {
      await click(tab, 'Cases');
      await waitIdle(tab);
      await click(tab, 'Finance');
      await tab.waitForFunction(() => usCcoPartial.report().log.filter(entry => entry.event === 'switch').length === 2 && !document.querySelector('[aria-busy]'));
      const finance = await lastSwitch(tab);
      assert.equal(finance.status, 'shown', finance.error);
      // Two from the view script, one from the leaking control's creation.
      assert.equal(finance.trackedHandlers, 3);
      assert.equal(await tab.evaluate(() => fixtureLoad.length), 2);
      await click(tab, 'About');
      await tab.waitForFunction(() => usCcoPartial.report().log.filter(entry => entry.event === 'switch').length === 3 && !document.querySelector('[aria-busy]'));
      const about = await lastSwitch(tab);
      assert.equal(about.status, 'shown', about.error);
      assert.equal(about.releasedHandlers, 3);
      assert.deepEqual(about.pageErrors, []);
      assert.equal(about.listers[0].error, null);
      assert.equal(about.listers[0].gridRegistered, true);
      assert.deepEqual(await tab.evaluate(() => [fixtureLoad.length, fixturePageLoaded.length, window.financeLoadRuns || 0]), [0, 0, 0]);
      assert.equal(await tab.evaluate(base => fixtureDisposed.includes(base + 'Finance_Menu'), base), true);
    });

    await scenario('clicks on the displayed tab and during a switch are not posted natively', async (tab, fetches) => {
      await click(tab, 'About');
      await tab.waitForTimeout(50);
      assert.deepEqual(fetches, []);
      await click(tab, 'Cases');
      await click(tab, 'Finance');
      await waitIdle(tab);
      const log = await tab.evaluate(() => usCcoPartial.report().log);
      assert.deepEqual(fetches, [8]);
      assert.equal(log.some(entry => entry.event === 'ignored' && entry.tab === 'Finance'), true);
      assert.equal(await tab.evaluate(() => postBacks.length), 1);
    }, { delay: true });

    await scenario('view script errors are reported and the switch completes', async tab => {
      await click(tab, 'Cases');
      await waitIdle(tab);
      const entry = await lastSwitch(tab);
      assert.equal(entry.status, 'shown');
      assert.equal(entry.scripts.errors.length, 1);
      assert.match(entry.scripts.errors[0].message, /undefinedHelper/);
      assert.equal(entry.listers[0].gridRegistered, true);
    }, { badViewScript: true, expectedError: /undefinedHelper/ });

    await scenario('theme tab and section spinners show after the native delay over an opaque cover and are removed when ready', async tab => {
      const started = await tab.evaluate(() => usCcoPartial.report().log[0].themeStyles);
      assert.deepEqual(started, { sectionSpinner: true, tabSpinner: true });
      await click(tab, 'Cases');
      // Before the 150 ms delay: selected and busy, but no spinner yet.
      const early = await tab.evaluate(base => ({
        selected: document.querySelector('a.rtsSelected').textContent,
        busy: document.querySelector('a.rtsSelected').getAttribute('aria-busy'),
        spinner: !!document.querySelector('.us-tab-loading-spinner')
      }), base);
      assert.deepEqual(early, { selected: 'Cases', busy: 'true', spinner: false });
      await tab.waitForTimeout(300);
      const loading = await tab.evaluate(base => {
        const link = document.querySelector('a.rtsSelected');
        const multiPage = document.getElementById(base + 'radPage');
        const overlay = multiPage.querySelector(':scope > .us-cco-partial__overlay');
        const loader = overlay?.querySelector('.section-loader-spinning-circles');
        const box = loader.getBoundingClientRect(), area = multiPage.getBoundingClientRect(), cover = overlay.getBoundingClientRect();
        return {
          tabMarker: link.hasAttribute('data-us-tab-loading'),
          tabSpinnerAnimated: getComputedStyle(link.querySelector('.us-tab-loading-spinner')).animationName !== 'none',
          loaderAnimated: getComputedStyle(loader).animationName !== 'none',
          loaderInside: box.left >= area.left && box.right <= area.right && box.top >= area.top,
          // The cover fills the padding box, inside any theme border.
          coversContent: Math.round(cover.width) === multiPage.clientWidth && Math.round(cover.height) === multiPage.clientHeight,
          opaque: getComputedStyle(overlay).backgroundColor,
          blocked: getComputedStyle(multiPage).pointerEvents,
          status: document.querySelector('.us-cco-partial__status[role="status"]')?.textContent
        };
      }, base);
      assert.equal(loading.opaque, 'rgb(255, 255, 255)');
      delete loading.opaque;
      assert.deepEqual(loading, { tabMarker: true, tabSpinnerAnimated: true, loaderAnimated: true, loaderInside: true, coversContent: true, blocked: 'none', status: 'Loading Cases' });
      if (process.env.US_CCO_SCREENSHOT) await tab.screenshot({ path: process.env.US_CCO_SCREENSHOT });
      await waitIdle(tab);
      const done = await tab.evaluate(base => {
        const link = document.querySelector('a.rtsSelected');
        const multiPage = document.getElementById(base + 'radPage');
        return {
          selected: link.textContent,
          tabClear: !link.hasAttribute('data-us-tab-loading') && !link.hasAttribute('aria-busy') && !link.querySelector('.us-tab-loading-spinner'),
          contentClear: !multiPage.hasAttribute('aria-busy') && !multiPage.querySelector(':scope > .us-cco-partial__overlay') && !multiPage.getAttribute('style'),
          statusRemoved: !document.querySelector('.us-cco-partial__status'),
          progressHiddenDuringRefresh: window.progressHiddenDuringRefresh,
          themeOverlayHiddenDuringRefresh: window.themeOverlayDisplay === 'none',
          progressRestored: !document.querySelector('[data-us-iqa-progress-replaced]')
        };
      }, base);
      assert.deepEqual(done, { selected: 'Cases', tabClear: true, contentClear: true, statusRemoved: true, progressHiddenDuringRefresh: true, themeOverlayHiddenDuringRefresh: true, progressRestored: true });
      const entry = await lastSwitch(tab);
      const { inViewport, onTop, topElement, insideContent, overlayPosition, restoredFromHistory } = entry.indicator;
      assert.deepEqual({ inViewport, onTop, topElement, insideContent, overlayPosition, restoredFromHistory }, { inViewport: true, onTop: true, topElement: 'span.section-loader-spinning-circles', insideContent: true, overlayPosition: 'absolute', restoredFromHistory: false });
      assert.equal(await tab.evaluate(() => usCcoPartial.report().log[0].styleElementsApply), false);
    }, { delay: 400, csp: true });

    await scenario('the section spinner stays in view when the page is scrolled down to the tabs', async tab => {
      await tab.evaluate(base => { document.getElementById(base + 'Page_2').style.minHeight = '2400px'; window.scrollTo(0, 1200); }, base);
      // Click without letting the test runner scroll the tab into view.
      await tab.evaluate(() => [...document.querySelectorAll('a.rtsLink')].find(link => link.textContent === 'Cases').click());
      await tab.waitForTimeout(300);
      const position = await tab.evaluate(() => {
        const box = document.querySelector('.us-cco-partial__overlay .section-loader-spinning-circles').getBoundingClientRect();
        return { scrolled: scrollY, visible: box.top >= 0 && box.bottom <= innerHeight };
      });
      assert.deepEqual(position, { scrolled: 1200, visible: true });
      await waitIdle(tab);
      const entry = await lastSwitch(tab);
      assert.equal(entry.indicator.inViewport, true);
      assert.equal(entry.indicator.onTop, true);
      assert.equal(entry.indicator.insideContent, true);
    }, { delay: 400, csp: true });

    await scenario('pasting the script again stops the earlier copy, so the new copy handles and logs switches', async (tab, fetches) => {
      await tab.evaluate(source);
      await tab.evaluate(() => usCcoPartial.start());
      await click(tab, 'Cases');
      await waitIdle(tab);
      const report = await tab.evaluate(() => usCcoPartial.report());
      assert.equal(report.log[0].replacedInstance, report.version);
      assert.equal(report.log.filter(entry => entry.event === 'switch').length, 1);
      assert.equal(report.log.find(entry => entry.event === 'switch').status, 'shown');
      assert.deepEqual(fetches, [8]);
    });

    await scenario('a full postback reload keeps the report and its cause for the next paste', async tab => {
      await click(tab, 'Cases');
      await waitIdle(tab);
      // As __doPostBack does before a full-page submit.
      await tab.evaluate(() => { document.getElementById('__EVENTTARGET').value = 'ctl01$TemplateBody$Preferences$SaveButton'; });
      await tab.reload();
      await tab.evaluate(installDoubles);
      const message = await tab.evaluate(source);
      assert.match(message, /previousReport/);
      const kept = await tab.evaluate(() => usCcoPartial.previousReport());
      assert.equal(kept.log.find(entry => entry.event === 'switch').tab, 'Cases');
      const unload = kept.log.at(-1);
      assert.deepEqual({ event: unload.event, target: unload.fullPostBackTarget, tab: unload.formActionTab, busy: unload.busy },
        { event: 'unload', target: 'ctl01$TemplateBody$Preferences$SaveButton', tab: '9', busy: false });
      assert.doesNotMatch(JSON.stringify(kept), /-VIEWSTATE|-TOKEN|-INSTANCE|PRIVATE-/);
    });

    await scenario('a CCO nested in a tab switches in place: first by discovering its URL key, then directly', async (tab, fetches, posts) => {
      const switches = () => tab.evaluate(() => usCcoPartial.report().log.filter(entry => entry.event === 'switch'));
      await click(tab, 'Finance');
      await tab.waitForFunction(() => usCcoPartial.report().log.some(entry => entry.event === 'switch') && !document.querySelector('[aria-busy]'));
      await click(tab, 'Payments');
      await tab.waitForFunction(() => usCcoPartial.report().log.filter(entry => entry.event === 'switch').length === 2 && !document.querySelector('[aria-busy]'));
      let log = await switches();
      const first = log[1];
      assert.equal(first.status, 'shown', first.error);
      assert.equal(first.cco, innerPrefix);
      assert.equal(first.tab, 'Payments');
      assert.deepEqual(first.discovery.key, innerKey);
      // One discovery postback with the tab strip event and current state.
      assert.equal(posts.length, 1);
      assert.deepEqual({ target: posts[0].target, argument: JSON.parse(posts[0].argument) }, { target: innerPrefix.replaceAll('_', '$') + 'radTab_Top', argument: { type: 0, index: '1' } });
      assert.equal(posts[0].viewState, 'FETCHED2-VIEWSTATE');
      const state = await tab.evaluate(({ base, innerPrefix, innerKey }) => ({
        payments: !!document.querySelector('#' + innerPrefix + 'Page_2:not(.rmpHidden) #paymentsContent'),
        invoicesCleared: !document.getElementById('invoicesContent'),
        outerStillFinance: !document.getElementById(base + 'Page_3').classList.contains('rmpHidden') && !!document.getElementById('financeContent'),
        outerSelected: document.querySelector('#' + base + 'radTab_Top a.rtsSelected').textContent,
        innerSelected: document.querySelector('#' + innerPrefix + 'radTab_Top a.rtsSelected').textContent,
        innerState: JSON.parse(document.getElementById(innerPrefix + 'radTab_Top_ClientState').value).selectedIndexes,
        location: [new URL(location.href).searchParams.get('b511e4d055d8'), new URL(location.href).searchParams.get(innerKey)],
        viewState: document.querySelector('[name="__VIEWSTATE"]').value,
        keys: usCcoPartial.report().urlKeys
      }), { base, innerPrefix, innerKey });
      assert.deepEqual(state, {
        payments: true,
        invoicesCleared: true,
        outerStillFinance: true,
        outerSelected: 'Finance',
        innerSelected: 'Payments',
        innerState: ['1'],
        location: ['3', '2'],
        viewState: 'FETCHED2-VIEWSTATE',
        keys: { [base + 'radTab_Top']: 'b511e4d055d8', [innerPrefix + 'radTab_Top']: innerKey }
      });
      // The key is now known: back to Invoices is a direct fetch, no postback.
      await click(tab, 'Invoices');
      await tab.waitForFunction(() => usCcoPartial.report().log.filter(entry => entry.event === 'switch').length === 3 && !document.querySelector('[aria-busy]'));
      log = await switches();
      assert.equal(log[2].status, 'shown', log[2].error);
      assert.equal(log[2].discovery, undefined);
      assert.equal(posts.length, 1);
      assert.deepEqual(fetches, [2, '2:1', '2:0']);
      assert.equal(await tab.evaluate(() => !!document.getElementById('invoicesContent')), true);
    });

    await scenario('a fetched page without the tab view changes nothing', async tab => {
      await click(tab, 'Cases');
      await waitIdle(tab);
      const entry = await lastSwitch(tab);
      assert.equal(entry.status, 'failed');
      assert.match(entry.error, /Nothing was changed/);
      const state = await tab.evaluate(base => ({
        aboutShown: !!document.querySelector('#' + base + 'Page_2:not(.rmpHidden) #aboutContent'),
        viewState: document.querySelector('[name="__VIEWSTATE"]').value,
        aboutRegistered: !!$find(base + 'About_EditButton')
      }), base);
      assert.deepEqual(state, { aboutShown: true, viewState: 'LIVE-VIEWSTATE', aboutRegistered: true });
      // The optimistic tab selection reverts and no indicator is left behind.
      assert.deepEqual(await tab.evaluate(() => ({
        selected: document.querySelector('a.rtsSelected').textContent,
        indicators: document.querySelectorAll('.us-tab-loading-spinner, .us-cco-partial__loader, .us-cco-partial__status, [data-us-tab-loading]').length
      })), { selected: 'About', indicators: 0 });
    }, { missingView: true });

    await scenario('delta summary reports redirects and server errors', async tab => {
      const summary = await tab.evaluate(() => {
        const target = encodeURIComponent('/x/Account_Page_Staff.aspx?ID=1001&b511e4d055d8=9');
        const message = 'Invalid postback';
        return [
          usCcoPartial.deltaSummary(`${target.length}|pageRedirect||${target}|`),
          usCcoPartial.deltaSummary(`${message.length}|error|500|${message}|`)
        ];
      });
      assert.deepEqual(summary[0].redirect, { path: '/x/Account_Page_Staff.aspx', tab: '9', parameters: ['ID', 'b511e4d055d8'] });
      assert.deepEqual(summary[1].error, { status: '500', message: 'Invalid postback' });
    });

    console.log(`${passed} partial-postback trial scenarios passed (synthetic doubles; no iMIS server behaviour).`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
