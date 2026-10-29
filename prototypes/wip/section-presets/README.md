# iPart CSS class budget and section presets

Status: active WIP. Two presets, `us-home-tasks` and `us-contact-methods`, are
**implemented** in `Theme/UnionSuite/zUnionSuite.js` (and `zUnionSuite.css`
for `us-home-tasks`). The wider naming and
registry work below is discussed, not built. This folder records the
constraint and the options so the next change does not re-derive them.

## The constraint

**The iMIS iPart CSS class field truncates at 100 characters.** Measured on
`uhubemsdev.imiscloud.com`, 21 September 2026: an authored value of

```
us-tab-panel us-tabset-home us-tab-tasks us-query-search us-task-completed-filter us-action-home-add-task
```

is 105 characters and arrives in the DOM cut to exactly 100, losing the last
four characters of the action class. There is no warning; the class simply
does not match and the feature silently does not appear.

This is not a one-off. A panel that combines tab placement, query features and
an action is an ordinary case, and every further filter or toggle costs
another 15–25 characters against a fixed budget.

## Where the characters go

Three kinds of class compete for the same field, and they are not equivalent.

| Kind | Example | Can it move? |
|---|---|---|
| Structural — which tabset, which tab | `us-tabset-home`, `us-tab-tasks` | **No.** It positions this iPart within a group of sibling iParts, so only the wrapper can carry it. ~40 characters, always spent. |
| Behavioural — search, filters, scroll | `us-query-search`, `us-task-completed-filter` | Yes. Bundled into a preset, or read from the template. |
| Action — a button | `us-action-home-add-task` | Yes. Author the button in the Query Template instead; see below. |

Two further facts shape the options, both established by reading the source:

- The **behavioural features are JS-built**. `syncQuerySearch` reads
  `classList.contains('us-query-search')` and
  `classList.contains('us-task-completed-filter')` and constructs the search
  field and toggle. Nothing in the authored HTML depends on those classes, so
  adding them at runtime causes no flash of the features themselves.
- The **CSS use of those classes is identification only**. All fifteen
  occurrences in `zUnionSuite.css` are the same repeated
  `:where(.us-query-template, .us-list-scroll, .us-query-search, .us-task-completed-filter)`
  list that answers "is this a query display". That styling *would* flash if it
  waited for script, which is why a preset class must be added to that list
  rather than relying on runtime expansion alone. `:where()` is
  zero-specificity, so extending it changes nothing else.

## Options considered

### 1. Move the action out of the field — implemented, no code needed

The action runtime scans `button[class*="us-action-"]` and `a[…]` directly, so
an action can be authored in the Query Template rather than on the wrapper:

```html
<button type="button" class="us-action-home-add-task">Add task</button>
```

Verified that `ownerFor` resolves such a button to the same owner a generated
one gets — it walks `closest('.panel')` and returns its parent when both sit in
the same `ContentItemContainer` — so an `origin-report` refresh is unaffected.
Frees 24 characters. The only difference is placement: a wrapper-class button
is injected into the panel header's action slot, an authored one renders where
it is written.

### 2. Condensed base plus modifiers — discussed, not built

`us-q` as a container marker with `us-q-search`, `us-q-complete` modifiers, in
place of `us-query-search` and `us-task-completed-filter`.

This is already the convention elsewhere in the theme: the tab system uses
`us-tab-panel` as a base with `us-tabset-<group>` and `us-tab-<key>` modifiers.
The query classes are the ones breaking it.

The better argument is not length but separation. Today each feature class is
*also* a query-display marker, which is why every new filter has to be added to
the identification selector. A base class marks the container once and
modifiers only describe behaviour.

- Marginal cost per filter falls from ~24 characters to ~14.
- Prefer `us-q-*` over bare `us-search`: same total length, because the shorter
  base pays for the namespace, but bare tokens sit in the global class
  namespace where anything can collide.
- Cost: renaming published content. 18 JS and 32 CSS references, plus CMS pages
  this workspace cannot enumerate — the same situation still causing
  `us-report-button-*` failures today. Support both names during a transition
  and retire the old ones through the conversion checklist.

### 3. Section presets — implemented for one case

One authored class expands to the feature classes it bundles. Removes the
ceiling rather than raising it, and moves configuration from CMS pages into
Git where it is reviewable and renameable.

Implemented as **expansion into the existing classes**, not as a parallel
configuration system: everything downstream keeps matching what it already
matches, and there is no second set of runtime semantics to hold in sync.

Costs to weigh before extending it:

- **Deploy coupling.** An author can add a filter today by editing a CSS field.
  Behind a preset that becomes a theme deployment, which here is monthly. Keep
  the raw classes available for one-off pages.
- **Layering.** A section identity is page-specific in a way an action is not.
  Prefer pattern names that can be reused across pages over page identities, or
  the definitions file becomes content.

### 4. Combined class names — rejected

`us-q-search-complete` in place of `us-q-search us-q-complete`.

Saves exactly five characters per folded feature, and is the only option that
gets *harder* as features are added:

- Direct CSS matching is lost. `.us-q-search` is a simple selector;
  a combined token needs substring matching, which false-positives, or script
  to split it back out — which reintroduces the flash for five characters.
- Feature names may no longer contain hyphens, or the parse is ambiguous.
- Authors must remember a canonical segment order.

## What is implemented

`us-home-tasks` expands to `us-query-search`, `us-task-completed-filter` and
`us-action-home-add-task`.

- `sectionPresets` and `expandSectionPresets()` in `zUnionSuite.js`, called
  first in `reconcile()` so the classes exist before anything reads them.
  Expansion is idempotent, so the action observer settles after one pass.
- `.us-home-tasks` added to the identification selector in `zUnionSuite.js`
  and to all fifteen matching `zUnionSuite.css` selectors, so query-display
  styling applies on first paint.

Authored field becomes 54 characters, from 105:

```
us-tab-panel us-tabset-home us-tab-tasks us-home-tasks
```

`us-contact-methods` expands to `ContactDetailsIQA` and
`us-action-member-add-contact-method`. Neither is a query-display feature, so
it needs no identification selector or CSS entry: the action runtime and
refresh lookup read both classes after expansion. The contact methods field
becomes 64 characters, from 99:

```
us-tab-panel us-tabset-profile us-tab-contact us-contact-methods
```

Verified in a harness reproducing the iPart wrapper contract: the wrapper gains
all three classes and `data-us-query-display`, the search field renders, the
completed toggle renders at 36×36 in the header utilities, and the Add task
button renders ready.

## Open decisions

- Whether to adopt option 2, and whether presets should expand to the condensed
  names or the current ones. Doing 2 after more presets exist means editing
  each preset rather than each page, which is an argument for presets first.
- Whether presets stay hand-listed or become a registry shaped like the action
  registry, with validation, ownership and `getActionStatus`-style diagnostics.
  Not worth the machinery until two or three sections share a bundle.
- Whether preset CSS selectors should be generated at build time once there are
  several, rather than hand-extended.
- Nothing yet reads preset configuration from the template. If the field is
  exhausted again, `data-us-q="search complete"` on an element inside the
  template, matched with `:has()`, has no length limit and fits the idiom the
  identification selector already uses.
