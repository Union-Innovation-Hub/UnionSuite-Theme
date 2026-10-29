const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {frameDocument} = require('../Theme/UnionSuite-Guides/usage/build/taskbar-preview.cjs');

// Keep the Biscuit review URL working, now using the approved production assets.
// Its fixture has a separate daily key so either preview can be replayed alone.
function biscuitDocument() {
  return frameDocument().replaceAll('union-suite:preview:pip-greeting:', 'union-suite:preview:biscuit-greeting:');
}

module.exports = {biscuitDocument};

if (require.main === module) {
  const destination = path.join(__dirname, '../references/Taskbar-Biscuit-Preview.html');
  const document = biscuitDocument();
  if (process.argv.includes('--check')) {
    assert.equal(fs.readFileSync(destination, 'utf8'), document, 'Biscuit preview needs rebuilding');
    console.log('Biscuit taskbar preview is current');
  } else {
    fs.writeFileSync(destination, document);
    console.log('Built production Biscuit taskbar preview');
  }
}
