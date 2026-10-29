const fs=require('node:fs');
const guide='Theme/UnionSuite/guides/usage/source/Usage-Guide.source.html';
fs.writeFileSync(guide,fs.readFileSync(guide,'utf8').replace('Management shortcuts are generated before Pip’s reserved section and Quick Search, with vertical dividers between the sections:', 'Management shortcuts follow Pip’s reserved space, with the existing vertical divider between the icons and Quick Search:'));
const index='references/index.html';
fs.writeFileSync(index,fs.readFileSync(index,'utf8').replace('dedicated mascot section beside the shortcuts, replay/reload controls and fictional search responses.', 'Pip on the header edge to the left of the shortcuts, with replay/reload controls and fictional search responses.'));
