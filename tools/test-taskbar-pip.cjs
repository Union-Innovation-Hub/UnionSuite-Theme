// Browser regression checks for daily greeting, storage and the real taskbar lifecycle.
const fs = require('node:fs'), assert = require('node:assert/strict');
const {chromium} = require('../.tmp-iqa-integration/node_modules/playwright');
const script = fs.readFileSync('Theme/UnionSuite/Scripts/UnionSuiteTaskbar.js','utf8');
const css = ['Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css','Theme/UnionSuite/99-Orion.css','Theme/UnionSuite/zUnionSuite.css','Theme/UnionSuite/zzDarkMode.css'].map(file=>fs.readFileSync(file,'utf8')).join('\n').replace(/@import\s+[^;]+;/g,'').replace(/@font-face\s*\{[^}]*\}/g,'');
const key = 'union-suite:pip-greeting:100';
const fixture = `<!doctype html><html><head><style>${css}\nbody{margin:24px}#hd{display:block;position:relative;padding-bottom:18px;border-bottom:1px solid #ccc}</style></head><body><header id="hd"><div class="searchfieldplus-dropdown"></div></header><input type="hidden" id="__ClientContext"><button id="outside">Page action</button><script>
document.getElementById('__ClientContext').value=JSON.stringify(window.testContext || {loggedInPartyId:'100',selectedPartyId:'900',isAnonymous:false});
window.fetch=()=>{throw Error('Biscuit must not make API calls');};
</script><script>${script}</script></body></html>`;
// The live iMIS header: the brand block, the utility row and the bookmarks row below it.
const nativeHeader = `<header id="hd"><div id="masterTopBarAuxiliary" class="navbar-header">` +
  `<div class="navbar-left"><a class="logo" href="#">iMIS</a></div>` +
  `<div class="navbar-right"><div class="searchfieldplus-dropdown"></div></div></div>` +
  `<div class="us-bookmarks-bar" id="bookmarks-row">Bookmarks</div></header>`;
const nativeLayout = `#hd{display:block;position:relative;border-bottom:1px solid #ccc}` +
  `#masterTopBarAuxiliary{display:flex;align-items:center;padding:8px}` +
  `.navbar-left{display:flex;align-items:center}` +
  // A wide client logo is what pushes the utility controls onto a second line.
  `.navbar-left a.logo{display:block;width:420px;height:38px;background:#eee}` +
  `.navbar-right{margin-left:auto;display:flex;align-items:center}` +
  `#bookmarks-row{padding:9px 22px;border-top:1px solid #ccc}#bookmarks-row[hidden]{display:none}`;
const nativeFixture = fixture
  .replace('<header id="hd"><div class="searchfieldplus-dropdown"></div></header>', nativeHeader)
  .replace('#hd{display:block;position:relative;padding-bottom:18px;border-bottom:1px solid #ccc}', nativeLayout);
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const errors=[];
  try {
    // Biscuit shows from 1200px (US-TASKBAR-PIP), so the default page is wider than that.
    const context=await browser.newContext({viewport:{width:1280,height:650},timezoneId:'Australia/Sydney'});
    const bodyFor=url=>url.startsWith('https://pip.example/native') ? nativeFixture : fixture;
    await context.route('**/*',route=>route.request().url().startsWith('https://pip.example/') ? route.fulfill({contentType:'text/html',body:bodyFor(route.request().url())}) : route.abort());
    async function makePage(config={}) {
      const page=await context.newPage();
      page.on('pageerror',error=>errors.push(error.message));
      await page.addInitScript(config=>{
        if(config.context)window.testContext=config.context;
        if(config.disabled)window.UnionSuiteTaskbarConfig={pipGreeting:false};
        if(config.noLocks)Object.defineProperty(navigator,'locks',{value:undefined});
        if(config.blocked)Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}});
      },config);
      await page.clock.install({time:new Date('2026-09-14T23:00:00Z')});
      await page.clock.pauseAt(new Date('2026-09-14T23:00:00Z'));
      await page.goto(config.url || 'https://pip.example/home');
      await new Promise(resolve=>setTimeout(resolve,50));
      return page;
    }
    async function advance(page,ms) {
      // Flush lock/observer callbacks between clock steps, not just timeouts.
      for(let i=0;i<ms;i+=250){await page.clock.runFor(Math.min(250,ms-i));await new Promise(resolve=>setTimeout(resolve,5));}
    }
    const phase=page=>page.locator('.us-taskbar__pip').getAttribute('data-phase');
    const record=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'null'),key);
    const page=await makePage();
    await page.evaluate(()=>localStorage.clear());
    const before=await page.locator('.tb-search-wrap').boundingBox();
    await advance(page,5200);
    assert.equal(await phase(page),'visit');
    assert(await page.locator('.us-taskbar__pip').evaluate(el=>el.classList.contains('is-waving')),'arrival waves automatically');
    assert.equal((await record(page)).day,'2026-09-15','browser-local date, not UTC date');
    assert(!(await record(page)).pending);
    assert.equal(await page.locator('.us-taskbar__pip').evaluate(el=>el.previousElementSibling),null);
    assert.equal(await page.locator('.us-taskbar__pip').evaluate(el=>el.nextElementSibling.className),'us-taskbar__quick-links');
    assert.equal(await page.locator('.us-taskbar__pip-divider').count(),0);
    const aligned=()=>page.evaluate(()=>{
      const header=document.querySelector('#hd'),button=document.querySelector('.us-taskbar__pip-button');
      return Math.abs(button.getBoundingClientRect().bottom-(header.getBoundingClientRect().bottom-parseFloat(getComputedStyle(header).borderBottomWidth)))<.6;
    });
    assert(await aligned(),'Biscuit rests on the header bottom, below the control row');
    const resizeStyle=await page.addStyleTag({content:'#hd{padding-bottom:40px;border-bottom-width:3px}'});
    await new Promise(resolve=>setTimeout(resolve,80)); // Deliver the browser's ResizeObserver before advancing mocked RAF.
    await advance(page,250);assert(await aligned(),'perch follows a resized header');
    await resizeStyle.evaluate(el=>el.remove());await new Promise(resolve=>setTimeout(resolve,80));await advance(page,250);
    assert(await aligned());
    assert.deepEqual(await page.locator('.tb-search-wrap').boundingBox(),before,'greeting cannot move search');
    await page.mouse.move(1050,300);
    assert(Number.parseFloat(await page.locator('.us-taskbar__pip').evaluate(el=>el.style.getPropertyValue('--pip-turn'))) > 0);
    await page.locator('.us-taskbar__pip-button').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.us-taskbar__pip-button').getAttribute('aria-label'),'Make Biscuit hop','first activation waves even after the automatic greeting');
    assert(await page.locator('.us-taskbar__pip').evaluate(el=>el.classList.contains('is-waving') && !el.classList.contains('is-hopping')));
    await page.locator('#outside').click();
    await advance(page,10000);
    assert.equal(await phase(page),'visit','after the wave, Biscuit waits for the next click even without focus');
    await page.locator('.us-taskbar__pip-button').focus();
    await page.keyboard.press('Enter');
    assert.equal(await phase(page),'visit','second activation stays to hop');
    assert.equal(await page.locator('.us-taskbar__pip-button').getAttribute('aria-label'),'Say goodbye to Biscuit');
    assert(await page.locator('.us-taskbar__pip').evaluate(el=>el.classList.contains('is-hopping')));
    await page.locator('#outside').click();
    await advance(page,10000);
    assert.equal(await phase(page),'visit','after the hop, Biscuit waits for the goodbye click even without focus');
    await page.locator('.us-taskbar__pip-button').focus();
    await page.keyboard.press('Enter');
    assert.equal(await phase(page),'goodbye','third activation dismisses even while focused');
    assert(await page.locator('.us-taskbar__pip-button').isDisabled());
    assert(await page.locator('.us-taskbar__quick-link').first().evaluate(el=>el===document.activeElement));
    await advance(page,2500);
    assert.equal(await phase(page),'goodbye','the startled jump finishes before dismissal');
    await advance(page,700);
    assert.equal(await phase(page),'away');
    assert.equal(await page.locator('.us-taskbar__pip-button').isVisible(),false);
    assert.deepEqual(await page.locator('.tb-search-wrap').boundingBox(),before,'reserved section stays the same size');
    await page.reload();await new Promise(resolve=>setTimeout(resolve,40));await advance(page,4000);
    assert.equal(await phase(page),'away','page navigation does not repeat');
    await page.evaluate(()=>document.getElementById('injected-taskbar').remove());
    await advance(page,4000);
    assert.equal(await page.locator('.us-taskbar__pip').count(),1);
    assert.equal(await phase(page),'away','partial replacement does not repeat');
    const second=await makePage();await advance(second,4000);
    assert.equal(await phase(second),'away','another tab does not repeat');
    console.log('PASS: daily greeting, local date, fixed section, gaze, keyboard focus, reload, replacement and second tab');

    await page.clock.setSystemTime(new Date('2026-09-15T23:00:00Z'));
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await advance(page,4000);
    assert.equal(await phase(page),'visit','new local day greets on return');
    assert.equal(await page.locator('.us-taskbar__pip-button').getAttribute('aria-label'),'Biscuit says hello. Make Biscuit wave','new visit resets the first-click action');
    await page.locator('.us-taskbar__pip-button').click();
    assert.equal(await phase(page),'visit');
    assert.equal(await page.locator('.us-taskbar__pip-button').getAttribute('aria-label'),'Make Biscuit hop');
    await page.locator('.us-taskbar__pip-button').click();
    assert.equal(await page.locator('.us-taskbar__pip-button').getAttribute('aria-label'),'Say goodbye to Biscuit');
    await page.locator('.us-taskbar__pip-button').click();
    assert.equal(await phase(page),'goodbye','pointer third click interrupts the hop');
    assert.equal((await record(page)).day,'2026-09-16');
    await page.evaluate(()=>window.UnionSuiteTaskbar.destroy());
    await advance(page,10000);
    assert.equal(await page.locator('.us-taskbar__pip').count(),0);
    await page.evaluate(()=>window.UnionSuiteTaskbar.initialise());
    await advance(page,4000);
    assert.equal(await phase(page),'away');
    const other=await makePage({context:{loggedInPartyId:'200',selectedPartyId:'100',isAnonymous:false}});
    await advance(other,4000);
    assert.equal(await phase(other),'visit','key uses signed-in user, not selected/OBO party');
    console.log('PASS: next day, teardown/reinitialise and distinct signed-in users');

    const native=await makePage({url:'https://pip.example/native',context:{loggedInPartyId:'900',isAnonymous:false}});
    await advance(native,4000);
    assert.equal(await phase(native),'visit');
    assert.equal(await native.locator('.us-taskbar__pip').evaluate(el=>el.previousElementSibling.className),'navbar-left','Biscuit stands beside the logo block');
    assert.equal(await native.locator('.us-taskbar__pip').evaluate(el=>el.parentElement.id),'masterTopBarAuxiliary','he joins the top row, not the taskbar');
    assert.equal(await native.locator('#injected-taskbar').evaluate(el=>el.firstElementChild.classList.contains('us-taskbar__quick-links')),true,'the taskbar keeps its own first control');
    const onTopRow=()=>native.evaluate(()=>{
      const row=document.getElementById('masterTopBarAuxiliary'),button=document.querySelector('.us-taskbar__pip-button');
      return Math.abs(button.getBoundingClientRect().bottom-row.getBoundingClientRect().bottom)<.6;
    });
    const onHeaderEdge=()=>native.evaluate(()=>{
      const header=document.getElementById('hd'),button=document.querySelector('.us-taskbar__pip-button');
      return Math.abs(button.getBoundingClientRect().bottom-(header.getBoundingClientRect().bottom-parseFloat(getComputedStyle(header).borderBottomWidth)))<.6;
    });
    assert(await onTopRow(),'Biscuit rests on the top row edge, above the bookmarks bar');
    assert.equal(await onHeaderEdge(),false,'the bookmarks bar keeps its own space');
    await native.evaluate(()=>{document.getElementById('bookmarks-row').hidden=true;});
    await new Promise(resolve=>setTimeout(resolve,80)); // Deliver the browser's ResizeObserver before advancing mocked RAF.
    await advance(native,250);
    assert(await onHeaderEdge(),'without a row below, he rests on the header edge as before');
    // The narrowest width that keeps Biscuit. The wide logo now narrows the
    // search field (US-TASKBAR-LAYOUT) instead of wrapping the controls below him.
    await native.setViewportSize({width:1200,height:650});
    await new Promise(resolve=>setTimeout(resolve,80));
    await advance(native,250);
    assert(await native.evaluate(()=>{
      const row=document.getElementById('masterTopBarAuxiliary').getBoundingClientRect();
      const search=document.querySelector('.tb-search-input').getBoundingClientRect();
      return search.width>0 && search.top>=row.top && search.bottom<=row.bottom+.6;
    }),'a wide logo keeps the controls on his row');
    assert(await onHeaderEdge(),'he still rests on the header edge');
    await native.close();
    console.log('PASS: placement beside the logo and perch above the bookmarks bar');

    const phone=await makePage({context:{loggedInPartyId:'950',isAnonymous:false}});
    await phone.setViewportSize({width:390,height:650});
    await advance(phone,6000);
    assert.equal(await phase(phone),'away','phone widths hide Biscuit instead of greeting');
    assert.equal(await phone.locator('.us-taskbar__pip').isVisible(),false);
    assert.equal(await phone.evaluate(()=>localStorage.getItem('union-suite:pip-greeting:950')),null,'a hidden Biscuit does not consume the daily greeting');
    // Phones search from Orion's bottom bar (US-TASKBAR-LAYOUT, 767px and below).
    assert.equal(await phone.locator('#us-taskbar-search').isVisible(),false,'the phone header has no search field');
    await phone.evaluate(()=>{
      const toggle=document.createElement('button');
      toggle.type='button';toggle.id='MobileSearchToggle';toggle.dataset.toggle='dropdown';toggle.textContent='Search';
      document.body.append(toggle);
    });
    await phone.locator('#MobileSearchToggle').click();
    assert(await phone.locator('#tb-search-dropdown').isVisible(),'the bottom bar search button opens the taskbar search');
    assert.equal(await phone.locator('#MobileSearchToggle').getAttribute('aria-expanded'),'true');
    await phone.locator('.tb-dd-close').click();
    assert.equal(await phone.locator('#tb-search-dropdown').isVisible(),false);
    assert.equal(await phone.evaluate(()=>document.activeElement.id),'MobileSearchToggle','closing returns focus to the button');
    await phone.setViewportSize({width:1199,height:650});
    await advance(phone,6000);
    assert.equal(await phase(phone),'away','below 1200px the header row needs his space');
    assert.equal(await phone.evaluate(()=>localStorage.getItem('union-suite:pip-greeting:950')),null);
    await phone.setViewportSize({width:1280,height:650});
    await advance(phone,6000);
    assert.equal(await phase(phone),'visit','a wider window still gets that day’s greeting');
    await phone.close();
    console.log('PASS: hidden below 1200px, with the daily greeting kept for a wider window');

    const held=await makePage({context:{loggedInPartyId:'300',isAnonymous:false}});
    await held.locator('#us-taskbar-search').focus();await advance(held,5000);
    assert.equal(await phase(held),'away','typing/search focus defers greeting');
    assert.equal(await held.evaluate(()=>localStorage.getItem('union-suite:pip-greeting:300')),null);
    await held.keyboard.press('Escape');await held.locator('#outside').click();await advance(held,4500);
    assert.equal(await phase(held),'visit');
    await held.emulateMedia({reducedMotion:'reduce'});await new Promise(resolve=>setTimeout(resolve,60));
    await advance(held,100);
    assert.equal(await held.locator('.us-taskbar__pip').evaluate(el=>el.getAnimations({subtree:true}).length),0);
    assert.equal(await held.locator('.us-taskbar__pip').evaluate(el=>el.style.getPropertyValue('--pip-turn')),'0deg');
    // Without visible management shortcuts — the bookmarks strip replaces them
    // when installed — dismissal falls back to Full Search.
    await held.addStyleTag({content:'#injected-taskbar .us-taskbar__quick-links{display:none}'});
    await held.locator('.us-taskbar__pip-button').focus();await held.keyboard.press('Space');await advance(held,500);
    assert(await held.locator('.us-taskbar__pip').evaluate(el=>el.classList.contains('is-waving')));
    assert.equal(await held.locator('.us-taskbar__pip').evaluate(el=>el.getAnimations({subtree:true}).length),0);
    await held.keyboard.press('Space');
    assert(await held.locator('.us-taskbar__pip').evaluate(el=>el.classList.contains('is-hopping')));
    assert.equal(await held.locator('.us-taskbar__pip').evaluate(el=>el.getAnimations({subtree:true}).length),0);
    assert(await held.evaluate(()=>window.UnionSuiteTaskbar.playPipIdle('scratch')));
    assert.equal(await held.locator('.us-taskbar__pip').evaluate(el=>el.getAnimations({subtree:true}).length),0,'manual scratch preview is static with reduced motion');
    assert.equal(await held.locator('.us-taskbar__pip-button').getAttribute('aria-label'),'Say goodbye to Biscuit','idle preview preserves click count');
    await held.keyboard.press('Space');
    assert.equal(await phase(held),'away','reduced-motion third activation hides instantly');
    assert(await held.locator('.us-taskbar__full-search').evaluate(el=>el===document.activeElement),'without shortcuts, dismissal restores focus to Full Search');
    console.log('PASS: activity deferral, keyboard wave/hop/goodbye, static reduced motion and Full Search focus fallback');

    const rapid=await makePage({context:{loggedInPartyId:'700',isAnonymous:false}});
    await advance(rapid,3150);
    assert.equal(await phase(rapid),'visit');
    await rapid.locator('.us-taskbar__pip-button').dblclick();
    assert(await rapid.locator('.us-taskbar__pip').evaluate(el=>el.classList.contains('is-hopping') && !el.classList.contains('is-waving')),'rapid clicks advance to hop');
    await rapid.locator('.us-taskbar__pip-button').click();
    assert.equal(await phase(rapid),'goodbye','rapid third click dismisses before the automatic wave');
    await rapid.emulateMedia({reducedMotion:'reduce'});await new Promise(resolve=>setTimeout(resolve,60));
    assert.equal(await phase(rapid),'away','reduced-motion preference finishes an active goodbye');
    await advance(rapid,8000);
    assert.equal(await phase(rapid),'away','pending greeting/idle callbacks cannot bring Biscuit back');
    assert.equal(await rapid.locator('.us-taskbar__pip').evaluate(el=>el.classList.contains('is-waving')),false);
    await rapid.close();
    console.log('PASS: pointer sequence, interrupted reactions and rapid dismissal without reappearance');

    const unattended=await makePage({context:{loggedInPartyId:'800',isAnonymous:false}});
    await unattended.evaluate(()=>{
      const pip=document.querySelector('.us-taskbar__pip');
      new MutationObserver(()=>{if(pip.dataset.phase==='peek' && !window.visitStarted)window.visitStarted=Date.now();}).observe(pip,{attributes:true,attributeFilter:['data-phase']});
    });
    await advance(unattended,5200);assert.equal(await phase(unattended),'visit');
    async function atVisitTime(ms) {
      const delta=await unattended.evaluate(ms=>window.visitStarted+ms-Date.now(),ms);
      assert(delta>=0);await unattended.clock.runFor(delta);
    }
    await unattended.evaluate(()=>{Math.random=()=>.1;});
    await atVisitTime(14999);
    assert(!(await unattended.locator('.us-taskbar__pip').evaluate(el=>el.matches('.is-scratching,.is-curious'))),'no early idle');
    await atVisitTime(15000);
    assert(await unattended.locator('.us-taskbar__pip').evaluate(el=>el.classList.contains('is-scratching')),'first 15-second beat can scratch');
    await unattended.evaluate(()=>{Math.random=()=>.9;});
    await atVisitTime(30000);
    assert(await unattended.locator('.us-taskbar__pip').evaluate(el=>el.classList.contains('is-curious')),'next 15-second beat can tilt');
    await unattended.mouse.move(950,350);
    assert.equal(await unattended.locator('.us-taskbar__pip').evaluate(el=>el.style.getPropertyValue('--pip-turn')),'0deg','idle tilt holds gaze');
    assert.equal(await unattended.locator('.us-taskbar__pip-button').getAttribute('aria-label'),'Biscuit says hello. Make Biscuit wave','automatic idles preserve click sequence');
    assert.equal(await unattended.evaluate(()=>window.UnionSuiteTaskbar.playPipIdle('unknown')),false);
    await unattended.locator('.us-taskbar__pip-button').click();
    assert(await unattended.locator('.us-taskbar__pip').evaluate(el=>el.classList.contains('is-waving') && !el.classList.contains('is-curious')),'first click interrupts the idle with a wave');
    await unattended.locator('.us-taskbar__pip-button').click();
    assert.equal(await unattended.locator('.us-taskbar__pip-button').getAttribute('aria-label'),'Say goodbye to Biscuit');
    assert(await unattended.evaluate(()=>window.UnionSuiteTaskbar.playPipIdle('scratch')));
    const untilDeadline=await unattended.evaluate(()=>window.visitStarted+299999-Date.now());
    await unattended.clock.fastForward(untilDeadline);
    assert.equal(await phase(unattended),'visit','still present just before five minutes, after clicks and previews');
    await unattended.clock.runFor(1);
    assert.equal(await phase(unattended),'leaving','five minutes uses the normal exit, even with button focus');
    assert(await unattended.locator('.us-taskbar__quick-link').first().evaluate(el=>el===document.activeElement));
    await unattended.clock.runFor(700);
    assert.equal(await phase(unattended),'away');
    assert.equal(await unattended.evaluate(()=>window.UnionSuiteTaskbar.playPipIdle('scratch')),false,'idle API cannot revive a dismissed visit');
    await unattended.reload();await advance(unattended,4000);
    assert.equal(await phase(unattended),'away','timed exit preserves the daily limit');
    await unattended.close();
    console.log('PASS: 15-second scratch/tilt, manual priority, fixed five-minute deadline and normal exit');

    for(const config of [{blocked:true},{disabled:true},{context:{loggedInPartyId:'1',isAnonymous:true}}]){
      const quiet=await makePage(config);await advance(quiet,4500);
      if(config.blocked){assert.equal(await phase(quiet),'away');assert.equal(await quiet.locator('#us-taskbar-search').isVisible(),true);}
      else assert.equal(await quiet.locator('.us-taskbar__pip').count(),0);
      await quiet.close();
    }
    const hidden=await makePage({context:{loggedInPartyId:'400',isAnonymous:false}});
    await hidden.evaluate(()=>Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'}));
    await advance(hidden,4500);
    assert.equal(await phase(hidden),'away');
    assert.equal(await hidden.evaluate(()=>localStorage.getItem('union-suite:pip-greeting:400')),null);
    await hidden.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));});
    await advance(hidden,4500);assert.equal(await phase(hidden),'visit');
    await hidden.locator('.us-taskbar__pip-button').click();
    await hidden.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
    await advance(hidden,10000);assert.equal(await phase(hidden),'visit');
    await hidden.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal(await hidden.locator('.us-taskbar__pip-button').getAttribute('aria-label'),'Make Biscuit hop','returning to the tab preserves the next click');
    await hidden.locator('.us-taskbar__pip-button').click();
    assert.equal(await hidden.locator('.us-taskbar__pip-button').getAttribute('aria-label'),'Say goodbye to Biscuit');
    await hidden.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
    await hidden.clock.setSystemTime(new Date(await hidden.evaluate(()=>Date.now()+300001)));
    await hidden.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal(await phase(hidden),'leaving','resuming a frozen tab honours the five-minute wall-clock deadline');
    console.log('PASS: blocked storage, disabled option, anonymous users, hidden-page deferral and click sequence on return');

    // Real timers exercise actual concurrent tabs, including the no-Web-Locks fallback.
    for(const noLocks of [false,true]) {
      const partyId=noLocks?'600':'500';
      const raceContext=await browser.newContext({viewport:{width:1280,height:650}});
      await raceContext.route('**/*',route=>route.request().url().startsWith('https://pip.example/') ? route.fulfill({contentType:'text/html',body:fixture}) : route.abort());
      const twins=await Promise.all([1,2].map(async()=>{
        const p=await raceContext.newPage();p.on('pageerror',error=>errors.push(error.message));
        await p.addInitScript(({partyId,noLocks})=>{window.testContext={loggedInPartyId:partyId,isAnonymous:false};if(noLocks)Object.defineProperty(navigator,'locks',{value:undefined});},{partyId,noLocks});
        return p;
      }));
      await Promise.all(twins.map(p=>p.goto('https://pip.example/home')));
      await new Promise(resolve=>setTimeout(resolve,4100));
      const phases=await Promise.all(twins.map(phase));
      assert.equal(phases.filter(p=>p==='visit').length,1,'exactly one simultaneous tab greets '+JSON.stringify({noLocks,phases}));
      await Promise.all(twins.map(p=>p.close()));
      await raceContext.close();
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: concurrent tabs with and without Web Locks; no script errors');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
