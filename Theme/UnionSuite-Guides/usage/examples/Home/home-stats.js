// OFFLINE PREVIEW ONLY. The installed cards use the shared /api/query loader.
// The builder embeds the supplied probe data and fixes its example date.
(() => {
  const snapshot = {{MEMBERSHIP_SNAPSHOT}};
  const fallback = window.fetch;
  window.__membershipExampleCalls = [];
  window.fetch = async (input, options = {}) => {
    const url = new URL(input, 'https://example.invalid');
    if (!url.pathname.endsWith('/api/query')) {
      if (fallback) return fallback(input, options);
      throw Error('No network access in the membership example.');
    }
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const path = url.searchParams.get('QueryName');
    const query = Object.values(snapshot.queries).find(q => path === snapshot.folder + '/' + q.name);
    if (!query) throw Error('Unknown example IQA.');
    let period = 'current';
    if (query.previous) {
      period = Object.keys(snapshot.periods).find(key => snapshot.periods[key].start === url.searchParams.get('StartDate') && snapshot.periods[key].end === url.searchParams.get('EndDate'));
      if (!period) throw Error('Unexpected example date filters.');
    }
    window.__membershipExampleCalls.push({path, period, offset: Number(url.searchParams.get('offset') || 0)});
    const rows = period === 'empty' ? [] : query[period];
    const offset = Number(url.searchParams.get('offset') || 0), limit = Number(url.searchParams.get('limit') || 100);
    await new Promise(resolve => setTimeout(resolve, 120));
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return {ok: true, status: 200, json: async () => ({Items: {$values: rows.slice(offset, offset + limit)}, TotalCount: rows.length, HasNext: offset + limit < rows.length, NextOffset: Math.min(rows.length, offset + limit)})};
  };
})();
