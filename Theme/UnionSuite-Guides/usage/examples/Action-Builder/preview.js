/* Only the preview executes this simulator. Exported registrations do not include it. */
(function () {
  'use strict';
  const {model, token, missing, denied} = window.builderPreviewData;
  const core = window.UnionSuiteActionBuilder;
  const {key, className} = core.identity(model);
  const escape = core.escapeHtml;
  const send = message => parent.postMessage({token, message}, '*');
  const context = core.contextDefinition(model);
  const sample = Object.fromEntries(model.context.map(field => [field.name, field.sample]));
  if (missing) {
    const field = model.context.find(item => item.required);
    if (field) sample[field.name] = '';
  }
  // Simulate page/query context with literals inside the isolated sample document.
  // Trigger attributes still go through the production attribute resolver.
  for (const field of model.context) {
    if (field.from !== 'trigger') context[field.name] = {value: sample[field.name], required: field.required};
  }
  const attrs = model.context.filter(field => field.from === 'trigger').map(field => ' ' + field.source + '="' + escape(sample[field.name]) + '"').join('');
  const control = '<button type="button" class="' + className + '"' + attrs + '>' + escape(model.label) + '</button>';
  let markup;
  if (model.placement === 'header') {
    markup = '<div class="ContentItemContainer"><div class="' + className + '"><div class="panel"><div class="panel-heading"><h2 class="panel-title">Sample report</h2></div><div class="panel-body-container"><div class="panel-body"><div class="QueryTemplateSet"><section><div class="QueryTemplateItem">Sample record</div></section></div></div></div></div></div></div>';
  } else if (model.placement === 'row') {
    markup = '<div class="ContentItemContainer"><div class="us-list--rows"><div class="panel"><div class="panel-heading"><h2 class="panel-title">Sample report</h2></div><div class="panel-body-container"><div class="panel-body"><div class="QueryTemplateSet"><section><div class="QueryTemplateItem"><table><thead><tr><th>Record</th><th>Action</th></tr></thead><tbody><tr><td>Example record<br><small>Values from your context fields</small></td><td>' + control + '</td></tr></tbody></table></div></section></div></div></div></div></div></div>';
  } else if (model.placement === 'menu') {
    markup = '<div class="us-actions"><button type="button" class="us-actions__toggle">Actions</button><ul class="us-actions__list"><li>' + control + '</li></ul></div>';
  } else markup = '<div class="sample-standalone">' + control + '</div>';
  document.body.innerHTML = '<div class="sample-content">' + markup + '<p id="sample-result" role="status">Try the control above.</p></div>' +
    '<dialog aria-labelledby="sample-title"><h2 id="sample-title"></h2><p id="sample-destination"></p><p id="sample-size"></p><p class="sample-hint">Example editor. No page is loaded and no data is changed.</p><button type="button" class="TextButton" id="sample-close">Close example</button></dialog>';
  const result = document.getElementById('sample-result');
  function status(message) { result.textContent = message; send(message); }
  window.ShowDialog_NoReturnValue = (href, args, width, height, title, icon, template, before, name, commit, preserve, close) => {
    const dialog = document.querySelector('dialog');
    document.getElementById('sample-title').textContent = title;
    document.getElementById('sample-destination').textContent = core.destination(model, sample);
    document.getElementById('sample-size').textContent = 'Configured size: ' + width + ' × ' + height;
    dialog.onclose = () => close({}, {sample: true});
    dialog.showModal();
    status('Popup opened in the simulation. Close it to run the configured follow-up.');
  };
  document.getElementById('sample-close').addEventListener('click', () => document.querySelector('dialog').close());
  async function simulateRefresh() {
    let description;
    if (model.refreshMode === 'custom') description = 'Would await ' + model.refreshHelper + '(env).';
    else description = core.refreshTargets(model).map(target => target.type === 'origin-report'
      ? 'originating native IQA'
      : target.selector + (target.match === 'all' ? ' (all matches)' : ' (exactly one)')).join(' → ');
    status('Simulated refresh: ' + description);
    result.classList.add('sample-refreshed');
  }
  const action = {
    type: model.operation === 'popup' ? 'popup' : 'function',
    recordKey: model.recordKey.trim() ? model.recordKey.split(',').map(value => value.trim()).filter(Boolean) : undefined
  };
  if (model.permission.trim()) action.access = {check: () => !denied, denied: model.denied};
  // A local confirmation dialog avoids invoking native browser prompts from a sandbox.
  if (model.confirmation.trim() && model.operation !== 'navigate') {
    action.confirm = () => new Promise(resolve => {
      const dialog = document.createElement('dialog');
      const text = document.createElement('p');
      text.textContent = model.confirmation;
      const approve = document.createElement('button');
      approve.type = 'button'; approve.className = 'TextButton'; approve.textContent = 'Continue';
      const cancel = document.createElement('button');
      cancel.type = 'button'; cancel.className = 'TextButton us-outline-button'; cancel.textContent = 'Cancel';
      let accepted = false;
      approve.onclick = () => { accepted = true; dialog.close(); };
      cancel.onclick = () => dialog.close();
      dialog.onclose = () => { dialog.remove(); resolve(accepted); };
      dialog.append(text, approve, cancel);
      document.body.append(dialog);
      dialog.showModal();
    });
  }
  if (model.operation === 'popup') {
    action.href = () => 'https://example.invalid/simulated-editor';
    action.popup = {title: model.popupTitle, width: core.dimension(model.popupWidth.trim()), height: core.dimension(model.popupHeight.trim())};
  } else {
    action.run = async env => {
      status(model.operation === 'navigate'
        ? 'Would open ' + core.destination(model, env.context) + (model.target === '_blank' ? ' in a new tab.' : ' in this tab.')
        : 'Would await ' + model.helper + '(' + (model.helperArgs === 'none' ? '' : model.helperArgs === 'context' ? 'context' : 'env') + ').');
    };
  }
  if (model.operation !== 'navigate' && model.refreshMode !== 'none') action.refresh = {when: model.operation === 'popup' ? 'close' : 'success', run: simulateRefresh};
  window.UnionSuiteActions.define(key, {
    className, owner: 'builder-preview', source: 'preview:' + key,
    presentation: core.presentation(model), context, action
  });
  window.UnionSuiteIqaFilters?.refresh();
  window.UnionSuiteActionMenus?.refresh();
  window.UnionSuiteActions.refresh();
  status(missing ? 'Missing required data is simulated. Try the unavailable control to read its reason.' : denied && model.permission.trim() ? 'Permission denial is simulated.' : 'Ready. Try the control; all effects are simulated.');
  document.addEventListener('us:action-error', event => status('Action unavailable: ' + event.detail.error.message));
})();
