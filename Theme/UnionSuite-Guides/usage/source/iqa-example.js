// Guide-only simulation. Native iMIS owns these operations in production.
(function () {
  'use strict';
  var data = [
    ['104019','Alex Morgan','Sydney Metro','Active'],['LEGACY-104020','Jordan Lee','Central Coast','Review required'],
    ['104021','Sam Taylor','Western Sydney','Active'],['104022','Casey Patel','Hunter','Active'],
    ['104023','Riley Chen','Sydney Metro','Review required'],['104024','Morgan Jones','Illawarra','Active'],
    ['104025','Taylor Nguyen','Central Coast','Active'],['104026','Jamie Wilson','Hunter','Review required'],
    ['104027','Avery Singh','Western Sydney','Active'],['104028','Robin Evans','Illawarra','Active'],
    ['104029','Cameron Smith','Sydney Metro','Active'],['104030','Drew Brown','Central Coast','Review required']
  ].map(function (r) {return {id:r[0],name:r[1],branch:r[2],status:r[3]};});
  var page = 0, sort = 'name', direction = 1, current = data.slice(), nameFilter = '', statusFilter = '';
  var get = function (id) {return document.getElementById(id);};
  // Guide-only handlers exercise configurable optional header actions.
  ['add-note', 'view-history'].forEach(function (name) {
    window.UnionSuiteActions.define('demo.' + name, {
      className:'us-action-demo-'+name,owner:'guide',source:'iqa-example.js:'+name,
      presentation:{label:name === 'add-note' ? 'Add note' : 'View history',default:name === 'add-note' ? 'button' : 'link'},context:{},
      action:{type:'function',run: function () {
        get('sample-details-title').textContent = name === 'add-note' ? 'Add note — example' : 'View history — example';
        get('sample-details-text').textContent = 'This optional action uses a configured title and handler. No note is saved and no live history is retrieved.';
        get('sample-details').showModal();
      }}
    });
  });
  var escape = function (s) {return s.replace(/[&<>"']/g,function (c) {return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  function render() {
    var size = Number(get('sample-page-size').value);
    var pages = Math.max(1,Math.ceil(current.length/size)); page = Math.max(0,Math.min(pages-1,page));
    current.sort(function (a,b) {return a[sort].localeCompare(b[sort]) * direction;});
    get('sample-rows').innerHTML = current.slice(page*size,(page+1)*size).map(function (r,i) {
      return '<tr class="'+(i%2?'rgAltRow':'rgRow')+'"><td>'+r.id+'</td><td>'+escape(r.name)+'</td><td>'+escape(r.branch)+'</td><td>'+escape(r.status)+'</td><td><div class="fixture-actions">'+[['View','eye'],['Edit','pencil']].map(function (a) {
        return '<button type="button" class="TextButton us-icon-button" aria-label="'+a[0]+' '+escape(r.name)+'" data-record="'+r.id+'" data-command="'+a[0]+'"><i class="ti ti-'+a[1]+'" aria-hidden="true"></i></button>';
      }).join('')+'<button type="button" class="TextButton us-icon-button DangerButton" aria-label="Delete '+escape(r.name)+' unavailable in sample" disabled><i class="ti ti-trash" aria-hidden="true"></i></button></div></td></tr>';
    }).join('') || '<tr class="rgRow"><td colspan="5">No sample members match. Clear the filters and select Find.</td></tr>';
    get('sample-count').textContent = current.length+' records';
    get('sample-page').textContent = 'Page '+(page+1)+' of '+pages;
    get('sample-prev').setAttribute('aria-disabled',String(page===0)); get('sample-next').setAttribute('aria-disabled',String(page===pages-1));
  }
  function filter() {
    nameFilter = get('sample-name').value.trim().toLowerCase(); statusFilter = get('sample-status').value;
    current = data.filter(function (r) {return r.name.toLowerCase().includes(nameFilter) && (!statusFilter || r.status===statusFilter) && (get('sample_querySelectDropdown').value!=='review' || r.status==='Review required');});
    page=0; render();get('sample-result').textContent=current.length+' sample records match. No server query was run.';
  }
  var pendingFind=null;
  function requestExample(button,update,showButton){
    if(pendingFind!==null)return;
    var nativeOnly=get('sample-report').classList.contains('us-report-no-styling');
    var overlay=window.UnionSuiteIqaBusy.showResults(button);
    var busy=nativeOnly||!showButton?null:window.UnionSuiteBusy.show(button,{mode:'center'});
    get('sample_UpdateProgress1').hidden=false;
    pendingFind=setTimeout(function(){try{update();}finally{get('sample_UpdateProgress1').hidden=true;overlay?.clear();busy?.clear();pendingFind=null;}},850);
  }
  function findExample(){requestExample(get('sample_SubmitButton'),filter,true);}
  get('sample-form').addEventListener('submit',function (e) {e.preventDefault();findExample();});
  get('sample_SubmitButton').addEventListener('click',findExample);
  document.querySelectorAll('[data-sample-calendar]').forEach(function(button){button.addEventListener('click',function(event){event.preventDefault();get('sample-calendar-preview').showModal();});});
  get('sample-calendar-close').addEventListener('click',function(){get('sample-calendar-preview').close();});
  get('sample_querySelectDropdown').addEventListener('change',filter);
  get('sample-page-size').addEventListener('change',function () {page=0;render();});
  get('sample-prev').addEventListener('click',function (e) {e.preventDefault();page--;render();});
  get('sample-next').addEventListener('click',function (e) {e.preventDefault();page++;render();});
  // Offline-only Telerik-shaped entry point. The fixture links now exercise
  // the actual shared native-header CSS, including hover/focus and sort arrows.
  // This shim is never included in production theme JS or a live iMIS page.
  window.Telerik = { Web: { UI: { Grid: { Sort: function (a, field) {
    requestExample(a,function(){
    direction=sort===field?-direction:1;sort=field;
    document.querySelectorAll('th[aria-sort]').forEach(function (th) {th.removeAttribute('aria-sort');});
    a.parentElement.setAttribute('aria-sort',direction===1?'ascending':'descending');render();
    },false);
  } } } } };
  var exportButton = document.querySelector('.dropdown-toggle');
  var menu = document.querySelector('.dropdown-menu');
  function closeExport() {menu.hidden=true;exportButton.setAttribute('aria-expanded','false');exportButton.parentElement.classList.remove('open');}
  exportButton.addEventListener('click',function () {var open=menu.hidden;menu.hidden=!open;exportButton.setAttribute('aria-expanded',String(open));exportButton.parentElement.classList.toggle('open',open);});
  document.addEventListener('click',function (e) {if (!exportButton.parentElement.contains(e.target)) closeExport();});
  document.addEventListener('keydown',function (e) {if(e.key==='Escape'&&!menu.hidden){closeExport();exportButton.focus();}});
  get('sample_btnExportCsv').addEventListener('click',function (e) {
    e.preventDefault();var csv = [['ID','Member','Branch','Status']].concat(current.map(function (r) {return [r.id,r.name,r.branch,r.status];})).map(function (r) {return r.map(function (v) {return '"'+v.replace(/"/g,'""')+'"';}).join(',');}).join('\r\n');
    var url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));var a=document.createElement('a');a.href=url;a.download='Sample-members.csv';a.click();setTimeout(function () {URL.revokeObjectURL(url);},1000);closeExport();get('sample-result').textContent='Exported '+current.length+' fictional sample records.';
  });
  get('sample-rows').addEventListener('click',function (e) {
    var button=e.target.closest('[data-record]');if(!button)return;
    var r=data.find(function (r) {return r.id===button.dataset.record;});
    get('sample-details-title').textContent=button.dataset.command+' · '+r.name;
    get('sample-details-text').textContent='Fictional record '+r.id+'\n'+r.branch+' · '+r.status+'\n\nThis demonstrates the action presentation. On your live page, retain the existing iMIS link or popup handler.';
    get('sample-details').showModal();
  });
  get('sample-details-close').addEventListener('click',function () {get('sample-details').close();});
  render();
})();
