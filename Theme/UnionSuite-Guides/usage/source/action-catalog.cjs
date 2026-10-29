// Author handbook data only. This does not register business commands.
const actions = [
  ['View','eye','View details or preview.'], ['Edit','pencil','Edit an existing record.'],
  ['Delete','trash','Delete the record; keep availability and confirmation in the real handler.','DangerButton'],
  ['Add / Create','plus','Create a new record.'], ['Save','device-floppy','Save changes.'],
  ['Cancel / Close','x','Cancel editing or dismiss a panel.'], ['Duplicate','copy','Create a copy.'],
  ['Archive','archive','Retain a record outside active use.'], ['Restore','restore','Restore an archived or deleted item.'],
  ['Download / Export','download','Download a file or report.'], ['Upload','upload','Upload a file.'],
  ['Attach','paperclip','Attach a document.'], ['History','history','View previous activity or changes.'],
  ['Open in new tab','external-link','Open a verified destination in another tab.'],
  ['More actions','dots','Open an action menu; connect an actual disclosure.'],
  ['Assign / Reassign','user-check','Assign an owner or team.'], ['Complete / Approve','check','Complete or approve an item.','SuccessButton'],
  ['Add note','note','Add a note to the current record.'], ['Email','mail','Compose an email.'], ['Call','phone','Start a call action.'],
  ['Schedule','calendar-plus','Schedule an appointment or task.'], ['Link records','link','Associate existing records.'],
  ['Unlink records','unlink','Remove the association while retaining the records.'], ['Pin','pin','Pin an item.'], ['Refresh','refresh','Reload the current data.']
].map(([label,icon,meaning,modifier=''])=>({label,icon,meaning,modifier}));
const buttons = [
  ['Default action','TextButton','Back','Default navy secondary fill.'],
  ['Native btn','btn','Continue','Alternative native base class; same navy treatment.'],
  ['Secondary action','TextButton','Validate example','Navy default treatment for secondary actions.'],
  ['Primary action','TextButton PrimaryButton','Add contact','Explicit brand-accent action.'],
  ['Lower emphasis','TextButton LinkButton','View history','Native link-style button.'],
  ['Native link variant','btn btn-link','View history','Existing btn link variant.'],
  ['Danger','TextButton DangerButton','Delete record','Semantic danger colour.'],
  ['Success','TextButton SuccessButton','Approve','Semantic success colour.'],
  ['Supporting action','TextButton us-outline-button','Add note','Outlined supporting action beside a dominant command.'],
  ['Warning action','TextButton us-warning-button','Suspend membership','Consequential non-destructive action; semantic amber.'],
  ['Small','TextButton SmallButton','Small','Native small dimensions.'],
  ['Medium','TextButton MediumButton','Medium','Native medium dimensions.'],
  ['Large','TextButton LargeButton','Large','Native large dimensions.'],
  ['Full width','TextButton FullWidthButton','Full-width action','Fills the available container width.']
].map(([label,classes,text,meaning])=>({label,classes,text,meaning}));
module.exports = {actions,buttons};
