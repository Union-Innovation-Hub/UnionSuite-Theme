// Review controls only. Preference and switch live in shared scripts.
(function () {
  function render() {
    const state = window.UnionSuiteAppearance.getState();
    document.querySelector('[data-appearance-status]').textContent =
      (state.scheme === 'dark' ? 'Dark' : 'Light') + ' mode · ' +
      (state.preference ? (state.storageAvailable ? 'saved for this browser' : 'this page only') : 'following device setting');
    document.querySelector('[data-appearance-reset]').hidden = !state.preference;
  }
  window.addEventListener('unionsuite:appearancechange',render);
  document.querySelector('[data-appearance-reset]').addEventListener('click',() => window.UnionSuiteAppearance.reset());
  document.querySelector('[data-appearance-remount]').addEventListener('click',() => {
    document.getElementById('injected-taskbar')?.remove();
    window.UnionSuiteTaskbar.refresh();
  });
  render();
})();
