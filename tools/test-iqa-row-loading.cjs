// Native IQA hierarchical row expand/collapse (US-IQA-BUSY 3.3): the spinner
// replaces the clicked arrow, and the replaced grid stays in place while the
// detail row slides open or closed. The guide fixture simulates the
// PageRequestManager lifecycle and a partial update that replaces the grid.
const assert=require('node:assert/strict');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
const html=require('../Theme/UnionSuite-Guides/usage/build/iqa-expand-example.cjs').documentHtml();
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:650}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));await page.route('**/*',route=>route.abort());
  const reset=async()=>{
   await page.goto('about:blank');await page.setContent(html);
   await page.locator('[data-us-iqa-column-table]').waitFor();
   await page.evaluate(()=>{
    IqaExpandDemo.delay=60000;
    window.layout=()=>{
     const row=document.getElementById('visit-one-row'),next=row?.nextElementSibling;
     const detail=next&&!next.matches('.rgRow,.rgAltRow')?next:null;
     return {
      heads:Array.from(document.querySelectorAll('#expand-example-table > thead th')).map(th=>Math.round(th.getBoundingClientRect().width)),
      rowTop:Math.round(row.getBoundingClientRect().top),
      detail:detail?detail.getBoundingClientRect().height:null,
      ghost:Boolean(detail?.hasAttribute('data-us-iqa-detail-ghost')),
      slides:document.querySelectorAll('.us-iqa-detail-slide').length,
      gridScroll:document.getElementById('expand-example-grid').scrollLeft,
      pageScroll:scrollY,
      spinner:Boolean(document.querySelector('.us-iqa-row-spinner:not([hidden])')),
      busyControl:document.querySelector('[data-us-iqa-row-busy]')?.className||null
     };
    };
    // Measures the first rendered frame after the grid is replaced (after
    // every rAF the update queued), then the detail height on each frame.
    window.watchUpdate=()=>{
     window.frames=[];
     window.firstFrame=new Promise(resolve=>{
      IqaExpandDemo.afterUpdate=()=>{
       IqaExpandDemo.afterUpdate=null;
       queueMicrotask(()=>queueMicrotask(()=>requestAnimationFrame(()=>{
        resolve(layout());
        const started=performance.now();
        const sample=()=>{frames.push(layout().detail);if(performance.now()-started<500)requestAnimationFrame(sample)};
        requestAnimationFrame(sample);
       })));
      };
     });
    };
   });
  };
  const control=id=>page.locator('#'+id+'-GECBtnExpandColumn');
  const click=(id='visit-one')=>control(id).click();
  const respond=(id='visit-one')=>page.evaluate(id=>IqaExpandDemo.respond(id+'-row'),id);
  const end=async()=>{
   await page.evaluate(()=>IqaExpandDemo.end());
   assert.equal(await page.locator('.us-iqa-row-spinner,.us-iqa-find-overlay,[data-us-iqa-progress-replaced],[aria-busy="true"],[data-us-iqa-row-busy]').count(),0);
  };
  // The spinner sits on the clicked control, sized to it, inside the expand column.
  const onControl=async(id='visit-one')=>{
   await page.waitForFunction(id=>{
    const overlay=document.querySelector('.us-iqa-row-spinner'),button=document.getElementById(id+'-GECBtnExpandColumn');
    if(!overlay||overlay.hidden||!button)return false;
    const s=overlay.querySelector('.section-loader-spinning-circles').getBoundingClientRect(),c=button.getBoundingClientRect(),cell=button.closest('td').getBoundingClientRect();
    const centred=Math.abs((s.left+s.right)/2-(c.left+c.right)/2)<1&&Math.abs((s.top+s.bottom)/2-(c.top+c.bottom)/2)<1;
    return centred&&s.width>=12&&s.width<=20&&s.left>=cell.left&&s.right<=cell.right&&s.top>=cell.top&&s.bottom<=cell.bottom;
   },id);
  };
  const settled=()=>page.waitForFunction(()=>!document.querySelector('.us-iqa-detail-slide,[data-us-iqa-detail-ghost],[data-us-iqa-detail-hold]'));

  // 1. Spinner placement, without a row veil.
  await reset();
  await page.evaluate(()=>{window.nativeControl=document.getElementById('visit-one-GECBtnExpandColumn');window.nativeClicks=0;nativeControl.addEventListener('click',()=>window.nativeClicks++);const second=document.createElement('div');second.id='other_UpdateProgress1';second.textContent='Other report loading';document.body.append(second)});
  await click();await onControl();
  assert.equal(await page.locator('.us-iqa-row-spinner').count(),1);
  assert.equal(await page.locator('.us-iqa-find-overlay').count(),0,'No row or results veil');
  await page.waitForFunction(()=>getComputedStyle(nativeControl).opacity==='0');
  assert.equal(await page.locator('#visit-one-row').getAttribute('aria-busy'),'true');
  assert.equal(await page.locator('tbody[aria-busy],#visit-two-row[aria-busy],#visit-three-row[aria-busy]').count(),0);
  assert.equal(await page.locator('#expand-example_UpdateProgress1').evaluate(el=>getComputedStyle(el).display),'none');
  assert.equal(await page.locator('#other_UpdateProgress1').getAttribute('data-us-iqa-progress-replaced'),null);
  assert.equal(await page.locator('.us-iqa-refresh-status').textContent(),'Loading row details');
  assert.equal(await page.evaluate(()=>nativeClicks===1&&nativeControl===document.getElementById('visit-one-GECBtnExpandColumn')&&!nativeControl.disabled),true);
  assert.equal(await page.locator('.us-iqa-column-resizer').count(),3);
  await page.screenshot({path:'.tmp-iqa-integration/iqa-row-loading.png'});
  await end();
  assert.equal(await page.evaluate(()=>getComputedStyle(nativeControl).opacity),'1','A failed or empty request restores the arrow');
  // A wide grid keeps the spinner on the arrow, not across the row.
  await page.setViewportSize({width:1800,height:650});await page.addStyleTag({content:'#expand-example-table{min-width:1700px!important}'});
  await click();await onControl();
  assert(await page.evaluate(()=>document.querySelector('.us-iqa-row-spinner').getBoundingClientRect().right<=document.querySelector('#visit-one-row td.rgExpandCol').getBoundingClientRect().right));
  await end();await page.setViewportSize({width:1100,height:650});

  // 2. Expand: the report stays in place and the detail row slides open.
  await reset();
  await page.addStyleTag({content:'body{padding-bottom:1500px!important}#expand-example-grid{overflow-x:auto!important;width:260px!important}'});
  // Let the column fitter adapt to the narrow grid before measuring.
  await page.waitForFunction(()=>parseFloat(document.getElementById('expand-example-table').style.width)<400);
  // Click first (Playwright scrolls the arrow into view), then scroll the
  // page and grid while the request runs, as a user reading across might.
  await click();await onControl();
  await page.evaluate(()=>{scrollTo(0,40);document.getElementById('expand-example-grid').scrollLeft=80});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const before=await page.evaluate(()=>layout());
  assert.equal(before.gridScroll,80);assert.equal(before.pageScroll,40);
  await page.evaluate(()=>watchUpdate());await respond();
  let first=await page.evaluate(()=>firstFrame);
  assert.deepEqual(first.heads,before.heads,'Column widths unchanged in the first frame');
  assert.equal(first.rowTop,before.rowTop,'Clicked row stays put');
  assert.equal(first.gridScroll,80,'Grid scroll kept across the replacement');
  assert.equal(first.pageScroll,40,'Page scroll kept');
  assert(first.detail!==null&&first.detail<=2,'Detail row starts closed, not painted open: '+first.detail);
  assert.equal(first.slides,2,'Both detail cells slide');
  await settled();
  let after=await page.evaluate(()=>layout()),frames=await page.evaluate(()=>frames);
  assert(after.detail>40,'Detail row ends open');
  assert(frames.some(h=>h>2&&h<after.detail-2),'Detail row passes through intermediate heights: '+frames.join(','));
  assert.deepEqual(after.heads,before.heads);assert.equal(after.gridScroll,80);
  assert.deepEqual(await page.locator('#visit-one-row + tr').evaluate(row=>[row.getAttribute('data-us-iqa-detail-sliding'),...Array.from(row.cells,td=>td.getAttribute('style'))]),[null,null,null],'Native cells untouched after the slide');
  assert.equal(await page.locator('#visit-one-detail').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'visit-one-GECBtnExpandColumn','Focus moves to the replacement control');
  assert.equal(await control('visit-one').getAttribute('class'),'rgCollapse');
  await page.screenshot({path:'.tmp-iqa-integration/iqa-row-expanded.png'});

  // 3. A second row opens with the first open; neither jumps.
  await click('visit-two');await onControl('visit-two');await page.evaluate(()=>watchUpdate());await respond('visit-two');
  first=await page.evaluate(()=>firstFrame);
  assert.deepEqual(first.heads,before.heads,'Open detail rows stay out of column fitting');
  assert(Math.abs(first.detail-after.detail)<1,'The already-open detail row is not hidden or resized');
  await settled();
  assert.equal(await page.locator('#visit-two-detail').isVisible(),true);

  // 4. Collapse: an inert copy of the old detail row slides closed.
  await click();await onControl();
  await page.evaluate(()=>{document.getElementById('expand-example-grid').scrollLeft=80});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.evaluate(()=>watchUpdate());await respond();
  first=await page.evaluate(()=>firstFrame);
  assert(first.ghost&&Math.abs(first.detail-after.detail)<2,'Closing starts from the open height');
  assert.deepEqual(first.heads,before.heads);assert.equal(first.gridScroll,80);
  const ghost=page.locator('[data-us-iqa-detail-ghost]');
  if(await ghost.count()){
   assert.equal(await ghost.evaluate(row=>row.inert&&row.getAttribute('aria-hidden')==='true'&&!row.querySelector('[id],[name]')),true,'The copy has no IDs or names and is inert');
  }
  await settled();
  frames=await page.evaluate(()=>frames);
  assert.equal((await page.evaluate(()=>layout())).detail,null,'Detail row gone after collapse');
  assert(frames.some(h=>h!==null&&h>2&&h<after.detail-2),'Detail row closes through intermediate heights: '+frames.join(','));
  assert.equal(await page.locator('#visit-one-detail').count(),0);

  // 5. ASP.NET loading response scripts: the update lands before endRequest.
  await reset();await page.evaluate(()=>IqaExpandDemo.scriptDelay=300);
  await click();await onControl();await page.evaluate(()=>watchUpdate());await respond();
  first=await page.evaluate(()=>firstFrame);
  assert(first.detail<=2&&first.spinner&&first.busyControl==='rgCollapse','Spinner moves to the replacement control until endRequest');
  await page.waitForFunction(()=>!document.querySelector('.us-iqa-row-spinner'));await settled();
  assert.equal(await page.locator('#visit-one-detail').isVisible(),true);
  await page.evaluate(()=>IqaExpandDemo.scriptDelay=0);

  // 6. Keyboard expand/collapse keep focus on the control.
  await reset();await page.evaluate(()=>IqaExpandDemo.delay=100);
  await control('visit-one').press('Enter');await page.locator('#visit-one-detail').waitFor({state:'visible'});await settled();
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'visit-one-GECBtnExpandColumn');
  await control('visit-one').press('Enter');await page.locator('#visit-one-detail').waitFor({state:'detached'});await settled();
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'visit-one-GECBtnExpandColumn');
  await page.evaluate(()=>IqaExpandDemo.delay=60000);

  // 7. Cancellation and unrelated grid requests never inherit a row indicator.
  await page.evaluate(()=>IqaExpandDemo.cancelled=true);await click();assert.equal(await page.locator('.us-iqa-row-spinner').count(),0);
  await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));
  await page.evaluate(()=>IqaExpandDemo.begin(document.getElementById('expand-example_ResultsGrid')));assert.equal(await page.locator('.us-iqa-row-spinner').count(),0);await end();
  await page.evaluate(()=>{IqaExpandDemo.cancelled=false;IqaExpandDemo.source=document.getElementById('expand-example_ResultsGrid')});await click();await onControl();await end();
  await page.evaluate(()=>{const grid=document.createElement('div');grid.dataset.gridid='other';grid.id='other-grid';document.body.append(grid);IqaExpandDemo.source=grid});await click();assert.equal(await page.locator('.us-iqa-row-spinner').count(),0);await end();

  // 8. Replaced rows are reconciled by ID; removed rows leave no stale visual.
  await page.evaluate(()=>{IqaExpandDemo.source=null;document.getElementById('visit-one-row').setAttribute('aria-busy','false')});await click();
  await page.evaluate(()=>{window.oldRow=document.getElementById('visit-one-row');const row=oldRow.cloneNode(true);row.removeAttribute('aria-busy');row.querySelector('input').removeAttribute('data-us-iqa-row-busy');oldRow.replaceWith(row)});
  await page.waitForFunction(()=>oldRow.getAttribute('aria-busy')==='false'&&document.getElementById('visit-one-row').getAttribute('aria-busy')==='true');await onControl();
  await page.evaluate(()=>document.getElementById('visit-one-row').remove());await page.locator('.us-iqa-row-spinner').waitFor({state:'hidden'});
  assert.equal(await page.locator('#expand-example_UpdateProgress1').evaluate(el=>getComputedStyle(el).display),'none');await end();

  // 9. Clipped inside scrolling containers; hidden when scrolled out.
  await reset();await click();
  await page.evaluate(()=>{const root=document.getElementById('expand-example_ResultsGrid');root.style.cssText='height:100px;overflow:auto';document.querySelector('#expand-example-table').style.width='1400px';root.scrollTop=80;root.scrollLeft=150});
  await page.waitForFunction(()=>{const o=document.querySelector('.us-iqa-row-spinner'),root=document.getElementById('expand-example_ResultsGrid');return o.hidden||(o.getBoundingClientRect().top>=root.getBoundingClientRect().top&&o.getBoundingClientRect().left>=root.getBoundingClientRect().left)});
  await page.evaluate(()=>{document.body.style.paddingTop='1000px'});await page.locator('.us-iqa-row-spinner').waitFor({state:'hidden'});
  assert.equal(await page.locator('#expand-example_UpdateProgress1').evaluate(el=>getComputedStyle(el).display),'none');await end();

  // 10. Failure and page navigation restore existing state.
  await reset();await page.evaluate(()=>document.getElementById('visit-one-row').setAttribute('aria-busy','false'));await click();
  await page.evaluate(()=>IqaExpandDemo.end(new Error('Simulated failed request')));
  assert.equal(await page.locator('#visit-one-row').getAttribute('aria-busy'),'false');assert.equal(await page.locator('.us-iqa-row-spinner,[data-us-iqa-row-busy]').count(),0);
  for(const type of ['pagehide','pageshow']){await click();await page.evaluate(type=>window.dispatchEvent(new Event(type)),type);assert.equal(await page.locator('.us-iqa-row-spinner,[data-us-iqa-progress-replaced],[data-us-iqa-row-busy]').count(),0);await end()}

  // 11. Opt-out keeps native loading and an instant native update.
  await reset();
  await page.evaluate(()=>document.querySelector('.us-report').classList.add('us-report-no-styling'));await click();
  assert.equal(await page.locator('.us-iqa-row-spinner').count(),0);
  assert.equal(await page.locator('#expand-example_UpdateProgress1').evaluate(el=>getComputedStyle(el).display),'block');
  assert.equal(await page.locator('#expand-example_UpdateProgress1').getAttribute('data-us-iqa-progress-replaced'),null);
  await page.evaluate(()=>watchUpdate());await respond();first=await page.evaluate(()=>firstFrame);
  assert(first.detail>40&&first.slides===0,'Opted-out reports update natively');
  await page.evaluate(()=>document.querySelector('.us-report').classList.remove('us-report-no-styling'));

  // 12. Reduced motion: a still spinner and an instant detail row.
  await reset();await page.emulateMedia({reducedMotion:'reduce'});await click();await onControl();
  assert.equal(await page.locator('.us-iqa-row-spinner').evaluate(el=>getComputedStyle(el).animationName),'none');
  assert.equal(await page.locator('.us-iqa-row-spinner .section-loader-spinning-circles').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.evaluate(()=>watchUpdate());await respond();first=await page.evaluate(()=>firstFrame);
  assert(first.detail>40&&first.slides===0,'Reduced motion opens at once: '+JSON.stringify(first));
  await click();await onControl();await page.evaluate(()=>watchUpdate());await respond();first=await page.evaluate(()=>firstFrame);
  assert.equal(first.detail,null,'Reduced motion closes at once');
  await page.setViewportSize({width:390,height:844});await click();await onControl();
  await page.waitForFunction(()=>document.querySelector('.us-iqa-row-spinner').getBoundingClientRect().right<=innerWidth);await end();
  assert.deepEqual(errors,[]);
  console.log('Passed: spinner on the clicked control (wide grid too), no row veil, pre-paint closed detail row, stable columns/row/page and grid scroll, slide open and closed, other open rows untouched, async endRequest, focus, keyboard, accepted-request routing, cancellation, replacement/removal, clipping, failure/navigation cleanup, opt-out and reduced motion.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
