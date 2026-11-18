/* Case note and task form: the autoexecute field's JavaScript, run with the
   cases/US/note/Prefill answer as `data`. The form's injected script does
   the work (form-inject.js); this only hands the answer over. */
if (window.usCaseNote) {
  window.usCaseNote.prefill(data);
} else {
  window.usCaseNotePending = data;
}
