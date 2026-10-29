# Repository index

A map of this repo for anyone (or any session) picking it up: what lives where,
what reads what, and the commands that build and check it. **Rules for
changing things are in [AGENTS.md](AGENTS.md); read it before editing theme
CSS, iPart markup, Query Templates or the guide.** Keep this index current when
a folder is added, moved or retired.

Repo: `Union-Innovation-Hub/UnionSuite-Theme` on GitHub, branch `main` (commit straight to
`main`; no feature branches). The working copy is in OneDrive; see
[Working in this checkout](#working-in-this-checkout).

## Top level

| Path | What it is | Tracked |
|---|---|---|
| [`THeme/`](THeme/) | The UnionSuite iMIS theme and its usage guide. The production source of truth for styling | yes |
| [`embeds/`](embeds/) | Self-contained paste-in builds for iMIS pages that run without the theme | yes |
| [`prototypes/`](prototypes/README.md) | Design lifecycle: `wip/` → `approved/` → theme; `legacy/` is unclassified older work | yes |
| [`tools/`](tools/) | Command entry points: builders, tests, probes. Many forward to `THeme/UnionSuite-Guides/usage/build/` | yes |
| [`references/`](references/README.md) | Generated component reference pages (`index.html`), plus reference notes (`*.md`) | partly |
| [`docs/`](docs/) | Project documentation: theme findings, inventories, plans, iMIS CMS structure | yes |
| [`legacy/`](legacy/) | Pre-UnionSuite stylesheets and iMIS captures. Read for history and native behaviour; never loaded by the theme | yes |
| [`experiments/`](experiments/) | Side explorations: Easter eggs, mascots, token tests, roster sample data | yes |
| [`.preview/`](.preview/README.md) | Local preview harness and captures. Its `.cjs`/`.js`/`.py` helpers are tracked; output is not | partly |
| `.impeccable/` | Config for the design-lint tool | yes |
| `archive/` | Superseded research kept locally only | ignored |
| `_onedrive-broken/` | OneDrive conflict copies set aside, kept until confirmed redundant | untracked |
| `.tmp-iqa-integration/` | Local Node install of Playwright that the browser tests load | ignored |
| [`AGENTS.md`](AGENTS.md) | Working rules: commits, stylesheet ownership, touch sizes, motion, iPart wrappers, guide workflow, lifecycle | yes |
| [`CLAUDE.md`](CLAUDE.md) | Points Claude sessions at AGENTS.md and this index | yes |
| [`README.md`](README.md) | Project overview and current feature status | yes |
| [`PRODUCT.md`](PRODUCT.md) | Product context: users, constraints, design principles | yes |
| [`TODO.md`](TODO.md) | Open work across the theme | yes |

## The theme — `THeme/`

The folder keeps its original spelling (`THeme`); hundreds of paths depend on it.

| Path | Owns |
|---|---|
| `THeme/UnionSuite/99-Orion.css` | Project-owned native foundation: fix native colours, spacing and states here |
| `THeme/UnionSuite/zUnionSuite.css` | Design tokens and every UnionSuite component |
| `THeme/UnionSuite/zUnionSuite.js` | Shared behaviour: reports, banners, composers, actions, loaders |
| `THeme/UnionSuite/zzDarkMode.css` | All dark-mode palette and overrides; loads last |
| `THeme/UnionSuite/zzClientSpecific.css` | Client overrides in the shared package |
| `THeme/UnionSuite/Scripts/` | Larger feature scripts: `ActionDefinitions.js` (unified actions), `IQA-Enhancements.js`, `IQA-Finder.js`, `IQA-WhereUsed.js`, `UnionSuiteTaskbar*.js`, `BO-Enhancements.js`, `HtmlSourceEditor.js`, `SignInPage.js` |
| `THeme/UnionSuite/Forms/` | Theme-built popup forms (task form) |
| `THeme/UnionSuite/Tabler/`, `Tabler.css`, `images/` | Bundled icon font and images |
| `THeme/UnionSuite/*.skin`, `ThemeSettings.xml`, `index.js` | iMIS theme package files |
| `THeme/UnionSuite-Client/` | Per-client `Branding.css`, `Override.css`, `Config.js`, `Actions.js` |
| `THeme/UnionSuite-Guides/usage/` | **The usage guide's sources: the documentation source of truth.** `source/` prose and guide UI, `templates/` copyable author templates, `examples/` offline fixtures, `build/` generators, `tests/` guide checks, `vendor/` native reference CSS |
| `THeme/Other/Orion/` | The stock Orion theme package (skins, settings, override CSS) for reference |

**Build and check the guide** (from the repo root):

```
node tools/build-theme-usage.cjs
node tools/build-theme-usage.cjs --check
node tools/check-usage-sources.cjs
```

The guide (`Usage-Guide.html`, ~190 MB) and `Theme-Config.html` are written
**outside the repo** to `C:\Dev\UHUB\Theme\Usage-Guide`
(`build/guide-output.cjs`; override with `UNIONSUITE_GUIDE_DIR`). A stale copy
may still sit in `THeme/UnionSuite-Guides/`; it is ignored and not current.
Every build also rewrites the companion pages in `references/`.

## Embeds — `embeds/`

Paste-in HTML/JS for iMIS pages. Each must run with **no theme CSS or JS**
present.

| Path | What | Build | Live in iMIS |
|---|---|---|---|
| [`embeds/iqa-enhancements/`](embeds/iqa-enhancements/README.md) | Every IQA enhancement as one script for sites without the theme | `node embeds/iqa-enhancements/build-iqa-standalone.cjs` (`--check` for stale) | Client sites without UnionSuite |
| [`embeds/finance-dashboard/`](embeds/finance-dashboard/README.md) | Payment-run dashboard and batch detail (CloudToolz data). Start with its `TODO.md` | `node build-embed.js --inline` then `node test/simulate-filter.js`, both run inside that folder; output in its ignored `dist/` | `@/_i4u_/Core/UnionPay/Dashboard/Finance-Dashboard` and `…/Batch-Detail` |

## Prototypes — `prototypes/`

Lifecycle and rules: [`prototypes/README.md`](prototypes/README.md). Each
`wip/` and `approved/` folder has a README with status, sources and the
preview command.

**Approved, awaiting implementation:** `taskbar/` (Option C, bookmarks,
Recents), `list-search-and-paging/`, `cco-inline-loading/`, `task-rows/`.

**Work in progress** (status as each README states it):

| Folder | Status |
|---|---|
| `agreement-page/` | WIP, not approved |
| `case-page/` | WIP; parts are in the theme. Start with `HANDOVER.md` |
| `case-create-form/` | Streamlined staff Create case BeyondFormz form: mock-up, and the export build in `beyondformz/` (not yet imported) |
| `contact-page-v3/` | Approved direction; paused, see its README handover |
| `contact-page-v2/` | Earlier layout prototype; v3 is the approved direction |
| `activity-cards/`, `dues-adjustments/`, `membership-stats-filters/`, `bulletin-markdown/`, `login-screen/`, `workplace-reassign/` | WIP mockups, not in the theme |
| `cco-inline-loading/` | Live trial, tests and research behind the approved design |
| `banner-tabs/` | Deferred |
| `email-composer/`, `iqa-where-used/`, `theme-consistency/` | Research or proposals |
| `section-presets/` | Active; two presets in the theme |
| `popup-loader/`, `task-form/`, `tasks-empty-state/`, `user-credentials/` | Implemented in the theme; folder kept as the design record |

**`legacy/`** holds the comparisons, fixtures and prototypes that predate the
lifecycle. Many are still inputs: the `tools/build-*-comparison.cjs` and
`tools/build-*-preview.cjs` generators read them to produce `references/*.html`,
and the guide links several. Check what reads a file before moving it.

## Tools — `tools/`

| Pattern | Purpose |
|---|---|
| `build-theme-usage.cjs`, `build-theme-config.cjs`, `check-usage-sources.cjs`, `build-banner-preview.cjs` and other forwarders | Compatibility entry points; the implementations live in `THeme/UnionSuite-Guides/usage/build/` |
| `build-*-comparison.cjs`, `build-*-preview.cjs`, `build-*-reference.cjs` | Generate the `references/*.html` pages from `prototypes/legacy/` and theme sources |
| `test-*.cjs` | Headless browser and unit tests. They load Playwright from `.tmp-iqa-integration/node_modules`; see `tools/README-actions.md` for the action suites |
| `probe-*.js` | Console probes to paste into a live iMIS page |
| `package-*.ps1` | Package a feature for upload |

Guide tests are in `THeme/UnionSuite-Guides/usage/tests/`.

**Test baseline, 28 Oct 2026:** these fail on the last commit before the
restructure as well as after it, so they are not regressions:
`tools/test-member-actions`, `test-attention`, `test-embedded-cco`,
`test-taskbar`, and the guide tests `check-theme-config`,
`test-membership-stats-guide`, `test-query-search-guide`, `test-theme-config`.
Several fail loading the 190 MB guide into the browser.

## Docs, legacy and experiments

- **`docs/`**: `IMIS-CMS-STRUCTURE.md` (how iMIS renders pages, iParts and
  wrappers; read before markup work), `THEME-FINDINGS.md`, `THEME-INVENTORY.md`,
  `THEME-BUTTONS.md`, `THEME-PANEL-ACTIONS.md`, `THEME-ACTIVITY-FEED.md`,
  `THEME-ENHANCEMENTS-INTEGRATION-PLAN.md`, `THEME-BROWSER-COMPATIBILITY.md`,
  `UTSTAFF-CONSOLIDATION.md`, `MVP.md`, `design-qa.md`, and
  `crm-member-profile/` (component and iPart mapping CSVs). The guide build
  reads four of these as sources; it is configured with their `docs/` paths.
- **`legacy/`**: `Orion.css` and `Orion page.html` (captures of stock iMIS),
  `Native CSS/Orion-99.css`, `UT-theme.css` (the abandoned first theme),
  `UTStaff.css` and `zUnionStyling.css` (legacy client files), `Structure/`
  (iMIS page exports), `Dashboard layout/`, `Adjustments.SQL`. The
  `.preview/` harness renders `legacy/Orion page.html` against this cascade.
- **`experiments/`**: `Easter Eggs/`, `Mascot/` (Pip and Biscuit; the guide
  links them), `tokens/` (token test pages), `roster/` (captured sample JSON).

## Where things go

| Making | Put it in |
|---|---|
| A change to shared styling or behaviour | The owner file in `THeme/UnionSuite/` (see AGENTS.md → Stylesheet ownership), plus the guide sources in the same change |
| A new idea or mockup | `prototypes/wip/<feature>/` with a README |
| An approved spec not yet built | `prototypes/approved/<feature>/` |
| A paste-in build that must run without the theme | `embeds/<name>/` with its own build script and README; ignore its built output |
| Project documentation | `docs/` |
| A generated reference page | `references/` (output) from a generator in `tools/` or `usage/build/` |
| Throwaway captures and probes | `archive/` or `.preview/` (not tracked) |

## Outside this repo

- Built guide: `C:\Dev\UHUB\Theme\Usage-Guide`.
- Sibling projects in the OneDrive `Claude` folder: `API Reference` (iMIS REST
  and CloudToolz notes), `ReportBuilder`, `Data Template display`. The
  `Finance Dashboard` folder there is superseded by `embeds/finance-dashboard/`.
- Query Templates hub: `C:\Dev\HubQueryTemplates` (start with its
  `docs/HANDOVER.md`).

## Working in this checkout

- **OneDrive can empty the git index.** Stage and commit in one command, then
  check `git status`. `git read-tree HEAD` repairs an empty index.
- **OneDrive conflict copies** appear as `name-<MACHINE>.ext` (for example
  `-UHUB-ALPHA-2`, `-Omega`). Compare them with the real file before
  discarding; one held the only copy of a build-script change on 28 Oct 2026.
- **Long paths.** A second checkout (`git worktree add`) under a deep path
  fails with "Filename too long"; use a short path such as `C:\Dev\…`.
