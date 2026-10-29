// One-time promotion of the approved v1 drawing; maintained theme CSS owns it now.
const fs = require('node:fs');
const source = fs.readFileSync('experiments/Mascot/pip-koala.source.html', 'utf8');
const start = source.indexOf('    #pip-mascot-demo .pip-character {');
const end = source.indexOf('    #pip-mascot-demo[data-shape="blob"]');
const keys = source.slice(source.indexOf('    @keyframes pip-land'), source.indexOf('    @media (max-width:440px)'));
const reduced = source.slice(source.indexOf('    @media (prefers-reduced-motion:reduce)'), source.indexOf('  </style>'));
const drawing = (source.slice(start, end) + keys + reduced)
  .replace(/^.*\.pip-character:(?:disabled|focus-visible).*\n/gm, '')
  .replaceAll('#pip-mascot-demo', '#injected-taskbar .us-taskbar__pip')
  .replaceAll('.pip-character:not(:disabled):hover', '.us-taskbar__pip-button:not(:disabled):hover')
  .replaceAll('animation:pip-', 'animation:us-pip-')
  .replaceAll('@keyframes pip-', '@keyframes us-pip-');
const css = `
/* US-TASKBAR-PIP:START */
/* Pip v1: reserved header section, original CSS drawing and restrained greeting.
   Runtime controls phases and gaze coordinates; dark palette lives in zzDarkMode.css. */
:root {
  --us-pip-fur:#a1d5bd; --us-pip-fur-edge:#7bb39b; --us-pip-fur-light:#c1e8d4;
  --us-pip-ear:#efd9cf; --us-pip-face:#29473e; --us-pip-blush:#dfaca7;
  --us-pip-shine:#fffdf7; --us-pip-shadow:#203c351a;
}
#injected-taskbar .us-taskbar__pip {
  --us-pip-enabled:1;
  --pip-fur:var(--us-pip-fur); --pip-fur-edge:var(--us-pip-fur-edge); --pip-fur-light:var(--us-pip-fur-light);
  --pip-ear:var(--us-pip-ear); --pip-face:var(--us-pip-face); --pip-blush:var(--us-pip-blush);
  --pip-shine:var(--us-pip-shine); --pip-shadow:var(--us-pip-shadow);
  position:relative; flex:0 0 64px; width:64px; height:36px; overflow:hidden;
}
#injected-taskbar .us-taskbar__pip *, #injected-taskbar .us-taskbar__pip *::after { box-sizing:border-box; }
#injected-taskbar .us-taskbar__pip-divider { flex:0 0 1px; height:20px; background:var(--border); margin-inline:4px; }
#injected-taskbar .us-taskbar__pip-button {
  display:block; position:relative; width:100%; height:100%; min-width:0; min-height:0; padding:0; margin:0;
  overflow:hidden; border:0; border-radius:6px; background:transparent; box-shadow:none;
  color:var(--pip-face); font:inherit; line-height:1; opacity:1; cursor:pointer; transform:none; transition:none;
  appearance:none; -webkit-tap-highlight-color:transparent;
}
#injected-taskbar .us-taskbar__pip-button:disabled { cursor:default; }
#injected-taskbar .us-taskbar__pip-button:focus-visible { outline:2px solid var(--border-focus); outline-offset:-2px; }
#injected-taskbar .us-taskbar__pip .pip-visitor { position:absolute; bottom:0; left:50%; margin-left:-95px; width:190px; height:225px; transform:scale(.34); transform-origin:50% 100%; pointer-events:none; }
${drawing}
@media (pointer:coarse) {
  #injected-taskbar .us-taskbar__pip { height:44px; }
  #injected-taskbar .us-taskbar__pip .pip-visitor { transform:scale(.4); }
}
@media print { #injected-taskbar .us-taskbar__pip, #injected-taskbar .us-taskbar__pip-divider { display:none; } }
@media (forced-colors:active) {
  #injected-taskbar .us-taskbar__pip .pip-visitor { forced-color-adjust:none; }
  #injected-taskbar .us-taskbar__pip-button:focus-visible { outline-color:Highlight; }
}
/* US-TASKBAR-PIP:END */
`;
const file = 'Theme/UnionSuite/zUnionSuite.css';
const original = fs.readFileSync(file, 'utf8');
if (original.includes('/* US-TASKBAR-PIP:START */')) throw Error('Pip CSS already promoted; edit the theme directly.');
fs.writeFileSync(file, original + css);
