# Resolve case form (WIP)

The case's Resolve case and Edit resolution form (owner, 16 November 2026).
One form does both: saving it records the outcome and closes the case (C16
in `prototypes/wip/case-page/README.md`).

**Status:** the mock-up is approved (owner, 16 November 2026). The
BeyondFormz form and the two flows are built, ready to import; not yet
imported or run on iMIS.

| Path | What |
| --- | --- |
| `resolve-case-form.html` | The approved mock-up (`?mode=resolve|edit&tasks=open|none`) |
| `beyondformz/build-form.cjs` | Builds the BeyondFormz import from a fresh export of the form |
| `beyondformz/form-inject.js` | The form's JavaScript to inject: the behaviour below |
| `beyondformz/prefill.js`, `resolve-button.js` | The prefill's and the button's JavaScript (they hand the answers to the injected script) |
| `beyondformz/preview.html`, `preview.js` | A stand-in for BeyondFormz's renderer (from the Create case form's) that runs the built export's scripts on sample answers. Not BeyondFormz: check the real form after importing |
| `flows/build-flows.cjs` | Updates the two Resolve case flows in a fresh Flowz export (below) |

## The form

| Label | Field | Rule |
| --- | --- | --- |
| Outcome type | `ResolutionType` | Required; the IQA `Case Value List - Outcome Type`; starts on "Choose the outcome" |
| Closed date | `ResolutionDate` | Required; today, with Today and Yesterday; not in the future or before the case opened |
| Amount awarded | `ResolutionAmount` | Optional, dollars (`$` in the field), cents allowed |
| Time awarded | `ResolutionWeeks` | Optional, weeks (`weeks` in the field), part weeks allowed |
| Outcome | `Resolution` | Optional, text |

- Amount and time are separate, so a case can win both (owner, 16 November
  2026: weeks is enough, no unit field). They are text fields now, not
  number: they start empty instead of `0.000000000000` and accept "$4,250"
  or "2 weeks". The form sends plain numbers (`4250`, `2`), and blank for
  nothing awarded.
- The FormFields rules the prefill returns (`ReqVals`) still apply: Visible
  0 hides a field, IsRequired requires it, Editable 0 disables it. A field
  without a rule stays as built.
- **Open tasks** are said in the form ("2 tasks are still open. They stay
  open after the case closes.") instead of a browser confirm before it
  opens. The theme passes the count as `OpenTasks`.
- **Edit resolution** (`Edit=true`) is the same form, filled in, with who
  resolved it and when, and **Save changes**.
- The form checks itself before BeyondFormz sends anything. On success the
  popup closes with `{saved: true, Ordinal}` (the case page reloads after
  resolving; the panels after editing); Cancel or `Esc` closes it with
  `{cancel: true}` (nothing reloads). `Ctrl+Enter` saves.
- Removed from the old form: the Save button that ran `Form/Validation`
  and its hidden submit button. The form's own check replaces the
  validation flow; `Cases/US/Resolve` should still refuse bad input.

## Build and import

```bash
node prototypes/wip/resolve-case-form/beyondformz/build-form.cjs <BeyondFormz export.json>
```

It writes `dist/Imports/Resolve-Case-Form.json` at the project root (ignored by Git).
Import it over the form in BeyondFormz. The build keeps the export's form
record, so take a fresh export first if the form changed since.

To try it first: build, start the `static-node` preview and open
`/prototypes/wip/resolve-case-form/beyondformz/preview.html`
(`?OpenTasks=2`, `?Edit=true`, `?prefill=full|rules`, `?save=ok|fail`).

## The flows

The form calls `Cases/US/Resolve/Prefill` and `Cases/US/Resolve` (the
owner's endpoints, 16 November 2026; the paths must match exactly).

```bash
node prototypes/wip/resolve-case-form/flows/build-flows.cjs <Flowz export.json>
```

It reads a Flowz export holding the two flows (any export of them, before
or after a rebuild) and keeps their definitionId and versionId (importing
overwrites them). The prefill keeps its steps; the resolve flow is built
whole.
It writes `dist/Imports/Resolve-Case-Flows.json` (ignored by Git), checked
with the Flowz builder's validator.

- **`US Case Form Prefill: Resolve Case`** (`/Cases/US/Resolve/Prefill`).
  Its answer: `ReqVals` as before; `DateOpened` from the case's
  `FirstCreatedOn` and `MemberName` (from `PrimaryContactName`, `MemberName`
  or `FullName`), each when Get Case Details returns it; and with
  `Edit=true` the saved values as `id-val-ResolutionType`,
  `id-val-ResolutionDate`, `id-val-ResolutionAmount`,
  `id-val-ResolutionWeeks` and `id-val-Resolution` (zero amounts blank).
  When resolving it sends no values: the old answer wrote `1970-01-01` (a
  blank date through `formatDate`) and `0.000000000000` into the new form.
  `ResolvedBy` and `ResolvedOn` are not sent: the case keeps no "resolved
  by", so the form leaves that line out.
- **`US Case Form: Resolve Case`** (`/Cases/US/Resolve`). Rebuilt
  whole (owner, 17 November 2026): **no email is sent from CloudToolz**.
  The emails go from iMIS, through an automation reading
  `i4u_UT_AutomationTrigger`, so they use a communication template and are
  logged to the member and the case. In order:
  1. `IF_Valid`: a case (`CaseID` and the numeric `CaseNum`), an outcome
     type, a closed date and plain-number amounts, or `Response_Invalid`
     and nothing is saved. It stands in for the `Form/Validation` step.
  2. `SQL_Case` (CloudToolz): the case as it is (old values for the log,
     `PrimaryContctID`, `StaffLeadID`), the two Cases / Resolution switches
     (`EmailPrimaryContact`, `EmailPrimaryStaff`, Entity `DEMO`) and the
     entity's local time. No case: "This case couldn't be found."
  3. `iMIS_Update`: `i4u_UT_Cases` by `CaseNum`, the five fields and
     `LastUpdatedOn`/`By`, plus Status `Complete` when resolving.
  4. `SQL_Update`: the same in `Cases.i4u_UT_Cases` (blank date, amount and
     weeks as NULL). If it fails, iMIS is already saved: the answer says so
     with `Error`, the form stays open, and saving again finishes it.
  5. `LogChangesToIMIS` (fire and forget): Note `Case C49: Resolved` or
     `…: Resolution Edited`, Table `i4u_UT_Cases`, the five fields and
     Status (resolving only), old and new written alike so only real
     changes show.
  6. When resolving (not `Edit=true`), one `i4u_UT_AutomationTrigger` row
     per switch that is `1`, if the case has that person: the primary
     contact (Type `Case Resolved - Primary Contact`) and the staff lead
     (`Case Resolved - Staff Lead`). Each row: `ID` the person, `Reference`
     the CaseID, `Date` the local time, `EntryGUID` a new GUID,
     `CommunicationLogKey` blank for the automation.
  7. The answer: "Case resolved." or "Resolution updated." with `Success:
     true`. A trigger row that failed is named ("…the email to the member
     couldn't be queued"); the case is still resolved.

  Gone: the CloudToolz Send Email steps and their lookups, the
  `SenderEmailAddress`, `EmailBody` and `EmailBodyStaff` settings (no longer
  read), the Get Case Details reads, and the `i4u_UT_Cases_History`
  snapshot (the change log replaces it). The endpoint and Request
  Authorization are kept as exported.

If Get Case Details finds no case, the prefill ends in a Fault with no
answer; the form shows itself after 8 seconds.

## To confirm

- The resolution columns in CloudToolz `Cases.i4u_UT_Cases` are named as in
  iMIS (`ResolutionType`, `ResolutionDate`, `ResolutionAmount`,
  `ResolutionWeeks`, `Resolution`); `SQL_Case` and `SQL_Update` assume so.
- The iMIS automation picks up `i4u_UT_AutomationTrigger` rows by the two
  Type values above (change `TRIGGER_TYPE_*` in `build-flows.cjs` to match).

- The outcome types in `Case Value List - Outcome Type`.
- Whether resolving completes or cancels open tasks (now: they stay open).
- `Cases_ResolveCase` exists on no website yet.
