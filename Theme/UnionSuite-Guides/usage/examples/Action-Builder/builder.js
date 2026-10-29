(function () {
  'use strict';

  const core = window.UnionSuiteActionBuilder;
  const assets = JSON.parse(document.getElementById('builder-assets').textContent);
  const get = id => document.getElementById(id);
  const escape = core.escapeHtml;
  const mapping = {
    area: 'area', command: 'command', operation: 'operation', destination: 'destination',
    helper: 'helper', 'helper-args': 'helperArgs', label: 'label', icon: 'icon', tone: 'tone',
    placement: 'placement', 'popup-title': 'popupTitle', 'popup-width': 'popupWidth',
    'popup-height': 'popupHeight', target: 'target', 'refresh-mode': 'refreshMode',
    'refresh-helper': 'refreshHelper', confirmation: 'confirmation', permission: 'permission',
    denied: 'denied', owner: 'owner', source: 'source', registration: 'registration',
    order: 'order', 'record-key': 'recordKey', 'fullscreen-below': 'fullscreenBelow'
  };
  let model = core.preset();
  let output = null;
  let timer;
  let previewToken = 0;

  function contextRows() {
    get('context-fields').innerHTML = model.context.map((field, index) => `
      <details class="builder-context" data-context="${index}" ${index === 0 ? 'open' : ''}>
        <summary>Field ${index + 1}: <span data-field-title>${escape(field.name || 'New field')}</span></summary>
        <div class="builder-row-title"><span>Record context</span><button type="button" class="builder-remove" data-remove-context="${index}">Remove field ${index + 1}</button></div>
        <div class="builder-fields two">
          <label>Context name<input data-field="name" value="${escape(field.name)}" placeholder="recordId" spellcheck="false"></label>
          <label>Read value from<select data-field="from"><option value="trigger" ${field.from === 'trigger' ? 'selected' : ''}>Clicked button attribute</option><option value="query" ${field.from === 'query' ? 'selected' : ''}>Page URL query parameter</option><option value="value" ${field.from === 'value' ? 'selected' : ''}>Fixed literal value</option></select></label>
        </div>
        <label data-source-label><span>Attribute / query parameter</span><input data-field="source" value="${escape(field.source)}" spellcheck="false"></label>
        <div class="builder-fields two">
          <label><span data-sample-label>Preview sample</span><input data-field="sample" value="${escape(field.sample)}"></label>
          <label data-parameter-label>Send as URL parameter (optional)<input data-field="parameter" value="${escape(field.parameter)}" placeholder="ID" spellcheck="false"></label>
        </div>
        <label class="builder-check"><input type="checkbox" data-field="required" ${field.required ? 'checked' : ''}> Required to enable the action</label>
      </details>`).join('');
  }

  function targetRows() {
    get('refresh-targets').innerHTML = model.targets.map((target, index) => `
      <div class="builder-target" data-target="${index}">
        <div class="builder-row-title"><span>IQA target ${index + 1}</span><button type="button" class="builder-remove" data-remove-target="${index}">Remove target ${index + 1}</button></div>
        <div class="builder-fields two"><label>Report selector<input data-target-field="selector" value="${escape(target.selector)}" placeholder=".JobsIQA" spellcheck="false"></label>
        <label>Match<select data-target-field="match"><option value="one" ${target.match === 'one' ? 'selected' : ''}>Exactly one report</option><option value="all" ${target.match === 'all' ? 'selected' : ''}>All matching reports</option></select></label></div>
      </div>`).join('');
  }

  function fill() {
    for (const [id, key] of Object.entries(mapping)) get(id).value = model[key];
    get('appearance').value = model.appearances[model.placement];
    get('acknowledge').checked = model.acknowledge;
    get('commit-close').checked = model.commitClose;
    contextRows();
    targetRows();
    update();
  }

  function readForm() {
    const previousPlacement = model.placement;
    const previousIdentity = core.identity(model);
    const autoOwner = model.owner === 'client.' + model.area.trim();
    const autoSource = model.source === 'Actions.js:' + previousIdentity.key;
    model.appearances[previousPlacement] = get('appearance').value;
    for (const [id, key] of Object.entries(mapping)) model[key] = get(id).value;
    if (core.identity(model).key !== previousIdentity.key) {
      if (autoOwner) get('owner').value = model.owner = 'client.' + model.area.trim();
      if (autoSource) get('source').value = model.source = 'Actions.js:' + core.identity(model).key;
    }
    if (model.placement !== previousPlacement) get('appearance').value = model.appearances[model.placement];
    model.acknowledge = get('acknowledge').checked;
    model.commitClose = get('commit-close').checked;
    model.context = [...document.querySelectorAll('[data-context]')].map(row => {
      const values = {};
      row.querySelectorAll('[data-field]').forEach(input => {
        values[input.dataset.field] = input.type === 'checkbox' ? input.checked : input.value;
      });
      return values;
    });
    model.targets = [...document.querySelectorAll('[data-target]')].map(row => ({
      selector: row.querySelector('[data-target-field="selector"]').value,
      match: row.querySelector('[data-target-field="match"]').value
    }));
  }

  function showFields() {
    document.querySelectorAll('[data-for]').forEach(block => {
      block.hidden = !block.dataset.for.split(' ').includes(model.operation);
    });
    const navigation = model.operation === 'navigate';
    get('refresh-settings').hidden = navigation;
    get('navigation-refresh-note').hidden = !navigation;
    get('refresh-timing').textContent = navigation ? 'The destination page opens using a native link.' : model.operation === 'popup' ? 'After the popup closes, including Cancel or X.' : 'After the function resolves successfully.';
    get('refresh-targets-wrap').hidden = !['specific', 'both'].includes(model.refreshMode);
    get('refresh-custom-wrap').hidden = model.refreshMode !== 'custom';
    get('acknowledge').closest('label').hidden = model.registration !== 'configure';
    document.querySelectorAll('[data-context]').forEach((row, index) => {
      const field = model.context[index];
      row.querySelector('[data-field-title]').textContent = field.name || 'New field';
      row.querySelector('[data-source-label]').hidden = field.from === 'value';
      row.querySelector('[data-source-label] span').textContent = field.from === 'query' ? 'Page query parameter' : 'Button data attribute';
      row.querySelector('[data-sample-label]').textContent = field.from === 'value' ? 'Literal value (exported)' : 'Preview sample (not fixed in JavaScript)';
      row.querySelector('[data-parameter-label]').hidden = model.operation === 'function';
    });
    get('simulate-missing').disabled = !model.context.some(field => field.required);
    get('simulate-denied').disabled = !model.permission.trim();
    get('add-context').disabled = model.context.length >= 20;
    get('add-target').disabled = model.targets.length >= 12;
  }

  function setup() {
    const steps = [
      'Load zUnionSuite.js, Scripts/ActionDefinitions.js, then client Actions.js once in that order. Keep required helpers loaded.',
      'Append the generated registration to client Actions.js. Do not replace the whole file or register inside replaceable iPart content.',
      model.placement === 'header'
        ? 'Paste the action class into the iPart CSS class field and keep its Title populated. iMIS creates the inner wrapper; do not paste generated wrappers into Content HTML.'
        : model.placement === 'menu'
          ? 'Place this inner menu control in an li inside your existing Actions list. Keep its disclosure markup. Remove the old onclick/delegated action binding.'
          : 'Place the inner control in the report row or Content HTML. Remove previous onclick/delegated action bindings on the converted control.',
      model.context.some(field => field.from === 'trigger')
        ? 'Replace the literal sample data-* values in HTML with the actual record values and HTML-encode them. For IQA Query Templates, every referenced output alias must be selected. This builder does not generate SQL or Query Template field syntax.'
        : 'Context comes from the declared page query parameters or fixed values. Preview samples for query parameters are not exported as fixed IDs.',
      'Use stable IQA wrapper selectors. Origin refresh requires a native report containing this action; it is not a reload API for arbitrary panels or Query Template displays.',
      'Check your full deployed registration list for collisions, then verify the editor, permissions and native refresh in iMIS.'
    ];
    if (model.operation === 'function') steps.push('Provide ' + model.helper.trim() + '. Argument mode: ' + model.helperArgs + '. Return a promise for its actual work.');
    if (model.refreshMode === 'custom' && model.operation !== 'navigate') steps.push('Provide ' + model.refreshHelper.trim() + '(env). Await each view update; retry can run this callback again.');
    if (model.permission.trim()) steps.push('Configure UnionSuiteActions.setAccessResolver for ' + model.permission.trim() + '. Missing providers disable the control. Enforce authorization on the server too.');
    get('setup-list').replaceChildren(...steps.map(text => {
      const item = document.createElement('li');
      item.textContent = text;
      return item;
    }));
  }

  function update() {
    clearTimeout(timer);
    showFields();
    updateAppearance();
    const result = core.validate(model, assets.catalog, selector => document.createElement('div').matches(selector));
    const id = core.identity(model);
    get('identity-key').textContent = id.key;
    const validation = get('validation');
    validation.replaceChildren();
    validation.dataset.invalid = String(result.errors.length > 0);
    const heading = document.createElement('p');
    heading.textContent = result.errors.length ? 'Fix these settings to generate the action:' : 'Valid registration · ' + (result.warnings.length ? 'review the notes below' : 'ready to copy');
    validation.append(heading);
    if (result.errors.length || result.warnings.length) {
      const list = document.createElement('ul');
      [...result.errors, ...result.warnings].forEach(text => {
        const item = document.createElement('li');
        item.textContent = text;
        list.append(item);
      });
      validation.append(list);
    }
    output = result.errors.length ? null : core.generate(model);
    get('code-js').textContent = output?.js || '// Complete the required settings above.';
    get('code-html').textContent = output?.html || 'Complete the required settings above.';
    document.querySelectorAll('[data-copy],#download-js').forEach(button => { button.disabled = !output; });
    get('html-placement').textContent = model.placement === 'header' ? 'iPart CSS class field' : 'Inner ' + (model.placement === 'menu' ? 'menu item' : 'control');
    get('html-note').textContent = model.placement === 'header'
      ? 'Paste the class without a dot. Keep the native panel and populated Title.'
      : 'This is author HTML with literal sample data, not a Query Template or SQL expression. Replace sample attributes with the actual record values.';
    get('copy-status').textContent = '';
    setup();
    timer = setTimeout(() => renderPreview(result.errors), 250);
  }

  function script(text) {
    return '<script>' + text.replace(/<\/script/gi, '<\\/script') + '</script>';
  }

  function updateAppearance() {
    // Presentation stays available while the operation/context is incomplete.
    // A persistent frame avoids reloading the renderer and icon font per edit.
    get('appearance-preview').contentWindow.postMessage({
      type: 'builder-appearance',
      presentation: {
        label: model.label.trim() || 'Action label',
        ...(model.icon ? {icon: model.icon} : {}),
        tone: model.tone,
        default: model.appearances[model.placement]
      }
    }, '*');
  }

  function initializeAppearance() {
    get('appearance-preview').srcdoc = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; font-src data:; img-src data:; connect-src \'none\'; form-action \'none\'">' +
      '<style>' + (assets.previewCss + '\n' + assets.appearanceCss).replace(/<\/style/gi, '') + '</style></head><body>' +
      '<div id="appearance-stage"><button type="button" class="us-action-builder-appearance">Action label</button></div>' +
      script(assets.runtime) + script(assets.appearance) + '</body></html>';
  }

  function renderPreview(errors) {
    previewToken++;
    const frame = get('action-preview');
    if (errors.length) {
      frame.srcdoc = '<!doctype html><html lang="en"><body style="font:14px/1.5 system-ui;padding:24px;color:#53616f">Complete the highlighted settings to try this action.</body></html>';
      get('simulation-status').textContent = 'Preview paused while the definition is incomplete.';
      return;
    }
    const data = {
      model, token: previewToken,
      missing: !get('simulate-missing').disabled && get('simulate-missing').checked,
      denied: !get('simulate-denied').disabled && get('simulate-denied').checked
    };
    const encoded = JSON.stringify(data).replace(/</g, '\\u003c');
    frame.srcdoc = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; font-src data:; img-src data:; connect-src \'none\'; form-action \'none\'">' +
      '<style>' + assets.previewCss.replace(/<\/style/gi, '') + '</style></head><body>' +
      script(assets.core) + script(assets.runtime) + script('window.builderPreviewData=' + encoded + ';') + script(assets.preview) + '</body></html>';
    get('simulation-status').textContent = 'Updating preview…';
  }

  get('builder-form').addEventListener('submit', event => event.preventDefault());
  get('builder-form').addEventListener('input', () => { readForm(); update(); });
  get('builder-form').addEventListener('change', () => { readForm(); update(); });
  get('builder-form').addEventListener('click', event => {
    const removeContext = event.target.closest('[data-remove-context]');
    const removeTarget = event.target.closest('[data-remove-target]');
    if (removeContext) {
      readForm();
      model.context.splice(Number(removeContext.dataset.removeContext), 1);
      contextRows();
      update();
      get('add-context').focus();
    }
    if (removeTarget) {
      readForm();
      model.targets.splice(Number(removeTarget.dataset.removeTarget), 1);
      targetRows();
      update();
      get('add-target').focus();
    }
  });
  get('add-context').addEventListener('click', () => {
    readForm();
    model.context.push({name: '', from: 'trigger', source: 'data-id', parameter: '', sample: '', required: true});
    contextRows();
    const row = get('context-fields').lastElementChild;
    row.open = true;
    update();
    row.querySelector('input').focus();
  });
  get('add-target').addEventListener('click', () => {
    readForm();
    model.targets.push({selector: '', match: 'one'});
    targetRows();
    update();
    get('refresh-targets').lastElementChild.querySelector('input').focus();
  });
  get('load-preset').addEventListener('click', () => {
    model = core.preset(get('preset').value);
    get('simulate-missing').checked = false;
    get('simulate-denied').checked = false;
    fill();
  });
  ['simulate-missing', 'simulate-denied'].forEach(id => get(id).addEventListener('change', update));
  window.addEventListener('message', event => {
    if (event.source === get('appearance-preview').contentWindow) {
      if (event.data?.type === 'builder-appearance-ready') updateAppearance();
      if (event.data?.type === 'builder-appearance-height' && Number.isFinite(event.data.height)) {
        get('appearance-preview').style.height = Math.max(96, Math.min(420, event.data.height + 2)) + 'px';
      }
      return;
    }
    if (event.source !== get('action-preview').contentWindow || event.data?.token !== previewToken || typeof event.data?.message !== 'string') return;
    get('simulation-status').textContent = event.data.message;
  });

  function selectTab(name) {
    document.querySelectorAll('[data-tab]').forEach(button => {
      const selected = button.dataset.tab === name;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      get('output-' + button.dataset.tab).hidden = !selected;
    });
  }
  document.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => selectTab(button.dataset.tab));
    button.addEventListener('keydown', event => {
      const tabs = ['js', 'html', 'setup'];
      let index = tabs.indexOf(button.dataset.tab);
      if (event.key === 'ArrowRight') index = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') index = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = tabs.length - 1;
      else return;
      event.preventDefault();
      selectTab(tabs[index]);
      get('tab-' + tabs[index]).focus();
    });
  });

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const previous = document.activeElement;
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;left:-10000px;top:0';
      document.body.append(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      previous?.focus();
      if (!copied) throw new Error('Clipboard unavailable. Use the download button or select the code to copy.');
    }
  }
  document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    if (!output) return;
    try {
      await copy(output[button.dataset.copy]);
      get('copy-status').textContent = 'Copied ' + (button.dataset.copy === 'js' ? 'JavaScript.' : 'HTML / class.');
    } catch (error) { get('copy-status').textContent = error.message; }
  }));
  function download(text, name, type) {
    const url = URL.createObjectURL(new Blob([text], {type}));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  get('download-js').addEventListener('click', () => {
    if (output) download(output.js, output.key + '.registration.js', 'text/javascript');
  });
  get('download-draft').addEventListener('click', () => {
    readForm();
    download(JSON.stringify(model, null, 2), 'action-builder-draft.json', 'application/json');
  });
  get('load-draft').addEventListener('change', async event => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      if (file.size > 100000) throw new Error('Choose a builder draft smaller than 100 KB.');
      const candidate = core.normalize(JSON.parse(await file.text()));
      model = candidate;
      fill();
      get('copy-status').textContent = 'Draft loaded. Review its validation before exporting.';
    } catch (error) { get('copy-status').textContent = 'Draft not loaded: ' + error.message; }
    finally { event.target.value = ''; }
  });
  initializeAppearance();
  fill();
})();
