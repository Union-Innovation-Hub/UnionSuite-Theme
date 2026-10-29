/* Create case: the hidden SubTypeSession button's JavaScript, run with the
   Cases/SetSessionStorage answer as `data`. data.SubTypes is every subtype
   ({value, label, ParentTag}), as a JSON string. The form's script clicks
   the button once on load and filters the list by the chosen types.
   Retire the button once Create-Prefill returns SubTypes itself. */
var subTypes = data && data.SubTypes;
if (typeof subTypes === 'string') {
  subTypes = JSON.parse(subTypes);
}
if (window.usCreateCase) {
  window.usCreateCase.setSubTypes(subTypes || []);
} else {
  window.usCreateCaseSubTypesPending = subTypes || [];
}
