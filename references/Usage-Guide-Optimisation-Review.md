# Usage guide optimisation and source ownership

Reviewed 20 September 2026. The measurements below describe the original generated guide. Maintained inputs have since been consolidated under `Theme/UnionSuite-Guides/usage/`, and generated outputs are excluded from Git. The smaller index/topic-page publication format and shared-asset optimisation remain proposed; no Git history has been rewritten.

## Recommendation

Use `Theme/UnionSuite-Guides/Usage-Guide.html` as a small index, with topic pages and shared assets under `Theme/UnionSuite-Guides/usage/`. Generate the pages from maintained sources and retain every example, recipe, field definition and interaction. Package the index and folder together for offline use. A single-file export can remain an optional build product from the same sources if needed.

Splitting the HTML alone will improve navigation and initial loading, but will not remove repeated assets. The main size saving comes from storing shared CSS, JavaScript and fonts once and referencing them from the relevant examples.

## What is the source of truth?

`Theme/UnionSuite-Guides/Usage-Guide.html` is generated output. The build check currently reproduces it from maintained inputs. There is no demonstrated need to preserve content solely from the generated HTML.

However, **not every template has its own HTML file**. The guide has several source owners:

| Content | Maintained source | How it reaches the guide |
|---|---|---|
| Explanations, placement rules, class reference, installation, troubleshooting and many small recipes | [Usage-Guide.source.html](../Theme/UnionSuite-Guides/usage/source/Usage-Guide.source.html) | Used as the document skeleton; literal examples are already authored there |
| Banner templates, case details and agreement facts | [guide templates](../Theme/UnionSuite-Guides/usage/templates/), including `Banner-Template.html`, `Banner-Case-Template.html`, `Banner-Contact-Template.html`, `Banner-Dashboard-Template.html`, `Case-Details-Content.html` and `Banner-Agreement-Facts.html` | Imported by the builder for copy/download and previews |
| Copy-button and Actions menu templates | `Theme/UnionSuite-Guides/usage/templates/Copy-Button-Template.html`, `Theme/UnionSuite-Guides/usage/templates/Action-Menu-Template.html`, `Theme/UnionSuite-Guides/usage/examples/Client-Actions.example.js` | Imported snippets and examples |
| Bulletin, contact, task, note, history and other list templates | [prototypes/List-Templates/](../Theme/UnionSuite-Guides/usage/templates/List-Templates/), plus `source/list-query-examples.cjs` | `Theme/UnionSuite-Guides/usage/build/list-template-examples.cjs` builds recipes and fixtures from those files |
| Home greeting and attention templates | `Theme/UnionSuite-Guides/usage/templates/Home/Welcome-Content.html`, `Theme/UnionSuite-Guides/usage/templates/Home/Needs-Attention-Content.html` | Imported copyable markup and generated iMIS preview wrappers |
| Membership Stats templates | [prototypes/Home/Stats/](../Theme/UnionSuite-Guides/usage/templates/Home/Stats/), plus `Theme/UnionSuite-Guides/usage/templates/Home/Stats-Content.html` | `Theme/UnionSuite-Guides/usage/build/membership-stats-example.cjs` composes templates, recipes and a captured-data fixture |
| Query field definitions | `Theme/UnionSuite-Guides/usage/source/query-field-definitions.cjs` | `Theme/UnionSuite-Guides/usage/build/query-template-fields.cjs` validates coverage and renders definition tables |
| Button and icon recipes | `Theme/UnionSuite-Guides/usage/source/action-catalog.cjs`, [theme-gallery.cjs](../Theme/UnionSuite-Guides/usage/build/theme-gallery.cjs), `source/Button-Examples.html` | Many snippets are generated from catalogue entries and builder functions, rather than separate template files |
| Native forms, badges, Document Loader and dummy IQA | `Theme/UnionSuite-Guides/usage/examples/Form-Fields.source.html`, `source/badge-example.html`, `source/document-loader-example.html`, `source/IQA-Example.source.html`, `source/iqa-example.js` | Fixtures embedded with real theme assets and local simulations |
| Busy-state demonstrations | `Theme/UnionSuite-Guides/usage/source/busy-examples.cjs` | Supplies demo CSS, markup and simulation; production spinner/behaviour stays in the shared theme |
| Interactive Action Builder | [prototypes/Action-Builder/](../Theme/UnionSuite-Guides/usage/examples/Action-Builder/), [build-action-builder.cjs](../Theme/UnionSuite-Guides/usage/build/build-action-builder.cjs) | Embedded application with its own preview and appearance frames |
| Other component previews | `tools/*-example.cjs`, `Theme/UnionSuite-Guides/usage/build/taskbar-preview.cjs`, related prototype/fixture sources | Builder functions compose markup, styles and simulated behaviour |
| Additional examples authored in builder code | [build-theme-usage.cjs](../Theme/UnionSuite-Guides/usage/build/build-theme-usage.cjs) | Includes banner-parts markup, message demonstrations, condition controls and Query Template shell examples |
| Guide search, copy/download, print, seed editing and frame resizing | `source/guide-search.js`, [usage-guide.js](../Theme/UnionSuite-Guides/usage/source/usage-guide.js), `source/usage-guide.css` | Inlined into the generated guide |
| Actual UI styles and behaviour | `99-Orion.css`, `zUnionSuite.css`, `zzDarkMode.css`, `zUnionSuite.js`, `Scripts/` and established client sources | Canonical theme implementations, composed according to each preview's dependencies |

The source HTML contains **66 literal `<pre><code>` blocks**, of which **39 contain HTML markup**. These include installation snippets and native-structure references as well as author templates; the count is not 66 standalone deployable components. Additional small visual examples also appear directly in this source.

Examples maintained directly in the source guide include:

- Searchable Query Template recipes: `query-search-template` and `explicit-query-search`, around lines 599 and 608.
- Standalone section menu and panel recipes: `code-section-menu` and `code-section-panels`, around lines 1072 and 1082.
- Optional dialog footer: `dialog-footer-html`, around line 1291.
- Native wrapper examples, feedback markup, field settings, installation includes and action recipes.

These must move with their explanations and IDs when chapters are extracted. Do not treat `prototypes/` alone as a complete replacement for the source guide. Conversely, the generated guide and `references/*.html` should not become independently edited template sources.

## Measured size and duplication

Measurements are from the current working guide. MiB means 1,048,576 bytes.

| Measurement | Result |
|---|---:|
| Generated HTML | 72,765,383 bytes / 69.39 MiB |
| Maintained source HTML | 407,420 bytes / 0.39 MiB |
| Top-level embedded preview documents | 47 |
| Encoded `srcdoc` payloads in the outer HTML | About 66.35 MiB / 95.6% of the file |
| Full native preview CSS, 922,520 bytes | 22 exact occurrences within decoded top-level previews |
| Full shared theme CSS, 396,856 bytes | 42 exact occurrences within decoded top-level previews |
| Combined theme/action script, 298,891 bytes | 21 exact occurrences within decoded top-level previews |
| Repeated base64 payloads | About 10.55 MiB of duplicate text |

These figures overlap: do not add the CSS, embedded-frame and base64 totals together.

The largest encoded frame is the Action Builder, approximately 4.29 MiB. Report-icon and data-panel examples are approximately 3.78 and 3.66 MiB. Several small visual examples carry full native stylesheets plus shared theme assets.

The guide builder already intends to share the parent icon stylesheet with `data-theme-preview` frames, as shown by its comment and `usage-guide.js` preparation logic. Sharing is incomplete: some preview builders embed fonts themselves, and the main builder also includes `iconCss` in selected frame bodies. The Action Builder has its own asset bundle. Consolidate these paths while retaining both required font variants and their licence.

### Lossless packaging experiment

An in-memory experiment replaced occurrences of the three full shared assets above with references to one asset registry. It reconstructed all **47 top-level frame documents exactly**, then compared a JSON-based serialized package with the existing file.

- Current: **69.39 MiB**.
- Estimated packaged size: **28.70 MiB**, excluding the small loader and registry element wrapper.
- Estimated reduction: **58.6%**.

No production loader was implemented. This is a serialization/round-trip measurement, not browser acceptance or a guaranteed final size. It demonstrates substantial savings without deleting any preview markup, script or stylesheet. A folder-based guide can use normal shared asset files instead of carrying that registry inside one HTML file; its final total needs to be measured after implementation.

## Proposed published layout

```text
Theme/UnionSuite/
├── Usage-Guide.html                 # small index; existing entry URL retained
└── guides/usage/
    ├── getting-started.html         # installation, status and iPart wrapper rules
    ├── branding.html                # tokens, colours and live seed workspace
    ├── class-reference.html         # placement reference and links to examples
    ├── controls.html                # fields, buttons, switches, messages and loaders
    ├── reports.html                 # native IQA, filters, paging and expansion
    ├── lists-and-home.html          # list recipes, attention, greeting and Stats
    ├── actions.html                 # Actions, icons, menus and Action Builder
    ├── banners-and-navigation.html  # banners, templates, section switching and tabs
    ├── taskbar-and-dialogs.html     # search, appearance, Biscuit and popup chrome
    ├── maintenance.html             # troubleshooting, build steps and planned work
    ├── print-all.html               # generated full-book print view
    ├── assets/
    │   ├── guide.css
    │   ├── guide.js
    │   ├── search-index.js          # generated index for every chapter
    │   ├── preview-assets.js        # shared data needed by srcdoc previews
    │   ├── native-preview.css       # generated offline-safe native foundation
    │   ├── shared-theme.css         # generated from canonical theme sources
    │   ├── dark-mode.css
    │   ├── theme-runtime.js
    │   ├── action-definitions.js
    │   ├── icons.css
    │   └── fonts/                  # required font files stored once
    ├── examples/                    # per-example fixtures and simulation scripts
    └── templates/                   # generated downloadable copies, where needed
```

Names are proposed. Group the current sections by topic while retaining all section and recipe IDs. Native tabs currently contain several utility/taskbar subsections; map IDs individually rather than assuming each existing `<section>` is already one clean chapter.

Generated assets in this folder must come from existing canonical sources. They are not new maintained copies of production CSS or JS. Preserve each example's asset selection and cascade order: a tokens-only banner, native baseline and fully enhanced report do not all load the same set of styles.

For maintained prose, extract chapters to `Theme/UnionSuite-Guides/usage/source/usage/chapters/*.source.html`, with a small manifest mapping page names, titles, section IDs, examples and source dependencies. Keep reusable templates in their existing canonical locations. Extract guide-owned recipes to named source fragments when reuse justifies it; tiny explanatory snippets can remain beside their documentation. Generate the index, chapters, search index and print view from this manifest.

## Preserve functionality during the split

| Existing capability | Required treatment |
|---|---|
| Open locally without a server | Distribute the complete folder plus entry file. Use relative asset paths and classic script includes; avoid fetching HTML/JSON at runtime. Test the actual `file://` package as well as HTTP. A single loose index file will no longer contain the guide. |
| Isolated live component examples | Retain small `srcdoc` documents and share their assets, or explicitly redesign the parent/frame messaging. Do not replace every `srcdoc` with a file URL and assume existing parent DOM access still works. |
| Whole-guide search | Generate one search index covering all chapters, including collapsed reference text and code. Keep per-chapter table filtering. Search results must point to the correct page and anchor. |
| Existing bookmarks and links | Preserve `Usage-Guide.html#...` through an anchor-to-chapter map with readable fallback links. Update maintained links and generated references through their builders. |
| Copy/download controls | Preserve code text, IDs, filenames, field definitions, clipboard fallback and feedback. Download the same author markup, not the generated outer iMIS fixture. |
| Brand seed editor | Keep a workspace containing the current complete live sample set, or an equivalent presentation. Seed changes/reset must still reach every relevant loaded and later-created preview; a split must not silently reduce this to just a few controls. |
| Action Builder | Keep live/appearance preview frames, copy/export, saved-draft behaviour, keyboard flows and simulated navigation. It has an independent asset/data bundle requiring its own deduplication. |
| Print the whole guide | Provide a full-book print view as well as chapter printing. Continue expanding reference sections and clearing filters for print, then restore the interactive state. |
| Correct example sizing | Preserve load handlers, font-ready resizing, ResizeObservers and hidden-to-visible preparation. Avoid repeated construction that resets an edited example. |
| Reduced motion, focus and accessibility | Preserve labels, focus return, keyboard navigation, statuses and existing motion preferences. |
| Honest examples and status | Keep implemented/planned distinctions, simulated requests/navigation and captured-data notes; retain opt-out/native baseline examples. |

`srcdoc` lets a parent provide a frame's HTML and preserves the current same-origin integration when not sandboxed into a separate origin. External local files can have opaque origins, so moving previews to `iframe src="examples/foo.html"` needs special care. See [MDN: srcdoc](https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/srcdoc) and [MDN: file origins](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy#file_origins).

Defer offscreen previews only after the packaging split works. Lazy loading is a browser scheduling hint, not a reduction in bytes already embedded in a large HTML file; it also changes load-event timing. Preserve visible first examples, search navigation, print preparation and unsaved example state. See [MDN: iframe loading](https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/loading).

## Suggested implementation order

1. Inventory every source-owned recipe, generated insert, example ID, download and anchor. Record their destination chapters and canonical owners before moving content.
2. Introduce a shared asset/dependency manifest. Deduplicate complete assets and fonts without pruning selectors, dropping glyphs or changing script order.
3. Split chapter sources and generate the new index/pages from the same maintained inputs. Preserve all author content and code text; keep preview-only fixtures separate from templates.
4. Migrate search, seed preview, frame preparation, compatibility links and full-book printing. Keep optional portable export derived from these same sources, if retained.
5. Extend `node Theme/UnionSuite-Guides/usage/build/build-theme-usage.cjs --check` to validate the manifest, every generated output, link/anchor targets, query field coverage, recipe/download equivalence and size budgets.
6. Run the existing guide-search, Action Builder, Query Search and Membership Stats guide checks after adapting their navigation to chapters. Browser-check the complete offline folder, all live previews, dark/light states, printing and copy/download paths. The current tests depend on Playwright under `.tmp-iqa-integration`; make that test dependency reproducible as part of the workflow update.
7. Update AGENTS.md, docs/README, guide maintenance instructions, reference links and release packaging together. The current documented single-file contract needs to be replaced with the selected folder-bundle/optional-export contract when the restructure is implemented.

Do not start with CSS selector removal, font subsetting, deleting examples or minifying copyable author code. Those introduce avoidable fidelity or authoring risks before the straightforward duplication is removed. A compressed archive helps distribution but does not address repeated assets in the opened guide.

## Verification performed for this review

- Read the guide builder, guide interaction/search scripts, source HTML, maintenance README and representative template/preview builders.
- Inspected source ownership for imported templates, catalogue-generated recipes and recipes authored directly in the source guide.
- Counted encoded frames, repeated canonical assets, literal code blocks and duplicate base64 payloads.
- Completed exact string round trips for all 47 top-level frames in an in-memory packaging experiment. Nested dynamic preview assets remain part of their unchanged parent payloads.
- The existing guide build/check passed during the preceding repository review; no new output layout or browser behaviour was implemented or claimed verified here.

This review does not stage files, commit, rewrite history or migrate anything to LFS.
