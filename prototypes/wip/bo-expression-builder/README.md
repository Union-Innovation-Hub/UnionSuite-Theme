# BO expression builder

**Status:** implemented in the theme, 11 November 2026, as the
`ExpressionEditor` module of `Theme/UnionSuite/Scripts/BO-Enhancements.js`
(release `1.0.22`, not yet uploaded). This folder is kept as the design
record: the measurements, what was learnt about the builder, and the early
mock-up. The maintained description is the usage guide's
"Business object designer: Expression builder" section.

## Problem

The Expression builder tab on a Business Object property (Properties tab of
`/AsiCommon/Controls/BOA/Design.aspx`) nests the rest of the expression inside
another box for every operator. The example, `_I4u_UT_ContactBasic.SearchString`
on the dev tenant, is six terms joined by `+`. iMIS draws it six levels deep,
with 54 dropdowns on a panel about 1,300px tall, in a popup that shows about a
third of that. Each property dropdown is a plain list of 127 entries. The only
overview is raw SQL at the bottom of the panel.

`Theme/UnionSuite/Scripts/BO-Enhancements.js` does not touch this tab yet.

## Proposal

A new gated module in `BO-Enhancements.js`, restoring the stock builder when
Enhance is off:

1. **Formula line.** The expression as one readable line at the top, headed
   with the property's name. Clicking a term finds its row.
2. **Flat rows.** A run of `+` is one term per row with the operator leading.
   The repeated "Calculation / No function" rows are hidden. If / then / else
   and any grouping that changes the result stay nested.
3. **Searchable property dropdowns.** Reuse the script's SearchSelect.
4. **Quieter rows.** Data type as a badge, "Add function" faint until set,
   Replace as "find … with …" on one line with a note for spaces or empty.

## Prototype: typed editor, Apply and preview

`expression-editor.candidate.js` adds a panel above the stock builder and
restyles the builder. It follows the BO enhancer's Enhance switch and removes
everything it added when Enhance is off. It never saves.

- **Formula box.** Shows the builder as text, for example
  `Name.ID + Replace(Name.MOBILE_PHONE, " ", "") + If(Name.COMPANY_RECORD = True, Name.COMPANY, Name.FULL_NAME)`.
  Accepts what the builder can hold: `+ - * / %`, brackets, the builder's
  functions (one per value; see the table below), `If(condition, value, …, last value)` with
  `= <> < <= > >= contains, not contains, starts with, ends with`, conditions
  joined with `and` / `or` (brackets group them), and further
  `condition, value` pairs for the builder's "else if", text,
  numbers, `True`/`False`, `Today` and `Table.Column` properties. Suggests
  properties and functions as you type. The text is coloured with the IQA
  SQL editor's colours (functions and words as its keywords, fields as its
  identifiers, text and numbers as its strings and numbers), and a function
  or field the builder does not have gets a wavy underline. A hint line under the box shows what
  the function at the caret expects, with the current part underlined:
  `Replace(value, "expression to replace", "text to replace with")`. Errors
  name the problem, the argument and the character. A property the builder does not offer is an error, so Apply never
  starts on a formula it cannot finish.
- **Apply to builder.** Sets the builder's own dropdowns and text boxes, one
  server round per step, then reads the builder back and compares it with what
  was typed. Measured: an edit that keeps the shape took 1 step (2.6 s); a
  rebuild of the six-term example from a two-term expression took 8 steps
  (13 s). Stop ends it between steps; the builder is then part-way.
- **Preview.** Five published rows, each worked out in script. The property
  to column map comes from the document blob. Marked as an estimate. For the
  example it matched the published `SearchString` values.
- **Builder styling** (the mock-up's look, on the real builder). It only adds
  classes, short labels and one option's text; it moves and removes nothing
  iMIS wrote. **Show structure** puts the stock layout back.
  - A run of `+` or `*` is one row per term with the operator in front; the
    repeated "Calculation / No function" rows are hidden.
  - Each value (kind, property, data type, function and its boxes) sits on
    one line. The data type is a badge. "No function" reads "+ Add function".
    A function's boxes get a word beside them ("find … with …") and say when
    they hold only spaces or nothing.
  - If / then / else is one card: IF, THEN and ELSE in a label column, the
    condition on one line. iMIS's wrappers are set to `display: contents`
    and each piece is placed by `order`.
  - Each property dropdown is the inline type-to-filter box the IQA enhancer
    uses on Filters and Sort (`FilterSortDropdowns`).
- **Add and remove buttons.** iMIS labels three different actions "Add
  condition"; each now says what it does: **Add condition** (join a second
  condition to a lone one), **Add condition to this group**, **Nest a
  condition** (start a bracketed group from one line of a group; shown
  quieter), and **Wrap in a new If** (moved to the foot of the card). The red
  crosses are the theme's trash button (`TextButton us-icon-button
  DangerButton` with `ti ti-trash`); iMIS's image button stays in the page,
  hidden, and still does the work and still asks first. Pointing at or
  focusing an add link outlines what it acts on; a trash button outlines, in
  red, exactly what will go. The outline is one see-through box sized to
  cover all the pieces (separate outlines on each piece ran into one
  another); it sits over the builder page and lets clicks through. Trash
  buttons are 28px so they centre in the 33px rows, at the right of the
  IF / ELSE IF label.
- **No flash on a change.** iMIS answers a dropdown change by swapping in
  fresh markup twice (the change, then its own refresh) and showing its
  full-page loading panel. A mutation observer restyles the fresh markup
  before the browser paints it, and the loading panel is kept see-through
  for changes that come from the builder (it still blocks clicks), with a
  quiet "Updating…" by the heading. Measured on a function change: before,
  2 unstyled frames and the overlay for about 200ms; after, none.
- **Calculated formula** (iMIS's read-only SQL under the builder) is shown one
  term per line with the operator in front, a CASE broken over WHEN / THEN /
  ELSE, in the same colours as the formula box. Clicking a line scrolls to
  its row and flashes it. Pointing at a row or a line tints both, and so does
  the caret in the formula box while the box still matches the builder. When
  the SQL is not a plain run of terms it is coloured but left as one block.
  iMIS's own span stays in the page, hidden.
- **Not handled yet** (the formula box turns read-only and says why; the
  builder still works): Empty / Not Empty / In / Between, date and time
  constants.

How conditions and branches work in the builder (checked on the dev tenant,
11 November 2026):

- A condition is a comparison or a group. A group's own dropdown offers only
  And / Or, and its two sides are conditions again.
- "Add condition" at a condition turns it into a group: what was there
  becomes the left side, the right side is new and empty. So conditions added
  one after another nest as `((A and B) and C)`, which is how the formula
  box reads `A and B and C`.
- The red cross beside And / Or removes the group and keeps its left side.
- The "Add condition" link at the top of an If (`WrapIntoIfThenElse`) does
  something else: it puts the whole If inside a new If, as that If's THEN
  value. The new outer If's first branch then has a remove button, which
  takes the outer If away again and keeps the THEN value.
- "Add else if" adds a branch. Branches share one container; their controls
  differ only by a `ctlNN` after `WhenThenExpressionControlContainer_`. The
  cross beside "ELSE IF" removes that branch.
- Both removals ask "are you sure?" (`return confirm(…)`). Apply answers yes
  for its own presses only: Apply is the go-ahead for the whole formula, and
  it saves nothing.
- Adding or removing is a button press, which Apply does as a round of its
  own. Measured: from a three-deep group to
  `If(A and B, x, C, y, z)` took 7 steps (17 s); back to a plain If took
  2 steps (5 s).

iMIS offers a different function list for each kind of value. The formula box
knows all three and refuses a mismatch (for example `Upper` on a date) when it
has seen the property's type in the builder; otherwise Apply reports it.

| For | Typed | Builder option |
|---|---|---|
| Text | `Trim Left Right Length Lower Upper LTrim RTrim Reverse Replicate CharIndex Replace Substring` | the same names |
| Dates and Today | `DateTime Date Time Day Month Year EndOfMonth` | Date and time, Date only, Time only, Day only, Month only, Year only, End of month |
| Dates and Today | `DatePart(value, part)`, `DateName(value, part)` | Date part, Date name; part is one of year, quarter, month, dayofyear, day, week, weekday, hour, minute, second, millisecond, microsecond, nanosecond, tzoffset, iso_week |
| Numbers and true/false | `Round(value, decimal places)` (0 to 37), `Floor`, `Ceiling`, `Abs`, `DateTime` | Round, Floor, Ceiling, Absolute value, Date and time |

Learnt while building it:

- The functions a property offers depend on its type, so a new property and
  its function cannot be set in the same round. Dates (`DBTimeStamp`) get the
  date list; `Numeric` and `Boolean` get the number list; Today gets the date
  list.
- On the dev tenant `GET /api/{BO}?limit=5` returns 500 because one row
  (offset 1) fails; the preview asks for rows one at a time and skips failures.
- A failed Apply leaves the builder part-way. Nothing is saved, so closing the
  designer without saving discards it; Reset shows what the builder holds.

### Trying the working copy before an upload

`node tools/test-bo-expression.cjs` checks the formula language (parser,
formatter, preview maths, colouring, SQL layout). The script is loaded by the
theme, so a change shows in iMIS only after a theme upload. To try the working
copy first, run the text of `Theme/UnionSuite/Scripts/BO-Enhancements.js` in
the designer iframe's console (`ObjectBrowserDialog`): it replaces the copy
the theme loaded.

The Claude browser pane blocks the iMIS page from loading `http://localhost`.
`relay.html` gets round that: serve the repo root locally, open
`/prototypes/wip/bo-expression-builder/relay.html` in a spare tab, navigate
that same tab to any page on the iMIS site, and run
`localStorage.setItem('bxSrc', window.name.slice(6))`. Then, on the designer
page:
`document.querySelector('iframe[name=ObjectBrowserDialog]').contentWindow.eval(localStorage.getItem('bxSrc'))`.

## Spike: typed editor driving the builder (11 November 2026)

Run on `TestCopy_I4u_UT_ContactBasic.SearchString` on the dev tenant, by
script in the designer iframe. Nothing was saved; the expression was put back
and checked against its original SQL.

- **Addressing.** Every control's id spells its path in the tree
  (`…_RightExpressionControlContainer_ctl00_LeftExpressionControlContainer_…`),
  so a node can be found from its position.
- **One change costs about 1.6 seconds**: two async requests, the change and
  then `RefreshUpdatePanelButton`. Starting a second change before the first
  settles muddles both; wait for the page request manager to go idle.
- **Changes batch.** Setting several dropdowns and text boxes, then firing one
  postback, applies all of them in the same 1.6 seconds. Two kind changes and
  an unrelated function change went through together.
- **A kind change discards what was there.** Property to Calculation gives a
  Calculation with both operands `None`; back to Property gives the first
  property in the list. Adding or inserting a term means rebuilding everything
  from that point down.
- **New controls need another round.** A kind change creates its dropdowns on
  the next render, so a tree builds one level per round: values for this level
  and kinds for the next can share a round.
- **Text is escaped by iMIS.** A constant ` - it's` came out as `' - it''s'`.
- **The SQL label under the builder** updates after every round and is the
  check that the tree matches what was typed.
- **Preview.** The designer's Preview tab switches client-side and showed the
  loaded data, not the unsaved change. The published BO answers over REST
  (`GET /api/{BO}?limit=1`, about 150ms), but it returns property names
  (`Suburb`), while expressions use `Table.Column` (`Name.CITY`), and
  `BOEntityDefinition` does not give the column behind a property. A live
  preview therefore needs that mapping from the designer and can only cover
  columns the published BO exposes.
- **The `ctlNN` parts of an id are not stable.** The same node was
  `ctl03_ctl00_Left…` on one load and `ctl03_ctl01_Left…` on the next. Match
  on the named containers (`LeftExpressionControlContainer` and so on) and
  ignore the `ctlNN` segments.
- **Preview grid rebind fails with a draft pending.** With an unsaved function
  change, sorting the Preview grid (its only postback) emptied the grid with
  "The selected data source encountered an error. Index was out of range …
  startIndex". Not checked whether the sort fails without a draft too.
- **What REST gives per property** (`GET /api/BOEntityDefinition/{BO}`,
  published version): `Name`, `Caption` (the label), `Description`,
  `PropertyTypeName`, `MaxLength`, `DbDataType`, `IsNullable`, `IsReadOnly`,
  `Required`, `Visible`, control type. `DatabaseColumnName` repeats the
  property name, so there is no source table or column, and no expression.
- **The document blob has the whole definition, in one request.** The
  designer's hidden `DocumentKeyField` is the `DocumentId`, and the URL's
  `iUniformKey` is the `DocumentVersionKey`. `GET /api/Document/{DocumentId}`
  (about 125ms) returns `Data.$value`: base64 of the `ObjectDesignContainer`
  XML, 110 KB here. Each property element carries `msdata:Caption`,
  `msdata:SourceTable` and `msdata:SourceColumn` (`Suburb` is `Name.CITY`,
  `PreferredEmail` is `Name.EMAIL`, `Postcode` is `Name.ZIP`), and a computed
  property carries `msprop:CustomPropertyExpression`, the expression as a JSON
  tree. This is the property-to-column map the preview needs, and the same
  read `Claude\QA Process\capture\qa-capture.js` does (`captureBo`; its
  `currentVersion` picks a Working draft over the Published row through
  `/api/DocumentSummary?DocumentVersionId=`). It is the saved document:
  changes not yet saved in the designer are not in it.
- **Stored form.** The BO definition keeps the expression as a JSON tree in
  `CustomPropertyExpression` (read by `Claude\iMIS Object Reader`, `bod.js` and
  `expression.js`). REST does not expose it. Writing it directly is untested.

## Files

- `relay.html`: test helper for loading the working copy of the BO enhancer
  into the designer. (The prototype script and its tests moved into the theme:
  `Theme/UnionSuite/Scripts/BO-Enhancements.js` and
  `tools/test-bo-expression.cjs`.)
- `mockup.html`: self-contained mock-up with a Stock iMIS / Proposed switch.
  Open it in a browser; no build. The lists and the example expression were
  copied from the dev tenant.

- `BOEntityDefinition-TestCopy_I4u_UT_ContactBasic.json`: the full response of
  `GET /api/BOEntityDefinition/TestCopy_I4u_UT_ContactBasic` from the dev
  tenant, 11 November 2026, pretty-printed. Its content was checked against
  the live response by SHA-256.

## Open decisions

- Whether scroll position and focus survive the postback each dropdown change
  triggers. Not yet tested; restoring them may be needed.
- Not done at promotion: an offline demo of the editor for the usage guide;
  dark-mode rules; reusing the enhancer's own SearchSelect and SQL colouring
  (the editor carries its own picker and colouring).
- Whether Apply should be allowed on a stored (non-calculated) property.
- How the hidden "Calculation" kind dropdowns are reached when someone wants to
  change the grouping (a "Show structure" switch is one option).
- Adding a term means turning the last operand into a Calculation, which takes
  several postbacks. An "Add term" button would have to drive those in
  sequence; it is not in the mock-up.
- Node types not in the example: Today, the other functions' arguments, the
  `-`, `*`, `/` and `%` operators, In and Between conditions.
- Dark mode colours.
