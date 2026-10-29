// Compatibility entry point. Maintained implementation: Theme/UnionSuite-Guides/usage/build/iqa-expand-example.cjs
'use strict';
const implementation = require.resolve("../Theme/UnionSuite-Guides/usage/build/iqa-expand-example.cjs");
if (require.main === module) {
  const result = require('node:child_process').spawnSync(process.execPath, [implementation, ...process.argv.slice(2)], {stdio: 'inherit'});
  if (result.error) throw result.error;
  process.exitCode = result.status === null ? 1 : result.status;
} else {
  module.exports = require(implementation);
}
