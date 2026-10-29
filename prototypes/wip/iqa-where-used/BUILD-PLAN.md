# IQA "where used": build plan

Signed off by the owner on 12 October 2026: the drawer mock-up (including the
red warning on a failed rebuild), Copy path and Open in new tab, and the
Process Automation editor link. Research, decisions and probe results are in
[README.md](README.md).

## What gets built

A **Where used** button in the IQA designer header opens a drawer from the
right listing everything that uses the open IQA, read from one shared index
stored in `i4u_UT_Configuration`. Anyone who can edit an IQA can rebuild the
index.

## Files

| File | Change |
|---|---|
| `Theme/UnionSuite/Scripts/IQA-WhereUsed.js` | **New.** Index builder, store, lookup, drawer and header button. Exposes `window.UnionSuiteWhereUsed`. |
| `Theme/UnionSuite/index.js` | Register `where-used`, gated to the IQA designer like `iqa`, after `core`. Expose the module paths on `window.UnionSuiteLoader` so the theme scan can read every script. Bump `RELEASE`. |
| `Theme/UnionSuite/zUnionSuite.css` | `US-WHERE-USED` section: the drawer, from the mock-up. |
| `Theme/UnionSuite/zzDarkMode.css` | The dark count badge. |
| `Theme/UnionSuite-Guides/usage/build/check-usage-sources.cjs` | Fail when a theme script assembles a `$/` path from parts, so the theme scan stays complete. |
| `tools/test-where-used.cjs` | **New.** Node tests of the extraction and lookup against fixtures shaped like the probe results. |
| Usage guide source, `docs/THEME-INVENTORY.md`, `TODO.md`, this folder's README | Documentation, status and a visual example. |

**Why a new file:** the integration plan keeps the designer in one deployment
file, but the builder is a separate concern that the content deployment
project's reference checks can reuse, and `IQA-Enhancements.js` is already
4,700 lines. It loads under the same gate, so the designer still gets one
extra request only.

## Index

**Places read**, three at a time, ASI system content included:

| Place | Read through | References |
|---|---|---|
| Content pages | `FindDescendantDocumentsInFolder` per top-level `@/` folder | `$/` paths in elements and attributes, including inside Content HTML; IQA keys |
| Business object value lists | Paged `GET /api/Document?DocumentTypeId=BOD&DocumentStatusID=40` | `msprop:ValueListQuery` keys |
| Panel source value lists | `GET /api/BOEntityDefinition`, reading on until a short page | `Rule.Query.Criteria.Values` paths |
| Communication templates | Paged `GET /api/Document?DocumentTypeId=COM&DocumentStatusID=40` | `$/` paths |
| Alerts and Process Automation | Paged `GET /api/TaskDefinition` | `DataSources.Query.Criteria.Values` (keys and paths), `Actions.QueryDocumentID` |
| Other IQAs | `FindDescendantDocumentsInFolder` per top-level `$/` folder | length-prefixed `$/` strings and key text in the NRBF blob |
| UnionSuite theme | The loader's script list, fetched from the theme folder | quoted `$/` paths, named by their `US-…:START` section |

- **Keys** count only when they belong to an IQA. The IQA read supplies every
  IQA's DocumentKey and DocumentVersionKey, and key references are filtered
  against them once every place is read.
- **Pages without a path** in the content tree (ASI admin pages such as
  Customer Configuration) are not reached by the folder read. This is a known
  limit, listed in the drawer's "Not covered" note.

**Stored form**, gzip-compressed JSON in `Payload`:

```js
{
  format: 'unionsuite-where-used', version: 1,
  builtAt: '2026-10-12T09:44:45.137Z', durationMs: 12400,
  sources: { CON: { items: 1482 }, … },         // what each place read
  items: [ { source, name, path, key, url, system } ],  // things that use IQAs
  refs: [ [itemIndex, identifier, property, owner] ]     // identifier: lowercased path or key
}
```

**Lookup** for the open IQA matches `refs` on its path, its two keys and each
parent folder. A folder match is shown as "Uses the folder …". No IQA
catalogue is needed at lookup time.

**Row** in `i4u_UT_Configuration`: Module `System`, Category `IQA`, Code
`WhereUsedIndex`, Entity blank, ValueType `String`, Value a readable summary,
Description as in the README, LastUpdated in site time (`appTimeZoneOffset`),
`UpdatedBy` set by iMIS. Read by code with `Limit`, lowest Ordinal first.
Create with POST when missing, otherwise PUT that Ordinal. A failed rebuild
saves nothing.

## Editor links (Open in new tab)

| Place | URL |
|---|---|
| Content page | `/AsiCommon/Controls/ContentManagement/ContentDesigner/ContentRecordEdit.aspx?iMode=Edit&iOperation=Edit&iUniformKey={DocumentVersionKey}` |
| Business object | `/AsiCommon/Controls/BOA/Design.aspx?iUniformKey={DocumentVersionKey}` |
| Communication template | `/CreateCommunication?CommunicationId={key}` (which key: confirm live) |
| Process Automation / alert | `/iParts/Common/Tasks/TaskEditDialog.aspx?TaskDefinitionId={TaskDefinitionId}&ParentTab=1` (owner) |
| IQA | `/iMIS/QueryBuilder/Design.aspx?iMode=Edit&iOperation=Edit&iUniformKey={DocumentVersionKey}` |
| Panel source, theme script | none yet |

All site-relative, so they work in any tenant and virtual directory through
`gWebRoot`.

## Designer integration

- **The button** sits after the existing Copy Path and Copy Key buttons, and
  is always on (not behind Enhance). It is disabled with a tooltip until the
  query has a saved path (`span[id$="_QueryPath"]`, as `HeaderPath` reads it).
- **Rebuild** shows only when the designer's Save
  (`[id$="_DesignShell1_SaveButton"]`, as the Ctrl+S handler uses) is present
  and enabled.
- **The index is fetched quietly** after the designer loads, so the drawer
  opens on results. If it is still loading, a loading line appears only after
  150 ms, so a fast load never flashes.
- **A rebuild carries on** while the drawer is closed.

## Order of work

Steps 1–7 done on 12 October 2026.

1. ✓ Extraction and lookup as pure functions, with `tools/test-where-used.cjs`
   (9 tests). The NRBF test caught a misread length prefix, now fixed.
2. ✓ Store: read, create, update and decompress.
3. ✓ Rebuild runner: places three at a time, progress events, previous index
   kept on failure.
4. ✓ Drawer and button, from the mock-up, with the CSS in the shared sheets.
5. ✓ Loader registration (release 1.0.3), the module list and the theme scan
   (which skips `IQA-WhereUsed.js` itself: its folder list is not a reference).
6. ✓ The source check for assembled paths.
7. ✓ Guide section `#iqa-where-used` with an example drawn by the real lookup,
   inventory, TODO and README; guide built, `--check` and source check pass.
8. Live check on dev (below).

**Checked locally** against a fake iMIS API (`.preview/where-used/`, not
tracked): first build fills place by place and saves one row (local
LastUpdated, iMIS-style UpdatedBy); the stored index opens instantly after a
reload; ASI items hidden until opted in, preference remembered; a failed
place keeps the previous index with the red warning; no Rebuild without Save;
an unsaved query disables the button and makes no requests; Escape closes and
returns focus; dark mode.

## Live checks on dev

- [ ] The button sits correctly in the real header; disabled before a first save.
- [ ] First build on dev: time it, and the stored size.
- [ ] Workbench List shows its two pages; `ContactRecords` shows List Of Contacts, the Sandbox folder page and `Copy_of_contacts_-_base`.
- [ ] A value-list IQA shows its business object or panel source, and a task IQA its task.
- [ ] A theme IQA (`Recent IQAs - User`) shows the theme.
- [ ] Each Open link opens the right editor in a new tab, including the communication template key and the task dialog as a full page.
- [ ] Rebuild hidden for a user without Save; a failed rebuild keeps the previous index.
- [ ] Light and dark, keyboard (Escape, focus return), reduced motion.
