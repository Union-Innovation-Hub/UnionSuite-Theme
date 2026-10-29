/* ==========================================================================
   CONTACT PAGE v3 — THEME CANDIDATE: US-COPY 1.1 (not installed)
   Replaces the US-COPY block in Theme/UnionSuite/zUnionSuite.js. Generated
   from the theme block; the only changes are flashLength (the flash class
   lasts as long as the CSS animation instead of a fixed 700ms), the
   "Copied" label beside the button (copiedLabel) and the version. Loaded
   BEFORE zUnionSuite.js so the theme's own copy returns early. The flash
   and label styles are theme-candidate.css section 27.
   ========================================================================== */

/* US-COPY:START — reusable, delegated clipboard control. */
(function () {
  'use strict';
  if (window.UnionSuiteCopy) return;
  window.UnionSuiteCopy = {version:'1.1-candidate'};
  var pending = new WeakSet(), resets = new WeakMap(), flashes = new WeakMap();
  var live;
  function announce(text) {
    if (!live || !live.isConnected) {
      live = document.createElement('span'); live.className = 'us-copy-announcement';
      live.setAttribute('role','status'); live.setAttribute('aria-live','polite');
      document.body.appendChild(live);
    }
    live.textContent = text;
  }
  // Candidate 1.1: the flash class stays for the stylesheet's own animation
  // (duration plus delay), so CSS alone sets how long the fade lasts. With
  // no animation (reduced motion) the static flash shows for 700ms.
  function flashLength(target) {
    var style = window.getComputedStyle(target);
    var seconds = function (value) { return Math.max.apply(null, value.split(',').map(function (part) { part = part.trim(); return part.slice(-2) === 'ms' ? parseFloat(part) / 1000 : parseFloat(part) || 0; })); };
    var total = (seconds(style.animationDuration) + seconds(style.animationDelay)) * 1000;
    return total > 0 ? Math.ceil(total) : 700;
  }
  // Candidate 1.1: a visible "Copied" beside the button while it shows its
  // success tick. Inside the button, positioned past its edge, so nothing
  // moves; aria-hidden because the live region already announces it.
  function copiedLabel(button, show) {
    var label = button.querySelector(':scope > .us-copy-label');
    if (label) label.remove();
    if (!show) return;
    label = document.createElement('span');
    label.className = 'us-copy-label';
    label.setAttribute('aria-hidden', 'true');
    label.textContent = 'Copied';
    button.appendChild(label);
  }
  function fallback(text) {
    var active = document.activeElement;
    var selection = window.getSelection();
    var ranges = [];
    if (selection) for (var i = 0; i < selection.rangeCount; i++) ranges.push(selection.getRangeAt(i).cloneRange());
    var input = document.createElement('textarea');
    input.value = text;
    input.readOnly = true;
    input.style.cssText = 'position:fixed;top:0;left:-9999px;';
    document.body.appendChild(input);
    try {
      input.select();
      if (!document.execCommand('copy')) throw new Error('Copy unavailable');
    } finally {
      input.remove();
      if (active && active.isConnected) active.focus({preventScroll:true});
      if (selection) { selection.removeAllRanges(); ranges.forEach(function (range) { selection.addRange(range); }); }
    }
  }

  document.addEventListener('click', async function (event) {
    var button = event.target.closest('button.us-copy, button.us-banner__copy');
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true' || pending.has(button) || button.closest('.us-report-no-styling')) return;
    var targetId = button.getAttribute('data-us-copy-target');
    var target;
    if (targetId) {
      var matches = Array.from(document.querySelectorAll('[id]')).filter(function (node) { return node.id === targetId; });
      if (matches.length === 1) target = matches[0];
    } else if (button.matches('.us-banner__copy')) {
      var record = button.closest('.us-banner__record');
      target = record && record.querySelector('.us-banner__record-id');
    }
    var oldTitle = button.getAttribute('title');
    var previous = resets.get(button);
    if (previous) { clearTimeout(previous.timer); oldTitle = previous.title; }
    button.removeAttribute('data-us-copy-state');
    copiedLabel(button, false);
    announce('');
    pending.add(button);
    var oldBusy = button.getAttribute('aria-busy');
    button.setAttribute('aria-busy','true');
    try {
      if (!target || target.contains(button)) throw new Error('Missing, duplicate or recursive target');
      var text = (target.matches('input,textarea') ? target.value : target.textContent).trim();
      if (!text) throw new Error('Empty target');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try { await navigator.clipboard.writeText(text); } catch (_) { fallback(text); }
      } else { fallback(text); }
      button.setAttribute('data-us-copy-state','success');
      button.setAttribute('title','Copied');
      copiedLabel(button, true);
      announce('Copied');
      if (target.isConnected) {
        clearTimeout(flashes.get(target));
        target.classList.remove('us-copy-flash');
        void target.offsetWidth;
        target.classList.add('us-copy-flash');
        flashes.set(target,setTimeout(function () { target.classList.remove('us-copy-flash'); flashes.delete(target); },flashLength(target)));
      }
    } catch (_) {
      button.setAttribute('data-us-copy-state','error');
      button.setAttribute('title','Could not copy');
      announce('Could not copy. Select the text and copy it manually.');
    } finally {
      pending.delete(button);
      if (oldBusy === null) button.removeAttribute('aria-busy'); else button.setAttribute('aria-busy',oldBusy);
      resets.set(button,{title:oldTitle,timer:setTimeout(function () {
        button.removeAttribute('data-us-copy-state');
        copiedLabel(button, false);
        if (oldTitle === null) button.removeAttribute('title'); else button.setAttribute('title',oldTitle);
        resets.delete(button);
      },1600)});
    }
  });
})();
/* US-COPY:END */
