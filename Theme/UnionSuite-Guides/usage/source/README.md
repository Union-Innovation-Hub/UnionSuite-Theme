# Maintaining the theme usage guide

This is the `source/` part of the [canonical guide directory](../README.md).
Follow that workflow and the root `AGENTS.md` for source ownership and design lifecycle.

The user-facing deliverable is `../../../Usage-Guide.html`. It is one offline HTML file
with inline CSS and JS, searchable class/token tables, copy/download controls,
a seed-colour preview, native button/action galleries, banner templates and a dummy IQA. No local
server, runtime fetches, web fonts or package installation are required to read it.
Companion project links are optional and only resolve when kept beside the repo.

The [project documentation index](../../../../README.md) separates the author guide,
implementation references, historical findings and feature plans. Keep the
relevant references current along with the guide rather than copying the entire
handbook into each Markdown document. A rebuild refreshes imported code and the
source fingerprint; it does not automatically rewrite prose or class recipes.

## iPart wrapper rule for every preview

An iPart CSS class creates an extra div **inside** ContentItemContainer around
the native output. Fixtures must put the configured classes on that div, not
on ContentItemContainer. Cover direct panels, configured/empty wrappers, nested
iParts and opt-outs when changing component detection. Do not seed runtime
markers to hide a detection failure. Keep native wrappers out of copyable
author templates. See [CMS structure §4](../../../../docs/IMIS-CMS-STRUCTURE.md#4-ipart-classes-insert-an-extra-div--this-matters)
and [the author guide](../../Usage-Guide.html#ipart-class-wrapper).

## Sources and rebuild

- `../../../Theme-Config.html`: dedicated, offline client branding workspace at the
  user's requested top-level theme location. `Theme-Config.source.html`,
  `theme-config.css` and `theme-config.js` maintain its editor; `Config-Preview.source.html`,
  `Config-Form.source.html` and `config-preview.css` hold its compact example layouts.
  `config-preview.js` keeps fixture links and form submissions local while
  preserving handled component commands and blob CSV downloads.
  `Branding-Howto.source.html` contains the client-friendly iMIS download/edit/
  upload instructions. The config builder embeds three supplied screenshots
  from `../../../images/branding-*.png`, keeping the generated page offline. The
  `data-theme-src` attributes record deployed paths under
  `/App_Themes/UnionSuite-Core/images/` (plural, matching the physical folder).
  Branding.css receives the generated code; Override.css remains editable for
  separately maintained client-specific theme rules.
  `../build/build-theme-config.cjs` reuses the guide builder's canonical
  assets and fixtures, extracting root/banner/IQA/Actions tokens without copying
  production styles or behaviour into maintained sources. The normal guide
  build/check also builds/checks this page. Run the config builder directly to
  rebuild only the config output. No persistence is implemented.

- `Usage-Guide.source.html`: prose, author-facing class reference, recipes,
  status, links and troubleshooting.
- `usage-guide.css` and `usage-guide.js`: guide-specific presentation/behaviour.
- `../build/build-theme-usage.cjs`: dependency-free Node generator.
- `../templates/List-Templates/*.html`: canonical bulletin, member-note,
  task-row, history, no-shell, native-bulletin and empty-state HTML examples.
  `../build/list-template-examples.cjs` builds their guide preview and
  `../../../../../references/List-Templates.html` during the normal build/check.
  `list-examples.css` and `list-examples.js` contain reference layout and copy/demo
  controls only. Native card styling belongs in `../../../99-Orion.css`; aliases,
  authored shells, content slots and optional modifiers belong in `../../../zUnionSuite.css`.
- `../../../zUnionSuite.css`: canonical tokens, native button colours, IQA aliases and banner page-layout /
  component sections, including banner aliases.
- `../../../zzClientSpecific.css`: active root overrides included in the preview.
- `Brand-Preview.source.html`: combined sample with actual theme CSS/JS; its
  injected banner HTML and palette come from the guide builder.
- `../../../zUnionSuite.js`: canonical report and banner behaviour.
- `Button-Examples.html`: minimal downloadable native-button reference.
- `action-catalog.cjs`: 20 native-button recipes and 25 icon meanings. Guide
  data only, not the planned production business-action registry.
- `../build/theme-gallery.cjs`: visual cards, class chips and code blocks
  from the catalogue. Converts documented author classes to click-to-copy
  controls while preserving runtime/planned hooks as plain text.
- `example-gallery.css`: documentation card layout. Actual controls use the
  native/shared CSS. Frames resize to their content and copy through the
  parent guide's clipboard/status handling.
- `IQA-Example.source.html` + `iqa-example.js`: captured Query Menu/RadGrid-shaped
  fixture with fictional data and local Find/sort/page/export demonstration.
  Filters, native-export relocation and Expand use real shared JS. Keep the
  data simulation out of production JS/templates.
- `../templates/Banner-*.html`: maintained banner templates. `../examples/` holds
  the legacy generated compatibility assets. No independent CSS/JS edits belong in those assets.

Run from the project root:

```text
node Theme/UnionSuite-Guides/usage/build/build-theme-usage.cjs
node Theme/UnionSuite-Guides/usage/build/build-theme-usage.cjs --check
node Theme/UnionSuite-Guides/usage/tests/check-theme-config.cjs
```

For config interaction and desktop/mobile visual checks, run
`node Theme/UnionSuite-Guides/usage/tests/test-theme-config.cjs` with local Microsoft Edge available (or set
`THEME_TEST_BROWSER` to a compatible Chromium executable). It uses a disposable
headless profile and writes screenshots to `.preview/`. The source/package
check is separate from browser verification.

After changing banner assets or the complete banner template, first run:

```text
node Theme/UnionSuite-Guides/usage/build/build-banner-preview.cjs
```

That regenerates the standalone banner preview and synchronizes its external
compatibility files from shared JS. The guide builder rejects any fallback
that differs from the marked banner block in `zUnionSuite.js`.

The guide imports tokens, component defaults, banner CSS and complete template code rather
than duplicating them by hand. Its source fingerprint covers the implementation,
guide sources and relevant Markdown references. `--check` fails if the generated
file is stale. Extraction failures stop the build rather than silently publishing
an incomplete token table. The content-reviewed date is editorial; advance it
when reviewing the instructions, not merely when running a build.

The brand preview imports active `:root` overrides. It does not execute the
client logo URL or arbitrary site-wide client rules. If the client begins using
conditional root overrides, update the importer to preserve those conditions.

## Definition of done for a feature

Update the guide in the same change as the feature. Record exact class names,
where each is applied, prerequisites, what it does, templates, optional blocks,
token dependencies, keyboard and lifecycle behaviour, failure/empty states and
known limitations. Distinguish shared implementation, trial embeds and plans.
Revise installation instructions when promoting trial assets into the theme.

Every implemented element must have a visible example, click-to-copy author
classes with exact placement, and relevant HTML in a code block with Copy.
Put the first visual outside collapsed reference sections. Link structural
classes to their enclosing component preview. The builder embeds the Tabler
font once and shares its stylesheet with same-origin srcdoc previews, requiring
no runtime asset requests. Keep its licence with the theme and in the guide.

Open the generated file locally and check desktop/narrow layouts, table search,
copy and downloads, seed changes/reset, the embedded scroll example and relevant
links. Copy a template and compare it with its maintained source. Printing opens
reference sections and clears row filters temporarily; large CSS/JS asset listings
are omitted from print and remain available in the HTML's download controls.

Do not place content-specific colours or guide CSS into the production theme.
Do not ship the guide's simulated header/layout as an iMIS adapter.

The seed editor uses validated hex values and a dedicated preview stylesheet.
All `data-theme-preview` frames receive the same overrides, including frames
loaded after an edit. Invalid text retains the last valid colour. Reset clears
overrides; exports contain only the five valid seeds. Keep this editor out of
production theme JavaScript.

Button purposes and the complete busy-state gallery now render directly inside Usage-Guide.html. busy-examples.cjs supplies the simulation and comparison layouts only; approved button/spinner styles and the Promise-based busy helper stay in zUnionSuite.css/js.

Current cross-project status lives in ../../../THEME-INVENTORY.md and ../../../TODO.md. The complete reference build sequence is in ../../../../../references/README.md. Approved native forms, XML Import, choices, calendar, loaders, the taskbar and Biscuit must be described as implemented; their offline simulations remain distinct from live verification. Unselected taskbar comparisons and banner zone switching remain parked. Biscuit's source lives in ../Scripts/UnionSuiteTaskbar.js and ../zUnionSuite.css; taskbar-example.js contains only offline data and preview controls.
