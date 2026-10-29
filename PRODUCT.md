# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Confirmed audiences for Union Innovation Hub's iMIS work, in the order this project touches them:

- **Union staff and administrators working inside the iMIS staff site.** Every surface in this folder is a staff-site CRM screen: case/agreement management, a member profile, a company hierarchy and worksite roster, a member-jobs relationship explorer, a personal task dashboard. They are doing operational union work — negotiating and tracking agreements, maintaining member and employer records, working a task queue — with iMIS open all day.
- **Union members and delegates**, via member-facing portal surfaces elsewhere in the wider workspace. No surface in this folder is member-facing today.
- **A small internal config/build team (including the project owner)** who author the layouts, themes and IQAs and deploy them into iMIS.
- **Client organisations beyond UIH** that Union Innovation Hub delivers iMIS work for, meaning a layout is expected to survive re-theming and redeployment into another tenant rather than being hardcoded to one.

## Product Purpose

Redesigned page layouts and reusable theme components for the iMIS staff-site CRM. Stock iMIS renders its CRM screens through the Orion theme (`legacy/Orion.css` and `legacy/Orion page.html` here are captures of that incumbent); this project produces replacement layouts for the screens union staff actually live in, so that the record on screen is organised around union work rather than around iMIS's generic contact model.

Success is a staff member opening one of these screens and finding the thing they came for without hunting: the state of an agreement, who is covered at a worksite, what a member's jobs are, what is on their own plate today.

## Positioning

Derived from the artifacts in this folder, not from a stated claim: the differentiator is that these are *union-shaped* CRM screens, not a restyle of a generic CRM. The surfaces built are agreement/case management with terms, milestones, meetings and a negotiating team; employer hierarchy with a member roster underneath it; member-to-job relationships; delegate and worksite structure. A neighbouring iMIS implementation could restyle Orion; it could not truthfully claim these information structures without doing the same domain work.

## Operating Context

- Screens render **inside the iMIS staff site**, under a host chrome the layout does not own (the prototypes mock that host header — see the `.host-header` block in `company-hierarchy.html` — rather than replacing it).
- Data comes from **iMIS IQAs and the CloudToolz datasource layer**, and interaction routes through iMIS's own popup pages and REST endpoints. [The agreement integration reference](prototypes/legacy/Agreement%20Management/Agreement-Management-JS-README.md) documents the working pattern: launch an iMIS popup, then reload the affected IQA grid on close. That is the ambient interaction model these layouts sit in — the layout is a shell around iMIS-native editing, not a replacement for it.
- Staff use these on desktop, at width, for long sittings. Density and scanability matter more than first-impression impact.
- The wider workspace this folder sits in (`../Hub Widgets`, `../Finance Dashboard`, `../Data Template display`, `../ReportBuilder`) shares the same iMIS + CloudToolz + Cloudflare Pages context and the same no-build house style.

## Capabilities and Constraints

- **Existing native buttons are themed in place.** `TextButton` and `btn` use
  the accent tokens; native primary, accent, link, danger and success variants
  keep distinct roles. No replacement button classes are required. Native
  sizing/grouping and iMIS handlers remain authoritative. Specialised widget
  controls retain their native skins. See `docs/THEME-BUTTONS.md` for the inventory
  and unsupported secondary/warning variants.

- **Vanilla HTML / CSS / JS. No framework or deployment build step.** Prototypes remain self-contained HTML. Approved reusable theme components ship as shared CSS and JavaScript files; the IQA component now lives in `Theme/UnionSuite/zUnionSuite.css` and `zUnionSuite.js`.
- Some prototypes use external stylesheets, such as Tabler Icons in the hierarchy and relationship examples under `prototypes/Hierarchy Display/`. The standalone theme usage guide has no external resource dependency.
- **Current local theme files:** `Theme/UnionSuite/zUnionSuite.css` owns the design tokens and approved component CSS; `zzClientSpecific.css` owns client overrides; `zUnionSuite.js` owns shared report and banner behavior. `UT-theme.css` is the abandoned first attempt, retained as reference. `UTStaff.css` is legacy staff styling awaiting further consolidation. Native Orion captures remain evidence for the host cascade.
- **All banner CSS is in the shared theme.** `Theme/UnionSuite/zUnionSuite.css` contains separate page-layout and banner-component sections, including responsive/compact states, Actions and tabs. Sticky/collapse and Actions behaviour are now in the marked banner block of `zUnionSuite.js`; the legacy embed and standalone banner script are generated fallbacks for older installations. The same HTML slots support static Content HTML and one current-record Query Template Display result. `us-banner-collapsible` implies sticky; `us-banner-page` separately controls full width using native `--bs-gutter-x`. Other sections retain native padding. The owner confirmed live condensing behaviour; this local CSS integration still requires deployment to the target site.
- **Optional banner controls are removable HTML blocks.** Actions disclosure is implemented; example business commands require verified handlers or destinations. The tabs row remains visible in compact mode, but actual content switching is deferred by the owner. The owner prefers direct zone switching for lighter dashboards because the current CCO setup reloads the whole page on navigation. Implement the page-sections adapter first: one tab can show several zones without a new page request; all queries still run initially. CCO remains a separate option for pages intentionally using native CCO navigation.
- **The standalone usage guide is a maintained deliverable.** `Theme/UnionSuite-Guides/Usage-Guide.html` contains authoring instructions, searchable class/token references, templates and examples. It works offline. Its five-seed editor injects validated colour overrides into the guide and every component frame, with a combined banner/button/report/palette sample, hex fields, reset and CSS download. A dependency-free Node command generates it from maintained sources; this is a maintainer task, not an iMIS runtime or deployment build dependency.
- The layout cannot assume control of the iMIS host chrome, its navigation, or the popup pages it launches.
- **The native iMIS stylesheets are captured in `legacy/Native CSS/` and are the cascade a new theme has to win against.** `10-UltraWaveResponsive.css` is iMIS's base framework (normalize + grid + widget chrome, ~4,000 rules, 1,139 `!important`); `Orion-99.css` is the theme layer (9,263 lines, only 33 `!important`, almost entirely class-based). The numeric prefix/suffix is iMIS's load order, so a sheet numbered above 99 outranks Orion by cascade order at equal specificity. The `!important` mass in UltraWave is concentrated in (a) Bootstrap-style spacing/display/flex utility classes and (b) Telerik RadControls and iMIS authoring chrome — not on ordinary page content. Colour `!important`s land almost exclusively on RadScheduler / RadTreeView / RadEditor / WebPartZone / social-sprite selectors. The owner is open to editing these files rather than only layering over them.
- Layouts must be re-themable per client tenant (see Users), so identity belongs in tokens, not in literal values scattered through the sheet.
- **Target theme cascade:** native iMIS base and any still-loaded legacy staff styles → `99-Orion.css` → `zUnionSuite.css` → `zzClientSpecific.css`, plus native Telerik resources. The earlier `zAdditionalStyling.css` / `zUnionStyling.css` names in historical captures are superseded for this local theme. Include `zUnionSuite.js` once through the site's shared include. The old `.preview/` setup models the earlier cascade and does not reproduce Telerik; verify the deployed shared assets on a real iMIS page.

### Open decisions — do not assume either way

- **Accessibility standard: undecided.** Not answered. No standard is binding until the owner records one. Until then, keep contrast readable, keyboard operation working and focus states visible as ordinary craft, and do not claim conformance.
- ~~Redesign scope~~ **The native iMIS palette governs.** The current seeded token model in `zUnionSuite.css` derives ramps from five client seeds, then exposes shared semantic tokens. Clients rebrand through `zzClientSpecific.css`. Prototypes still carrying their original blue need reconciliation onto those tokens.
- ~~Delivery mechanism~~ **Approved IQA component promoted into Union Suite.** Shared CSS is in `Theme/UnionSuite/zUnionSuite.css`, with behavior in `zUnionSuite.js`. Use `us-report` on the Query Menu iPart, plus optional `us-filters-collapsible`, `us-filters-collapsed` and `us-report-expandable`. `SearchContactsClass` remains an alias. Remove the old standalone embed when deploying the shared assets. [Installation and class reference](Theme/UnionSuite/README.md). This updates the local deliverables; live deployment and the shared script include remain to be applied. Scoped native form, upload, calendar and loading adapters are also implemented. Business-action injection and combined activity-feed assembly remain planned.

## Brand Commitments

- Union Innovation Hub is the authoring organisation; the current local client logo rule is in `Theme/UnionSuite/zzClientSpecific.css`. `UTStaff.css` retains legacy logo styling.
- The workspace's design system is "Union Template — Design System", maintained outside this folder. A binding to that external system has not been established here. The current theme uses the Orion-derived seeded token model in `zUnionSuite.css` and per-client overrides in `zzClientSpecific.css`.

## Evidence on Hand

Real, in this folder:

- `docs/THEME-FINDINGS.md` — measured findings from the first theming attempt: the five-layer cascade, the Orion palette with contrast figures, every defect found with its cause, and the rules that follow. Read it before writing theme CSS.
- [Project documentation index](README.md) and [Theme Usage Guide](Theme/UnionSuite-Guides/Usage-Guide.html) — starting points for contributors and content authors. [Guide maintenance](Theme/UnionSuite-Guides/usage/source/README.md) records source ownership and rebuild checks; `AGENTS.md` requires updates alongside feature changes.
- `Theme/UnionSuite/README.md`, `zUnionSuite.css` and `zUnionSuite.js` — current setup, tokens, approved IQA presentation and shared report/banner behavior. `prototypes/Query Menu Display Styling.html` is the legacy approved trial reference, not the maintained deployment source.
- `Theme/UnionSuite-Guides/usage/examples/Banner-Shared-Styles.html` (behaviour only), `Banner-Behaviour.js`, `Banner-Template.html`, `Banner-Dashboard-Template.html` and `Banner-Contact-Template.html` — generated legacy script fallbacks and author templates; canonical behaviour is in `zUnionSuite.js`, and CSS is maintained in `Theme/UnionSuite/zUnionSuite.css`. `Banner-Preview.html` is generated from those sources. `Banner-README.md` and `Banner-Tabs-Plan.md` distinguish current behaviour from deferred tab integration.

- `prototypes/Agreement Management/Agreement-Management-Prototype.html` ("Case Management System — v4"), plus its split CSS, JS and JS README in the same folder — the most developed surface, and the record of how iMIS integration actually behaves.
- `prototypes/legacy/crm-contact-Prototype.html` — member profile, sidebar layout.
- `prototypes/Hierarchy Display/company-hierarchy.html` with `-eager` and `-lazy` variants; `member-row-options.html` in that folder — row compaction studies.
- `prototypes/Hierarchy Display/relationship-explorer.html` — membership relationship explorer.
- `prototypes/legacy/Staff-Task-Dashboard.html` — staff task dashboard and banner-tab design reference. `legacy/Dashboard layout/Staff-Task-Dashboard.html` remains an earlier copy.
- `experiments/roster/` — real captured data: `company-hierarchy-example.json`, `company-hierarchy-iqa.json`, `member-data.json`. Prototypes can be driven from real shapes; there is no need to invent fixtures.
- `legacy/Orion.css`, `legacy/Orion page.html`, `legacy/UT-theme.css`, `legacy/UTStaff.css` — native captures and legacy/reference styles, with current status described above.
- `legacy/Native CSS/` — the stock iMIS stylesheets as delivered: `10-UltraWaveResponsive.css` (base framework) and `Orion-99.css` (theme layer). These are the authority for what a new theme must beat; see Capabilities and Constraints.
- `legacy/Adjustments.SQL`.

Absent, and not to be fabricated: no testimonials, customer names, usage metrics, benchmarks, pricing, licensing terms, or deployment claims. No stated user-research findings — the audience facts above come from the owner directly, the surface facts from the code.

## Product Principles

1. **The record is the product.** These are screens staff read all day; legibility and density of real data outrank expression.
2. **The layout is a shell around iMIS-native editing.** Don't reimplement what iMIS popups, IQAs and REST already do — frame them.
3. **Union-shaped, not CRM-shaped.** Structure information around agreements, worksites, employers, jobs and coverage, because that is the work.
4. **Re-themable by default.** Identity lives in tokens so a layout can be redeployed into another client tenant without a rewrite.
5. **No runtime build requirement.** A prototype and the usage guide open in a browser, and finished theme assets are droppable into iMIS without tooling. Maintainer scripts may regenerate portable documentation and previews.
6. **Document features as they are built.** Keep the standalone guide and relevant implementation references current in the same change. Distinguish shared implementation, trial embeds and planned features, with exact class placement and usable templates.
