# `UT_Staff.css` → generic components

A consolidation map for absorbing `UT_Staff.css` into the new theme. Everything
below is measured from the file, not estimated.

Companion to [THEME-FINDINGS.md](THEME-FINDINGS.md),
[THEME-INVENTORY.md](THEME-INVENTORY.md) and
[IMIS-CMS-STRUCTURE.md](IMIS-CMS-STRUCTURE.md).

Current adoption: Query Menu / IQA report presentation and utilities have moved
into `Theme/UnionSuite/zUnionSuite.css` and `zUnionSuite.js`, activated by
`us-report` on an iPart. See [setup and modifiers](../Theme/UnionSuite/README.md).
The [banner component](../Theme/UnionSuite-Guides/usage/examples/Banner-README.md) now provides the reusable
`us-banner` component, including token-driven styling, native-gutter page layout,
sticky/condensing modes and optional Actions/tabs markup. All banner CSS has moved
into separate sections of `zUnionSuite.css`; the existing behaviour script remains
separately included. This does not automatically migrate legacy banner markup or
retire its old rules. The remaining
component consolidation below is still outstanding. Current author recipes and
templates are in the [Theme Usage Guide](Theme/UnionSuite-Guides/Usage-Guide.html).

---

## The size of the prize

- **423 rule blocks**, 2,513 lines, 27 `!important`
- **133 of those blocks are literal duplicates** — 72 distinct declaration
  bodies that each appear more than once. **31% of the file is redundant.**
- **42 components are defined under more than one page scope.**

## Page scopes

Five scopes carry 362 of 423 selectors:

| Scope | Selectors |
|---|---|
| `.SimpleAccountPageOrg` | 147 |
| `.SimpleAccountPageContact` | 125 |
| `.StaffPage` | 41 |
| `.ManageWorkbench` | 27 |
| `.OrganiserPortal` | 22 |

The rest are small: `.IQAicon` (11), `.BulletinList`, `.ZidebarFiles`,
`.ComingSoon`, the eight nav-icon wrappers (`.Home`, `.Organising`, `.Cases`,
`.Agreements`, `.Calls`, `.Committees`, `.Travel`, `.Integrations`), and four
tracker gradient variants (`.PurpleNavy`, `.LightBlue`, `.Green`, `.Red`).

### The single biggest win

**`.SimpleAccountPageOrg` and `.SimpleAccountPageContact` are the same design.**
24 of the 26 cross-scope components are shared by exactly those two. Merging
them alone removes ~120 selectors.

---

## Components to extract, in order of duplication

### 1. Banner — defined in **four** scopes

Identical declaration bodies, 5 copies each:

| Concept | Names in use today | Scopes |
|---|---|---|
| Banner container | `.banner`, `.workbench-banner` | OrganiserPortal, StaffPage, SimpleAccountPageOrg, SimpleAccountPageContact, ManageWorkbench |
| Left group | `.banner-left`, `.workbench-info` | 4 scopes |
| Title | `.banner h1`, `.banner h2` | 4 scopes |
| Fact list | `.workbench-details`, `.person-details`, `.allocation-container` | 4 scopes |
| Fact row | `.info-item`, `.workbench-type`, `.workbench-id` | 4 scopes |
| Fact label | `.info-label`, `.detail-label` | 3 scopes |
| Action group | `.nav-buttons` | 2 scopes |
| Action | `.nav-button`, `.nav-button.selected` | 2 scopes |

**One concept has up to three different class names.** The current consolidation
target is `.us-banner` with `.us-banner__*` template slots. The `.banner` and
`.workbench-banner` names in the measurements below describe legacy markup;
they are not aliases for the new component. Migrate authored HTML and configured
iPart classes together before retiring the corresponding legacy rules.

Sample of the exact duplication:

```
x5  {align-items:center; display:flex; flex:1; gap:30px}
      .OrganiserPortal .banner-left
      .ManageWorkbench .workbench-info
      .StaffPage .banner-left
      .SimpleAccountPageOrg .banner-left

x5  {color:white; font-size:24px; font-weight:600; margin:0}
      .OrganiserPortal .banner h1
      .ManageWorkbench .workbench-banner h1
      .StaffPage .banner h1
      .SimpleAccountPageOrg .banner h2
```

### 2. Toolbar + dropdown menu — 2 scopes, 10 components

`.toolbar`, `.toolbar-content`, `.dropdown-wrapper`, `.dropdown-btn`,
`.dropdown-menu`, `.dropdown-menu.open`, `.dropdown-item`,
`.dropdown-item.has-submenu`, `.secondary-menu`

**Warning:** `.dropdown-menu` is *also* a Bootstrap/iMIS class used by the
account menu and the Export button. Redefining it generically will hit those.
Namespace it or rename.

### 3. Record header — 2 scopes

`.MemberBanner`, `.BannerHeader`, `.row.BannerHeader`, `.banner-content`,
`.contact-name`, `.contact-subtitle`

Likely the same component as §1 with a different name. Check before splitting.

### 4. Detail rows — 3 scopes

`.detail-label`, `.detail-value` — the label/value pair used in banners and
section bodies.

### 5. Sections — the `.section` stack

`.section`, `.section .panel-heading.Distinguish`, `.section .panel-description`,
`.section .panel-body-container`, `.section-scrollable`

Already generic in name. Note this same block is **also duplicated as a
page-level inline `<style>`** on at least the Home, Workbench and Content
Designer pages — the theme absorbing it should let those inline blocks be
deleted from the content records.

### 6. Nav icons — 1 scope, 8 variants

`.Nav-Icon-wrapper` + `.Home-wrapper`, `.Organising-wrapper`, `.Cases-wrapper`,
`.Agreements-wrapper`, `.Calls-wrapper`, `.Committees-wrapper`,
`.Travel-wrapper`, `.Integrations-wrapper`

Implemented in `Theme/UnionSuite/zUnionSuite.css`, block `US-STAFF-NAV-ICONS`
(7 September 2026). Existing wrapper classes are retained, scoped to root staff
navigation rows. Organising/Committees use `ti-users-group`, Calls uses
`ti-phone-outgoing`, and the other five mappings retain their Tabler equivalents.
Normal colour is `--brand-100`; hover/focus/selected colour is `--accent`.
The rule also prevents Orion's generic hover/selected sprite background from
painting a square behind a font glyph. `UTStaff.css` remains a legacy reference;
maintain the theme block for new changes. See the theme README and usage guide
for installation and migration.

### 7. Tracker gradients — 4 variants

`.PurpleNavy`, `.LightBlue`, `.Green`, `.Red` × `.ProgressTrackerNumberGradient`
— author-selected colour variants. Candidates for token-driven modifiers.

---

## Token candidates

The literals, by frequency. Every one of these is a token waiting to happen.

### Colours

| Value | Uses | Note |
|---|---|---|
| `#667eea` | **35** | A purple **not in the Orion palette**. Prototype-era |
| `#333` | 21 | Text |
| `rgba(255,255,255,0.3)` | 19 | The banner divider / button border |
| `#e0e0e0` | 12 | Border |
| `#999` | 11 | Muted text |
| `#f8f9fa` | 11 | Surface tint |
| `#f0f0f0` | 10 | Surface tint |
| `#666` | 8 | Text |
| `#3498db` | 7 | Prototype blue |
| `#2980b9` | 4 | Prototype blue hover |

**Note:** `#667eea`, `#3498db` and `#2980b9` are the old prototype palette, not
Orion's. Consolidating onto the native palette (findings §2) removes them.
Five different greys are doing the work of two.

### Radii — six values for one job

`8px` (19), `10px` (11), `12px` (5), `6px` (5), `4px` (4), `5px` (2), `50%` (2)

### Shadows — six near-identical

`0 2px 4px rgba(0,0,0,0.1)` ×4, `0 2px 8px …0.1` ×2, `0 2px 4px …0.08` ×2,
`0 1px 3px …0.08` ×2, `0 8px 16px …0.15` ×1

### Font sizes — ten distinct

`14px` (22), `11px` (10), `13px` (9), `18px` (7), `12px` (7), `24px` (6),
`20px` (6), `16px` (4), `10px` (4), `28px` (3)

### Breakpoints — seven distinct, inconsistent

```
9x  (max-width: 768px)
5x  (max-width: 1024px) and (min-width: 769px)
3x  (min-width: 768px)
2x  (min-width: 576px)
1x  (max-width: 576px)
1x  (min-width: 1024px)
1x  only screen
```

Mixed max-width and min-width strategies against the same boundaries. Pick one
direction and two or three breakpoints.

---

## How to consolidate without breaking markup

Class names live in **content records you can edit**, but there are many of
them and no "where used". Two routes:

**Alias first, rename later (recommended).** Define the generic component and
list the legacy names alongside it:

```css
.banner-facts,
.workbench-details,
.person-details,
.allocation-container { … }
```

Zero markup risk, immediate deduplication, and the legacy selectors can be
dropped once the records are migrated.

**Rename in markup.** Cleaner end state, but every content record using the old
name breaks silently the moment the alias disappears — and you can't enumerate
them.

---

## Suggested order

1. **Merge `.SimpleAccountPageOrg` + `.SimpleAccountPageContact`** — biggest
   single reduction, and they're one design already.
2. **Extract the banner** — four scopes, three vocabularies, most duplicated
   component in the file.
3. **Tokens** — colours, radii, shadows, type scale, breakpoints. Do this
   before porting anything else or you'll port the literals with it.
4. **Toolbar + dropdown** — but resolve the `.dropdown-menu` collision first.
5. **Detail rows, sections.**
6. **Nav icons, tracker gradients** — already close to generic; port last.

## Expected outcome

423 blocks with 133 redundant, five page scopes, three names per concept and
six radii → a component set with one name per concept and a token block. The
133 duplicates are the floor of what consolidation removes; merging the two
account-page scopes and the banner vocabulary should take out considerably more.
