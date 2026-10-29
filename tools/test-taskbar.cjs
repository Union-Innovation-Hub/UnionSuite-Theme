// Browser checks use fictional local responses. No iMIS requests are made.
const {guidePath}=require('../Theme/UnionSuite-Guides/usage/build/guide-output.cjs');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('../.tmp-iqa-integration/node_modules/playwright');
const script = fs.readFileSync('Theme/UnionSuite/Scripts/UnionSuiteTaskbar.js', 'utf8');
const css = fs.readFileSync('Theme/UnionSuite/zUnionSuite.css', 'utf8');
const presentation = script.replace(/\.style\.setProperty\('--pip-(?:gaze-[xy]|turn|perch-offset)'/g, 'setPipCoordinate(');
assert(!/\.style\.|createElement\(['"]style|const CSS/.test(presentation), 'Only dynamic Pip coordinates belong in JS; CSS stays in the stylesheet');
const fixture = `<div id="hd"><div class="searchfieldplus-dropdown"><div class="RecentHistoryList"><div class="RecentHistoryItem"><a href="/Party.aspx?ID=104019">Alex Morgan (104019)</a></div></div></div></div><input id="__ClientContext" type="hidden"><input id="__RequestVerificationToken" type="hidden" value="fixture-token">`;
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1100,height:650}});
    await page.route('**/*', route => route.abort());
    await page.setContent(fixture);
    await page.addStyleTag({content:css});
    await page.evaluate(() => {
      document.querySelector('#__ClientContext').value = JSON.stringify({loggedInPartyId:'100',isAnonymous:false,websiteRoot:'https://example.test/ClientSite/'});
      window.UnionSuiteTaskbarConfig = {searchDelay:5};
      window.requests = [];
      window.fetch = (url, options) => new Promise((resolve, reject) => {
        window.requests.push({url,token:options.headers.RequestVerificationToken});
        const timer = setTimeout(() => {
          if (url.includes('/api/CsContact/')) return resolve({ok:false,status:404});
          const term = decodeURIComponent(url.split('&parameter=')[1]);
          if(term === 'error') return resolve({ok:false,status:500});
          const fields = {ID:'104020',FULL_NAME:term,PreferredEmail:'alex@example.com','Member Type':'Regular',Status:'Active'};
          const Items = {$values:term === 'empty' ? [] : [{Properties:{$values:Object.entries(fields).map(([Name,Value])=>({Name,Value}))}}]};
          resolve({ok:true,json:async()=>({Items})});
        }, url.includes('slow')?180:20);
        options.signal?.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));});
      });
    });
    await page.addScriptTag({content:script});
    assert.equal(await page.locator('#injected-taskbar').count(),1);
    for (const href of await page.locator('.us-taskbar__quick-link').evaluateAll(links=>links.map(link=>link.href))) assert(href.startsWith('https://example.test/ClientSite/'),href);
    assert.equal(await page.locator('.us-taskbar__search-icon[aria-hidden="true"]').count(),1);
    assert.equal(await page.locator('#injected-taskbar label').count(),0);
    assert.equal(await page.locator('#us-taskbar-record-id').count(),0);
    assert.equal(await page.getByRole('link',{name:'Full search',exact:true}).getAttribute('href'),'https://example.test/ClientSite/_i4u_/Core/Staff-Site-Layouts/Admin/Directory.aspx');
    assert.equal(await page.locator('.us-taskbar__search-shell').evaluate(el=>el.getBoundingClientRect().height),36);
    assert.equal(await page.locator('.searchfieldplus-dropdown').isVisible(),false);
    await page.addScriptTag({content:script});
    assert.equal(await page.locator('#injected-taskbar').count(),1,'Duplicate includes do not mount twice');
    const input = page.locator('#us-taskbar-search');
    await input.focus();
    await page.getByText('Recently viewed records',{exact:true}).waitFor();
    await input.fill('slow');
    await page.waitForTimeout(15);
    await input.fill('Morgan');
    await page.locator('.tb-dd-name').filter({hasText:'Morgan'}).waitFor();
    await page.waitForTimeout(200);
    assert.equal(await page.locator('.tb-dd-name').textContent(),'Morgan');
    await input.press('ArrowDown');
    assert(await page.locator('.tb-dd-item').evaluate(node=>node===document.activeElement));
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#tb-search-dropdown').isVisible(),false);
    await input.fill('slow');
    await page.waitForTimeout(15);
    await input.press('Escape');
    await page.waitForTimeout(200);
    assert.equal(await page.locator('#tb-search-dropdown').isVisible(),false,'Dismissed requests cannot reopen results');
    await input.fill('empty');
    await page.getByText('No results found.',{exact:true}).waitFor();
    await input.fill('error');
    await page.getByText('Error: HTTP 500',{exact:true}).waitFor();
    assert((await page.evaluate(()=>window.requests)).every(request=>request.token==='fixture-token'));
    const searchRequests = (await page.evaluate(()=>window.requests)).filter(request=>request.url.includes('/api/iqa?'));
    assert(searchRequests.length > 0);
    for (const request of searchRequests) {
      const query = new URLSearchParams(request.url.split('?')[1]);
      assert.deepEqual(query.getAll('limit'), ['10'], 'Every quick-search request has one limit=10');
    }
    await page.evaluate(()=>document.querySelector('#injected-taskbar').remove());
    await page.locator('#injected-taskbar').waitFor();
    assert.equal(await page.locator('#injected-taskbar').count(),1);
    for (const href of await page.locator('.us-taskbar__quick-link').evaluateAll(links=>links.map(link=>link.href))) assert(href.startsWith('https://example.test/ClientSite/'),href);
    await page.evaluate(()=>window.UnionSuiteTaskbar.destroy());
    assert.equal(await page.locator('#injected-taskbar').count(),0);
    assert(await page.locator('.searchfieldplus-dropdown').isVisible());
    await page.evaluate(()=>window.UnionSuiteTaskbar.initialise());
    await input.focus();
    await input.fill('Morgan');
    await page.locator('.tb-dd-name').filter({hasText:'Morgan'}).waitFor();
    await page.waitForTimeout(60);
    await page.screenshot({path:'.tmp-iqa-integration/taskbar-rebuilt-desktop.png'});
    await page.setViewportSize({width:390,height:760});
    await input.press('Escape');
    await input.blur();
    await input.focus();
    await input.fill('Mobile');
    await page.locator('.tb-dd-name').filter({hasText:'Mobile'}).waitFor();
    assert(await page.locator('.tb-dd-input').evaluate(node=>document.activeElement===node));
    await page.screenshot({path:'.tmp-iqa-integration/taskbar-rebuilt-mobile.png'});
    await page.getByRole('button',{name:'Close search results'}).click();
    assert.equal(await page.locator('#tb-search-dropdown').isVisible(),false);
    await page.evaluate(()=>{window.UnionSuiteTaskbar.destroy();document.querySelector('#__ClientContext').value='{}';window.UnionSuiteTaskbar.initialise();});
    assert.equal(await page.locator('#injected-taskbar').count(),0,'Missing authentication context does not replace native search');
    // Inspect the generated offline guide's actual interactive taskbar frame.
    await page.setViewportSize({width:1280,height:900});
    await page.setContent(fs.readFileSync(guidePath('Usage-Guide.html'),'utf8'));
    await page.locator('#taskbar-colours-demo').evaluate(frame => frame.scrollIntoView());
    const demo = page.frameLocator('#taskbar-colours-demo');
    await demo.locator('#us-taskbar-search').fill('Morgan');
    await demo.locator('.tb-dd-name').filter({hasText:'Morgan Engineering'}).waitFor();
    await page.locator('#taskbar-colours-demo').evaluate(frame => frame.scrollIntoView());
    const preview = await browser.newPage({viewport:{width:1100,height:650}});
    await preview.route('**/*', route => route.abort());
    await preview.setContent(require('../Theme/UnionSuite-Guides/usage/build/taskbar-preview.cjs').frameDocument());
    await preview.locator('#us-taskbar-search').fill('Morgan');
    await preview.locator('.tb-dd-name').filter({hasText:'Morgan Engineering'}).waitFor();
    await preview.screenshot({path:'.tmp-iqa-integration/taskbar-guide.png'});
    console.log('Passed: mounting, auth guard, duplicate includes, search races, dismiss cancellation, keyboard, errors, token header, remount, teardown and mobile.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});

