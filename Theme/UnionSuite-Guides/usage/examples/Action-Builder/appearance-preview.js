// Presentation only. Never receives destinations, context or business callbacks.
(function () {
  'use strict';

  const actions = window.UnionSuiteActions;
  const stage = document.getElementById('appearance-stage');
  const key = 'builder.appearance';
  let registered = false;

  window.addEventListener('message', event => {
    if (event.source !== parent || event.data?.type !== 'builder-appearance') return;
    const presentation = event.data.presentation;
    const definition = {
      className: 'us-action-builder-appearance',
      owner: 'builder-appearance',
      source: 'appearance-preview',
      presentation,
      action: {type: 'function', run() {}}
    };
    if (registered) actions.configure(key, definition);
    else actions.define(key, definition);
    registered = true;
    actions.refresh();
  });

  // Retain the real hover/focus styling without running even a simulated action.
  document.addEventListener('click', event => {
    if (!event.target.closest('.us-command')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  new ResizeObserver(() => {
    parent.postMessage({type: 'builder-appearance-height', height: Math.ceil(stage.getBoundingClientRect().height)}, '*');
  }).observe(stage);
  parent.postMessage({type: 'builder-appearance-ready'}, '*');
})();
