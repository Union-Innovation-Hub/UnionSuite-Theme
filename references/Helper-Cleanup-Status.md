# Existing helpers and cleanup status

Reviewed 16 September 2026 after implementing unified actions. Scope: current workspace, supplied `i4u_functions` attachment and Asi.js reference. The attachment is reference material; the deployed legacy file and CMS/IQA definitions have not been edited.

## Completed in this change

| Existing implementation | Replacement / cleanup completed | Remaining caller work |
|---|---|---|
| Separate report `registerAction/configureAction` and menu `register` dispatch | One `UnionSuiteActions.define/configure` registry; old execution paths removed. One action supports repeated controls, menus, rows and iPart slots. | Convert old CMS classes/attributes and inline/delegated handlers using the checklist. No runtime aliases are installed. |
| Automatic registrations inside `zUnionSuite.js` | Moved into `Scripts/ActionDefinitions.js`; client extension point is `UnionSuite-Client/Actions.js`. | Install both files in the documented order. |
| Fixed `iqa-*` IDs used as action identity | Explicit action class/key and unique generated control IDs. Per-click record context is validated separately. | Stop looking up generated header actions by their former IDs. |
| Duplicate definitions | Shared conflict detection retained across files; every affected instance is unavailable with a warning. A class claimed by two keys also conflicts. | Use stable owner/source metadata and explicit `configure` for a full override. |
| `EditJobPopup(clicked_id)` | `jobs.edit`: reads the clicked control's party ID, stored ordinal and workplace; safely builds URL, uses native popup adapter, refreshes its own IQA after close. | Replace SQL-generated Edit HTML with `us-action-jobs-edit`; remove its old onclick. |
| `DeleteJobEntry(clicked_id)` | `jobs.delete`: validates row keys, confirms, awaits DELETE with verification token, then refreshes its origin. Separates refresh-only retry from mutation. | Replace Delete HTML with `us-action-jobs-delete`. Preserve the SQL/business rule controlling which rows get Delete. |
| `AddJobPopupFn()` | `member.add-job`: one definition for header/menu, native popup, explicit selected-member context, safe URL parameters; uses origin IQA or an explicit unique `.JobsIQA` target for a menu without origin. | Always opens Select-Workplace; no longer uses `getSystemVersion`. Remove old AddJobPopupFn only after all external callers have been converted. |
| `AddAddressPopup()` | `member.add-address`: native popup and scoped refresh; retains the supplied legitimate ContentItemKey as configurable definition data. | Verify that ContentItemKey on each client; override the full definition if different. Convert other old AddAddressPopup callers before removal. |
| Legacy `RefreshIQA(buttonId)` | New `UnionSuiteRefresh`: native source correlation, one queue, existing-request wait, timeout/error/cancel handling, current target identity and listener cleanup. Multiple native reports refresh sequentially. | Old functions may still call global RefreshIQA; migrate their callers before removing it. |
| Popup forwarding / async lifecycle | Shared adapter forwards all 13 ShowDialog_NoReturnValue arguments, handles before/after close, stale context, busy state and duplicate activation. Custom refresh targets/functions supported. | Native editor saving/cancellation and actual ASP.NET requests still need deployed iMIS verification. |

These replacements do not rewrite the reference attachment. The new theme definitions call the replacement code directly; the old functions can remain solely for unconverted external callers until the single-pass CMS conversion is complete.

## Retained dependencies and what needs cleaning up

| Helper / area | Current status | Cleanup required before deprecating the legacy file |
|---|---|---|
| `getSystemVersion()` | No longer used by `member.add-job`, which always opens Select-Workplace. | Read the version by a verified property name, validate HTTP/body shape, distinguish failure from an actual old version, and cache successful/in-flight lookup. The provided code reads the first property; its named response schema is still needed. |
| `EmailMemberPopupFn`, `SMSMemberPopupFn`, `AddNotePopupFn`, `CreateQuickCasePopupFn`, `ResolveDuplicatePopupFn`, `AssignWorkbenchToStaffFn` | Six standard actions intentionally call these existing site functions. Missing functions/member context disable their controls. Their functions still own popup/refresh behaviour. | Extract real URL/context rules into native popup definitions; remove captured ParentPageInstanceKey/DialogCacheParam values, return actual async outcomes and migrate refresh callbacks. A synchronous helper that opens a popup does not expose its close/save lifecycle to the new engine. |
| `EditAddressPopup`, `DeleteAddressEntry`, `EditContactDetailsPopup` | Definitions exist in the supplied legacy script; corresponding deployed row markup was not supplied. No new standard mappings are invented for them. | Locate SQL/buttons, map address/contact keys explicitly, replace ID lookups and first-report selectors, retain legitimate ContentItemKey configuration, and use awaited request/native refresh paths. |
| `DeleteOrganiserMappingEntry`, `DeleteOrganisationEntry` | Legacy ID-based handlers; not newly registered. Both delete organiser-mapping records. | Preserve the composite party/ordinal key and distinct refresh scopes. Do not label the latter as deletion of the organisation itself. Return the request promise, use queued multi-IQA refresh and separate refresh failure from delete failure. |
| `EditCommPositionPopup`, `DeleteCommitteeEntry`, `NewCommPositionFromMemberPopup` | Legacy committee handlers. | Separate member ID and Activity/committee key; scope refreshes. DeleteCommitteeEntry currently reloads the page and then clicks report refreshes; select one strategy. |
| `MapNewOrganiserFn`, `MapNewWorkbenchFn`, `OrgMapping_AssignStafftoSelectedOrganisationFn`, `OrgMapping_AssignWorkbenchtoSelectedOrganisationFn` | Legacy assignment workflows. | Replace hardcoded/captured popup state and positional selection with declared context. MapNewOrganiserFn also mixes full reload and partial refresh; use one coordinated plan. |
| `RefreshPricing`, `RaiseInvoice`, `MakePayment`, `AddWaiver`, `ReJoinMemberPopupFn`, `SuspendMembership`, `ChangeMembership`, `UpdatePaymentDetailsFn` | Legacy membership/finance functions, not automatically registered by the theme. | Inventory their actual buttons and intended member/account context before porting. Preserve server permissions, validation and operation-specific result contracts. |
| `UpdateContactDetails`, `ResetPassword` | Legacy helpers, not new standard registrations. | Identify actual callers/parameters; retain native security/validation and await meaningful results. |
| `CheckInFn(RefreshPage)`, `ScheduleSiteVisitFn`, `openSiteVisitFn(seqn)` | Legacy visit helpers. | Make organisation/visit identity and refresh policy explicit; preserve workflow-specific inputs. |
| `ShowDialogue_NoReturnValue_Resize(...)` | Legacy resizing wrapper; native action.popup replaces its role for converted controls. | Convert remaining callers in the agreed single pass. Let Asi.js build state/cache flags, preserve sourceObject (argument 13), and remove this wrapper after its last caller is gone. |
| `refreshQueryTemplate(selector,opts)` | Legacy CDN helper remains unchanged. The shared `UnionSuiteRefresh.queryTemplate()` now supplies validated HTML refresh and theme/native pagination initialisation for supported Query Template Displays. | Migrate call sites to the [canonical guide contract](../Theme/UnionSuite-Guides/Usage-Guide.html#query-template-refresh). Verify live editor refresh and any custom initialiser; arbitrary panels are not supported. |
| `reactivateScripts` | Legacy fragment initialisation helper. | Remove blind replay of cloned script tags. Avoid reloading libraries/re-registering actions; use the known component's lifecycle and theme refresh hooks. |
| `currentFilterQuery` | Legacy query-filter helper. | Inspect actual callers and consolidate only after preserving native filter/query state and validated parameter contracts. |
| `showLoading`, `hideLoading`, `ensureRefreshStyles` | Legacy refresh decoration. The new native route already uses shared request-driven overlays. | Remove duplicate loading ownership and inline stylesheet injection from converted routes; restore aria-busy/temporary styles, respect reduced motion. |
| `addPreventDefault` / `.preventDefault` | Legacy delegated/inline support. | Remove old openers on converted controls; do not repeatedly bind broad preventDefault handlers after each refresh. |
| `showSectionFn` | Overlaps the shared section switcher. | Migrate actual callers to the existing section API/classes and remove the duplicate controller. |
| `addUrlParameter`, `ShowFooterDeployInfo` | General helpers, outside the action registry. | Retain only real callers; use URLSearchParams and scope/cache storage safely to website/user. |

## Inputs still needed

- Published CMS classes/Content HTML and IQA SQL expressions to enumerate and convert occurrences stored only in iMIS. The supplied rendered Jobs HTML confirms the data contract, not every published query definition.
- Verified Home/Case task editor URLs/functions and parameter/assignee rules. Preview task actions are examples; no production task creation binding is fabricated.
- Permission endpoint or IQA and response contract. The engine supports async `access.check` and `setAccessResolver`, but cannot invent role membership or permissions. Configured gates fail unavailable without a provider.
- Named system-version response property and any client-specific popup/ContentItemKey differences.

## Removal checklist

1. Install the runtime, standard definitions and client file together; convert the documented author classes and inline handlers.
2. Confirm each remaining helper has a known caller and owner. Move needed business rules into definitions or named client helper functions.
3. Replace native RefreshIQA callers with the scoped queue. Review Query Template/alert fragments separately.
4. Verify real edit/delete/save/cancel behaviour and partial replacements on the site. Local fixtures do not prove server permissions or persistence.
5. Remove a legacy function only when its last external caller is converted. Remove `i4u_functions.js` only when the retained dependencies above have been migrated or deliberately relocated.

Related: [installed definitions and controls](Theme-Button-Function-Inventory.md), [single-pass conversion checklist](Unified-Action-Conversion-Checklist.md), [execution contract](Unified-Action-Execution-Contract.md).
