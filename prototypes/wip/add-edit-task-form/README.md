# Add Edit Task form

The BeyondFormz form `Add Edit Task` (folder `Interaction`, form ID
`dfc64b28-cb88-4331-93e3-56adbf3612a8`) in the home page's Add task popup,
`@/_i4u_/Core/Staff-Site-Layouts/US-Home-Dashboard/Popups/Add-Task`. Its
Submit button runs the Flowz flow `Interaction/AddEditTask`; the
`Interaction/EditTask-Prefill` flow fills it when an `Ordinal` is passed.

## What this adds

[`submit-button.js`](submit-button.js) is the Submit button's JavaScript.
After a successful save (the flow's `AsiSuccess` message, "Task Added
Successfully" or "Task Updated Successfully") it disables Submit and closes
the popup 1.2 seconds later. Closing the popup refreshes the home page's
task list (the theme's `home.add-task` action). A failed save keeps the
form open with the flow's message.

BeyondFormz runs a button's JavaScript only after the flow answers 2xx,
once it has cleared the form, written the message in and re-enabled the
button (`formrenderV20.es.js`, read 4 November 2026). So the script's
disabled button stays disabled, and the flow's 406 for missing fields
never runs it.

## Build and import

The build takes a fresh export of the form, so it keeps anything changed in
the form builder since:

```bash
node prototypes/wip/add-edit-task-form/build-form.cjs <BeyondFormz export.json>
```

It writes `dist/Add-Edit-Task-Form.json` (not tracked). Import that over
the form in BeyondFormz.
