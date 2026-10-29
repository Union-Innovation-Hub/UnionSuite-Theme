(() => {
  const frames = [...document.querySelectorAll('iframe[data-group]')];
  const command = (frame, action, value, key) => frame.contentWindow.postMessage({ type: 'cco-command', action, value, key }, '*');
  const sync = document.getElementById('sync-tabs');
  const combined = document.getElementById('combined');
  document.querySelectorAll('[name="layout"]').forEach(input => input.addEventListener('change', () => { document.body.dataset.layout = input.value; }));
  document.getElementById('disable-last').addEventListener('change', event => frames.forEach(frame => command(frame, 'disabled', event.target.checked)));
  document.getElementById('reset').addEventListener('click', () => {
    document.getElementById('disable-last').checked = false;
    frames.forEach(frame => command(frame, 'reset'));
  });
  window.addEventListener('message', event => {
    const source = frames.find(frame => frame.contentWindow === event.source);
    if (!source || event.data?.id !== source.id) return;
    if (event.data.type === 'cco-size' && Number.isFinite(event.data.height)) {
      source.dataset.height = Math.max(90, Math.min(1600, Math.ceil(event.data.height)));
      const pair = frames.filter(frame => frame.dataset.group === source.dataset.group);
      const height = Math.max(...pair.map(frame => Number(frame.dataset.height) || 470));
      pair.forEach(frame => { frame.style.height = height + 'px'; });
    }
    if (event.data.type === 'cco-select' && sync.checked) {
      frames.filter(frame => frame !== source && frame.dataset.group === source.dataset.group).forEach(frame => command(frame, 'select', event.data.index, event.data.key));
    }
  });
  document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    const code = document.getElementById(button.dataset.copy);
    const status = document.getElementById('copy-status');
    try {
      if (!navigator.clipboard?.writeText) throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(code.textContent);
      status.textContent = 'Copied ' + button.textContent.replace('Copy ', '') + '.';
    } catch {
      const range = document.createRange(); range.selectNodeContents(code);
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      status.textContent = 'Code selected. Press Ctrl+C (or Command+C) to copy.';
    }
  }));
})();
