const fs = require('node:fs');
const assert = require('node:assert/strict');
const {chromium} = require('../.tmp-iqa-integration/node_modules/playwright');
const css = fs.readFileSync('Theme/UnionSuite/zUnionSuite.css', 'utf8');
const js = fs.readFileSync('Theme/UnionSuite/zUnionSuite.js', 'utf8');

const banner = `<header class="us-banner__surface us-banner__surface--member" data-us-status-colour="#23845B">
  <div class="us-banner__summary"><div class="us-banner__identity">
    <h1 class="us-banner__title">Sample member</h1><p class="us-banner__subtitle">Member details</p>
  </div></div><div class="us-banner__details">Member facts</div>
</header>`;

function documentHtml({pageLayout, panel, optedOut}) {
  // Match captured Query Template output; author classes belong to a separate
  // div inside ContentItemContainer. Runtime classes/styles are never pre-seeded.
  const output = panel ? `<div class="panel"><div class="panel-body-container"><div class="panel-body">
    <div class="QueryTemplateSet simplePaginateList"><section><div class="QueryTemplateItem">${banner}</div></section></div>
  </div></div></div>` : banner;
  const item = `<div class="ContentItemContainer"><div class="us-banner us-banner-collapsible">${output}</div></div>`;
  const zone = `<div class="ContentItemContainer"><div class="WebPartZone"><div class="iMIS-WebPart">${item}</div></div></div>`;
  const content = pageLayout ? `<div class="ContentPanel"><div><div class="row"><div class="col-sm-12">${zone}</div></div></div></div>` : item;
  return `<!doctype html><html><head><style>${css}
    body{margin:0}#hd{position:fixed;top:0;height:76px;width:100%;background:white}
    .fixture{margin:150px 30px 0 67.5px}.tail{height:1800px}
    .row{--bs-gutter-x:40px;margin-inline:-20px}.col-sm-12{box-sizing:border-box;padding-inline:20px}
  </style></head><body class="${pageLayout ? 'us-banner-page' : ''}"><div id="hd">Header</div>
    <main class="main fixture${optedOut ? ' us-report-no-styling' : ''}">${content}<div class="tail"></div></main>
  </body></html>`;
}

async function geometry(surface) {
  return surface.evaluate(n => {
    const rect = n.getBoundingClientRect(), slot = n.closest('.us-banner').getBoundingClientRect();
    return {position:getComputedStyle(n).position, top:rect.top, left:rect.left, width:rect.width,
      slotLeft:slot.left, slotWidth:slot.width};
  });
}

(async () => {
  const browser = await chromium.launch({channel:'msedge', headless:true});
  try {
    for (const scenario of [
      {name:'component only', width:1400},
      {name:'native full-width Query Template', width:1400, pageLayout:true, panel:true},
      {name:'native full-width Content HTML', width:1400, pageLayout:true},
      {name:'mobile Query Template', width:600, pageLayout:true, panel:true},
      {name:'no-styling CSS opt-out', width:1400, pageLayout:true, panel:true, optedOut:true}
    ]) {
      const page = await browser.newPage({viewport:{width:scenario.width, height:900}});
      await page.setContent(documentHtml(scenario));
      await page.addScriptTag({content:js});
      const surface = page.locator('.us-banner__surface');
      await page.waitForTimeout(100);
      const original = await geometry(surface);
      if (!scenario.optedOut) assert.equal(original.position, 'relative', scenario.name);
      await page.evaluate(() => scrollTo(0,220));
      await page.waitForTimeout(500);
      const pinned = await geometry(surface);
      if (scenario.optedOut) {
        // This is a CSS regression check; runtime markers must not make the
        // opted-out surface take on shared positioning or the member status rail.
        assert.equal(pinned.position, original.position);
        assert.equal(await surface.evaluate(n => getComputedStyle(n).borderLeftWidth), '0px');
      } else {
        assert.equal(pinned.position, 'fixed', scenario.name + ': pinned surface must use viewport coordinates');
        assert.equal(pinned.top, 76, scenario.name);
        assert.equal(pinned.left, pinned.slotLeft, scenario.name);
        assert.equal(pinned.width, pinned.slotWidth, scenario.name);
        assert.ok(pinned.left + pinned.width <= scenario.width + 1, scenario.name + ': right edge remains on screen');
        await page.setViewportSize({width:scenario.width - 80,height:900});
        await page.waitForTimeout(100);
        const resized = await geometry(surface);
        assert.equal(resized.left, resized.slotLeft, scenario.name + ': resize left');
        assert.equal(resized.width, resized.slotWidth, scenario.name + ': resize width');
        await page.evaluate(() => scrollTo(0,0));
        await page.waitForTimeout(500);
        const restored = await geometry(surface);
        assert.equal(restored.position, 'relative', scenario.name);
        assert.equal(restored.top, original.top, scenario.name + ': original document position restored');
      }
      console.log('Passed:', scenario.name, pinned);
      await page.close();
    }
  } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode = 1;});
