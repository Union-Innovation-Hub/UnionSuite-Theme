# Theme preview harness

Renders `legacy/Orion page.html` — a real captured iMIS staff page — against the full
stylesheet cascade, so theme changes can be checked without a deploy.

    themed.html   layers 1–5 (the real thing)
    native.html   layers 1–3 only (control: what iMIS looks like untouched)
    icons.html    Tabler smoke test — hand-written, not build output

The cascade, in load order:

| # | Served as | Source in this folder |
|---|---|---|
| 1 | `10-UltraWaveResponsive.css` | `Theme/UnionSuite/guides/usage/vendor/10-UltraWaveResponsive.css` |
| 2 | `UT_Staff.css` | `legacy/UTStaff.css` |
| 3 | `99-Orion.css` | `legacy/Native CSS/Orion-99.css` |
| 4 | `zAdditionalStyling.css` | `legacy/UT-theme.css` |
| 5 | `zUnionStyling.css` | `legacy/zUnionStyling.css` (empty here) |

Rebuild after editing any source file:

    node .preview/build.js

Then start the `crm-theme-preview` launch config (port 4599).

## Caveats

- Telerik and `WebResource.axd` bundles aren't in the capture, so RadControls
  render unstyled. Anything you check on a RadGrid or RadScheduler here is
  indicative, not final.
- Page scripts are stripped, so nothing interactive works. The capture's
  `class="fade"` is removed at build time — without that the page renders
  invisible, because the script that reveals it is one of the stripped ones.
- The generated `.html` and copied `.css` files are build output. `build.js`,
  `server.js` and this README are the only sources here.
