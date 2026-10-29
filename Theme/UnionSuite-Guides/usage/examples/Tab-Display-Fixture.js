// Local comparison only. Never replace native iMIS/Telerik tab controllers.
(() => {
  const approved = document.body.classList.contains('us-tabs-approved');
  const sets = new Map();
  const size = () => parent.postMessage({type:'cco-size', id:document.body.dataset.fixture, height:document.body.scrollHeight + 8}, '*');
  document.querySelectorAll('[data-demo-tabset]').forEach(root => {
    const key = root.dataset.demoTabset;
    const strip = root.querySelector(':scope > :is(.RadTabStrip,.RadTabStripVertical)');
    const list = strip.querySelector('[role="tablist"]');
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const panels = [...root.querySelector(':scope > .RadMultiPage').children];
    const viewport = list.parentElement;
    let picker;
    let choices = [];
    if (!approved && strip.classList.contains('RadTabStripVertical') && !document.body.classList.contains('menu-swatch')) {
      picker = document.createElement('details');
      picker.className = 'mobile-sections';
      const summary = document.createElement('summary');
      summary.textContent = 'All sections';
      picker.append(summary);
      const options = document.createElement('div');
      options.className = 'mobile-section-options';
      choices = tabs.map((tab,index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = tab.textContent.trim();
        button.addEventListener('click', () => { picker.open = false; select(index, true, true); });
        options.append(button);
        return button;
      });
      picker.append(options);
      strip.prepend(picker);
      picker.addEventListener('keydown', event => {
        if (event.key === 'Escape') { picker.open = false; summary.focus(); }
      });
      document.addEventListener('click', event => { if (!picker.contains(event.target)) picker.open = false; });
    }
    function refreshEdges() {
      viewport.dataset.moreLeft = String(viewport.scrollLeft > 2);
      viewport.dataset.moreRight = String(viewport.scrollWidth - viewport.clientWidth - viewport.scrollLeft > 2);
    }
    function revealSelected() {
      if (approved) return;
      if (getComputedStyle(viewport).overflowX === 'auto') {
        const selected = tabs.find(tab => tab.classList.contains('rtsSelected'));
        const bounds = viewport.getBoundingClientRect();
        const current = selected.getBoundingClientRect();
        if (current.left < bounds.left + 16) viewport.scrollLeft -= bounds.left + 16 - current.left;
        else if (current.right > bounds.right - 16) viewport.scrollLeft += current.right - bounds.right + 16;
      }
      refreshEdges();
      choices.forEach((button,i) => {
        button.disabled = tabs[i].getAttribute('aria-disabled') === 'true';
        button.setAttribute('aria-current', String(tabs[i].classList.contains('rtsSelected')));
      });
      if (picker && window.innerWidth > 600) picker.open = false;
    }
    viewport.addEventListener('scroll', refreshEdges, {passive:true});
    const vertical = () => getComputedStyle(list).flexDirection === 'column';
    function select(index, focus = false, notify = false) {
      if (!tabs[index] || tabs[index].getAttribute('aria-disabled') === 'true') return;
      tabs.forEach((tab, i) => {
        tab.classList.toggle('rtsSelected', i === index);
        tab.setAttribute('aria-selected', String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
        panels[i].hidden = i !== index;
      });
      strip.setAttribute('aria-activedescendant', tabs[index].id);
      if (focus) tabs[index].focus({preventScroll:true});
      revealSelected();
      if (notify) parent.postMessage({type:'cco-select', id:document.body.dataset.fixture, key, index}, '*');
      requestAnimationFrame(size);
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', event => {event.preventDefault(); select(index, true, true);});
      tab.addEventListener('keydown', event => {
        const enabled = tabs.filter(t => t.getAttribute('aria-disabled') !== 'true');
        const i = enabled.indexOf(tab);
        let target;
        if (event.key === (vertical() ? 'ArrowDown' : 'ArrowRight')) target = enabled[(i + 1) % enabled.length];
        if (event.key === (vertical() ? 'ArrowUp' : 'ArrowLeft')) target = enabled[(i - 1 + enabled.length) % enabled.length];
        if (event.key === 'Home') target = enabled[0];
        if (event.key === 'End') target = enabled.at(-1);
        if (event.key === ' ') target = tab;
        if (target) {event.preventDefault(); select(tabs.indexOf(target), true, true);}
      });
    });
    sets.set(key, {select, tabs, list, vertical, revealSelected});
    select(0);
  });
  document.querySelectorAll('[data-demo-find]').forEach(button => button.addEventListener('click', () => {button.nextElementSibling.textContent = 'No matching records in this offline example.';}));
  function updateOrientation() {
    sets.forEach(set => {
      set.list.setAttribute('aria-orientation', set.vertical() ? 'vertical' : 'horizontal');
      set.revealSelected();
    });
    size();
  }
  window.addEventListener('message', event => {
    if (event.source !== parent || event.data?.type !== 'cco-command') return;
    const {action, value, key} = event.data;
    if (action === 'select') sets.get(key)?.select(value);
    if (action === 'styles' && /^[12345]$/.test(value?.v) && /^[123]$/.test(value?.h)) {
      document.body.classList.remove('us-tabs-v1','us-tabs-v2','us-tabs-v3','us-tabs-v4','us-tabs-v5','us-tabs-h1','us-tabs-h2','us-tabs-h3');
      document.body.classList.add('us-tabs-v'+value.v,'us-tabs-h'+value.h);
      requestAnimationFrame(updateOrientation);
    }
    if (action === 'disabled' || action === 'reset') sets.forEach(set => {
      const disabled = action === 'disabled' && value;
      const last = set.tabs.at(-1);
      if (disabled && last.classList.contains('rtsSelected')) set.select(0);
      last.classList.toggle('rtsDisabled', disabled);
      last.setAttribute('aria-disabled', String(disabled));
      set.revealSelected();
      if (action === 'reset') set.select(0);
    });
    if (action === 'reset') {
      document.querySelectorAll('input,select').forEach(field => field.tagName === 'SELECT' ? field.selectedIndex = 0 : field.value = '');
      document.querySelectorAll('[data-demo-find]').forEach(button => {button.nextElementSibling.textContent = 'Please enter your search criteria to view results';});
    }
  });
  new ResizeObserver(updateOrientation).observe(document.body);
  window.addEventListener('resize', updateOrientation);
  updateOrientation();
})();
