// Contract/error-handling checks with simulated API responses; no live iMIS requests.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'probe-home-stats.js'),'utf8');
const names=['Total Member Counts','Members Joined','Members Resigned','Member Counts by Financial Status','Member Counts by Group','Member Counts by Category'];
const ids=names.map((_,i)=>`12345678-1234-1234-1234-${String(i+1).padStart(12,'0')}`);
const wrapped=object=>({Properties:{$values:Object.entries(object).map(([Name,Value])=>({Name,Value:{$value:Value}}))}});
async function run(mode='good') {
  const requests=[];
  const context={URL,URLSearchParams,AbortController,setTimeout,clearTimeout,Date,Intl,
    console:{log(){},table(){}},
    document:{querySelector(){return {value:'test-token-not-for-output'};}},
    window:{location:{protocol:'https:',origin:'https://example.imiscloud.com'},gWebRoot:'/imis'},
    fetch:async(url,options)=>{
      const u=new URL(url,'https://example.imiscloud.com');
      requests.push({url:u,options});
      assert.equal(options.credentials,'same-origin');
      assert.equal(options.redirect,'error');
      assert.equal(options.headers.RequestVerificationToken,'test-token-not-for-output');
      assert.equal(u.pathname.startsWith('/imis/api/'),true);
      if (mode==='unauthorized') return {ok:false,status:401};
      if (u.pathname.endsWith('/_execute')) {
        const body=JSON.parse(options.body);
        assert.ok(['FindByPath','FindDocumentsInFolder'].includes(body.OperationName));
        if (mode==='fallback') return {ok:false,status:403};
        const result=body.OperationName==='FindByPath'?wrapped({DocumentId:ids[0]}):{$values:names.map((name,i)=>wrapped({Name:i===0?'Total Member Count':name,DocumentVersionId:ids[i],DocumentTypeId:'IQD'}))};
        return {ok:true,json:async()=>({Result:result})};
      }
      assert.equal(options.method,'GET');
      if (u.pathname.endsWith('/QueryParameterDefinition')) {
        const queryPath=u.searchParams.get('QueryPath');
        assert.ok(queryPath.startsWith('$/_i4u_/Client/Home Page - UnionSuite/Stats/'));
        if (mode==='metadata-failure') return {ok:false,status:503};
        const dated=/\/Members (Joined|Resigned)$/.test(queryPath);
        let definitions=dated?[
          {Prompt:'StartDate',PropertyName:'EventDate',PropertyTypeName:'System.DateTime',FilterType:'GreaterThanOrEqual'},
          {Prompt:'EndDate',PropertyName:'EventDate',PropertyTypeName:'System.DateTime',FilterType:'LessThan'}
        ]:[];
        if (mode==='ambiguous-prompts' && dated) definitions.forEach(d=>d.Prompt='Date');
        if (mode==='extra-prompt' && dated) definitions.push({Prompt:'Status',PropertyName:'StatusCode',PropertyTypeName:'System.String'});
        return {ok:true,json:async()=>({Items:{$values:definitions}})};
      }
      assert.equal(u.pathname,'/imis/api/query');
      assert.equal(u.searchParams.has('Parameter'),false,'legacy positional parameters must not be sent');
      let index=ids.indexOf(u.searchParams.get('QueryDocumentVersionKey'));
      if (index<0) index=names.findIndex(name=>u.searchParams.get('QueryName')?.endsWith('/'+name));
      assert.ok(index>=0);
      const params=[u.searchParams.get('StartDate'),u.searchParams.get('EndDate')];
      let rows;
      if (index===0) rows=[{MemberCount:101}];
      if (index===1 || index===2) {
        assert.equal(params.length,2);
        assert.match(params[0],/^\d{4}-\d{2}-\d{2}$/);
        const report=context.window.usHomeStatsProbeReport;
        const empty=params[0]===params[1];
        const n=params[0]===report.periods.current.start?2:1;
        rows=empty && mode!=='ignored-dates'?[]:[{GroupCode:'G0',GroupName:'Group 0',[index===1?'JoinedCount':'ResignedCount']:n}];
      }
      if (index===3) rows=Array.from({length:101},(_,i)=>({FinancialStatusCode:'F'+i,FinancialStatusName:'Status '+i,MemberCount:1}));
      if (index===4) rows=Array.from({length:101},(_,i)=>({GroupCode:'G'+i,GroupName:'Group '+i,MemberCount:1}));
      if (index===5) rows=[{CategoryCode:'C1',CategoryName:'Category 1',MemberCount:mode==='mismatch'?100:101}];
      if (mode==='missing' && index===0) rows=[{WrongCount:101,Email:'must-not-appear@example.com'}];
      if (mode==='invalid' && index===0) rows=[{MemberCount:null}];
      if (mode==='duplicate' && index===5) rows=[rows[0],rows[0]];
      if (mode==='unassigned' && index===3) {
        [undefined,null,'',' \t '].forEach((value,i)=>{rows[i].FinancialStatusCode=value;rows[i].FinancialStatusName='Financial Status';});
        delete rows[0].FinancialStatusCode;
        rows[4].FinancialStatusCode='(empty)'; // A literal code must not collide with null.
      }
      if (mode==='unassigned' && index===5) rows=[
        {MemberCount:1},
        {CategoryCode:null,CategoryName:null,MemberCount:1},
        {CategoryCode:'',CategoryName:'Member Type',MemberCount:1},
        {CategoryCode:'   ',CategoryName:'Member Type',MemberCount:1},
        {CategoryCode:'C1',CategoryName:'Member Type',MemberCount:97}
      ];
      const offset=mode==='repeat'?0:Number(u.searchParams.get('offset'));
      const batch=rows.slice(offset,offset+100);
      return {ok:true,json:async()=>({
        Items:mode==='wrapped-query'?{$values:batch.map(row=>({$type:'Dynamic',...row}))}:JSON.parse(JSON.stringify(batch)),
        TotalCount:rows.length,HasNext:offset+batch.length<rows.length,
        NextOffset:mode==='bad-next-offset'?offset+batch.length+1:offset+batch.length
      })};
    }
  };
  await vm.runInNewContext(source,context,{timeout:3000});
  return {report:context.window.usHomeStatsProbeReport,requests,context};
}
(async()=>{
  const good=await run();
  assert.equal(good.report.queries.length,6);
  assert.equal(good.report.queries[0].queryName,'Total Member Count');
  assert.equal(good.report.checks.filter(c=>c.status==='FAIL').length,0);
  assert.equal(good.report.queries[3].runs.current.rowCount,101);
  assert.equal(good.report.queries[4].runs.current.total,101);
  assert.equal(good.report.version,3);
  assert.equal(good.report.endpoint,'/api/query');
  assert.equal(good.report.queries[1].dateParameterNames.start,'StartDate');
  assert.equal(good.report.queries[1].runs.current.filters.EndDate,good.report.periods.current.end);
  assert.equal(good.report.comparisons.joined.change,1);
  assert.equal(good.report.comparisons.joined.percentChange,100);
  assert.equal(good.requests.filter(r=>r.url.searchParams.has('StartDate')).length,6);
  assert.equal(good.context.window.usHomeStatsProbeRunning,false);
  assert.ok(!JSON.stringify(good.report).includes('test-token-not-for-output'));
  for (const mode of ['ignored-dates','missing','invalid','mismatch','duplicate','repeat','unauthorized','ambiguous-prompts','extra-prompt','metadata-failure','bad-next-offset']) {
    const {report,requests}=await run(mode);
    assert.ok(report.checks.some(c=>c.status==='FAIL'),mode+' must fail');
    if (mode==='missing') {
      assert.equal(report.queries[0].runs.current.total,null);
      assert.ok(report.queries[0].runs.current.actualFields.includes('WrongCount'));
      assert.ok(!JSON.stringify(report).includes('must-not-appear@example.com'));
    }
    if (mode==='repeat') assert.match(report.queries[3].runs.current.error,/Repeated result page/);
    if (mode==='mismatch') assert.ok(report.checks.some(c=>c.test==='category reconciles to total members' && c.status==='FAIL'));
    if (mode==='ignored-dates') assert.equal(report.comparisons.joined.status,'unverified');
    if (['ambiguous-prompts','extra-prompt','metadata-failure'].includes(mode)) {
      assert.equal(Object.keys(report.queries[1].runs).length,0);
      assert.equal(requests.filter(r=>r.url.pathname.endsWith('/query') && [ids[1],ids[2]].includes(r.url.searchParams.get('QueryDocumentVersionKey'))).length,0);
    }
  }
  const fallback=await run('fallback');
  assert.equal(fallback.report.checks.filter(c=>c.status==='FAIL').length,0);
  assert.equal(fallback.report.discoveryError,'HTTP 403');
  const unassigned=await run('unassigned');
  assert.equal(unassigned.report.checks.filter(c=>c.status==='FAIL').length,0);
  for (const index of [3,5]) {
    const result=unassigned.report.queries[index].runs.current;
    assert.equal(result.warnings.length,0);
    assert.equal(result.total,101);
    assert.equal(result.displayRows.find(row=>row.code===null).label,'(empty)');
    assert.equal(result.displayRows.find(row=>row.code===null).count,4);
    assert.equal(result.displayRows.reduce((sum,row)=>sum+row.count,0),101);
  }
  assert.equal(unassigned.report.queries[3].runs.current.displayRows.find(row=>row.code==='(empty)').count,1);
  const dynamic=await run('wrapped-query');
  assert.equal(dynamic.report.checks.filter(c=>c.status==='FAIL').length,0);
  console.log('Home Stats probe: 15 simulated API scenarios passed, including /query named filters, metadata failures, dynamic rows, paging and retained unassigned counts.');
})().catch(error=>{console.error(error);process.exitCode=1;});
