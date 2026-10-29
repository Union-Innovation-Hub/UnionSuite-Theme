// Verify the actual cascade and layout bounds, including component isolation.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('../.tmp-iqa-integration/node_modules/playwright');
const example = require('../Theme/UnionSuite-Guides/usage/build/page-layout-example.cjs');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const block = /\/\* US-PAGE-LAYOUT-GUTTERS:START \*\/[\s\S]*?\/\* US-PAGE-LAYOUT-GUTTERS:END \*\//;
const current = example.documentHtml();
assert(block.test(current), 'fixture must import the actual scoped rule');
const baseline = current.replace(block, '');
const near = (a, b, message) => assert(Math.abs(a - b) < 1, `${message}: ${a} vs ${b}`);
const row = (id, content) => `<div class="row" id="${id}">${content}</div>`;
const col = (size, content) => `<div class="col-sm-${size}">${example.zone(content)}</div>`;
const result = () => {
  const style = id => getComputedStyle(document.getElementById(id));
  const rect = id => document.getElementById(id).getBoundingClientRect();
  const a = rect('layout-main'), b = rect('layout-side');
  return {
    gutter: style('layout-row').getPropertyValue('--bs-gutter-x').trim(),
    component: style('component-row').getPropertyValue('--bs-gutter-x').trim(),
    gap: b.left - a.right, left: a.left, right: b.right,
    mainWidth: a.width, sideWidth: b.width, stacked: b.top >= a.bottom,
    padding: getComputedStyle(document.querySelector('#layout-main .panel-body')).padding,
    overflow: document.documentElement.scrollWidth - innerWidth,
    margin: parseFloat(style('layout-row').marginLeft)
  };
};
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.route('**/*', route => route.abort());
    const measurements = [];
    for (const width of [1440, 768, 767, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const shell of ['ContentPanel', 'ContentWizardDisplay', 'EmptyMasterContentPanel']) {
        let oldMetrics;
        for (const [name, source] of [['baseline', baseline], ['current', current]]) {
          // ContentWizardDisplay is also used inside nested native CCO iParts.
          let doc = source.replace('<div class="ContentPanel">', `<div class="${shell}">`);
          if (shell === 'ContentWizardDisplay') doc = doc.replace('<body>', '<body><div class="iMIS-WebPart"><div class="ContentItemContainer"><div class="example-author-class"><div class="cco tabs-wrapper tabs-horizontal"><div class="RadMultiPage"><div class="rmpView">').replace('</body>', '</div></div></div></div></div></div></body>');
          await page.setContent(doc);
          const m = await page.evaluate(result);
          assert.equal(m.component, '40px', 'form gutter remains independent');
          assert.equal(m.gutter, name === 'current' ? '24px' : '40px');
          assert(m.overflow <= 1, `no new horizontal overflow: ${shell}/${width}/${name}`);
          assert.equal(m.stacked, width < 768, 'native responsive breakpoint');
          if (name === 'baseline') oldMetrics = m;
          else {
            near(m.left, oldMetrics.left, 'outer left edge retained');
            near(m.right, oldMetrics.right, 'outer right edge retained');
            assert.equal(m.padding, oldMetrics.padding, 'card padding retained');
            if (width >= 768) near(m.gap, 24, 'visible card gap');
            else near(m.mainWidth, oldMetrics.mainWidth, 'stacked card width retained');
            measurements.push({ shell, width, ...m });
          }
        }
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.setContent(current);
    await page.evaluate(() => {
      const layout = document.querySelector('.ContentPanel > div');
      // Same root/depth without native zones must remain a component grid.
      layout.insertAdjacentHTML('beforeend', '<div class="row" id="ordinary"><div class="col-sm-6">Ordinary row</div></div>');
      const clone = document.getElementById('layout-row').cloneNode(true);
      clone.id = 'outside-layout'; clone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
      document.body.append(clone);
    });
    for (const id of ['ordinary', 'outside-layout']) assert.equal(await page.locator('#' + id).evaluate(n => getComputedStyle(n).getPropertyValue('--bs-gutter-x').trim()), '40px');
    for (const wrapper of [null, '', 'example-author-class']) {
      await page.setContent(current);
      await page.locator('#layout-main').evaluate((panel, cls) => {
        const item = panel.closest('.iMIS-WebPart > .ContentItemContainer');
        panel.remove(); item.replaceChildren();
        if (cls === null) item.append(panel);
        else { const div = document.createElement('div'); div.className = cls; item.append(div); div.append(panel); }
      }, wrapper);
      assert.equal((await page.evaluate(result)).gutter, '24px', 'iPart wrappers do not affect layout ownership');
    }
    await page.locator('.ContentPanel').evaluate(n => n.classList.add('us-report-no-styling'));
    assert.equal((await page.evaluate(result)).gutter, '40px', 'ancestor opt-out');
    await page.locator('.ContentPanel').evaluate(n => n.classList.remove('us-report-no-styling'));
    await page.locator('#layout-row').evaluate(n => n.classList.add('us-report-no-styling'));
    assert.equal((await page.evaluate(result)).gutter, '40px', 'row opt-out');
    await page.locator('#layout-row').evaluate(n => { n.classList.remove('us-report-no-styling'); n.style.setProperty('--bs-gutter-x', '32px'); });
    assert.equal((await page.evaluate(result)).gutter, '32px', 'explicit inline gutter');
    await page.locator('.ContentPanel').evaluate(n => { n.innerHTML = n.innerHTML; n.querySelector('.row').style.removeProperty('--bs-gutter-x'); });
    assert.equal((await page.evaluate(result)).gutter, '24px', 'partial replacement needs no JS');
    await page.locator('.WebPartZone').evaluateAll(zones => zones.forEach(n => n.replaceChildren()));
    assert.equal(await page.locator('#layout-row').evaluate(n => getComputedStyle(n).getPropertyValue('--bs-gutter-x').trim()), '24px', 'empty zones retain gutter');

    // Banner breakout follows the nearest row; native sticky behaviour remains.
    const banner = '<div class="us-banner us-banner-collapsible"><header class="us-banner__surface"><div class="us-banner__summary"><div class="us-banner__identity"><h1 class="us-banner__title">Example member</h1></div></div><div class="us-banner__details">Member details</div></header></div>';
    const bannerBody = '<div id="hd" style="position:fixed;top:0;height:76px;width:100%">Header</div><main class="main" style="margin-top:120px"><div class="ContentPanel"><div>' + row('banner-row', col(12, banner)) + row('banner-content', col(8, example.panel('banner-main', 'Membership details', 'Example content')) + col(4, example.panel('banner-side', 'Workplace', 'Example content'))) + '</div></div><div style="height:1500px"></div></main>';
    const bannerDoc = current.replace(/<body>[\s\S]*<\/body>/, '<body class="us-banner-page">' + bannerBody + '</body>').replace('</style>', 'body{padding:0}</style>');
    for (const width of [1440, 768, 767, 390]) {
      const bannerPage = await browser.newPage({ viewport: { width, height: 1000 } });
      await bannerPage.route('**/*', route => route.abort());
      await bannerPage.setContent(bannerDoc);
      const before = await bannerPage.locator('.us-banner__surface').evaluate(n => ({ left: n.getBoundingClientRect().left, right: n.getBoundingClientRect().right, inset: parseFloat(getComputedStyle(n).paddingLeft), card: document.getElementById('banner-main').getBoundingClientRect().left }));
      assert.equal(before.inset, 12);
      near(before.left + before.inset, before.card, 'banner text aligns with page content');
      near(before.right, width, 'full-width banner edge');
      await bannerPage.addScriptTag({ content: read('Theme/UnionSuite/zUnionSuite.js') });
      await bannerPage.evaluate(() => scrollTo(0, 300));
      await bannerPage.waitForFunction(() => getComputedStyle(document.querySelector('.us-banner__surface')).position === 'fixed');
      const pinned = await bannerPage.locator('.us-banner__surface').evaluate(n => ({ bounds: n.getBoundingClientRect().toJSON(), slot: n.closest('.us-banner').getBoundingClientRect().toJSON(), overflow: document.documentElement.scrollWidth - innerWidth }));
      near(pinned.bounds.left, pinned.slot.left, 'pinned left'); near(pinned.bounds.width, pinned.slot.width, 'pinned width');
      assert.equal(pinned.bounds.top, 76); assert(pinned.overflow <= 1);
      await bannerPage.evaluate(() => scrollTo(0, 0));
      await bannerPage.waitForFunction(() => getComputedStyle(document.querySelector('.us-banner__surface')).position !== 'fixed');
      await bannerPage.close();
    }
    fs.writeFileSync(path.join(root, '.preview/page-layout-gutters.json'), JSON.stringify(measurements, null, 2));
    console.log('PASS: 24px page/CCO/preview gutters; 40px component rows; unchanged card padding, outer edges and responsive stacking; wrappers, empty zones, opt-out, explicit override, replacement and banner pinning.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
