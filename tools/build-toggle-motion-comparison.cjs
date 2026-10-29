const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const trial = require('./toggle-switch-trial.cjs');
const dayNight = require('./dark-toggle-trial.cjs');
const favourites = require('./dark-toggle-favourites.cjs');
const foundation = fs.readFileSync(path.join(root,'references/Form-Fields-Preview.html'),'utf8').match(/<style>([^]*?)<\/style>/)[1];
const options = [
  ['subtle','01','Subtle','160ms','A smooth slide with a gentle icon fade. Quiet and familiar.'],
  ['spring','02','Spring','240ms','The thumb stretches as it moves, then settles with a small overshoot. The new symbol pops into place.'],
  ['pulse','03','Spring + pulse','240ms + 360ms halo','The same spring movement, with a short coloured halo on every change.']
];
const cards = options.map(([key,n,title,timing,description])=>`<article data-motion="${key}"><div class="eyebrow">${n} / ${timing}</div><h2>${title}</h2><p class="description">${description}</p><h3>Plain thumb</h3>${trial.control('Email notifications')}<h3>With symbols</h3>${trial.control('Weekly summary',false,false,false,['x','check'])}<h3>Navy + symbols</h3>${trial.control('Lock editing',false,false,true,['lock-open','lock'])}<h3>Disabled</h3>${trial.control('Unavailable setting',true,true,false,['x','check'])}<button class="TextButton us-outline-button" type="button" data-play="${key}">Toggle this column</button></article>`).join('');
const css = `
body{margin:0;background:var(--bg-page);color:var(--text-base);font:15px/1.6 var(--font-ui)}main{max-width:1180px;margin:auto;padding:40px 24px}h1,h2,h3{color:var(--text-strong)}h1{font-size:32px;margin:8px 0}h2{font-size:23px;margin:8px 0}h3{font-size:13px;margin:24px 0 8px}.intro{max-width:760px}.eyebrow{font-size:12px;font-weight:700;color:var(--text-muted)}.comparison{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}article{min-width:0;background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;padding:24px}.description{min-height:100px}.toolbar{display:flex;gap:16px;align-items:center;flex-wrap:wrap;padding:20px 0}.toolbar label{display:flex;align-items:center;gap:8px;min-height:44px}article>button{margin-top:24px}.note{padding:18px 0;color:var(--text-muted)}
.toggle-trial [data-motion] .trial-symbol .ti{visibility:visible;transition:opacity 160ms,transform 160ms}.toggle-trial .trial-symbol-on{opacity:0;transform:scale(.6)}.toggle-trial input:checked + .trial-track .trial-symbol-off{visibility:visible;opacity:0;transform:scale(.6)}.toggle-trial input:checked + .trial-track .trial-symbol-on{visibility:visible;opacity:1;transform:scale(1)}
.toggle-trial [data-motion="spring"] .trial-track:after,.toggle-trial [data-motion="pulse"] .trial-track:after,.toggle-trial [data-motion="spring"] .trial-symbol,.toggle-trial [data-motion="pulse"] .trial-symbol{transition:inset-inline-start 240ms cubic-bezier(.22,1.35,.5,1)}
.toggle-trial [data-motion="spring"] .trial-symbol .ti,.toggle-trial [data-motion="pulse"] .trial-symbol .ti{transition:opacity 160ms,transform 240ms cubic-bezier(.22,1.5,.5,1)}
.toggle-trial [data-motion="spring"] .is-moving .trial-track:after,.toggle-trial [data-motion="pulse"] .is-moving .trial-track:after{animation:thumb-squash 240ms ease-out}
.toggle-trial [data-motion="pulse"] .trial-track:before{content:'';position:absolute;inset:-1px;border:2px solid var(--accent);border-radius:inherit;opacity:0;pointer-events:none}
.toggle-trial [data-motion="pulse"] .trial-navy .trial-track:before{border-color:var(--brand-600)}
.toggle-trial [data-motion="pulse"] .is-moving .trial-track:before{animation:track-pulse 360ms ease-out}
@keyframes thumb-squash{0%,100%{transform:scale(1)}35%{transform:scale(1.18,.88)}75%{transform:scale(.96,1.04)}}
@keyframes track-pulse{0%{transform:scale(1);opacity:.38}100%{transform:scale(1.32,1.55);opacity:0}}
.reduce-motion .toggle-trial *,.reduce-motion .toggle-trial *:before,.reduce-motion .toggle-trial *:after{animation:none!important;transition:none!important}
@media(prefers-reduced-motion:reduce){.toggle-trial *,.toggle-trial *:before,.toggle-trial *:after{animation:none!important;transition:none!important}}
@media(forced-colors:active){.toggle-trial [data-motion="pulse"] .trial-track:before{display:none}}
@media(max-width:850px){.comparison{grid-template-columns:1fr}.description{min-height:0}main{padding:24px 16px}}
`;
const script = `
const timers=new WeakMap();
function changed(input){
  const label=input.closest('.trial-switch');
  clearTimeout(timers.get(label));label.classList.remove('is-moving');
  void label.offsetWidth;
  label.classList.add('is-moving');
  timers.set(label,setTimeout(()=>label.classList.remove('is-moving'),380));
}
document.querySelectorAll('.trial-switch input').forEach(input=>input.addEventListener('change',()=>changed(input)));
function toggleGroup(scope){const inputs=[...scope.querySelectorAll('.trial-switch input:not(:disabled)')];const next=!inputs.every(input=>input.checked);inputs.forEach(input=>{if(input.checked!==next){input.checked=next;changed(input)}})}
document.querySelectorAll('[data-play]').forEach(button=>button.addEventListener('click',()=>toggleGroup(button.closest('article'))));
document.getElementById('all').addEventListener('click',()=>toggleGroup(document.querySelector('.comparison')));
const reduced=document.getElementById('reduce');
reduced.addEventListener('change',()=>document.body.classList.toggle('reduce-motion',reduced.checked));
const media=matchMedia('(prefers-reduced-motion: reduce)');
function reportMotion(){document.getElementById('motion-status').textContent=media.matches?'Your device requests reduced motion; all examples change instantly.':'Device motion is enabled. Use the checkbox to compare instant state changes.'}
media.addEventListener('change',reportMotion);reportMotion();
`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Union Suite — Toggle motion comparison</title><style>${foundation}\n${trial.css}\n${dayNight.css}\n${favourites.css}\n${css}</style></head><body><main><div class="eyebrow">UNION SUITE / INTERACTION TRIAL</div><h1>Give the switch a little life.</h1><p><a href="#dark-mode-favourites">Jump to the new dark-mode favourites ↓</a></p><p class="intro">Three motion treatments on the same rounded toggle. Try each switch, or toggle all three columns together to compare the timing. These are local demonstrations; no settings are saved.</p><div class="toolbar"><button id="all" type="button" class="TextButton PrimaryButton">Toggle all examples</button><label><input id="reduce" type="checkbox"> Preview reduced motion</label></div><p id="motion-status" role="status"></p><section class="toggle-trial comparison" aria-label="Toggle animation options">${cards}</section>${favourites.markup}${dayNight.markup}<p class="note"><strong>Suggested default: Spring.</strong> It adds a small tactile response without the extra halo. All options support Tab and Space, disabled states and your device’s reduced-motion preference. Rapid clicks reverse the movement and restart the effect.</p><p><a href="Button-Reference.html#toggle-switches">Back to button and toggle styling</a> · <a href="../Theme/UnionSuite-Guides/Usage-Guide.html#buttons">Usage guide</a></p></main><script>${script}\n${dayNight.script}\n${favourites.script}</script></body></html>`;
fs.writeFileSync(path.join(root,'references/Toggle-Motion-Comparison.html'),html);
console.log('Built references/Toggle-Motion-Comparison.html');
