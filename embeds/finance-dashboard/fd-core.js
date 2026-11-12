/**
 * fd-core.js — Finance Dashboard shared core
 * © Union Innovation Hub.
 *
 * Everything both surfaces need: reference data, formatters, the run/payment
 * roll-ups, badge markup, toasts, sticky-table syncing, and
 * the NAVIGATION layer that moves between the run list and the run screen.
 *
 * Exposes a single global: `window.FDCore`. The app is inlined into a live iMIS
 * page, so bare function globals would risk colliding with iMIS's own scripts.
 */
window.FDCore = (function () {
  "use strict";

  const C = window.FDConfig;

  /* ═══════════════════════════════════════════════════════════
     REFERENCE DATA
     Payment types and decline reasons are small, closed sets. They are
     presentation reference data (label + colour), so they live here rather
     than being fetched — see docs/DATA-REQUIREMENTS.md §4, which explains why
     hard-coding them costs zero API calls and what to do if the finance team
     adds a gateway with new reason codes.
     ═══════════════════════════════════════════════════════════ */

  const PAY_TYPES = [
    { id: "dd",   label: "Direct Debit", color: "#2563c4", pale: "#e8f0fb" },
    { id: "cc",   label: "Credit Card",  color: "#e8720c", pale: "#fdf0e3" },
    { id: "bpay", label: "BPAY",         color: "#0d9488", pale: "#e6f7f5" },
    { id: "eft",  label: "EFT Transfer", color: "#64748b", pale: "#eef2f7" },
    { id: "inv",  label: "Invoice",      color: "#9a6510", pale: "#fdf3e0" },
    { id: "pd",   label: "Payroll",      color: "#7c3aed", pale: "#f1eafd" },
  ];
  const typeById = id => PAY_TYPES.find(t => t.id === id) || PAY_TYPES[3];

  const PAY_AREAS = [
    { id: "dues",  label: "Membership Dues", color: "#1a4b8c" },
    { id: "ins",   label: "Insurance",       color: "#0d9488" },
    { id: "event", label: "Event income",    color: "#7c3aed" },
    { id: "addon", label: "Other add ons",   color: "#e8720c" },
  ];

  const DECLINE_REASONS = [
    "Insufficient funds", "Expired card", "Invalid account number",
    "Payment cancelled by member", "Bank rejected transaction",
    "Card reported lost/stolen",
  ];

  /* Soft = may succeed on retry; hard = will never succeed without new payment
     details, so a bulk retry must exclude it. */
  const DECLINE_KIND = {
    "Insufficient funds":           "Soft",
    "Bank rejected transaction":    "Soft",
    "Expired card":                 "Hard",
    "Invalid account number":       "Hard",
    "Payment cancelled by member":  "Hard",
    "Card reported lost/stolen":    "Hard",
  };
  const declineKind = reason => DECLINE_KIND[reason] || "Soft";

  /* The payment outcomes the UI groups by, in lifecycle order. */
  const STATUS_ORDER = ["Pending", "Processing", "Awaiting payment", "Cleared", "Reconciled", "Declined"];
  const PAID = ["Cleared", "Reconciled"];
  const isPaid = t => PAID.includes(t.status);

  /* ═══════════════════════════════════════════════════════════
     FORMATTERS
     ═══════════════════════════════════════════════════════════ */
  const $ = id => document.getElementById(id);
  const fmtMoney = n => Number(n || 0).toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: n >= 10000 ? 0 : 2 });
  const fmtNum = n => Number(n || 0).toLocaleString("en-AU");
  const fmtPct = n => (n * 100).toFixed(1) + "%";
  const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmtDateLong = d => `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
  const fmtDateShort = d => `${d.getDate()} ${MON[d.getMonth()]}`;
  /* Numeric character references, assembled at runtime — deliberately.

     iMIS DECODES HTML ENTITIES IN SAVED CONTENT, including inside script text.
     This function used to map each character to its NAMED entity. On save,
     every one of those was decoded back to the bare character — and the quote
     entity became a bare double quote inside a double-quoted string, which is
     an unescaped-line-break SyntaxError that kills the entire bundle. Measured
     4 Sep 2026 on a published page.

     Nothing below is a decodable entity in the source: the ampersand comes from
     a char code, so no complete reference is ever written literally. The output
     is equivalent (numeric references for & < > ").

     ⚠ NEVER write a named HTML entity in a .js file. See test/FINDINGS.md §5. */
  const AMP = String.fromCharCode(38);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => AMP + "#" + c.charCodeAt(0) + ";");

  /* ═══════════════════════════════════════════════════════════
     ROLL-UPS
     runStats/runState are the ONLY place run-level figures are derived, so the
     list, the KPI cards and the run screen can never disagree. In live mode the
     same shape arrives pre-aggregated from the batch-summary view — see
     docs/DATA-REQUIREMENTS.md §2 — and FDData.runStats() short-circuits to it
     rather than reducing over transactions the browser never loaded.
     ═══════════════════════════════════════════════════════════ */
  function runStats(run) {
    if (run.stats) return run.stats;                 // pre-aggregated (live mode)
    const val = a => a.reduce((s, t) => s + t.amount, 0);
    const paid = run.txns.filter(isPaid);
    const proc = run.txns.filter(t => t.status === "Processing");
    const pend = run.txns.filter(t => t.status === "Pending");
    const wait = run.txns.filter(t => t.status === "Awaiting payment");
    const bad  = run.txns.filter(t => t.status === "Declined");
    return {
      count: run.txns.length,
      okCount: paid.length,   okValue: val(paid),
      procCount: proc.length, procValue: val(proc),
      pendCount: pend.length, pendValue: val(pend),
      waitCount: wait.length, waitValue: val(wait),
      badCount: bad.length,   badValue: val(bad),
      badUnprocessed: bad.filter(t => t.stillOwed).length,
      totalValue: val(run.txns),
    };
  }

  /* The run itself has no stored status — its state is derived from its
     payments. Lifecycle: Generated (created, not yet sent to the bank) →
     Processing (sent, awaiting bank results) → Finalised (nothing left
     processing). */
  function runState(run) {
    const s = runStats(run);
    if (s.pendCount) return { key: "generated",  label: "Generated", cls: "generated" };
    if (s.procCount) return { key: "processing", label: `Processing · ${fmtNum(s.procCount)}`, cls: "processing" };
    return { key: "finalised", label: "Finalised", cls: "completed" };
  }

  /* A run is flagged for review when a payment has sat in Processing longer
     than FDConfig.reviewProcessingDays. In live mode this comes straight off
     the summary view as MaxProcessingDays — no transaction scan. */
  function isLongProcessingRun(run) {
    if (typeof run.maxProcessingDays === "number") return run.maxProcessingDays > C.reviewProcessingDays;
    return !!run.needsReview;
  }

  /* ═══════════════════════════════════════════════════════════
     BADGES & PILLS
     ═══════════════════════════════════════════════════════════ */
  const TXN_BADGES = {
    "Cleared":          '<span class="badge success"><i class="fa-solid fa-check"></i> Cleared</span>',
    "Reconciled":       '<span class="badge reconciled"><i class="fa-solid fa-check-double"></i> Reconciled</span>',
    "Processing":       '<span class="badge processing"><i class="fa-solid fa-rotate"></i> Processing</span>',
    "Awaiting payment": '<span class="badge awaiting"><i class="fa-regular fa-clock"></i> Awaiting payment</span>',
    "Declined":         '<span class="badge declined"><i class="fa-solid fa-xmark"></i> Declined</span>',
    "Pending":          '<span class="badge pending"><i class="fa-regular fa-circle"></i> Pending</span>',
  };
  const txnBadge = status => TXN_BADGES[status] || esc(status);

  function runStatePill(run) {
    const st = runState(run);
    return `<span class="status-pill ${st.cls}"><span class="dot"></span>${st.label}</span>`;
  }

  function typeChip(pt, suffix) {
    return `<span class="type-chip" style="background:${pt.pale};color:${pt.color}">${esc(pt.label)}${suffix || ""}</span>`;
  }

  /* ═══════════════════════════════════════════════════════════
     TOASTS
     ═══════════════════════════════════════════════════════════ */
  function toast(msg, cls) {
    const host = $("toast-container");
    if (!host) return;
    const el = document.createElement("div");
    el.className = "toast " + (cls || "");
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  /* ═══════════════════════════════════════════════════════════
     STICKY TABLE HEADERS
     .table-wrap deliberately has no scroll container so a table's sticky <th>
     pins against .main-scroll instead. The .stuck class squares the header off
     and bleeds it to the gutters; it's re-queried each frame so it survives
     every re-render.

     The exception is a table too wide for its column (narrow screens, or the
     iMIS sidebar open): .main-scroll clips sideways, so the right-hand columns
     were unreachable. Such a table's .table-wrap gets .scroll-x and becomes
     the table's own scroll box (see fd-styles.css). The <th> then pins against
     the wrap, not .main-scroll, so .stuck and its gutter bleed are switched
     off for that table. This is measured,
     not a media query, because the column's width depends on the host page
     and not only on the viewport.
     ═══════════════════════════════════════════════════════════ */
  function syncStuckTables() {
    const sc = $("main-scroll");
    if (!sc) return;
    const rootTop = sc.getBoundingClientRect().top;
    document.querySelectorAll(".page:not([style*='display: none']):not([style*='display:none']) table.report-table")
      .forEach(t => {
        const wrap = t.closest(".table-wrap");
        // The table's own width, not wrap.scrollWidth: scrollWidth also counts
        // the header's gutter bleed, which flipped this back on at full width.
        const tooWide = !!wrap && t.offsetWidth > wrap.clientWidth + 1;
        if (wrap) wrap.classList.toggle("scroll-x", tooWide);
        const r = t.getBoundingClientRect();
        t.classList.toggle("stuck", !tooWide && r.top < rootTop && r.bottom > rootTop + 60);
      });
  }

  let stickyObserver = null;
  function watchStickyHeaders() {
    if (stickyObserver) stickyObserver.disconnect();
    const root = $("main-scroll");
    if (!root) return;
    stickyObserver = new IntersectionObserver(
      entries => entries.forEach(e => e.target.classList.toggle(
        "stuck", e.intersectionRatio < 1 && e.boundingClientRect.top < e.rootBounds.top)),
      { root, threshold: [1] }
    );
    document.querySelectorAll(".date-group-sticky").forEach(el => stickyObserver.observe(el));
  }

  function bindScrollSync() {
    const sc = $("main-scroll");
    if (sc) sc.addEventListener("scroll", () => requestAnimationFrame(syncStuckTables), { passive: true });
    // Whether a table fits its column changes with the window, not with scroll.
    window.addEventListener("resize", () => requestAnimationFrame(syncStuckTables), { passive: true });
  }

  /* Re-triggers the small fade used when a metric label set changes. */
  function flashSwap(el) {
    if (!el) return;
    el.classList.remove("swap");
    void el.offsetWidth;
    el.classList.add("swap");
  }

  /* ═══════════════════════════════════════════════════════════
     ENVIRONMENT & LICENCE
     ═══════════════════════════════════════════════════════════ */
  /* iMIS page markers: the anti-forgery token and the client context both exist
     only on a real RiSE page, and both are what the live data layer needs. */
  function isInIMIS() {
    return !!(document.getElementById("__RequestVerificationToken") ||
              document.getElementById("__ClientContext"));
  }

  /* ═══════════════════════════════════════════════════════════
     NAVIGATION — the two surfaces
     Embedded, the app is INLINED into the iMIS page, so `window.location` IS
     the iMIS page's URL: navigating it moves the user between two RiSE pages
     on the iMIS host and the browser Back button works for free. Outside iMIS
     the same calls navigate the two static HTML files instead, so the identical
     build runs from a dev server.

     If a surface has no iMIS page configured, urlFor() returns null and the
     caller falls back to an in-page view swap — the original mockup's
     behaviour. That keeps a half-configured deploy usable.
     ═══════════════════════════════════════════════════════════ */
  const Nav = {

    /* Which surface this document is. Set by the HTML shell. */
    surface: "dashboard",

    /* The run id this page was opened for, or null. Read from the HOST page's
       query string, which is where it lands when embedded. */
    runIdFromUrl() {
      const v = new URLSearchParams(window.location.search).get(C.runParam);
      return v ? v.trim() : null;
    },

    /* Resolve a surface to a URL, or null if it can't be reached by navigation
       and the caller should swap views in place instead. */
    urlFor(surface, params) {
      /* Unresolvable in EITHER branch returns null, not a URL built from
         undefined — `new URL(null, …)` cheerfully resolves to "/null" and would
         navigate the user off the app. */
      const base = isInIMIS()
        ? (C.imisPages && C.imisPages[surface])
        : (C.files && C.files[surface]);
      if (!base || typeof base !== "string") return null;

      /* A document with no navigable address — an about:srcdoc / about:blank
         frame, which is how file previewers and some CMS editors render HTML —
         makes `new URL` throw "Invalid URL". That is "can't navigate here", not
         an error: return null so callers take their in-page fallback. */
      let u;
      try { u = new URL(base, window.location.href); } catch (e) { return null; }
      /* Drop our own param first so navigating dashboard→run→dashboard can't
         accumulate stale copies of it. */
      u.searchParams.delete(C.runParam);
      Object.entries(params || {}).forEach(([k, v]) => u.searchParams.set(k, v));
      return u.pathname + (u.search || "") + (u.hash || "");
    },

    /* Both return true if they navigated, false if the caller must fall back. */
    gotoRun(runId) {
      const url = this.urlFor("run", { [C.runParam]: runId });
      if (!url) return false;
      window.location.assign(url);
      return true;
    },

    gotoDashboard() {
      const url = this.urlFor("dashboard");
      if (!url) return false;
      window.location.assign(url);
      return true;
    },

    /* v2. Returns false in v1, where imisPages.arrears is deliberately null —
       callers must treat that as "the arrears page does not exist here". */
    gotoArrears() {
      const url = this.urlFor("arrears");
      if (!url) return false;
      window.location.assign(url);
      return true;
    },

    /* True when the run screen lives at its own URL, i.e. a real page load got
       us here. Drives whether the run screen shows "Back to dashboard" in the
       header (its own page) or an in-page back button (fallback swap). */
    isDedicatedRunPage() {
      return this.surface === "run" && this.urlFor("dashboard") !== null;
    },
  };

  /* One-time sanity check: each surface is a separate HTML shell and a separate
     runtime-URL iPart, so no two may share a RiSE page — "back to dashboard"
     would reload the page you were already on. */
  function checkConfig() {
    const p = C.imisPages || {};
    const seen = new Map();
    for (const [surface, path] of Object.entries(p)) {
      if (!path) continue;                       // null = not configured / not deployed
      if (seen.has(path)) {
        console.warn(`[FinanceDashboard] FDConfig.imisPages.${seen.get(path)} and .${surface} ` +
                     `both point at "${path}". Each surface needs its own RiSE page, ` +
                     `because each is a different runtime-URL iPart.`);
      }
      seen.set(path, surface);
    }
  }

  /* Render the licence / not-found notice into a page container. */
  function notice(container, title, body, backLabel) {
    const back = backLabel
      ? `<button type="button" class="back-btn" data-fd-back><i class="fa-solid fa-arrow-left"></i> ${esc(backLabel)}</button>`
      : "";
      container.innerHTML = `<div class="fd-notice"><h3>${esc(title)}</h3><p>${esc(body)}</p>${back}</div>`;
    const btn = container.querySelector("[data-fd-back]");
    if (btn) btn.addEventListener("click", () => { if (!Nav.gotoDashboard()) window.history.back(); });
  }

  /* ═══════════════════════════════════════════════════════════
     LOADING SKELETONS
     Grey placeholder blocks in the shape of the page, drawn once the styles
     are in and before the first data call returns (live, the dashboard's Q1 is
     3–4s). Each surface's normal render overwrites the same containers, so
     nothing has to clear them on success; clearSkeleton() is for the error
     path, where a notice replaces only one container.
     `.fd-loading` on the root also makes the static controls inert until the
     data they act on exists.
     ═══════════════════════════════════════════════════════════ */
  const sk = (cls, style) => `<span class="sk ${cls}"${style ? ` style="${style}"` : ""}></span>`;
  const skKpis = n => Array.from({ length: n }, () =>
    `<div class="kpi-card sk-kpi">${sk("sk-line w40")}${sk("sk-value")}${sk("sk-line w70")}</div>`).join("");
  const skRunCard = () => `<div class="sk-run">
      <div class="sk-run-name">${sk("sk-line w70")}${sk("sk-line w45 sm")}</div>
      ${sk("sk-pill")}${sk("sk-line w60")}${sk("sk-line w40")}${sk("sk-line w40")}${sk("sk-line w40")}
    </div>`;
  /* Fixed heights, not random: the skeleton must look the same every load. */
  const SK_BARS = [55, 70, 62, 78, 48, 0, 0, 40, 52, 58, 66, 72, 0, 0, 60, 58, 44, 92, 64, 0, 0, 38, 60, 76, 88, 70];

  function skeletonDashboard() {
    const root = $("fd-root");
    if (root) root.classList.add("fd-loading");
    const kpi = $("kpi-grid");
    if (kpi) kpi.innerHTML = skKpis(6);
    const svg = $("trend-svg");
    if (svg) {
      const w = 560 / SK_BARS.length;
      svg.innerHTML = SK_BARS.map((h, i) => h
        ? `<rect class="sk-svg" x="${(i * w + w * 0.18).toFixed(1)}" y="${130 - h * 1.3}" width="${(w * 0.64).toFixed(1)}" height="${h * 1.3}" rx="2"></rect>`
        : "").join("");
    }
    const bars = $("type-bars");
    if (bars) bars.innerHTML = [92, 64, 38, 20, 10].map(w =>
      `<div class="sk-hbar">${sk("sk-line w20")}${sk("sk-track", `--w:${w}%`)}</div>`).join("");
    const list = $("runs-list");
    if (list) list.innerHTML = [3, 2].map(n =>
      `<div class="sk-date">${sk("sk-line w20 lg")}</div>` + Array.from({ length: n }, skRunCard).join("")).join("");
  }

  function skeletonRun(container) {
    const root = $("fd-root");
    if (root) root.classList.add("fd-loading");
    if (!container) return;
    const panel = rows => `<div class="panel">${sk("sk-line w40")}${
      Array.from({ length: rows }, () => `<div class="sk-tr">${sk("sk-line w45")}${sk("sk-line w20")}${sk("sk-line w20")}</div>`).join("")}</div>`;
    container.innerHTML = `
      <div class="detail-hd sk-hd">
        <div class="sk-hd-text">${sk("sk-line w60 lg")}${sk("sk-line w40")}</div>
        <span class="spacer"></span>${sk("sk-btn")}${sk("sk-btn")}
      </div>
      <div class="kpi-grid" style="margin-top:14px;">${skKpis(6)}</div>
      <div class="detail-panels">${panel(3)}${panel(4)}${panel(3)}</div>
      <div class="sk-table">${Array.from({ length: 8 }, () =>
        `<div class="sk-tr">${sk("sk-line w20")}${sk("sk-line w45")}${sk("sk-line w20")}${sk("sk-line w20")}${sk("sk-line w20")}</div>`).join("")}</div>`;
  }

  function clearSkeleton() {
    const root = $("fd-root");
    if (root) root.classList.remove("fd-loading");
    ["kpi-grid", "trend-svg", "type-bars"].forEach(id => {
      const el = $(id);
      if (el && el.querySelector(".sk, .sk-svg")) el.innerHTML = "";
    });
  }

  checkConfig();

  return {
    // reference data
    PAY_TYPES, PAY_AREAS, DECLINE_REASONS, DECLINE_KIND, STATUS_ORDER, PAID,
    typeById, declineKind, isPaid,
    // formatters
    $, fmtMoney, fmtNum, fmtPct, fmtDateLong, fmtDateShort, esc, DOW, MON,
    // roll-ups
    runStats, runState, isLongProcessingRun,
    // markup
    txnBadge, runStatePill, typeChip, toast, notice,
    skeletonDashboard, skeletonRun, clearSkeleton,
    // chrome
    syncStuckTables, watchStickyHeaders, bindScrollSync, flashSwap,
    // environment
    isInIMIS,
    // navigation
    Nav,
  };
})();
