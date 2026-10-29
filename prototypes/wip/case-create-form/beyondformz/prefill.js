/* Create case: the autoexecute field's JavaScript, run with the
   Cases/Create-Prefill answer as `data`. The form's injected script does
   the work (form-inject.js); this only hands the answer over. */
if (window.usCreateCase) {
  window.usCreateCase.prefill(data);
} else {
  window.usCreateCasePending = data;
}
