# Panel actions and shared report behavior

The unified registry is implemented. Its current contract replaces the earlier business-action proposal in this file.

- [Usage guide: full template, options, visuals and execution route](Theme/UnionSuite-Guides/Usage-Guide.html#unified-action-route)
- [Execution contract](../references/Unified-Action-Execution-Contract.md)
- [Conversion checklist and exact old-to-new mappings](../references/Unified-Action-Conversion-Checklist.md)
- [Current function inventory](../references/Theme-Button-Function-Inventory.md)
- [Legacy helper cleanup status](../references/Helper-Cleanup-Status.md)
- [Interactive comparison](references/Unified-Action-Comparison.html)

Shared runtime lives in zUnionSuite.js. Standard definitions live in Scripts/ActionDefinitions.js; site definitions belong in UnionSuite-Client/Actions.js. Load once in order. The iPart CSS class field creates an inner wrapper around the native panel. A registered us-action-AREA-COMMAND class on that wrapper requests its heading action; the same class can be used on an authored button/link, menu item or row control.

Native report utilities remain separate: filters, sorting, paging, export, expansion and column controls retain their existing behavior. UnionSuiteIqaFilters exposes refresh/getActionSlot/restoreReport; UnionSuiteRefresh executes native report refreshes; UnionSuiteActions owns business definitions. UnionSuiteIqaRefresh is the existing visual refresh-overlay controller, not the native request service.

Business actions explicitly declare presentation, context and operation. Context requirements disable invalid instances. Repeated instances are valid; competing definitions warn and block. Job Edit/Delete use the clicked row's context and originating report, including after replacement. Custom functions and multi-target refresh callbacks remain supported.

The local implementation is complete; published CMS/SQL conversion, deployment and live server validation are pending. Retain required legacy member helpers until the cleanup inventory's remaining callers have been migrated.
