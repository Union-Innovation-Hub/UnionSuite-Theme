/**
 * UnionSuite taskbar — bookmarks, command palette and Recents.
 *
 * Trial feature, deliberately standalone: it injects its own stylesheet and
 * carries its own destination catalogue so it can be deployed as one file
 * beside UnionSuiteTaskbar.js. Nothing here edits the taskbar script, the
 * shared theme CSS or the usage guide. When this is promoted, the styles
 * belong in zUnionSuite.css/zzDarkMode.css and the code splits into the
 * modules named in THEME-ENHANCEMENTS-INTEGRATION-PLAN.md.
 *
 * Implements the Option C design approved on 20 September 2026:
 * up to five bookmark icons in the taskbar's main row, a toggleable labelled
 * bar holding all bookmarks with Recents at its right, and a centred command
 * palette opened from "Go to…" or Ctrl+Space.
 *
 * Install after UnionSuiteTaskbar.js:
 *   <script src="/App_Themes/YOUR_THEME/Scripts/UnionSuiteTaskbar.js" defer></script>
 *   <script src="/App_Themes/YOUR_THEME/Scripts/UnionSuiteTaskbar-Bookmarks.js" defer></script>
 *
 * Optional, and must precede this file:
 *   window.UnionSuiteTaskbarBookmarksConfig = { stripLimit: 5 };
 *
 * Dependencies and integration points:
 * - Replaces the taskbar's four management shortcuts (.us-taskbar__quick-links).
 * - Uses window.Fuse for fuzzy palette search when a Fuse build is loaded,
 *   and falls back to built-in token matching when it is absent.
 * - Saves bookmarks to the iMIS business object i4u_UT_UserSettings under the
 *   SettingsKey below: one row per user holding a JSON array of destination ids.
 * - Reads Recents from four IQAs through GET /api/query.
 * - Opens Recents items with the iMIS page function ShowDialog_NoReturnValue.
 *
 * Known limits of this trial:
 * - Catalogue icons are the placeholder "point" and shortName values are derived
 *   from the destination name. Both are per-entry values meant to be edited.
 * - UpdatedOn arrives without a timezone and is read as browser-local time.
 */
(function () {
  'use strict';

  if (window.UnionSuiteTaskbarBookmarks) return;

  /* ── settings ────────────────────────────────────────── */

  // Set UnionSuiteTaskbarBookmarksConfig before this file to override these.
  const settings = Object.freeze({
    // Five is a maximum, including on narrow screens, per the approved design.
    stripLimit: 5,
    recentsLimit: 10,
    recentsQueries: {
      iqa: {
        mine: '$/_i4u_/Core/Admin/Taskbar/Recent IQAs - User',
        sitewide: '$/_i4u_/Core/Admin/Taskbar/Recent IQAs - All'
      },
      content: {
        mine: '$/_i4u_/Core/Admin/Taskbar/Recent Content Pages - User',
        sitewide: '$/_i4u_/Core/Admin/Taskbar/Recent Content Pages - All'
      }
    },
    // iMIS opens both editors in its own dialog; IsPopup=true gives popup chrome.
    editorUrls: {
      iqa: '/iMIS/QueryBuilder/Design.aspx?iMode=Edit&TemplateType=E&iUniformKey={key}&iOperation=Edit&DocumentTypeCode=IQD&IsPopup=true',
      content: '/AsiCommon/Controls/ContentManagement/ContentDesigner/ContentRecordEdit.aspx?iMode=Edit&iUniformKey={key}&iOperation=Edit&TemplateType=E&DocumentTypeCode=CON&IsPopup=true'
    },
    // Matches the native iMIS editor dialogs (Edit Panel and others open at 95%).
    dialogSize: { width: '95%', height: '95%' },
    settingsEntity: 'i4u_UT_UserSettings',
    settingsKey: 'Taskbar-Bookmarks',
    // One row per user is expected; read a few so duplicates are visible.
    settingsRowLimit: 20,
    // Bar visibility is a per-browser display choice, like the appearance
    // switch, so it uses local storage rather than the saved bookmark row.
    barStoragePrefix: 'union-suite:taskbar-bookmarks-bar:',
    // i4u_UT_UserSettings.Value is nvarchar(3999).
    settingsValueLimit: 3999,
    ...window.UnionSuiteTaskbarBookmarksConfig
  });

  /* ── destination catalogue ───────────────────────────── */

  /**
   * Generated from "command-palette-catalogue - reviewed.csv". The two isTag
   * rows (Event Code Lookup, Username Lookup) are excluded: smart-tag lookups
   * are not part of this trial. isShortcut is carried through unused.
   *
   * `id` is the stable key saved against the user; it must not change when a
   * name or url is edited. `icon` is a Tabler name without the "ti-" prefix and
   * `shortName` is the label shown in the bookmarks bar — both are placeholders.
   */
  const destinations = [
    {id: "community.committees-manage-committees", name: "Committees: Manage Committees", shortName: "Committees", category: "Community", icon: "users-group", url: "/AsiCommon/Controls/CommitteeManagement/CommitteeListDisplay.aspx", keywords: "", isShortcut: false},
    {id: "community.communities", name: "Communities", shortName: "Communities", category: "Community", icon: "building-community", url: "/iCore/Communities/Communities.aspx", keywords: "", isShortcut: false},
    {id: "community.groups", name: "Groups", shortName: "Groups", category: "Community", icon: "users", url: "/iCore/Groups/Find_Groups.aspx", keywords: "", isShortcut: false},
    {id: "community.community-dashboard", name: "Community Dashboard", shortName: "Community Dashboard", category: "Community", icon: "layout-dashboard", url: "/StaffCommunityLanding", keywords: "", isShortcut: true},
    {id: "community.find-contacts", name: "Find Contacts", shortName: "Find Contacts", category: "Community", icon: "user-search", url: "/StaffFindContacts", keywords: "search", isShortcut: true},
    {id: "community.add-contact", name: "Add Contact", shortName: "Add Contact", category: "Community", icon: "user-plus", url: "/StaffAddContact", keywords: "new", isShortcut: true},
    {id: "community.volunteer-dashboard", name: "Volunteer Dashboard", shortName: "Volunteer Dashboard", category: "Community", icon: "heart-handshake", url: "/StaffVolunteersLanding", keywords: "", isShortcut: true},
    {id: "data.data-integrity-dashboard", name: "Data Integrity Dashboard", shortName: "Data Integrity Dashboard", category: "Data", icon: "shield-check", url: "/DataIntegrityDashboard", keywords: "qa quality assurance", isShortcut: true},
    {id: "events.browse-events", name: "Browse Events", shortName: "Browse Events", category: "Events", icon: "calendar-search", url: "/iCore/Events/Events_List.aspx", keywords: "meeting", isShortcut: false},
    {id: "events.find-event-registrants", name: "Find Event Registrants", shortName: "Find Event Registrants", category: "Events", icon: "list-search", url: "/iCore/Events/Registrations/Find-registrations.aspx", keywords: "meeting event registrants attendees list report", isShortcut: false},
    {id: "events.events-dashboard", name: "Events Dashboard", shortName: "Events Dashboard", category: "Events", icon: "layout-dashboard", url: "/StaffEventsLanding", keywords: "", isShortcut: true},
    {id: "events.events", name: "Events", shortName: "Events", category: "Events", icon: "calendar-event", url: "/StaffFindEvents", keywords: "event search", isShortcut: true},
    {id: "events.add-event", name: "Add Event", shortName: "Add Event", category: "Events", icon: "calendar-plus", url: "/iCore/Events/Manage/Event_Add.aspx", keywords: "", isShortcut: false},
    {id: "events.event-calendar", name: "Event Calendar", shortName: "Event Calendar", category: "Events", icon: "calendar-month", url: "/iCore/Events/Events_Calendar.aspx", keywords: "", isShortcut: false},
    {id: "events.issue-event-confirmations", name: "Issue Event Confirmations", shortName: "Issue Event Confirmations", category: "Events", icon: "send", url: "/iCore/Events/Manage/Issue_event_confirmations.aspx", keywords: "issue confirmations", isShortcut: false},
    {id: "events.manage-event-templates", name: "Manage Event Templates", shortName: "Manage Event Templates", category: "Events", icon: "template", url: "/iCore/Events/Manage/Manage_templates.aspx", keywords: "event templates", isShortcut: false},
    {id: "finance.finance-dashboard", name: "Finance Dashboard", shortName: "Finance Dashboard", category: "Finance", icon: "report-money", url: "/FinanceDashboard", keywords: "", isShortcut: true},
    {id: "membership.membership-dashboard", name: "Membership Dashboard", shortName: "Membership Dashboard", category: "Membership", icon: "id-badge", url: "/StaffMembershipLanding", keywords: "", isShortcut: true},
    {id: "rise.intelligent-query-architect", name: "Intelligent Query Architect", shortName: "Intelligent Query Architect", category: "RiSE", icon: "file-search", url: "/AsiCommon/Controls/IQA/Default.aspx", keywords: "IQA builder", isShortcut: false},
    {id: "rise.intelligent-query-architect-new-query", name: "Intelligent Query Architect: New Query", shortName: "Intelligent Query Architect", category: "RiSE", icon: "file-plus", url: "/iMIS/QueryBuilder/Design.aspx?iMode=New&iUniformKey=00000000-0000-0000-0000-000000000000&iOperation=New&iFolderHierarchyKey=d2c71101-e31c-4dcf-830f-8647236f99f2&DocumentTypeCode=IQD&CloseWindowOnCommit=true", keywords: "IQA builder", isShortcut: false},
    {id: "rise.business-object-designer", name: "Business Object Designer", shortName: "Business Object Designer", category: "RiSE", icon: "database", url: "/AsiCommon/Controls/BOA/Default.aspx?ShowDescription=True", keywords: "bod biz", isShortcut: false},
    {id: "rise.business-object-designer-new-business-object", name: "Business Object Designer: New Business Object", shortName: "Business Object Designer", category: "RiSE", icon: "database-plus", url: "/AsiCommon/Controls/BOA/Design.aspx?iMode=New&iOperation=New&iFolderHierarchyKey=1bd68892-ef47-4bc0-b873-3ce0134f9a9c&DocumentTypeCode=BOD", keywords: "bod biz designer", isShortcut: false},
    {id: "rise.document-system", name: "Document System", shortName: "Document System", category: "RiSE", icon: "folders", url: "/AsiCommon/Controls/BSA/DocumentBrowser.aspx?ExcludeAddTypes=ATH%2cBOD%2cCFL%2cCOM%2cCON%2cLAY%2cNAV%2cRCT%2cTCT%2cWEB%2cWSL%2cWST&ShowDescription=True", keywords: "iqa query content everything", isShortcut: false},
    {id: "rise.manage-sitemaps", name: "Manage Sitemaps", shortName: "Manage Sitemaps", category: "RiSE", icon: "sitemap", url: "/iMIS/ContentManagement/PerspectiveList.aspx", keywords: "menu urls", isShortcut: false},
    {id: "rise.manage-websites", name: "Manage Websites", shortName: "Manage Websites", category: "RiSE", icon: "world", url: "/iMIS/ContentManagement/WebsiteList.aspx", keywords: "", isShortcut: false},
    {id: "rise.manage-shortcuts", name: "Manage Shortcuts", shortName: "Manage Shortcuts", category: "RiSE", icon: "link", url: "/AsiCommon/Controls/ContentManagement/URLMapping.aspx", keywords: "", isShortcut: false},
    {id: "rise.communication-templates", name: "Communication Templates", shortName: "Communication Templates", category: "RiSE", icon: "mail-opened", url: "/AsiCommon/Controls/BSA/DocumentBrowser.aspx?TypeFilter=COM%2cFOL%2cIQD%2cSRT&iRootFolder=%24%2fCommon%2fCommunications&FolderHierarchyKey=356E5D86-93FE-430B-8F1C-0021B3C012BC", keywords: "emails mass", isShortcut: false},
    {id: "rise.communication-logs", name: "Communication Logs", shortName: "Communication Logs", category: "RiSE", icon: "mail-check", url: "/iCore/Communications/Communication_Logs.aspx", keywords: "emails logs sent received delivered failed", isShortcut: false},
    {id: "rise.manage-content", name: "Manage Content", shortName: "Manage Content", category: "RiSE", icon: "layout", url: "/iMIS/ContentManagement/ContentDesigner.aspx", keywords: "", isShortcut: false},
    {id: "rise.manage-layouts", name: "Manage Layouts", shortName: "Manage Layouts", category: "RiSE", icon: "layout-columns", url: "/iMIS/ContentManagement/ContentLayoutList.aspx", keywords: "bootstrap", isShortcut: false},
    {id: "rise.manage-themes", name: "Manage Themes", shortName: "Manage Themes", category: "RiSE", icon: "palette", url: "/AsiCommon/Controls/BSA/ObjectBrowser.aspx?DocumentPath=%24%2fContentManagement%2fDefaultSystem%2fThemes&iRootFolder=%24%2fContentManagement%2fDefaultSystem%2fThemes&AllowUpwardNavigation=False&ShowDescription=True&TypeFilter=ATH&DisallowDeletionOfRootFolder=False", keywords: "branding css styles appearance", isShortcut: false},
    {id: "rise.manage-images", name: "Manage Images", shortName: "Manage Images", category: "RiSE", icon: "photo", url: "/iMIS/ContentManagement/ImageManager.aspx", keywords: "", isShortcut: false},
    {id: "rise.manage-files", name: "Manage Files", shortName: "Manage Files", category: "RiSE", icon: "files", url: "/AsiCommon/Controls/BSA/ObjectBrowser.aspx?DocumentPath=%24%2fCommon%2fUploaded+files&iRootFolder=%24%2fCommon%2fUploaded+files&AllowUpwardNavigation=False&ShowDescription=True&ExcludeAddTypes=ATH%2cBOD%2cCFL%2cCOM%2cCON%2cEX0%2cEX2%2cEX3%2cEX4%2cEX5%2cEXP%2cIQD%2cLAY%2cMEP%2cNAV%2cOPP%2cRCT%2cRDL%2cRFM%2cRSP%2cTCT%2cWEB%2cWFD%2cWLT%2cWSL%2cWST", keywords: "upload download attachments", isShortcut: false},
    {id: "rise.website-templates", name: "Website Templates", shortName: "Website Templates", category: "RiSE", icon: "browser", url: "/iMIS/ContentManagement/WebsiteTemplateList.aspx", keywords: "", isShortcut: false},
    {id: "rise.website-layouts", name: "Website Layouts", shortName: "Website Layouts", category: "RiSE", icon: "layout-grid", url: "/iMIS/ContentManagement/WebsiteLayoutList.aspx", keywords: "bootstrap", isShortcut: false},
    {id: "rise.publishing-servers", name: "Publishing Servers", shortName: "Publishing Servers", category: "RiSE", icon: "server", url: "/iMIS/ContentManagement/PublishServerList.aspx", keywords: "", isShortcut: false},
    {id: "rise.panel-definitions", name: "Panel Definitions", shortName: "Panel Definitions", category: "RiSE", icon: "layout-list", url: "/iParts/Common/PanelEditor/PanelDefinitionList.aspx", keywords: "", isShortcut: false},
    {id: "rise.process-automation-browse", name: "Process Automation: Browse", shortName: "Process Automation", category: "RiSE", icon: "settings-automation", url: "/iParts/Common/PanelEditor/PanelDefinitionList.aspx", keywords: "", isShortcut: false},
    {id: "rise.process-automation-logs", name: "Process Automation: Logs", shortName: "Process Automation", category: "RiSE", icon: "history", url: "/iCore/Tasks/Process_automation.aspx", keywords: "", isShortcut: false},
    {id: "rise.process-automation-new-task-alert", name: "Process Automation: New Task/Alert", shortName: "Process Automation", category: "RiSE", icon: "bell-plus", url: "/iParts/Common/Tasks/TaskEditDialog.aspx", keywords: "", isShortcut: false},
    {id: "settings.committees-manage-committee-positions", name: "Committees: Manage Committee Positions", shortName: "Committees", category: "Settings", icon: "briefcase", url: "/iCore/System_Settings/Contacts/Committee_Positions.aspx", keywords: "", isShortcut: false},
    {id: "settings.committees-committee-minutes-configuration", name: "Committees: Committee Minutes Configuration", shortName: "Committees", category: "Settings", icon: "notes", url: "/iMIS/Setup/Customers/CommitteeMinutes.aspx", keywords: "", isShortcut: false},
    {id: "settings.about-imis", name: "About iMIS", shortName: "About iMIS", category: "Settings", icon: "info-circle", url: "/iMIS/Setup/AboutImis.aspx", keywords: "settings, purge system cache", isShortcut: false},
    {id: "settings.organization", name: "Organization", shortName: "Organization", category: "Settings", icon: "building", url: "/Core/Admin/QuickSetup.aspx", keywords: "default email customer type lower case date time export", isShortcut: false},
    {id: "settings.openid-connect", name: "OpenID Connect", shortName: "OpenID Connect", category: "Settings", icon: "key", url: "/iParts/Internal/Setup/OpenIDProviderSetup.aspx", keywords: "OIDC", isShortcut: false},
    {id: "settings.general-lookup-tables", name: "General Lookup Tables", shortName: "General Lookup Tables", category: "Settings", icon: "table", url: "/iCore/System_Settings/General_Lookup_Tables.aspx", keywords: "", isShortcut: false},
    {id: "settings.contact-settings", name: "Contact Settings", shortName: "Contact Settings", category: "Settings", icon: "user-cog", url: "/iMIS/Setup/SystemConfigPage.aspx?PageName=ContactsGeneral", keywords: "bill organization company administrator address verification service avs regex default country", isShortcut: false},
    {id: "settings.contact-security", name: "Contact Security", shortName: "Contact Security", category: "Settings", icon: "user-shield", url: "/iMIS/Setup/Customers/ContactSecuritySettings.aspx", keywords: "public directory access users members authenticated", isShortcut: false},
    {id: "settings.communication-preferences-view-configuration", name: "Communication Preferences: View Configuration", shortName: "Communication Preferences", category: "Settings", icon: "mail-cog", url: "/iMIS/Setup/Customers/ContactSecuritySettings.aspx", keywords: "marketing opt in opt out gdpr privacy", isShortcut: false},
    {id: "settings.account-management", name: "Account Management", shortName: "Account Management", category: "Settings", icon: "user-circle", url: "/iMIS/Setup/SystemConfigPage.aspx?PageName=AccountManagementRiSE", keywords: "password requirements timeout warning reset username recaptcha spam expiration reset token", isShortcut: false},
    {id: "settings.authentication-password-configuration", name: "Authentication & Password Configuration", shortName: "Authentication & Password Configuration", category: "Settings", icon: "lock", url: "/iMIS/Setup/PasswordExpirationConfiguration.aspx", keywords: "password requirements minimum length expiration reuse timeout length idle mfa multi factor", isShortcut: false},
    {id: "settings.social-media-settings", name: "Social Media Settings", shortName: "Social Media Settings", category: "Settings", icon: "share", url: "/iCore/System_Settings/Authorization_Providers.aspx", keywords: "", isShortcut: false},
    {id: "settings.client-applications-single-sign-on", name: "Client Applications & Single Sign On", shortName: "Client Applications & Single Sign On", category: "Settings", icon: "apps", url: "/iParts/Common/SSO/ClientApplication.aspx", keywords: "sso login redirect refresh token", isShortcut: false},
    {id: "settings.customer-types", name: "Customer Types", shortName: "Customer Types", category: "Settings", icon: "user-check", url: "/imis/Setup/Customers/CustomerType.aspx", keywords: "membertypes member types", isShortcut: false},
    {id: "settings.activity-types-new-activity-type", name: "Activity Types: New Activity Type", shortName: "Activity Types", category: "Settings", icon: "activity", url: "/imis/Setup/Customers/ActivityTypeDialog.aspx", keywords: "", isShortcut: false},
    {id: "settings.relationships-view-relationship-types", name: "Relationships: View Relationship Types", shortName: "Relationships", category: "Settings", icon: "affiliate", url: "/iCore/System_Settings/Contacts/RelationshipTypes.aspx", keywords: "", isShortcut: false},
    {id: "settings.contacts-system-options", name: "Contacts: System Options", shortName: "Contacts", category: "Settings", icon: "adjustments", url: "/iMIS/Setup/Customers/Setup.aspx", keywords: "chapter last id major key phone number format prefix sync address work phone home email fax flow down flow-down organization parent organization pricing", isShortcut: false},
    {id: "settings.address-formats", name: "Address Formats", shortName: "Address Formats", category: "Settings", icon: "address-book", url: "/iCore/System_Settings/Addresses/Address_Formats.aspx", keywords: "formula", isShortcut: false},
    {id: "settings.address-configuration-states-provinces", name: "Address Configuration: States & Provinces", shortName: "Address Configuration", category: "Settings", icon: "map-2", url: "/iCore/Addresses/States-and-Provinces.aspx", keywords: "", isShortcut: false},
    {id: "settings.address-configuration-countries", name: "Address Configuration: Countries", shortName: "Address Configuration", category: "Settings", icon: "flag", url: "/iCore/System_Settings/Addresses/Countries.aspx", keywords: "country", isShortcut: false},
    {id: "settings.communities-settings", name: "Communities: Settings", shortName: "Communities", category: "Settings", icon: "settings-2", url: "/iMIS/Setup/SystemConfigPage.aspx?PageName=CommunitySettings", keywords: "subject notification", isShortcut: false},
    {id: "settings.membership-billing-configurations", name: "Membership & Billing Configurations", shortName: "Membership & Billing Configurations", category: "Settings", icon: "id-badge", url: "/imis/Setup/Billing/BillingSetup.aspx", keywords: "cash accrual annual anniversary paid thru date interval balance start date fiscal year grace chapter administrator billing contact", isShortcut: false},
    {id: "settings.fundraising-configuration", name: "Fundraising Configuration", shortName: "Fundraising Configuration", category: "Settings", icon: "gift", url: "/imis/Setup/Fundraising/Setup.aspx", keywords: "receipt nummber financial entity premium order", isShortcut: false},
    {id: "settings.fundraising-configuration-gift-aid-uk", name: "Fundraising Configuration: Gift Aid (UK)", shortName: "Fundraising Configuration", category: "Settings", icon: "gift", url: "/iMIS/Setup/SystemConfigPage.aspx?PageName=GiftAidUK", keywords: "HMRC gateway contact tax office", isShortcut: false},
    {id: "settings.fundraising-configuration-tribute-types", name: "Fundraising Configuration: Tribute Types", shortName: "Fundraising Configuration", category: "Settings", icon: "heart", url: "/imis/Setup/Fundraising/TributeType.aspx", keywords: "honor memory recognition IHO IMO", isShortcut: false},
    {id: "settings.events-configuration", name: "Events Configuration", shortName: "Events Configuration", category: "Settings", icon: "calendar-cog", url: "/imis/Setup/Events/Setup.aspx", keywords: "additional fields preferences invoices adjustments zoom integration", isShortcut: false},
    {id: "settings.events-configuration-resource-types", name: "Events Configuration: Resource Types", shortName: "Events Configuration", category: "Settings", icon: "box", url: "/imis/Setup/Events/ResourceType.aspx", keywords: "space speaker staff", isShortcut: false},
    {id: "settings.commerce-configuration", name: "Commerce Configuration", shortName: "Commerce Configuration", category: "Settings", icon: "shopping-cart", url: "/iMIS/Setup/SystemConfigPage.aspx?PageName=CommerceGeneral", keywords: "order confirmation communication template default order type cart nocharge", isShortcut: false},
    {id: "settings.commerce-configuration-order-types", name: "Commerce Configuration: Order Types", shortName: "Commerce Configuration", category: "Settings", icon: "receipt", url: "/iMIS/Setup/Commerce/OrderTypes.aspx", keywords: "", isShortcut: false},
    {id: "settings.commerce-configuration-new-order-type", name: "Commerce Configuration: New Order Type", shortName: "Commerce Configuration", category: "Settings", icon: "receipt", url: "/imis/Setup/Commerce/OrderTypesDialog.aspx", keywords: "", isShortcut: false},
    {id: "settings.commerce-configuration-product-categories", name: "Commerce Configuration: Product Categories", shortName: "Commerce Configuration", category: "Settings", icon: "category", url: "/iMIS/Setup/Commerce/ProductCategories.aspx", keywords: "category", isShortcut: false},
    {id: "settings.commerce-configuration-new-product-category", name: "Commerce Configuration: New Product Category", shortName: "Commerce Configuration", category: "Settings", icon: "category", url: "/imis/Setup/Commerce/ProductCategoriesDialog.aspx", keywords: "", isShortcut: false},
    {id: "settings.commerce-configuration-shipping", name: "Commerce Configuration: Shipping", shortName: "Commerce Configuration", category: "Settings", icon: "truck-delivery", url: "/iMIS/Setup/Commerce/FreightRate.aspx", keywords: "", isShortcut: false},
    {id: "settings.commerce-configuration-zones", name: "Commerce Configuration: Zones", shortName: "Commerce Configuration", category: "Settings", icon: "map-pin", url: "/iMIS/Setup/Commerce/FreightZone.aspx", keywords: "", isShortcut: false},
    {id: "settings.commerce-configuration-new-zone", name: "Commerce Configuration: New Zone", shortName: "Commerce Configuration", category: "Settings", icon: "map-pin", url: "/iMIS/Setup/Commerce/FreightZoneDialog.aspx", keywords: "", isShortcut: false},
    {id: "settings.commerce-configuration-system-options", name: "Commerce Configuration: System Options", shortName: "Commerce Configuration", category: "Settings", icon: "shopping-cart-cog", url: "/iMIS/Setup/Commerce/Setup.aspx", keywords: "default shipping add-on sales tax authority inventory gl default general ledger cogs cost of goods sold", isShortcut: false},
    {id: "settings.finance-configuration", name: "Finance Configuration", shortName: "Finance Configuration", category: "Settings", icon: "coin", url: "/imis/Setup/Accounting/Setup.aspx", keywords: "accounting settings default entity entities currency dollar fiscal year prepayment overpayment partial payment refund write-off batch control manual general ledger export gl interface csv file format 3d secure 3ds", isShortcut: false},
    {id: "settings.finance-configuration-financial-entities", name: "Finance Configuration: Financial Entities", shortName: "Finance Configuration", category: "Settings", icon: "building-bank", url: "/imis/Setup/Accounting/FinancialEntities.aspx", keywords: "entity", isShortcut: false},
    {id: "settings.finance-configuration-new-financial-entity", name: "Finance Configuration: New Financial Entity", shortName: "Finance Configuration", category: "Settings", icon: "building-bank", url: "/imis/Setup/Accounting/FinancialEntityCreator.aspx", keywords: "entity", isShortcut: false},
    {id: "settings.finance-configuration-due-to-due-from", name: "Finance Configuration: Due To/Due From", shortName: "Finance Configuration", category: "Settings", icon: "arrows-exchange", url: "/imis/Setup/Accounting/DueToDueFrom.aspx", keywords: "dtdf", isShortcut: false},
    {id: "settings.finance-configuration-general-ledger-accounts", name: "Finance Configuration: General Ledger Accounts", shortName: "Finance Configuration", category: "Settings", icon: "book", url: "/iCore/System_Settings/Finance/General-ledger-accounts.aspx", keywords: "GL", isShortcut: false},
    {id: "settings.finance-configuration-pay-central-settings", name: "Finance Configuration: Pay Central Settings", shortName: "Finance Configuration", category: "Settings", icon: "credit-card", url: "/iCore/System_Settings/Finance/Pay-Central-settings.aspx", keywords: "GL", isShortcut: false},
    {id: "settings.finance-configuration-tax-categories", name: "Finance Configuration: Tax Categories", shortName: "Finance Configuration", category: "Settings", icon: "receipt-tax", url: "/iCore/System_Settings/Finance/TaxCategories.aspx", keywords: "category", isShortcut: false},
    {id: "settings.finance-configuration-tax-codes", name: "Finance Configuration: Tax Codes", shortName: "Finance Configuration", category: "Settings", icon: "receipt-tax", url: "/imis/Setup/Accounting/TaxAuthority.aspx", keywords: "authority", isShortcut: false},
    {id: "settings.finance-configuration-tax-by-zip-code", name: "Finance Configuration: Tax by Zip Code", shortName: "Finance Configuration", category: "Settings", icon: "map-pin", url: "/iCore/Contacts/Zip-codes.aspx?mode=Tax", keywords: "postal", isShortcut: false},
    {id: "settings.finance-configuration-vat-exception-rules", name: "Finance Configuration: VAT Exception Rules", shortName: "Finance Configuration", category: "Settings", icon: "receipt-refund", url: "/imis/Setup/Accounting/VATExceptionRules.aspx", keywords: "value-added added tax", isShortcut: false},
    {id: "settings.finance-configuration-terms", name: "Finance Configuration: Terms", shortName: "Finance Configuration", category: "Settings", icon: "file-text", url: "/iCore/System_Settings/Finance/Terms.aspx", keywords: "", isShortcut: false},
    {id: "settings.finance-configuration-aging", name: "Finance Configuration: Aging", shortName: "Finance Configuration", category: "Settings", icon: "clock-dollar", url: "/imis/Setup/Accounting/Aging.aspx", keywords: "Dunning Terms", isShortcut: false},
    {id: "settings.rise-configuration-quick-setup", name: "RiSE Configuration: Quick Setup", shortName: "RiSE Configuration", category: "Settings", icon: "rocket", url: "/iMIS/Setup/SystemConfigPage.aspx?PageName=ContentManager.QuickSetup", keywords: "panel source prefix google maps api attachment files types cookies subdomains domains canonical", isShortcut: false},
    {id: "settings.rise-configuration-email-settings", name: "RiSE Configuration: Email Settings", shortName: "RiSE Configuration", category: "Settings", icon: "mail-cog", url: "/iMIS/Setup/SystemConfigPage.aspx?PageName=SMTP.EmailSettings", keywords: "smtp host port SSL", isShortcut: false},
    {id: "settings.rise-configuration-page-builder-configuration", name: "RiSE Configuration: Page Builder Configuration", shortName: "RiSE Configuration", category: "Settings", icon: "layout-board", url: "/iMIS/Setup/SystemConfigPage.aspx?PageName=SMTP.EmailSettings", keywords: "attachment publishing server cache duration maintenance mode", isShortcut: false},
    {id: "settings.rise-configuration-search-settings", name: "RiSE Configuration: Search Settings", shortName: "RiSE Configuration", category: "Settings", icon: "search", url: "/iMIS/Setup/SystemConfigPage.aspx?PageName=Search", keywords: "keyword", isShortcut: false},
    {id: "settings.rise-configuration-indexing-preferences", name: "RiSE Configuration: Indexing Preferences", shortName: "RiSE Configuration", category: "Settings", icon: "list-details", url: "/iCore/System_Settings/Indexing_Preferences.aspx", keywords: "rebuild", isShortcut: false},
    {id: "settings.rise-configuration-process-automation", name: "RiSE Configuration: Process Automation", shortName: "RiSE Configuration", category: "Settings", icon: "settings-automation", url: "/iMIS/Setup/SystemConfigPage.aspx?PageName=ProcessAutomation", keywords: "logs pa+", isShortcut: false},
    {id: "settings.rise-configuration-workflow-configuration", name: "RiSE Configuration: Workflow Configuration", shortName: "RiSE Configuration", category: "Settings", icon: "route", url: "/iMIS/Setup/SystemConfigPage.aspx?PageName=ContentWorkflow", keywords: "expiration", isShortcut: false},
    {id: "settings.rise-configuration-report-formats", name: "RiSE Configuration: Report Formats", shortName: "RiSE Configuration", category: "Settings", icon: "file-report", url: "/iMIS/Setup/SystemConfigPage.aspx?PageName=SSRSFormats", keywords: "ssrs", isShortcut: false},
    {id: "settings.rise-configuration-recent-history", name: "RiSE Configuration: Recent History", shortName: "RiSE Configuration", category: "Settings", icon: "history", url: "/iMIS/Setup/SystemConfigPage.aspx?PageName=RecentHistory", keywords: "", isShortcut: false},
    {id: "users.manage-duplicates", name: "Manage Duplicates", shortName: "Manage Duplicates", category: "Users", icon: "copy", url: "/iCore/Contacts/Manage_Duplicates.aspx", keywords: "remove dupe match key", isShortcut: false},
    {id: "users.user-security", name: "User Security", shortName: "User Security", category: "Users", icon: "shield-lock", url: "/AsiCommon/Controls/Contact/User/FindUser.aspx", keywords: "password username change login expired", isShortcut: false},
    {id: "users.import-contacts", name: "Import Contacts", shortName: "Import Contacts", category: "Users", icon: "file-import", url: "/iCore/Contacts/Contact-importer.aspx", keywords: "bulk records", isShortcut: false},
    {id: "users.duplicate-merge-logs", name: "Duplicate Merge Logs", shortName: "Duplicate Merge Logs", category: "Users", icon: "git-merge", url: "/iParts/Contact%20Management/DuplicateMerge/DuplicateMergeLogDisplay.aspx", keywords: "dupe contact", isShortcut: false}
  ];

  const destinationsById = new Map(destinations.map(route => [route.id, route]));

  /* ── state ───────────────────────────────────────────── */

  let bookmarkIds = [];
  let savedOrdinal = null;
  let bookmarkLoadState = 'idle';
  let bookmarkLoadVersion = 0;
  let saveChain = Promise.resolve();
  let hasUnsavedChange = false;
  let barVisible = false;
  // Unique ids for Recents folder paths, the shared copy buttons' targets.
  let recentPathCount = 0;
  // The bookmarks bar slide in progress (see slideBar), or null.
  let barSlide = null;
  let scope = 'mine';
  let mounted = null;
  let observer = null;
  let mountTimer = null;
  let stopped = false;
  let toastTimer = null;
  let recentsVersion = 0;
  let paletteResults = [];
  let activeResult = 0;
  let paletteDrag = null;
  let returnFocus = null;
  let fuzzy = null;

  /* ── helpers ─────────────────────────────────────────── */

  const query = selector => document.querySelector(selector);

  const escapeHtml = value => String(value == null ? '' : value)
    .replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));

  const icon = name => '<i class="ti ti-' + escapeHtml(name) + '" aria-hidden="true"></i>';

  function clientContext() {
    const field = document.getElementById('__ClientContext');
    if (!field || !field.value) return {};
    try {
      return JSON.parse(field.value) || {};
    } catch (_) {
      return {};
    }
  }

  function loggedInPartyId() {
    const context = clientContext();
    if (context.isAnonymous) return '';
    return context.loggedInPartyId ? String(context.loggedInPartyId) : '';
  }

  // Navigation paths belong to the active website, matching UnionSuiteTaskbar.js.
  function websiteUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    try {
      const root = new URL(clientContext().websiteRoot || '/', window.location.href);
      if (!/^https?:$/.test(root.protocol)) return path;
      root.pathname = root.pathname.replace(/\/?$/, '/');
      root.search = '';
      root.hash = '';
      return new URL(path.replace(/^\/+/, ''), root).href;
    } catch (_) {
      return path;
    }
  }

  function requestToken() {
    const field = document.querySelector('#__RequestVerificationToken');
    return field ? field.value : '';
  }

  function apiFetch(path, options) {
    const config = options || {};
    const headers = { RequestVerificationToken: requestToken() };
    if (config.body) headers['Content-Type'] = 'application/json';
    return fetch(window.location.origin + path, {
      method: config.method || 'GET',
      credentials: 'same-origin',
      headers,
      body: config.body
    }).then(response => {
      if (!response.ok) throw new Error(path + ' failed: ' + response.status);
      return response.status === 204 ? null : response.json();
    });
  }

  function createButton(label, markup, className, onClick) {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = className;
    node.setAttribute('aria-label', label);
    node.title = label;
    node.innerHTML = markup;
    if (onClick) node.addEventListener('click', onClick);
    return node;
  }

  function createLink(label, markup, className, href, onActivate) {
    const node = document.createElement('a');
    node.className = className;
    node.href = href;
    node.setAttribute('aria-label', label);
    node.title = label;
    node.innerHTML = markup;
    if (onActivate) {
      node.addEventListener('click', event => {
        // Leave modified clicks to the browser so new tabs still work.
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        onActivate(event);
      });
    }
    return node;
  }

  /**
   * Bar visibility persists per signed-in user, browser and origin, the same
   * shape the taskbar already uses for its greeting and search history. Storage
   * can be blocked, in which case the bar simply starts collapsed each visit.
   */
  function barStorageKey() {
    const partyId = loggedInPartyId();
    return partyId ? settings.barStoragePrefix + partyId : '';
  }

  function readBarVisible() {
    const key = barStorageKey();
    if (!key) return false;
    try {
      return window.localStorage.getItem(key) === 'shown';
    } catch (_) {
      return false;
    }
  }

  function writeBarVisible(visible) {
    const key = barStorageKey();
    if (!key) return;
    try {
      window.localStorage.setItem(key, visible ? 'shown' : 'hidden');
    } catch (_) {
      /* Visibility lasts this document only when storage is unavailable. */
    }
  }

  function announce(message) {
    const live = query('#us-tb-live');
    if (live) live.textContent = message;
  }

  function toast(message) {
    const node = query('#us-tb-toast');
    if (!node) return;
    node.textContent = message;
    node.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { node.hidden = true; }, 4000);
  }

  // iMIS returns UpdatedOn without a zone; it is read as browser-local time.
  function relativeTime(value) {
    const when = new Date(value);
    if (Number.isNaN(when.getTime())) return '';
    const minutes = Math.round((Date.now() - when.getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.round(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    const days = Math.round(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return days + ' days ago';
    return when.toLocaleDateString();
  }

  /* ── injected styles ─────────────────────────────────── */

  const STYLE_ID = 'us-taskbar-bookmarks-styles';

  const styles = `
.us-taskbar-tools,
.us-bookmarks,
.us-bookmarks-items {
  display: flex;
  align-items: center;
  gap: 4px;
}

.us-taskbar-tools {
  padding: 0 10px;
  margin: 0 2px;
  border-left: 1px solid var(--border);
}

.us-feature-button,
.us-nav-icon-button,
.us-pin {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 36px;
  min-height: 36px;
  gap: 7px;
  padding: 6px 9px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: var(--text-strong);
  font: 500 12px var(--font-ui);
  text-decoration: none;
  cursor: pointer;
}

/* Glyphs inherit the 12px label size otherwise. Match the native taskbar
   controls beside them: a 36px square holding an 18px icon. */
.us-feature-button > .ti,
.us-nav-icon-button > .ti,
.us-pin > .ti {
  font-size: 18px;
}

.us-feature-button {
  background: var(--bg-subtle);
  border-color: var(--border);
}

.us-feature-button:hover,
.us-feature-button[aria-expanded="true"],
.us-nav-icon-button:hover,
.us-pin:hover {
  color: var(--text-link);
  background: var(--bg-sunken);
  border-color: var(--border);
  text-decoration: none;
}

/* Bookmarks and palette results are anchors, so the native a:visited colour
   applies to them: it outranks a plain class selector (0,1,1 over 0,1,0) and is
   near-invisible on the dark surface. These are controls, not read-once links,
   so they keep one colour whether or not the destination has been opened. */
.us-pin:visited {
  color: var(--text-strong);
}

.us-destination:visited {
  color: var(--text-strong);
}

.us-feature-button:disabled,
.us-nav-icon-button:disabled,
.us-popover-footer button:disabled {
  opacity: .35;
  cursor: default;
}

.us-feature-button:focus-visible,
.us-nav-icon-button:focus-visible,
.us-pin:focus-visible,
.us-palette input:focus-visible,
.us-popover button:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 3px;
}

.us-pin {
  width: 36px;
  padding: 5px;
}

/* A clicked bookmark keeps its size while the page loads: the spinner takes
   the icon's place rather than sitting beside it. */
.us-pin.is-busy > .ti {
  display: none;
}

.us-pin > .us-button-spinner {
  width: 18px;
  height: 18px;
}

.us-pin-label,
.us-bookmarks-label {
  display: none;
}

.us-bookmarks .us-nav-icon-button,
.us-bookmarks-toggle {
  color: var(--text-muted);
  padding: 5px;
}

/* The theme's one "on" state for heading icon toggles (the IQA filter
   button, Show completed tasks): selected fill, link-coloured icon, tinted
   border and a pressed inset. The --iqa-* aliases are declared on IQA
   owners only, so the taskbar maps them to the same root tokens itself. */
.us-bookmarks-toggle {
  --iqa-selected: var(--brand-100, #d0e4ea);
  --iqa-link: var(--text-link, #006f94);
}

/* The appearance switch is ordered last in the row; the toggle follows it. */
#injected-taskbar > .us-bookmarks-toggle {
  order: 2;
}

.us-bookmarks-toggle[aria-expanded="true"],
.us-bookmarks-toggle[aria-expanded="true"]:hover {
  background: var(--iqa-selected);
  border-color: color-mix(in srgb, var(--iqa-link) 28%, transparent);
  box-shadow: inset 0 1px 3px rgb(0 0 0 / .14);
  color: var(--iqa-link);
}

:root[data-us-color-scheme="dark"] .us-bookmarks-toggle {
  --iqa-selected: var(--dm-selected);
}

@media (forced-colors: active) {
  .us-bookmarks-toggle[aria-expanded="true"] {
    border: 2px solid Highlight;
  }
}

.us-bookmarks-bar {
  padding: 9px 22px;
  border-top: 1px solid var(--border);
  background: var(--bg-subtle);
}

.us-bookmarks-bar[hidden] {
  display: none;
}

/* While the bar slides open or closed its height is animated, so the
   bookmarks are clipped rather than spilling over the page. */
.us-bookmarks-bar.is-sliding {
  overflow: hidden;
}

.us-bookmarks-bar .us-bookmarks-label {
  display: block;
  margin-right: 10px;
  font-size: 10px;
  color: var(--text-muted);
}

.us-bookmarks-bar .us-pin {
  width: auto;
  max-width: 185px;
  min-height: 29px;
  padding: 5px 9px;
  gap: 7px;
}

.us-bookmarks-bar .us-pin-label {
  display: block;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.us-bookmarks-bar .us-pin .ti {
  font-size: 16px;
}

.us-bookmarks-bar .us-pin > .us-button-spinner {
  width: 16px;
  height: 16px;
}

.us-bookmarks-bar-nav .us-bookmarks-items {
  flex-wrap: wrap;
  flex: 1;
}

.us-bookmarks-bar-nav > .us-feature-button {
  margin-left: auto;
  flex-shrink: 0;
  align-self: flex-start;
}

.us-toast {
  position: fixed;
  z-index: 10120;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  box-sizing: border-box;
  width: max-content;
  max-width: calc(100% - 32px);
  padding: 11px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-surface);
  color: var(--text-strong);
  box-shadow: var(--shadow-lg);
  font: 400 12px/1.4 var(--font-ui);
}

.us-toast[hidden] {
  display: none;
}

.us-popover {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: absolute;
  z-index: 10040;
  top: 68px;
  right: 22px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-surface);
  color: var(--text-base);
  box-shadow: var(--shadow-lg);
}

.us-popover[hidden] {
  display: none;
}

.us-popover *,
.us-palette * {
  box-sizing: border-box;
}

.us-popover-heading,
.us-palette-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  padding: 10px 16px;
  margin-bottom: 16px;
  background: var(--bg-sunken);
  border-bottom: 1px solid var(--border);
}

.us-popover-heading h2,
.us-palette-heading h2 {
  margin: 0;
  color: var(--text-strong);
  font: 600 14px/1.4 var(--font-ui);
  letter-spacing: normal;
  text-transform: none;
}

.us-popover-heading p,
.us-palette-heading p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font: 400 12px/1.4 var(--font-ui);
}

.us-popover-heading > button,
.us-palette-heading > button {
  width: 30px;
  height: 28px;
  min-width: 30px;
  min-height: 28px;
  padding: 5px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  box-shadow: none;
  cursor: pointer;
  transition: background-color 120ms, color 120ms, border-color 120ms;
}

.us-popover-heading > button .ti,
.us-palette-heading > button .ti {
  font-size: 18px;
}

.us-popover-heading > button:hover,
.us-palette-heading > button:hover {
  background: var(--danger-bg);
  color: var(--danger);
}

.us-popover-heading > button:active,
.us-palette-heading > button:active {
  background: var(--danger-bg);
  border-color: var(--danger);
  color: var(--danger);
}

.us-popover-heading > button:focus-visible,
.us-palette-heading > button:focus-visible {
  outline: 2px solid var(--danger);
  outline-offset: 1px;
}

.us-popover-footer,
.us-palette-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-shrink: 0;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  background: var(--bg-subtle);
  color: var(--text-muted);
  font: 400 12px/1.4 var(--font-ui);
}

.us-popover-footer button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  color: var(--text-link);
  font: 500 12px/1.4 var(--font-ui);
  cursor: pointer;
  transition: background-color 120ms, border-color 120ms, color 120ms;
}

.us-popover-footer button:hover:not(:disabled) {
  background: var(--brand-50);
  color: var(--text-link-hover);
  border-color: var(--border-strong);
}

.us-popover-footer button:active:not(:disabled) {
  background: var(--bg-sunken);
  border-color: var(--border-focus);
  color: var(--text-strong);
}

.us-popover-footer button .ti {
  font-size: 15px;
}

/* Selected narrow Recents design from the approved reference. */
.us-recents {
  width: min(420px, calc(100% - 28px));
}

.us-recents-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 0 20px 16px;
  font-size: 12px;
  color: var(--text-muted);
}

.us-segmented {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  flex-shrink: 0;
  gap: 2px;
  padding: 3px;
  border-radius: var(--radius);
  background: var(--bg-sunken);
}

.us-segmented button {
  min-width: 72px;
  min-height: 28px;
  margin: 0;
  padding: 4px 10px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  font: 500 12px/1.4 var(--font-ui);
  cursor: pointer;
}

.us-segmented button:hover {
  background: var(--bg-surface);
  color: var(--text-strong);
}

.us-segmented button[aria-pressed="true"] {
  background: var(--bg-surface);
  color: var(--text-link);
  box-shadow: var(--shadow-sm);
}

.us-segmented button:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: -2px;
}

.us-recents-sections {
  display: grid;
  grid-template-columns: 1fr;
  border-top: 1px solid var(--border);
  min-height: 0;
  max-height: 315px;
  overflow-y: auto;
}

/* Grid items default to min-width:auto, which lets a long folder path push the
   rows wider than the popover instead of letting the path ellipsise. */
.us-recents-section {
  min-width: 0;
}

.us-recents-section + .us-recents-section {
  border-top: 1px solid var(--border);
}

/* Each section keeps its heading until the next section takes its place. */
.us-recents-section h3 {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 12px 16px 8px;
  margin: 0;
  background: var(--bg-surface);
  box-shadow: 0 1px 0 var(--border);
  color: var(--text-muted);
  font: 600 12px var(--font-ui);
}

.us-recents-section h3 .ti {
  color: var(--text-link);
  font-size: 15px;
}

.us-recents-list {
  padding: 0 7px 9px;
}

.us-recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  text-align: left;
  padding: 10px;
  color: var(--text-strong);
  font: 500 13px/1.4 var(--font-ui);
  cursor: pointer;
}

/* Each row holds the open button and a copy button (the shared us-copy). */
.us-recent-row {
  display: flex;
  align-items: center;
  border-radius: var(--radius-sm);
}

.us-recent-row:hover {
  background: var(--bg-sunken);
}

.us-recent-row > .us-recent-item {
  flex: 1;
  min-width: 0;
}

.us-recent-row > .us-recent-copy {
  margin-right: 4px;
  --copy-hover: var(--bg-surface);
}

/* The popover clips anything past its edge, so the shared "Copied" label
   shows on the copy button's left, over the open arrow. */
.us-recent-row > .us-recent-copy > .us-copy-label {
  inset-inline-start: auto;
  inset-inline-end: calc(50% + 12px);
}

.us-recent-row:has(> .us-recent-copy[data-us-copy-state]) .us-recent-item > .ti {
  visibility: hidden;
}

.us-recent-item > span {
  min-width: 0;
}

.us-recent-item strong {
  display: block;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.us-recent-item small {
  display: flex;
  align-items: baseline;
  gap: 4px;
  min-width: 0;
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 400;
}

/* The folder gives up width first; the modifier and time always stay legible. */
.us-recent-item__path {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.us-recent-item__meta {
  flex: none;
  white-space: nowrap;
}

.us-recent-item__path + .us-recent-item__meta::before {
  content: "· ";
}

.us-destination small {
  display: block;
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 400;
}

.us-recent-item > .ti {
  font-size: 14px;
  color: var(--text-muted);
}

.us-palette {
  position: fixed;
  top: 38px;
  bottom: auto;
  margin: 0 auto;
  width: min(610px, calc(100% - 28px));
  max-height: calc(100% - 64px);
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-surface);
  color: var(--text-base);
  box-shadow: var(--shadow-lg);
}

.us-palette[open] {
  display: flex;
  flex-direction: column;
}

.us-palette::backdrop {
  background: rgb(12 30 40 / 35%);
  backdrop-filter: blur(2px);
}

.us-palette-input {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 20px 15px;
  padding: 0 11px;
  min-height: 44px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: none;
  background: var(--bg-subtle);
}

.us-palette-input:focus-within {
  border-color: var(--field-focus-colour);
  box-shadow: var(--field-focus-glow);
}

.us-palette-input input {
  min-width: 0;
  flex: 1;
  color: var(--text-strong);
  font: 13px var(--font-ui);
}

/* The wrapper owns this field's surface and focus ring. Native theme rules style
   every input, and input[type="search"]:focus (0,2,1) outranks a plain class
   selector, so on focus the input would draw a second rounded ring and glow
   inside the wrapper. The id keeps these resets above that. */
#us-tb-palette .us-palette-input input,
#us-tb-palette .us-palette-input input:hover,
#us-tb-palette .us-palette-input input:focus,
#us-tb-palette .us-palette-input input:focus-visible {
  height: auto;
  margin: 0;
  padding: 11px 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  outline: 0;
  transition: none;
}

#us-tb-palette .us-palette-input kbd {
  background: transparent;
}

.us-palette-heading kbd,
.us-palette-input kbd {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 2px 4px;
  color: var(--text-muted);
  font: 9px var(--font-ui);
}

.us-palette-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin: 0 22px 7px;
  color: var(--text-muted);
  font: 400 12px/1.4 var(--font-ui);
}

.us-palette-bookmark-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

#us-tb-bookmarks-retry[hidden] {
  display: none;
}

.us-palette-results {
  min-height: 100px;
  overflow-y: auto;
  padding: 0 10px 10px;
}

.us-palette-row {
  display: flex;
  align-items: center;
  border-radius: 7px;
  padding-right: 7px;
}

.us-palette-row:has(> .us-palette-drag) {
  /* Keep the handle's 2px focus ring and 3px offset inside the row. */
  padding-left: 7px;
}

.us-palette-row:has(> .us-destination:hover),
.us-palette-row.is-active {
  background: var(--bg-sunken);
}

.us-palette-row:has(> .us-destination:focus-visible) {
  outline: 2px solid var(--border-focus);
  outline-offset: -2px;
}

.us-palette-row > .us-destination:focus-visible {
  outline: none;
}

.us-palette-group {
  padding: 9px 12px 5px;
  color: var(--text-muted);
  font: 600 10px var(--font-ui);
  text-transform: uppercase;
  letter-spacing: .6px;
}

.us-palette-divider {
  margin-top: 9px;
  padding-top: 13px;
  border-top: 1px solid var(--border);
}

.us-palette-drag {
  cursor: grab;
  color: var(--text-muted);
  flex-shrink: 0;
  touch-action: none;
}

.us-palette-drag:active {
  cursor: grabbing;
}

.us-palette.is-sorting,
.us-palette.is-sorting * {
  cursor: grabbing !important;
  user-select: none;
}

.us-palette-floating {
  position: fixed;
  opacity: .8;
  z-index: 10200;
  pointer-events: none;
  background: var(--bg-surface);
  border: 1px solid var(--border-focus);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
}

.us-palette-placeholder {
  flex-shrink: 0;
  border: 2px dashed var(--border-focus);
  border-radius: 7px;
  background: transparent;
}

.us-destination {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--text-strong);
  font: 500 13px var(--font-ui);
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.us-destination:hover {
  color: var(--text-strong);
  text-decoration: none;
}

.us-destination > span {
  min-width: 0;
}

.us-destination strong {
  display: block;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.us-destination > .ti {
  flex-shrink: 0;
  color: var(--text-link);
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 8px;
  font-size: 17px;
}

.us-star {
  color: var(--text-muted);
}

.us-star[aria-pressed="true"] {
  color: var(--accent-hover);
}

.us-empty {
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
  font: 400 12px/1.5 var(--font-ui);
}

.us-empty strong {
  display: block;
  margin-bottom: 6px;
  color: var(--text-strong);
}

.us-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}

@media (prefers-reduced-motion: reduce) {
  .us-popover-heading > button,
  .us-palette-heading > button,
  .us-popover-footer button {
    transition: none;
  }
}

/* Header-row steps live in zUnionSuite.css (US-TASKBAR-LAYOUT), Biscuit's
   with him (US-TASKBAR-PIP). Below 1100px the taskbar's labelled buttons
   show their icons only; aria-label and title keep their names. */
@media (max-width: 1099px) {
  #injected-taskbar .us-feature-button > span {
    display: none;
  }
}

/* The taskbar wraps here: bookmarks lead the first row and the tools are
   pushed to its end, with the search field on a row of its own. */
@media (max-width: 780px) {
  .us-taskbar-tools {
    margin-left: auto;
    padding-right: 0;
  }

  .us-bookmarks-bar {
    padding: 8px 14px;
  }

  .us-bookmarks-bar .us-bookmarks-items {
    flex: 1;
    min-width: 0;
    overflow: auto;
  }

  .us-popover {
    right: 14px;
  }
}

@media (max-width: 480px) {
  .us-feature-button {
    font-size: 11px;
    padding: 5px 7px;
  }

  .us-pin {
    min-width: 27px;
    width: 27px;
  }

  .us-bookmarks-items {
    gap: 1px;
  }

  .us-palette-heading,
  .us-popover-heading {
    padding: 16px;
  }

  .us-palette-footer > span:last-child {
    display: none;
  }

  .us-bookmarks-label {
    display: none !important;
  }
}
`;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const node = document.createElement('style');
    node.id = STYLE_ID;
    node.textContent = styles;
    document.head.appendChild(node);
  }

  /* ── bookmark storage ────────────────────────────────── */

  /**
   * One i4u_UT_UserSettings row per user holds the ordered destination ids as
   * JSON in Value. Ordinal is a database identity, so the saved order lives
   * inside the JSON and the existing row's Ordinal is reused on every update.
   */
  const store = {
    /**
     * A custom panel answers with GenericEntityData: field values live in a
     * Properties name/value list, and typed fields such as Ordinal arrive
     * wrapped as {$type, $value}. Reading row.Ordinal directly gives undefined,
     * which would make every save look like a first-time create.
     */
    readProperty(row, name) {
      const values = row && row.Properties && row.Properties.$values;
      const found = Array.isArray(values) ? values.find(entry => entry && entry.Name === name) : null;
      // Some endpoints answer with flat objects instead; accept both.
      const value = found ? found.Value : row ? row[name] : undefined;
      return value !== null && typeof value === 'object' && '$value' in value ? value.$value : value;
    },

    load() {
      const partyId = loggedInPartyId();
      if (!partyId) return Promise.resolve({ ids: [], ordinal: null, duplicate: false });
      const path = '/api/' + settings.settingsEntity +
        '?ID=' + encodeURIComponent(partyId) +
        '&SettingsKey=' + encodeURIComponent(settings.settingsKey) +
        '&Limit=' + settings.settingsRowLimit;
      return apiFetch(path).then(data => {
        const rows = (data && data.Items && data.Items.$values) || [];
        // There should be one row per user. If earlier writes left more than
        // one, always work with the lowest Ordinal so the choice is stable.
        const saved = rows
          .map(row => ({ ordinal: Number(store.readProperty(row, 'Ordinal')), value: store.readProperty(row, 'Value') }))
          .filter(row => Number.isFinite(row.ordinal))
          .sort((left, right) => left.ordinal - right.ordinal);
        // Return a snapshot: a read from a disposed instance must not change
        // the identity used by a later instance's writes.
        return {
          ids: saved.length ? store.parse(saved[0].value) : [],
          ordinal: saved.length ? saved[0].ordinal : null,
          duplicate: saved.length > 1
        };
      });
    },

    parse(value) {
      if (!value) return [];
      try {
        const parsed = JSON.parse(value);
        // Unknown ids are kept out of the strip but are not silently destructive:
        // they simply cannot render until the catalogue lists them again.
        return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string') : [];
      } catch (_) {
        return [];
      }
    },

    save(ids) {
      const partyId = loggedInPartyId();
      if (!partyId) return Promise.reject(new Error('No signed-in party; bookmarks are not saved.'));
      const value = JSON.stringify(ids);
      if (value.length > settings.settingsValueLimit) {
        return Promise.reject(new Error('Too many bookmarks to save.'));
      }
      return savedOrdinal == null ? store.create(partyId, value) : store.update(partyId, value);
    },

    create(partyId, value) {
      const body = {
        $type: 'Asi.Soa.Core.DataContracts.GenericEntityData, Asi.Contracts',
        EntityTypeName: settings.settingsEntity,
        PrimaryParentEntityTypeName: 'Party',
        Properties: {
          $type: 'Asi.Soa.Core.DataContracts.GenericPropertyDataCollection, Asi.Contracts',
          $values: [
            store.property('ID', partyId),
            store.property('SettingsKey', settings.settingsKey),
            store.property('Value', value)
          ]
        }
      };
      return apiFetch('/api/' + settings.settingsEntity, {
        method: 'POST',
        body: JSON.stringify(body)
      }).then(created => {
        // The create response carries the server-assigned Ordinal, so later
        // saves can update this row instead of creating another one.
        const ordinal = Number(store.readProperty(created, 'Ordinal'));
        if (Number.isFinite(ordinal)) {
          savedOrdinal = ordinal;
          return;
        }
        return store.load().then(snapshot => { savedOrdinal = snapshot.ordinal; });
      });
    },

    update(partyId, value) {
      const ordinal = savedOrdinal;
      const body = {
        $type: 'Asi.Soa.Core.DataContracts.GenericEntityData, Asi.Contracts',
        EntityTypeName: settings.settingsEntity,
        PrimaryParentEntityTypeName: 'Party',
        Identity: {
          $type: 'Asi.Soa.Core.DataContracts.IdentityData, Asi.Contracts',
          EntityTypeName: settings.settingsEntity,
          IdentityElements: {
            $type: 'System.Collections.ObjectModel.Collection`1[[System.String, mscorlib]], mscorlib',
            $values: [String(partyId), String(ordinal)]
          }
        },
        PrimaryParentIdentity: {
          $type: 'Asi.Soa.Core.DataContracts.IdentityData, Asi.Contracts',
          EntityTypeName: 'Party',
          IdentityElements: {
            $type: 'System.Collections.ObjectModel.Collection`1[[System.String, mscorlib]], mscorlib',
            $values: [String(partyId)]
          }
        },
        Properties: {
          $type: 'Asi.Soa.Core.DataContracts.GenericPropertyDataCollection, Asi.Contracts',
          $values: [
            store.property('ID', partyId),
            // The row key must appear here as well as in IdentityElements.
            store.property('Ordinal', { $type: 'System.Int32', $value: Number(ordinal) }),
            store.property('SettingsKey', settings.settingsKey),
            store.property('Value', value)
          ]
        }
      };
      return apiFetch('/api/' + settings.settingsEntity + '/' +
        encodeURIComponent(partyId) + '/' + encodeURIComponent(ordinal), {
        method: 'PUT',
        body: JSON.stringify(body)
      });
    },

    property(name, value) {
      return {
        $type: 'Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts',
        Name: name,
        Value: value
      };
    }
  };

  function renderBookmarkLoadState() {
    const status = query('#us-tb-bookmarks-status');
    if (status) status.textContent = bookmarkLoadState === 'ready'
      ? 'Star to bookmark'
      : bookmarkLoadState === 'failed' ? 'Bookmarks could not be loaded.' : 'Loading bookmarks…';
    const retry = query('#us-tb-bookmarks-retry');
    if (retry) retry.hidden = bookmarkLoadState !== 'failed';
    document.querySelectorAll('#us-tb-palette [data-star], #us-tb-palette [data-palette-handle]').forEach(button => {
      button.disabled = bookmarkLoadState !== 'ready';
    });
  }

  function loadBookmarks() {
    if (stopped || bookmarkLoadState === 'loading' || bookmarkLoadState === 'ready') return;
    bookmarkLoadState = 'loading';
    const version = ++bookmarkLoadVersion;
    renderBookmarkLoadState();
    store.load().then(snapshot => {
      if (stopped || version !== bookmarkLoadVersion) return;
      savedOrdinal = snapshot.ordinal;
      bookmarkIds = snapshot.ids;
      bookmarkLoadState = 'ready';
      renderBookmarks();
      if (query('#us-tb-palette')?.open) renderPalette(false);
      renderBookmarkLoadState();
      if (snapshot.duplicate) announce('More than one saved bookmark row was found; using the earliest.');
    }).catch(error => {
      if (stopped || version !== bookmarkLoadVersion) return;
      bookmarkLoadState = 'failed';
      renderBookmarkLoadState();
      toast('Saved bookmarks could not be loaded. ' + error.message);
      announce('Saved bookmarks could not be loaded. Use Retry in the command palette.');
    });
  }

  /**
   * Saves run one at a time. The first save for a user creates the row and then
   * reads back its Ordinal; a second save starting before that finishes would
   * still see no Ordinal and create a duplicate row. Each queued save sends
   * whatever the order is when it runs, so later edits supersede earlier ones.
   *
   * A failed save leaves the change on screen and says so, rather than reverting.
   */
  function persistBookmarks() {
    if (bookmarkLoadState !== 'ready') return;
    saveChain = saveChain.catch(() => {}).then(() => saveBookmarks());
    return saveChain;
  }

  function saveBookmarks() {
    return store.save(bookmarkIds).then(() => {
      hasUnsavedChange = false;
      const strip = query('#us-tb-bookmarks');
      if (strip) strip.removeAttribute('data-unsaved');
    }).catch(error => {
      hasUnsavedChange = true;
      const strip = query('#us-tb-bookmarks');
      if (strip) strip.setAttribute('data-unsaved', 'true');
      toast('Bookmarks could not be saved. ' + error.message);
      announce('Bookmarks could not be saved.');
    });
  }

  /* ── panels ──────────────────────────────────────────── */

  function buildPanels() {
    if (query('#us-tb-palette')) return;

    const live = document.createElement('div');
    live.id = 'us-tb-live';
    live.className = 'us-sr-only';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');

    const toastNode = document.createElement('div');
    toastNode.id = 'us-tb-toast';
    toastNode.className = 'us-toast';
    toastNode.setAttribute('role', 'status');
    toastNode.hidden = true;

    const palette = document.createElement('dialog');
    palette.id = 'us-tb-palette';
    palette.className = 'us-palette';
    palette.setAttribute('aria-labelledby', 'us-tb-palette-heading');
    palette.innerHTML =
      '<header class="us-palette-heading">' +
        '<div><h2 id="us-tb-palette-heading">Where would you like to go?</h2>' +
          '<p>Open this from anywhere with <kbd>Ctrl</kbd><kbd>Space</kbd>.</p></div>' +
        '<button type="button" data-close="palette" aria-label="Close command palette">' + icon('x') + '</button>' +
      '</header>' +
      '<div class="us-palette-input">' + icon('search') +
        '<input id="us-tb-palette-query" type="search" placeholder="Search pages, tools and shortcuts…" aria-label="Search destinations" autocomplete="off">' +
        '<kbd>Esc</kbd>' +
      '</div>' +
      '<div class="us-palette-meta"><span id="us-tb-palette-count">All destinations</span>' +
        '<span class="us-palette-bookmark-status"><span id="us-tb-bookmarks-status" role="status">Loading bookmarks…</span>' +
          '<button type="button" id="us-tb-bookmarks-retry" class="us-feature-button" aria-label="Retry loading bookmarks" hidden>Retry</button></span></div>' +
      '<div id="us-tb-palette-results" class="us-palette-results"></div>' +
      '<footer class="us-palette-footer">' +
        '<span><kbd>↑</kbd><kbd>↓</kbd> browse <kbd>Enter</kbd> open</span>' +
        '<span>Bookmarks stay in your taskbar</span>' +
      '</footer>';

    const recents = document.createElement('section');
    recents.id = 'us-tb-recents';
    recents.className = 'us-popover us-recents';
    recents.hidden = true;
    recents.setAttribute('role', 'dialog');
    recents.setAttribute('aria-labelledby', 'us-tb-recents-heading');
    recents.innerHTML =
      '<header class="us-popover-heading">' +
        '<div><h2 id="us-tb-recents-heading">Recently modified</h2><p>Pick up where the work left off.</p></div>' +
        '<button type="button" data-close="recents" aria-label="Close Recents">' + icon('x') + '</button>' +
      '</header>' +
      '<div class="us-recents-toolbar">' +
        '<div class="us-segmented" role="group" aria-label="Recents scope">' +
          '<button type="button" data-scope="mine" aria-pressed="true">Mine</button>' +
          '<button type="button" data-scope="sitewide" aria-pressed="false">Sitewide</button>' +
        '</div>' +
        '<span id="us-tb-recents-count"></span>' +
      '</div>' +
      '<div id="us-tb-recents-results" class="us-recents-sections"></div>' +
      '<footer class="us-popover-footer">' +
        '<span>Sorted by last modified</span>' +
        '<button type="button" id="us-tb-recents-refresh">' + icon('refresh') +
          '<span class="us-button-spinner" aria-hidden="true" hidden></span> Refresh</button>' +
      '</footer>';

    document.body.append(live, toastNode, palette, recents);

    palette.querySelector('#us-tb-palette-query').addEventListener('input', () => renderPalette());
    palette.querySelector('#us-tb-bookmarks-retry').addEventListener('click', loadBookmarks);
    palette.addEventListener('cancel', event => { event.preventDefault(); closePanels(true); });
    palette.addEventListener('click', event => {
      if (event.target !== palette) return;
      const box = palette.getBoundingClientRect();
      const outside = event.clientX < box.left || event.clientX > box.right ||
        event.clientY < box.top || event.clientY > box.bottom;
      if (outside) closePanels(true);
    });
    palette.addEventListener('keydown', onPaletteKeydown);

    document.querySelectorAll('[data-close]').forEach(node =>
      node.addEventListener('click', () => closePanels(true)));

    recents.querySelectorAll('[data-scope]').forEach(node =>
      node.addEventListener('click', () => {
        if (scope === node.dataset.scope) return;
        scope = node.dataset.scope;
        recents.querySelectorAll('[data-scope]').forEach(button =>
          button.setAttribute('aria-pressed', String(button === node)));
        loadRecents();
      }));

    recents.querySelector('#us-tb-recents-refresh').addEventListener('click', () => loadRecents());
  }

  function positionPanel(panel, trigger) {
    // Clear the whole header, which includes the bookmarks bar when it is shown.
    const bar = query('#hd') || query('#injected-taskbar');
    const barBottom = bar ? bar.getBoundingClientRect().bottom : 0;
    const triggerBottom = trigger ? trigger.getBoundingClientRect().bottom : 0;
    const top = Math.max(barBottom + 8, triggerBottom + 8);
    panel.style.top = top + window.scrollY + 'px';
    panel.style.maxHeight = Math.max(180, window.innerHeight - top - 14) + 'px';
  }

  function closePanels(restoreFocus) {
    if (paletteDrag) paletteDrag.cancel();
    recentsVersion++;
    const recents = query('#us-tb-recents');
    if (recents) recents.hidden = true;
    document.querySelectorAll('.us-feature-button[aria-expanded]').forEach(node =>
      node.setAttribute('aria-expanded', 'false'));
    const palette = query('#us-tb-palette');
    if (palette && palette.open) palette.close();
    if (restoreFocus && returnFocus && returnFocus.isConnected) returnFocus.focus();
  }

  function openPanel(name, trigger) {
    closePanels();
    if (name === 'recents' && !barVisible) {
      // A programmatic Recents entry must reveal the bar before positioning.
      barVisible = true;
      writeBarVisible(barVisible);
      renderBookmarks();
    }
    returnFocus = trigger || query('[data-open="' + name + '"]');

    // Keep the taskbar's contact results out of the way.
    const dropdown = query('#tb-search-dropdown');
    if (dropdown) dropdown.hidden = true;

    if (name === 'palette') {
      const input = query('#us-tb-palette-query');
      input.value = '';
      renderPalette();
      query('#us-tb-palette').showModal();
      input.focus();
      return;
    }

    const panel = query('#us-tb-recents');
    panel.hidden = false;
    positionPanel(panel, returnFocus);
    if (returnFocus) returnFocus.setAttribute('aria-expanded', 'true');
    loadRecents();
    panel.querySelector('button').focus();
  }

  /* ── bookmarks ───────────────────────────────────────── */

  function savedRoutes() {
    return bookmarkIds.map(id => destinationsById.get(id)).filter(Boolean);
  }

  function createPin(route) {
    return createLink(
      route.name,
      icon(route.icon) + '<span class="us-pin-label">' + escapeHtml(route.shortName) + '</span>',
      'us-pin',
      websiteUrl(route.url),
      event => markPinBusy(event.currentTarget)
    );
  }

  /**
   * A bookmark starts a full page load, so the pin it was clicked in shows a
   * spinner until the browser leaves the page. Both the taskbar strip and the
   * bookmarks bar are built from createPin, so both behave the same way.
   */
  function markPinBusy(pin) {
    if (!pin || pin.classList.contains('is-busy')) return;
    pin.classList.add('is-busy');
    pin.setAttribute('aria-busy', 'true');
    const spinner = document.createElement('span');
    spinner.className = 'us-button-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    pin.prepend(spinner);
  }

  // Returning through the back/forward cache restores the page as it was left,
  // spinner included, so the busy state is cleared when the page is shown again.
  function clearBusyPins() {
    document.querySelectorAll('.us-pin.is-busy').forEach(pin => {
      pin.classList.remove('is-busy');
      pin.removeAttribute('aria-busy');
      const spinner = pin.querySelector(':scope > .us-button-spinner');
      if (spinner) spinner.remove();
    });
  }

  function renderBookmarks() {
    const strip = query('#us-tb-bookmarks');
    const bar = query('#us-tb-bookmarks-bar');
    if (!strip || !bar) return;
    const routes = savedRoutes();

    strip.replaceChildren();
    const stripItems = document.createElement('div');
    stripItems.className = 'us-bookmarks-items';
    for (const route of routes.slice(0, settings.stripLimit)) stripItems.append(createPin(route));
    if (!routes.length) {
      stripItems.append(createButton(
        'Add bookmarks',
        icon('star') + '<span>Add bookmarks</span>',
        'us-feature-button',
        event => openPanel('palette', event.currentTarget)
      ));
    }
    strip.append(stripItems);
    if (hasUnsavedChange) strip.setAttribute('data-unsaved', 'true');

    const toggle = query('#us-tb-bookmarks-toggle');
    if (toggle) {
      toggle.title = barVisible ? 'Hide bookmarks bar' : 'Show bookmarks bar';
      toggle.setAttribute('aria-label', toggle.title);
      toggle.setAttribute('aria-expanded', String(barVisible));
    }

    // A running slide owns the bar's visibility until it finishes.
    if (!barSlide) bar.hidden = !barVisible;
    bar.replaceChildren();
    const nav = document.createElement('nav');
    nav.id = 'us-tb-bookmarks-bar-nav';
    nav.className = 'us-bookmarks us-bookmarks-bar-nav';
    nav.setAttribute('aria-label', 'All bookmarks');
    const label = document.createElement('span');
    label.className = 'us-bookmarks-label';
    label.textContent = 'BOOKMARKS';
    nav.append(label);
    const barItems = document.createElement('div');
    barItems.className = 'us-bookmarks-items';
    for (const route of routes) barItems.append(createPin(route));
    if (!routes.length) {
      barItems.append(createButton(
        'Add bookmarks',
        icon('star') + '<span>Add bookmarks</span>',
        'us-feature-button',
        event => openPanel('palette', event.currentTarget)
      ));
    }
    nav.append(barItems);
    if (mounted && mounted.recentsButton) nav.append(mounted.recentsButton);
    bar.append(nav);
  }

  // Slides the bookmarks bar open or closed from the toggle. The bar's height,
  // vertical padding and top border grow from zero, so the page below moves
  // with it rather than jumping. Reduced motion shows or hides it at once.
  function slideBar(show) {
    const bar = query('#us-tb-bookmarks-bar');
    if (!bar) return;
    // Reversing mid-slide starts from wherever the bar has got to.
    const from = barSlide ? bar.getBoundingClientRect().height : null;
    if (barSlide) barSlide.cancel();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof bar.animate !== 'function') {
      bar.hidden = !show;
      return;
    }

    bar.hidden = false;
    const style = getComputedStyle(bar);
    const open = {
      height: style.height,
      paddingTop: style.paddingTop,
      paddingBottom: style.paddingBottom,
      borderTopWidth: style.borderTopWidth,
      opacity: 1
    };
    const closed = { height: '0px', paddingTop: '0px', paddingBottom: '0px', borderTopWidth: '0px', opacity: 0 };
    const total = bar.getBoundingClientRect().height || 1;
    const progress = from === null ? (show ? 0 : 1) : Math.min(1, from / total);
    const remaining = show ? 1 - progress : progress;

    bar.classList.add('is-sliding');
    const animation = bar.animate(show ? [closed, open] : [open, closed], {
      duration: 220,
      easing: 'cubic-bezier(.2, .8, .2, 1)'
    });
    // Skip ahead when a reverse starts part of the way through.
    animation.currentTime = 220 * (1 - remaining);
    barSlide = animation;

    const settle = () => {
      if (barSlide !== animation) return;
      barSlide = null;
      bar.classList.remove('is-sliding');
      bar.hidden = !barVisible;
    };
    animation.onfinish = settle;
    animation.oncancel = () => {
      if (barSlide === animation) barSlide = null;
      bar.classList.remove('is-sliding');
    };
  }

  function updateBookmarks(message) {
    renderBookmarks();
    const palette = query('#us-tb-palette');
    if (palette && palette.open) renderPalette(false);
    if (message) announce(message);
    persistBookmarks();
  }

  function togglePin(id) {
    if (bookmarkLoadState !== 'ready') return;
    const index = bookmarkIds.indexOf(id);
    if (index === -1) bookmarkIds.push(id);
    else bookmarkIds.splice(index, 1);
    const route = destinationsById.get(id);
    updateBookmarks(route.name + (index === -1 ? ' bookmarked.' : ' removed from bookmarks.'));
    const star = query('[data-star="' + CSS.escape(id) + '"]');
    if (star) star.focus();
  }

  function moveBookmark(id, targetId) {
    if (bookmarkLoadState !== 'ready') return;
    const from = bookmarkIds.indexOf(id);
    const to = bookmarkIds.indexOf(targetId);
    if (from < 0 || to < 0 || from === to) return;
    bookmarkIds.splice(to, 0, bookmarkIds.splice(from, 1)[0]);
    updateBookmarks('Bookmark moved to position ' + (to + 1) + '.');
    const handle = query('[data-palette-handle="' + CSS.escape(id) + '"]');
    if (handle) handle.focus();
  }

  /* ── command palette ─────────────────────────────────── */

  function searchDestinations(term) {
    if (!term) return destinations.slice();
    if (window.Fuse) {
      if (!fuzzy) {
        fuzzy = new window.Fuse(destinations, {
          keys: ['name', 'shortName', 'category', 'keywords'],
          threshold: 0.36,
          ignoreLocation: true
        });
      }
      return fuzzy.search(term).map(match => match.item);
    }
    // Every whitespace-separated word must appear somewhere in the entry.
    const words = term.toLowerCase().split(/\s+/).filter(Boolean);
    return destinations.filter(route => {
      const haystack = (route.name + ' ' + route.shortName + ' ' + route.category + ' ' + route.keywords).toLowerCase();
      return words.every(word => haystack.includes(word));
    });
  }

  function renderPalette(reset) {
    if (paletteDrag) paletteDrag.cancel();
    const term = query('#us-tb-palette-query').value.trim();
    const matched = searchDestinations(term);

    // Matching bookmarks first in saved order, then the remaining destinations.
    const byId = new Map(matched.map(route => [route.id, route]));
    paletteResults = [
      ...bookmarkIds.filter(id => byId.has(id)).map(id => byId.get(id)),
      ...matched.filter(route => !bookmarkIds.includes(route.id))
    ];

    if (reset !== false) activeResult = 0;
    activeResult = Math.max(0, Math.min(activeResult, paletteResults.length - 1));
    query('#us-tb-palette-count').textContent = term
      ? paletteResults.length + ' destination' + (paletteResults.length === 1 ? '' : 's')
      : 'All destinations';

    const host = query('#us-tb-palette-results');
    const scrollTop = host.scrollTop;
    host.replaceChildren();

    if (!paletteResults.length) {
      host.innerHTML = '<div class="us-empty"><strong>No destinations found</strong>' +
        'Try “IQA”, “content”, “events” or “settings”.</div>';
      return;
    }

    paletteResults.forEach((route, index) => {
      const pinned = bookmarkIds.includes(route.id);
      const previousPinned = index ? bookmarkIds.includes(paletteResults[index - 1].id) : null;
      if (index === 0 || pinned !== previousPinned) {
        const heading = document.createElement('div');
        heading.className = 'us-palette-group' + (index ? ' us-palette-divider' : '');
        heading.textContent = pinned ? 'Bookmarks' : 'Other destinations';
        host.append(heading);
      }

      const row = document.createElement('div');
      row.className = 'us-palette-row' + (index === activeResult ? ' is-active' : '');
      row.dataset.paletteRoute = route.id;
      if (pinned) addDragHandle(row, route);

      const destination = createLink(
        'Open ' + route.name,
        icon(route.icon) + '<span><strong>' + escapeHtml(route.name) + '</strong>' +
          '<small>' + escapeHtml(route.category) + '</small></span>',
        'us-destination',
        websiteUrl(route.url),
        () => closePanels()
      );
      destination.addEventListener('focus', () => {
        activeResult = index;
        host.querySelectorAll('.us-palette-row').forEach((node, position) =>
          node.classList.toggle('is-active', position === index));
      });

      const star = createButton(
        (pinned ? 'Remove ' : 'Bookmark ') + route.name,
        icon(pinned ? 'star-filled' : 'star'),
        'us-nav-icon-button us-star',
        () => togglePin(route.id)
      );
      star.dataset.star = route.id;
      star.disabled = bookmarkLoadState !== 'ready';
      star.setAttribute('aria-pressed', String(pinned));

      row.append(destination, star);
      host.append(row);
    });

    host.scrollTop = reset === false ? scrollTop : 0;
    renderBookmarkLoadState();
  }

  function onPaletteKeydown(event) {
    if (paletteDrag && event.key !== 'Escape') {
      event.preventDefault();
      return;
    }
    if (['ArrowDown', 'ArrowUp'].includes(event.key) && paletteResults.length) {
      event.preventDefault();
      activeResult = (activeResult + (event.key === 'ArrowDown' ? 1 : -1) + paletteResults.length) % paletteResults.length;
      const row = query('#us-tb-palette-results').querySelectorAll('.us-palette-row')[activeResult];
      row.querySelector('.us-destination').focus();
      row.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter' && event.target === query('#us-tb-palette-query') && paletteResults.length) {
      event.preventDefault();
      query('#us-tb-palette-results').querySelectorAll('.us-palette-row')[activeResult]
        .querySelector('.us-destination').click();
    }
  }

  function addDragHandle(row, route) {
    const handle = createButton(
      'Reorder ' + route.name,
      icon('grip-vertical'),
      'us-nav-icon-button us-palette-drag'
    );
    handle.title = 'Drag to reorder. Alt + Up or Down also moves this bookmark.';
    handle.dataset.paletteHandle = route.id;
    handle.disabled = bookmarkLoadState !== 'ready';
    handle.draggable = false;
    handle.setAttribute('aria-keyshortcuts', 'Alt+ArrowUp Alt+ArrowDown');
    handle.addEventListener('keydown', event => {
      if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      const target = bookmarkIds[bookmarkIds.indexOf(route.id) + (event.key === 'ArrowUp' ? -1 : 1)];
      if (target) moveBookmark(route.id, target);
    });
    handle.addEventListener('pointerdown', event => startDrag(event, row, route));
    handle.addEventListener('dragstart', event => event.preventDefault());
    row.append(handle);
  }

  /**
   * Full-row pointer drag: the held row follows the pointer above the list while
   * a dashed placeholder moves between the bookmarked rows. Releasing inside the
   * list commits; Escape, lost capture or release outside cancels.
   */
  function startDrag(event, row, route) {
    if (bookmarkLoadState !== 'ready' || event.button !== 0 || !event.isPrimary || paletteDrag) return;
    event.preventDefault();

    const palette = query('#us-tb-palette');
    const host = query('#us-tb-palette-results');
    const bounds = row.getBoundingClientRect();
    const offset = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    const visibleIds = [...host.querySelectorAll('[data-palette-handle]')]
      .map(node => node.dataset.paletteHandle);

    const placeholder = document.createElement('div');
    placeholder.className = 'us-palette-placeholder';
    placeholder.style.height = bounds.height + 'px';
    placeholder.setAttribute('aria-hidden', 'true');
    row.before(placeholder);
    row.hidden = true;

    // Keep the floating row in the dialog's top layer, above its scrolling list.
    const floating = row.cloneNode(true);
    floating.hidden = false;
    floating.removeAttribute('data-palette-route');
    floating.classList.remove('is-active');
    floating.classList.add('us-palette-floating');
    floating.setAttribute('aria-hidden', 'true');
    floating.inert = true;
    floating.style.width = bounds.width + 'px';
    floating.style.height = bounds.height + 'px';
    floating.querySelectorAll('[data-palette-handle], [data-star]').forEach(node => {
      node.removeAttribute('data-palette-handle');
      node.removeAttribute('data-star');
    });
    palette.append(floating);
    palette.classList.add('is-sorting');

    let point = { x: event.clientX, y: event.clientY };
    let frame;
    let finished = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const slides = new Map();
    const candidates = () => [...host.querySelectorAll('.us-palette-row')]
      .filter(node => node !== row && visibleIds.includes(node.dataset.paletteRoute));

    function stopSlides() {
      slides.forEach(animation => animation.cancel());
      slides.clear();
    }

    function slideRows(rows, previousTops) {
      if (reducedMotion.matches) return;
      for (const node of rows) {
        const previousTop = previousTops.get(node.dataset.paletteRoute);
        const distance = previousTop - node.getBoundingClientRect().top;
        if (!Number.isFinite(distance) || Math.abs(distance) < 0.5) continue;
        const animation = node.animate([
          { transform: 'translateY(' + distance + 'px)' },
          { transform: 'translateY(0)' }
        ], { duration: 180, easing: 'cubic-bezier(.2, .8, .2, 1)' });
        slides.set(node, animation);
        animation.onfinish = () => {
          if (slides.get(node) === animation) slides.delete(node);
        };
      }
    }

    function position() {
      floating.style.left = point.x - offset.x + 'px';
      floating.style.top = point.y - offset.y + 'px';
      const listBounds = host.getBoundingClientRect();
      if (point.x < listBounds.left || point.x > listBounds.right) return;
      const rows = candidates();
      const next = rows.find(node => {
        const rect = node.getBoundingClientRect();
        // Hit-test settled positions so a sliding row cannot move the target.
        const transform = getComputedStyle(node).transform;
        const shift = transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42;
        return point.y < rect.top - shift + rect.height / 2;
      });
      const targetIndex = next ? rows.indexOf(next) : rows.length;
      const currentIndex = rows.filter(node =>
        node.compareDocumentPosition(placeholder) & Node.DOCUMENT_POSITION_FOLLOWING).length;
      if (targetIndex === currentIndex) return;
      const previousTops = new Map(rows.map(node =>
        [node.dataset.paletteRoute, node.getBoundingClientRect().top]));
      stopSlides();
      if (next) next.before(placeholder);
      else if (rows.length) rows[rows.length - 1].after(placeholder);
      slideRows(rows, previousTops);
    }

    function tick() {
      const rect = host.getBoundingClientRect();
      if (point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom) {
        const speed = point.y < rect.top + 38 ? -7 : point.y > rect.bottom - 38 ? 7 : 0;
        if (speed) host.scrollTop += speed;
      }
      position();
      frame = requestAnimationFrame(tick);
    }

    function move(moveEvent) {
      if (moveEvent.pointerId !== event.pointerId) return;
      moveEvent.preventDefault();
      point = { x: moveEvent.clientX, y: moveEvent.clientY };
      position();
    }

    function finish(commit) {
      if (finished) return;
      finished = true;
      paletteDrag = null;
      cancelAnimationFrame(frame);
      const previousTops = new Map(candidates().map(node =>
        [node.dataset.paletteRoute, node.getBoundingClientRect().top]));
      stopSlides();
      palette.removeEventListener('pointermove', move);
      palette.removeEventListener('pointerup', release);
      palette.removeEventListener('pointercancel', cancel);
      palette.removeEventListener('lostpointercapture', cancel);
      window.removeEventListener('blur', cancel);
      if (palette.hasPointerCapture(event.pointerId)) palette.releasePointerCapture(event.pointerId);

      if (commit) {
        const order = [...host.children].flatMap(node =>
          node === placeholder ? [route.id]
            : node !== row && visibleIds.includes(node.dataset.paletteRoute) ? [node.dataset.paletteRoute]
              : []);
        // While filtering, reorder matching slots and leave the rest in place.
        let index = 0;
        bookmarkIds = bookmarkIds.map(id => visibleIds.includes(id) ? order[index++] : id);
      }

      row.hidden = false;
      placeholder.remove();
      floating.remove();
      palette.classList.remove('is-sorting');
      if (commit) updateBookmarks('Bookmark order updated.');
      else {
        renderPalette(false);
        announce('Bookmark move cancelled.');
      }
      slideRows([...host.querySelectorAll('.us-palette-row')], previousTops);
      const handle = query('[data-palette-handle="' + CSS.escape(route.id) + '"]');
      if (handle) handle.focus();
    }

    function release(upEvent) {
      if (upEvent.pointerId !== event.pointerId) return;
      const rect = host.getBoundingClientRect();
      finish(upEvent.clientX >= rect.left && upEvent.clientX <= rect.right &&
        upEvent.clientY >= rect.top && upEvent.clientY <= rect.bottom);
    }

    function cancel() { finish(false); }

    paletteDrag = { cancel };
    palette.addEventListener('pointermove', move);
    palette.addEventListener('pointerup', release);
    palette.addEventListener('pointercancel', cancel);
    palette.addEventListener('lostpointercapture', cancel);
    window.addEventListener('blur', cancel);
    palette.setPointerCapture(event.pointerId);
    announce('Moving ' + route.name + '. Escape cancels.');
    position();
    frame = requestAnimationFrame(tick);
  }

  /* ── recents ─────────────────────────────────────────── */

  const recentsSections = [
    { type: 'iqa', label: 'IQAs', icon: 'file-search' },
    { type: 'content', label: 'Content', icon: 'layout' }
  ];

  function setRecentsBusy(busy) {
    const control = query('#us-tb-recents-refresh');
    if (!control) return;
    control.disabled = busy;
    control.setAttribute('aria-busy', String(busy));
    control.querySelector('.us-button-spinner').hidden = !busy;
    control.querySelector('.ti').hidden = busy;
    query('#us-tb-recents-results').setAttribute('aria-busy', String(busy));
  }

  function fetchRecents(type) {
    const queryName = settings.recentsQueries[type][scope];
    const path = '/api/query?queryname=' + encodeURIComponent(queryName) +
      '&limit=' + settings.recentsLimit;
    return apiFetch(path).then(data => (data && data.Items && data.Items.$values) || []);
  }

  function loadRecents() {
    const version = ++recentsVersion;
    const host = query('#us-tb-recents-results');
    if (!host) return;
    setRecentsBusy(true);
    query('#us-tb-recents-count').textContent = 'Loading…';

    Promise.all(recentsSections.map(section =>
      fetchRecents(section.type).then(
        items => ({ section, items }),
        error => ({ section, error })
      )
    )).then(results => {
      if (version !== recentsVersion) return;
      setRecentsBusy(false);
      renderRecents(results);
      announce('Recent items updated.');
    });
  }

  function renderRecents(results) {
    const host = query('#us-tb-recents-results');
    host.replaceChildren();
    const partyId = loggedInPartyId();
    let total = 0;
    let failed = 0;

    for (const result of results) {
      const section = document.createElement('section');
      section.className = 'us-recents-section';
      const count = result.items ? result.items.length : 0;
      total += count;
      section.innerHTML = '<h3>' + icon(result.section.icon) + escapeHtml(result.section.label) +
        ' <span>· ' + (result.error ? '—' : count) + '</span></h3>';

      const list = document.createElement('div');
      list.className = 'us-recents-list';

      if (result.error) {
        failed++;
        list.innerHTML = '<div class="us-empty"><strong>Could not load ' +
          escapeHtml(result.section.label) + '</strong>Use Refresh to try again.</div>';
      } else if (!count) {
        list.innerHTML = '<div class="us-empty"><strong>Nothing recent</strong>' +
          'No ' + escapeHtml(result.section.label) + ' have been modified yet.</div>';
      } else {
        for (const item of result.items) list.append(createRecentItem(result.section, item, partyId));
      }

      section.append(list);
      host.append(section);
    }

    query('#us-tb-recents-count').textContent = failed
      ? 'Some items unavailable'
      : scope === 'mine' ? total + ' modified by you' : 'Last ' + settings.recentsLimit + ' of each type';
  }

  /**
   * Mine is served by the "- User" queries, which are already filtered to the
   * signed-in user and do not return the modifier columns, so the byline is the
   * time alone. Sitewide names the modifier, and says "You" for the reader's own
   * work. An unnamed modifier is left out rather than shown as unknown.
   */
  function modifiedBy(item, partyId) {
    if (scope === 'mine') return '';
    if (partyId && item.UpdatedByUserID != null && String(item.UpdatedByUserID) === partyId) return 'You';
    return item.UpdatedByUsername || '';
  }

  /**
   * The containing folder, keeping the "$/" prefix and dropping the document's
   * own name: "$/_i4u_/SandBox/CRM Layouts/Jobs List" becomes
   * "$/_i4u_/SandBox/CRM Layouts". A document at the root shows "$/".
   * Underscored iMIS folder names are shown exactly as stored.
   */
  function folderPath(item) {
    const path = typeof item.Path === 'string' ? item.Path.trim() : '';
    if (!path) return '';
    const segments = path.split('/');
    segments.pop();
    const folder = segments.join('/');
    return folder === '$' ? '$/' : folder;
  }

  function createRecentItem(section, item, partyId) {
    const title = item.AlternateName || item.DocumentName || 'Untitled';
    const folder = folderPath(item);
    const meta = [modifiedBy(item, partyId), relativeTime(item.UpdatedOn)]
      .filter(Boolean)
      .join(' · ');

    // The folder takes the leftover width and ellipsises; the rest never wraps,
    // so a row stays two lines however deep the folder is.
    const detail = folder
      ? '<span class="us-recent-item__path">' + escapeHtml(folder) + '</span>' +
        (meta ? '<span class="us-recent-item__meta">' + escapeHtml(meta) + '</span>' : '')
      : (meta ? '<span class="us-recent-item__meta">' + escapeHtml(meta) + '</span>' : '');

    const node = createButton(
      'Open ' + title,
      '<span class="us-recent-item__text"><strong>' + escapeHtml(title) + '</strong>' +
        (detail ? '<small>' + detail + '</small>' : '') + '</span>' +
        icon('arrow-up-right'),
      'us-recent-item',
      () => openRecentItem(section, item, title)
    );
    // The visible folder may be clipped, so the tooltip carries the full path.
    if (item.Path) node.title = title + '\n' + item.Path;

    // A button cannot hold another button, so the row wraps the open button
    // and a copy button. The theme's shared US-COPY controller (zUnionSuite.js)
    // copies the full path, folder and name ("$/_i4u_/…/Jobs List", owner
    // 6 October 2026), shows its tick and "Copied", and flashes the folder,
    // as copy buttons do elsewhere.
    const row = document.createElement('div');
    row.className = 'us-recent-row';
    row.append(node);
    const path = node.querySelector('.us-recent-item__path');
    if (path) {
      const fullPath = item.Path.trim();
      const kind = section.type === 'iqa' ? 'IQA' : 'page';
      path.id = 'us-tb-recent-path-' + (++recentPathCount);
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'us-copy us-recent-copy';
      copy.dataset.usCopyTarget = path.id;
      copy.dataset.usCopyText = fullPath;
      copy.setAttribute('aria-label', 'Copy full ' + kind + ' path: ' + fullPath);
      copy.title = 'Copy full ' + kind + ' path';
      row.append(copy);
    }
    return row;
  }

  function openRecentItem(section, item, title) {
    const url = websiteUrl(
      settings.editorUrls[section.type].replace('{key}', encodeURIComponent(item.DocumentVersionKey))
    );
    closePanels(true);
    window.ShowDialog_NoReturnValue(
      url,
      null,
      settings.dialogSize.width,
      settings.dialogSize.height,
      section.type === 'iqa' ? 'Edit IQA' : 'Edit Content Page',
      null,
      'E'
    );
    announce('Opening ' + title + '.');
  }

  /* ── mounting ────────────────────────────────────────── */

  function mount() {
    const bar = document.querySelector('#injected-taskbar');
    if (!bar) return false;
    // Normally the management shortcuts mark our slot. A header that was cloned
    // rather than re-rendered can arrive with a stale copy of our own strip
    // instead, so accept that as the anchor too and replace it.
    const anchor = bar.querySelector('.us-taskbar__quick-links, #us-tb-bookmarks, .us-bookmarks-slot');
    if (!anchor) return false;

    // Clear anything left behind by a previous mount we no longer own.
    bar.querySelectorAll('.us-taskbar-tools, .us-bookmarks-toggle').forEach(node => node.remove());
    document.querySelectorAll('.us-bookmarks-bar').forEach(node => node.remove());

    injectStyles();
    buildPanels();

    // The bookmark strip takes the management shortcuts' place in the main row.
    const strip = document.createElement('nav');
    strip.id = 'us-tb-bookmarks';
    strip.className = 'us-bookmarks';
    strip.setAttribute('aria-label', 'Your bookmarked destinations');
    anchor.replaceWith(strip);

    const tools = document.createElement('div');
    tools.className = 'us-taskbar-tools';

    const toggle = createButton(
      'Toggle bookmarks bar',
      icon('star'),
      'us-nav-icon-button us-bookmarks-toggle',
      () => {
        closePanels();
        barVisible = !barVisible;
        writeBarVisible(barVisible);
        renderBookmarks();
        slideBar(barVisible);
        query('#us-tb-bookmarks-toggle').focus();
      }
    );
    toggle.id = 'us-tb-bookmarks-toggle';
    toggle.setAttribute('aria-controls', 'us-tb-bookmarks-bar-nav');

    const paletteButton = createButton(
      'Open command palette',
      icon('command') + '<span>Go to…</span>',
      'us-feature-button',
      event => openPanel('palette', event.currentTarget)
    );
    paletteButton.dataset.open = 'palette';
    paletteButton.setAttribute('aria-haspopup', 'dialog');
    paletteButton.setAttribute('aria-expanded', 'false');
    paletteButton.setAttribute('aria-controls', 'us-tb-palette');
    paletteButton.setAttribute('aria-keyshortcuts', 'Control+Space');

    const recentsButton = createButton(
      'Open Recents',
      icon('history') + '<span>Recents</span>',
      'us-feature-button',
      event => {
        const panel = query('#us-tb-recents');
        if (!panel.hidden) closePanels(true);
        else openPanel('recents', event.currentTarget);
      }
    );
    recentsButton.dataset.open = 'recents';
    recentsButton.setAttribute('aria-haspopup', 'dialog');
    recentsButton.setAttribute('aria-expanded', 'false');
    recentsButton.setAttribute('aria-controls', 'us-tb-recents');

    tools.append(paletteButton);
    strip.after(tools);
    // Like a browser's bookmarks control, the toggle closes the row at its far
    // right, after the appearance switch.
    bar.append(toggle);

    // The labelled bar sits directly under the taskbar row.
    // The labelled bar spans the header, so it belongs beside the auxiliary row
    // rather than inside .navbar-right where the taskbar itself sits.
    const barHost = document.createElement('div');
    barHost.id = 'us-tb-bookmarks-bar';
    barHost.className = 'us-bookmarks-bar';
    barHost.hidden = true;
    const auxiliary = document.querySelector('#hd > #masterTopBarAuxiliary');
    if (auxiliary) auxiliary.after(barHost);
    else bar.after(barHost);

    mounted = { bar, strip, tools, toggle, barHost, recentsButton };
    renderBookmarks();
    renderBookmarkLoadState();
    return true;
  }

  function unmount() {
    if (!mounted) return;
    if (mounted.strip.isConnected) {
      // Leave an empty marker in the strip's place. The management shortcuts it
      // replaced are gone, so without this a later initialise() on an unchanged
      // taskbar would find no slot to mount into.
      const slot = document.createElement('div');
      slot.className = 'us-bookmarks-slot';
      slot.hidden = true;
      mounted.strip.replaceWith(slot);
    }
    if (mounted.tools.isConnected) mounted.tools.remove();
    if (mounted.toggle.isConnected) mounted.toggle.remove();
    if (mounted.barHost.isConnected) mounted.barHost.remove();
    mounted = null;
  }

  function refresh() {
    if (stopped) return;
    // Compare identity, not just connectedness: a replaced header can leave our
    // old nodes connected inside a subtree that is no longer the live taskbar.
    const bar = document.querySelector('#injected-taskbar');
    const current = mounted && mounted.bar === bar &&
      mounted.strip.isConnected && mounted.toggle.isConnected && mounted.barHost.isConnected;
    if (current) return;
    unmount();
    mount();
  }

  function onDocumentClick(event) {
    const inside = event.composedPath().some(node =>
      node instanceof Element &&
      node.matches('.us-popover, .us-palette, .us-feature-button, .us-bookmarks, .us-taskbar-tools, .us-bookmarks-toggle, .us-bookmarks-bar'));
    if (!inside) closePanels();
  }

  function onDocumentKeydown(event) {
    if (event.ctrlKey && event.code === 'Space' && !event.altKey && !event.shiftKey && !event.metaKey && !event.repeat) {
      if (!mounted) return;
      event.preventDefault();
      const palette = query('#us-tb-palette');
      if (palette && palette.open) closePanels(true);
      else openPanel('palette', query('[data-open="palette"]'));
    } else if (event.key === 'Escape') {
      closePanels(true);
    }
  }

  function onResize() {
    if (mounted) renderBookmarks();
    const recents = query('#us-tb-recents');
    if (recents && !recents.hidden) positionPanel(recents, returnFocus);
  }

  function initialise() {
    stopped = false;
    barVisible = readBarVisible();
    if (!mount()) return;

    loadBookmarks();

    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onDocumentKeydown);
    window.addEventListener('resize', onResize);
    window.addEventListener('pageshow', clearBusyPins);

    // iMIS partial postbacks and the taskbar's own remount replace the host row.
    if (!observer) {
      observer = new MutationObserver(() => {
        if (mountTimer !== null) return;
        mountTimer = setTimeout(() => { mountTimer = null; refresh(); }, 0);
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  function destroy() {
    stopped = true;
    bookmarkLoadVersion++;
    bookmarkLoadState = 'idle';
    closePanels();
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    clearTimeout(mountTimer);
    clearTimeout(toastTimer);
    mountTimer = null;
    document.removeEventListener('click', onDocumentClick);
    document.removeEventListener('keydown', onDocumentKeydown);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pageshow', clearBusyPins);
    unmount();
    ['#us-tb-palette', '#us-tb-recents', '#us-tb-toast', '#us-tb-live', '#' + STYLE_ID]
      .forEach(selector => {
        const node = query(selector);
        if (node) node.remove();
      });
  }

  window.UnionSuiteTaskbarBookmarks = Object.freeze({
    version: '0.1',
    initialise,
    refresh,
    destroy,
    destinations,
    getBookmarks: () => bookmarkIds.slice()
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialise, { once: true });
  } else {
    initialise();
  }
})();
