// HOME STATS IQA PROBE — paste this whole file into a signed-in iMIS page console.
// Read-only /api/query requests, prompt metadata and folder discovery.
// Does not alter queries or the page.
// When finished: copy(JSON.stringify(window.usHomeStatsProbeReport, null, 2))
// API reference: https://developer.imis.com/docs/migrating-from-iqa-to-query-service-endpoint
// Dates use named filters: StartDate inclusive, EndDate exclusive.
(async () => {
  'use strict';
  if (window.usHomeStatsProbeRunning) throw Error('A Home Stats probe is already running.');
  window.usHomeStatsProbeRunning = true;
  const folder = '$/_i4u_/Client/Home Page - UnionSuite/Stats';
  // Normally discovered from QueryParameterDefinition. If the report cannot map
  // your prompts, enter their exact API names here after reviewing that output.
  // Example: joined: {start:'Joined from', end:'Joined before'}
  const dateParameterNames = {joined:null,resigned:null};
  const specs = [
    {key:'total', names:['Total Member Counts','Total Member Count'], fields:['MemberCount'], count:'MemberCount'},
    {key:'joined', names:['Members Joined','Members Joined This Month'], fields:['GroupCode','GroupName','JoinedCount'], count:'JoinedCount', group:'GroupCode', dated:true},
    {key:'resigned', names:['Members Resigned','Members Resigned This Month'], fields:['GroupCode','GroupName','ResignedCount'], count:'ResignedCount', group:'GroupCode', dated:true},
    {key:'financial', names:['Member Counts by Financial Status'], fields:['FinancialStatusCode','FinancialStatusName','MemberCount'], count:'MemberCount', group:'FinancialStatusCode'},
    {key:'group', names:['Member Counts by Group'], fields:['GroupCode','GroupName','MemberCount'], count:'MemberCount', group:'GroupCode'},
    {key:'category', names:['Member Counts by Category'], fields:['CategoryCode','CategoryName','MemberCount'], count:'MemberCount', group:'CategoryCode'}
  ];
  const now = new Date(), year = now.getFullYear(), month = now.getMonth(), day = now.getDate();
  const date = d => [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const start = date(new Date(year,month,1));
  const periods = {
    current:{start,end:date(new Date(year,month,day+1))},
    previous:{start:date(new Date(year,month-1,1)),end:date(new Date(year,month-1,Math.min(day,new Date(year,month,0).getDate())+1))},
    empty:{start,end:start}
  };
  const report = window.usHomeStatsProbeReport = {
    probe:'Home Stats IQA probe', version:3, endpoint:'/api/query', startedAt:now.toISOString(), folder,
    timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateBasis:'Browser-local dates; current month through today versus the same elapsed days last month (capped at month end). End dates are exclusive.',
    periods, discoveredQueries:[], discoveryError:null, queries:[], checks:[],
    displayConvention:'Current IQAs use Code fields as row values and Name fields as dimension headings. Blank, null or omitted codes display as (empty), with their counts retained.',
    limits:[
      'Result checks cannot prove the underlying member cohort, joins, distinct-member counting or effective-date definitions.',
      'A passing empty-range check supports date filtering but cannot prove both date boundary operators. Confirm >= StartDate and < EndDate in IQA.',
      'Confirm which financial status codes count as Financial; this probe does not infer that mapping.',
      'Use the client business time zone for production. No AsAtDate field is required for these current-data IQAs.',
      'CloudToolz historical snapshots are outside this six-IQA probe.'
    ]
  };
  const check = (status,test,detail) => report.checks.push({status,test,detail});
  const unwrap = value => value && typeof value === 'object' && '$value' in value ? value.$value : value;
  const list = value => {
    value=unwrap(value); const rows=value?.$values ?? value;
    if (!Array.isArray(rows)) throw Error('Unexpected iMIS collection shape.');
    return rows;
  };
  const fields = value => {
    const row=unwrap(value);
    if (!row || typeof row !== 'object') throw Error('Unexpected IQA row shape.');
    if (row.Properties !== undefined) return Object.fromEntries(list(row.Properties).map(p=>[p.Name,unwrap(p.Value)]));
    return Object.fromEntries(Object.entries(row).filter(([k])=>!k.startsWith('$')).map(([k,v])=>[k,unwrap(v)]));
  };
  const count = value => {
    if (typeof value !== 'number' && !(typeof value === 'string' && /^\d+(?:\.0+)?$/.test(value.trim()))) return null;
    const n=Number(value); return Number.isSafeInteger(n) && n>=0 ? n : null;
  };
  const identity = value => value==null ? '' : String(value).trim();
  const guid = value => typeof value==='string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
  let apiBase;
  async function request(path,body) {
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),30000);
    try {
      const token=document.querySelector('input[name="__RequestVerificationToken"],input#__RequestVerificationToken')?.value;
      const response=await fetch(apiBase+path,{
        method:body ? 'POST' : 'GET', credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,
        headers:{Accept:'application/json',...(token?{RequestVerificationToken:token}:{}),...(body?{'Content-Type':'application/json'}:{})},
        ...(body?{body:JSON.stringify(body)}:{})
      });
      if (!response.ok) { const error=Error('HTTP '+response.status);error.httpStatus=response.status;throw error; }
      let data; try {data=await response.json();} catch {throw Error('Response was not JSON. Check that this page is signed in to iMIS.');}
      if (!data || unwrap(data.IsSuccessStatusCode)===false || unwrap(data.IsValid)===false) throw Error('iMIS returned an unsuccessful API result.');
      return data;
    } finally {clearTimeout(timer);}
  }
  function execute(operation,parameters,types) {
    return request('DocumentSummary/_execute',{
      $type:'Asi.Soa.Core.DataContracts.GenericExecuteRequest, Asi.Contracts',
      EntityTypeName:'DocumentSummary',OperationName:operation,UseJson:false,
      Parameters:{$type:'System.Collections.ObjectModel.Collection`1[[System.Object, mscorlib]], mscorlib',$values:parameters},
      ParameterTypeName:{$type:'System.Collections.ObjectModel.Collection`1[[System.String, mscorlib]], mscorlib',$values:types}
    });
  }
  async function discover() {
    const lookup=await execute('FindByPath',[{$type:'System.String',$value:folder}],['System.String']);
    const folderId=fields(lookup.Result).DocumentId;
    if (!guid(folderId)) throw Error('Stats folder could not be resolved.');
    const found=await execute('FindDocumentsInFolder',[
      {$type:'System.String',$value:folderId},
      {$type:'System.String[], mscorlib',$values:['IQD']},
      {$type:'System.Boolean',$value:true}
    ],['System.String','System.String[]','System.Boolean']);
    return list(found.Result).map(fields).filter(r=>r.DocumentTypeId==='IQD' && r.IsDeleted!==true && r.IsAuthorized!==false)
      .map(r=>({name:r.Name,id:r.DocumentVersionId})).filter(r=>typeof r.name==='string' && guid(r.id));
  }
  async function parameterDefinitions(query) {
    const data=await request('QueryParameterDefinition?'+new URLSearchParams({QueryPath:folder+'/'+query.name}));
    if (unwrap(data.HasNext)===true) throw Error('Parameter definitions are incomplete.');
    return list(data.Items ?? data).map(fields).map(row=>Object.fromEntries(
      ['Prompt','PropertyName','PropertyTypeName','FilterType'].filter(key=>key in row).map(key=>[key,row[key]])
    ));
  }
  function bindDates(spec,definitions) {
    const normalized=value=>identity(value).replace(/[^a-z0-9]/gi,'').toLowerCase();
    const role=name=>({startdate:'start',fromdate:'start',datestart:'start',datefrom:'start',enddate:'end',todate:'end',dateend:'end',dateto:'end'})[normalized(name)];
    const reserved=new Set(['queryname','querydocumentversionkey','offset','limit','queryurlparameters','parameter']);
    const explicit=dateParameterNames[spec.key];
    const binding={}, owners=new Set();
    for (const boundary of ['start','end']) {
      const candidates=definitions.map((definition,index)=>{
        // Distinct Search Labels can distinguish two filters on the same date column.
        const names=[definition.Prompt,definition.PropertyName].filter(name=>typeof name==='string' && name.trim());
        const name=explicit?names.find(name=>name===explicit[boundary]):names.find(name=>role(name)===boundary);
        return {index,name};
      }).filter(candidate=>candidate.name);
      if (candidates.length!==1) throw Error('Cannot uniquely identify the '+boundary+' date filter. Review parameterDefinitions and set dateParameterNames at the top of this script to the exact API filter names.');
      const candidate=candidates[0];
      if (owners.has(candidate.index) || reserved.has(candidate.name.toLowerCase())) throw Error('Date filter names must identify two distinct prompts and cannot use reserved API parameters.');
      owners.add(candidate.index);binding[boundary]=candidate.name;
    }
    if (binding.start.toLowerCase()===binding.end.toLowerCase()) throw Error('Date filters need distinct Search Labels to address both boundaries.');
    // Additional prompts may alter the requested cohort. Surface them for review.
    if (definitions.length!==owners.size) throw Error('Additional prompted filters found. Review parameterDefinitions before running the date-range counts.');
    return binding;
  }
  async function readRows(query,filters={}) {
    const rows=[], seenPages=new Set(); let expected=null,offset=0;
    for (let page=0;page<10;page++) {
      const params=new URLSearchParams({...(query.id?{QueryDocumentVersionKey:query.id}:{QueryName:folder+'/'+query.name}),limit:'100',offset:String(offset),...filters});
      const data=await request('query?'+params), batch=list(data.Items).map(fields);
      const total=data.TotalCount==null?null:count(unwrap(data.TotalCount));
      if (data.TotalCount!=null && total===null) throw Error('Invalid TotalCount metadata.');
      if (expected!==null && total!==null && total!==expected) throw Error('Results changed during paging; rerun the probe.');
      if (total!==null) expected=total;
      const signature=JSON.stringify(batch);
      if (batch.length && seenPages.has(signature)) throw Error('Repeated result page; cannot confirm complete totals.');
      seenPages.add(signature); rows.push(...batch);
      const next=unwrap(data.HasNext);
      if (expected!==null && rows.length>expected) throw Error('Result rows exceed TotalCount.');
      if (expected!==null && next===false && rows.length<expected) throw Error('Incomplete result set returned by iMIS.');
      if (next===false || (next!==true && expected!==null && rows.length===expected) || (next==null && expected===null && batch.length<100)) return rows;
      if (!batch.length) throw Error('Paging stopped before the result set was complete.');
      const nextOffset=data.NextOffset==null?offset+batch.length:count(unwrap(data.NextOffset));
      if (nextOffset===null || nextOffset!==offset+batch.length) throw Error('Unexpected NextOffset; cannot confirm a complete result set.');
      offset=nextOffset;
    }
    throw Error('Exceeded 1,000 aggregate rows; output is incomplete.');
  }
  function validate(spec,rows,period) {
    const errors=[], warnings=[], actualFields=[...new Set(rows.flatMap(Object.keys))].sort();
    // iMIS may omit a null code property altogether. Keep that row as unassigned.
    const missing=spec.fields.filter(name=>name!==spec.group && rows.some(row=>!(name in row) &&
      !(spec.group && !identity(row[spec.group]) && name.endsWith('Name'))));
    if (missing.length) errors.push('Missing required fields: '+missing.join(', '));
    if (spec.key==='total' && rows.length!==1) errors.push('Expected exactly one total row.');
    if (!rows.length && !spec.dated) errors.push('No summary rows returned; supply an explicit zero total and retain unassigned groups as needed.');
    if (rows.length && spec.group && !actualFields.includes(spec.group)) warnings.push('No '+spec.group+' field was observable; all rows display as (empty). Confirm the column alias if these are not all unassigned.');
    let total=0; const keys=new Set(), displayRows=[], displayGroups=new Map();
    for (const row of rows) {
      const n=count(row[spec.count]);
      if (n===null) errors.push('Invalid nonnegative integer in '+spec.count);else total+=n;
      if (spec.group) {
        const key=identity(row[spec.group]);
        if (key && keys.has(key)) errors.push('Duplicate group code: '+key);keys.add(key);
        const code=key || null;
        if (!displayGroups.has(code)) {
          const item={code,label:key || '(empty)',count:0};
          displayGroups.set(code,item);displayRows.push(item);
        }
        const item=displayGroups.get(code);
        item.count=n===null || item.count===null ? null : item.count+n;
        for (const name of spec.fields.filter(f=>f!==spec.count)) {
          if (typeof row[name]!=='string' && typeof row[name]!=='number' && row[name]!=null) errors.push('Non-scalar field: '+name);
          if (key && name.endsWith('Name') && !identity(row[name])) warnings.push('Blank dimension heading in '+name+'; the row label uses '+spec.group+'.');
        }
      }
    }
    if (!Number.isSafeInteger(total)) errors.push('Aggregate exceeds the safe integer range.');
    if (period==='empty' && total!==0) errors.push('Empty date interval returned a nonzero count; date filters are not behaving as >= StartDate and < EndDate.');
    return {
      status:errors.length?'FAIL':rows.length || period==='empty'?'PASS':'REVIEW',rowCount:rows.length,actualFields,
      extraFields:actualFields.filter(name=>!spec.fields.includes(name)),total:errors.length?null:total,
      errors:[...new Set(errors)],warnings:[...new Set(warnings)],
      ...(spec.group?{displayLabelSource:spec.group,displayRows}:{}),
      // Only expected aggregate fields are retained, even if a query accidentally returns contact details.
      rows:rows.map(row=>Object.fromEntries(spec.fields.filter(name=>name in row).map(name=>[name,
        row[name]==null || ['string','number','boolean'].includes(typeof row[name]) ? row[name] : '[non-scalar value omitted]'
      ])))
    };
  }
  try {
    if (!/^https?:$/.test(window.location.protocol)) throw Error('Run this in your signed-in iMIS page, not a local file.');
    const root=new URL(String(window.gWebRoot || '/'),window.location.origin);
    if (root.origin!==window.location.origin || root.search || root.hash) throw Error('Unexpected iMIS web root.');
    apiBase=root.pathname.replace(/\/+$/,'')+'/api/';
    let discovered=null;
    try {discovered=await discover();report.discoveredQueries=discovered.map(q=>q.name);}
    catch(error) {report.discoveryError=error.message;check('REVIEW','Folder discovery','Using the configured query paths because discovery failed: '+error.message);}
    for (const spec of specs) {
      const result={key:spec.key,expectedName:spec.names[0],requiredFields:spec.fields,runs:{}};
      report.queries.push(result);
      const matches=discovered?.filter(q=>spec.names.some(name=>name.toLowerCase()===q.name.trim().toLowerCase()));
      if (matches && matches.length!==1) {
        result.error=matches.length?'More than one matching query was found.':'No matching query found. Check discoveredQueries for its exact name.';
        check('FAIL',spec.names[0],result.error);continue;
      }
      let query=matches?.[0] || {name:spec.names[0]};
      result.queryName=query.name;result.queryPath=folder+'/'+query.name;
      let binding;
      try {
        try {result.parameterDefinitions=await parameterDefinitions(query);}
        catch(error) {
          if (!discovered && spec.key==='total' && error.httpStatus===404) {
            query={name:spec.names[1]};result.parameterDefinitions=await parameterDefinitions(query);
          } else throw error;
        }
        if (spec.dated) binding=result.dateParameterNames=bindDates(spec,result.parameterDefinitions);
        else if (result.parameterDefinitions.length) check('REVIEW',query.name+' prompts','This current-count query has prompted filters; review the definitions and intended cohort.');
      } catch(error) {
        result.parameterError=error.message;
        check(spec.dated?'FAIL':'REVIEW',query.name+' parameter discovery',error.message);
        // Never run a dated query without validated named filters.
        if (spec.dated) continue;
      }
      const runs=spec.dated?Object.entries(periods):[['current',null]];
      for (const [label,period] of runs) {
        console.log('[Home Stats probe] '+query.name+' — '+label);
        const filters=period?{[binding.start]:period.start,[binding.end]:period.end}:{};
        try {
          let rows;
          try {rows=await readRows(query,filters);}
          catch(error) {
            // Singular/plural fallback only for a genuine missing path, never for auth or server errors.
            if (!discovered && spec.key==='total' && error.httpStatus===404) {
              query={name:spec.names[1]}; rows=await readRows(query,filters);
            } else throw error;
          }
          result.runs[label]=validate(spec,rows,label);
          result.runs[label].filters=filters;
          const run=result.runs[label];
          check(run.status,query.name+' / '+label,run.errors.join(' ') || (rows.length?`${rows.length} rows; ${spec.count} total ${run.total}.`:label==='empty'?'Empty interval correctly returned zero rows.':'Zero rows; field names cannot be verified from this run.'));
          run.warnings.forEach(warning=>check('REVIEW',query.name+' / '+label,warning));
        } catch(error) {
          result.runs[label]={status:'FAIL',filters,error:error.name==='AbortError'?'Request timed out after 30 seconds.':error.message};
          check('FAIL',query.name+' / '+label,result.runs[label].error);
        }
      }
      result.queryName=query.name;result.queryPath=folder+'/'+query.name;
    }
    const get=(key,period='current')=>report.queries.find(q=>q.key===key)?.runs[period];
    const usable=run=>run && run.status!=='FAIL' && Number.isSafeInteger(run.total);
    for (const key of ['financial','group','category']) {
      const a=get('total'),b=get(key);
      check(!usable(a)||!usable(b)?'REVIEW':a.total===b.total?'PASS':'FAIL',key+' reconciles to total members',
        !usable(a)||!usable(b)?'Cannot reconcile until both queries have valid, complete results.':`${b.total} versus ${a.total}; difference ${b.total-a.total}.`);
    }
    report.comparisons={};
    for (const key of ['joined','resigned']) {
      const current=get(key),previous=get(key,'previous'),empty=get(key,'empty');
      const hasPositive=(usable(current)&&current.total>0)||(usable(previous)&&previous.total>0);
      const dateEvidence=usable(empty)&&empty.total===0 && hasPositive;
      report.comparisons[key]=dateEvidence && usable(current)&&usable(previous)?
        {current:current.total,previous:previous.total,change:current.total-previous.total,percentChange:previous.total===0?null:Math.round((current.total-previous.total)/previous.total*1000)/10}:
        {status:'unverified',reason:'Do not use these counts for monthly comparisons until date filtering has been verified.'};
      check(dateEvidence?'PASS':'REVIEW',key+' date-filter evidence',
        usable(empty)&&empty.total===0?(hasPositive?'Empty interval returned zero and another interval returned positive results. Verify the boundary operators in the IQA definition.':'All tested intervals returned zero; date filtering and result fields remain unverified.'):'An empty interval could not be confirmed as zero. Check the date parameters.');
      const group=get('group');
      if (usable(group)&&usable(current)) {
        const codes=new Set(group.rows.map(row=>identity(row.GroupCode)));
        const unmatched=current.rows.map(row=>identity(row.GroupCode)).filter(code=>!codes.has(code));
        check(unmatched.length?'REVIEW':'PASS',key+' group coverage',unmatched.length?
          'Event groups absent from current members: '+[...new Set(unmatched)].join(', ')+'. Keep these when merging the breakdown.':'Every event group exists in the current member breakdown.');
      }
    }
  } catch(error) {report.error=error.message;check('FAIL','Probe',error.message);}
  finally {
    report.finishedAt=new Date().toISOString();
    report.result=report.checks.some(c=>c.status==='FAIL')?'Issues found':report.checks.some(c=>c.status==='REVIEW')?'Review needed':'Automated checks passed; confirm the query definitions and financial status mapping';
    window.usHomeStatsProbeRunning=false;
    console.table(report.checks);
    console.log('HOME STATS PROBE COMPLETE — '+report.result);
    console.log(JSON.stringify(report,null,2));
    console.log('Copy the complete report with: copy(JSON.stringify(window.usHomeStatsProbeReport, null, 2))');
  }
  return report;
})();
