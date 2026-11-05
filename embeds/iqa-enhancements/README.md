# IQA enhancements — standalone script

`IQA-Enhancements-Standalone.js` puts every UnionSuite IQA enhancement on an
iMIS site that does **not** have the UnionSuite theme. It is one file, with
no theme CSS, theme tokens, icon font or other script needed.

| File | What it is |
| --- | --- |
| `IQA-Enhancements-Standalone.js` | The deliverable. Generated; do not edit. |
| `build-iqa-standalone.cjs` | Builds it from the theme sources. |
| `iqa-standalone.base.css` | Styles the theme's button system and icon font would otherwise draw. |
| `standalone-header.txt` | The usage comment at the top of the script. |

## Install on a client

1. Upload `IQA-Enhancements-Standalone.js` somewhere the staff site can load
   it, for example the client's own `App_Themes` folder or a CDN.
2. Add it once to the staff site's header HTML:

   ```html
   <script src="/App_Themes/YOUR_THEME/IQA-Enhancements-Standalone.js" defer></script>
   ```

3. Open an IQA in the designer. The **Enhance** switch appears beside Save.

The script does nothing on any page except the IQA designer
(`…/QueryBuilder/Design.aspx`) and the IQA browser
(`…/AsiCommon/Controls/IQA/Default.aspx`), so it is safe in a site-wide header.

**Remove it when the client gets the UnionSuite theme.** The theme loads its
own copies of these scripts. If both are present, the standalone script stands
down when it finds the theme already loaded and logs a reminder in the console.

## Styling

The script injects one stylesheet (`<style id="iqa-standalone-css">`). Its
colours, sizes and fonts are private custom properties named `--iqae-*`, set
to the stock iMIS Orion values (teal `#006f94`, orange `#ff9947`, Open Sans).
It never reads or sets the theme's tokens (`--accent`, `--border` and so on),
so it cannot clash with the client's own CSS.

To match a client's colours, override the private properties in their CSS:

```css
:root {
  --iqae-brand-600: #4a2f7a;   /* switches, focus rings, links */
  --iqae-brand-800: #2e1d4d;   /* outline buttons */
  --iqae-accent: #d4a017;      /* checked switches */
}
```

The full list is at the top of the injected stylesheet. There is no dark mode
in the standalone script.

## What staff get

### IQA designer

- **Enhance** switch beside Save turns every editor improvement on or off,
  live, with no reload; remembered per browser. **?** beside it opens the
  full list below inside iMIS.
- **Header**: Copy Path and Copy Key (DocumentVersionKey) buttons, which keep
  working after switching tabs. **Ctrl+S** / **Command+S** saves; Save shows
  Saving… with a spinner.
- **Summary**: copy the query path or SQL in one click; larger fields.
- **Sources**
  - Search Business Objects by name, and the **Union Template** quick-add list.
  - Reorder business objects by dragging (in a popup).
  - **Join by ID**: add a relationship by choosing the key type (Id, Key,
    Code or Ordinal) the objects share; existing matches are flagged.
  - Relations as a **join tree** from the first object, with each join type
    and delete beside it; separate groups and suspicious joins are flagged.
    An object joined to two others on one path gets a line from each.
    **List** in the Relations heading restores the standard view.
  - **Branchify**: limits results to entities the signed-in user can access by
    adding `i4u_UT_EntityAccess` and the filter Contact Key = `"@LoggedInUser"`,
    and the relationship to an OrgCode / Org_Code / EntityCode / Entity_Code
    field. The **Branchify** tab under Add relationship does the join on its own.
- **Filters**: type-to-filter field dropdowns, drag to reorder (in a popup),
  numbered groups with their order of operations (for example
  `((Group 1 OR Group 2) AND Group 3)`), function setting behind **ƒx**,
  Allow multiple values beneath its dropdown, value history per property.
- **Display**: drag columns into order (switch it off when not needed, Reset
  order to undo), uncheck all, and a custom SQL editor with source, field and
  `dbo.` function suggestions (`asi_GetAppDatetime()`,
  `asi_PublishedDocumentPath()`) and basic syntax checks that hold back Add.
- **Sorting**: type-to-filter dropdowns and drag to reorder.
- **Template** (HTML view): colour-coded tags and `{#query.…}` fields; type
  `{#` or press Ctrl+Space for the Display fields; matching tag pairs
  highlighted; unclosed tags and unknown fields underlined and listed with
  **Go to problem**; **Format HTML** (Shift+Alt+F) re-indents.
- **Show Usage** (the sitemap button in the header, once the query is saved):
  a drawer listing everything that uses the open IQA: content pages, business
  object value lists, panel source value lists, communication templates,
  alerts and Process Automation, and other IQAs. Each result has Copy path and
  Open in new tab. **Include ASI system content** adds ASI's own folders.
  **Check again** looks through every place (about 10–15 seconds) and saves
  one shared result for everyone. Without the `i4u_UT_Configuration` table
  there is nowhere to save it: the check still runs and its results stay in
  the drawer, marked "kept on this page only", until the page is reloaded.
  If the table is there but the save fails, the results also stay, with a
  warning and Try again.

Applying a new order updates the editor only; staff still Save the query.

### IQA browser

Quick find still filters the open folder, and also searches every folder by
name or path. Results go to their folder (Enter takes the top one) or open in
the designer (pencil). With the box empty it shows **Favourites** (stars on
results and on folder rows), **Recently opened** and **Recent searches**.
Pasting a `$/…` path offers to go straight to that location.

## What the client's iMIS needs

Each feature checks for its own data and degrades on its own; nothing else
breaks when one is missing.

| Feature | Needs |
| --- | --- |
| Union Template quick-add list and Business Object search | IQAs `$/_i4u_/Core/Admin/IQA Builder - Quick Add Business Object List` (prompted filter `DocumentName`) and `$/_i4u_/Core/Admin/IQA Builder - Quick Add Business Object Section`, each returning `DocumentName`, `DocumentVersionKey` and `Description` |
| Branchify | The `i4u_UT_EntityAccess` business object, listed in the quick-add list |
| Show Usage, saved for everyone | `i4u_UT_Configuration` with a `Payload` varbinary(MAX) property, and write access to it. Without the table, checks still work but stay on the page |
| IQA browser search | IQA `$/_i4u_/Core/Admin/Query Search - IQA Document Tree Taskbar` |
| IQA browser favourites | `i4u_UT_UserSettings` (`ID`, `SettingsKey`, `Value`) |

The other enhancements need nothing on the server. Show Usage does not check
the UnionSuite theme's own scripts here, because there are none.

## Rebuilding

The script is built from the theme's current files; the theme files are only
read. After the theme's IQA scripts or styles change, rebuild from the project
root:

```bash
node "embeds/iqa-enhancements/build-iqa-standalone.cjs"
```

`--check` fails if the script is out of date. The build stops with a message if
a theme section, selector or a Show Usage passage it changes has moved.

What goes in:

- The theme's IQA scripts, unchanged: `Scripts/HtmlSourceEditor.js`,
  `Scripts/IQA-Enhancements.js`, `Scripts/Document-Finder.js` (Quick find; was `IQA-Finder.js`), and
  `Scripts/IQA-WhereUsed.js` with its theme-scripts place left out and its
  results kept on the page when they cannot be saved.
- From `zUnionSuite.js`: the `US-COPY` (copy buttons) and `US-RECORD-CARDS`
  (sliding fold) sections.
- From `zUnionSuite.css`: the `US-COPY`, `US-HTML-SOURCE`, `US-WHERE-USED`
  and `US-DOCUMENT-FINDER` sections (less banner rules), and the switch, spinner,
  busy-label, tab-loading and filter-condition rules.
- `iqa-standalone.base.css`, and the 16 Tabler icons the scripts use, drawn as
  inline SVG masks instead of the 800KB icon font.
