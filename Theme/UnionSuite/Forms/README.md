# UnionSuite forms

The popup forms (the task form first; owner, 20 October 2026). Each module's
iMIS page holds only a placeholder, `<div data-us-form="task"
data-module="case"></div>`, and the runtime here draws the form into it, saves
it through CloudToolz and closes the popup with the popup form contract.
Works with or without the UnionSuite theme.

| File | What it holds |
|---|---|
| `UnionSuiteForms.js` | The runtime and its shared field types. `FORM_FILES` maps each form to its file. |
| `UnionSuiteForms.css` | Every form's styles, adopted into each form's shadow root. In this subfolder so iMIS never links it on ordinary pages. |
| `TaskForm.js` | The task form: a `CONFIG` block (CloudToolz endpoint and IQAs, blank until built) and its definition. |

The documentation is the usage guide's **Popup forms** section
(`Theme/UnionSuite-Guides/usage/source/Usage-Guide.source.html`, `#popup-forms`):
how staff use the task form, setting up a page, the payload and close results,
and the format every form follows (definition keys, field types, adding a form
or a field type, moving a form to HubForms).

Upload the whole folder with `index.js` (which loads the runtime on pages with
a placeholder) and bump the loader's `RELEASE`. A new form file also goes in
`index.js`'s `ON_DEMAND`. Tests: `node --test tools/test-popup-forms.cjs`.
Preview on sample data: `prototypes/wip/task-form/task-form-preview.html`.
