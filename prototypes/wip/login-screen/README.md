# Hub sign-in screen

Status: WIP trial. Concept A (card) with the constellation background (v2) is
in the shared theme as `Theme/UnionSuite/Scripts/SignInPage.js`, loaded by the
theme loader on pages with a `SignIn-Container` zone. Not yet documented in the
usage guide.

## Problem

The old sign-in page faded a triangle pattern and the Hub title in, but the
animation was glitchy and jumpy, and the logo, tagline and form never lined up
well side by side. The redesign puts the logo, tagline and form in a single
glass card over an animated background.

## Design (concept A)

- **Card:** one centred frosted panel with the logo, a free-text tagline, a
  fading divider, then the form. Alignment comes from the structure, so any
  logo shape works and the phone layout is the same design.
- **Tagline:** free text set per site (credit, slogan or empty). It wraps to
  at most two lines.
- **Credit:** "Powered by Union Innovation Hub" sits bottom-left, like a
  copyright line, inside the stage's bottom padding so it never overlaps.
- **Form:** visible labels, with the Forgot? link on the label row. The
  native placeholders are hidden.
- **Accent:** highlights (rim, glow, links, focus ring, button, sparks) use
  the theme's `--accent`, falling back to iMIS blue `#2563c4`. The button text
  switches to dark on light accents.

Card light, drawing on dark-glass, neon-edge and textured-glass references:

- **Glass:** clear frosted tint, backdrop blur, a top sheen and a faint
  tiled-SVG grain.
- **Rim:** a 1.5px masked ring with a glass edge. Two accent arcs travel
  around the border every 16s, driven by a registered `--rim-angle`.
- **Neon bloom:** the same arcs as a blurred ring over the edge. The blur is
  on the element and the mask on its pseudo-element, because an element's own
  filter runs before its mask.
- **Glow:** the arcs heavily blurred behind the card, blooming past its edges
  and showing through the glass (0.6 opacity; the neon is 0.75).
- **Pointer:** the rim and surface nearest the pointer light up, fading out
  280px from the card.

Background (constellation, from `ideas/`):

- Seeded stars drift and join when close. Stars near the pointer are drawn
  towards it and linked to it.
- Focusing a field, signing in, or clicking the open background sends a pulse
  through them.
- Only the canvas repaints. It draws at most 1.5× DPR and about 30fps when
  idle, and pauses while the tab is hidden.

Intro: the stars light from the card outwards and each link draws across from
the star that lit first. The glass rises in, the logo un-blurs and settles, the
tagline wipes in from the left, the divider draws out from the centre and the
form rows arrive one at a time, then the glow and neon bloom in. The intro
waits for web fonts and the logo image (capped at 1.2s).

Signing in: sparks (a tight accent glow with a white core) travel along links
towards the card. They start on the Sign In click (or Enter in a field) with a
burst already under way, and carry on while the native code has the button
disabled. If validation stops the request they die out after 0.7s. When
sign-in fails, they stop at once and a ring goes out from the card. The glow
breathes, the neon comes up to full and a sweep crosses the button; the
theme's busy ring is unchanged. The pointer's own pull eases off while signing
in, as the pointer is on the button then.

Messages (8 October 2026): iMIS shows sign-in messages, such as "The username
or password you entered is incorrect.", in the page's user messages panel,
filled by partial update when sign-in fails. `placeMessages` in
`SignInPage.js` moves that panel (the element itself, so partial updates still
find it by ID) into the card, between the divider and the Username field:
where people look when they retry, and the card no longer jumps as a strip
appears above it (owner chose in the card over above it or both). Without the
Sign In iPart it stays above the card. Each message is a slim box toned by its
kind (error coral, success green, information blue, warning amber) with an
outline icon in place of the native image. It slides down into place when it
arrives, joins the intro just before the Username row when the page loads with
one, and simply appears with reduced motion.
Each new error also gives both fields the message's muted coral rim (with
`aria-invalid`) and shakes them once. The message carries the error and cannot
say which field was wrong, so the fields stay quieter than it; solid coral is
kept for a "Required" field, which does name the field (`watchErrors` in `SignInPage.js` marks
`<html>` with `hub-signin-error` and `hub-signin-error-shake`); typing in
either field clears it. Reduced motion keeps the colour and drops the shake;
an error already there when the page loads marks the fields without a shake.
The mockup's Fails control shows the native markup captured from the live page.

iMIS's page-wide "Loading" box (`#ctl00_TemplateFillLoadingPanel` >
`#FillProgressDiv`, captured 8 October 2026) appeared at the top of the page
while signing in. The card already shows that, so it is hidden on this page
only (`display: none !important`, as iMIS shows it with an inline style). The
mockup includes the captured markup.

Tried and dropped: stars relighting in a loop from the corners in, and stars
closing in on the card while signing in.

Reduced motion keeps short fades, stops the travelling light and draws one
static frame of the field.

Backdrop blur over the animated field costs GPU time, so check it on low-end
hardware before production.

## Easter eggs

`SignInPage.js` includes two easter eggs, each with a switch in `EGGS` and all
their words in `EGG_MESSAGES`:

- **Gravity well:** press and hold on the open background; stars that come
  close are caught and follow the well, which grows as it catches more, with
  messages at 20/40/90/100% and a counter from 75%. Catching every star sets
  off a supernova.
- **Shooting star:** 1 in 5 visits, or after 45s idle; clicking it opens a
  dialog with the next of five curiosity quotes.

They never fire from the card or its controls, or while signing in, and are off
under reduced motion. Design notes, tuning and test results are in
[`eggs/README.md`](eggs/README.md).

## iMIS installation

Nothing goes in the page's head content. The theme loader (`index.js`) loads
`Scripts/SignInPage.js` on the staff sign-in page (`body.HubWrapper-StaffSignIn`)
or any page with a `SignIn-Container` zone. The loader runs before either is
parsed, so its gate waits and loads the file as soon as one appears; on other
pages the file is never requested.

Until the script runs, `zUnionSuite.css` (`US-SIGNIN-PREPAINT`) paints the
sign-in background on `body.HubWrapper-StaffSignIn` and hides the page content,
so the native page never flashes. If the script never arrives, the content
appears after 5s. The background there duplicates the script's; keep them in
step. The sign-in page uses this background in dark mode too.

Expected structure:

- one zone with CSS class `SignIn-Container`, holding in order:
  - the logo CCO: a logo image, then an optional content item with CSS class
    `Tagline`
  - the native Sign In iPart (`.SignInPage`)

Per site, change only the logo image and the Tagline text. Set `CREDIT_NAME` in
`SignInPage.js` to `""` to hide the credit (e.g. on the Hub's own site). The
credit is a linked logo (`CREDIT_URL`), with no text, that cross-fades from `CREDIT_LOGO` to
`CREDIT_LOGO_HOVER` on hover or keyboard focus; `CREDIT_NAME` is its alt text.

The page's styles live in `zUnionSuite.css` (`US-SIGNIN`), scoped to
`html.hub-signin` and the script's own elements, so upload the CSS with the
script. The script adds Google Fonts, marks `<html>`, and adds the canvas, neon
element and credit. If it is ever loaded on a
page without the zone, it removes itself.

Implementation notes:

- **The zone is the card,** and its wrapper `.ContentItemContainer` is sized to
  it and carries the glow and neon.
- **The glass is `::before`, not the zone.** A backdrop filter on the zone
  would make it the containing block for the MFA modal inside the Sign In
  iPart.
- **Dark mode** paints panels with a solid surface; the script resets them
  inside the card so the form shows the glass.
- **The intro uses transitions.** Removing `hub-signin-intro` from `<html>`
  starts them, so the rim's travel animation is never restarted. A fail-safe
  removes the class after 6s. Hiding is instant (`transition: none` while the
  class is on): the native logo and form can already be painted when the
  class is added, and an animated hide never finished before the reveal.
- **Other rows (e.g. a JS_CSS row) are hidden.** The Sign In hooks are
  delegated, and the neon and credit are re-added after partial postbacks.
- **Signing in is detected from the button's disabled state,** the same signal
  as the theme's busy ring. Credentials are never read.
- **The layout depends on CSS `:has()`** and `color-mix()`.

## Mockup

`v2/index.html` renders the native Sign In markup (trimmed capture) with the
shared theme CSS and the theme loader, exactly as installed. Its controls
switch the accent (theme orange or blue) and the light/dark theme, simulate a
failed or still-loading sign-in (Esc stops it), and replay the intro.
`v2/hub-logo.png` is a copy of the live logo.

Preview: run the `static-node` launch configuration and open
`http://localhost:8778/prototypes/wip/login-screen/v2/`. Opening the file
directly also works. The preview pane holds back animation frames while hidden,
so screenshots taken straight after a load can show the intro's hidden state.

## Maintained files

- `Theme/UnionSuite/Scripts/SignInPage.js`: the sign-in page design
- `Theme/UnionSuite/index.js`: the loader entry (`signin` module)
- `v2/index.html`, `v2/hub-logo.png`: the mockup
- `eggs/`: the easter eggs mockup (the v2 card with controls that show each egg)
- `ideas/`: the background explorations, including the constellation
- `redesign/index.html`, `redesign/redesign.css`, `login.js`: the design mockup
  with concepts A–C (`#card`, `#split`, `#open`) and the original triangle
  field
- `client-logo-example.svg`: fictional client logo
- `index.html`, `login.css`: the first mockup (side-by-side layout with the
  angled rule), kept for reference until the card is approved

The v1 head script (`imis-head.html`, triangle field) is in Git history at
commit 38a4375.

## Open decisions

- Client logos must be a light or reversed version to read on the dark
  background. Decide whether to require one, or offer a plate behind
  full-colour logos.
- Whether the credit also shows on the Hub's own site.
- Document the sign-in design in the usage guide when the trial is approved.
- Retire the first mockup (`index.html`, `login.css`) and the triangle
  `redesign/` concepts to `archive/` once the card is approved.
