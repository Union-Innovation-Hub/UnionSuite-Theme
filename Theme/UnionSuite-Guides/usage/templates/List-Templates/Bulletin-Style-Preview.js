// Preview-only sample destinations, never a production card click handler.
(() => {
  const destinations={
    '#preview-announcement':['Updated Membership Fees','The card link opened this announcement.'],
    '#preview-fees':['Latest Membership Fees','The inline fee schedule link opened its own destination.'],
    '#preview-policy':['Workplace policy','The card link opened the workplace policy.']
  };
  const dialog=document.getElementById('bulletin-preview-dialog');
  let trigger;
  UnionSuiteActions.configure('home.manage-bulletin',{
    className:'us-action-home-manage-bulletin',owner:'preview',source:'Bulletin-Style-Preview.js',
    presentation:{label:'Manage bulletin',default:'button'},context:{},
    action:{type:'function',run:({trigger:button})=>{
      trigger=button;document.getElementById('bulletin-preview-title').textContent='Manage bulletin';
      document.getElementById('bulletin-preview-description').textContent='The live definition opens the existing bulletin management page in a new tab.';
      dialog.showModal();
    }}
  });
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href]');
    const destination=link&&destinations[link.getAttribute('href')];
    if(!destination||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();trigger=link;
    document.getElementById('bulletin-preview-title').textContent=destination[0];
    document.getElementById('bulletin-preview-description').textContent=destination[1];
    dialog.showModal();
  });
  dialog.addEventListener('close',()=>trigger?.focus({preventScroll:true}));
})();
