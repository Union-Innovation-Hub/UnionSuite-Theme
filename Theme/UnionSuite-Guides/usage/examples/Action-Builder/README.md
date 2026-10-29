# Action builder — guide and standalone tool

Open the [Action builder in the usage guide](../../../Usage-Guide.html#action-builder) or the [standalone builder](../../../../../references/Action-Builder-Preview.html). Both embed the same maintained form and assets, work offline, and generate registration snippets and author HTML. The builder does not install definitions, alter client Actions.js, query iMIS or execute business helpers.

The guide provides a sidebar/search destination and a scrollable builder viewport. Its form styles are isolated from the handbook and its two simulation frames remain sandboxed. The standalone link starts a separate draft; use Save builder draft / Load draft to transfer settings. The form is a documentation tool, not a production-site feature.

## Included

- Popup, navigation and named custom-function registrations using the current UnionSuiteActions API.
- Label, icon, tone and independent header/row/menu/default appearances.
- An immediate button preview beneath “How should it look?” uses the shared renderer, including the selected icon and tone. It stays available while other settings are incomplete; clicks do not run an action. The separate live preview retains operation and refresh simulation.
- Required context from button data attributes, named page query parameters or literal values; URL parameter mapping and sample values.
- Originating IQA, explicit page-scoped IQA selectors, multiple IQAs, a named custom updater, or no refresh.
- Confirmation, permission key/denied behaviour, owner/source, definition replacement acknowledgement, record lock fields and common popup options.
- Live shared-control rendering with simulated operations and refresh feedback. Missing-context and permission-denied controls are available for review.
- Copy JavaScript/author HTML, download a registration snippet, and download/import a versioned JSON draft. No automatic storage or persistence; download a draft before closing to retain settings.

The Edit Job example uses the verified editor path and row attributes, but registers a new `jobs.edit-example` action. The other presets use example destinations/helpers that must be replaced before installation. The checked-in production registry remains unchanged.

## Output placement

Append JavaScript to the existing client `Actions.js`, loaded after `zUnionSuite.js` and `Scripts/ActionDefinitions.js`. A downloaded snippet is not a replacement for that complete file. Named custom helpers and permission providers must exist before their actions are used.

For heading placement, copy the class into the iPart CSS class field and retain a populated Title. The renderer owns iMIS's generated heading button; the builder rejects trigger-attribute context for that placement because author HTML cannot supply attributes on that generated control.

For row, standalone or menu placement, copy only the inner control HTML. Put menu controls inside the existing list item. Remove previous inline/delegated handlers. Replace sample attributes with actual HTML-encoded record values. The builder deliberately emits literal sample HTML, not SQL or IQA Query Template expressions. If adapted to Query Template syntax, select every referenced output field in the IQA, including data attributes.

## Simulation and limits

The isolated iframe uses the shared theme renderer with mock popup/function/refresh callbacks. Query parameter samples become local literals for preview validation; the exported definitions still read real page query parameters. Navigation reports its intended destination without following it. Permission checks use a simulated result. Target selectors are syntax-checked but cannot be resolved against a live site's reports here. No operation, refresh, editor save or permission response is tested against iMIS.

The form covers common configurations. Custom eligibility/context resolvers and the remaining native popup callbacks/options can be added to the exported JavaScript using the full usage guide. Custom business logic is supplied separately through named functions. Custom refresh callbacks must contain repeatable view updates because refresh-only retry may run them again.

Collision checks use identities read from the actual bundled ActionDefinitions.js during the build. This is not a catalogue of deployed client registrations or IQA selectors. The builder exports one definition at a time; it does not assemble a whole registration file or inspect external duplicate globals.

Import accepts bounded version-1 JSON data, not executable JavaScript. Form text is escaped in preview documents and generated HTML/JS. Preview frames are script-only sandboxes with network access prohibited by their content security policy. These restrictions belong to the preview, not production actions.

## Maintained files

- `Action-Builder.source.html`: form and output layout.
- `builder.css`: preview-only layout.
- `builder-core.js`: model validation and code generation, shared with tests.
- `builder.js`: form interaction, copy/download/import and preview document generation.
- `preview.js` / `preview.css`: simulation and fixture layout.
- `appearance-preview.js` / `appearance-preview.css`: presentation-only sample, updated without reloading its isolated frame.
- `embedded.css`: guide-only spacing and responsive layout; never loaded on production pages.
- `../../Theme/UnionSuite-Guides/usage/build/build-action-builder.cjs`: embeds shared assets and generates the portable HTML.

```powershell
node Theme/UnionSuite-Guides/usage/build/build-action-builder.cjs
node Theme/UnionSuite-Guides/usage/build/build-action-builder.cjs --check
node tools/test-action-builder.cjs
node Theme/UnionSuite-Guides/usage/build/build-theme-usage.cjs
node Theme/UnionSuite-Guides/usage/build/build-theme-usage.cjs --check
node Theme/UnionSuite-Guides/usage/tests/test-action-builder-guide.cjs
```

The regression checks generated JavaScript, URL encoding, source/target validation, collision handling, all placements, simulated operations, required data, permissions, downloads/draft import, keyboard tabs, mobile layout and absence of network requests. The guide build regenerates/checks both versions directly from the maintained sources. Guide integration checks the embedded form, navigation/search, nested previews, clipboard/downloads and draft transfer.
