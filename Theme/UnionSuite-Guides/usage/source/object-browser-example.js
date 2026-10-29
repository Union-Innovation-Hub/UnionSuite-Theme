// Offline simulation only. Production retains Telerik resizing and iMIS handlers.
(() => {
  const appearance = document.getElementById('object-browser-appearance');
  const sync = () => { appearance.value = window.UnionSuiteAppearance.getState().preference || 'system'; };
  appearance.addEventListener('change',() => window.UnionSuiteAppearance.setPreference(appearance.value));
  window.addEventListener('unionsuite:appearancechange',sync); sync();
  const viewport = document.querySelector('.object-browser-example__viewport');
  const owner = viewport.querySelector('.ObjectBrowserWrapper');
  const original = owner.innerHTML;
  const status = text => { document.getElementById('object-browser-status').textContent = text; };
  function resize() {
    const width = Math.max(620,viewport.clientWidth), tree = Math.min(300,Math.round(width*.24));
    owner.style.width = width+'px';
    owner.querySelector('[id$="_RadPaneTree"] > div').style.width = tree+'px';
    owner.querySelectorAll('[id^="RAD_SPLITTER_PANE_CONTENT_"]:not([id$="_RadPaneTree"]),[id$="_RadSplitterContent"]').forEach(node => { node.style.width = (width-tree-8)+'px'; });
  }
  function closeMenus() {
    owner.querySelectorAll('.rmSlide').forEach(node => { node.style.display = 'none'; });
    owner.querySelectorAll('.rmExpanded').forEach(node => node.classList.remove('rmExpanded'));
  }
  function selectRow(row) {
    owner.querySelectorAll('.ObjectBrowserContentItem').forEach(node => { node.classList.toggle('selected',node===row);node.tabIndex = node===row ? 0 : -1; });
    status('Selected '+row.querySelector('.ObjectBrowserContentListName').textContent.trim()+'. Preview only.');
  }
  owner.addEventListener('click',event => {
    const link = event.target.closest('.rmLink');
    if(link) {
      event.preventDefault();
      if(link.classList.contains('rmDisabled'))return;
      const slide = link.parentElement.querySelector(':scope > .rmSlide'), open = link.classList.contains('rmExpanded');
      closeMenus();
      if(slide && !open) {
        link.classList.add('rmExpanded');Object.assign(slide.style,{display:'block',height:'auto',visibility:'visible',overflow:'visible',top:'100%'});
        Object.assign(slide.querySelector('.rmGroup').style,{top:'0',visibility:'visible'});
      } else status(link.textContent.trim()+': preview only; no live command runs.');
      return;
    }
    closeMenus();
    const row = event.target.closest('.ObjectBrowserContentItem');
    if(row)selectRow(row);
    const treeNode = event.target.closest('.rtTop,.rtMid,.rtBot');
    if(treeNode) {
      owner.querySelectorAll('.rtSelected').forEach(node => node.classList.remove('rtSelected'));
      treeNode.classList.add('rtSelected');status('Selected '+treeNode.textContent.trim()+'. Folder contents are a static example.');
    }
  });
  owner.addEventListener('keydown',event => {
    if(event.key==='Escape') { closeMenus();return; }
    const row = event.target.closest('.ObjectBrowserContentItem');
    if(row && ['Enter',' '].includes(event.key)) { event.preventDefault();selectRow(row); }
  });
  owner.addEventListener('input',event => {
    if(!event.target.id.endsWith('_ObjectQuickFindTextBox'))return;
    const term=event.target.value.toLowerCase();
    owner.querySelectorAll('.ObjectBrowserContentItem').forEach(row => { row.hidden=!row.textContent.toLowerCase().includes(term); });
  });
  document.getElementById('object-browser-replace').addEventListener('click',() => {owner.innerHTML=original;resize();status('Native markup replaced; dark styling still applies.');});
  window.addEventListener('resize',resize);resize();
})();
