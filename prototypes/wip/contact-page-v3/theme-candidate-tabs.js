/* ==========================================================================
   CONTACT PAGE v3 — THEME CANDIDATE: US-NATIVE-TABS 1.1 (not installed)
   Replaces the US-NATIVE-TABS block in Theme/UnionSuite/zUnionSuite.js.
   Generated from the theme block; the only changes are label() (the picker
   names the open tab while the tab list is not rendered), its call in
   update() and the version. Open decision 5: the "Sections: …" label moves
   here from US-CCO-RAIL-COLLAPSE and US-CCO-SIDEBAR. Loaded BEFORE
   zUnionSuite.js so the theme's own copy returns early.
   ========================================================================== */

/* US-NATIVE-TABS:START */
// Native iMIS remains responsible for selection, keyboard handling and postbacks.
(() => {
  if (window.UnionSuiteTabs) return;
  // Telerik can transfer focus during pointer activation. Keep that focus
  // distinct from keyboard navigation even when :focus-visible is retained.
  document.addEventListener('pointerdown', event => {
    if(event.target.closest?.('.RadTabStrip,.RadTabStripVertical')) document.documentElement.setAttribute('data-us-tabs-pointer','');
    else document.documentElement.removeAttribute('data-us-tabs-pointer');
  },true);
  document.addEventListener('keydown', event => {
    if(!['Shift','Control','Alt','Meta'].includes(event.key)) document.documentElement.removeAttribute('data-us-tabs-pointer');
  },true);
  const entries = new Map();
  let queued = false;
  const mobile = window.matchMedia('(max-width:600px)');
  const disabled = tab => tab.matches('.rtsDisabled,[aria-disabled="true"],[disabled]') || tab.closest('[aria-disabled="true"]');
  function attribute(node, name, value) { if (node.getAttribute(name) !== value) node.setAttribute(name,value); }
  function edges(entry) {
    const level = entry.level;
    attribute(level,'data-more-left',String(level.scrollLeft > 2));
    attribute(level,'data-more-right',String(level.scrollWidth-level.clientWidth-level.scrollLeft > 2));
  }
  function update(entry, reveal) {
    const tabs = [...entry.list.querySelectorAll(':scope > .rtsLI > .rtsLink[role="tab"]')];
    const selected = tabs.find(tab => tab.classList.contains('rtsSelected'));
    if (entry.picker) {
      const signature = tabs.map(tab => tab.textContent.trim()).join('\u0000');
      if (entry.signature !== signature || tabs.some((tab,i) => entry.tabs[i] !== tab)) {
        entry.options.replaceChildren();
        entry.buttons = tabs.map(tab => {
          const button = document.createElement('button');
          button.type = 'button'; button.textContent = tab.textContent.trim();
          button.addEventListener('click', () => {
            if (!tab.isConnected || disabled(tab)) return;
            entry.picker.open = false;
            tab.click(); // Invoke the existing control; never switch panels ourselves.
            if (tab.isConnected) tab.focus({preventScroll:true});
            schedule();
          });
          entry.options.append(button); return button;
        });
        entry.signature = signature;
      }
      entry.buttons.forEach((button,i) => {
        const unavailable = !!disabled(tabs[i]);
        if (button.disabled !== unavailable) button.disabled = unavailable;
        attribute(button,'aria-current',String(tabs[i] === selected));
      });
      if (!mobile.matches) entry.picker.open = false;
      label(entry, selected);
    }
    entry.tabs = tabs;
    if (mobile.matches && selected && (reveal || selected !== entry.selected)) {
      const box = entry.level.getBoundingClientRect(), item = selected.getBoundingClientRect();
      if (item.left < box.left+16) entry.level.scrollLeft -= box.left+16-item.left;
      else if (item.right > box.right-16) entry.level.scrollLeft += item.right-box.right+16;
    }
    entry.selected = selected;
    edges(entry);
  }
  // The picker names the open tab ("Sections: Finance") whenever it is the
  // only way to reach the tabs: the tab list is not rendered, as in a
  // collapsed us-cco-collapsible rail or a us-cco-rail phone layout. Beside
  // visible tabs it offers "All sections". Counts are drawn with ::after, so
  // the tab text holds only the label.
  function label(entry, selected) {
    const name = selected ? (selected.querySelector('.rtsTxt') || selected).textContent.trim() : '';
    const text = name && !entry.level.getClientRects().length ? 'Sections: ' + name : 'All sections';
    if (entry.summary.textContent !== text) entry.summary.textContent = text;
  }
  function remove(entry) {
    entry.picker?.remove(); entry.resize?.disconnect();
    entry.level.removeEventListener('scroll',entry.scroll);
    entry.level.removeAttribute('data-more-left'); entry.level.removeAttribute('data-more-right');
    entries.delete(entry.strip);
  }
  function refresh(reveal = false) {
    for (const entry of entries.values()) if (!entry.strip.isConnected || !entry.strip.contains(entry.list)) remove(entry);
    document.querySelectorAll('.RadTabStrip,.RadTabStripVertical').forEach(strip => {
      if (entries.has(strip)) return;
      const level = strip.querySelector(':scope > .rtsLevel');
      const list = level?.querySelector(':scope > .rtsUL[role="tablist"]');
      if (!list) return;
      const entry = {strip,level,list,tabs:[],buttons:[]};
      entries.set(strip,entry);
      if (strip.classList.contains('RadTabStripVertical')) {
        const picker = document.createElement('details'); picker.className = 'us-tab-sections';
        const summary = document.createElement('summary'); summary.textContent = 'All sections';
        const options = document.createElement('div'); options.className = 'us-tab-section-options';
        picker.append(summary,options); strip.prepend(picker);
        Object.assign(entry,{picker,summary,options});
        picker.addEventListener('keydown',event => { if (event.key === 'Escape') {event.preventDefault();picker.open=false;summary.focus();} });
      }
      entry.scroll = () => edges(entry);
      level.addEventListener('scroll',entry.scroll,{passive:true});
      if (window.ResizeObserver) {entry.resize=new ResizeObserver(() => update(entry,true));entry.resize.observe(level);}
    });
    entries.forEach(entry => update(entry,reveal));
  }
  function schedule() {if (!queued) {queued=true;requestAnimationFrame(() => {queued=false;refresh();});}}
  function start() {
    refresh(true);
    new MutationObserver(records => {
      if (records.some(record => !record.target.closest?.('.us-tab-sections'))) schedule();
    }).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','aria-selected','aria-disabled','disabled']});
    document.addEventListener('click',event => entries.forEach(entry => {if(entry.picker && !entry.picker.contains(event.target)) entry.picker.open=false;}));
    window.addEventListener('resize',() => refresh(true));
    window.addEventListener('pageshow',() => refresh(true));
    if (window.Sys?.Application) window.Sys.Application.add_load(schedule);
  }
  window.UnionSuiteTabs = {version:'1.1',refresh:() => refresh(true)};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
/* US-NATIVE-TABS:END */
