// Config-only editor. No storage, network, production adapters or file writes.
(function () {
  'use strict';
  const doc = document;
  const $ = id => doc.getElementById(id);
  const {tokens, scopes} = JSON.parse($('config-data').textContent);
  const catalogue = new Map(tokens.map(token => [token.name,token]));
  const overrides = new Map();
  const fields = new Map();
  const seeds = [
    ['--seed-primary','Primary','Links and dark brand surfaces'],
    ['--seed-primary-light','Primary light','Lighter shades in the brand palette'],
    ['--seed-accent','Accent','Buttons, highlights and tab selection'],
    ['--seed-accent-alt','Alternate accent','Secondary accent in the palette'],
    ['--seed-neutral','Neutral','Body text, borders and grey surfaces']
  ];
  const frames = [...doc.querySelectorAll('[data-theme-preview]')];
  const frameSources = new Map(frames.map(frame=>[frame,frame.getAttribute('srcdoc')]));
  const canvas=doc.createElement('canvas');canvas.width=canvas.height=1;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  let css='', scheduled=false, timer;
  function announce(message) { $('config-status').textContent=message;clearTimeout(timer);timer=setTimeout(()=>$('config-status').textContent='',5000); }
  function element(tag, className, text) { const node=doc.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node; }
  function resolve(name, values=overrides, seen=new Set()) {
    if(seen.has(name)) throw Error('This value creates a circular token reference.');
    const token=catalogue.get(name);
    if(!token) throw Error('Use a token listed in this editor.');
    const next=new Set(seen);next.add(name);
    let value=values.has(name)?values.get(name):token.value;
    // Theme aliases use simple var references; nested CSS functions are retained.
    value=value.replace(/var\(\s*(--[\w-]+)(?:\s*,[^()]*)?\)/g,(_,key)=>resolve(key,values,next));
    if(/var\(/i.test(value)) throw Error('Use a named token without a nested fallback.');
    return value;
  }
  const properties={colour:'color',time:'transition-duration',easing:'transition-timing-function',font:'font-family',weight:'font-weight',lineHeight:'line-height',shadow:'box-shadow'};
  function validResolved(token,value) {
    if(token.type==='integer') return /^\d+$/.test(value);
    if(token.type==='number') return /^\d+(?:\.\d+)?$/.test(value);
    if(token.type==='length') {
      const property=/row-padding|banner-padding/.test(token.name)?'padding':token.name==='--banner-gap'?'gap':'padding-top';
      return CSS.supports(property,value);
    }
    return CSS.supports(properties[token.type],value);
  }
  // A token that already fails without this edit must not be blamed on it.
  function broken(token,values) { try {return !validResolved(token,resolve(token.name,values));} catch(error) {return true;} }
  function validate(name,value) {
    // Custom properties accept almost any text; validate their actual CSS use.
    if(/[;{}<>@!\\]|\/\*|url\s*\(|env\s*\(/i.test(value)||/^(inherit|initial|unset|revert(?:-layer)?)$/i.test(value)) throw Error('Enter a CSS value, not a declaration or rule.');
    const candidate=new Map(overrides);if(value)candidate.set(name,value);else candidate.delete(name);
    const edited=catalogue.get(name);
    if(!validResolved(edited,resolve(name,candidate))) throw Error('Enter a valid '+edited.type.replace('lineHeight','line height')+' value.');
    for(const token of tokens) {
      if(token.name===name||!broken(token,candidate)||broken(token,overrides)) continue;
      throw Error('This would make '+token.name+' invalid.');
    }
  }
  function hex(value) {
    if(!context) return '#000000';
    context.clearRect(0,0,1,1);context.fillStyle=value;context.fillRect(0,0,1,1);
    return '#'+[...context.getImageData(0,0,1,1).data].slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('');
  }
  function seedHex(value) { const match=value.trim().match(/^#?([\da-f]{6}|[\da-f]{3})$/i);return match?'#'+(match[1].length===3?[...match[1]].map(c=>c+c).join(''):match[1]).toLowerCase():null; }
  function clearError(field) {field.input.removeAttribute('aria-invalid');field.input.setCustomValidity('');field.error.textContent='';}
  function setValue(name,value) {
    const field=fields.get(name);
    try {
      validate(name,value);
      if(value)overrides.set(name,value);else overrides.delete(name);
      clearError(field);schedule();return true;
    } catch(error) {
      field.input.setAttribute('aria-invalid','true');field.input.setCustomValidity(error.message);
      field.error.textContent=error.message+' Keeping the last valid preview.';return false;
    }
  }
  function labelFor(token) {return token.name.replace(/^--(?:iqa-|banner-|us-actions-)?/,'').replace(/-/g,' ').replace(/^./,c=>c.toUpperCase());}
  for(const [name,label,description] of seeds) {
    const card=element('div','seed-card');const id=name.slice(2);
    const title=element('label','',label);title.htmlFor=id+'-picker';card.append(title,element('span','seed-description',description));
    const picker=element('input');picker.type='color';picker.id=id+'-picker';picker.setAttribute('aria-label',label+' colour');card.append(picker);
    const wrap=element('div','seed-hex');wrap.append(element('span','','HEX'));
    const input=element('input');input.type='text';input.id=id+'-hex';input.spellcheck=false;input.autocomplete='off';input.maxLength=7;input.setAttribute('aria-label',label+' hex');input.setAttribute('aria-describedby',id+'-error');wrap.append(input);card.append(wrap);
    const error=element('p','field-error');error.id=id+'-error';error.setAttribute('aria-live','polite');card.append(error);$('seed-grid').append(card);
    fields.set(name,{input,picker,error,card,seed:true});
    input.addEventListener('input',()=>{const colour=seedHex(input.value);if(!colour){input.setAttribute('aria-invalid','true');input.setCustomValidity('Enter a 3- or 6-digit hex colour.');error.textContent='Use a 3- or 6-digit hex colour. Keeping the last valid preview.';return;}setValue(name,colour);});
    input.addEventListener('blur',()=>{if(!input.hasAttribute('aria-invalid')) input.value=hex(resolve(name));});
    picker.addEventListener('input',()=>{input.value=picker.value;setValue(name,picker.value);});
  }
  const groups=new Map();
  for(const token of tokens.filter(token=>!token.name.startsWith('--seed-'))) {
    if(!groups.has(token.group)) {
      const group=element('details','token-group');const summary=element('summary','',token.group);const count=element('small');summary.append(count);const list=element('div','token-list');group.append(summary,list);$('token-groups').append(group);groups.set(token.group,{group,list,count});
    }
    const {list}=groups.get(token.group);const card=element('div','token-field');const id='token-'+token.name.slice(2);
    const label=element('label','',labelFor(token));label.htmlFor=id;card.append(label,element('code','',token.name));
    const row=element('div','token-value');let picker;
    if(token.type==='colour') {picker=element('input');picker.type='color';picker.setAttribute('aria-label',labelFor(token)+' colour');row.append(picker);picker.addEventListener('input',()=>{input.value=picker.value;setValue(token.name,picker.value);});}
    const input=element('input');input.type='text';input.id=id;input.autocomplete='off';input.spellcheck=false;input.setAttribute('aria-describedby',id+'-default '+id+'-error');row.append(input);
    const reset=element('button','token-reset','↶');reset.type='button';reset.setAttribute('aria-label','Reset '+token.name);reset.title='Use theme default';reset.addEventListener('click',()=>{if(setValue(token.name,''))input.value='';});row.append(reset);card.append(row);
    const source=element('p','token-default','Default: '+token.value);source.id=id+'-default';card.append(source);
    const error=element('p','field-error');error.id=id+'-error';error.setAttribute('aria-live','polite');card.append(error);list.append(card);
    fields.set(token.name,{input,picker,error,card,reset,token});input.addEventListener('input',()=>setValue(token.name,input.value.trim()));
  }
  for(const name of ['--teal-950','--teal-900','--teal-800','--teal-700','--teal-600','--teal-500','--teal-400','--teal-300','--teal-100','--teal-50','--accent-600','--accent-500','--neutral-600']) {
    const swatch=element('span');swatch.style.setProperty('--swatch','var('+name+')');swatch.title=name;$('palette-strip').append(swatch);
  }
  function filterTokens() {
    const search=$('token-search').value.toLowerCase().trim();const changed=$('only-changed').checked;let total=0;
    for(const [name,{group,count}] of groups) {
      let visible=0;
      for(const [key,field] of fields) {if(field.seed||field.token.group!==name)continue;
        const matches=(!changed||overrides.has(key))&&search.split(/\s+/).every(term=>(key+' '+name+' '+labelFor(field.token)).toLowerCase().includes(term));
        field.card.hidden=!matches;if(matches)visible++;
      }
      group.hidden=!visible;count.textContent=visible+' settings';if(search||changed)group.open=!!visible;total+=visible;
    }
    $('token-result').textContent=total?total+' settings'+(search||changed?' match your filter':' available when you need them'):'No settings match. Try another search or clear the filter.';
  }
  $('token-search').addEventListener('input',filterTokens);$('only-changed').addEventListener('change',filterTokens);
  function inject(target) {
    if(!target?.head) return;
    let style=target.getElementById('us-config-overrides');
    if(!style){style=target.createElement('style');style.id='us-config-overrides';target.head.append(style);}
    style.textContent=css;
  }
  function buildCss() {
    const blocks=[];
    for(const [scope,selector] of Object.entries(scopes)) {
      const entries=tokens.filter(token=>token.scope===scope&&overrides.has(token.name));
      if(entries.length)blocks.push(selector+' {\n'+entries.map(token=>'  '+token.name+': '+overrides.get(token.name)+';').join('\n')+'\n}');
    }
    return blocks.join('\n\n');
  }
  function update() {
    scheduled=false;css=buildCss();inject(doc);frames.forEach(frame=>inject(frame.contentDocument));
    let advancedCount=0;
    for(const [name,field] of fields) {
      const current=resolve(name);const changed=overrides.has(name);
      if(field.picker)field.picker.value=hex(current);
      if(field.seed){if(doc.activeElement!==field.input&&!field.input.hasAttribute('aria-invalid'))field.input.value=hex(current);}
      else {
        advancedCount+=Number(changed);field.card.classList.toggle('is-overridden',changed);
        field.input.placeholder=field.token.type==='colour'?hex(current):current;
        field.reset.disabled=!changed&&!field.input.value;
        if(doc.activeElement!==field.input&&!field.input.hasAttribute('aria-invalid'))field.input.value=overrides.get(name)||'';
      }
    }
    doc.querySelectorAll('[data-choice-token]').forEach(select=>{const value=overrides.get(select.dataset.choiceToken)||'';select.value=[...select.options].some(option=>option.value===value)?value:'custom';});
    $('change-count').textContent=overrides.size?overrides.size+' custom '+(overrides.size===1?'value':'values')+' · preview updated':'Using theme defaults';
    $('override-count').textContent=advancedCount+' '+(advancedCount===1?'override':'overrides');
    $('css-code').textContent=css||'/* Using theme defaults. */';filterTokens();
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
  function reset(filter) {
    for(const [name,field] of fields) if(filter(field)){overrides.delete(name);clearError(field);field.input.value='';}
    update();
  }
  $('reset-seeds').addEventListener('click',()=>{reset(field=>field.seed);announce('Five brand colours reset. Individual overrides are still applied.');});
  $('reset-overrides').addEventListener('click',()=>{reset(field=>!field.seed);announce('Overrides cleared. Components follow the brand colours again.');});
  function behaviour(frame) {
    const target=frame.contentDocument;if(!target?.body)return;
    if(frame.id==='config-overview') {
      target.querySelectorAll('.us-banner').forEach(banner=>{banner.classList.toggle('us-banner-sticky',$('banner-mode').value==='sticky');banner.classList.toggle('us-banner-collapsible',$('banner-mode').value==='collapse');});
      frame.contentWindow.UnionSuiteBanners?.refresh();
    }
    if(frame.id==='report-demo') {
      const report=target.getElementById('sample-report');if(report){report.classList.toggle('us-filters-collapsed',$('filter-mode').value==='closed');report.classList.toggle('us-report-expandable',$('report-expand').checked);}
      frame.contentWindow.UnionSuiteIqaFilters?.refresh();
    }
  }
  function prepare(frame) {
    const target=frame.contentDocument;if(!target?.body?.children.length)return;
    // Recover the intended fixture if an old preview navigated to the editor.
    if(target.getElementById('config-data')){frame.srcdoc=frameSources.get(frame);return;}
    if(!target.getElementById('us-config-icons'))target.head.append($('us-config-icons').cloneNode(true));
    inject(target);behaviour(frame);
  }
  frames.forEach(frame=>{frame.removeAttribute('data-autofit');frame.addEventListener('load',()=>prepare(frame));if(frame.contentDocument?.readyState==='complete')prepare(frame);});
  $('banner-mode').addEventListener('change',()=>{const frame=$('config-overview');frame.contentWindow?.scrollTo({top:0,behavior:'instant'});behaviour(frame);});
  $('filter-mode').addEventListener('change',()=>behaviour($('report-demo')));
  $('report-expand').addEventListener('change',()=>behaviour($('report-demo')));
  doc.querySelectorAll('[data-choice-token]').forEach(select=>select.addEventListener('change',()=>{const field=fields.get(select.dataset.choiceToken);field.input.value=select.value;setValue(select.dataset.choiceToken,select.value);}));
  const tabs=[...doc.querySelectorAll('[role=tab]')];
  const guideSections={overview:'banners',report:'reports',cco:'native-tabs',forms:'forms',actions:'action-menus'};
  function activate(tab,focus=false) {
    tabs.forEach(item=>{const selected=item===tab;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;$(item.getAttribute('aria-controls')).hidden=!selected;});
    $('example-guide').href='Usage-Guide.html#'+guideSections[tab.id.slice(4)];if(focus)tab.focus();
    const frame=$(tab.getAttribute('aria-controls')).querySelector('iframe');inject(frame.contentDocument);
  }
  tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>activate(tab));tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;if(next!==undefined){event.preventDefault();activate(tabs[next],true);}});});
  $('preview-width').addEventListener('change',()=>$('preview-stage').classList.toggle('is-narrow',$('preview-width').value==='narrow'));
  $('reset-all').addEventListener('click',()=>{
    reset(()=>true);$('banner-mode').value='static';$('filter-mode').value='open';$('report-expand').checked=true;$('preview-width').value='full';$('preview-stage').classList.remove('is-narrow');$('token-search').value='';$('only-changed').checked=false;filterTokens();frames.forEach(behaviour);announce('Brand colours, overrides and preview options reset.');
  });
  $('copy-css').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('css-code').textContent);announce('Current CSS copied.');}catch(_){const range=doc.createRange();range.selectNodeContents($('css-code'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);announce('CSS selected. Press Ctrl+C or Command+C to copy.');}});
  update();
})();
