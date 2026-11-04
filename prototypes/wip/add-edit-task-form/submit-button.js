/* Add Edit Task: the Submit button's JavaScript, run with the
   Interaction/AddEditTask answer as `data`.

   BeyondFormz runs it only after the flow answers 2xx, and after it has
   cleared the form, written the message in and re-enabled the button; a
   failure (the flow's 406 for missing fields) does not run it. So the
   button is disabled here and stays disabled.

   On "Task Added Successfully" or "Task Updated Successfully" (an
   AsiSuccess message), Submit is disabled so the task can't be sent twice,
   and the popup closes after a short pause so the message can be read.
   Closing it is what refreshes the home page's task list. Opened outside
   a popup, the page stays as it is. */
(function (answer) {
  var CLOSE_DELAY_MS = 1200;

  // The flow's answer arrives parsed; a string answer is parsed here.
  var result = answer;
  for (var i = 0; i < 2 && typeof result === 'string'; i++) {
    try {
      result = JSON.parse(result);
    } catch (error) {
      break;
    }
  }
  var message = result && typeof result === 'object' ? String(result['class-html-Message'] || '') : '';
  if (message.indexOf('AsiSuccess') === -1) {
    return;
  }

  var button = document.getElementById('AddEditTask');
  if (button) {
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
  }

  // The iMIS popup is a Telerik RadWindow around this page.
  function popup() {
    try {
      if (window.radWindow) {
        return window.radWindow;
      }
      if (window.frameElement && window.frameElement.radWindow) {
        return window.frameElement.radWindow;
      }
    } catch (error) {
      // A frame from another site: not an iMIS popup.
    }
    return null;
  }

  setTimeout(function () {
    var win = popup();
    if (win && typeof win.close === 'function') {
      win.close();
    }
  }, CLOSE_DELAY_MS);
})(data);
