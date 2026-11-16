/* Resolve case: the autoexecute field's JavaScript, run with the
   Cases/US/Resolve/Prefill answer as `data`. The form's injected script does
   the work (form-inject.js); this only hands the answer over. */
if (window.usResolveCase) {
  window.usResolveCase.prefill(data);
} else {
  window.usResolveCasePending = data;
}
