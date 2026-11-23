# Standalone apps

How UHUB-managed apps that are embedded in a client's iMIS site are styled, and
the interface patterns they share. Recorded 23 November 2026 from the Content
Exporter and Deployer refresh.

**Status: this is a design record, not shipped theme code.** Nothing here is in
`zUnionSuite.css` or `zUnionSuite.js`. The patterns were worked out in a mockup
and then built into the two apps (see [Reference](#reference)). That build is
on a branch: it passes the apps' offline tests but has not been run against a
live iMIS site or released. Each pattern below says whether it reuses something
the theme already ships or is new.

## The rule

A standalone app is one UHUB builds, hosts and maintains, that a client loads
into their own site but cannot customise: the Content Exporter and Deployer are
the first two.

**Standalone apps use standalone styling, with one consistent UHUB brand.**
(Owner, 23 November 2026.)

- They do not follow a client's branding. A CRM page layout is re-themed per
  client; a standalone app looks the same on every site.
- They must work with and without the UnionSuite theme. Some client sites run
  the theme, some rebrand it, and some use their own styling entirely.
- They take their look from this theme (type, shapes, status colours, motion)
  so they read as part of the same family, but the values are pinned in the
  app, never inherited from the page.

Why a fixed brand rather than the client's:

- **Status colours must not collide with a brand.** The apps use red for
  production and failure, the accent for the primary action, and green for
  done. A client with a red or orange brand would turn a banner into something
  that reads as a warning.
- **One palette can be checked for contrast.** Following the host makes every
  client palette an untested case.
- **The app is recognisably the vendor's tool**, and the same tool on every
  tenant for whoever runs it.

## Making the styles standalone

The app's stylesheet must not depend on anything the page provides.

1. **Declare every token on the app root.** Do not read `--seed-*`, `--brand-*`
   or any other custom property from the page. Pin the five seeds and derive
   the ramps from them with the same `color-mix()` percentages the theme uses.
2. **Scope every rule by the app root's `id`**, not a class. One id outranks a
   host page's class and element rules (bare `input`, `select`, `.btn`,
   Bootstrap, a client stylesheet).
3. **Reset everything inside the root to browser defaults first**, so whatever
   the host set is discarded and the component rules build from a known
   baseline:

   ```css
   #appRoot,
   #appRoot :where(*:not(svg):not(svg *)) {
     all: revert;
     box-sizing: border-box;
   }
   ```

   - Wrap the descendant part in `:where()` so the reset weighs exactly one
     id: enough to beat the host, never more than a component rule.
   - Leave `svg` and its children out. The reset would clear the `stroke` and
     `fill` their markup sets and the icons would disappear.
   - Then restate the inherited text properties on the root (`text-align`,
     `letter-spacing`, `text-transform`, `text-indent`, `font-style`,
     `font-weight`, `white-space`), because the root still inherits those from
     the page.
   - Re-declare `[hidden] { display: none !important; }` under the root.
4. **Ship the fonts with the app.** Inter and Red Hat Display come from the
   theme on a themed site and are absent elsewhere. Embed the font files in
   the app's own stylesheet (the Exporter and Deployer build them in as
   `data:` URIs, so no font service is contacted) and declare them under
   private family names, such as `UHUB Inter`, placed first in the font stack.
   A private name cannot clash with, or be replaced by, a font the page
   declares.
5. **Embed icons as CSS masks or inline SVG.** Do not rely on the Tabler icon
   font being on the page.

Known limits: a host rule marked `!important` still wins, and none of this
isolates script. Shadow DOM isolates more completely and is the alternative
where an app can adopt it (HubForms does); it needs the app's script to look
elements up through the shadow root, and custom properties must be defined on
`:host`.

Test on three hosts: a site with the theme, a site with a rebranded theme, and
a site with deliberately clashing global styles.

## Shared patterns

"Theme" means the pattern reuses something the theme already ships. "New" means
it was introduced for the standalone apps and is a candidate for the theme.

### Navigation and structure

| Pattern | Rule | Source |
| --- | --- | --- |
| Banner | Gradient banner surface with an eyebrow, a display-face title and a subtitle. Facts follow the title, left-aligned behind a divider, with small upper-case labels and no colons. Actions sit at the far right. | Theme (`us-banner`) |
| Wizard steps | Steps sit in the banner's tab row. Each has a round badge: the step number, a tick on green when done, the accent colour when current. A step that cannot be reached yet is dimmed. | New |
| Wizard footer | Back on the left, one primary forward action on the right, and a one-line status beside it. The same on every step. | New |
| Table toolbar | The selection count, bulk actions and exports attach to the top edge of the table they act on. | New |

### Actions

| Pattern | Rule | Source |
| --- | --- | --- |
| Button roles | One accent button per screen, for the way forward. Filled navy for the next-strongest action. Outline for everything else. Success green only for the action that commits a change; danger red only for destructive ones. | Theme (native button roles), applied as a per-screen limit |
| Action menus | When a screen has many secondary actions, group them by purpose into a menu with small group headings. Show how many items each option affects. One menu open at a time; close on outside click and Escape. | Theme (Actions menu), extended |
| Split button | Where one action is the likeliest, it is one click and the alternative sits behind the caret. With no alternative it collapses to a plain button. Filled navy, not accent. | New |
| Delete | A trash icon, grey at rest and danger red on hover. Not an ×. | Theme |
| Confirm a reset | Anything that discards the user's work asks first, in the theme's dialog, saying what will be lost. The safe choice has focus. | Theme (dialog chrome) |

### Feedback and status

| Pattern | Rule | Source |
| --- | --- | --- |
| Alerts | Status tint, 1px border in the full status colour, 6px radius, 12px by 16px padding, strong text. Reserved for things that need attention. A routine success ("loaded") is quiet inline text, not an alert. | Theme (`US-MESSAGES`) |
| Action in an alert | When an alert tells the user to do something, the button for it sits inside the alert. | New |
| Filter chips | A status dot, a label and a count. Selected, the chip fills with its status colour and the dot reverses to the colour that reads on that fill. Each chip carries the pair as two custom properties, so a dark palette only restates the pairs. | New |
| Requirement checklist | Requirements that gate an action are numbered steps that tick off as they are met. The gated button stays disabled and shows how many are left. | New |
| Progress | One always-visible card: overall bar, elapsed and remaining time, the current item. Phases run left to right in order; done is green with a tick, running is the brand colour, pending is grey. Only the running phase shows its description. | New |
| Row notes | A note about a row sits on its own line under the row, aligned with the name, so it never pushes the row's buttons. | New |

### Content

| Pattern | Rule | Source |
| --- | --- | --- |
| Copyable paths | Every path has the quiet copy button beside it: copy icon, green tick on success, accent flash on the copied text, no "Copied" label. 24px in dense rows; revealed on hover in trees; 44px below 950px. | Theme (`US-COPY`, quiet form) |
| Disclosure | One drawn chevron everywhere, pointing right when closed and down when open. Never "(click to expand)" or text arrow characters. | New; not yet compared with the theme's own disclosures |
| Names with codes | Show the plain name of a type with its system code beside it in small monospace ("Content page `CON`"). | New |
| Reveal on hover | A control that repeats on every row may appear on hover or focus above 950px and stay visible below it. | Theme (touch and narrow-screen rule) |
| Line length | Short helper text runs the full width of its panel, matching the alerts and tables around it. | New |

Motion, touch sizes and reduced-motion behaviour follow the rules in
[`AGENTS.md`](../AGENTS.md) without change.

## Reference

The implementation and the mockup live in the Content Deployment project,
outside this repo:

- `iMIS Content Deployment - native/deployer/deployer.html` and
  `exporter/package-exporter.html` — the two apps. Each `<style>` block opens
  with the isolation rules and its own tokens. Built on the branch
  `standalone-theme-refresh` (23 November 2026).
- `iMIS Content Deployment - native/build/build-ipart.js` and `assets/fonts/` —
  how the fonts are embedded.
- `iMIS Content Deployment - native/docs/mockups/theme-refresh/index.html` —
  the mockup: both apps, every screen, with a current/new switch and three
  host sites. That folder is ignored by Git in that repo, so it exists only
  where it was built.

The apps' stylesheets copy values from `zUnionSuite.css`. If a theme value
changes, the standalone apps do not follow automatically; update them
deliberately.
