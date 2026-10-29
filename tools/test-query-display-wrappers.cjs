// Regression: iMIS emits a separate CSS-class wrapper, not a class on the container.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const {chromium} = require('../.tmp-iqa-integration/node_modules/playwright');
const read = file => fs.readFileSync(file, 'utf8');
const css = ['Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css', 'Theme/UnionSuite/99-Orion.css', 'Theme/UnionSuite/zUnionSuite.css'].map(read).join('\n').replace(/@import\s+[^;]+;/g, '');
const script = read('Theme/UnionSuite/zUnionSuite.js').split('/* US-BANNER-BEHAVIOUR:START */')[0];
const panel = `<div class="panel"><div class="panel-heading Distinguish"><h2 class="panel-title">Staff Bulletin</h2></div><div class="panel-body-container"><div class="panel-body"><span class="template-header">Header</span><div class="QueryTemplateSet simplePaginateList"><section class="mb-3"><div class="card QueryTemplateItem"><div class="card-body"><div class="BulletinCard"><h3>Updated Membership Fees</h3><em>Peter Williams - 12/05/2025</em><div class="us-list__body"><p>The fee schedule is available.</p><a href="#fees">Latest Membership Fees</a></div></div></div></div></section></div><span class="template-footer">Footer</span></div></div></div>`;
(async () => {
  const browser = await chromium.launch({channel:'msedge', headless:true});
  try {
    const page = await browser.newPage();
    await page.route('**/*', route => route.abort());
    await page.setContent(`<div class="ContentItemContainer" id="direct">${panel}</div><div class="ContentItemContainer" id="outer"><div class="us-staff-bulletin us-action-test-add" id="wrapped">${panel}</div></div><div class="ContentItemContainer"><div class="" id="empty">${panel}</div></div><div class="ContentItemContainer"><div class="us-list--no-shell" id="no-shell">${panel}</div></div><div class="ContentItemContainer"><div class="us-list--rows us-list--compact" id="rows">${panel}</div></div><div class="ContentItemContainer"><div class="us-report-no-styling" id="opt-out">${panel}</div></div><div class="ContentItemContainer" id="surrounding"><div class="panel"><div class="panel-body-container"><div class="panel-body"><div class="ContentItemContainer"><div class="us-staff-bulletin" id="nested">${panel}</div></div></div></div></div></div><section id="unrelated">${panel}</section>`);
    await page.locator('body').evaluate((body,markup)=>body.insertAdjacentHTML('beforeend', markup), '<div class="ContentItemContainer"><div class="us-banner" id="banner">'+panel.replace('class="BulletinCard"','class="us-banner__surface"')+'</div></div>');
    await page.evaluate(()=>{const base=document.createElement('base');base.href='https://example.test/';document.head.append(base);});
    await page.addStyleTag({content:css});
    // Shell and inset must work before any JS adds runtime markers.
    for (const id of ['direct','wrapped','empty','no-shell','rows','nested']) {
      const style = await page.locator('#'+id+' > .panel').evaluate(node => {
        const body=node.querySelector('.panel-body'), header=node.querySelector('.panel-heading');
        return {border:getComputedStyle(node).borderTopWidth, radius:getComputedStyle(node).borderTopLeftRadius, inset:getComputedStyle(body).paddingLeft, title:getComputedStyle(header.querySelector('h2')).fontSize, headerGap:getComputedStyle(body.querySelector('.template-header')).marginBottom, footerGap:getComputedStyle(body.querySelector('.template-footer')).marginTop};
      });
      assert.deepEqual(style, {border:'1px', radius:'12px', inset:'18px', title:'15px', headerGap:'12px', footerGap:'12px'}, id+' shell');
    }
    assert.equal(await page.locator('#wrapped .card').evaluate(n=>getComputedStyle(n).borderLeftWidth), '3px');
    assert.equal(await page.locator('#no-shell .card').evaluate(n=>getComputedStyle(n).borderLeftWidth), '0px');
    assert.equal(await page.locator('#rows .card-body').evaluate(n=>getComputedStyle(n).paddingTop), '12px');
    assert.equal(await page.locator('#rows .QueryTemplateSet').evaluate(n=>getComputedStyle(n).gap), '0px');
    for (const id of ['opt-out','surrounding','unrelated']) {
      assert.notEqual(await page.locator('#'+id+' > .panel').evaluate(n=>getComputedStyle(n).borderTopLeftRadius), '12px', id+' remains native');
    }
    assert.equal(await page.locator('#banner > .panel').evaluate(n=>getComputedStyle(n).borderTopWidth), '0px');
    assert.equal(await page.locator('#banner .panel-body').evaluate(n=>getComputedStyle(n).paddingLeft), '0px');
    await page.addScriptTag({content:script});
    await page.addScriptTag({content:read('Theme/UnionSuite/Scripts/ActionDefinitions.js')});
    await page.evaluate(()=>{
      window.wrapperActionCount=0;
      UnionSuiteActions.define('test.add',{className:'us-action-test-add',owner:'test',source:'wrapper',presentation:{label:'Add bulletin'},context:{},action:{type:'function',run:()=>wrapperActionCount++}});
    });
    await page.waitForFunction(()=>document.querySelector('#wrapped [data-us-command-key="test.add"]'));
    for(const id of ['direct','wrapped','empty','no-shell','rows','nested'])assert.equal(await page.locator('#'+id).getAttribute('data-us-query-display'),'');
    assert.equal(await page.locator('#outer[data-us-query-display],#opt-out[data-us-query-display],#surrounding[data-us-query-display],#unrelated[data-us-query-display],#banner[data-us-query-display]').count(),0);
    const add=page.locator('#wrapped [data-us-command-key="test.add"]');
    await add.click();assert.equal(await page.evaluate(()=>wrapperActionCount),1);
    await page.evaluate(()=>{const owner=document.querySelector('#wrapped');owner.innerHTML=owner.innerHTML;owner.querySelector('[data-us-panel-actions-slot]').remove();UnionSuiteIqaFilters.refresh();});
    await add.waitFor();await add.click();assert.equal(await page.evaluate(()=>wrapperActionCount),2);
    assert.equal(await page.locator('#wrapped [data-us-panel-actions-slot]').count(),1);
    await page.evaluate(()=>document.querySelector('#wrapped').classList.add('us-action-home-manage-bulletin'));
    const manage=page.locator('#wrapped a[data-us-command-key="home.manage-bulletin"]');await manage.waitFor();
    assert.equal(await manage.innerText(),'Manage bulletin');
    assert.equal(await manage.getAttribute('href'),'https://example.test/_i4u_/Core/Staff-Site-Layouts/Home-Dashboard/Staff-Bulletin.aspx');
    assert.equal(await manage.getAttribute('target'),'_blank');assert.equal(await manage.getAttribute('rel'),'noopener');
    assert.match(await manage.getAttribute('aria-label'),/opens in a new tab/);
    await page.evaluate(()=>{window.manageDef={className:'us-action-home-manage-bulletin',owner:'test',source:'wrapper',presentation:{label:'Manage bulletin'},context:{},action:{type:'navigate',href:'/disabled',target:'_blank',disabled:true}};UnionSuiteActions.configure('home.manage-bulletin',manageDef);});
    await page.waitForFunction(()=>document.querySelector('#wrapped [data-us-command-key="home.manage-bulletin"]').getAttribute('aria-disabled')==='true');
    assert.equal(await manage.getAttribute('href'),null);await manage.dispatchEvent('click');assert.equal(await page.evaluate(()=>wrapperActionCount),2);
    await page.evaluate(()=>UnionSuiteActions.configure('home.manage-bulletin',{...manageDef,action:{type:'navigate',href:'/same-tab'}}));
    await page.waitForFunction(()=>document.querySelector('#wrapped [data-us-command-key="home.manage-bulletin"]').getAttribute('href')==='https://example.test/same-tab');
    assert.equal(await manage.getAttribute('target'),null);assert.equal(await manage.getAttribute('rel'),null);
    await page.evaluate(()=>{document.querySelector('#wrapped').classList.add('us-report-no-styling');UnionSuiteIqaFilters.refresh();});
    await page.waitForFunction(()=>!document.querySelector('#wrapped').hasAttribute('data-us-query-display'));
    assert.equal(await page.locator('#wrapped [data-us-panel-actions-slot]').count(),0);
    console.log('PASS direct/wrapped/empty/nested shells, inset/variants/opt-out, own header actions after replacement, native navigation and disabled/target cleanup.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
