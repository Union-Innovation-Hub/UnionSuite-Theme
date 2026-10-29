// Guide-only interactions. Does not edit theme files or store user data.
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  var status = doc.getElementById('copy-status');
  var statusTimer;
  function announce(message) {
    status.textContent = message;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () { status.textContent = ''; }, 6000);
  }
  async function copy(id, targetDoc) {
    var code = (targetDoc || doc).getElementById(id);
    if (!code) return;
    await copyText(code.textContent, code);
  }
  async function copyText(text, code) {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      announce('Copied to clipboard: ' + (text.includes('\n') ? 'HTML / code template' : text));
    } catch (_) {
      var range = code.ownerDocument.createRange();
      range.selectNodeContents(code);
      var selection = code.ownerDocument.defaultView.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      announce('Text selected. Press Ctrl+C (or Command+C) to copy.');
    }
  }
  function bindExampleDocument(targetDoc) {
    if (targetDoc.documentElement.dataset.guideBound) return;
    targetDoc.documentElement.dataset.guideBound = 'true';
    targetDoc.addEventListener('click', function (event) {
    var button = event.target.closest('button');
    if (!button) {
      var sampleLink = event.target.closest('a[href="#example"]');
      if (sampleLink) { event.preventDefault(); announce('Visual example only. Connect your verified destination.'); }
      return;
    }
    if (button.hasAttribute('data-sample-action')) announce('Visual example only. Connect your verified action handler.');
    if (button.dataset.copyText) copyText(button.dataset.copyText, button.querySelector('code') || button);
    if (button.dataset.copy) copy(button.dataset.copy, targetDoc);
    if (button.dataset.download) {
      var content = targetDoc.getElementById(button.dataset.download);
      var name = button.dataset.filename;
      var blob = new Blob([content.textContent], {type: name.endsWith('.css') ? 'text/css;charset=utf-8' : name.endsWith('.js') ? 'text/javascript;charset=utf-8' : 'text/html;charset=utf-8'});
      var url = URL.createObjectURL(blob);
      var anchor = doc.createElement('a');
      anchor.href = url; anchor.download = name;
      doc.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
    });
  }
  bindExampleDocument(doc);
  doc.querySelectorAll('[data-filter]').forEach(function (input) {
    var rows = Array.from(doc.getElementById(input.dataset.filter).tBodies[0].rows);
    var result = doc.querySelector('[data-result="' + input.dataset.filter + '"]');
    function filter() {
      var terms = input.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
      var count = 0;
      rows.forEach(function (row) {
        var matches = terms.every(function (term) { return row.textContent.toLowerCase().includes(term); });
        row.hidden = !matches;
        if (matches) count++;
      });
      result.textContent = count + ' of ' + rows.length + ' entries' + (count === 0 ? ' · try a different search.' : '');
    }
    input.addEventListener('input', filter); filter();
  });
  // Resolve colour-mix and CSS variables through a real rendered CSS property.
  var probe = doc.createElement('span');
  probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';
  probe.setAttribute('aria-hidden', 'true'); doc.body.appendChild(probe);
  var canvas = doc.createElement('canvas');
  canvas.width = canvas.height = 1;
  var context = canvas.getContext('2d', {willReadFrequently: true});
  function resolveColour(name) {
    probe.style.backgroundColor = 'var(' + name + ')';
    var colour = getComputedStyle(probe).backgroundColor;
    if (!context) return colour;
    context.clearRect(0, 0, 1, 1); context.fillStyle = colour; context.fillRect(0, 0, 1, 1);
    var pixel = context.getImageData(0, 0, 1, 1).data;
    return '#' + Array.from(pixel).slice(0, 3).map(function (v) { return v.toString(16).padStart(2, '0'); }).join('');
  }
  var seeds = Array.from(doc.querySelectorAll('[data-seed]'));
  var sourceSeeds = new Map();
  seeds.forEach(function (input) { input.value = resolveColour(input.dataset.seed); sourceSeeds.set(input.dataset.seed, input.value); });
  var frame = doc.getElementById('banner-demo');
  var previewFrames = Array.from(doc.querySelectorAll('iframe[data-theme-preview]'));
  var hexInputs = Array.from(doc.querySelectorAll('[data-seed-hex]'));
  var previewCss = '';
  // Only validated colour values enter this stylesheet. Production theme JS
  // never installs an editor; this is confined to the offline usage guide.
  function injectPreview(targetDocument) {
    if (!targetDocument || !targetDocument.head) return;
    var style = targetDocument.getElementById('us-brand-preview-overrides');
    if (!style) {
      style = targetDocument.createElement('style');
      style.id = 'us-brand-preview-overrides';
      targetDocument.head.appendChild(style);
    }
    style.textContent = previewCss;
  }
  function syncDemo() {
    previewFrames.forEach(function (demoFrame) { injectPreview(demoFrame.contentDocument); });
  }
  function updateTokens() {
    var css = ':root {\n' + seeds.map(function (input) {
      return '  ' + input.dataset.seed + ': ' + input.value + ';';
    }).join('\n') + '\n}';
    var changed = seeds.some(function (input) { return input.value !== sourceSeeds.get(input.dataset.seed); });
    previewCss = changed ? css : '';
    injectPreview(doc);
    syncDemo();
    doc.getElementById('brand-state').textContent = changed ? 'Live custom preview · copy or download the CSS to keep it' : 'Source colours · preview changes are not saved';
    var computed = getComputedStyle(root);
    doc.querySelectorAll('[data-token]').forEach(function (node) {
      node.textContent = node.dataset.colour === 'true' ? resolveColour(node.dataset.token) : computed.getPropertyValue(node.dataset.token).trim();
    });
    doc.getElementById('seed-code').textContent = css;
  }
  function validateHex(text) {
    var match = text.trim().match(/^#?([\da-f]{6}|[\da-f]{3})$/i);
    if (!match) return null;
    var digits = match[1].toLowerCase();
    return '#' + (digits.length === 3 ? digits.split('').map(function (c) { return c + c; }).join('') : digits);
  }
  function validationStatus() {
    var invalid = hexInputs.some(function (input) { return input.getAttribute('aria-invalid') === 'true'; });
    doc.getElementById('seed-error').textContent = invalid ? 'Enter a 3- or 6-digit hex colour. The preview keeps the last valid value.' : '';
  }
  function clearInvalid(input) {
    input.removeAttribute('aria-invalid');
    input.setCustomValidity('');
  }
  seeds.forEach(function (input) {
    input.addEventListener('input', function () {
      var hex = hexInputs.find(function (item) { return item.dataset.seedHex === input.dataset.seed; });
      if (hex) { hex.value = input.value; clearInvalid(hex); }
      validationStatus();
      updateTokens();
    });
  });
  hexInputs.forEach(function (input) {
    var picker = seeds.find(function (item) { return item.dataset.seed === input.dataset.seedHex; });
    input.value = picker.value;
    input.addEventListener('input', function () {
      var colour = validateHex(input.value);
      if (!colour) {
        input.setAttribute('aria-invalid', 'true');
        input.setCustomValidity('Enter a 3- or 6-digit hex colour.');
        validationStatus();
        return;
      }
      clearInvalid(input);
      picker.value = colour;
      validationStatus();
      updateTokens();
    });
    input.addEventListener('blur', function () {
      if (validateHex(input.value)) input.value = picker.value;
    });
  });
  doc.getElementById('reset-seeds').addEventListener('click', function () {
    seeds.forEach(function (input) { input.value = sourceSeeds.get(input.dataset.seed); });
    hexInputs.forEach(function (input) { input.value = sourceSeeds.get(input.dataset.seedHex); clearInvalid(input); });
    validationStatus();
    updateTokens();
  });
  previewFrames.forEach(function (demoFrame) {
    var resizeObserver;
    function fit() {
      var body = demoFrame.contentDocument && demoFrame.contentDocument.body;
      if (demoFrame.hasAttribute('data-autofit') && body && body.children.length) demoFrame.style.height = Math.ceil(body.getBoundingClientRect().height + 4) + 'px';
    }
    function prepare() {
      var targetDoc = demoFrame.contentDocument;
      if (!targetDoc || !targetDoc.body || !targetDoc.body.children.length) return;
      injectPreview(targetDoc);
      if (!targetDoc.getElementById('us-guide-icons')) {
        var icons = doc.getElementById('us-guide-icons').cloneNode(true);
        targetDoc.head.appendChild(icons);
      }
      bindExampleDocument(targetDoc);
      fit();
      if (resizeObserver) resizeObserver.disconnect();
      if (window.ResizeObserver && demoFrame.hasAttribute('data-autofit')) {
        resizeObserver = new ResizeObserver(fit);
        resizeObserver.observe(targetDoc.body);
      }
      if (targetDoc.fonts) targetDoc.fonts.ready.then(fit);
    }
    demoFrame.addEventListener('load', prepare);
    window.addEventListener('resize', fit);
    if (demoFrame.contentDocument && demoFrame.contentDocument.readyState === 'complete') prepare();
  });
  doc.getElementById('reset-demo').addEventListener('click', function () {
    if (frame.contentWindow) frame.contentWindow.scrollTo({top: 0, behavior: 'instant'});
  });
  doc.getElementById('banner-demo-mode').addEventListener('change', function (event) {
    var wrapper = frame.contentDocument && frame.contentDocument.querySelector('.ContentItemContainer > .us-banner');
    if (!wrapper) return;
    frame.contentWindow.scrollTo({top:0,behavior:'instant'});
    wrapper.className = event.target.value;
    if (frame.contentWindow.UnionSuiteBanners) frame.contentWindow.UnionSuiteBanners.refresh();
  });
  updateTokens();
  var sections = Array.from(doc.querySelectorAll('main section[id]'));
  var navLinks = Array.from(doc.querySelectorAll('.sidebar nav a'));
  var navScheduled = false;
  function updateNav() {
    navScheduled = false;
    var current = sections[0];
    sections.forEach(function (section) { if (section.getBoundingClientRect().top <= 100) current = section; });
    navLinks.forEach(function (link) {
      if (link.hash === '#' + current.id) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
    });
  }
  window.addEventListener('scroll', function () {
    if (!navScheduled) { navScheduled = true; requestAnimationFrame(updateNav); }
  }, {passive: true});
  updateNav();
  doc.getElementById('print-guide').addEventListener('click', function () { window.print(); });
  var printState;
  window.addEventListener('beforeprint', function () {
    printState = {details: Array.from(doc.querySelectorAll('details')).map(function (d) { return [d, d.open]; }), hidden: Array.from(doc.querySelectorAll('tr[hidden]'))};
    printState.details.forEach(function (item) { item[0].open = true; });
    printState.hidden.forEach(function (row) { row.hidden = false; });
  });
  window.addEventListener('afterprint', function () {
    if (!printState) return;
    printState.details.forEach(function (item) { item[0].open = item[1]; });
    printState.hidden.forEach(function (row) { row.hidden = true; }); printState = null;
  });
})();
