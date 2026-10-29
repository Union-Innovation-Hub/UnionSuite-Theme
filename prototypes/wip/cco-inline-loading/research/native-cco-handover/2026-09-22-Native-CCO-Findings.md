# Native CCO inline loading — findings

Date: 22 September 2026. Scope: the current native-CCO investigation, with relevant earlier custom-iPart research identified separately. Companion: [handover and next steps](2026-09-22-Native-CCO-Handover.md).

## Outcome and evidence boundaries

The native tab strip can be intercepted and its selected content replaced without navigating the visible page. User-supplied reports show successful insertion through both independent child rendering (Probe A) and normal parent-page rendering (Probe B). The user reports A feels much faster than the existing custom iframe iPart.

Native interactivity remains unresolved. In A, the user confirmed three Notes and Interactions grids have DOM elements but no registered JavaScript control instances. B renders controls within the parent CCO naming scope, making it the preferred next native-control experiment, but B's report does not prove control registration or successful paging, sorting or saving.

Use these evidence labels when continuing:

| Evidence | What it establishes | What it does not establish |
| --- | --- | --- |
| User-supplied live API responses/export | The reported tenant's response contracts and supplied configuration | Independent agent access to iMIS or universal tenant behaviour |
| User-run A/B reports | Returned fragments passed the probe's selection checks and were inserted; listed timings and inventories | Correct visual appearance, control operation, permission parity or production readiness |
| User-run A registry check | `$find` exists but none of the three listed grid instances is registered | Registry state after insertion in B |
| Local tests | 53 intercepted/synthetic Edge scenarios passed for v0.4.0 | Live native ASP.NET/Telerik behaviour |
| Older DLL decompilation/research | Historical native design and leads | Current vendor implementation in every detail |
| Recommendations below | A proposed next investigation | An implemented fix or approved production architecture |

No agent-authenticated live iMIS calls were made in this investigation. Preserve the distinction between supplied live evidence and locally verified code.

## Objective and the two loading approaches

The user wants to retain native iMIS CCO tabs, intercept a tab click, fetch the required content in the background and insert it into the existing CCO container. The shared Query Template refresher demonstrates the desired loading-overlay and in-place replacement behaviour. The page-details probe supplies a path-to-DVK discovery lead.

| Approach | Fetch | Extract | Current observation |
| --- | --- | --- | --- |
| A: child | Individual child `ContentPreview.aspx` by DVK | Children of `#MainPanel .EmptyMasterContentPanel` | Fast insertion; standalone child control IDs; missing native grid instances confirmed |
| B: parent | The normal parent URL with a selected-tab parameter | Children of the selected native `.rmpView` within the same CCO | Successful insertion; parent CCO control-ID scope; native lifecycle still unverified |
| Existing custom iPart | Retained same-origin child iframes | Each frame retains a whole page lifecycle | Separate locally implemented component with its own live acceptance record; not modified by these probes |

Neither A nor B preloads or caches visited injected tabs. They fetch them again on each visit. The initially selected native tab is retained as actual DOM nodes and restored when selected; `refresh()` is required to fetch that initial tab explicitly.

## Current page and key identities

Tenant: `https://uhubemsdev.imiscloud.com`.

Content path: `@/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Individual/Account_Page_Staff`.

Native route observed in the user's tab URLs: `/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Individual/Account_Page_Staff.aspx`.

| Identity | Value | Meaning |
| --- | --- | --- |
| Page name | `Account_Page_Staff` | Parent content page |
| Parent DVK / ContentKey | `bc60a070-2cb9-4bb7-82ba-11b450bf958a` | Containing content document version |
| DocumentId / export DocumentKey | `a62abde1-0b6b-46ed-8728-d6ea61395362` | Document identity, distinct from DVK |
| CCO ContentItemKey | `b511e4d0-55d8-4a38-b20d-f26d82b1af72` | This CCO placement within its containing page |
| ContentTypeKey | `abf56a5e-97e1-4bba-a4ed-e2eb28d355a0` | CCO content type |
| CCO name | `Account page tabs` | Configuration label |
| Actual DOM container | `ste_container_ciAccountpagetabs` | Native rendered iPart owner |
| Verified tab parameter | `b511e4d055d8` | Native parent-page selection parameter for this placement |
| WebsiteKey in captured numeric URLs | `2a17f334-a0cd-44a0-a525-7bc53a11e86e` | Observed website context; preserve the current context |

There is no separate CCO-page ContentKey: the CCO's `ContentKey` is the parent DVK, while `ContentItemKey` identifies the placement. Do not substitute DocumentId, ContentTypeKey, a child DVK, `gHKey` or PageInstanceKey for that pair. Earlier research found copied pages can reuse the same full placement key, so it is not a globally unique page identity.

Do not derive the DOM ID by deleting spaces from the display name. The observed ID includes `ci`. An iPart CSS-class setting can add an intermediate wrapper; the probe identifies the CCO owned by the selected `.ContentItemContainer`, not by a fixed nesting depth.

### Dynamic CCO configuration

The supplied response is `Asi.Web.iParts.Common.ContentCollectionOrganizer.DynamicContentCollectionOrganizerCommon, Asi.Web.iParts`, not the regular CCO configuration shape.

| Field | Value |
| --- | --- |
| `SourceKey` | `a5855360-8ee9-4be8-8cfd-78aca7a92b83` |
| `SourceFolder` | `@/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Individual/Tabs` |
| `DefaultSourceKey` | `2b018016-b481-4fc8-82ee-a98efe006789` |
| `DefaultSourceFolder` | `@/iCore/Contacts/ContactLayouts/Staff/Tabs` |
| `DisplayStyle` | `2` |
| `CssClass` | `tab-content-bg` |

Discovery used the primary folder with `fallbackUsed: false`. The fallback implementation is based on older native research: use the default only when the primary key is unset/zero or the primary lookup returns zero documents. Errors, nested folders and caption mismatches do not trigger fallback. Live native fallback parity has not been verified.

## API findings and corrections

### ContentItem needs both keys on the tested tenant

The initial probe attempted a parent-only ContentItem lookup without verified support. The user got HTTP 404 and challenged the endpoint assumption. The corrected, user-verified request is:

```http
GET /api/ContentItem?ContentKey=bc60a070-2cb9-4bb7-82ba-11b450bf958a&ContentItemKey=b511e4d0-55d8-4a38-b20d-f26d82b1af72
```

It returns one `ContentItemData` under `Items.$values`, with the configuration directly under `Data`. The user reports either key alone returns 404. Parent-only enumeration through ContentItem is not established. Optional `configSource: 'content-item'` remains available, requires the placement key, and is never used as a silent fallback.

The user saw no SSMS Profiler activity while investigating. That does not establish that no SQL was involved, nor prove a particular server cache or `.aspx` implementation. Do not present those hypotheses as confirmed.

### Published Document contains the configuration blob

User-verified request:

```http
GET /api/Document?DocumentVersionID=bc60a070-2cb9-4bb7-82ba-11b450bf958a&DocumentStatusID=40
```

The supplied PagedResult has `Count=1`, `TotalCount=1`, `HasNext=false`, `DocumentTypeId=CON`, `Status=Published`, and the expected DocumentVersionId. `Data` has `$type: System.Byte[], mscorlib` and a Base64 `$value` of 48,968 characters. The supplied response file is 50,809 bytes. This is the input file's size, not a measured compressed network transfer.

The decoded UTF-8 XML contains the parent definition, CCO placement identity and full CCO configuration. Default discovery therefore does not need a DocumentSummary request or ContentItem lookup. `/api/Document/{DocumentId}` is a separate route requiring DocumentId; its identity rule must not be applied to the DVK-filtered collection request above.

XML parsing uses these namespaces:

```text
Content:     http://schemas.imis.com/2008/01/DataContracts/Content
ContentItem: http://schemas.imis.com/2008/01/DataContracts/ContentItem
CCO type:    http://schemas.datacontract.org/2004/07/Asi.Web.iParts.Common.ContentCollectionOrganizer
```

The probe validates one complete published CON record with the requested DVK, typed Base64, UTF-8/XML validity and direct ContentItems entries. It rejects DOCTYPE/ENTITY declarations, wrong namespaces, conflicting identities and ambiguous configurations. It reads scalar fields; it does not execute or insert the configuration XML. Multiple configured CCOs require an explicit placement selection; multiple rendered CCOs require an explicit DOM selector.

### Native page identity: canonical path to DVK

The earlier inspector was a reconnaissance probe, not a finished production script:

`C:/Users/James/OneDrive - Union Innovation Hub/Claude/iMIS Enhanced/probes/content-page-metadata-recon-probe.js`

Its companion `CONTENT-METADATA-RECON.md` records Account Page Staff and Organiser Profile passing through canonical-path `FindByPath`. Its wider cascade also scraped Easy Edit, change-request, script-key and PageMethods clues. Those clues can belong to embedded content; the new CCO resolver deliberately uses the page path rather than the first arbitrary key found in the document.

The user's canonical example is:

```html
<link rel="canonical" href="/UTStaff/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Individual/Account_Page_Staff.aspx?ID=10420">
```

v0.4.0 removes the query and `.aspx`, strips only a matching native `gWebSiteRoot`/application root, preserves `_i4u_`, and requests the resulting `@/...` path:

```json
{
  "$type": "Asi.Soa.Core.DataContracts.GenericExecuteRequest, Asi.Contracts",
  "OperationName": "FindByPath",
  "EntityTypeName": "Document",
  "Parameters": {
    "$type": "System.Collections.ObjectModel.Collection`1[[System.Object, mscorlib]], mscorlib",
    "$values": [{ "$type": "System.String", "$value": "@/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Individual/Account_Page_Staff" }]
  },
  "ParameterTypeName": {
    "$type": "System.Collections.ObjectModel.Collection`1[[System.String, mscorlib]], mscorlib",
    "$values": ["System.String"]
  },
  "UseJson": false
}
```

This is sent to `POST /api/Document/_execute` using the current session and native request-verification token when available. The operation is a document lookup, not a configuration write. The response supplies DocumentVersionId; the subsequent published Document request validates the content definition.

Supported alternatives: current pathname if no canonical link; the single `iUniformKey` on an actual CON `ContentPreview.aspx` URL; explicit `parentDvk` to skip the lookup; explicit `pagePath` to override path derivation. Cross-origin/multiple canonical links, wrong returned paths/types, invalid keys and ambiguous/paged responses stop discovery. It does not repeatedly strip path segments or try unrelated slugs. URL/canonical changes during the identity request invalidate that result.

The canonical example's member value and the later tab URLs' member value differ. Neither is a default: discovery ignores member parameters for identity, while rendering preserves the current visible URL's member/filter context. Do not hard-code the canonical example's ID into a tab request.

Automatic discovery in **this v0.4.0 probe** passed local tests; no separate user-supplied live `keys()` result has yet confirmed it. Earlier A tests supplied the known parent DVK. B does not use this discovery path, so B's success does not verify it.

### Child folder enumeration

The existing lookup is `POST /api/Document/_execute`, `OperationName: FindDocumentsInFolder`, `EntityTypeName: Document`, with typed parameters:

1. Folder key as a string.
2. `System.String[]` containing `CON`, `CFL`.
3. `System.Boolean` with `$value: true` for published-only enumeration.

The probe resolves immediate children, rejects nested folders, excludes explicit unpublished/deleted/unauthorized rows and maps captions uniquely to native tabs. Do not use folder return order as a native tab index. Older native code uses descendant enumeration internally; this probe has not implemented general recursive parity.

## All 15 discovered child pages

These are Account Page Staff mappings from the user's successful discovery output. They are distinct from the older six-tab CCO-Testing page's keys in historical research.

| Native index | Caption | DocumentVersionId / child ContentKey |
| --- | --- | --- |
| 0 | Overview | `86852ceb-7000-4fde-b18d-936a0b61a6d8` |
| 1 | About | `58ce0823-a5c6-4ed9-9380-45a8a14792bd` |
| 2 | Finance | `90ae814b-5b09-42ff-947d-5210d20d728f` |
| 3 | Notes and Interactions | `0494880a-7438-4a32-9e40-118b8b21a5ff` |
| 4 | Preferences | `aac8a91d-4a3e-4ba9-9bca-18fff68399c8` |
| 5 | Security | `5e335e48-ae14-4f3d-9ea7-fc2465068486` |
| 6 | Alerts | `beefa5a3-1629-4fa9-9708-33c71cfe97ea` |
| 7 | Participation | `a19bad5c-9130-4202-bce0-9739d1fdb405` |
| 8 | Cases | `fb6344f1-c9ae-4009-a336-a44bcc750901` |
| 9 | Collective Agreements | `263d232d-23e4-4124-8f61-e0fc5fddc2c5` |
| 10 | Engagement | `0b51acc3-52c5-40a4-a9d4-ef60d7cd4c89` |
| 11 | History | `1e75fa30-1326-46cc-9acb-0829e1186b4c` |
| 12 | Manage Member | `07ea70b1-8dfd-416d-9cb7-a0351f7d9125` |
| 13 | Salary Lookup | `00536499-744f-476a-9aa0-0a3d3b6b6262` |
| 14 | Yabbr Chat | `3881e422-4ae4-49a7-8acb-d58d0dc64665` |

Examples of document name versus displayed caption: `0Overview` → Overview, `1About_Me_Staff` → About, `3Interaction` → Notes and Interactions, `7Preferences` → Preferences. Name-based parent routing uses the displayed caption in the supplied examples.

## Native parent routing

The user captured normal navigation with `b511e4d055d8=3` for Finance, `=4` for Notes and Interactions, and `=5` for Preferences. These match the observed one-based tab positions. The parameter matches this placement's first 12 hyphen-free characters, but that is not a universal guarantee for other CCOs.

The user subsequently confirmed manual navigation using:

```text
b511e4d055d8=Finance
b511e4d055d8=About
b511e4d055d8=Notes+and+Interactions
```

Probe B's current startup recipe builds URLs from the actual native captions using `URLSearchParams.set(parameter, name)`. Spaces are encoded automatically. The recipe preserves member, WebsiteKey and other current query parameters; it adds the observed hash for consistency. Name-based examples supplied by the user omit WebsiteKey/hash, but no general rule about omitting website context was established.

The B report supplied after those instructions verifies requested-tab selection and insertion for Preferences, Finance, About, Overview, Cases and History. It contains no B Notes and Interactions result yet. Every B response must have the same CCO/captions and the requested selected tab before it is inserted. A wrong/default selection is rejected.

## Probe implementation and meanings of its reports

Maintained source is repository-root `prototypes/wip/cco-inline-loading/CCO-Inline-Probes.js`; current version is `0.4.0-probe`. It is a top-frame console experiment with no automatic startup. Both modes:

- Locate the native CCO, its tab strips and multipage owner; support the extra author-class wrapper and avoid confusing nested CCOs with the outer strip.
- Capture tab click/keyboard activation, prevent native postback and update tab presentation/ARIA. They do not synchronize the original Telerik selection model or outer server form state.
- Fetch same-origin HTML using the current session, reject redirects/sign-in responses and bound requests with cancellation/timeouts. A newer selection wins over an older response.
- Keep current content visible under a loading overlay, then insert into `.rmpView.us-cco-inline-probe` inside the existing native multipage.
- Preserve initial DOM nodes for restoration. Check IDs for collisions, reject nested forms and stop if native replacement removes the original CCO.
- Remove fetched script/style/link/base/meta elements, nested frames/objects/embeds and all hidden inputs. Head styles are not imported. Inline event attributes remain but may depend on missing scripts.
- Resolve relative `href`, `src`, `action` and `poster` URLs. CSS URLs and `srcset` are not rewritten.
- Recognize only the supported literal `simplePaginate` settings pattern, ask the existing UnionSuite filters/actions/task rows/banners/action menus to refresh, and optionally call a supplied `initialize(container, context)` callback with cleanup support.

`inserted` means HTML replacement and the configured limited initializers completed. It does not mean native controls were created. `inserted-initialization-incomplete` means insertion occurred but an attempted initializer failed; `failed` means replacement was rejected.

`nativeControls` is a DOM inventory. `componentInitializers` counts script elements matching initializer patterns, not the number of components or executed initializers. `documentScriptsNotReplayed` counts document scripts. `existingComponentIds` is sampled **before** replacement; an empty array is not a post-insertion readiness check. `ms` measures fetch/extraction/attempted initialization, not an independently observed paint or native operation completion.

The public API includes `inspect()`, `discover()`, `keys()`, `startChild()`, `startParent(options)`, `select(index)`, `refresh()`, `refreshQueryTemplate(selector, options)`, `report()`, `stop()` and `currentUrl`. Read results before stopping: `report()` returns the active session's reports, and stop clears that session. Repasting the script requires a reload; restarting modes after stop does not.

## Live results and fixes

### Earlier A report

| Tab | Result | Elapsed |
| --- | --- | --- |
| Overview | Inserted, then pagination-target error | 594 ms |
| Notes and Interactions | Inserted | 966 ms |
| Preferences | Three successful visits | 329, 307, 211 ms |
| Finance | Inserted; one supported pagination initializer | 2,907 ms |
| Security | Rejected as suspected sign-in page | No elapsed value |

Two probe issues were corrected:

1. **Security:** a password input alone was incorrectly treated as a sign-in page. v0.3.1 uses the native `input.SignInButton` marker instead, with independent redirect/shell checks. A later live result inserted Security in 607 ms. No iPart wrappers or recognized native controls were reported there, so correct visual security UI and its operation remain unverified.
2. **Overview:** one missing pagination target aborted independent initialization. v0.3.2 checks whether the target exists in the fetched source, records absent targets as skipped, and continues other pagination/theme/custom initializers. A target present in source but lost during insertion remains an error.

Overview's actual skipped targets are `#fe42a1d4c9` and `#1002b7d8e8`, both `absent-from-response`. They are absent from the full parsed response, not merely removed during transplant. B shows the same absence. The reason iMIS emitted those initializer references is unknown; do not assume empty query results without evidence.

### Latest A and B reports

The preserved [A report](evidence/probe-a-report.json) contains 12 insertions across 10 tabs, all with empty `initializationErrors`. The [B report](evidence/probe-b-report.json) contains six insertions across six tabs, also with empty `initializationErrors`.

| Tab | A elapsed | B elapsed |
| --- | --- | --- |
| Overview | 565, 282 ms | 836 ms |
| About | Initial native content retained; no fetched result supplied | 1,287 ms |
| Finance | 3,199, 2,639 ms | 3,008 ms |
| Notes and Interactions | 988 ms | Not supplied |
| Preferences | 329 ms | 628 ms |
| Security | 607 ms | Not supplied |
| Alerts | 755 ms | Not supplied |
| Participation | 1,727 ms | Not supplied |
| Cases | 462 ms | 600 ms |
| Collective Agreements | 484 ms | Not supplied |
| Engagement | 1,133 ms | Not supplied |
| History | Not supplied | 1,055 ms |
| Manage Member / Salary Lookup / Yabbr Chat | Not supplied | Not supplied |

These are different runs without controlled cold/warm/network/server conditions. They support descriptive comparison, not speed ratios or a production performance promise. Finance overlaps between modes; the other directly comparable B samples are slower.

Preferences, Finance, Overview and Cases have the same iPart wrapper IDs across modes. Native control IDs change with rendering context:

```text
A Finance:
ctl00_TemplateBody_Transactions_radTab_Top
ctl00_TemplateBody_Transactions_radPage

B Finance:
ctl01_TemplateBody_WebPartManager1_gwpciAccountpagetabs_ciAccountpagetabs_Transactions_radTab_Top
ctl01_TemplateBody_WebPartManager1_gwpciAccountpagetabs_ciAccountpagetabs_Transactions_radPage

B Cases (proposed next target):
ctl01_TemplateBody_WebPartManager1_gwpciAccountpagetabs_ciAccountpagetabs_Cases_ResultsGrid_Grid1
```

B inventories 41–49 document scripts, three script blocks matching initializer patterns and nine head styles. The four comparable A tabs have 14–16 fewer document scripts, two matching blocks and eight head styles. None of these counts implies that native initialization ran. Finance's recognized pagination count is one in both modes; it does not prove the nested Telerik tabs work.

### Native grid registration check

The [user-run A check](evidence/probe-a-grid-registry.json) returned `registryAvailable: true` and `registered: false`, `attachedToCurrentElement: false` for:

```text
ctl00_TemplateBody_Interactions_ResultsGrid_Grid1
ctl00_TemplateBody_Calls_ResultsGrid_Grid1
ctl00_TemplateBody_EmailCOmmunications_CommunicationGrid
```

A registered client control is the JavaScript object managing a native grid, located through `$find(id)`; the DOM table alone is not that object. This matches the probe's deliberate omission of native script execution. Basic links can still work, while control-dependent behaviour may not. [Telerik's client-object documentation](https://www.telerik.com/products/aspnet-ajax/documentation/controls/grid/client-side-programming/getting-radgrid-client-object) explains the registry lookup; its [lifecycle documentation](https://www.telerik.com/products/aspnet-ajax/documentation/getting-started/work-with-controls/get-client-side-reference) distinguishes component initialization from ordinary DOM readiness.

No corresponding B post-insertion registry result, native grid operation, edit save or nested-tab interaction has been supplied. B's parent ID scope is useful alignment, not proof of compatible ViewState/event-validation/server controls.

Telemetry CORS messages reference Application Insights `.../v2/track`. The supplied reports do not identify those as the cause of the ContentItem 404, Security heuristic or successful/failed fragment initialization. Keep them separate unless a new causal trace connects them.

## Shared refresh and popup behaviour

The relevant shared source remains `Theme/UnionSuite/zUnionSuite.js`. The user's confirmed Query Template command is:

```js
await UnionSuiteRefresh.queryTemplate('#ste_container_ciTasks');
```

The documented flow keeps old results visible beneath an overlay, fetches current-page HTML with the session/filter context, finds the same iPart by stable container ID, replaces its content and runs supported pagination/UnionSuite initialization. Search/toggle settings are preserved; pagination starts again at its initial page. Arbitrary custom On Render scripts are not automatically replayed; a known initializer can be provided.

The user's popup actions use `refresh: { when: 'close', targets: [{ type: 'origin-report' }] }`. This runs on every close, including cancellation. For a native IQA grid, origin-report invokes its native refresh and waits for the ASP.NET update. The older CDN `refreshQueryTemplate()` is a separate unchanged function.

The inline probe exposes `refreshQueryTemplate(selector)` using `usCcoInline.currentUrl` as the source URL. This matters because the outer visible URL still represents the original native tab. Automatic popup-close origin-report refresh has not been patched to use the injected tab's source; it can target the wrong parent selection. Explicit source-aware refresh, popup opening, Save and Cancel need separate tests. Do not claim a working transplanted grid can be refreshed merely because the shared native refresher exists.

## Existing custom iPart and older native research

The custom iframe iPart remains in `Custom CCO iPart/src/`, with its own build/upload assets and live acceptance record. It has retained frames, configuration, optional preload and popup support; those features were not changed by the inline probes. Earlier documentation contains both local implementation claims and still-open live gates; do not mark the whole package unimplemented or production-verified.

Current `src/frames.js` waits **1,200 ms** before revealing a newly presented visible frame after its document loads and its viewport can be measured. Hidden preloads follow a different ready path. That delay, whole iframe document execution and layout/popup work are plausible contributors to the perceived A speed advantage, not a measured attribution. Removing the delay or changing frame retention was not performed or requested in this experiment.

Historical normal/Dynamic CCO decompilation sets AutoPostBack, registers asynchronous postback triggers and redirects from tab-click handling. Earlier live network observations of POST then GET agree with that broad design. Inactive panels were placeholders; simply hiding/showing existing panels would not load them. A discovery POST once obtained a redirect stub after updating both Telerik client-state fields and an exact server UniqueID; it runs a server lifecycle and is not a metadata-only GET. No supported native AJAX tab-content endpoint has been established.

Older code stores content keys in server ViewState. No live keys were extracted from it. The earlier 528-byte decoded sample appeared opaque/encrypted, but the exact format was not proven. `gHKey` is a navigation-item clue; PageInstanceKey is a runtime container identity, not a verified content resolver.

Earlier same-origin frame trials confirmed some retained search and popup Save-to-Jobs-refresh behaviour. Only specific helpers/cases were exercised; do not transfer that evidence to arbitrary inline controls or all popup types. See the [historical consolidated findings](../custom-iframe-ipart/research/Findings-and-Decisions.md) for the separate CCO-Testing page identities and chronology.

## SQL alternative

The user considered selecting `Blob` and `ContentKeys` from `DocumentMain` by DVK. No current verified `ContentKeys` column contract was established. A whole-blob SQL/IQA response could still incur similar payload and HTTP cost to the existing Document response; direct SQL execution time is not end-to-end browser time.

Older single-document extraction with `asi_getReadOnlyXmlFromBlob` reported 8 ms and three logical reads. That is a historical one-document observation, not a present performance benchmark. The helper sanitizes/changes XML and must not be used to rewrite blobs. Compact extraction of just the necessary identity/config fields might reduce payload, but requires measured endpoint/permission/performance evidence.

Discovery happens when the probe starts. Changing its source to SQL will not directly accelerate each later child/parent tab render. Given successful fast A discovery/insertion, native-control compatibility is the current priority. No new SQL/IQA lookup or deployment was implemented. For any future IQA execution, use `/api/query` with named filters per the repository instructions.

## Validation and remaining questions

The last code validation completed before this documentation-only handover:

```powershell
node --check prototypes/wip/cco-inline-loading/CCO-Inline-Probes.js
node prototypes/wip/cco-inline-loading/test-probes.cjs
```

Result: syntax check passed and **53 synthetic browser scenarios passed**, including 17 native-identity scenarios. Tests use installed Edge via `.tmp-iqa-integration/node_modules/playwright` and intercepted fictional `http://cco.test/**` pages. No live iMIS calls occur. Coverage includes canonical identity/context, explicit overrides, cancellation, rejected/malformed/ambiguous API data, A/B extraction, wrong tab/member rejection, script suppression, restoration, overlapping requests and independent initializer failures.

Open: native control descriptor/dependency creation, component disposal, server event targets and request state, validators/forms, source-aware popup refresh, visual/style parity, unsaved edits, history, retention/preload policy, multiple CCO identity matching, nested folders, intended staff/member/public permissions and route suitability. The handover gives an ordered investigation rather than treating these as implemented.

No production theme code, custom iPart runtime, vendor DLL, Content Type, uploaded ZIP or deployed site was changed by this inline work. No commit or push was made. The WIP probe files were untracked and the research findings file modified at handover preparation; preserve unrelated working-tree changes and obtain explicit approval before committing.
