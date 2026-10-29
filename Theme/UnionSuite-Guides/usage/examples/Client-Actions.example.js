/* Client example. Adapt the helpers and load once after the shared runtime,
   standard definitions and referenced business helpers. No task editor,
   assignee contract or permission endpoint is implied by this example. */
(function () {
  'use strict';
  const actions = window.UnionSuiteActions;
  if (!actions?.define) throw new Error('Load zUnionSuite.js before client actions.');
  const context = {caseId:{from:'query',parameter:'CaseID',required:true}};
  function define(key,label,action) {
    actions.define('cases.'+key,{
      className:'us-action-cases-'+key,owner:'client.cases',source:'Client-Actions.js:'+key,
      presentation:{label,default:'button',menu:'menu-item'},context,action
    });
  }
  // Supply these client helpers to consume the explicit case context. A member-only
  // helper with a similar name is not automatically suitable for a case action.
  [
    ['add-task','Add task','CaseActions.addTask'],
    ['add-note','Add note','CaseActions.addNote'],
    ['schedule-meeting','Schedule meeting','CaseActions.scheduleMeeting'],
    ['manage-staff','Add/remove staff','CaseActions.manageStaff'],
    ['manage-contacts','Add/remove contacts','CaseActions.manageContacts']
  ].forEach(([key,label,helper])=>define(key,label,{
    type:'function',requires:[helper],recordKey:['caseId'],
    run:env=>window.CaseActions[helper.split('.')[1]](env)
  }));
  define('edit','Edit case details',{
    type:'popup',recordKey:['caseId'],
    href:({context})=>{
      const url=new URL('/_i4u_/Client/Cases-Enhancements/Edit-Case-Staff.aspx',location.origin);
      url.searchParams.set('CaseID',context.caseId);return url.href;
    },
    popup:{title:'Edit case details',width:'50%',height:'90%'}
    // Add refresh:{when:'close',run:yourRefreshFunction} or a targets plan.
  });
})();
