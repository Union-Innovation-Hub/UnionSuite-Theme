// Compatibility entry point. Maintained implementation: Theme/UnionSuite-Guides/usage/build/list-template-examples.cjs
'use strict';
const implementation = require.resolve("../Theme/UnionSuite-Guides/usage/build/list-template-examples.cjs");
if (require.main === module) {
  const result = require('node:child_process').spawnSync(process.execPath, [implementation, ...process.argv.slice(2)], {stdio: 'inherit'});
  if (result.error) throw result.error;
  process.exitCode = result.status === null ? 1 : result.status;
} else {
  module.exports = require(implementation);
}
