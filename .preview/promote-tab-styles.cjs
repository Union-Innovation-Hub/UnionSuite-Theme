const fs=require('fs'),p='Theme/UnionSuite/zUnionSuite.css';let s=fs.readFileSync(p,'utf8'),a=s.indexOf('/* Quiet selected navigation;'),b=s.indexOf('/* US-BANNER-COMPONENT:END */',a);
s=s.slice(0,a)+`
/* Approved 6B: full-width darker navigation with neutral segmented tabs. */
.us-banner .us-banner__surface:has(> .us-banner__nav > .us-banner__tabs){--us-tab-inset:var(--banner-padding);padding-inline:var(--us-tab-inset)}
.us-banner.us-banner--compact .us-banner__surface{--us-tab-inset:var(--banner-padding)}
:root .us-banner .us-banner__surface .us-banner__nav:has(> .us-banner__tabs){margin-inline:calc(-1 * var(--us-tab-inset));padding-inline:var(--us-tab-inset);background:rgb(0 0 0 / 10%);border-radius:0 0 var(--banner-radius) 0}
:root .us-banner .us-banner__surface .us-banner__tabs{padding:7px 4px;gap:4px}
:root .us-banner .us-banner__surface .us-banner__tab{border:0;border-radius:6px}
:root .us-banner .us-banner__surface .us-banner__tab:is(.is-active,[aria-selected=true],[aria-current=page]){background:rgb(255 255 255 / 14%);box-shadow:0 1px 4px rgb(0 20 30 / 12%);color:var(--banner-text)}
:root .us-banner .us-banner__surface .us-banner__tab:active:not(:disabled){background:rgb(255 255 255 / 8%);box-shadow:inset 0 2px 4px rgb(0 0 0 / 28%)}
@media(max-width:600px){.us-banner .us-banner__surface:has(> .us-banner__nav > .us-banner__tabs){--us-tab-inset:var(--space-4)}}
`+s.slice(b);
s+=`
/* US-SECTION-TABS:START — approved option 6 standalone submenu */
.us-section-tabs:not(:where(.us-report-no-styling *)){display:flex;gap:4px;padding:4px;width:fit-content;max-width:100%;overflow-x:auto;scrollbar-width:thin;background:var(--bg-sunken);border:1px solid var(--border);border-radius:10px}
.us-section-tabs > [data-us-tab]:not(:where(.us-report-no-styling *)){position:relative;flex:0 0 auto;min-height:44px;margin:0;padding:10px 16px;border:0;border-radius:6px;background:transparent;color:var(--text-base);font:600 13px var(--font-ui);white-space:nowrap;cursor:pointer}
.us-section-tabs > [data-us-tab]:hover:not(:disabled){background:var(--bg-surface)}
.us-section-tabs > [data-us-tab]:is(.is-active,[aria-selected=true]){background:var(--bg-surface);box-shadow:0 1px 4px rgb(0 20 30 / 12%);color:var(--text-strong)}
.us-section-tabs > [data-us-tab]:is(.is-active,[aria-selected=true])::after{content:'';position:absolute;bottom:3px;left:calc(50% - 10px);width:20px;height:2px;background:var(--accent);border-radius:2px}
.us-section-tabs > [data-us-tab]:active:not(:disabled){box-shadow:inset 0 2px 4px rgb(0 20 30 / 22%);background:var(--bg-sunken)}
.us-section-tabs > [data-us-tab]:focus-visible{outline:2px solid var(--border-focus);outline-offset:-4px}
.us-section-tabs > [data-us-tab]:disabled{opacity:.5;cursor:not-allowed}
[data-us-section-hidden]{display:none!important}
/* US-SECTION-TABS:END */
`;fs.writeFileSync(p,s);
