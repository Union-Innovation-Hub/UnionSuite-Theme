(function () {
  'use strict';
  const proposal = document.querySelector('#proposal');
  let paneMode = 'overlay';
  let scheme = 'light';
  function send(values) {
    proposal.contentWindow.postMessage({workshop: true, ...values}, '*');
  }
  document.querySelectorAll('[data-pane-mode]').forEach(button => button.addEventListener('click', () => {
    paneMode = button.dataset.paneMode;
    document.querySelectorAll('[data-pane-mode]').forEach(node => node.setAttribute('aria-pressed', String(node === button)));
    send({paneMode});
  }));
  document.querySelector('#preview-width').addEventListener('change', event => {
    document.documentElement.style.setProperty('--preview-width', event.target.value === 'fluid' ? '100%' : event.target.value + 'px');
  });
  document.querySelector('#preview-scheme').addEventListener('change', event => {
    scheme = event.target.value;
    send({scheme});
  });
  document.querySelectorAll('[data-pane-try]').forEach(button => button.addEventListener('click', () => {
    proposal.scrollIntoView({block: 'start', behavior: 'smooth'});
    send({paneTry: button.dataset.paneTry});
  }));
  document.querySelector('#reset-demo').addEventListener('click', () => send({reset: true}));
  window.addEventListener('message', event => {
    if (event.source !== proposal.contentWindow || !event.data?.workshop) return;
    if (event.data.ready) send({scheme, paneMode});
    if (event.data.scheme && event.data.scheme !== scheme) {
      scheme = event.data.scheme;
      document.querySelector('#preview-scheme').value = scheme;
    }
  });
})();
