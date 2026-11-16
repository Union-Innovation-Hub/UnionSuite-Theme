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

It writes `beyondformz/dist/Resolve-Case-Form.json` (ignored by Git).
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

It reads a Flowz export holding the two flows, keeps their definitionId and
versionId (importing overwrites them) and changes only what the form needs.
It writes `flows/dist/Resolve-Case-Flows.json` (ignored by Git), checked
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
- **`US Case Form: Resolve Case`** (`/Cases/US/Resolve`).
  `IF_Valid` (new, after the authorisation): a case, an outcome type, a
  closed date and plain-number amounts, or `Response_Invalid` and nothing
  is saved. It stands in for the `Form/Validation` step. The update sets
  Status `Complete` only when resolving; with `Edit=true` it changes the
  five fields only. `IF_Resolving` (new, after the history row) sends the
  notification emails only when resolving. The success answer says "Case
  resolved." or "Resolution updated." with `Success: true`. Blank amounts
  save blank, as the old form sent them. The email settings and sends are
  unchanged.

Seen in the export, not changed: `If EmailPrimaryStaff` and `If
EmailPrimaryContact` each continue on both False and Done, the email
configuration reads `Entity = 'DEMO'`, and two `Set Variable` steps (`Test`,
`Test1`) look like debugging. If Get Case Details finds no case, the prefill
ends in a Fault with no answer; the form shows itself after 8 seconds.

## To confirm

- The outcome types in `Case Value List - Outcome Type`.
- Whether resolving completes or cancels open tasks (now: they stay open).
- `Cases_ResolveCase` exists on no website yet.
