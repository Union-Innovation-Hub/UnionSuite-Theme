// Guide-only ASP.NET lifecycle and native row-action simulation. No network requests.
// Like the live grid, an expand or collapse is a partial update that replaces
// the whole grid with server markup; the detail row only exists when expanded.
// The loading and sliding presentation comes from the shared US-IQA-BUSY block.
(function(){
 const handlers={beginRequest:[],endRequest:[],pageLoading:[],pageLoaded:[]},manager={};
 for(const name of Object.keys(handlers)){
  manager['add_'+name]=fn=>handlers[name].push(fn);
  manager['remove_'+name]=fn=>{handlers[name]=handlers[name].filter(item=>item!==fn)};
 }
 window.Sys={WebForms:{PageRequestManager:{getInstance:()=>manager}}};
 const panel=document.getElementById('expand-example_ListerPanel');
 // The "server" renders from the original markup, before any theme enhancement.
 const server=panel.innerHTML;
 const notes={
  'visit-one-row':'Met with workplace representatives to discuss membership enquiries.',
  'visit-two-row':'Follow-up visit and an update on new starter information.',
  'visit-three-row':'Membership information session for staff.'
 };
 const expanded=new Set();
 let timer=null;
 function render(){
  const template=document.createElement('template');
  template.innerHTML=server;
  for(const row of template.content.querySelectorAll('tr.rgRow,tr.rgAltRow')){
   const open=expanded.has(row.id),control=row.querySelector('td.rgExpandCol > input');
   control.className=open?'rgCollapse':'rgExpand';
   control.value=open?'▾':'▸';
   control.title=open?'Collapse':'Expand';
   control.setAttribute('aria-expanded',String(open));
   control.parentElement.setAttribute('aria-expanded',String(open));
   control.setAttribute('aria-label',control.getAttribute('aria-label').replace(/^(Expand|Collapse)/,control.title));
   if(!open)continue;
   const detail=document.createElement('tr');
   const id=row.id.replace(/-row$/,'-detail');
   detail.innerHTML='<td class="rgExpandCol">&nbsp;</td><td colspan="5"><table class="rgDetailTable" id="'+id+'" style="width:100%"><thead><tr><th class="rgHeader" scope="col">Visit notes</th></tr></thead><tbody><tr class="rgRow"><td>'+notes[row.id]+'</td></tr></tbody></table></td>';
   row.after(detail);
  }
  return template.innerHTML;
 }
 const demo=window.IqaExpandDemo={delay:900,cancelled:false,source:null,
  // Milliseconds between the grid replacement and endRequest, as when ASP.NET
  // loads script includes from the response; 0 completes in the same task.
  scriptDelay:0,
  begin(source){
   clearTimeout(timer);
   document.getElementById('expand-example_UpdateProgress1').style.display='block';
   for(const fn of handlers.beginRequest)fn(manager,{get_postBackElement:()=>source});
  },
  update(){
   for(const fn of handlers.pageLoading)fn(manager,{get_panelsUpdating:()=>[panel]});
   panel.innerHTML=render();
   demo.afterUpdate?.();
  },
  end(error=null){
   clearTimeout(timer);
   document.getElementById('expand-example_UpdateProgress1').style.display='none';
   if(!error)for(const fn of handlers.pageLoaded)fn(manager,{get_panelsUpdated:()=>[panel]});
   for(const fn of handlers.endRequest)fn(manager,{get_error:()=>error});
  },
  respond(rowId){
   if(expanded.has(rowId))expanded.delete(rowId);else expanded.add(rowId);
   demo.update();
   if(demo.scriptDelay)timer=setTimeout(()=>demo.end(),demo.scriptDelay);else demo.end();
  }
 };
 document.addEventListener('click',event=>{
  const control=event.target.closest('input.rgExpand,input.rgCollapse');
  if(control){
   event.preventDefault();
   if(demo.cancelled)return;
   const rowId=control.closest('tr').id;
   demo.begin(demo.source||control);
   timer=setTimeout(()=>{
    if(document.getElementById(rowId))demo.respond(rowId);else demo.end();
   },demo.delay);
  }
  if(event.target.closest('[data-demo-sort]')){
   event.preventDefault();
   document.getElementById('expand-example-status').textContent='Date sort activated. Native iMIS owns the actual sort request; this example makes no request.';
  }
 });
})();
