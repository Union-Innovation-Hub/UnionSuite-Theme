# Unified action conversion checklist

Implemented locally, 16 September 2026. This is a single-pass cutover for the unreleased theme; legacy action aliases are not installed. [Working comparison](Unified-Action-Comparison.html) · [Execution contract](Unified-Action-Execution-Contract.md) · [All current functions](Theme-Button-Function-Inventory.md) · [Helper cleanup](Helper-Cleanup-Status.md).

## Completed in this workspace

- [x] One registry with separate presentation/context/action, dedicated standard/client registration files.
- [x] Heading wrappers, authored controls, menu items and row controls use explicit us-action- classes.
- [x] Required context disables affected instances; competing definitions show warning and block activation.
- [x] Repeated instances have unique DOM IDs; action/record locks prevent overlapping invocations.
- [x] Native popup lifecycle and awaited, origin-scoped report refresh; queued multi-report/custom refresh callbacks.
- [x] Job Edit/Delete ported from the supplied helper logic, using row data and their own native report.
- [x] Add Job/Address ported to native popup definitions; member/header Add Job share one definition.
- [x] Source templates, guide examples and generators converted; documented API and helper audit.
- [x] Automated tests use mocked requests. No live records changed.

## Standard mappings: convert published markup

All new classes below are implemented by Scripts/ActionDefinitions.js. This workspace cannot enumerate or update every published CMS page or IQA SQL expression.

| Previous selector/key | New class | Definition / behavior |
|---|---|---|
| data-us-action=member.email | us-action-member-email | member.email; EmailMemberPopupFn |
| member.sms | us-action-member-sms | member.sms; SMSMemberPopupFn |
| member.add-note | us-action-member-add-note | member.add-note; AddNotePopupFn |
| member.create-case | us-action-member-create-case | member.create-case; native navigate to Create-Case-Staff.aspx |
| member.create-quick-case | us-action-member-create-quick-case | member.create-quick-case; CreateQuickCasePopupFn |
| member.resolve-duplicate | us-action-member-resolve-duplicate | member.resolve-duplicate; ResolveDuplicatePopupFn |
| member.assign-workbench | us-action-member-assign-workbench | member.assign-workbench; AssignWorkbenchToStaffFn |
| member.add-job; us-report-add-job; iqa-add-job | us-action-member-add-job | member.add-job; native popup, own report or explicit unique JobsIQA |
| us-report-button-add-address; iqa-add-address | us-action-member-add-address | member.add-address; native popup, own report or explicit unique AddressIQA |
| us-report-button-manage-bulletin; iqa-manage-bulletin | us-action-home-manage-bulletin | home.manage-bulletin; native new-tab navigation |
| EditJobPopup(this.id) | us-action-jobs-edit | jobs.edit; data-id, data-seqn, data-workplace; own-report close refresh |
| DeleteJobEntry(this.id) | us-action-jobs-delete | jobs.delete; data-id, data-seqn; confirm, awaited DELETE, own-report success refresh |

## Client definitions and published-content work remaining

- [ ] Upload shared CSS/JS, new Scripts/ActionDefinitions.js and client Actions.js together, then include scripts once in order. Existing ZIP archives are not repackaged by this task.
- [ ] Replace published legacy classes/attributes and remove inline/delegated handlers on converted controls. Keep structural menu classes and native filter/search/task-completion classes.
- [ ] Update Jobs IQA SQL output to the row HTML in Theme/UnionSuite-Guides/usage/templates/Jobs-Row-Actions.html. Preserve the existing Delete eligibility rule; emit stored ordinal, not a changing row number; HTML-encode attribute values. Every field referenced in Query Template syntax must be selected.
- [ ] Review all custom registerAction/configureAction/UnionSuiteActions.register callers and replace them with full definitions. Explicit configure is a full override, not a merge.
- [ ] Supply Home and Case task editor/assignee contracts. us-action-home-add-task and us-action-cases-add-task are hooks/examples, not working standard task creators. Keep the preview-only definitions out of production.
- [ ] Adapt the six Case action examples in Client-Actions.example.js to verified functions. Required missing CaseID or helper dependencies disable controls.
- [ ] Supply permission provider/endpoint and exact rules before enabling role gates; verify server-side permissions independently.
- [ ] Verify the address editor's ContentItemKey. Seven member helpers remain dependencies.
- [ ] Audit published callers before deleting old helpers from i4u_functions.js. This task did not edit that external file or the pasted attachment.
- [ ] Validate live iMIS popup Save/Cancel/X, request errors, partial replacement, repeated IQAs and refresh recovery; no local test can confirm server-side integration.

## Removal rule

The registry warns about competing registered definitions. It cannot detect arbitrary duplicate JavaScript declarations elsewhere or recover a file that failed to parse. Remove old bindings from converted controls rather than relying on interception. Keep remaining legacy callers working until they have been individually migrated.
