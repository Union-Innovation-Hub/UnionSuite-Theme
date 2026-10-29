# Popup actions and refresh helpers

## Current implementation

Use UnionSuiteActions.define with action.type=popup and action.refresh. The old configureAction/target=popup API below is retired. See [the callable template and options](../Theme/UnionSuite-Guides/Usage-Guide.html#popup-actions), [execution contract](Unified-Action-Execution-Contract.md), and [helper cleanup status](Helper-Cleanup-Status.md). Native origin-report and queued multi-IQA refresh are implemented; arbitrary Query Template fragment reload remains custom.

## Archived review — superseded API examples

The following records the original supplied-helper review. It is retained as evidence; do not copy its registration API or use its historical “implemented” labels as current installation instructions.

# Popup actions and refresh helpers

## Implemented now

Duplicate-action detection is now implemented for report actions and Actions menus. Use `registerAction(id, {...definition, owner, source})` for normal declarations; reserve `configureAction` for deliberate full replacement. Conflicts show a warning on the associated control and block its action. See the usage guide's `#action-conflicts` section and [current function inventory](Theme-Button-Function-Inventory.md).

`UnionSuiteIqaFilters.configureAction()` supports `target: 'popup'`. It calls the installed `ShowDialog_NoReturnValue` in Asi.js. Existing button, link and icon classes continue to choose appearance. An action with popup behaviour is rendered as a real `button`, with `aria-haspopup="dialog"`, rather than a link targeting a browser window named “popup”.

Load Asi.js and the updated `zUnionSuite.js` before your client action registrations. Keep existing refresh helpers loaded for recipes that call them. This change does not migrate or remove `i4u_functions`, change task assignment rules, or save records.

### Example: add an interaction, refresh its IQA and recent-note cards

Put `us-report-icon-add-interaction` in the Query Menu or Query Template Display iPart **CSS class** field. Keep its Title populated. Keep `NotesIQA` on the specific report to refresh and `QueryTemplate RecentNotes` on the relevant Query Template Display iPart. No action HTML belongs in the repeating result template.

```js
UnionSuiteIqaFilters.registerAction('iqa-add-interaction', {
  owner: 'client.interactions',
  source: 'InteractionActions.js:add-interaction',
  label: 'Add interaction',
  target: 'popup',
  href: function () {
    // This reproduces the selected-member context of AddNotePopupFn.
    // It is NOT the logged-in user's ID or a case ID.
    const id = FindURLParameter('ID');
    if (!id) throw new Error('Select a member first.');
    const url = new URL(
      '/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Staff/OneOnOneCallNew.aspx',
      location.origin
    );
    url.searchParams.set('ID', id);
    return url.href;
  },
  popup: {
    title: 'Add interaction',
    width: '90%',
    height: '90%',
    fullscreenBelow: 768,
    onClose: async function () {
      const button = document.querySelector(
        '.NotesIQA input[id*="ResultsGrid_RefreshButton"]'
      );
      if (!button) throw new Error('The notes refresh button was not found.');
      await RefreshIQA(button.id);
      await refreshQueryTemplate('.QueryTemplate.RecentNotes');
      UnionSuiteIqaFilters.refresh();
      window.UnionSuiteTaskRows?.refresh();
    },
    onError: function ({ error, phase }) {
      // Replace with your application's visible notification if available.
      alert('Could not finish this action (' + phase + '): ' + error.message);
    }
  }
});
```

This recipe uses the existing helpers, including their limitations below. It refreshes on **every actual close**, including Cancel and the close button. A successful close is not proof of a successful save. Only gate on “saved” after the specific editor has a verified result contract.

### Full options

Top-level options remain `label`, `icon`, `disabled`, `href` and `target`. For `target: 'popup'`, `href` may be an HTTP(S)/relative URL string or a function returning that string (a Promise is supported). The function receives `{actionId, wrapper, trigger, event}`. It runs when clicked so it can read current record context. The action is marked busy while its URL is resolved; duplicate clicks during that resolution are ignored. The result is discarded if its control is removed, its definition changes, or its iPart opts out meanwhile.

Do not combine a popup target with `onClick` or an existing delegated opener for the same action. The theme opens it automatically. A combined `onClick` configuration is rejected. Ordinary link/button actions retain their existing `onClick` behaviour.

| `popup` option | Default | Purpose |
|---|---|---|
| `title` | Action label, then suffix | Dialog header/title. |
| `width` | `'90%'` | Positive pixel number, e.g. `900`, a pixel string such as `'900px'`, or whole percentage from `'1%'` to `'100%'`. Pixel strings are converted to numbers for Asi.js. |
| `height` | `'90%'` | Same formats as width. Asi.js constrains dimensions to the viewport. |
| `fullscreenBelow` | Off | Viewport width in pixels below which the URL gets `Mode=Maximized`. Use `768` for your existing mobile convention; `0` disables it. |
| `args` | `null` | Native dialog argument object; forwarded as argument 2. |
| `iconUrl` | `null` | Native argument 6. The supplied Asi.js stores it, but `SetupRadWindow` does not explicitly apply it; do not rely on it for a visible icon. |
| `templateType` | `'E'` | Native argument 7. Asi.js adds TemplateType only if absent from the URL. |
| `windowName` | `'UnionSuite-' + actionId` | Native window identity. Distinct actions have distinct names. Repeated opening of the same action uses the native window lifecycle. |
| `closeWindowOnCommit` | `false` | Native flag. It adds the query parameter when true; whether the editor honours it belongs to that editor. |
| `preserveStatefulBusinessContainer` | `false` | Native flag. When enabled, Asi.js can add the current `PageInstanceKey` as `ParentPageInstanceKey`. Do not copy a captured page-instance GUID into templates. |
| `sourceObject` | Trigger button | Native argument 13; forwarded as the dialog's source object. |
| `onBeforeClose` | None | Synchronous callback. Receives native dialog and close event through the context described below. Use `closeEvent.set_cancel(true)` to veto closing when supported. Do not perform async refreshes here. |
| `onClose` | None | Callback after actual close; may be async. Rejections are caught. Called once per opening, after the synchronous native close handlers. |
| `onError` | None | Receives the open/callback error and phase. Use for a visible application notification. |

`onBeforeClose` and `onClose` receive `{actionId, wrapper, trigger, event, dialog, closeEvent}`. `event` is the original click; use the retained `trigger` rather than `event.currentTarget` after asynchronous work. The wrapper/trigger may have been detached by a native partial update. Resolve refresh targets afresh inside `onClose` rather than capturing elements before opening. The native `dialog` and `closeEvent` are passed through without inventing a saved/cancelled value.

Errors go to the console and the bubbling `us:action-error` event, plus `popup.onError` when provided. Error context includes `error` and `phase` (`open`, `beforeClose`, or `close`). The default is not a visible error banner. Configuration is replaced, not merged, on each `configureAction` call; invalid options do not replace the previous definition. `configureAction(id, null)` restores the default control.

URLs containing fragments are rejected for popup actions because this native helper appends popup parameters as strings. Normal browser links remain unaffected. Let Asi.js add `TemplateType`, `IsPopup`, cache parameters and state flags; pass real editor inputs through `URL.searchParams`.

## Refresh recipes

### One IQA

```js
onClose: async function () {
  const button = document.querySelector('.NotesIQA input[id*="ResultsGrid_RefreshButton"]');
  if (!button) throw new Error('Notes IQA refresh is unavailable.');
  await RefreshIQA(button.id);
}
```

Use a unique per-iPart class. When there are multiple matches, decide explicitly whether to refresh one or all; `.first()` can conceal an ambiguous selector.

### Several IQAs, sequentially

```js
onClose: async function () {
  for (const selector of [
    '.AssignedRecordsIQA',
    '.AssignedOrganiserIQA',
    '.AssignedTeamIQA'
  ]) {
    // Find each button after the previous update; that update may replace it.
    const button = document.querySelector(selector + ' input[id*="ResultsGrid_RefreshButton"]');
    if (!button) throw new Error('Missing refresh control: ' + selector);
    await RefreshIQA(button.id);
  }
}
```

Avoid `Promise.all` for ASP.NET async postbacks. The current helper supports this sequence when no unrelated postback overlaps, but needs the hardening below before becoming a reliable shared queue.

### A specific native panel or element

Use its supported refresh control/API from `onClose`. A panel and a DOM element are not inherently refreshable: the theme cannot infer which server control should run from a CSS selector alone. For example, if a panel exposes a dedicated native refresh button that performs an ASP.NET async postback, pass that button's ID to the same postback helper. Otherwise provide a component-specific callback.

Do not fetch the page and replace arbitrary PanelEditor, CCO, form or Telerik markup. Its server control IDs, client components, validation and hidden fields may require the native partial-update lifecycle.

### Query Template Display / simple alert content

```js
onClose: async function () {
  await refreshQueryTemplate('.QueryTemplate.RecentNotes');
  UnionSuiteIqaFilters.refresh();
  window.UnionSuiteTaskRows?.refresh();
}
```

That fetches the **full page response**, then replaces the selected fragment in the current document; it is not a browser page reload. Use only for fragments whose server-rendered output and initialisation are understood. Generic alerts need their own verification; `refreshQueryTemplate` is not a universal native iPart reload API.

For several page fragments, a future shared helper should fetch once and reconcile all requested targets. That helper is proposed, not implemented by this popup change.

## Improvements before migrating i4u_functions

### Priority 1 — refresh correctness

1. **RefreshIQA can hang or resolve on the wrong request** (supplied file lines 58–74). It listens for any `endRequest`, does not verify the element, cannot distinguish a cancelled/full postback, and has no timeout or error result. Missing elements leave a subscribed handler. Add a shared sequential queue, wait for existing requests to finish, correlate `beginRequest`/`get_postBackElement()` with the requested control, check the corresponding end-request error, and clean up on success/error/timeout. A timeout reports uncertainty; it must not automatically retry a possibly completed server operation. Document that only known async-postback refresh controls are supported.
2. **Overlapping fragment fetches can overwrite newer results** (lines 97–122). Add an abort/sequence guard per refresh target and reject stale responses. Snapshot targets only for identity, then confirm each is still connected before updating. Concurrent refreshes must not remove each other's loading overlays.
3. **Matching fragments by array position is fragile.** Pair by stable iPart/container identity and reject missing/duplicate mappings before mutating any target. Do not assume result ordering is unchanged.
4. **Blind script replay is too broad** (lines 133–140). Inserting cloned scripts can duplicate handlers/libraries and does not await external dependencies in order. Use a known, explicit Query Template pagination initialiser and the shared theme refresh hooks. Native ASP.NET/Telerik component disposal and registration need separate treatment; copying markup is insufficient.
5. **Refresh errors are often logged and returned as success.** Reject non-OK, redirected-login, wrong-page and missing-fragment results. Keep the previous content and show a recoverable error. Preserve search, completed-filter, focus and scroll state where appropriate. An awaited callback must be able to distinguish success from failure.

### Priority 2 — popup and page context

6. **Keep close and save distinct.** The provided Asi.js binds argument 8 to `beforeClose` and argument 12 to `close`. Neither provides a universal successful-save signal. Use each editor's verified result contract if refreshing only after save is required.
7. **Remove captured `ParentPageInstanceKey` and `DialogCacheParam` values.** Examples such as EmailMemberPopupFn, ResolveDuplicatePopupFn, EditAddressPopup and MapNewWorkbenchFn contain page-specific values. Let the native preservation/cache logic supply current values. Retain legitimate configured ContentItemKey/PanelDefinitionId values, but move client-specific ones to configuration.
8. **Build URLs with URLSearchParams and validate context.** Current string concatenation can mishandle `&`, spaces or missing values. Keep logged-in user, selected member ID and current case ID as separate resolvers. No task-editor URL or task/case parameter contract was supplied, so those bindings should be verified before registering home/case task actions.
9. **Choose either full reload or partial refresh.** MapNewOrganiserFn and DeleteCommitteeEntry invoke reload and then try to click refresh controls. Those clicks are redundant or can race navigation. Pick one refresh plan per action.

### Priority 3 — common utility cleanup

10. Replace `ShowDialogue_NoReturnValue_Resize`'s string-based query appending with the native popup adapter's URL handling. Its spelling differs from `ShowDialog`; locate and convert its callers in the agreed single pass before release. No permanent compatibility alias is planned. Note that the supplied native wrapper accepts 13 parameters: the old resize wrapper does not forward argument 13 (`sourceObject`).
11. Consolidate request-token lookup, HTTP error handling and response unwrapping. `getSystemVersion` assumes the first property is the version and returns `0` for all failures, silently selecting an old URL. Resolve the named property, distinguish failure from an actual version, and cache a successful value/in-flight lookup.
12. `addPreventDefault()` rebinds a handler every time it runs. Use one delegated listener with a stable scope or a namespaced jQuery off/on pair. Prefer the theme action controller over broad `.preventDefault` behaviour.
13. `showSectionFn` overlaps the shared section-switcher feature. Migrate to the existing supported classes/state handling rather than maintaining two section controllers. Guard sessionStorage access; avoid a cache key shared across unrelated websites/users in footer helpers.
14. Move refresh overlay CSS to shared component CSS/tokens, use `aria-busy` and reduced-motion behaviour, and restore any temporary inline positioning. Do not let generic `showLoading`, `hideLoading` and `reactivateScripts` names become permanent globals.

## Suggested migration order

1. Use the implemented popup target for new action definitions. Existing helpers continue to run from `onClose`.
2. Harden and test a queued native-refresh helper, then migrate IQA refresh calls.
3. Add a narrowly supported fragment-refresh service for verified Query Template/alert structures; do not generalise native panel replacement prematurely.
4. Move record URL/context recipes into dedicated action definitions and convert their callers in one pass before release. See the [unified execution contract](Unified-Action-Execution-Contract.md) for the agreed file split and custom refresh hooks. The new runtime/file structure is not yet implemented.
5. Deprecate the old file only after its callers and business operations are mapped and checked in iMIS.

### Evidence and limits

Reviewed the supplied custom file and `C:/Users/James/OneDrive - Union Innovation Hub/Claude/API Reference/Asi.js`, specifically `ShowDialog_NoReturnValue`, `ShowDialog` and `SetupRadWindow`. The no-return wrapper forwards 13 arguments and returns no dialog object. Native `ShowDialog` has two further parameters that this wrapper does not forward; modal/report-detection options are deliberately not exposed here. Local tests exercise the action adapter and callback contract; real editor saving, native focus restoration and refresh requests still require deployed iMIS verification.
