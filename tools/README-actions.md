# Unified action verification

Run from the project root. Browser suites use the workspace Playwright installation and headless Edge. No live API writes are made; requests, native popup windows and ASP.NET completion are simulated. The lifecycle suite also reads the supplied `../API Reference/Asi.js` forwarding function.

```powershell
node tools/test-unified-actions.cjs
node tools/test-unified-action-lifecycle.cjs
node tools/test-member-actions.cjs
node tools/test-query-display-wrappers.cjs
node tools/test-query-search.cjs
node tools/test-query-empty.cjs
node tools/test-iqa-defaults.cjs
node tools/build-home-preview.cjs
node tools/test-home-task-helpers.cjs
node Theme/UnionSuite-Guides/usage/build/build-banner-preview.cjs
node Theme/UnionSuite-Guides/usage/build/build-theme-usage.cjs
node Theme/UnionSuite-Guides/usage/build/build-theme-usage.cjs --check
node tools/test-unified-action-presentations.cjs
```

The unified suites replace the retired report-icon, menu-registry, popup and conflict API tests. They cover repeated records, source-scoped refresh after replacement, sequential multi-report refresh, cancellation/listener cleanup, duplicate and shared-class conflicts, invalid/pending context, permissions, stale asynchronous inputs, popup argument/lifecycle handling, refresh-only recovery and toolbar ordering. Presentation checks exercise the offline guide, all four placements, keyboard/menu interaction, warning recovery, copy targets and narrow layouts.

Native report/filter and task regression suites remain separate. Published CMS conversion, real Telerik save/cancel behavior, server authorization and native request routing require live iMIS verification after deployment.
