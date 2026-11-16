// Load before Scripts/UnionSuiteTaskbar.js, then reload the page after changes.
// The legacy pipGreeting name now controls Biscuit; existing settings still work.
window.UnionSuiteTaskbarConfig = {
  ...window.UnionSuiteTaskbarConfig,
  pipGreeting: true // true = daily greeting; false = no Biscuit or reserved space.
};

// Read at each CCO tab click, so this file may load before or after zUnionSuite.js.
window.UnionSuiteCcoSwitchConfig = {
  ...window.UnionSuiteCcoSwitchConfig,
  enabled: true // true = CCO tabs switch in place; false = every CCO uses native page reloads.
};

// Read whenever the sidebar refreshes, so this file may load before or after zUnionSuite.js.
// Applies to CCOs with us-cco-rail (tab search above the sidebar's tabs).
window.UnionSuiteCcoSidebarConfig = {
  ...window.UnionSuiteCcoSidebarConfig,
  search: true,     // false hides the tab search box.
  searchMinTabs: 8  // Show search once the menu has at least this many tabs.
};
