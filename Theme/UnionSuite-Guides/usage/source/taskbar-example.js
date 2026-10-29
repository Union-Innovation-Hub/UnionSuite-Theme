// Offline guide fixture only. The dedicated production script owns the UI.
document.querySelector('#__ClientContext').value = JSON.stringify({loggedInPartyId:'100',isAnonymous:false});
window.UnionSuiteTaskbarConfig = {searchDelay:250,historyStoragePrefix:"union-suite:preview:quick-search-history:",pipStoragePrefix:'union-suite:preview:pip-greeting:'};
// Only this offline fixture may emulate storage (e.g. an opaque file/srcdoc host).
// Production suppresses automatic greetings when durable storage is unavailable.
try { localStorage.getItem('union-suite:preview:pip-greeting:100'); }
catch (_) {
  const values = new Map();
  Object.defineProperty(window, 'localStorage', {value:{
    getItem:key => values.get(String(key)) ?? null,
    setItem:(key,value) => values.set(String(key),String(value)),
    removeItem:key => values.delete(String(key))
  }});
}
// Each standalone preview starts fresh; production keys are never reset.
localStorage.removeItem('union-suite:preview:pip-greeting:100');
document.querySelector('[data-pip-preview-replay]')?.addEventListener('click', () => {
  localStorage.removeItem('union-suite:preview:pip-greeting:100');
  window.UnionSuiteTaskbar.destroy(); window.UnionSuiteTaskbar.initialise();
});
document.querySelector('[data-pip-preview-reload]')?.addEventListener('click', () => {
  window.UnionSuiteTaskbar.destroy(); window.UnionSuiteTaskbar.initialise();
});
document.querySelector('[data-pip-preview-scheme]')?.addEventListener('change', event => {
  document.documentElement.dataset.usColorScheme = event.target.value;
});
// Preview controls use the same bounded idle actions as the automatic timer.
const idleButtons = [...document.querySelectorAll('[data-pip-preview-idle]')];
idleButtons.forEach(button => button.addEventListener('click', () => {
  window.UnionSuiteTaskbar.playPipIdle(button.dataset.pipPreviewIdle);
}));
function syncIdleButtons() {
  const visiting = !!document.querySelector('.us-taskbar__pip[data-phase="visit"]');
  idleButtons.forEach(button => { button.disabled = !visiting; });
}
const previewHeader = document.querySelector('#hd');
if (previewHeader && idleButtons.length) {
  new MutationObserver(syncIdleButtons).observe(previewHeader, {subtree:true, childList:true, attributes:true, attributeFilter:['data-phase']});
}
syncIdleButtons();
window.fetch = async function (url, options) {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 400);
    options.signal?.addEventListener('abort', () => {
      clearTimeout(timer); reject(new DOMException('Aborted','AbortError'));
    }, {once:true});
  });
  if (url.includes('/api/CsContact/')) return {ok:false,status:404};
  const term = decodeURIComponent(url.split('&parameter=')[1] || '').toLowerCase();
  if (term === 'error') return {ok:false,status:500};
  const records = [
    {ID:'104019',FULL_NAME:'Alex Morgan',COMPANY_RECORD:false,PreferredEmail:'alex@example.com',PreferredMobile:'0400 111 222','Member Type':'Regular',Status:'Active'},
    {ID:'104020',FULL_NAME:'',COMPANY:'Morgan Engineering',COMPANY_RECORD:true,PreferredEmail:'office@example.com','Member Type':'Employer',Status:'Active'}
  ];
  const matches = term === 'empty' ? [] : records.filter(record=>Object.values(record).some(value=>String(value).toLowerCase().includes(term.replaceAll('%',''))));
  return {ok:true,json:async()=>({Items:{$values:matches.map(record=>({Properties:{$values:Object.entries(record).map(([Name,Value])=>({Name,Value:typeof Value==='boolean'?{$type:'System.Boolean',$value:Value}:Value}))}}))}})};
};
document.addEventListener('click', event => {
  const shortcut = event.target.closest('.us-taskbar__quick-link');
  if (shortcut) {
    event.preventDefault();
    document.querySelector('#demo-taskbar-status').textContent = 'Example only: ' + shortcut.getAttribute('aria-label') + ' opens ' + shortcut.getAttribute('href');
  }
  if(event.target.closest('[data-taskbar-action="open-result"],[data-taskbar-action="full-search"]')) {
    event.preventDefault();
    document.querySelector('#demo-taskbar-status').textContent = 'Example only: record navigation is inactive.';
  }
});
