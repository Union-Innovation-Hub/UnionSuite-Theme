// Preview only: simulate the supplied native handlers and ASP.NET lifecycle.
(() => {
  const appearance = document.getElementById('utility-example-appearance');
  const syncAppearance = () => { appearance.value = window.UnionSuiteAppearance.getState().preference || 'system'; };
  appearance.addEventListener('change',() => window.UnionSuiteAppearance.setPreference(appearance.value));
  window.addEventListener('unionsuite:appearancechange',syncAppearance);
  syncAppearance();
  const events = {begin:new Set(),end:new Set(),load:new Set()};
  const manager = {add_beginRequest:fn=>events.begin.add(fn),remove_beginRequest:fn=>events.begin.delete(fn),add_endRequest:fn=>events.end.add(fn),remove_endRequest:fn=>events.end.delete(fn)};
  window.Sys = {WebForms:{PageRequestManager:{getInstance:()=>manager}},Application:{add_load:fn=>events.load.add(fn),remove_load:fn=>events.load.delete(fn)}};
  const counts = {cart:0,edit:0,obo:0};
  const status = text => document.getElementById('utility-example-status').textContent = text;
  const count = key => {counts[key]++;document.getElementById('utility-example-counts').textContent = `Cart calls: ${counts.cart} · Easy Edit calls: ${counts.edit} · OBO calls: ${counts.obo}`;};
  const mode = () => document.getElementById('utility-example-mode').value;
  function setOBO(on) {
    // iMIS applies these native state classes after selecting/clearing a contact.
    document.body.classList.add('OBOProxyEnabled');
    document.body.classList.toggle('obo-on',on);
    const menu=document.querySelector('.account-menu'),button=menu.querySelector('.obo-toggle'),panel=menu.querySelector('.obo-panel');
    menu.classList.toggle('obo-on',on);menu.classList.toggle('obo-off',!on);
    button.classList.toggle('on',on);button.classList.toggle('off',!on);
    button.title=on?'Clear on behalf of':'Select on behalf of';button.textContent=button.title;
    panel.classList.toggle('on',on);panel.classList.toggle('off',!on);
    panel.classList.toggle('ProxyPanelContact',on);panel.classList.toggle('ProxyPanelNoContact',!on);
    menu.querySelector('.account-toggle .nav-text').textContent=on?'Stark Enterprise - Melbourne':'James Driscoll';
    document.getElementById('utility-demo-select').textContent=on?'Change':'(select)';
    document.getElementById('utility-demo-clear').hidden=!on;
    document.getElementById('utility-demo-contact').hidden=!on;
  }
  let finish;
  function request(source,complete) {
    if (mode()==='cancel') {status('Native request cancelled. Feedback recovers within 10 seconds.');return;}
    events.begin.forEach(fn=>fn(manager,{get_postBackElement:()=>source}));
    status(mode()==='hold'?'Request held open. Click Finish held request.':'Simulated request in progress…');
    finish = () => {finish=null;if(mode()!=='failure')complete();events.end.forEach(fn=>fn(manager,{}));status(mode()==='failure'?'Native request failed; feedback cleared.':'Native request finished; feedback cleared.');};
    if(mode()!=='hold')setTimeout(()=>finish?.(),1200);
  }
  window.MenuLI_OnClick = () => {count('cart');status('Opening Cart (simulation)…');setTimeout(()=>{window.dispatchEvent(new Event('pageshow'));status('Cart navigation completed (simulation).');},1200);};
  window.__doPostBack = key => {
    const source = document.querySelector(key==='clear-obo'?'#utility-demo-clear':'.ste-toggle');
    if(key==='easy-edit')count('edit');
    request(source,()=>{
      if(key==='clear-obo'){setOBO(false);return;}
      const button = document.querySelector('.ste-toggle');
      const on = !button.classList.contains('on');
      button.classList.toggle('on',on);button.classList.toggle('off',!on);
      button.title=`Easy edit is ${on?'on':'off'}. Click to turn it ${on?'off':'on'}.`;button.textContent=on?'Disable easy edit':'Enable easy edit';
    });
  };
  window.ToggleOBO = id => {count('obo');const on=document.getElementById(id).classList.contains('on');document.getElementById(on?'utility-demo-clear':'utility-demo-select').click();};
  window.TargetSelectOpenFinderAdder = () => {status('Opening contact picker…');setTimeout(()=>document.getElementById('utility-example-picker').showModal(),600);};
  document.getElementById('utility-example-select').onclick=()=>{setOBO(true);document.getElementById('utility-example-picker').close();status('Stark Enterprise - Melbourne selected. OBO is on.');};
  document.getElementById('utility-example-cancel').onclick=()=>document.getElementById('utility-example-picker').close();
  document.getElementById('utility-example-finish').onclick=()=>finish?.();
  const original = document.querySelector('.navbar-right').innerHTML;
  document.getElementById('utility-example-replace').onclick=()=>{const on=document.body.classList.contains('obo-on');document.querySelector('.navbar-right').innerHTML=original;setOBO(on);finish=null;events.load.forEach(fn=>fn());status('Native controls replaced, as in a partial update.');};
  document.addEventListener('click',event=>{
    const toggle=event.target.closest('.account-toggle');
    if(toggle){event.preventDefault();const open=toggle.parentElement.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));return;}
    const link=event.target.closest('.account-toggle-wrapper > .dropdown-menu > li > a');
    if(link){event.preventDefault();if(link.closest('.js-show-more-sites')){document.querySelector('.website-item[hidden]').hidden=false;link.parentElement.hidden=true;}else status('Preview only: '+link.textContent);}
    if(event.target.closest('.us-taskbar__full-search,.logo,#utility-demo-contact a')){event.preventDefault();status('Preview link only.');}
  });
})();
