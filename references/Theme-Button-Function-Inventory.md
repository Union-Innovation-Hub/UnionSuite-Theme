# Theme buttons and functions

Reviewed 16 September 2026 after the unified action implementation. This inventories the local shared theme, its dedicated standard registrations, client extension file, templates and supplied legacy evidence. It is not an enumeration of scripts/CMS definitions deployed on the live iMIS site.

## 1. Standard definitions — installed by ActionDefinitions.js

Load `zUnionSuite.js`, required business helpers, `Scripts/ActionDefinitions.js`, then client `Actions.js`. There are **15 standard definitions**. The former header/menu Add Job registrations are consolidated. Any definition may be rendered more than once; generated control IDs are unique per instance.

| Key | Author class | Current operation / dependencies |
|---|---|---|
| `member.email` | `us-action-member-email` | Existing `EmailMemberPopupFn()`; selected-member ID required |
| `member.sms` | `us-action-member-sms` | Existing `SMSMemberPopupFn()`; selected-member ID required |
| `member.add-note` | `us-action-member-add-note` | Existing `AddNotePopupFn()`; selected-member ID required |
| `member.create-case` | `us-action-member-create-case` | "Create case": navigates to `/_i4u_/Core/Cases/Create-Case-Staff.aspx?ID=` with the selected member's ID, in the same window. No `CreateCasePopupFn()` dependency. Used on the contact page's Cases report. |
| `member.create-quick-case` | `us-action-member-create-quick-case` | Existing `CreateQuickCasePopupFn()`; selected-member ID required |
| `member.resolve-duplicate` | `us-action-member-resolve-duplicate` | Existing `ResolveDuplicatePopupFn()`; selected-member ID required |
| `member.assign-workbench` | `us-action-member-assign-workbench` | Existing `AssignWorkbenchToStaffFn()`; selected-member ID required |
| `member.add-job` | `us-action-member-add-job` | Native popup to `/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Individual/Popups/Jobs/Select-Workplace.aspx` and scoped refresh. No `getSystemVersion()` dependency. |
| `member.add-address` | `us-action-member-add-address` | Native address popup and scoped refresh. Retains supplied ContentItemKey as definition data; verify per client. |
| `member.add-contact-method` | `us-action-member-add-contact-method` | Native popup to `/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Individual/Popups/Add-Contact-Method.aspx` (70%); refreshes its own report on close, or the single `.ContactDetailsIQA` report from a banner/menu. The `us-contact-methods` section preset applies both classes from one token. |
| `home.manage-bulletin` | `us-action-home-manage-bulletin` | Navigation to `/_i4u_/Core/Staff-Site-Layouts/Home-Dashboard/Staff-Bulletin.aspx`, new tab |
| `jobs.edit` | `us-action-jobs-edit` | Native Edit Job popup from data-id/data-seqn/data-workplace; refreshes its own report on close |
| `jobs.delete` | `us-action-jobs-delete` | Confirmed, awaited DELETE `/api/i4u_UT_Jobs/~<partyId>|<ordinal>` with request verification token; refreshes its own report on success |

All standard definitions use owner `UnionSuite` and source `ActionDefinitions.js:KEY`. The first seven remain wrappers around site-owned helper implementations. Missing helpers/context disable their controls. The current member context is explicitly the page's `ID` query value; override the definition for a different record source. Jobs row actions use their own attributes.

Add Job/Add Address use origin-report refresh where available. A banner/menu without origin explicitly selects one `.JobsIQA` or `.AddressIQA`; missing/multiple matches report a refresh failure. The member banner currently renders Email, SMS, Add Note and Add Job. Full details and retained dependencies are in [Helper cleanup status](Helper-Cleanup-Status.md).

**Home/Case task creation remains a client integration.** `us-action-home-add-task` is used by the templates, but no production editor/assignee contract has been supplied. The reference pages register sample-only behaviour. The empty production client `Actions.js` does not invent task operations or permissions.

## 2. One public action API

| API / option | Purpose |
|---|---|
| `UnionSuiteActions.define(key, definition)` | Register once with className, owner/source and separate presentation/context/action sections |
| `UnionSuiteActions.configure(key, fullDefinition)` | Explicit full replacement; clears known conflicts. Null removes the definition/claims. |
| `getActionStatus(key)`, `listActions()`, `has(key)` | Runtime definition diagnostics; no record data/function bodies in status |
| `refresh()` | Reconcile controls and reevaluate external context/availability |
| `setAccessResolver(fn)` | Client async permission provider used by action.access.permission; no endpoint is supplied by default |
| `action.type:'function'` | Await run(env); optional confirmation and success refresh |
| `action.type:'popup'` | Native ShowDialog_NoReturnValue adapter; async URL, close lifecycle and close refresh |
| `action.type:'navigate'` | Prepared native anchor with safe href, optional _blank and accessible new-tab label |
| `UnionSuiteRefresh` | Native origin/explicit IQA refresh queue and refresh plans; custom callbacks can await their own element updaters |

The retired report `registerAction/configureAction`, menu `register`, report button/link/icon class families and data-us-action/data-case-action dispatch have no runtime aliases. See the [conversion checklist](Unified-Action-Conversion-Checklist.md) for exact replacements. Menu structure/disclosure stays in `UnionSuiteActionMenus`; report layout/filter utilities stay in `UnionSuiteIqaFilters`.

## 3. Context and duplicate handling

An action class belongs on an actual button/link, or in the iPart CSS class field (which inserts an inner wrapper around the output). Native rows supply their stored keys in data attributes. Context is validated on enhancement and before execution; missing values disable only the affected instance.

Repeated controls are valid. Competing definitions for one key, or two keys claiming one action class, show a warning and block activation. Repeating the same key/owner/source retains the original definition without comparing function bodies. Configure is an explicit replacement; a syntax error/global overwritten function cannot be discovered as a registry conflict.

## 4. Case examples — not installed by the standard theme

`Theme/UnionSuite-Guides/usage/examples/Client-Actions.example.js` provides six definitions to adapt:

| Key / class suffix after `us-action-cases-` | Example operation |
|---|---|
| `cases.add-task` / `add-task` | Supplied `CaseActions.addTask(env)` |
| `cases.add-note` / `add-note` | Supplied `CaseActions.addNote(env)` |
| `cases.schedule-meeting` / `schedule-meeting` | Supplied `CaseActions.scheduleMeeting(env)` |
| `cases.edit` / `edit` | Native popup at `/_i4u_/Client/Cases-Enhancements/Edit-Case-Staff.aspx?CaseID=…` |
| `cases.manage-staff` / `manage-staff` | Supplied `CaseActions.manageStaff(env)` |
| `cases.manage-contacts` / `manage-contacts` | Supplied `CaseActions.manageContacts(env)` |

All require explicit CaseID context. The named CaseActions functions are integration requirements, not verified installed functions. Missing dependencies disable the control. The case banner's 11 disabled placeholders remain unconnected until each wanted workflow has a verified definition; their labels alone do not establish functions.


## 5. Report, task, tab and menu UI controls

These are implemented UI behaviours, not configurable business-action registrations. Internal names below identify their source implementation, not global functions to call.

| Control / selector | Function or behaviour | Persistence / boundary |
|---|---|---|
| Native report Filters `.us-iqa-filter-toggle` | Toggles state → `render(entry,true)` and `saveState(entry)` | Discloses native filters; does not execute a query |
| Query Template search disclosure `.us-iqa-filter-toggle` | Toggles disclosure → `render(search,true)` | Search input calls `filterQueryResults()` on currently rendered results |
| Show completed `.us-task-completed-toggle` | `filterQueryResults()` plus `revealCompletedRows()` when turning on | Only rendered tasks; reveal animation respects reduced motion |
| Task tick `[data-us-task-toggle]` | Internal async `toggle(root)` → `celebrate()` and optional slide/collapse | Local state only; no completion API save is connected |
| Expand/Restore `.us-iqa-expand-toggle` | `openExpanded()` / `closeExpanded()` | Existing report control and native grid retained; `restoreReport()` is the public close helper |
| Native export dropdown | Original iMIS export handler; `syncExport()` relocates it | No replacement export implementation |
| Actions menu / submenu toggles | Internal `setOpen()` | Disclosure, positioning, keyboard and focus only |
| Banner action-menu summary | Native details plus shared banner/menu disclosure | Item commands require registration or an actual link |
| Section tab `button[data-us-tab]` | `UnionSuiteSections.select(group,key)` / internal `select()` | Switches matching panels, preserves retained content |
| Native vertical-tab “All sections” options | Existing `.rtsLink` → `tab.click()` | Native Telerik tab lifecycle stays in charge |
| IQA column resize handle | Internal pointer/keyboard resize handlers | Column geometry only; click does not invoke sorting |
| Needs Attention Retry `.us-attention__retry` | Internal `load(state)`; public `UnionSuiteAttention.reload(root)` | Reloads configured tracker queries |
| Needs Attention linked card | Native `href`, with `showOpening()` / `runCard()` feedback | Opens the query's supplied Link; no new business function |
| Membership figures Retry `.us-membership__retry` | Internal `reload(root)` | Invalidates/reloads relevant cached figures |
| Conflicted registered action | Shared `announce()` | Accessible status; no registry business function runs |
| Copy `button.us-copy`, `button.us-banner__copy` | Delegated clipboard handler in `UnionSuiteCopy` | `data-us-copy-target` points to a unique element ID; uses its text/value, animated tick/target flash and accessible status |
| Banner Read more / Show less `.us-banner__description-toggle` | Generated by `UnionSuiteBannerDetails.refresh()`; toggles the local description state | Full description retained; configurable excerpt length, focus and reduced-motion support |

Task celebration uses confetti normally, moon/stars in dark mode, and bats on 31 October (local browser date, overriding appearance). When completed tasks are shown, completion keeps the row. Otherwise it celebrates, waits 100ms, slides away and collapses. None of this saves a task to iMIS.

## 6. Taskbar controls

Source: `Theme/UnionSuite/Scripts/UnionSuiteTaskbar.js`.

| Button/link | Function / destination |
|---|---|
| Dark mode toggle `[data-taskbar-action="toggle-dark-mode"]` | `UnionSuiteAppearance.toggle()` |
| Close results `[data-taskbar-action="close-results"]` | `hideDropdown()` and returns focus to search |
| Full search `[data-taskbar-action="full-search"]` | Native anchor to configured `fullSearchUrl`, default `/_i4u_/Core/Staff-Site-Layouts/Admin/Directory.aspx`; click adds temporary busy feedback |
| Search-history term | `resetHistoryWindow()` then `scheduleSearch(term)` |
| Remove search-history entry `.us-taskbar__history-remove` | Removes that term, `storeSearchHistory()`, `showHint()` |
| Clear history | Clears saved terms, `resetHistoryWindow()`, `storeSearchHistory()`, `showHint()` |
| Search result | Native record link from `recordUrl(id)` → `/Party.aspx?ID=…`; `confirmHistorySearch(term)` records the search |
| Recent record | Captured native recent-item link |
| Pip | First click `wave()`; second `react('is-hopping',850)`; third `leave(true)` |
| Manage IQAs | Native link `/AsiCommon/Controls/IQA/Default.aspx` |
| Manage Content | Native link `/iMIS/ContentManagement/ContentDesigner.aspx` |
| Manage Themes | Native ObjectBrowser link to the `$/ContentManagement/DefaultSystem/Themes` folder, with theme filters |
| About iMIS | Native link `/iMIS/Setup/AboutImis.aspx` |

Management paths and Full search resolve beneath the current `websiteRoot`. These links retain normal iMIS permissions. Taskbar buttons are not registered business actions.

## 7. Native controls that the theme styles or decorates

The theme does not supply their business functions. Their server-generated handlers remain authoritative.

| Controls | Theme involvement / native behaviour |
|---|---|
| Panel editor Add, Edit, Delete, Settings | `UnionSuiteDataPanels.refresh()` marks original controls with `data-us-panel-action`; existing native popup/postback remains |
| IQA Find, query selection, sorting, paging, refresh, row commands, detail expansion | Native iMIS/Telerik handlers retained; shared discovery, formatting and busy indicators only |
| Cart, Easy Edit, On behalf of, account/transaction-date controls | Native links/pickers/postbacks; `UnionSuiteUtilityNav` adds applicable feedback |
| Navigation expand/collapse `.navbar-toggle.primary-nav-toggle` | Native handler changes `.wrapper.nav-expanded`; theme CSS changes logo alignment |
| Sign In, native Save, wizard Next/Previous/Finish, cache purge, execute task, import/upload | Existing native validation/request; the corresponding `UnionSuite*Busy` modules add feedback |
| File Select/Remove, native calendar controls, dropdowns | Existing browser/Telerik controls; theme styling and supported drag/drop assistance |
| Native popup Close/Maximise/Restore | Asi.js/Telerik controls; theme appearance only |

`UnionSuiteButtons.run(button, action, label)` and `UnionSuiteBusy.show/clear` are available feedback helpers, not auto-bound editors. `UnionSuiteIqaRefresh` is a native-refresh overlay module, **not** the legacy `RefreshIQA()` function.

## 8. Supplied legacy functions still outside the theme

The attached functions file defines the names below. The shared theme does not automatically bind these remaining functions to buttons, so exact deployed button IDs cannot be inferred from the definitions alone. Do not treat this list as installed mappings.

| Area | Additional legacy function names |
|---|---|
| Membership / finance | `RefreshPricing`, `RaiseInvoice`, `MakePayment`, `AddWaiver`, `ReJoinMemberPopupFn`, `SuspendMembership`, `ChangeMembership`, `UpdatePaymentDetailsFn` |
| Record editing | `EditJobPopup(clicked_id)`, `DeleteJobEntry(clicked_id)`, `EditAddressPopup(clicked_id)`, `DeleteAddressEntry(clicked_id)`, `EditContactDetailsPopup(clicked_id)`, `UpdateContactDetails`, `ResetPassword` |
| Assignments | `MapNewOrganiserFn`, `MapNewWorkbenchFn`, `DeleteOrganiserMappingEntry(clicked_id)`, `DeleteOrganisationEntry(clicked_id)`, `OrgMapping_AssignStafftoSelectedOrganisationFn`, `OrgMapping_AssignWorkbenchtoSelectedOrganisationFn` |
| Committees | `NewCommPositionFromMemberPopup`, `EditCommPositionPopup(clicked_id)`, `DeleteCommitteeEntry(clicked_id)` |
| Visits | `CheckInFn(RefreshPage)`, `ScheduleSiteVisitFn`, `openSiteVisitFn(seqn)` |
| Supporting helpers | `getSystemVersion`, `RefreshIQA(buttonId)`, `ShowDialogue_NoReturnValue_Resize(...)`, `refreshQueryTemplate(selector,opts)`, `currentFilterQuery`, `reactivateScripts`, `showLoading`, `hideLoading`, `ensureRefreshStyles`, `addUrlParameter`, `showSectionFn`, `addPreventDefault`, `ShowFooterDeployInfo` |

The explicit legacy click bindings visible in that attachment only prevent default for `.preventDefault` and `#MemberQuickActions .ButtonItem`; they do not establish the full business-function mapping. Inline/server-generated handlers may exist elsewhere. The separately supplied Jobs HTML confirms `onclick="EditJobPopup(this.id)"` on `JobEntry_22` (`data-seqn`, `data-id`, `data-workplace`) and `onclick="DeleteJobEntry(this.id)"` on `JobsEntry_22` (`data-seqn`, `data-id`). These are row-generated bindings, not registrations in the shared theme. Both functions currently refresh the first `.JobsIQA` in the document; conversion should scope refresh to the originating report.

The global `RefreshIQA`, `refreshQueryTemplate` and resizing-wrapper implementations remain in the legacy attachment. Converted native-refresh callers now use `UnionSuiteRefresh`; fragment refresh is not yet promoted. See [Popup action review](Popup-Action-Review.md) for their limitations and refresh recipes. Seven member operations and getSystemVersion remain dependencies. Add Job, Add Address and the two Jobs row actions now use native/shared implementations. See [Helper cleanup status](Helper-Cleanup-Status.md).

## Deployment and diagnostics

Upload updated `zUnionSuite.js` and `zUnionSuite.css` together, plus `Scripts/ActionDefinitions.js` and client `Actions.js`. Load the shared theme before client registration scripts. Keep the existing native and business-function dependencies until each implementation is migrated. Remove old inline/delegated openers for actions you convert.

```js
console.table(UnionSuiteActions.listActions());
console.log(UnionSuiteActions.getActionStatus('member.add-job'));
```

The guard detects competing registered definitions in this document. It cannot detect overwritten arbitrary global functions, code that fails to parse, or business actions attached by unrelated native scripts. See the usage guide's **Prevent competing button definitions** section for repeat-include rules, explicit resolution, accessibility and events.
