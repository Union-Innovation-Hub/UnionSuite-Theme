const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname,'../../../..',name),'utf8').replace(/\r\n/g,'\n');
function frameDocument() {
  // The taskbar's record icons come from the shared US-ICONS block.
  const themeIcons = read('Theme/UnionSuite/zUnionSuite.js').match(/\/\* US-ICONS:START[\s\S]*?\/\* US-ICONS:END \*\//)[0];
  const actionIcons = read('Theme/UnionSuite/zUnionSuite.js').match(/\/\* US-ACTION-ICONS:START \*\/[\s\S]*?\/\* US-ACTION-ICONS:END \*\//)[0];
  const nativeButtons = read('Theme/UnionSuite/99-Orion.css').split('/* set up button base styles */')[1].split('/* ==========================================================================\n   ORION THEME STYLES')[0];
  return `<!doctype html><html lang="en" data-us-color-scheme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Biscuit's daily taskbar greeting — UnionSuite</title><style>
${nativeButtons}
${read('Theme/UnionSuite/zUnionSuite.css')}
${read('Theme/UnionSuite/zzDarkMode.css')}
body{padding:24px;margin:0;font:14px var(--font-ui);background:var(--bg-page);color:var(--text-base)}
.pip-preview-header{padding:18px;border:1px solid var(--border);border-radius:12px;background:var(--bg-surface)}
.pip-preview-row{display:flex;align-items:center;flex-wrap:wrap;gap:20px}.navbar-left{display:flex;align-items:center}.pip-preview-brand{display:flex;align-items:center;height:60px;font-size:20px;font-weight:650;color:var(--text-strong)}.pip-preview-utility{margin-left:auto;min-width:0;max-width:100%}
.pip-preview-intro{max-width:660px;margin-top:42px}.pip-preview-intro h1{font-size:24px;line-height:1.2;color:var(--text-strong);margin:0 0 12px}
.pip-preview-controls{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:22px 0}.pip-preview-controls label{display:flex;align-items:center;gap:8px}
#demo-taskbar-status{margin-top:28px;color:var(--text-muted)}
@media(max-width:768px){body{padding:12px}.pip-preview-header{padding:12px}.pip-preview-brand{height:32px}.pip-preview-utility{width:100%;margin-left:0}.pip-preview-intro{margin-top:28px}}
</style></head><body><header class="pip-preview-header" id="hd"><div class="pip-preview-row"><div class="navbar-left"><div class="pip-preview-brand">UnionSuite</div></div><div class="pip-preview-utility"><div class="searchfieldplus-dropdown"><div class="RecentHistoryList"><div class="RecentHistoryItem"><a href="/Party.aspx?ID=104019">Alex Morgan (104019)</a></div></div></div></div></div></header>
<input type="hidden" id="__ClientContext">
<main class="pip-preview-intro"><h1>A little hello, once a day.</h1><p>Biscuit peeks up beside the logo, at the left of the header’s top row, and waves hello. There is no separator beside him, and navigation stays in place.</p>
<ol><li><strong>First click:</strong> a wave.</li><li><strong>Second click:</strong> a happy hop.</li><li><strong>Third click:</strong> a shy goodbye — he ducks away quickly, peeks back, looks left and right, spots you, gives a startled little jump, then dives away.</li></ol>
<p>Biscuit visits for five minutes, then slips away with his normal leave animation. Every 15 seconds, he randomly scratches his head or gives a curious tilt.</p>
<div class="pip-preview-controls"><button type="button" class="TextButton us-outline-button" data-pip-preview-replay>Replay greeting</button><button type="button" class="TextButton us-outline-button" data-pip-preview-reload>Reload taskbar</button><label>Appearance <select data-pip-preview-scheme><option value="light">Light</option><option value="dark">Dark</option></select></label></div>
<div class="pip-preview-controls" role="group" aria-label="Preview idle animations"><span>Try an idle:</span><button type="button" class="TextButton us-outline-button" data-pip-preview-idle="scratch" disabled>Scratch head</button><button type="button" class="TextButton us-outline-button" data-pip-preview-idle="curious" disabled>Curious tilt</button></div>
<p>The idle buttons leave his click sequence and five-minute timer unchanged. Use Replay greeting to bring him back after he leaves.</p>
<p>Replay resets only this example's daily greeting. Reload preserves it, just like navigating to another page. These review controls are not added to the live taskbar.</p></main>
<p id="demo-taskbar-status" role="status">Fictional records only. Search Morgan or example.com; try empty or error. Result and Full Search navigation are inactive.</p>
<script>${read('Theme/UnionSuite-Guides/usage/source/taskbar-example.js')}</script><script>${themeIcons}</script><script>${read('Theme/UnionSuite/Scripts/UnionSuiteTaskbar.js').replace('setTimeout(resetFullSearch, 10000)', 'setTimeout(resetFullSearch, 1200)')}</script><script>${actionIcons}</script></body></html>`;
}
module.exports = {frameDocument};
if (require.main === module) {
  fs.writeFileSync(path.join(__dirname,'../../../../references/Taskbar-Preview.html'),frameDocument());
  console.log('Built standalone taskbar preview');
}
