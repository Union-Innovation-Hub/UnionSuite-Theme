# BeyondFormz: fields added by script

Fields that a form's script adds to a BeyondFormz form, rather than fields
configured in the form builder, and the planned way to let configuration
add them through a flow. Owner, 29 October 2026: "I want to eventually add
config to the beyond form to call a flow to add dynamic fields to the
form."

**Status:** the mechanism is proven on the dev tenant (below). The
flow-driven fields are **planned, not designed or built**; the plan at the
end is a starting point to talk through, not an agreed design.

## What BeyondFormz sends

When a field with a flow runs (a button, or the autoexecute prefill),
BeyondFormz posts **every named `input`, `select` and `textarea` inside the
form's `.rendered-form`**, form-encoded, not only the fields configured in
the builder. In its renderer (`formrenderV20.es.js` on
`cdn-cf.zentsocloud.com`, read 29 October 2026) the request body is
`button.closest(".rendered-form").find("input, select, textarea").serialize()`.

So a field the form's script adds is sent as long as it:

- sits inside `.rendered-form`;
- has a `name`;
- is not disabled (jQuery's `serialize` leaves disabled fields out; the
  Create case form relies on that to send no lead when none is chosen).

Other things seen in the same renderer and probe:

- Flow buttons work through delegated click handlers on `document`, so a
  script's capture-phase listener on `window` runs first and can stop a
  send (how the Create case form checks required fields).
- A field's JavaScript runs as `new Function("data", script)(answer)`.
- Answer keys `class-html-<Class>`, `id-html-<Id>`, `class-val-<Class>` and
  `id-val-<Id>` are written into the page before the field's script runs.
- BeyondFormz fills each IQA-fed list **after** the form's injected script
  has run.

## The test (29 October 2026)

Two checks on the dev tenant's Create case page
(`@/_i4u_/Core/Cases/UnionSuite/Create-Case-Staff-Form.aspx?ID=100020`),
on the form built in
[`prototypes/wip/case-create-form/`](../prototypes/wip/case-create-form/README.md):

1. **Probe, saves blocked.** [`tools/probe-create-case-form.js`](../tools/probe-create-case-form.js)
   adds a hidden field and presses the form's hidden `SubTypeSession`
   button: the field arrived in the `Cases/SetSessionStorage` request body.
   Nothing was saved.
2. **Real save** (owner's request). After the form loaded, a console
   script added three fields with random names, then pressed Create case.
   It created test case **C221** (CaseNum 220, member 100020, "TEST -
   script-added fields check (safe to delete)"). The CloudToolz request log
   for `/Cases/Create-Case-Staff` showed them in the flow's `Body` beside
   the configured fields:

   | Added by script | In the browser | In the flow's `Body` |
   |---|---|---|
   | text input `DynText_oft52` | `text yd9dp` | `"DynText_oft52": "text yd9dp"` |
   | hidden input `DynHidden_k9gxf` | `hidden mhcnz` | `"DynHidden_k9gxf": "hidden mhcnz"` |
   | multi-select `DynMulti_rlqsp[]`, two of three chosen | sent twice: `alpha`, `beta` | `"DynMulti_rlqsp[]": "alpha,beta"` |

   The raw body ended
   `…&DynText_oft52=text+yd9dp&DynHidden_k9gxf=hidden+mhcnz&DynMulti_rlqsp%5B%5D=alpha&DynMulti_rlqsp%5B%5D=beta`.

### What the flow gets

- Every value is a **string**, read by its exact name:
  `activities.Endpoint.Output().Body["DynText_oft52"]`. Numbers and dates
  must be converted in the flow.
- A multi-select keeps its `[]` and arrives as **one comma-joined string**
  (as `CaseTypes[]` does, read with `.split(",")`). A value that contains a
  comma cannot be told from two values: fine for ordinals, not for free
  text.
- A field that is disabled, has no name, or sits outside `.rendered-form`
  is not sent.
- BeyondFormz also sends request headers a flow can read without any field:
  `selectedpartyid` (the page's `ID`), `loggedinpartyid` (the signed-in
  user) and `beyondformid`.

## Planned: fields from a flow

**Goal.** A form's configuration names a flow; the flow returns field
definitions; the form draws them and they are sent with the form's other
values. The core product owns how fields are drawn and sent; a client
configures which fields, within set boundaries (owner, 29 October 2026:
"we want to maintain a core product, and allow users to config within set
boundaries").

**What is already true:** anything drawn inside `.rendered-form` with a
name is sent (above), and a form's injected script can already draw fields
from a flow's answer (the Create case form draws Workplace from the
prefill's `Workplaces`). What is missing is a general contract.

**Starting points to talk through:**

1. **Where the configuration lives.**
   - *Option A: the prefill answers with the fields.* The form's existing
     autoexecute flow returns a `Fields` list alongside `ReqVals`. One
     request, no new form field; each form's prefill flow carries it.
   - *Option B: a named flow per form.* A hidden field (for example
     `DynamicFieldsFlow`) names the flow; the core script asks it for the
     fields. Separate from the prefill, reusable across forms.
   - *Option C: the FormFields table.* `UnionTemplate.FormFields` already
     holds per-form rules (Module, Area, FieldName, Visible, IsRequired,
     Editable) and the prefill already reads it. Rows for fields the
     builder does not have, with a type, label and list source, would make
     it the one place a client configures a form.
2. **The field definition.** A small, fixed set the core script draws, for
   example `{name, type (text | textarea | date | select | multiselect |
   checkbox | hidden), label, required, options or list IQA, default, hint,
   after (the field it follows)}`, drawn in BeyondFormz's own markup
   (`.form-group.field-<name>` and its label) so the theme's US-BEYOND-FORMS
   styling, the required check and the FormFields rules all apply to them.
3. **Saving them.** The flow sees each value by name, but a generic form
   cannot know where it goes. Either each form's save flow maps the fields
   it expects, or added fields are saved together (for example as one JSON
   value keyed by name) for a generic reader. Decide with the first real
   use.
4. **Names.** A prefix (for example `x_`) so added fields cannot collide
   with configured ones, and no commas in multi-select values.
5. **Where the core script lives.** In the theme, versioned, with each
   form's injected script reduced to a call into it, so a fix reaches every
   form; until then, in the form's injected script as the Create case form
   does.

**Not decided:** any of the above. Talk the options through before
building.
