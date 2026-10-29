/* Preview-only definition compiler. Shared by the browser form and Node tests. */
(function (root) {
  'use strict';

  const textKeys = [
    'area', 'command', 'operation', 'destination', 'helper', 'helperArgs', 'label',
    'icon', 'tone', 'placement', 'popupTitle', 'popupWidth', 'popupHeight', 'target',
    'refreshMode', 'refreshHelper', 'confirmation', 'permission', 'denied', 'owner',
    'source', 'registration', 'order', 'recordKey', 'fullscreenBelow'
  ];
  const modes = ['button', 'icon', 'link', 'menu-item'];
  const placements = ['default', 'header', 'row', 'menu'];
  const forbidden = ['__proto__', 'prototype', 'constructor'];
  const quote = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));

  function preset(kind = 'job') {
    const model = {
      version: 1, area: 'jobs', command: 'edit-example', operation: 'popup',
      destination: '/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Staff/EditJob.aspx?AllowEdit=True',
      helper: 'MyActions.updateRecord', helperArgs: 'env', label: 'Edit job', icon: 'pencil',
      tone: 'default', placement: 'row', appearances: {default: 'button', header: 'button', row: 'icon', menu: 'menu-item'},
      popupTitle: 'Edit job', popupWidth: '70%', popupHeight: '70%', target: '_self',
      refreshMode: 'origin', refreshHelper: 'MyActions.refreshRelatedViews',
      targets: [{selector: '.JobsIQA', match: 'one'}], confirmation: '', permission: '', denied: 'disable',
      owner: 'client.jobs', source: 'Actions.js:jobs.edit-example', registration: 'define', acknowledge: false,
      order: '0', recordKey: 'partyId, ordinal', fullscreenBelow: '', commitClose: false,
      context: [
        {name: 'partyId', from: 'trigger', source: 'data-id', parameter: 'ID', sample: '103885', required: true},
        {name: 'ordinal', from: 'trigger', source: 'data-seqn', parameter: 'Ordinal', sample: '22', required: true},
        {name: 'workplaceId', from: 'trigger', source: 'data-workplace', parameter: 'Worksite', sample: '103842', required: true}
      ]
    };
    if (kind !== 'job') {
      Object.assign(model, {
        area: 'records', command: kind === 'navigate' ? 'view-example' : 'edit-example',
        label: kind === 'navigate' ? 'View record' : 'Edit record', placement: 'header',
        destination: 'https://example.invalid/editor', popupTitle: 'Edit record', recordKey: 'recordId',
        owner: 'client.records', source: 'Actions.js:records.example', icon: kind === 'navigate' ? 'ti-external-link' : 'pencil',
        operation: kind === 'function' || kind === 'navigate' ? kind : 'popup',
        refreshMode: kind === 'navigate' ? 'none' : 'origin',
        context: [{name: 'recordId', from: 'query', source: 'ID', parameter: 'ID', sample: '103885', required: true}]
      });
      model.source = 'Actions.js:' + model.area + '.' + model.command;
    }
    return model;
  }

  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.version !== 1) {
      throw new Error('Choose an action-builder draft with version 1.');
    }
    const result = preset();
    for (const key of textKeys) {
      if (typeof raw[key] !== 'string' || raw[key].length > 4000) throw new Error('Invalid draft field: ' + key);
      result[key] = raw[key];
    }
    result.acknowledge = raw.acknowledge === true;
    result.commitClose = raw.commitClose === true;
    result.appearances = {};
    for (const placement of placements) {
      const value = raw.appearances?.[placement];
      if (!modes.includes(value)) throw new Error('Invalid appearance in draft.');
      result.appearances[placement] = value;
    }
    if (!Array.isArray(raw.context) || raw.context.length > 20) throw new Error('Use up to 20 context fields.');
    result.context = raw.context.map(field => {
      const output = {};
      for (const key of ['name', 'from', 'source', 'parameter', 'sample']) {
        if (typeof field?.[key] !== 'string' || field[key].length > 4000) throw new Error('Invalid context field in draft.');
        output[key] = field[key];
      }
      output.required = field.required === true;
      return output;
    });
    if (!Array.isArray(raw.targets) || raw.targets.length > 12) throw new Error('Use up to 12 IQA targets.');
    result.targets = raw.targets.map(target => {
      if (typeof target?.selector !== 'string' || target.selector.length > 4000 || !['one', 'all'].includes(target.match)) {
        throw new Error('Invalid IQA target in draft.');
      }
      return {selector: target.selector, match: target.match};
    });
    return result;
  }

  function identity(model) {
    return {key: model.area.trim() + '.' + model.command.trim(), className: 'us-action-' + model.area.trim() + '-' + model.command.trim()};
  }

  function helperValid(value) {
    return /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(value) && !value.split('.').some(part => forbidden.includes(part));
  }

  function dimension(value) {
    if (/^[1-9]\d*(?:px)?$/.test(value)) return parseInt(value, 10);
    if (/^(?:[1-9]\d?|100)%$/.test(value)) return value;
    return null;
  }

  function validate(model, catalog = [], checkSelector) {
    const errors = [], warnings = [];
    const id = identity(model);
    const word = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
    if (!word.test(model.area.trim()) || !word.test(model.command.trim())) errors.push('Use lowercase letters, numbers and single hyphens for the area and action name.');
    if (!model.label.trim()) errors.push('Give the control a label.');
    if (!model.owner.trim() || !model.source.trim()) errors.push('Provide a definition owner and source identifier under Advanced settings.');
    if (!['popup', 'function', 'navigate'].includes(model.operation)) errors.push('Choose a supported operation.');
    if (!placements.includes(model.placement) || placements.some(placement => !modes.includes(model.appearances[placement]))) errors.push('Choose a supported placement and appearance.');
    if (model.icon && !/^(plus|pencil|trash|ti-[a-z0-9]+(?:-[a-z0-9]+)*)$/.test(model.icon)) errors.push('Choose an icon or a single ti-* glyph.');
    if (!['default', 'danger'].includes(model.tone) || !['disable', 'hide'].includes(model.denied)) errors.push('Choose a valid tone and denied-permission behaviour.');
    if (!['_self', '_blank'].includes(model.target) || !['env', 'context', 'none'].includes(model.helperArgs)) errors.push('Choose a valid target and function argument mode.');
    if (!['origin', 'specific', 'both', 'custom', 'none'].includes(model.refreshMode)) errors.push('Choose a supported refresh behaviour.');
    if (!['define', 'configure'].includes(model.registration)) errors.push('Choose a registration method.');
    const collision = catalog.find(item => item.key === id.key || item.className === id.className);
    if (model.registration === 'define' && collision) errors.push('This key or class is already bundled (' + collision.key + '). Rename it, or explicitly replace it under Advanced settings.');
    if (model.registration === 'configure' && !model.acknowledge) errors.push('Acknowledge the complete definition replacement under Advanced settings.');
    if (model.registration === 'configure') warnings.push('This export replaces the complete existing definition.');
    if (model.appearances[model.placement] === 'icon' && !model.icon) warnings.push('No icon selected: the renderer will retain the text label.');
    if (model.placement === 'menu' && model.appearances.menu !== 'menu-item') warnings.push('Menu item appearance is recommended inside an Actions menu.');
    if (!Number.isFinite(Number(model.order))) errors.push('Header order must be a number.');
    if (model.operation !== 'function') {
      try {
        if (!/^(https?:\/\/|\/(?!\/)|\.\.?\/|#)/i.test(model.destination) || /[\u0000-\u001f\\]/.test(model.destination)) throw new Error();
        const url = new URL(model.destination, 'https://builder.example/');
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || model.operation === 'popup' && url.hash) throw new Error();
        if (url.hostname === 'example.invalid') warnings.push('Replace the example.invalid destination before installing this definition.');
      } catch (_) {
        errors.push('Enter an HTTP(S) or relative URL. Popup URLs cannot contain a fragment.');
      }
    } else if (!helperValid(model.helper.trim())) errors.push('Enter a function name such as MyActions.updateRecord, without brackets or arguments.');
    if (model.operation === 'popup') {
      if (!dimension(model.popupWidth.trim()) || !dimension(model.popupHeight.trim())) errors.push('Popup dimensions must be positive whole pixels or percentages from 1% to 100%.');
      if (!model.popupTitle.trim()) errors.push('Give the popup a title.');
      if (model.fullscreenBelow && (!Number.isFinite(Number(model.fullscreenBelow)) || Number(model.fullscreenBelow) < 0)) errors.push('The popup breakpoint must be a nonnegative number.');
    }
    const names = new Set(), parameters = new Set(), attributes = new Set();
    for (const field of model.context) {
      if (!/^[a-zA-Z][\w]*$/.test(field.name) || forbidden.includes(field.name)) errors.push('Context names must be valid identifiers, e.g. recordId.');
      if (names.has(field.name)) errors.push('Context field names must be unique: ' + field.name);
      names.add(field.name);
      if (!['trigger', 'query', 'value'].includes(field.from)) errors.push('Choose a supported context source.');
      if (field.from === 'trigger' && !/^data-[a-z][a-z0-9-]*$/.test(field.source)) errors.push('Button attributes must use data-* names, e.g. data-id.');
      if (field.from === 'trigger') {
        if (attributes.has(field.source)) errors.push('Use each button data attribute once in the builder: ' + field.source);
        attributes.add(field.source);
      }
      if (field.from === 'query' && !field.source.trim()) errors.push('Name the page query parameter for ' + field.name + '.');
      if (field.from === 'trigger' && model.placement === 'header') errors.push('Generated heading buttons cannot receive authored data attributes. Use page query/literal context or choose an authored control.');
      if (field.from === 'value' && field.required && !field.sample.trim()) errors.push('Provide the required literal value for ' + field.name + '.');
      if (field.sample.includes('{#query.')) errors.push('Use literal sample values here, not unresolved Query Template fields.');
      if (field.parameter && model.operation !== 'function') {
        if (parameters.has(field.parameter)) errors.push('URL parameter names must be unique: ' + field.parameter);
        parameters.add(field.parameter);
      }
    }
    const keys = model.recordKey.split(',').map(value => value.trim()).filter(Boolean);
    if (keys.some(key => !names.has(key))) errors.push('Record lock fields must name existing context fields.');
    if (model.operation !== 'navigate') {
      if (['specific', 'both'].includes(model.refreshMode)) {
        if (!model.targets.length) errors.push('Add at least one IQA refresh target.');
        for (const target of model.targets) {
          if (!target.selector.trim()) errors.push('Give each IQA target a selector.');
          else if (checkSelector) {
            try { checkSelector(target.selector); } catch (_) { errors.push('Invalid IQA selector: ' + target.selector); }
          }
          if (!['one', 'all'].includes(target.match)) errors.push('Choose how many reports the IQA selector should match.');
        }
      }
      if (model.refreshMode === 'custom' && !helperValid(model.refreshHelper.trim())) errors.push('Enter a named refresh function, without arguments.');
      if (['origin', 'both'].includes(model.refreshMode) && ['default', 'menu'].includes(model.placement)) warnings.push('Origin refresh requires this control to be inside a native IQA. For a banner or standalone action outside a report, select specific IQA targets.');
      if (['origin', 'both'].includes(model.refreshMode) && model.placement === 'header') warnings.push('Origin refresh applies to a native IQA, not a Query Template Display. Use a custom updater for template/alert fragments.');
    }
    if (model.permission.trim()) warnings.push('Install an access resolver for this permission. The preview simulates its result.');
    if (model.operation === 'function') warnings.push('Supply ' + model.helper.trim() + ' before use. It must return its real operation promise; legacy popup functions may return before their editor closes.');
    return {errors: [...new Set(errors)], warnings: [...new Set(warnings)]};
  }

  function contextDefinition(model) {
    return Object.fromEntries(model.context.map(field => [field.name, {
      ...(field.from === 'value' ? {value: field.sample} : field.from === 'query' ? {from: 'query', parameter: field.source} : {from: 'trigger', attribute: field.source}),
      required: field.required
    }]));
  }

  function presentation(model) {
    return {label: model.label, ...(model.icon ? {icon: model.icon} : {}), tone: model.tone, order: Number(model.order), ...model.appearances};
  }

  function destination(model, context) {
    const url = new URL(model.destination, 'https://example.invalid/');
    model.context.filter(field => field.parameter).forEach(field => url.searchParams.set(field.parameter, context[field.name] ?? ''));
    return url.href;
  }

  function refreshTargets(model) {
    const result = [];
    if (['origin', 'both'].includes(model.refreshMode)) result.push({type: 'origin-report'});
    if (['specific', 'both'].includes(model.refreshMode)) {
      for (const target of model.targets) result.push({type: 'iqa', selector: target.selector.trim(), scope: 'page', match: target.match});
    }
    return result;
  }

  function helperReference(value) {
    return 'window' + value.trim().split('.').map(part => '[' + quote(part) + ']').join('');
  }

  function generate(model) {
    const id = identity(model);
    const json = value => JSON.stringify(value, null, 2).replace(/</g, '\\u003c');
    const indent = value => value.replace(/\n/g, '\n  ');
    const action = ['type: ' + quote(model.operation)];
    const dependencies = [];
    if (model.operation === 'function') dependencies.push(model.helper.trim());
    if (model.operation !== 'navigate' && model.refreshMode === 'custom') dependencies.push(model.refreshHelper.trim());
    if (dependencies.length) action.push('requires: ' + json([...new Set(dependencies)]));
    if (model.recordKey.trim()) action.push('recordKey: ' + json(model.recordKey.split(',').map(value => value.trim()).filter(Boolean)));
    if (model.permission.trim()) action.push('access: ' + json({permission: model.permission.trim(), denied: model.denied}));
    if (model.operation !== 'navigate' && model.confirmation.trim()) action.push('confirm: ' + json({message: model.confirmation.trim()}));
    if (model.operation === 'function') {
      const args = model.helperArgs === 'env' ? 'env' : model.helperArgs === 'context' ? 'env.context' : '';
      action.push('run: env => ' + helperReference(model.helper) + '(' + args + ')');
    } else {
      const parameters = model.context.filter(field => field.parameter);
      if (!parameters.length) action.push('href: ' + quote(model.destination));
      else action.push('href: ({ context }) => {\n  const url = new URL(' + quote(model.destination) + ', window.location.href);\n' + parameters.map(field => '  url.searchParams.set(' + quote(field.parameter) + ', context[' + quote(field.name) + '] ?? "");').join('\n') + '\n  return url.href;\n}');
      if (model.operation === 'navigate') action.push('target: ' + quote(model.target));
      else {
        const popup = {title: model.popupTitle, width: dimension(model.popupWidth.trim()), height: dimension(model.popupHeight.trim()), closeWindowOnCommit: model.commitClose};
        if (model.fullscreenBelow !== '') popup.fullscreenBelow = Number(model.fullscreenBelow);
        action.push('popup: ' + json(popup));
      }
    }
    if (model.operation !== 'navigate' && model.refreshMode !== 'none') {
      const when = model.operation === 'popup' ? 'close' : 'success';
      if (model.refreshMode === 'custom') action.push('refresh: {\n  when: ' + quote(when) + ',\n  run: env => ' + helperReference(model.refreshHelper) + '(env)\n}');
      else action.push('refresh: ' + json({when, targets: refreshTargets(model)}));
    }
    const body = [
      'className: ' + quote(id.className), 'owner: ' + quote(model.owner.trim()), 'source: ' + quote(model.source.trim()),
      'presentation: ' + json(presentation(model)), 'context: ' + json(contextDefinition(model)),
      'action: {\n  ' + action.map(indent).join(',\n  ') + '\n}'
    ].map(indent).join(',\n  ');
    const js = '// Add this registration to client Actions.js after the shared runtime and standard definitions.\n' +
      '// This snippet does not define custom helper functions or a permission provider.\n' +
      'window.UnionSuiteActions.' + model.registration + '(' + quote(id.key) + ', {\n  ' + body + '\n});\n';
    let html = id.className;
    if (model.placement !== 'header') {
      const tag = model.operation === 'navigate' ? 'a' : 'button';
      const classes = (model.placement === 'menu' ? 'us-actions__item ' : '') + id.className;
      const attributes = model.context.filter(field => field.from === 'trigger').map(field => '\n  ' + field.source + '="' + escapeHtml(field.sample) + '"').join('');
      html = '<' + tag + (tag === 'button' ? ' type="button"' : '') + ' class="' + classes + '"' + attributes + '>\n  ' + escapeHtml(model.label) + '\n</' + tag + '>';
    }
    return {js, html, ...id};
  }

  const api = {preset, normalize, identity, validate, dimension, generate, contextDefinition, presentation, destination, refreshTargets, escapeHtml};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.UnionSuiteActionBuilder = api;
})(typeof window === 'undefined' ? globalThis : window);
