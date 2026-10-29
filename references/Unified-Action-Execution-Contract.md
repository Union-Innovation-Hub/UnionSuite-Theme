# Unified action execution contract

Implemented locally, 16 September 2026. Live iMIS deployment and published CMS conversion remain separate. The complete callable template and option tables are in [the standalone guide](../Theme/UnionSuite-Guides/Usage-Guide.html#unified-action-route).

## Files and identity

- Engine and native report refresh: zUnionSuite.js, UnionSuiteActions v2 and UnionSuiteRefresh v1.
- Standard registrations: Scripts/ActionDefinitions.js; client registrations: UnionSuite-Client/Actions.js. Load in that order, once.
- One explicit class-to-key mapping, e.g. us-action-jobs-edit → jobs.edit. Put the class on the actual button/link/menu item/row control, or in the iPart CSS class field to request its own heading control.
- iMIS places author classes on an extra div inside ContentItemContainer. Own-panel discovery supports direct/wrapped/empty wrappers, nested iParts and no-styling exclusions. A panel without a heading needs an authored control.
- Many instances of a definition are valid. Generated DOM IDs are unique. Action plus business record key controls busy locking; DOM IDs do not identify business records.
- define(key,definition) registers; configure(key,definition) deliberately replaces all definitions; configure(key,null) clears. Identical owner/source fingerprints are repeat includes. Competing key or class definitions block affected controls with a warning.

## Presentation, context, action

Presentation controls label, icon, tone, order and header/row/menu/default appearances. Context declares scalar fields from trigger/owner/closest data attributes, named query parameters, literal values or custom resolvers, with required/validate rules. IDs stay strings. Unresolved query substitutions are invalid. Missing or invalid required context disables only that instance with an accessible reason.

Action selects function/run, popup/href or navigate/href. It can declare dependencies, eligibility, access, recordKey, confirmation and follow-up refresh. Permission checks can call a configured provider; missing/pending/failed checks do not grant access. This UI gate does not authorize the server operation. No role endpoint or Home task assignee contract has been invented.

## Invocation route

1. Find the clicked control, definition, owner and stable report identity.
2. Resolve/validate context, dependencies, eligibility and access.
3. Claim this action/record across repeated instances.
4. Await configured confirmation; release on cancellation.
5. Recheck current configuration/context before execution, including after asynchronous confirmation and popup URL resolution.
6. Await one operation, or the native popup's close signal.
7. Run and await the configured refresh plan or custom callback.
8. Announce errors/configured success and clear busy locks. A failed refresh after a successful operation offers a refresh-only retry.

Callbacks receive key/actionId, trigger/element, owner/wrapper, placement, origin, immutable context, event and refresh facade; refresh callbacks also receive result. Popup callbacks include dialog/closeEvent. Return promises for real work. A legacy function that opens a popup and returns immediately cannot signal its later close.

## Native popup

The adapter forwards all 13 ShowDialog_NoReturnValue arguments: URL, args, width, height, title, iconUrl, templateType, onBeforeClose, windowName, closeWindowOnCommit, preserveStatefulBusinessContainer, onClose and sourceObject. Numeric pixels or percentages are accepted for dimensions. onBeforeClose must be synchronous; false prevents close. onClose may be asynchronous and runs once. Close includes Cancel and X, not just Save. See the guide for exact option names/defaults. Locks persist until close and refresh complete.

Navigation uses real anchors with prepared validated href values and native modifier/new-tab behavior. Cached asynchronous resolver/access state must be refreshed when external state changes; choose a function/popup workflow for asynchronous per-activation checks.

## Native refresh and custom refresh

origin-report resolves the clicked control's own native report refresh button, re-finds it after partial replacement and excludes nested iParts. Missing/ambiguous targets fail. It never falls back to the first JobsIQA on the page.

UnionSuiteRefresh serializes native requests, waits for an accepted ASP.NET beginRequest from the exact refresh control, observes completion/error, rejects interruption, cancellation/no-start and timeout, and removes its listeners. Default timeout is 30000ms and startTimeout is 1000ms. AbortSignal stops waiting; it does not cancel a server mutation.

Declarative refresh targets: origin-report, iqa (selector, scope, match), custom (run). Selectors default to one match within the origin owner. Explicit scope:'page' and match:'all' request page-wide multiple reports. Native targets are deduplicated and completed progress retained for refresh-only retry. Custom callbacks rerun in full on retry and must contain repeatable view updates.

Custom functions can await refresh.originReport(), refresh.iqa(selector,options), refresh.queryTemplate(selector,options), and their own element/panel updater. Origin refresh now recognises a single Query Template Display and reloads its server-rendered HTML while preserving the panel owner and rebuilding shared controls. The supported contract and limits are maintained in [the usage guide](../Theme/UnionSuite-Guides/Usage-Guide.html#query-template-refresh). Arbitrary alerts and other native panels still require a custom integration; the legacy CDN refreshQueryTemplate function is unchanged.

## Verification and boundaries

Local browser tests cover native source correlation, queued refresh, full iPart replacement, cancellation cleanup, row context, deletion request construction, conflicts, access gates, stale async context, native popup forwarding, busy locks and refresh-only recovery. Network writes are mocked.

Live checks still required: actual Telerik save/cancel/error behavior, native refresh control IDs and request sources, anti-forgery token/API authorization, selected editor version, and client-specific address ContentItemKey. See [conversion checklist](Unified-Action-Conversion-Checklist.md), [inventory](Theme-Button-Function-Inventory.md) and [helper cleanup status](Helper-Cleanup-Status.md).
