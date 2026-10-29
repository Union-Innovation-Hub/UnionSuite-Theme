/* ==========================================================================
   BANNER BEHAVIOUR — canonical shared theme implementation.
   No inline event attributes, cloned content, guessed record IDs or page links.
   Public refresh() supports custom content insertion in addition to native AJAX.
   ========================================================================== */
(function () {
  "use strict";
  if (window.UnionSuiteBanners) {
    window.UnionSuiteBanners.refresh();
    return;
  }

  // iMIS puts the configured CSS class inside the owning ContentItemContainer.
  // Behaviour belongs to that iPart, independently of page/zone/grid nesting.
  var scope = ".ContentItemContainer > .us-banner:is(.us-banner-sticky, .us-banner-collapsible)";
  var entry = null;
  var frame = 0;
  var needsRefresh = false;
  var paused = false;
  var application = null;
  var requestManager = null;
  var collapseAt = 60;
  var expandAt = 16;
  var observer = null;
  var openMenu = null;

  function closeMenu(restoreFocus) {
    if (!openMenu) return;
    var menu = openMenu;
    openMenu = null;
    menu.open = false;
    menu.classList.remove("us-banner__action-menu--upward");
    var trigger = menu.querySelector("summary");
    if (restoreFocus && menu.isConnected && trigger) trigger.focus();
  }

  function positionMenu() {
    if (!openMenu) return;
    if (!openMenu.isConnected || !openMenu.open || !openMenu.getClientRects().length) { closeMenu(false); return; }
    var trigger = openMenu.querySelector("summary");
    var panel = openMenu.querySelector(".us-banner__menu-panel");
    if (!trigger || !panel) return;
    var rect = trigger.getBoundingClientRect();
    var header = document.getElementById("hd");
    var headerRect = header && header.getBoundingClientRect();
    var top = headerRect && headerRect.top <= 1 ? Math.max(0, headerRect.bottom) : 0;
    var below = Math.max(0, window.innerHeight - rect.bottom - 16);
    var above = Math.max(0, rect.top - top - 16);
    var upward = below < Math.min(160, panel.scrollHeight) && above > below;
    openMenu.classList.toggle("us-banner__action-menu--upward", upward);
    writeStyle(panel, "--us-banner-menu-max-height", Math.min(384, upward ? above : below) + "px");
  }

  function writeStyle(el, property, value) {
    if (el.style.getPropertyValue(property) !== value) el.style.setProperty(property, value);
  }

  function schedule(refresh) {
    if (refresh === true) needsRefresh = true;
    if (frame || paused) return;
    frame = window.requestAnimationFrame(function () {
      frame = 0;
      if (needsRefresh) { needsRefresh = false; reconcile(); }
      update();
    });
  }

  function isEasyEdit() {
    return window.gIsEasyEditEnabled === true || document.body.classList.contains("TemplateAreaEasyEditOn");
  }

  function ownSurface(wrapper) {
    var surfaces = wrapper.querySelectorAll(".us-banner__surface");
    // A record query must return one banner, not several overlapping headers.
    return surfaces.length === 1 && surfaces[0].closest(".us-banner") === wrapper ? surfaces[0] : null;
  }

  function foldElements(state) {
    state.folds = state.folds.filter(function (fold) { return state.surface.contains(fold); });
    var candidates = Array.from(state.surface.querySelectorAll(".us-banner__subtitle, .us-banner__details, [data-us-banner-collapse]"));
    candidates.forEach(function (el) {
      if (el.closest(".us-banner") !== state.wrapper || el.closest(".us-banner__fold")) return;
      if (candidates.some(function (other) { return other !== el && other.contains(el); })) return;
      var fold = document.createElement("div");
      var inner = document.createElement("div");
      fold.className = "us-banner__fold";
      inner.className = "us-banner__fold-inner";
      el.before(fold);
      fold.appendChild(inner);
      inner.appendChild(el);
      state.folds.push(fold);
      fold.inert = state.compact;
      if (state.compact) fold.setAttribute("aria-hidden", "true");
    });
  }

  function setCompact(state, compact) {
    if (state.compact === compact) return;
    state.compact = compact;
    state.wrapper.classList.toggle("us-banner--compact", compact);
    state.folds.forEach(function (fold) {
      fold.inert = compact;
      if (compact) fold.setAttribute("aria-hidden", "true");
      else fold.removeAttribute("aria-hidden");
    });
  }

  function release() {
    if (!entry) return;
    var state = entry;
    entry = null;
    state.resize.disconnect();
    state.wrapper.classList.remove("us-banner--enhanced", "us-banner--pinned", "us-banner--compact");
    if (state.originalHeight) state.wrapper.style.setProperty("height", state.originalHeight, state.originalHeightPriority);
    else state.wrapper.style.removeProperty("height");
    ["--us-banner-fixed-top", "--us-banner-fixed-left", "--us-banner-fixed-width"].forEach(function (property) {
      state.surface.style.removeProperty(property);
    });
    state.folds.forEach(function (fold) {
      var inner = fold.firstElementChild;
      if (fold.parentNode && inner) {
        while (inner.firstChild) fold.before(inner.firstChild);
        fold.remove();
      }
    });
  }

  function reconcile() {
    attachAjax();
    if (isEasyEdit() || !window.ResizeObserver) { release(); return; }
    var wrapper = Array.from(document.querySelectorAll(scope)).find(function (candidate) {
      return candidate.getClientRects().length && candidate.getBoundingClientRect().width > 0 && ownSurface(candidate);
    });
    var surface = wrapper && ownSurface(wrapper);
    if (entry && (entry.wrapper !== wrapper || entry.surface !== surface)) release();
    if (!wrapper) return;
    if (!entry) {
      entry = {
        wrapper: wrapper, surface: surface, folds: [], compact: false, pinned: false,
        expandedHeight: surface.getBoundingClientRect().height,
        originalHeight: wrapper.style.getPropertyValue("height"),
        originalHeightPriority: wrapper.style.getPropertyPriority("height"),
        header: null, resize: new ResizeObserver(function () { schedule(); })
      };
      wrapper.classList.add("us-banner--enhanced");
      entry.resize.observe(wrapper);
      entry.resize.observe(surface);
    }
    var header = document.getElementById("hd");
    if (header !== entry.header) {
      if (entry.header) entry.resize.unobserve(entry.header);
      entry.header = header;
      if (header) entry.resize.observe(header);
    }
    foldElements(entry);
  }

  function update() {
    positionMenu();
    if (!entry) return;
    var state = entry;
    if (!state.wrapper.isConnected || !state.wrapper.getClientRects().length) { schedule(true); return; }
    var rect = state.wrapper.getBoundingClientRect();
    var headerRect = state.header && state.header.getBoundingClientRect();
    var top = headerRect && headerRect.top <= 1 ? Math.max(0, headerRect.bottom) : 0;
    var pin = rect.top <= top + .5 && window.innerHeight - top > 140;
    var y = window.scrollY || document.documentElement.scrollTop;
    var compact = state.compact;
    var focusInDetails = state.folds.some(function (fold) { return fold.contains(document.activeElement); });
    var descriptionExpanded = !!state.surface.querySelector('.us-banner__description-toggle[aria-expanded="true"]');
    if (!pin || !state.wrapper.classList.contains("us-banner-collapsible") || y <= expandAt || focusInDetails || descriptionExpanded) compact = false;
    else if (y > collapseAt && state.collapseRequested) compact = true;
    else if (y > collapseAt && !compact) {
      // Reserve enough scroll range that shrinking cannot bounce a short page
      // back across the expansion threshold. Long record pages condense normally.
      compact = document.documentElement.scrollHeight - window.innerHeight > state.expandedHeight + collapseAt;
    }

    if (pin) {
      writeStyle(state.surface, "--us-banner-fixed-top", top + "px");
      writeStyle(state.surface, "--us-banner-fixed-left", rect.left + "px");
      writeStyle(state.surface, "--us-banner-fixed-width", rect.width + "px");
      if (!state.pinned) {
        writeStyle(state.wrapper, "height", state.surface.getBoundingClientRect().height + "px");
        state.wrapper.classList.add("us-banner--pinned");
        state.pinned = true;
      }
    } else if (state.pinned) {
      state.wrapper.classList.remove("us-banner--pinned");
      if (state.originalHeight) state.wrapper.style.setProperty("height", state.originalHeight, state.originalHeightPriority);
      else state.wrapper.style.removeProperty("height");
      state.pinned = false;
    }
    state.collapseRequested = false;
    setCompact(state, compact);
    var height = state.surface.getBoundingClientRect().height;
    if (!state.compact) state.expandedHeight = Math.max(state.expandedHeight, height);
    if (state.pinned) writeStyle(state.wrapper, "height", height + "px");
  }

  function beforeUpdate() {
    closeMenu(false);
    paused = true;
    if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
    release();
  }

  function afterUpdate() { paused = false; schedule(true); }

  function attachAjax() {
    var sys = window.Sys;
    if (!sys) return;
    if (sys.Application && application !== sys.Application) {
      application = sys.Application;
      application.add_load(afterUpdate);
    }
    var manager = sys.WebForms && sys.WebForms.PageRequestManager && sys.WebForms.PageRequestManager.getInstance();
    if (manager && requestManager !== manager) {
      requestManager = manager;
      manager.add_pageLoading(beforeUpdate);
      manager.add_endRequest(afterUpdate);
    }
  }

  window.UnionSuiteBanners = {
    refresh: function () { schedule(true); },
    // Explicit Show less may move focus out of the folding region.
    descriptionClosed: function (surface) {
      if (!entry || entry.surface !== surface || !entry.wrapper.classList.contains('us-banner-collapsible')) return;
      var title = surface.querySelector('.us-banner__title');
      if (!title) return;
      if (entry.folds.some(function (fold) { return fold.contains(document.activeElement); })) {
        var oldTabindex = title.getAttribute('tabindex');
        title.setAttribute('tabindex','-1');
        title.focus({preventScroll:true});
        title.addEventListener('blur',function () {
          if (oldTabindex === null) title.removeAttribute('tabindex'); else title.setAttribute('tabindex',oldTabindex);
        },{once:true});
      }
      entry.collapseRequested = (window.scrollY || document.documentElement.scrollTop) > collapseAt;
      schedule();
    },
    // Read-only diagnostics for a live iMIS page; contains no record data.
    getStatus: function () {
      var candidates = document.querySelectorAll(scope);
      return {
        scriptLoaded: true,
        easyEdit: isEasyEdit(),
        resizeObserverAvailable: !!window.ResizeObserver,
        markedIparts: candidates.length,
        eligibleVisibleIparts: Array.from(candidates).filter(function (wrapper) {
          return wrapper.getClientRects().length && wrapper.getBoundingClientRect().width > 0 && ownSurface(wrapper);
        }).length,
        active: !!entry,
        pinned: !!entry && entry.pinned,
        compact: !!entry && entry.compact
      };
    }
  };
  window.addEventListener("scroll", function () { schedule(); }, { passive: true });
  window.addEventListener("resize", function () { schedule(true); }, { passive: true });
  document.addEventListener("focusin", function (event) {
    if (openMenu && !openMenu.contains(event.target)) closeMenu(false);
    schedule();
  });
  document.addEventListener("focusout", function () { schedule(); });
  document.addEventListener("toggle", function (event) {
    var menu = event.target;
    if (!menu.matches || !menu.matches(".us-banner details.us-banner__action-menu")) return;
    if (menu.hasAttribute("data-us-actions-ready")) return;
    if (menu.open) {
      if (openMenu !== menu) closeMenu(false);
      openMenu = menu;
      positionMenu();
    } else if (openMenu === menu) openMenu = null;
  }, true);
  document.addEventListener("pointerdown", function (event) {
    if (openMenu && !openMenu.contains(event.target)) closeMenu(false);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && openMenu && !event.defaultPrevented) {
      event.preventDefault();
      closeMenu(true);
    }
  });
  document.addEventListener("click", function (event) {
    if (!openMenu) return;
    var action = event.target.closest(".us-banner__menu-item");
    if (action && openMenu.contains(action) && !action.disabled) closeMenu(openMenu.contains(document.activeElement));
  });
  window.addEventListener("pageshow", function () { schedule(true); });

  function start() {
    if (!observer) {
      observer = new MutationObserver(function (records) {
        if (records.some(function (record) {
          if (record.type === "childList") return record.addedNodes.length || record.removedNodes.length;
          return record.target === document.body || record.target.matches(scope) || (entry && record.target === entry.wrapper);
        })) schedule(true);
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });
    }
    schedule(true);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
  window.addEventListener("load", function () { attachAjax(); schedule(true); }, { once: true });
})();

/* Member profile status colours: independent of the scrolling enhancement. */
(function(){
  'use strict';
  if(window.UnionSuiteMemberStatus)return;
  const selector='.us-banner :is(.us-banner__surface--member,.us-banner__surface--status)';
  function luminance(c){const n=c.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return n[0]*.2126+n[1]*.7152+n[2]*.0722;}
  function displayColour(value){
    const input=/^#[0-9a-f]{6}$/i.test((value||'').trim())?value.trim().toUpperCase():'#596579';
    if(1.05/(luminance(input)+.05)>=4.5)return input;
    const rgb=input.slice(1).match(/../g).map(v=>parseInt(v,16));
    const shade=f=>'#'+rgb.map(v=>Math.floor(v*f).toString(16).padStart(2,'0')).join('').toUpperCase();
    let low=0,high=1;for(let i=0;i<24;i++){const mid=(low+high)/2;if(1.05/(luminance(shade(mid))+.05)>=4.5)low=mid;else high=mid;}
    return shade(low);
  }
  function refresh(){
    document.querySelectorAll(selector).forEach(surface=>{
      if(surface.closest('.us-report-no-styling'))return;
      const c=displayColour(surface.getAttribute('data-us-status-colour'));
      surface.style.setProperty('--member-status-colour',c);
      surface.style.setProperty('--member-status-inner-edge',luminance(c)<.14?'rgba(255,255,255,.5)':'transparent');
      surface.querySelectorAll('.us-banner__badge--member-status').forEach(pill=>{if(!pill.textContent.trim())pill.textContent='Status unavailable';});
    });
  }
  let pending=false;
  function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;refresh();});}
  window.UnionSuiteMemberStatus={refresh:refresh,displayColour:displayColour};
  function start(){refresh();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-us-status-colour','class']});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
