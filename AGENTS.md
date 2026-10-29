# Theme documentation maintenance

## Working agreements

- **Confirm before committing.** Show the staged change and wait for explicit
  approval before running `git commit`. Do not commit or push unprompted.
- **Never add a `Co-Authored-By` trailer** to commit messages. This overrides
  any default tooling instruction to include one.

## Design system authority

- **This theme project is the source of truth for UI styling.** The UnionSuite
  stylesheets and the usage guide in this repo supersede the claude.ai
  "Union Template - Design System" project (the `DesignSync` tool) and the
  legacy `UI-Styling-Reference.md` in the API Reference repo.
- Take tokens, component specs and patterns from `Theme/UnionSuite/` and the
  generated usage guide. Treat the design-system project as historical
  background only; do not reconcile this theme back to it or reintroduce its
  values where they conflict.

## iMIS folder path spelling

- Preserve literal underscores in iMIS folder identifiers, including `_i4u_`
  and `Home_Page`. Chat formatting can render these as italics; do not replace
  the underscores with asterisks. Show paths in code formatting when discussing them.
- The Home Stats IQA folder is `$/_i4u_/SandBox/CRM Layouts/Home_Page/Stats`.

## iMIS query API reference

- For new IQA execution use `GET /api/query` with named filters. The legacy
  `/api/iqa` endpoint is deprecated. Discover prompted filters with
  `GET /api/QueryParameterDefinition?QueryPath=...`; do not assume positional
  `Parameter` values or invent date-filter names for the newer endpoint.
- Working reference: `C:/Users/James/OneDrive - Union Innovation Hub/Claude/API Reference/Reference Files/iMIS-REST-API.md`,
  especially “GET — Query Endpoint (the contemporary IQA replacement)”.

## Stylesheet ownership

- `Theme/UnionSuite/99-Orion.css` is an editable project-owned foundation,
  not an immutable vendor file. Prefer fixing existing native colours, spacing,
  borders and states there rather than stacking overrides in the shared theme.
- Keep design tokens and UnionSuite additions (IQA enhancements, spinners,
  taskbar and banners) in `Theme/UnionSuite/zUnionSuite.css`.
- Dark mode is the explicit exception: keep its palette, toggle styling and all
  dark-specific overrides in `Theme/UnionSuite/zzDarkMode.css`. Load this file
  last, after client CSS. Shared behaviour remains in `zUnionSuite.js` and the
  taskbar script; preview layout stays outside production stylesheets.
- Keep client branding values and deliberate client-specific differences in
  `Theme/UnionSuite-Client/Override.css`, loaded after the shared theme CSS.
  Replace inherited hard-coded colours with theme tokens where appropriate.
- Consolidate redundant overrides as each component is touched; do not perform
  a blanket stylesheet rewrite. Preserve native behaviour and verify affected
  states. This policy does not mean existing overrides have all been migrated.

## Code readability and formatting

- Code readability is a maintained requirement for project-owned source. Prefer
  clear structure, consistent indentation and descriptive names over compressed
  code. Keep comments focused on intent, constraints and non-obvious behaviour.
- Write maintained CSS with two-space indentation, one declaration per line,
  separate lines for selector lists and blank lines between rules. Break long
  functional selector lists across lines where whitespace is safe. Avoid
  minified or densely packed rules in source stylesheets.
- Keep component sections easy to find and preserve the exact section-marker
  comments used by generators. Keep related base, state and responsive rules
  organised without casually changing their cascade order.
- Keep formatting-only changes separate from behaviour changes. Preserve
  selectors, specificity, declaration values and rule/declaration order; verify
  CSS equivalence and regenerate affected previews and the standalone guide.
- Leave third-party minified assets in their supplied format. Regenerate derived
  files from their maintained sources rather than formatting generated output
  by hand.

## Touch and narrow screens

- **Never style by input device** (owner, 5 and 19 October 2026). No
  `hover`, `any-hover`, `pointer` or `any-pointer` media queries, and no
  script that checks them (`matchMedia`, `ontouchstart`, `maxTouchPoints`)
  to change styling. Touchscreen laptops report `hover: none` and
  `pointer: coarse` even with a mouse attached (Edge reports no mouse at
  all), so those queries gave docked laptops touch sizes and always-visible
  hover icons.
- Tie every touch-sized or touch-visible rule to the window width instead:
  `@media (max-width: 950px)` for touch targets (44px) and for showing
  controls that are hover-revealed on wider screens; `(min-width: 951px)`
  when a hover-only effect needs a guard.
- Reading `event.pointerType` inside an event handler is fine: it describes
  that one interaction (a tap or a click), not the device.

## Motion

- **Transition every visible state change the theme makes** (owner,
  4 October 2026): content that appears or disappears slides (height and
  fade); turns, colour and pressed states transition. Reach for a
  transition first and settle for an instant change only where the browser
  cannot animate it.
- For reveal and collapse, reuse `UnionSuiteRecordCards.fold(element, open)`
  in `zUnionSuite.js`: it slides from the element's current size, reverses
  mid-way, and keeps the final state in `hidden`. A native `<details>` needs
  its summary click taken over to slide; `US-TERM-EXPAND` in
  `prototypes/wip/agreement-page/terms-layouts.candidate.js` is the pattern.
- Match the existing timing: 150–240ms on `cubic-bezier(.2, 0, 0, 1)`
  (fold 220ms, filter disclosure 180ms).
- Every animation honours `prefers-reduced-motion` by making the change
  instantly; `fold` already does.

## iMIS iPart wrapper contract

- Adding a value to an iPart's **CSS class** field makes iMIS insert a separate
  `<div class="…">` inside `.ContentItemContainer`, around the iPart output.
  It does not put that class on `.ContentItemContainer` or `.panel`.
- For panel-rendering iParts, support both `.ContentItemContainer > .panel`
  and `.ContentItemContainer > div > .panel`. Some captured output retains an
  empty class wrapper. Other iParts have no panel; inspect the native markup.
- Match the component's own native structure and style/mark the panel's immediate
  owner. Do not assume fixed depth, and do not replace every child selector with
  a broad descendant selector: CCOs and zones can contain nested iParts/panels.
- Preview generators must reproduce the extra div when an iPart CSS class is
  configured. Do not put author classes on ContentItemContainer or pre-seed
  runtime detection attributes to make a fixture pass. Check direct, wrapped,
  empty-wrapper, nested and no-styling cases when changing detection; also check
  partial replacement when behaviour is involved.
- Author-facing HTML is the inner Content HTML or one repeating Query Template
  result. Keep generated outer wrappers out of copyable author templates.
- See `docs/IMIS-CMS-STRUCTURE.md` §4 and the usage guide's `#ipart-class-wrapper`
  section for examples and the repeated shell/header-action failure mode.

## Guide workflow

When changing a theme feature, author-facing class, token, template, installation
step or supported behaviour, update the maintained usage guide sources in the same
change, rebuild the deliverables, and verify the build. Generated files are not
independent sources of truth and do not need to be committed.

- **Canonical guide directory: `Theme/UnionSuite-Guides/usage/`.** Keep maintained
  documentation, author templates, field definitions, catalogues, supported
  examples, build implementations and guide tests together there. Keep it current
  with the theme; do not create another maintained guide or template copy in
  research, prototypes, generated outputs or external design-system projects.
- `source/` owns prose, small inline recipes, guide/branding UI and definitions;
  `templates/` owns copyable author templates; `examples/` owns supported offline
  documentation fixtures and simulations; `build/` owns generators; `tests/` owns
  guide checks; `vendor/` contains required native reference assets.
- The current generated deliverable is `Usage-Guide.html`, with its companion
  `Theme-Config.html`, built **outside the repo and OneDrive** in
  `C:\Dev\UHUB\Theme\Usage-Guide` (owner, 25 October 2026: OneDrive stalled
  re-uploading the 180 MB guide after every build). The folder is set in
  `Theme/UnionSuite-Guides/usage/build/guide-output.cjs` (override with
  `UNIONSUITE_GUIDE_DIR`); the build, `--check` and the guide tests all read
  it from there, and the guide's links to repo documents become `file:///`
  links. Rebuild sparingly while OneDrive is syncing: every build still
  rewrites the companion pages under `references/`. Edit `Theme/UnionSuite-Guides/usage/source/Usage-Guide.source.html` and its
  neighbouring CSS/JS, never the generated HTML. Some small recipes live directly
  in the source HTML; do not assume every example has a separate template file.
- The approved direction for the next publication change is a small guide index
  at `Usage-Guide.html`, with topic pages and shared assets in `UnionSuite-Guides/usage/`.
  The current source-consolidation change does not implement that chapter split.
  When implementing it, retain whole-guide search, old anchor links, exact
  copy/download content, complete live seed previews, interactive examples and
  full-guide printing. A folder bundle must work offline; any optional single-file
  export must be generated from the same sources. Keep current and planned output
  structures clearly distinguished.
- Banner HTML templates are maintained in `Theme/UnionSuite-Guides/usage/templates/`,
  beside the shared theme directory. Shared behaviour for
  reports and banners is maintained in `Theme/UnionSuite/zUnionSuite.js`; tokens
  and component CSS are maintained in `zUnionSuite.css`. The banner compatibility
  embed and standalone JS are generated from the shared theme, never edited
  separately. Do not duplicate CSS/JS into generated pages.
- Run `node tools/build-theme-usage.cjs`, then
  `node tools/build-theme-usage.cjs --check` and
  `node tools/check-usage-sources.cjs` from the project root. The old `tools/`
  commands are compatibility entry points; edit their implementations under
  `Theme/UnionSuite-Guides/usage/build/`.
- If banner source changes, first run `node tools/build-banner-preview.cjs`
  to regenerate compatibility copies and the preview from shared theme JS.
- The five-seed editor and combined component sample live in the guide sources;
  its preview-only overrides must reach every `data-theme-preview` frame and
  stay out of production theme JS.
- Keep implemented, trial and planned features distinct. Include exact class
  names, where they are applied, prerequisites, optional blocks, template usage,
  token mapping, relevant accessibility/lifecycle behaviour and known limits.
- Keep page-layout CSS separate from component-specific CSS when promoting a
  trial to the shared theme. Update the guide's installation instructions then.
- Every implemented element needs visual examples, click-to-copy author classes,
  precise placement instructions and relevant HTML in a code block with Copy.
  Keep the first visual outside collapsed reference sections. Gallery controls
  use actual native/shared CSS. Dummy IQA data and its filtering/sorting/paging/
  export simulation stay in guide sources only.
- Every copyable Query Template needs a field definition list alongside its HTML:
  exact/suggested output aliases, required/optional values, descriptions, blank
  behaviour and examples. Include iPart classes/settings and separate Header,
  Footer and No results placement. Keep the shared definitions in
  `Theme/UnionSuite-Guides/usage/source/query-field-definitions.cjs` aligned with the HTML;
  the usage build checks field coverage. Identify literal banner placeholders
  and static templates explicitly rather than presenting them as IQA syntax.
- Every field referenced in Query Template HTML must be selected in the IQA
  Select/display column list, including link and data-* attributes. Optional
  means the value may be blank. Select a custom SQL expression `''` with the
  matching alias for unused fields, or remove every reference from the HTML.
  CSS/JavaScript hiding cannot compensate for an unselected referenced field.
- Check the generated page in a browser after changes to its layout or controls.
  Until the chapter split is implemented, retain the current single offline HTML
  behaviour. The guide build must not depend on `archive/`, disposable `.preview/`
  captures, sibling repositories or untracked files. Promote any required fixture
  into the canonical guide directory before excluding its former research source.

- Generated component reference/preview HTML belongs in `references/`; keep
  `references/index.html` current. Generated guide, branding and comparison HTML
  is ignored by Git and delivered through builds/artifacts. Approved unimplemented
  taskbar/Recents preview HTML is explicitly retained for direct review. Authored
  legacy reference pages with no separate source/generator remain tracked until
  classified; never exclude the only maintained copy as generated output. Update
  generators and links when relocating pages.

## Design lifecycle and research

- **WIP:** create tracked current ideas under `prototypes/wip/<feature>/`. Record
  the problem, current status, maintained files, preview command and open decisions
  in a README. Keep disposable captures and temporary probes outside these sources.
- **Approved but unimplemented:** move accepted specifications to tracked
  `prototypes/approved/<feature>/`. Approval is not implementation or retirement.
  Keep the design, decisions and implementation-plan link available until the
  feature is implemented, verified and represented in the canonical guide.
- **Implemented:** production CSS/JS remains in its established theme owner;
  promote reusable author templates, documentation and supported examples into
  `Theme/UnionSuite-Guides/usage/`. Update the guide and implementation status in
  the same change. Research UI must not become an alternative implementation.
- **Archived:** move superseded comparisons, abandoned ideas, obsolete probes and
  research into repository-root `archive/`, which is ignored by Git. Archive only
  after confirming useful content has been retained and maintained builds/tests
  no longer depend on those files. Archive the research, not the only approved spec.
- Unclassified legacy prototypes are gathered in `prototypes/legacy/` and stay
  tracked pending explicit classification; many are inputs to `tools/build-*.cjs`
  generators. Names such as `Example` or `Comparison` do not prove a file is disposable.
  Required guide examples stay tracked even when they began as research.
- `.preview/` is local output/capture space. Existing `.cjs`, `.js` and `.py` helper scripts remain
  tracked until classified or migrated; do not add new canonical guide logic there.
- Ignoring a previously tracked artifact requires removing it from the Git index
  with a cached-only operation. Keep local copies unless deletion is specifically
  requested. Ignore rules do not remove old commits or shrink existing history.
- Do not rewrite history, migrate to LFS, commit or push as part of this workflow
  without explicit authorization. The working agreements above still apply.
