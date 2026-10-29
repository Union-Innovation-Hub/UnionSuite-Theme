// Integration checks in a disposable headless Edge process, using native CDP.
const {guidePath}=require('../build/guide-output.cjs');
// No npm packages or browser profile from the user are required.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../../../..');
const edge=process.env.THEME_TEST_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'union-config-test-'));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const child=spawn(edge,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let browserLog='';child.stderr.on('data',data=>{browserLog=(browserLog+data).slice(-5000);});
child.on('error',error=>{console.error(error);process.exitCode=1;});
let socket;
async function main(){
  const active=path.join(profile,'DevToolsActivePort');
  for(let i=0;i<200&&!fs.existsSync(active);i++)await delay(100);
  if(!fs.existsSync(active))throw Error('Headless browser did not start.');
  const port=fs.readFileSync(active,'utf8').split('\n')[0];
  const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  socket=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let sequence=0;const pending=new Map(),errors=[],requests=[];
  socket.onmessage=({data})=>{const message=JSON.parse(data);if(message.id){const p=pending.get(message.id);pending.delete(message.id);message.error?p.reject(Error(message.error.message)):p.resolve(message.result);}else if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);else if(message.method==='Network.requestWillBeSent')requests.push(message.params.request.url);};
  socket.onclose=()=>{for(const p of pending.values())p.reject(Error('Browser connection closed. '+browserLog));pending.clear();};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;const timeout=setTimeout(()=>{pending.delete(id);reject(Error('Browser timed out: '+method+' '+browserLog));},30000);pending.set(id,{resolve:value=>{clearTimeout(timeout);resolve(value);},reject:error=>{clearTimeout(timeout);reject(error);}});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  const file=pathToFileURL(guidePath('Theme-Config.html')).href;
  await send('Page.navigate',{url:file});
  console.log('Opened config in headless browser.');
  for(let i=0;i<200;i++){if(await evaluate('!!document.getElementById("seed-primary-hex")'))break;await delay(100);}
  const result=await evaluate(`(async()=>{
    const results=[];const $=id=>document.getElementById(id);
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const assert=(condition,message)=>{if(!condition)throw Error(message);results.push(message);};
    const input=async(id,value)=>{$(id).value=value;$(id).dispatchEvent(new Event('input',{bubbles:true}));await wait(90);};
    const change=async(id,value)=>{$(id).value=value;$(id).dispatchEvent(new Event('change',{bubbles:true}));await wait(150);};
    const loaded=async id=>{for(let i=0;i<100;i++){const frame=$(id);if(frame.contentDocument?.body?.children.length&&frame.contentDocument.getElementById('us-config-overrides'))return frame.contentDocument;await wait(40);}throw Error('Frame did not load: '+id);};
    assert($('seed-primary-hex').value==='#006f94','Source seed displayed');
    assert(!document.querySelector('#advanced').open,'Advanced settings start collapsed');
    assert(document.querySelectorAll('[role=tabpanel]:not([hidden])').length===1,'One preview at a time');
    const originalOverview=await loaded('config-overview');
    originalOverview.getElementById('sample-note').click();await wait(200);
    assert($('config-overview').contentDocument===originalOverview&&originalOverview.querySelector('.us-banner')&&!originalOverview.getElementById('seed-grid'),'Overview sample link cannot load the config page inside itself');
    await input('seed-primary-hex','#7b2cbf');
    assert(!$('seed-primary-hex').hasAttribute('aria-invalid'),'Valid seed accepted');
    assert($('css-code').textContent.includes('--seed-primary: #7b2cbf;'),'Seed injected into CSS');
    await input('seed-primary-hex','bad-colour');
    assert($('seed-primary-hex').getAttribute('aria-invalid')==='true'&&$('css-code').textContent.includes('#7b2cbf'),'Invalid seed keeps last valid value');
    await input('seed-primary-hex','#7b2cbf');
    for(const [tab,frame] of [['overview','config-overview'],['report','report-demo'],['cco','tabs-demo'],['forms','config-forms'],['actions','action-menu-demo']]){
      $('tab-'+tab).click();const target=await loaded(frame);
      assert(target.defaultView.getComputedStyle(target.documentElement).getPropertyValue('--seed-primary').trim()==='#7b2cbf','Seed reaches '+tab+' including lazy frames');
    }
    await input('token-banner-bg','#123456');await input('token-banner-bg-end','#123456');
    const overview=await loaded('config-overview');
    assert(overview.defaultView.getComputedStyle(overview.querySelector('.us-banner__surface')).backgroundImage.includes('18, 52, 86'),'Banner scoped override changes rendered gradient');
    await input('token-iqa-header','#ddecfa');const report=await loaded('report-demo');
    assert(report.defaultView.getComputedStyle(report.querySelector('.panel-heading')).backgroundColor==='rgb(221, 236, 250)','IQA local alias overrides native header');
    await input('token-us-actions-surface','#f6ddff');const actions=await loaded('action-menu-demo');
    assert(actions.defaultView.getComputedStyle(actions.querySelector('.us-actions')).getPropertyValue('--us-actions-surface').trim()==='#f6ddff','Actions scoped override applied');
    await input('token-iqa-row-padding','16px 18px');
    assert(report.defaultView.getComputedStyle(report.querySelector('.rgMasterTable tbody td')).paddingTop==='16px','IQA spacing changes rendered rows');
    await input('token-radius','16px; color:red');
    assert($('token-radius').getAttribute('aria-invalid')==='true'&&!$('css-code').textContent.includes('color:red'),'Declaration injection rejected');
    await input('token-teal-600','var(--brand-600)');
    assert($('token-teal-600').getAttribute('aria-invalid')==='true','Circular token dependency rejected');
    await input('token-radius','var(--missing-token)');
    assert($('token-radius').getAttribute('aria-invalid')==='true','Unknown token rejected');
    $('reset-overrides').click();await wait(90);
    assert(!$('css-code').textContent.includes('--banner-bg')&&$('css-code').textContent.includes('--seed-primary'),'Clearing overrides preserves seeds');
    assert(!document.querySelector('[aria-invalid=true]'),'Reset clears invalid inputs');
    await change('checkbox-mode','var(--brand-600)');const forms=await loaded('config-forms');
    assert(forms.defaultView.getComputedStyle(forms.documentElement).getPropertyValue('--checkbox-colour').trim()==='#7b2cbf','Checkbox choice follows primary colour');
    await input('seed-primary-hex','#086b4c');
    assert(forms.defaultView.getComputedStyle(forms.documentElement).getPropertyValue('--checkbox-colour').trim()==='#086b4c','Choice colour stays linked after seed change');
    await change('filter-mode','closed');
    assert(report.getElementById('sample-report').classList.contains('us-filters-collapsed'),'Filter preview toggle updates wrapper');
    assert(report.querySelector('[data-us-iqa-filter-toggle]').getAttribute('aria-expanded')==='false','Shared filter controller collapses');
    await change('filter-mode','open');
    assert(report.querySelector('[data-us-iqa-filter-toggle]').getAttribute('aria-expanded')==='true','Shared filter controller reopens');
    $('tab-report').click();await wait(120);
    const name=report.getElementById('sample-name');name.value='Alex';
    report.getElementById('sample_SubmitButton').click();await wait(350);
    assert(report.getElementById('sample-rows').textContent.includes('Alex')&&!report.getElementById('sample-rows').textContent.includes('Jordan'),'Dummy IQA Find still works');
    $('tab-cco').click();const cco=await loaded('tabs-demo');const tabset=cco.querySelector('[role=tablist]');
    const links=tabset.querySelectorAll('[role=tab]');links[1].click();await wait(100);
    assert(links[1].getAttribute('aria-selected')==='true','Dummy CCO tab switching works');
    $('tab-actions').click();await wait(100);actions.querySelector('.us-actions__toggle').click();await wait(100);
    assert(actions.querySelector('.us-actions__toggle').getAttribute('aria-expanded')==='true','Shared Actions disclosure opens');
    $('tab-overview').focus();$('tab-overview').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
    assert($('tab-report').getAttribute('aria-selected')==='true','Preview tabs support keyboard arrows');
    await input('token-search','banner radius');
    assert(!document.querySelector('#token-banner-radius').closest('.token-field').hidden,'Advanced setting search works');
    assert(document.querySelector('#token-iqa-radius').closest('.token-field').hidden,'Search hides unrelated settings');
    await change('preview-width','narrow');assert($('preview-stage').classList.contains('is-narrow'),'Mobile preview option works');
    $('reset-all').click();await wait(120);$('tab-overview').click();$('advanced').open=false;
    assert($('css-code').textContent==='/* Using theme defaults. */','Reset removes all generated overrides');
    assert($('seed-primary-hex').value==='#006f94','Reset restores source seed');
    window.scrollTo(0,0);return results;
  })()`);
  console.log(result.join('\n'));
  await send('Page.captureScreenshot',{format:'png'}).then(result=>fs.writeFileSync(path.join(root,'.preview/theme-config-desktop.png'),Buffer.from(result.data,'base64')));
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await delay(200);
  const narrow=await evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})');
  if(narrow.scroll>narrow.width+1)throw Error('Editor overflows narrow viewport: '+JSON.stringify(narrow));
  await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true}).then(result=>fs.writeFileSync(path.join(root,'.preview/theme-config-mobile.png'),Buffer.from(result.data,'base64')));
  // Reopening the standalone page must discard every editor value.
  await send('Page.reload');
  // Wait for the reopened editor to initialise instead of a fixed delay.
  let reopened='';
  for(let i=0;i<100;i++){reopened=await evaluate('document.getElementById("seed-primary-hex")?.value ? document.getElementById("css-code").textContent : ""');if(reopened)break;await delay(100);}
  if(reopened!=='/* Using theme defaults. */')throw Error('Reload did not restore defaults: '+reopened);
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:pathToFileURL(guidePath('Usage-Guide.html')).href+'#custom-config'});await delay(500);
  const guide=await evaluate('!!document.getElementById("custom-config")&&!!document.querySelector("a[href=\\"Theme-Config.html\\"]")');
  if(!guide)throw Error('Guide config link missing');
  await send('Page.captureScreenshot',{format:'png'}).then(result=>fs.writeFileSync(path.join(root,'.preview/theme-config-guide.png'),Buffer.from(result.data,'base64')));
  if(errors.length)throw Error('Browser exceptions: '+errors.join('\n'));
  const network=requests.filter(url=>/^https?:/.test(url));if(network.length)throw Error('Unexpected network requests: '+network.join('\n'));
  console.log('Desktop/mobile screenshots, reload, guide link and no-network checks passed.');
  await send('Browser.close').catch(()=>{});
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{socket?.close();child.kill();await delay(500);
  // Only remove the exact disposable profile created by this test, under tmp.
  const resolved=path.resolve(profile),temporary=path.resolve(os.tmpdir())+path.sep;
  if(resolved.startsWith(temporary)&&path.basename(resolved).startsWith('union-config-test-'))try{fs.rmSync(resolved,{recursive:true,force:true,maxRetries:3,retryDelay:200});}catch(_){}
});
