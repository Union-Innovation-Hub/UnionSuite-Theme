# IQA "where used"

## Problem

When you open an IQA there is no way to see what depends on it: which content
pages, iParts and other IQAs would break if it were renamed, moved or changed.

## Status

**Built in the theme, 12 October 2026; live verification on dev pending.**
See [BUILD-PLAN.md](BUILD-PLAN.md) for what was built and the live checks.
`Theme/UnionSuite/Scripts/IQA-WhereUsed.js`, the `where-used` loader module,
`US-WHERE-USED` in `zUnionSuite.css` (and its dark rule), guide
`#iqa-where-used`, tests `tools/test-where-used.cjs`, and the assembled-path
check in `tools/check-usage-sources.cjs`. The mock-up and probes below remain
as the research record.

**Intended design (owner, 12 October 2026):** an option on an IQA lets the user
check where it is used. The check runs only when asked (lazy load). The probe
times that check source by source.

**Sources (owner decisions, 12 October 2026):**

| Source | Read through | Why |
|---|---|---|
| `CON` content pages | `FindDescendantDocumentsInFolder` per top-level folder | iParts and dashboards; dashboards are content pages |
| `IQD` IQAs | `QueryDefinition/_execute FindById`, compared with the NRBF blob read | IQAs used as a source by another IQA; rare (owner). Test case: `$/_i4u_/SandBox/branching/Copy_of_contacts_-_base` uses an IQA as a source |
| `BOD` business objects | `GET /api/Document`, paged | `msprop:ValueListQuery` value lists |
| `COM` communication templates | `GET /api/Document`, paged | stored in DocumentMain |
| `BOEntityDefinition` | `GET /api/BOEntityDefinition`, paged | value-list rules on panel sources (169 on dev) |
| `TaskDefinition` | `GET /api/TaskDefinition`, paged | alerts and Process Automation; not in DocumentMain |

Skipped: `RDL` (SSRS, mostly deprecated), `DBS` (a business object definition
type), `NotificationSet` (groups of alerts; the alerts are TaskDefinitions) and
every other document type in iMIS's type list.

**System folders are skipped** unless `includeSystemFolders` is true:
`$/Samples`, `$/Common`, `$/ContactManagement`, `$/Fundraising`, `@/iCore`,
`@/iSamples`. ASI's stock content cannot refer to your own IQAs unless someone
has edited it.

**The reference contract carries over** to the content deployment project's
reference checks. For each source the probe lists every property holding an
IQA path or key, with counts.

## Live findings on dev

- **12 October 2026: IQA display templates were not searched.**
  `$/_i4u_/Core/CA/v2/API - Manage Agreement - Banner Details` is named in
  the display template of `Query Template - Manage Agreement - Banner`
  (`data-us-facts-query`), but was not listed. The IQA reader took only
  whole length-prefixed strings. It now also searches inside long strings
  ("Its display template uses this query"), with a test of this case.
  Release 1.0.4; needs Check again after upload. Owner asked whether the
  banner should change: no; the guide now says to write IQA paths whole in
  templates and Content HTML.

## UI decisions (owner, 12 October 2026)

- **A "Where used" button** in the IQA designer header, beside Copy Path and
  Copy Key. It is always available, not behind the Enhance switch, and disabled
  until the query has been saved.
- **Results in a drawer** that slides in from the right over the designer. It
  does not push or resize the editor.
- **Other IQAs are always searched**, with the other five sources.
- **ASI system content is opt-in**, with help text explaining what it adds.
- **Results are stored and shared** rather than worked out per user: a stored
  result set with its created date, rebuilt on command. Proposed form: see
  "Shared index" below.

## Mock-up

`mockup/index.html` is a static mock-up of the drawer over an approximate IQA
designer. It uses the shared theme CSS and JS, with fake results and rebuild
timings taken from the dev probes. Serve the repository root with the
`static` or `static-node` launch configuration and open
`/prototypes/wip/iqa-where-used/mockup/index.html`.

- **Sources:** `mockup/where-used.css` holds the candidate drawer styles
  (`US-WHERE-USED` section) and the mock page layout. `mockup/where-used.js`
  holds the drawer behaviour and fake data. Reveals use
  `UnionSuiteRecordCards.fold`.
- **Mock-up controls** switch between: an index built 2 hours ago or none
  yet; a rebuild that succeeds or fails on business objects; a saved or
  unsaved IQA; a user who can edit IQAs or a read-only one; light or dark.
- **Behaviour shown:**
  - Opening and closing the overlay: 220 ms in, 180 ms out, instant with
    reduced motion. Escape closes it and focus returns to the button.
  - Six places with counts, "None" and folder matches grouped separately.
  - The ASI opt-in, with help text.
  - Rebuild progress per place. A failed rebuild keeps the previous index and
    offers Try again.
  - A first build fills in place by place.
  - A read-only user sees no Rebuild. An unsaved IQA disables the button with
    a tooltip.
- **Decided in the mock-up:** a rebuild carries on if the drawer is closed;
  reopening shows its progress. Clicking Rebuild clears the old results at
  once, and each place refills as it is read (owner, 12 October 2026). If the
  rebuild fails, the previous results come back with the failed place marked.
- **Result actions (owner, 12 October 2026):** a Copy path icon button (the
  shared `us-copy` control: tick, "Copied" and a flash on the path) and an
  Open in new tab icon link to the item's editor. The open IQA is never
  replaced and no popup opens inside a popup. A task has no path to copy and
  no editor link yet.
- **Not yet decided:** the Process Automation editor link; the exact designer
  header markup on the live page.
- **Theme usage (proposed):** the theme's own scripts call 11 IQAs by literal
  path in five files (taskbar Recents and quick search, IQA designer quick
  add, agreement communications, CloudToolz URL). A seventh place,
  "UnionSuite theme", would list them. See "Theme usage" below.
- **CloudToolz flows:** a TODO for a CT flow that reports its flows' IQA use
  (TODO.md, Enhanced IQA).

## Theme usage (proposal)

Two ways to include the theme's own IQA use:

1. **Generated list:** a build tool scans the theme's scripts for `$/` paths
   and writes them, with the feature each sits in (its `US-…:START` marker),
   into the IQA designer bundle. It must be rebuilt with every theme change,
   or it goes stale.
2. **Scanned at rebuild (recommended):** the index rebuild fetches every theme
   script and scans it the same way. It always matches what is deployed, with
   no list to maintain. The file list comes from the loader (`index.js`), which
   already lists every script, including ones gated to other pages
   (`SignInPage.js`, `BO-Enhancements.js`). It needs one small change: expose
   the module paths on `window.UnionSuiteLoader` (it exposes only `status()`,
   `base` and `version` today). A script added to the loader is then scanned
   automatically. The one remaining rule: write IQA paths as whole string
   literals, never assembled from parts. That can be enforced by a check in
   `tools/check-usage-sources.cjs` rather than an AGENTS.md instruction.

Either way, Content HTML `data-*` attributes holding IQA paths live on the
pages, so the content-page scan covers them. It must read `$/` paths inside
HTML attribute values, not only whole elements, since the full index does not
use the raw text search that found them in the probe. Paths the theme builds
from parts would be missed; none do today.

## Shared index

One scan of every source answers "where used" for every IQA, not just the one
on screen, and costs about the same as a single check. So the scan builds an
index once, stores it, and every user's lookup reads it.

- **Stored in `i4u_UT_Configuration`** (owner, 12 October 2026): a standalone
  panel source, not tied to a contact. The owner added `Payload`,
  varbinary(MAX), as used in other projects. Proposed row, following the
  existing rows' conventions (Module as the product area, Category as the
  group, PascalCase Code, ValueType describing Value, as the taskbar's
  System / Taskbar rows do):

  | Field | Value |
  |---|---|
  | Module | `System` |
  | Category | `IQA` |
  | Code | `WhereUsedIndex` |
  | Description | `Where each IQA is used: content pages, business object and panel source value lists, communication templates, alerts and Process Automation, and other IQAs. Rebuilt from the IQA designer.` |
  | Entity | blank for now (owner, 12 October 2026) |
  | Value | readable summary, for example `2,034 references from 6 sources, built in 12.4 s` |
  | ValueType | `String` (describes Value) |
  | LastUpdated | build date and time |
  | UpdatedBy | the user who rebuilt it |
  | Payload | gzip-compressed JSON; the JSON carries its own format name and version |
  | CloudtoolzId | left empty: this row is created in iMIS, not CloudToolz |

  CloudToolz normally creates configuration rows itself and syncs them to
  iMIS. The owner does not expect a sync to remove a row created in iMIS, but
  is checking.

- **Rebuild:** anyone who can edit an IQA (owner). The button shows only
  when the designer's own Save is available. The write is still subject to
  the user's access to `i4u_UT_Configuration`.
- **Readers** take the lowest-Ordinal row for the code, as the taskbar does
  for its settings rows. The dev export has 178 keys with more than one row.
- **Payload probe:** `configuration-payload-probe.js` writes one test row
  (`System` / `IQA` / `WhereUsedProbe`), round-trips 1 KB, 150 KB and 1 MB
  compressed payloads byte for byte, then deletes it.
- **Payload probe on dev (12 October 2026): passed.**
  - Create, then updates to 152 KB and 1,035 KB compressed: every read was
    byte-identical and decompressed to the same JSON.
  - Writes took 228–606 ms and reads 134–299 ms (1.4 MB response at 1 MB).
  - The row was deleted, and a read afterwards returned 404.
  - `Payload` comes back as a `System.Byte[]` wrapper, and is absent on rows
    without one.
  - The table's parent type is `Standalone`, with `Ordinal` as the only
    identity.
  - Filtering by Module, Category and Code works (0 rows before, 1 after).
  - **List reads include the payload**, so the index row should always be
    fetched by its code. Anything listing the whole table also downloads the
    index, about 100–200 KB.
  - **`UpdatedBy` is set by iMIS** to the signed-in username (`HUBUSER`), not
    the party ID the probe sent.
  - **`LastUpdated` keeps the value sent but drops the time zone**:
    `2026-10-12T09:44:45.137` for a UTC time. The build time shown to users
    should come from the payload (UTC, with `Z`); LastUpdated should be written
    in site time (ClientContext `appTimeZoneOffset`) to read correctly in iMIS.
- **Each entry** keeps the identifier it was found by (an IQA path, a
  DocumentKey or a DocumentVersionKey) and what holds it: source, item, path or
  key, property and content item. A lookup matches the open IQA's path, its two
  keys and its parent folders, so no IQA catalogue is needed.
- **IQA keys** are told apart from other GUIDs using the keys of the IQAs the
  scan itself reads.
- **Includes ASI system content**, so the opt-in only filters what is shown and
  needs no rebuild.
- **Rebuild** runs the scan (estimated 10–15 s with system content), then
  saves. Last write wins.
- **To prove before relying on it:** the payload probe on dev, the real
  index's compressed size, and that IQA editors can write the row.

## Probe

`where-used-timing-probe.js` (v3) is read-only. Paste it into the DevTools
console of any signed-in iMIS staff page on the dev tenant. To look for a
particular IQA, set this first:

```js
window.WHERE_USED_PROBE_CONFIG = { target: '$/_i4u_/Core/…/Your IQA' };
```

Then:

```js
await window.whereUsedProbe.done;   // the result
window.whereUsedProbe.abort();      // stop a run
copy(JSON.stringify(window.whereUsedProbe.result, null, 2));
```

For each source it reports:

- **Time and size:** wall time, requests, items, MB, and browser processing time.
- **References to the target**, naming the property, and the content item on a
  page. A reference to one of the IQA's folders is reported as "via folder",
  since a Query Menu pointed at a folder uses every IQA in it.
- **The reference contract:** every property holding an IQA path or key, with a
  count, and whether the path resolves to an IQA.
- **The number of distinct IQAs referenced**, which is the size of a full index.

It also reports:

- **The IQA catalogue** (`GET /api/DocumentSummary?DocumentTypeId=IQD`), used to
  name keys and choose IQAs to read.
- **For QueryDefinition:** a sample of 300 IQAs by default, an estimate for all
  of them, and the field shapes of their sources.
- **For REST entities:** the shape of the first item.
- **For content pages:** which published pages the folder-by-folder read does
  not reach, with a sample of their paths. The first run found 213.

Matching covers the path (plain, XML-escaped and URL-encoded), the
DocumentVersionKey and the DocumentKey, as text and as binary .NET Guids inside
IQA blobs.

Optional settings: `mode` (`'lazy'` or `'analysis'`), `lazyParallelSources`
(3), `inspect` (an IQA path whose sources to show first: its QueryDefinition
sources and the paths and keys in its blob; `inspectOnly: true` stops there), `sources`, `iqdMethods` (`['blob']`; add `'queryDefinition'` in analysis
mode), `queryDefinitionSample` (300; `Infinity` reads all),
`queryDefinitionConcurrency` (8), `systemFolders`, `includeSystemFolders` (false), `conGapAnalysis` (true),
`documentStatus` (40), `pageSize` (100) and `concurrency` (4). A source with no
documents at status 40 is read again without the status filter.

Reference extraction is property-name agnostic, following the deployer's
`conPathReferences` (iMIS Content Deployment, `deployer/deployer.html`, WP-R11),
and extends it to XML attributes and JSON entities. The request envelope
matches `src/documents.js` there. The extraction section of the probe is marked
as the part to port.

## Known evidence

- Published content page blobs are base64 UTF-8 XML (CCO research, 22 Sept 2026).
- IQA blobs are .NET BinaryFormatter (NRBF) graphs; the IQA blob parser in
  `API Reference/Tools/iqa-blob-parser` decodes them.
- IQAs never version, so there is one DocumentVersionKey per IQA (3,711 IQDs in
  the BOD import checklist environment).
- iParts bind IQAs mostly by path (`ResultsQueryPath`, `ListSourceQuery`,
  `SourceFolderPathControl`), per the deployer findings.
- A whole-site DocumentSummary scan walked 8,500 documents in about 56 seconds
  (iMIS-REST-API.md). That had no blobs, so it is a lower bound.

## Results: dev tenant, 12 October 2026 (probe v3, lazy mode)

Target `$/_i4u_/SandBox/ContactRecords` (DocumentVersionKey `18a19f51-…`,
DocumentKey `75068202-…`), three sources at a time, system folders skipped.

| Source | Results ready after | Own time | MB | Hits |
|---|---|---|---|---|
| CON | 3.2 s | 2.4 s | 14.6 | List Of Contacts (`SourceFolderPathControl` + `SourceKey`); Sandbox About Me Tab, via its `$/_i4u_/SandBox` folder |
| COM | 4.6 s | 1.4 s | 1.8 | none |
| BOEntityDefinition | 4.9 s | 0.4 s | 0.9 | none; still 100 items in one request |
| BOD | 5.3 s | 4.5 s | 52.7 | none |
| TaskDefinition | 6.0 s | 1.0 s | 0.4 | none |
| IQD blobs | 6.7 s | 6.0 s | 46.6 | `Copy_of_contacts_-_base` |

- **The whole lazy check took 6.7 s**, with the first results at 3.2 s.
- **How an IQA used as a source is stored:** the outer IQA's blob holds the
  source IQA's DocumentKey as text and its DocumentVersionKey as a binary Guid.
  The blob has no `$/` path and no length-prefixed 36-character key string for
  it. The text key sits inside a longer string, still to be identified.
- **QueryDefinition does not name it:** the source is `SR4` with
  `QuerySourceType` 2 and an empty `BusinessControllerName` and Description.
  Business objects are type 1. So the deployer must read the blob to find
  IQA-to-IQA dependencies.
- **BOEntityDefinition is panel sources only** (owner), not every business
  object. There are 169: `Offset=100` returned the remaining 69. Its
  `TotalCount` is the size of the page returned, and `HasNext` is false with
  `NextOffset` 0 even when more follow, so the probe now reads on until a short
  page. Business objects themselves are covered by BOD.

## Results: dev tenant, 12 October 2026 (probe v2)

Target Workbench List, system folders skipped, one source at a time. Total
45.6 s, including 11.7 s for the IQA catalogue.

| Source | Time | Items | MB | Reference contract |
|---|---|---|---|---|
| CON by folder | 3.7 s | 832 | 14.6 | `SourceKey` (key, 423), `SourceFolderPathControl` (path, 404 IQA + 83 folders or missing), `ListSourceQuery` (87), `IQAQueryKey` (key, 50), `IQAQueryPath` (43 + 9 missing), `ChartSourceQuery` (17), `ResultsQueryPath` (6), `OrganizationListWithIdQueryPath` (2), `IQAQueryKeyGuest` (key, 1). Not IQAs: `ReportTemplatePath` (SSRS), `EmailCommunicationTemplatePathControl` and `DefaultCommunicationTemplatePathControl` (COM). |
| IQD blobs by folder | 4.3 s | 2,419 | 46.6 | None found; v2 had no NRBF extraction. |
| IQD QueryDefinition `FindById` | 6.0 s for 300 | 0 | 0.2 | Every call returned no definition. About 49 s for all 2,423 even when empty. |
| BOD paged | 9.1 s | 925 | 52.7 | `msprop:ValueListQuery` (key, 383, 205 IQAs). The slowest source. |
| COM paged | 1.2 s | 78 | 1.8 | IQA paths in generic `<string>` items (194, 44 IQAs). Their own `Path`/`FolderPath` also show up. |
| BOEntityDefinition | 4.8 s | 100 | 0.9 | `Properties.Rule.Query.Criteria.Values` (path, 51). Only the first page was read. |
| TaskDefinition | 0.6 s | 148 | 0.4 | `DataSources.Query.Criteria.Values` (key 113, path 11), `Actions.QueryDocumentID` (key, 2). |

- **The 863 pages the folder read misses** are the skipped system folders plus
  content with no path in the content tree. All 8 pathless pages in the
  sample are ASI admin pages (Customer Configuration, BSA - Manage Reports,
  Document System Browser, User Defined Tables…). No custom page was missed.
- **QueryDefinition is ruled out for scanning**: one request per IQA, against
  4.3 s for every blob.
- **Hits:** only the two known `WorkbenchList` pages.

### v3 changes

- **Lazy mode (default):** what a "Check where used" option would do. No
  catalogue and no gap analysis; three sources at a time; each source's finish
  time is reported as the moment its results could appear.
- **Analysis mode:** v2's one-at-a-time run with the catalogue and contract.
  It also reports which value-list IQAs business objects (BOD) and panel
  sources (BOEntityDefinition) share. They are different objects, so both stay
  in the check; a panel source's generated vBo_ business object may repeat its
  value lists.
- **Fixes:** collections without a usable `TotalCount` follow `HasNext`
  (BOEntityDefinition); generic XML items report their parent (`Queries/string`);
  NRBF strings are read by their length prefix, so IQA blobs contribute paths
  and key strings to the contract; QueryDefinition uses the documented
  `FindByPath` and is off by default.

## Results: dev tenant, 12 October 2026 (probe v1)

Target `$/_i4u_/Core/Membership/Workbenches/Workbench List`, concurrency 4.

| | Paged | Descendants |
|---|---|---|
| Wall time | 18.0 s | 13.1 s |
| Requests | 54 | 72 |
| Documents | 5,369 (1,695 CON, 3,674 IQD) | 5,141 (1,482 CON, 3,659 IQD) |
| Downloaded | 94.0 MB | 93.4 MB |
| Decode + search in the browser | 0.9 s | 0.8 s |
| Full index of every `$/` path on every page | 0.4 s: 1,267 references to 989 IQAs | same |
| Paths on results | No (`Path` is empty) | Yes |

- **Network is the cost.** Browser work is under a second. IQAs are two thirds
  of the bytes (`$/_i4u_` alone is 1,529 IQAs, 28.7 MB, 8.2 s).
- **Both found the same two pages**, each binding the IQA in a `WorkbenchList`
  content item through `SourceFolderPathControl`. Both matched by path and by
  the IQA's DocumentKey as text, so pages also hold the IQA's key: a reference
  survives a rename and a stale path can be detected.
- **No IQA used it as a source.** The binary-Guid needles are still unproven
  against a real positive.
- **Descendants read 213 fewer pages and 15 fewer IQAs.** These are not yet
  identified. They may sit outside the top-level CFL/FOL folders (for example
  under website folders) or be published documents in the Recycle Bin.
- **Census (all versions and statuses):** CON 8,719, BOD 4,409, IQD 3,915,
  NAV 2,188, FOL 1,839, DBS 1,001, BUS 950, CFL 425, APC 276, RCT 245, RDL 157,
  CTY 151, SRT 109, WEB 96, COM 78, LAY 65, POS 29, TCT 10, WFD 8, RFM 4,
  MEP 1, OPP 1.

## Open decisions

- How long a lazy check may take before it needs caching. A check reads every
  source whatever the IQA, so its result could also answer later checks for
  other IQAs.
- QueryDefinition or blobs for IQAs, once v2 has timed both.
- Where the content pages the folder read misses live, and whether a lazy check
  must reach them.
- Still out of reach: Flowz (CloudToolz) and theme script files on disk.
