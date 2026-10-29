const fs=require('fs');const r=p=>fs.readFileSync(p,'utf8'),w=(p,s)=>fs.writeFileSync(p,s);
let p='tools/build-banner-status-final.cjs',s=r(p);
s=s.replace("html=html.replace('<aside>'",`html=html.replaceAll('us-banner trial rail','us-banner trial member-preview').replaceAll('member-preview compact','member-preview compact us-banner--compact').replaceAll('<header class="us-banner__surface">','<header class="us-banner__surface us-banner__surface--member" data-us-status-colour="#23845B">').replaceAll('class="status-slot"','class="status-slot us-banner__badge us-banner__badge--member-status"');
html=html.replace('<aside>'`);
s=s.replace('Refinement preview · sample actions only · not yet promoted to the production theme','Shared member profile banner · sample actions only');
w(p,s);
w('prototypes/legacy/banner-status-final.css',`/* Preview layout only; member appearance lives in zUnionSuite.css. */
.status-final #action-feedback{margin-top:24px;min-height:24px;font-size:14px}
.status-final .trial .us-banner__surface{overflow:visible}
.status-final .compact .us-banner__nav{margin-top:8px}
.status-final .us-banner__nav[hidden]{display:none}
`);
p='prototypes/legacy/banner-status-comparison.js';s=r(p).replace("colour.value=source;","document.querySelectorAll('.us-banner__surface--member').forEach(n=>n.setAttribute('data-us-status-colour',source));\n  window.UnionSuiteMemberStatus?.refresh();\n  colour.value=source;");w(p,s);
p='Theme/UnionSuite/guides/usage/source/Usage-Guide.source.html';s=r(p);
const start=s.indexOf('<p class="note">Design trial:');const end=s.indexOf('</p>',start);
if(start>=0)s=s.slice(0,start)+'<p class="note"><strong>Implemented:</strong> the <a href="../../references/Banner-Status-Final.html">member profile banner</a> uses a status rail, matching pill and glass Actions button. <a href="../../references/Banner-Status-Comparison.html">Earlier comparisons</a> remain available for reference.</p>'+s.slice(end+4);
const docs=`
<h3 id="member-profile-banner">Member profile banner — status and Actions</h3>
<p>Use <button type="button" data-copy-text="us-banner us-banner-collapsible"><code>us-banner us-banner-collapsible</code></button> in the Query Template Display iPart CSS class field. iMIS inserts this wrapper inside ContentItemContainer; do not copy outer wrappers into the IQA template. Return one result for the current member.</p>
<p>Add <button type="button" data-copy-text="us-banner__surface--member"><code>us-banner__surface--member</code></button> alongside <code>us-banner__surface</code> on the inner header. Put <button type="button" data-copy-text="data-us-status-colour"><code>data-us-status-colour</code></button> on that header, and <button type="button" data-copy-text="us-banner__badge--member-status"><code>us-banner__badge--member-status</code></button> on its status badge.</p>
<p>The IQA supplies <code>StatusDescription</code> (plain text) and <code>StatusColour</code> (a six-digit hex, including #). Rename these aliases to match your query. Encode query values for their HTML/attribute context. Any client-defined status is supported; the theme does not determine membership status.</p>
<p>The 8px left rail, pill and selected-tab underline share the derived display colour. White pill text always has at least 4.5:1 contrast: lighter colours are darkened without changing the supplied attribute. Invalid or absent colours use #596579; an empty pill reads “Status unavailable”. Dark display colours gain a 2px light inner separator. Pale outer edges are unnecessary after contrast adjustment. Vertical pill padding is 7px expanded and 3px collapsed. The orange top border is removed only for member banners.</p>
<p>Member Quick Actions uses a translucent glass finish with hover/open highlights, inset press shading and a white keyboard focus ring. Reduced-motion preferences remove its transitions. The menu uses the shared action controller and existing member popup mappings; load the site’s popup functions before using commands. No inline onclick is needed.</p>
<p>Optional banner tabs keep a faint selected fill, white semibold text and the status-coloured underline. Tab content integration still requires an adapter; styling does not replace the CCO or implement content loading. Keep tabs outside the details block so they remain visible when collapsed.</p>
<p>Load the shared CSS and JS once. Status styling works independently of sticky scrolling and refreshes after partial replacement or a changed colour attribute. <code>UnionSuiteMemberStatus.refresh()</code> is available for explicit refresh. Without JavaScript the neutral fallback remains. <code>us-report-no-styling</code> opts out. Component variables are <code>--member-status-colour</code> and <code>--member-status-inner-edge</code>; JS derives them per header, so configure the input attribute rather than overriding these outputs.</p>
`;
s=s.replace('{{CONTACT_DEMO}}',docs+'\n{{CONTACT_DEMO}}');w(p,s);
p='Theme/UnionSuite/guides/usage/build/build-theme-usage.cjs';s=r(p).replace("staticBanner('Contact banner',snippets.contact[1])","staticBanner('Contact banner',snippets.contact[1].replaceAll('{#query.StatusColour}', '#23845B').replaceAll('{#query.StatusDescription}', 'Financial member'))");
s=s.replace('<body><div class="us-banner">${markup}</div></body>','<body><div class="ContentItemContainer"><div class="us-banner">${markup}</div></div></body>');
// Action CSS is needed by the member example as well as the full demo.
s=s.replace('${bannerCss}\\n${clientRoots}\\nbody','${bannerCss}\\n${actionCss}\\n${clientRoots}\\nbody');
w(p,s);
