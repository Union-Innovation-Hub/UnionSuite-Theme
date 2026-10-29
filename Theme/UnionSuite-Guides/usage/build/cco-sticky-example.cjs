const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'../../../..');
exports.documentHtml=function(){
 let html=require('./build-tab-display-options.cjs').frameDocument('sticky-cco','vertical',5,2,false);
 const css=fs.readFileSync(path.join(root,'Theme/UnionSuite/zUnionSuite.css'),'utf8');
 const js=fs.readFileSync(path.join(root,'Theme/UnionSuite/zUnionSuite.js'),'utf8');
 html=html.replace('</head>',()=>`<style>${css}\nbody{padding-top:64px}#hd{position:fixed;top:0;left:0;right:0;height:48px;background:var(--brand-900);color:white;z-index:1031;padding:12px 20px}.us-banner{margin-bottom:16px}.us-cco-sticky-tabs>.cco>.RadMultiPage>.rmpView{min-height:1300px}.standalone-demo{min-height:500px}#sticky-toggle{margin-right:8px}</style></head>`);
 html=html.replace('<div class="cco tabs-wrapper tabs-vertical',`<div id="hd">Sample fixed site header</div><div class="ContentItemContainer"><div class="us-banner us-banner-collapsible"><header class="us-banner__surface"><div class="us-banner__summary"><div class="us-banner__identity"><span class="us-banner__eyebrow">Member profile example</span><h1 class="us-banner__title">Alex Morgan</h1><p class="us-banner__subtitle">Scroll inside this example to condense the banner.</p></div></div><div class="us-banner__details">The tab list stays below the banner. Keep scrolling past the CCO to see it stop.</div></header></div></div><p><label><input id="sticky-toggle" type="checkbox" checked>Enable us-cco-sticky-tabs</label></p><div id="sticky-owner" class="us-cco-sticky-tabs"><div class="cco tabs-wrapper tabs-vertical`);
 html=html.replace('<section class="standalone-demo">','</div><section class="standalone-demo">');
 // A replacer function: the theme JS contains "$'", which a replacement string would expand.
 html=html.replace('</body>',()=>`<script>${js}</script><script>document.getElementById('sticky-toggle').addEventListener('change',e=>document.getElementById('sticky-owner').classList.toggle('us-cco-sticky-tabs',e.target.checked));</script></body>`);
 return html;
};
if(require.main===module){fs.writeFileSync(path.join(root,'references/CCO-Sticky-Tabs.html'),exports.documentHtml());console.log('Built references/CCO-Sticky-Tabs.html')}
