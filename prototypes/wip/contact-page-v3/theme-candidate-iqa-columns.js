/* ==========================================================================
   CONTACT PAGE v3 — THEME CANDIDATE: US-IQA-COLUMNS 1.5 (not installed)
   Replaces the US-IQA-COLUMNS block in Theme/UnionSuite/zUnionSuite.js.
   Generated from the theme block by make-iqa-columns (scratch); the only
   changes are fitPanelWidth, entry.base/userSized, the word-width floor
   (wordWidth, entry.floor) and the version. Loaded BEFORE zUnionSuite.js so
   the theme's own copy returns early.
   ========================================================================== */

/* US-IQA-COLUMNS:START — single-table native grids; no query or sort replacement. */
(function () {
  'use strict';
  if (window.UnionSuiteIqaColumns) return;
  const entries = new Map(), widths = new Map(), observed = new Set();
  const resizeObserver = window.ResizeObserver ? new ResizeObserver(()=>schedule()) : null;
  const canvas = document.createElement('canvas');
  let queued = false, manager;
  function isId(title) { return /(^|[\s_-])ids?($|[\s_-])/i.test(title.trim()); }
  function rememberStyle(node) { return {node, value: node.getAttribute('style')}; }
  function restoreStyle(saved) { if(saved.value === null) saved.node.removeAttribute('style'); else saved.node.setAttribute('style',saved.value); }
  function dispose(entry) {
    entry.stop?.(); entry.resize?.disconnect();
    entry.handles.forEach(n=>n.remove());
    entry.marked.forEach(n=>n.removeAttribute('data-us-iqa-id-cell'));
    entry.saved.forEach(restoreStyle);
    entry.table.removeAttribute('data-us-iqa-column-table');
    entry.grid.removeAttribute('data-us-iqa-columns');
    entries.delete(entry.table);
  }
  function minWidth(cells) {
    const ctx=canvas.getContext('2d');
    return Math.ceil(Math.max(48,...cells.map(cell=>{
      const s=getComputedStyle(cell);ctx.font=s.font || `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
      let text=cell.textContent.replace(/\s+/g,' ').trim();
      if(s.textTransform==='uppercase')text=text.toUpperCase();
      return ctx.measureText(text).width + Math.max(0,text.length-1)*(parseFloat(s.letterSpacing)||0) + (parseFloat(s.paddingLeft)||0) + (parseFloat(s.paddingRight)||0) + 4;
    })));
  }
  // Candidate 1.5: the narrowest a fitted column may go. Short values (dates,
  // amounts, codes, statuses: up to 140px with padding) stay on one line;
  // longer text wraps between words, never mid-word. Phones had squeezed six
  // columns to ~64px, breaking "PAY-8821" per character and dates over four
  // lines. Below the floors the table keeps its width and the grid scrolls
  // sideways.
  const SHORT_VALUE = 140;
  function wordWidth(cells) {
    const ctx=canvas.getContext('2d');
    // Sets the canvas font for one element; measure again after another call.
    const measurer=s=>{
      ctx.font=s.font || `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
      const spacing=parseFloat(s.letterSpacing)||0;
      return value=>{
        const text=s.textTransform==='uppercase'?value.toUpperCase():value;
        return ctx.measureText(text).width+Math.max(0,text.length-1)*spacing;
      };
    };
    const edges=s=>['paddingLeft','paddingRight','borderLeftWidth','borderRightWidth'].reduce((sum,name)=>sum+(parseFloat(s[name])||0),0);
    return Math.ceil(Math.max(0,...cells.map(cell=>{
      const s=getComputedStyle(cell);
      const measure=measurer(s);
      const text=cell.textContent.replace(/\s+/g,' ').trim();
      const padding=(parseFloat(s.paddingLeft)||0)+(parseFloat(s.paddingRight)||0)+4;
      const widest=Math.max(0,...text.split(' ').map(measure))+padding;
      const whole=Math.min(measure(text)+padding,SHORT_VALUE);
      // A short badge or button stays on one line: its own font, padding,
      // border and leading icon must fit, not only the cell's words.
      const boxes=Array.from(cell.querySelectorAll('.us-badge, .TextButton')).map(box=>{
        const b=getComputedStyle(box);
        const label=box.textContent.replace(/\s+/g,' ').trim();
        const width=label?measurer(b)(label):0;
        if(!label||width>SHORT_VALUE)return 0;
        const icon=getComputedStyle(box,'::before');
        const iconWidth=icon.content&&icon.content!=='none'&&icon.display!=='none'?(parseFloat(icon.width)||0)+(parseFloat(b.columnGap)||0):0;
        return width+edges(b)+iconWidth+padding;
      });
      return Math.max(widest,whole,...boxes);
    })));
  }
  function apply(entry) {
    const scroll = entry.table.parentElement;
    const expanded = !!scroll?.classList.contains('us-iqa-data-scroll');
    if (expanded !== entry.expanded) {
      // Full-window sizing must not overwrite the normal panel's column widths.
      entry.layouts[entry.expanded ? 'expanded' : 'panel'] = entry.values.slice();
      entry.values = (entry.layouts[expanded ? 'expanded' : 'panel'] || entry.values).slice();
      entry.expanded = expanded;
    }
    const rows=Array.from(entry.table.tBodies).flatMap(body=>Array.from(body.rows)).filter(row=>row.matches('.rgRow,.rgAltRow')&&row.cells.length===entry.headers.length&&Array.from(row.cells).every(c=>c.colSpan===1&&c.rowSpan===1));
    entry.headers.forEach((head,i)=>{
      // Keep native indexes: hidden columns still have header/cell/col nodes.
      if(!entry.resizable[i])return;
      const cells=[head,...rows.map(row=>row.cells[i]).filter(Boolean)];
      entry.minimum[i]=entry.ids[i]?minWidth(cells):48;
      entry.floor[i]=Math.max(entry.minimum[i],wordWidth(cells));
      if(entry.ids[i])cells.forEach(cell=>{if(!entry.marked.has(cell)){entry.marked.add(cell);cell.setAttribute('data-us-iqa-id-cell','');}});
      entry.values[i]=Math.max(entry.values[i],entry.minimum[i]);
    });
    if (expanded) fillExpandedWidth(entry, scroll.clientWidth);
    else if (!entry.userSized) fitPanelWidth(entry, entry.grid.clientWidth);
    entry.headers.forEach((head, i) => {
      if (!entry.resizable[i]) return;
      head.style.width=entry.values[i]+'px';
      if(entry.cols[i])entry.cols[i].style.width=entry.values[i]+'px';
      entry.handles[i].setAttribute('aria-valuenow',String(Math.round(entry.values[i])));
      entry.handles[i].setAttribute('aria-valuemin',String(entry.minimum[i]));
    });
    const total=entry.values.reduce((sum,value,i)=>sum+(entry.visible[i]?value:0),0);
    entry.table.style.tableLayout='fixed';entry.table.style.width=total+'px';entry.table.style.minWidth=total+'px';
  }
  function fillExpandedWidth(entry, available) {
    const total = entry.values.reduce((sum, value, i) => sum + (entry.visible[i] ? value : 0), 0);
    const extra = available - total;
    if (extra <= 0) return; // Wider reports retain their widths and scroll.
    // Leave native utility/hidden columns alone. During a drag or keyboard
    // resize, distribute spare space to the other data columns first.
    let flexible = entry.resizable.map((resizable, i) => resizable && i !== entry.resizing);
    if (!flexible.some(Boolean)) flexible = entry.resizable;
    const weight = entry.values.reduce((sum, value, i) => sum + (flexible[i] ? value : 0), 0);
    if (!weight) return;
    entry.values = entry.values.map((value, i) => flexible[i] ? value + extra * value / weight : value);
  }
  // Candidate 1.4: until the user resizes a column, panel-mode columns share
  // the grid's available width in proportion to their natural widths (never
  // below each column's floor), so a report that narrows or widens after
  // load - window resize, a collapsible CCO rail - refits instead of keeping
  // its load-time width and scrolling. User-sized widths are kept as before.
  function fitPanelWidth(entry, available) {
    if (!available) return;
    const fixed = entry.values.reduce((sum, value, i) => sum + (entry.visible[i] && !entry.resizable[i] ? value : 0), 0);
    const values = entry.values.slice();
    const free = entry.resizable.slice();
    // Columns that hit their floor are locked; the rest share what is left.
    for (let pass = 0; pass < entry.values.length; pass++) {
      const weight = entry.base.reduce((sum, value, i) => sum + (free[i] ? value : 0), 0);
      if (!weight) break;
      const locked = values.reduce((sum, value, i) => sum + (entry.resizable[i] && !free[i] ? value : 0), 0);
      const share = Math.max(0, available - fixed - locked);
      let clamped = false;
      free.forEach((open, i) => {
        if (!open) return;
        const value = share * entry.base[i] / weight;
        if (value < entry.floor[i]) {
          values[i] = entry.floor[i];
          free[i] = false;
          clamped = true;
        } else {
          values[i] = value;
        }
      });
      if (!clamped) break;
    }
    entry.values = values;
  }
  function attach(table,grid) {
    const heads=Array.from(table.tHead?.rows||[]);
    if(heads.length!==1)return;
    const headers=Array.from(heads[0].cells);
    if(!headers.length||headers.some(h=>h.colSpan!==1||h.rowSpan!==1))return;
    const visible=headers.map(h=>h.getBoundingClientRect().width>0);
    // Expand/collapse is a native utility column: retain its measured slot and
    // native width, but do not add a resize target or a data-column minimum.
    const resizable=headers.map((head,i)=>visible[i]&&!head.classList.contains('rgExpandCol'));
    // A hidden column is normal native IQA markup; only defer an entirely hidden table.
    if(!visible.some(Boolean))return;
    const rows=Array.from(table.tBodies).flatMap(b=>Array.from(b.rows)).filter(r=>r.matches('.rgRow,.rgAltRow'));
    if(rows.some(r=>r.cells.length!==headers.length||Array.from(r.cells).some(c=>c.colSpan!==1||c.rowSpan!==1)))return;
    const cols=Array.from(table.querySelectorAll(':scope > colgroup > col'));
    if(cols.length && (cols.length!==headers.length||cols.some(c=>c.span!==1)))return;
    // Leave a Telerik-native resize implementation in control when already present.
    if(grid.querySelector('.rgResizeCol')||grid.querySelector('[class*="rgResizeHandle"]'))return;
    const labels=headers.map(h=>h.textContent.replace(/\s+/g,' ').trim());
    const query=grid.closest('[data-us-iqa-native],.us-report,.SearchContactsClass')?.querySelector('select[id$="_querySelectDropdown"]')?.value||'';
    const key=(table.id||grid.id)+'|'+query+'|'+labels.join('|');
    const cached=widths.get(key);
    const entry = {
      table, grid, headers, cols, key, visible, resizable,
      ids: labels.map((label, i) => resizable[i] && isId(label)),
      values: headers.map((head, i) => resizable[i] && cached?.[i] != null ? cached[i] : head.getBoundingClientRect().width),
      expanded: false,
      userSized: !!cached,
      layouts: { expanded: widths.get(key + '|expanded') },
      minimum: [], floor: [], handles: [], marked: new Set(),
      saved: [rememberStyle(table),
        ...headers.filter((head, i) => resizable[i]).map(rememberStyle),
        ...cols.filter((col, i) => resizable[i]).map(rememberStyle)]
    };
    entry.base = entry.values.slice();
    entries.set(table,entry);table.setAttribute('data-us-iqa-column-table','');grid.setAttribute('data-us-iqa-columns','');
    headers.forEach((head,i)=>{
      if(!resizable[i])return;
      const handle=document.createElement('span');handle.className='us-iqa-column-resizer';handle.tabIndex=0;
      handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','vertical');handle.setAttribute('aria-label','Resize '+labels[i]+' column');
      handle.title='Drag to resize; Left/Right arrows adjust width; Home fits content';
      const guide=()=>handle.style.setProperty('--us-resize-guide-height',Math.max(head.offsetHeight,table.getBoundingClientRect().bottom-head.getBoundingClientRect().top)+'px');
      handle.addEventListener('pointerenter',guide);handle.addEventListener('focus',guide);
      const change = value => {
        entry.values[i] = Math.max(entry.minimum[i], value);
        if (!entry.expanded) entry.userSized = true;
        entry.resizing = i;
        apply(entry);
        entry.resizing = undefined;
        widths.set(key + (entry.expanded ? '|expanded' : ''), entry.values.slice());
      };
      handle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});
      handle.addEventListener('keydown',e=>{
        if(!['ArrowLeft','ArrowRight','Home'].includes(e.key))return;e.preventDefault();e.stopPropagation();
        const rtl=getComputedStyle(table).direction==='rtl'?-1:1;
        const currentCells=Array.from(table.tBodies).flatMap(b=>Array.from(b.rows)).filter(r=>r.matches('.rgRow,.rgAltRow')&&r.cells.length===headers.length).map(r=>r.cells[i]);
        change(e.key==='Home'?minWidth([head,...currentCells]):entry.values[i]+(e.key==='ArrowRight'?1:-1)*rtl*(e.shiftKey?40:10));
      });
      handle.addEventListener('pointerdown',e=>{
        if(e.button!==0)return;e.preventDefault();e.stopPropagation();entry.stop?.();
        const start=e.clientX,initial=entry.values[i],rtl=getComputedStyle(table).direction==='rtl'?-1:1;
        guide();handle.setAttribute('data-us-resizing','');handle.setPointerCapture(e.pointerId);
        const move=event=>change(initial+(event.clientX-start)*rtl);
        const stop=()=>{handle.removeAttribute('data-us-resizing');handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',stop);handle.removeEventListener('pointercancel',stop);handle.removeEventListener('lostpointercapture',stop);if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);entry.stop=null;};
        entry.stop=stop;handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',stop);handle.addEventListener('pointercancel',stop);handle.addEventListener('lostpointercapture',stop);
      });
      head.appendChild(handle);entry.handles[i]=handle;
    });
    apply(entry);
  }
  function refresh() {
    queued=false;
    for(const grid of observed){if(!grid.isConnected){resizeObserver.unobserve(grid);observed.delete(grid);}}
    for(const entry of entries.values()){
      if(!entry.table.isConnected||entry.table.closest('.us-report-no-styling'))dispose(entry);else apply(entry);
    }
    document.querySelectorAll(':is([data-us-iqa-native],.us-report,.SearchContactsClass):not(.us-report-no-styling) [data-gridid] :is(.RadGrid > table.rgMasterTable, .RadGrid > .us-iqa-data-scroll > table.rgMasterTable)').forEach(table=>{
      const grid = table.closest('.RadGrid');
      if(resizeObserver&&!observed.has(grid)){observed.add(grid);resizeObserver.observe(grid);}
      if(!entries.has(table)&&!table.closest('.us-report-no-styling'))attach(table,grid);
    });
    const next=window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
    if(next&&next!==manager){manager=next;manager.add_pageLoading?.(()=>Array.from(entries.values()).forEach(dispose));manager.add_endRequest(schedule);}
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(refresh);}}
  window.UnionSuiteIqaColumns = {
    version: '1.5-candidate',
    refresh: options => options?.immediate ? refresh() : schedule(),
    isIdColumn: isId
  };
  function start(){schedule();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});document.fonts?.ready.then(schedule);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('resize',schedule);window.addEventListener('pageshow',schedule);
})();
/* US-IQA-COLUMNS:END */
