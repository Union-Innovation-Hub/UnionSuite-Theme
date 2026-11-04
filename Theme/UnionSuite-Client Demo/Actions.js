/* Client action definitions and explicit overrides.
   Load once AFTER UnionSuite/zUnionSuite.js, business helpers and
   UnionSuite/Scripts/ActionDefinitions.js. Never include in replaced iParts.

   Use UnionSuiteActions.define(key, {className, owner, source,
     presentation:{...}, context:{...}, action:{...}}) for a new action.
   Use UnionSuiteActions.configure(key, FULL_DEFINITION) for an intentional
   replacement. Do not redeclare a standard key with a second owner/source.

   No Home/Case task editor or permission endpoint has been supplied yet.
   Add those verified integrations here; the theme does not invent them.
   Full template: Usage-Guide.html#unified-action-route
*/
(function () {
  'use strict';
  if (!window.UnionSuiteActions?.define) throw new Error('Load the shared action runtime before client Actions.js.');
})();
