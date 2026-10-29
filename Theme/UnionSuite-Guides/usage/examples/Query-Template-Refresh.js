// This frame supplies only a fictional HTML response and an Add task demo.
// The shared queryTemplate method still performs replacement and initialisation.
(() => {
  const status = document.getElementById('demo-status');
  const fetchPage = window.fetch;
  let revision = 0;
  window.fetch = async (url, options) => {
    if (url !== 'about:blank') return fetchPage(url, options);
    await new Promise(resolve => setTimeout(resolve, 650));
    const failed = document.getElementById('demo-failure').checked;
    const html = window.queryTemplateDemoSource.replace('Confirm the membership options.', 'Refreshed sample ' + (++revision) + '.');
    return new Response(html, {status:failed ? 500 : 200, headers:{'Content-Type':'text/html'}});
  };
  async function refresh() {
    try {
      await UnionSuiteRefresh.queryTemplate('#query-refresh-demo-ipart', {url:'about:blank'});
      status.textContent = 'Results refreshed. Search, Show completed and header actions are retained.';
    } catch (error) {
      status.textContent = error.message + ' Existing results remain visible.';
    }
  }
  UnionSuiteActions.configure('home.add-task', {
    className:'us-action-home-add-task', owner:'guide', source:'Query-Template-Refresh.js',
    presentation:{label:'Add task', icon:'plus', default:'button'}, context:{},
    action:{type:'function', run:async () => {
      await refresh();
      status.textContent += ' Add task is simulated in this offline example.';
    }}
  });
  document.getElementById('demo-refresh').addEventListener('click', refresh);
  document.addEventListener('click', event => {
    if (!event.target.closest('.us-query-footer__link')) return;
    event.preventDefault();
    status.textContent = 'View all tasks is a sample destination.';
  });
})();
