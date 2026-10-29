# Maintained usage guide

This folder is the source of truth for the UnionSuite usage documentation,
author templates and the interactive examples that explain implemented features.
The production theme files remain the source of truth for component styling and
behaviour. Generated copies must never become separately edited implementations.

## Source ownership

| Directory | Maintained content |
|---|---|
| `source/` | Guide prose, small inline recipes, class/field definitions, catalogues, guide UI and branding-editor sources |
| `templates/` | Copyable author HTML, Query Templates and their related recipe metadata |
| `examples/` | Supported documentation fixtures, example builders' inputs and offline simulations |
| `build/` | Canonical guide, example and branding generators |
| `tests/` | Guide and branding checks |
| `vendor/` | Native reference CSS needed to reproduce the examples |

Examples in this folder are maintained documentation, not disposable research.
Keep their iMIS wrappers and simulated behaviour out of copyable author templates.
Research and unimplemented designs belong outside this folder.

The existing `source/Usage-Guide.source.html` still contains the complete prose
and small inline recipes. The proposed chapter/index split is documented in the
[optimisation review](../../../references/Usage-Guide-Optimisation-Review.md).
Consolidating the inputs first establishes one owner before that packaging change.

## Build and verify

From the repository root:

```text
node tools/build-banner-preview.cjs
node tools/build-theme-usage.cjs
node tools/build-theme-usage.cjs --check
node tools/check-usage-sources.cjs
```

The commands under `tools/` are compatibility entry points. Edit implementations
here under `build/`, not those wrappers. The normal guide build also produces the
branding workspace and its companion references. The guide (`Usage-Guide.html`)
and the branding workspace (`Theme-Config.html`) are written outside the repo
and OneDrive, to `C:\Dev\UHUB\Theme\Usage-Guide` (25 October 2026), set in
`build/guide-output.cjs` and overridable with `UNIONSUITE_GUIDE_DIR`. Their
links to repo documents are rewritten as `file:///` links so they still open.

Generated HTML is a deliverable, but maintained inputs are what Git tracks.
Rebuild locally or in a release build; distribute generated files as artifacts.
Do not delete canonical templates merely because their output is also embedded
in the guide. The legacy banner embed/script are generated compatibility assets.

## Design lifecycle

- `prototypes/wip/`: tracked ideas and experiments under active consideration.
- `prototypes/approved/`: tracked implementation specifications accepted by the user.
- This folder: maintained documentation, templates and examples of implemented features.
- `archive/`: ignored, superseded research and experiments kept locally if useful.

Approval does not mean retirement. Keep an approved design tracked until its
implementation is tested and its documentation/examples have been incorporated
here. Then archive only material whose useful content has been retained.

Record design status and links in each prototype's README. Existing legacy
prototype locations remain tracked until explicitly classified; do not infer
that a file is disposable from `Comparison` or `Example` in its name.

## Release requirements

The guide must build without `archive/`, scratch captures or untracked files.
Preserve exact author HTML, selected-query-field definitions, copy/download
behaviour, global search, seed preview, simulated interactions, accessibility
and offline use when changing the packaging. Update AGENTS.md and this workflow
when the single-file deliverable is replaced by the proposed folder bundle.
