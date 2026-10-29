# Sign-in background explorations

Status: WIP standalone design exploration. Not implemented in the shared theme or approved for production.

## Problem and direction

Explore four distinctive, interactive backgrounds behind one consistent Hub sign-in layout. The screen includes the Hub logo, a proposed tagline, username/password fields, password visibility, password recovery and a sign-in button. The comparison controls are prototype-only.

## Maintained file

- `index.html` owns this exploration's markup, CSS, canvas effects and demo interactions. It is a complete offline file with no external fonts, scripts, stylesheets, image requests or build step.
- The embedded PNG is the captured Hub logo from the existing login-screen reference. It is embedded directly so the file has no dependency on disposable captures.
- The teal, cyan, orange, type stacks and control radii come from `Theme/UnionSuite/zUnionSuite.css`. Display fonts use local fallbacks when the named theme fonts are unavailable. Background artwork and layout are experimental and local to this mockup.

## Preview

Open `index.html` directly in a browser. Or use the existing `static-node` launch configuration and open:

`http://localhost:8778/prototypes/wip/login-screen/ideas/`

Choose a background in the Design Lab at the bottom. Native radio controls support Tab and arrow keys. Links ending in `#aurora`, `#constellation`, `#contours` and `#prism` open a specific effect.

| Option | Ambient effect | Pointer and click effect |
| --- | --- | --- |
| Aurora | Fine cyan ribbons drift across a deep teal field. | Pointer bends the ribbons; clicks send ripples. |
| Constellation | Slowly drifting stars form nearby connections. | Pointer attracts/connects nearby stars; clicks light them in a pulse. |
| Contours | Layered lines flow like a topographic field. | Pointer deforms the lines; clicks send a wave. |
| Prism | Triangular facets breathe with a diagonal light sweep. | Pointer reveals nearby facets; clicks send a shimmer. |

Motion and interaction can be toggled independently. Reduced-motion preferences start with a static scene and can be explicitly overridden using Motion. Background animation pauses while the tab is hidden, uses one animation loop, caps device pixel ratio at 1.5 and renders at about 30 fps. Interactions are excluded from the form and Design Lab; touch taps work on the open background. The scene stays still while motion is paused.

The form uses native required-field validation. Sign in shows a short busy state followed by explicit demo feedback, clears the password and restores masking. Forgot password explains the intended reset-page action. Nothing authenticates, sends a reset email or stores entered details. Use sample credentials only.

## Open decisions

- Choose a background, motion level and whether pointer/click effects should ship.
- Confirm the proposed tagline: “Better connected. Stronger together.”
- Confirm the final logo asset and production typography.
- Confirm the card layout against actual native iMIS sign-in markup before implementation.
- Benchmark the selected canvas effect on target low-powered devices.

Production promotion would require the normal theme ownership, native iPart wrapper checks and canonical usage-guide workflow. This exploration does not change shared theme behavior.

## Verification

Browser-checked all four rendered backgrounds, keyboard selection, motion and interaction toggles, password visibility, recovery feedback and the demo sign-in busy/completion states. Inspected desktop, 768px tablet and 390px/320px phone layouts; the 320px layout has no horizontal overflow, including scrollbar space. No browser console errors were reported. Inline JavaScript passes syntax validation and the file contains no external asset references. Reduced-motion and hidden-tab handling are implemented; performance on target hardware remains an open decision.
