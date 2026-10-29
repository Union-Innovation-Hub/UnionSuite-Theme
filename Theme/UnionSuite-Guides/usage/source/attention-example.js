// OFFLINE PREVIEW ONLY. Used by the guide/home generator; never installed in the theme.
(() => {
  const folderId = '00000000-0000-4000-8000-000000000100';
  const rows = [
    ['01 Applications',3,'Applications','Awaiting review','#attention-applications'],
    ['02 Failed payments',4,'Failed payments','Need a follow-up','#attention-payments'],
    ['03 Resignations',2,'Resignations','Ready to process','#attention-resignations'],
    ['04 Unassigned tasks',0,'Unassigned tasks','Awaiting an owner','']
  ].slice(0,Number(document.body.dataset.attentionExampleCount || 4));
  if(document.body.classList.contains('home-preview')) {
    rows.splice(0,rows.length,
      ['01 Change Requests',2,'Change Requests','Pending Review','#attention-payments'],
      ['02 Applications',4,'Applications','Waiting Review','#attention-applications'],
      ['03 Resignations',0,'Resignations','Pending','#attention-resignations']);
  }
  const ids = rows.map((_,i) => '00000000-0000-4000-8000-' + String(i+1).padStart(12,'0'));
  window.fetch = async (input, options = {}) => {
    if (options.signal?.aborted) throw new DOMException('Aborted','AbortError');
    const url = new URL(input,'https://example.invalid');
    let data;
    if (url.pathname.endsWith('/api/DocumentSummary/_execute')) {
      const request = JSON.parse(options.body);
      if (request.OperationName === 'FindByPath') data = {Result:{DocumentId:folderId}};
      else if (request.OperationName === 'FindDocumentsInFolder') data = {Result:{$values:rows.map((row,i) => ({Name:row[0],DocumentTypeId:'IQD',DocumentVersionId:ids[i]})).reverse()}};
    } else if (url.pathname.endsWith('/api/iqa')) {
      const index = ids.indexOf(url.searchParams.get('QueryDocumentVersionKey'));
      if (index >= 0) data = {TotalCount:1,Items:{$values:[{Properties:{$values:['Count','Header','Label','Link'].map((name,i)=>({Name:name,Value:rows[index][i+1]}))}}]}};
    }
    if (!data) throw Error('No network requests are allowed in this offline example.');
    return {ok:true,status:200,json:async()=>data};
  };
})();
