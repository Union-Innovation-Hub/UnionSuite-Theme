# iMIS staff theme — findings

Original findings written 2026-09-05, at the point of deciding to restart the
theme element by element. The original findings were **measured in a browser**,
not inferred. Where a
number appears it came from `getComputedStyle` or `getBoundingClientRect` on
real captured markup.

Read §1–§3 before writing a single rule. They are what the first attempt cost.

Current local implementation: `Theme/UnionSuite/zUnionSuite.css` contains the
seeded tokens and approved IQA report CSS; `zUnionSuite.js` contains the shared
behavior. `zzClientSpecific.css` is the client override layer. The old filenames
and reset status below describe the earlier attempt. Current installation and
iPart classes are in [the theme README](../Theme/UnionSuite/README.md). This local
integration has not itself published the assets or modified a live page.

For current author instructions use the
[standalone Theme Usage Guide](Theme/UnionSuite-Guides/Usage-Guide.html). Banner styling
now lives in `zUnionSuite.css`, in separate page-layout and component sections.
The existing separate script supplies sticky/condensing modes and Actions
disclosure; its compatibility embed now contains no CSS. Tab switching remains
deferred. See the
[banner implementation guide](../Theme/UnionSuite-Guides/usage/examples/Banner-README.md). The measured findings
below remain historical evidence, not a list of today's implemented features.

---

## 1. The cascade you are landing in

Five stylesheets, in this load order:

| # | File | Where it comes from | Notes |
|---|---|---|---|
| 1 | `10-UltraWaveResponsive.css` | `/Assets/css/` | iMIS base. ~4,000 rules, **1,139 `!important`** |
| 2 | `UT_Staff.css` | `cdn.uhub.org.au/EMS/css/` | **Yours.** Not in the theme folder |
| 3 | `99-Orion.css` | `App_Themes/<theme>/` | Stock Orion. 9,263 lines, only 33 `!important` |
| 4 | `zAdditionalStyling.css` | `App_Themes/<theme>/` | **The theme.** This is what you write |
| 5 | `zUnionStyling.css` | `App_Themes/<theme>/` | Per-client overrides. Loads last |

iMIS auto-links every `.css` in the theme **root** and does not scan
subfolders. That is why `Tabler.css` is a one-line root shim that `@import`s
into `Tabler/`. It is also why the theme folder name doesn't matter *if* your
paths are relative — see §3.2.

### 1.1 Sheets that load AFTER the theme

Some pages inject their own stylesheet below the theme links:

- `WorkbenchMainCSS.css` (`cdn.uhub.org.au/EMS/i4u_Workbenches/`) on the
  Workbench pages. **Not inspected.** Anything it sets beats the theme at equal
  specificity.
- Page-level inline `<style>` blocks in content records — inline beats external
  at equal specificity regardless of order.

**Consequence:** a bare class selector in the theme is not guaranteed to win.
Budget for `body.body-main .thing` (0-2-1) as the normal form for anything
contested, and know that `#MainBody .thing` (1-1-0) is the escalation.

### 1.2 The `!important` mass is not where you'd fear

UltraWave's 1,139 `!important`s cluster in two places, neither of which is
ordinary page content:

- Bootstrap-ish utility classes — `display` (167), `margin` (74), `padding`
  (39), `width` (47), flex alignment.
- Vendor chrome. **Every colour `!important` lands on** `.RadScheduler`,
  `.RadTreeView`, `.RadEditor`, `.RadSplitter`, `.WebPartZone…`,
  `.EasyEdit-ActionButton`, `.SocialSprite`.

So you do not need an `!important` war for normal content. You *will* need to
leave Telerik alone — see §3.

---

## 2. The palette (worth keeping)

Measured from `99-Orion.css` by frequency:

| Colour | Uses | Role in Orion |
|---|---|---|
| `#ff9947` | 73 | The dominant accent. Orion's own `.AccentButton` fill |
| `#545962` | 40 | Body text |
| `#ff734f` | 32 | Secondary coral |
| `#003a4c` | 32 | Deep teal |
| `#5acbf8` | 15 | Default button fill / bright cyan |
| `#002632` | 15 | Darkest teal — sidebar |
| `#413d6b` | 12 | Purple |
| `#007ea8` / `#006f94` | 8 / 6 | Link teal |
| `#68bd49` / `#d03528` | 6 / 5 | Success / danger |

### 2.1 Contrast measurements (against white)

Do not re-derive these:

| Colour | Ratio | Verdict |
|---|---|---|
| `#006f94` | **5.67** | Safe for body text. Good primary action |
| `#d03528` | **4.97** | Safe for text |
| `#5acbf8` | **1.90** | Fills and accents only. Never text on light |
| `#ff9947` | **2.12** | Fills only. White on it is 2.1 — **use `#002632`, 7.7** |
| `#68bd49` | **2.34** | Fails for text. Darken to `#3f7a2a` (5.21) for text, keep native for fills |
| `#3fb5d9` | **2.38** | Under 3:1 — too weak even for a UI indicator on white |
| `#94a3b8` | **2.56** | Acceptable as a control border, not as text |
| `#64748b` | **4.76** | Safe for 13px+ text |

### 2.2 Two-tier tokens

The one part of the first attempt that caused zero breakage. Worth rebuilding:

- **Tier 1 — primitives.** Raw values. The only thing a client overrides.
- **Tier 2 — semantics.** `--brand-600: var(--teal-600)`. What a colour is *for*.
- Components reference **Tier 2 only**. No colour literals below the token block.

A client rebrand then becomes a `:root{}` block in `zUnionStyling.css` with
three or four Tier 1 values in it, and everything follows. Custom properties
resolve at computed-value time, so a `var()` in layer 2 still picks up a
`:root` defined in layer 4 — the ordering doesn't fight you.

---

## 3. The traps — every breakage, with cause

### 3.1 Bare element selectors break Telerik. This was the big one.

The Content Designer / Object Browser is built entirely from Telerik
RadSplitter, and RadSplitter lays itself out with **tables** and **`<input
type="button">` hairlines**:

```html
<table class="RadSplitter" style="width:1px;height:1px">
<input class="rspCollapseBarSpacer" style="width:4px;height:1px" type="button" value=" ">
```

Two theme rules destroyed it:

```css
.btn, .TextButton, input[type="button"], input[type="submit"],
input[type="reset"], button { display:inline-flex; padding:7px 14px; border:1px solid transparent; }

table, .table { width:100%; border-collapse:collapse; font-size:13.5px; }
```

The inline `width:4px;height:1px` wins, but **padding does not** — so a 4×1px
split-bar hairline became a ~32px block. Measured after guarding: padding back
to the native `1px 3.185px`, spacer 10.3px instead of blown out.

**Rule: never put a bare element selector (`table`, `button`, `input[type=…]`,
`td`, `th`) on a structural property.** Class selectors are fine — theming
`.TextButton` is the whole point. Guard the bare ones:

```css
input[type="submit"]:not(:where(<telerik roots>, <telerik roots> *)) { … }
```

Telerik roots to exclude: `.RadSplitter .RadGrid .RadComboBox .RadMenu
.RadTreeView .RadWindow .RadScheduler .RadEditor .RadTabStrip .RadMultiPage
.RadCalendar .RadInput .RadUpload .RadDock .RadAjaxPanel`, plus
`.ObjectBrowserWrapper`.

Use `:where()` for the exclusion list — it contributes **zero specificity**, so
the guard costs nothing downstream.

### 3.2 Content records contain hardcoded `fa-` markup

The Workbench List IQA display template renders:

```html
<i class="fa-solid fa-list-check" title="Tasks"></i>
```

FontAwesome was removed from the theme (29 MB for 7 icons). Those icons then
rendered at **width 0, `content: none`** — the Module Allocation column looked
empty and staff lost the data. It reads as a dead column, not a broken one.

You cannot edit IQA display templates from CSS, so the fix is a shim:

```css
.fa, .fas, .far, .fab, .fa-solid, .fa-regular, .fa-brands { font-family:"tabler-icons"; font-weight:400; }
.fa-list-check::before { content:"\eb6a"; }
```

**Before removing any icon dependency, grep every content record for `fa-`.**
The stylesheets being clean proves nothing.

### 3.3 `:empty` does not match iMIS's empty headings

iMIS emits a `__Head` div for every content item, titled or not. An untitled one
is:

```html
<div class="panel-heading">\n\n\t</div>
```

That is whitespace, not nothing — **`:empty` matched 0 of 4** on the Home page.
Match on "has no element child" instead:

```css
.panel-heading:not(:has(*)) { display:none; }
```

Like `:empty` this is live — if script ever injects a title, the heading styles
itself back on. `:has()` is safe here; `UTStaff.css` already uses it.

### 3.4 Panels nest, and nested panels stack their headings

A tabbed collection organiser puts a whole `.panel` inside another `.panel`'s
body, so "My Tasks" and "My Unactioned Tasks" each drew a heading strip and
read as one header duplicated. `.panel .panel > .panel-heading` needs its own
quieter treatment, and `.panel .panel` should not paint a second card.

### 3.5 `@import` must precede every rule

The theme's four Google Fonts `@import`s sat *after* the token block, so
browsers dropped them — the file was never actually requesting Open Sans,
Inter, Montserrat or Red Hat Display. It only looked fine because
`99-Orion.css` imports the same faces.

### 3.6 A `border` shorthand after a `border-color` wipes it

The shared button base set `border: 1px solid transparent` and sat *after* the
default-button colours. Result: a white button with an invisible border on a
white panel — which is exactly why the IQA "Find" submit read as a bare text
link rather than a control.

Worse, restating `border-color` afterwards **still didn't work**: the base
includes `input[type="submit"]` at **0-1-1**, and a bare `.TextButton` is
**0-1-0**. Order is irrelevant when specificity differs. It needed
`input[type="submit"].TextButton` (0-2-1).

### 3.7 Long `:not()` chains build unclimbable walls

```css
a.TextButton:not(.btn-primary):not(.btn-primary-dark)…:not(.AccentButton)
```

computes to **0-11-1**. Nothing contextual can ever override it — it silently
blocked every attempt to style a button inside the banner. Rewrite as
`:not(:where(a, b, c))`, which excludes identically at **0-1-1**.

### 3.8 Grid-scoped link rules outrank button classes

`.RadGrid.RadGrid .rgRow a` is 0-3-1 and beats `.TextButton` at 0-1-0, so every
in-grid "Action" button took the link colour: `#006f94` on `#5acbf8` =
**3.06:1**, under the 4.5 floor. Needs a matching-specificity rule.

### 3.9 `.no-card` is declared but unstyled

Authors wrap content items in `.no-card` meaning "not a card", but nothing
honoured it, so the panel chrome still drew — and `overflow:hidden` on `.panel`
clipped anything trying to bleed past it.

### 3.10 Orion uppercases every `h1`

`h1, .h1, .PageTitle { text-transform: uppercase }`. If you want sentence-case
record titles you must turn it off explicitly.

---

## 4. Duplicated and competing CSS you don't control

- **`UTStaff.css` duplicates the banner styles** — 22 `.OrganiserPortal` rules
  including `.OrganiserPortal .banner { padding:20px 40px }`. At 0-2-0 that
  beats a plain `.banner`. Deleting a content record's inline `<style>` is
  **not** enough on its own.
- **Content records carry inline `<style>`** with hardcoded `#2c3e50` /
  `#3498db` / `#667eea` — the old prototype palette leaking into production.
- **`WorkbenchMainCSS.css`** loads after the theme. Contents unknown.
- `FontAwesome.6.7.2.css` hardcoded `/App_Themes/Orion-UT-v2/…` in all 19
  imports — would have 404'd every icon the moment the folder was renamed to
  `UnionSuite`. **Always use paths relative to the stylesheet.**

---

## 5. Where the risk actually lives

Measured across the 490 rule blocks of the first attempt:

| | Count |
|---|---|
| Colour / typography only | 186 |
| Structural only | 148 |
| Both | 109 |

Structural rules per iMIS-generic class:

| Class | Structural rules |
|---|---|
| `.panel` | 12 |
| `.btn` | 12 |
| `.panel-body` | 5 |
| `.RadGrid` | 5 |
| `.panel-heading` | 4 |
| `.TextButton` | 3 |

**Every breakage in §3 came from that table.** Not one came from the 186
colour-only rules. If the rebuild does nothing else differently, make it this:
colour freely, restructure only with a named context and a measurement.

---

## 6. Rules for the rebuild

1. **No bare element selector on a structural property.** Guard with
   `:not(:where(<telerik roots>))` if you must touch one.
2. **No unconditional structural rule on an iMIS-generic class.** Qualify by
   context: a `.panel-heading` *that has a title*; a `.panel` *that isn't
   nested*.
3. **Colour is cheap, structure is expensive.** Worst case for a wrong colour is
   ugly. Worst case for wrong padding is a broken admin screen.
4. **`:where()` for exclusion lists**, never long `:not()` chains.
5. **Relative paths only** in anything under `App_Themes/`.
6. **Check the element in every context iMIS emits it** — empty, nested, inside
   RadGrid, inside a pager, inside a Telerik widget — before shipping a rule
   for it.
7. **Measure, don't eyeball.** Two things in this project were diagnosed wrong
   from screenshots and corrected only by `getComputedStyle`: the KPI numbers
   (look cyan, are `#545962` grey behind a `background-clip:text` gradient that
   is Orion's own opt-in `.ProgressTrackerNumberGradient`), and the Module
   Allocation column (looks empty, is broken icons).

---

## 7. The harness

`../.preview/` renders a real captured iMIS page against the full five-layer
cascade with no deploy. `node .preview/build.js`, then start the
`crm-theme-preview` launch config (port 4599).

It caught four of the six defects before deploy. The two that reached the
server did so because nothing checked **content records** or **Telerik-heavy
screens** — both now covered by §3.1 and §3.2.

**What it cannot do:** Telerik's own stylesheets come from `WebResource.axd`
and aren't in the capture, so RadControls render unstyled. Anything you check
on a RadGrid, RadSplitter or RadScheduler there is indicative only.

**Recommended next step for the rebuild:** capture 8–12 page sources —
contact record, company record, agreement, an event screen, finance/batch, the
Content Designer, a settings page — and extend the harness to diff themed vs
native computed geometry across all of them. That converts "surprise per
deploy" into one enumerated list.

---

## 8. State as of the reset (2026-09-05)

**The theme has been rolled back.** `UnionSuite` on the server is back to base
with `zAdditionalStyling.css` stripped out entirely. The work restarts element
by element.

**Scope has grown.** `UT_Staff.css` is being deprecated *into* the theme — see
[IMIS-CMS-STRUCTURE.md](IMIS-CMS-STRUCTURE.md) §10 for what that means and the
system-vs-page decision it forces. So the new theme has to cover both the
component system and everything 2,513 lines of `UT_Staff.css` currently does.

**Easy Edit must keep working** and has never been tested against a themed
page. See IMIS-CMS-STRUCTURE.md §13.

### Local files

- `UT-theme.css` — **the abandoned first attempt.** Kept as reference only.
  Do not deploy. Its useful parts are the token block (§2.2) and the guards
  (§3.1); everything else is superseded by the rules in §6.
- `Theme/UnionSuite/zAdditionalStyling.css` — **stale.** A copy of the
  abandoned theme, no longer matching the server.
- `UTStaff.css` — edited (nav icons remapped to Tabler) but never uploaded, and
  now scheduled for deprecation anyway.
- `legacy/Native CSS/` — `10-UltraWaveResponsive.css`, `Orion-99.css`. Still current
  and still the authority.
- `../.preview/` — the harness. Still works; rebuild with `node .preview/build.js`.
- Backups: `.preview/UTStaff.pre-tabler.backup.css`,
  `.preview/zUnionStyling.deployed.backup.css`,
  `.preview/FontAwesome.6.7.2.orphan.backup.css`.

### Carry forward

- The measured palette and contrast figures (§2) — no need to re-derive.
- The two-tier token structure (§2.2) — caused none of the breakage.
- Tabler 3.31.0, woff2 only, 1.1 MB, MIT licence included.
- The `fa-` shim (§3.2) — still needed while content records carry FA markup.
- Every trap in §3.

### Still true regardless of approach

- Check who else consumes `cdn.uhub.org.au/EMS/css/UT_Staff.css` before
  changing or removing it — UTStaff **and** UTTemplate both load it.
- Inspect `WorkbenchMainCSS.css` (loads after the theme).
- Grep all content records for `fa-`.
- 9 `layout-transition` findings in the sidebar/accordion animations.
