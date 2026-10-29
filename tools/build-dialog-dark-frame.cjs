// Reproduce the reported classic table-based Bootstrap window and white resize rails.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
let html=require('../Theme/UnionSuite-Guides/usage/build/dialog-chrome-example.cjs').documentHtml();
html=html.replace('<html lang="en"','<html data-us-color-scheme="dark" lang="en"');
html=html.replace('class="RadWindow RadWindow_Bootstrap"','class="RadWindow RadWindow_Bootstrap rwNormalWindow rwTransparentWindow"');
html=html.replace('<td class="rwTitlebar">','<td class="rwCorner rwTopLeft">&nbsp;</td><td class="rwTitlebar">');
html=html.replace('</table></td></tr><tr><td class="rwWindowContent">','</table></td><td class="rwCorner rwTopRight">&nbsp;</td></tr><tr class="rwContentRow"><td class="rwCorner rwBodyLeft">&nbsp;</td><td class="rwWindowContent">');
html=html.replace('</div></td></tr></table></div>','</div></td><td class="rwCorner rwBodyRight">&nbsp;</td></tr><tr class="rwFooterRow"><td class="rwCorner rwFooterLeft">&nbsp;</td><td class="rwFooterCenter">&nbsp;</td><td class="rwCorner rwFooterRight">&nbsp;</td></tr></table></div>');
html=html.replace('</style>',`</style><style>
/* Simulated native chrome only; shared dark CSS must override these colours. */
body{background:#10191e}.RadWindow_Bootstrap .rwCorner,.RadWindow_Bootstrap .rwFooterCenter{background:white;width:8px;padding:0;line-height:8px}.RadWindow_Bootstrap .rwTitlebarControls em{color:#333}
</style><style>${fs.readFileSync(path.join(root,'Theme/UnionSuite/zzDarkMode.css'),'utf8')}</style>`);
html=html.replace('Add volunteer availability','Document System');
fs.writeFileSync(path.join(root,'references/Dialog-Dark-Frame.html'),html);
console.log('Built references/Dialog-Dark-Frame.html');
