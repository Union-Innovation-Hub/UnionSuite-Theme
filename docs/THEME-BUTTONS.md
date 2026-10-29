# Native iMIS buttons

The theme extends existing iMIS button classes. Native generated roles are preserved. Authored main actions that previously
relied on plain TextButton being orange should add PrimaryButton. CSS is maintained between
`US-NATIVE-BUTTONS:START/END` in `Theme/UnionSuite/zUnionSuite.css`, before the
report and banner sections. The native stylesheets still own button dimensions,
typography, size variants, grouping, icons and click/submit behaviour.

## Implemented colour mapping

| Existing class | Treatment | Tokens |
|---|---|---|
| `TextButton`, `btn` | Default navy secondary action | `--brand-800`, `--brand-900`, `--text-inverse` |
| `PrimaryButton` | Primary action: orange, with surface reversal | `--accent`, `--accent-hover`, `--text-on-accent` |
| `UsePrimaryButton` | Native container setting; applies orange primary colours to descendant `TextButton` controls | Same as `PrimaryButton` |
| `AccentButton` | Accent on a button, or on descendant `TextButton` controls when used on a container | Same as PrimaryButton; explicit accent alias |
| `LinkButton`, `btn btn-link` | Transparent, lower-emphasis action; underline on hover/press | `--text-link`, `--text-link-hover` |
| `DangerButton` | Destructive action | `--danger`, `--text-inverse`; darker derived hover |
| `SuccessButton` | Explicit positive action | `--success`, `--text-inverse`; darker derived hover |

Use native modifiers alongside the base class, e.g. `TextButton DangerButton`.
Primary/Accent/Danger/Success/Link colouring also covers existing controls which
only carry the modifier. Do not apply a base button class to an entire iPart or
zone. `UsePrimaryButton` and the native `AccentButton` container recipe are the
explicit wrapper exceptions.

`--success` is the darker, readable green, rather than the native bright green
fill with white text. Danger and success do not follow brand-accent changes.
The supplied brand pairing uses dark text on orange. Recheck text contrast when
changing client seeds; CSS does not automatically choose black or white.

The native sheets contain **no dedicated `SecondaryButton`, `WarningButton`,
`btn-secondary`, `btn-danger`, `btn-warning` or `btn-success` rules**. These are
not implemented aliases. Use `LinkButton` for a lower-emphasis action; use `us-outline-button` for an outlined supporting action and `us-warning-button` for warning styling. Never infer
danger from a button's label, ID or `type="reset"`.

## Action icons and compact row controls

Implemented in `US-ACTION-ICONS` sections of the shared CSS and JS. Native
`TextButton` and `btn` remain the base classes. Adding a direct child such as
`<i class="ti ti-pencil" aria-hidden="true"></i>` aligns an 18px Tabler icon
with visible button text. Banner menu items and report action-slot controls
also support a direct `ti` child. Keep the bundled `Tabler.css` and font assets.

For authored icon-only row actions, add `us-icon-button` to the **button/link
itself**, alongside its base class. It supplies a transparent 36px control
(44px with coarse pointers), brand text and a brand-tinted hover. `DangerButton`
and `SuccessButton` select semantic text/hover colours; filled labelled controls
retain the native colour mapping. This is a presentation modifier, not a new
base button family. Do not put it on iParts/zones/pages or retrofit it into
native input/image controls by replacing their postback behaviour.

Icon-only controls need a record-specific `aria-label`; decorative icons use
`aria-hidden="true"`. Shared JS shows that label on hover/focus in a hoverable,
viewport-positioned tooltip. Escape dismisses it. Delegated events support newly
rendered controls and duplicate includes are safe. The accessible name works
without JavaScript. Preserve native commands, availability and refresh handlers.

The guide covers 25 meanings: View/eye, Edit/pencil, Delete/trash, Add/plus,
Save/device-floppy, Cancel/x, Duplicate/copy, Archive/archive, Restore/restore,
Download/download, Upload/upload, Attach/paperclip, History/history, Open new
tab/external-link, More/dots, Assign/user-check, Complete/check, Note/note,
Email/mail, Call/phone, Schedule/calendar-plus, Link/link, Unlink/unlink, Pin/pin
and Refresh/refresh. `docs/action-catalog.cjs` maintains these documentation
mappings. It is **not** the planned business-action registry; no command is
inferred from its text or ID.

Each gallery recipe has a visual, class chips, exact placement and HTML Copy
buttons. Copied commands start disabled until connected. The dummy IQA uses
fictional data only. In production, native iMIS supplies the data operations.

## Inventory of the native sheets

Inspected `Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css`, `legacy/Native CSS/Orion-99.css` and
the current theme's `Theme/UnionSuite/99-Orion.css`. The two Orion captures are
identical after normalising line endings. A class appearing in a selector is
not evidence of a complete standalone component.

| Class family found | Treatment in this change |
|---|---|
| `TextButton`, `btn`, `PrimaryButton`, `UsePrimaryButton`, `AccentButton`, `LinkButton`, `DangerButton`, `SuccessButton` | Token colour mapping above |
| `SmallButton`, `MediumButton`, `LargeButton`; `UseSmallButton`, `UseMediumButton`, `UseLargeButton`; `StandardButtonMd` | Native sizing retained |
| `FullWidthButton`, `UseFullWidthButton` | Native full width retained |
| `btn-group`, `btn-group-vertical`, `btn-group-justified`, `btn-toolbar`, `dropdown-toggle`, `dropup`, `caret` | Native structure, adjoining corners, dropdown layout and handlers retained; individual `btn` children receive colours |
| `btn-lg`, `btn-xs`, `btn-group-xs`, `btn-block`, `btn-link`, `btn-check` | Native references found; several only adjust badges/carets or contextual checked states. No missing Bootstrap utilities are invented. `btn btn-link` receives link colours. |
| `SignInButton`, `AddToCartButton` | Context/layout classes; receive ordinary colours when also carrying `TextButton`/`btn`. Preserve native width, icon and commerce behaviour. |
| `TextButton Facebook`, `SignInButton LinkedIn`, `btn FeatureButton` | Specialised social/feature presentation excluded from the shared colour override |
| `PrintButton`, `TextOnlyButton`, `ExitTextOnlyButton`, `EmailButton` | Native icon/sprite controls, not ordinary action buttons |
| `ruButton`, `ruBrowse`, `ruRemove`, `RadButton`, `rbSkinnedButton`, `rcbActionButton`, `rgPagerButton`, `rgActionButton`, `rdpPagerButton`, `radToolTip_CloseButton`, `reAjaxspell_button` | Telerik widget and skin controls; retain native styling |
| `EasyEdit-ActionButton`, `genai-dialog-button`, `genai-command-button`, `nav-aux-button`, `sshCustomCompactButton`, `fb_button`, `sp-button`, `sp-palette-button`, `adjust-button` | Editor, navigation or specialised plugin controls; retain native styling |

`rwPopupButton` is identified in the existing widget inventory but has no rule
in these two native CSS captures. Its separate Telerik skin is not migrated.
The splitter's `rspCollapseBarSpacer` is another reason never to style bare
`button` or `input[type=button|submit|reset]` selectors globally.

## Context and states

- Explicit native wrapper and RadGrid selectors cover the native specificity,
  including submit inputs and primary/accent controls. No `!important` reset
  or new JavaScript is added.
- Hover/pressed, keyboard focus, `disabled`, disabled fieldsets, `.disabled`,
  `.aspNetDisabled` and `[aria-disabled="true"]` styling are covered. Disabled
  controls keep their base colour when hovered. Native reduced-motion and
  transition rules remain in place.
- CSS availability styling does not disable a command. Keep native iMIS
  availability handling. Custom buttons use real `disabled`; custom disabled
  links must have no live destination/handler. `aria-disabled` alone is not a
  functional lock.
- Report Find and existing filled report action slots use the accent too.
  Report Export retains its neutral utility treatment. Existing banner actions
  retain their inverse styles and accent primary option. Contextual native
  account-banner and toolbar rules can still take precedence intentionally.
- `--button-*` aliases are local component settings, not new author classes.
  A deliberate client override can target an existing class in
  `zzClientSpecific.css`; the defaults have low specificity.

## Validation and deployment

The standalone usage guide includes native-class examples and copyable markup.
Its button example imports native CSS and the actual shared button rules.
Regenerate the guide and banner preview after shared stylesheet changes.

Local browser verification covers element forms and grid/wrapper combinations,
native geometry, specialised controls, branding, states, navigation, report
actions and narrow layouts. This is a local theme change; deployment and live
iMIS popup/partial-refresh checks remain necessary before claiming site-wide
coverage. The separate banner tab switcher remains deferred.

### Primary reversal
Shared PrimaryButton and UsePrimaryButton TextButton paths use a solid 1px accent border, surface reversal with dark text on hover and accent-100 while pressed. Plain TextButton/btn use navy, a navy hover border and brand-50 while pressed. Keyboard focus remains visible; reduced motion disables transitions. Compact icon buttons and semantic/specialised controls are excluded.

### Harmonised filled states and purpose reference
Orange, navy, danger and success buttons share surface reversal, coloured borders and tinted pressed states. Orange hover text stays text-strong for readability. IQA Find and filled header actions use the same pattern; banner actions retain their contextual treatment. The purpose labels Primary (orange) and Secondary (navy) do not rename native classes.

`references/Button-Reference.html` contains the purpose table, live examples, copyable recipes and implemented outline/warning styles. Rebuild with `node tools/build-form-preview.cjs` then `node tools/build-button-reference.cjs`; the reference embeds the shared/native CSS.

Filled buttons and filled IQA actions use an inset 1px/3px shadow at 10% black on hover, deepening to 2px/4px at 18% while pressed. Icon/link controls and disabled states are excluded; the outer keyboard focus outline remains visible.

Compact record actions now gain a matching border, a stronger semantic tint and a small inset shadow only while pressed. Hover remains unchanged; disabled controls are excluded and dimensions stay fixed.

### Supporting and warning actions — implemented
Use `TextButton us-outline-button` (navy outline, pale hover) or `TextButton us-warning-button` (semantic amber tint, surface hover) on the actual button/link, not its container. Native base classes and handlers remain. Choose one emphasis/semantic modifier; do not combine these with PrimaryButton/DangerButton/SuccessButton. Earlier statements describing these treatments as future proposals are superseded.

Positive/destructive colours already use `--success`/`--success-bg` and `--danger`/`--danger-bg`, mapped to status-green/status-red tokens. Warning uses warning/warning-bg mapped to status-amber. These remain independent of brand seeds.

### Approved busy ring
Use `us-button-spinner` on an aria-hidden span inside a button; it uses currentColor at 16px and stops rotating under reduced motion. Use meaningful busy text and aria-busy on the control. The handler owns width preservation, repeat-submission protection, cleanup and outcome announcements. Automatic behavior is limited to the recognised native adapters documented below. Section spinning circles are implemented for supported popup/panel loading and IQA refresh overlays; other page-level lifecycles require separate integration.

### Explicit busy integration
`UnionSuiteButtons.run(button, asyncOperation, busyLabel)` returns a Promise, reserves width, prevents repeated runs for that element and restores original DOM children/availability in finally. Rejections propagate to the caller for error reporting. Input buttons use the shared positioned ring; compact controls use a centred ring. Call only from verified asynchronous action handlers and await real completion; do not wrap a native postback or assume a timeout indicates success.

### Native IQA Find adapter
The live probe confirmed PageRequestManager: one beginRequest, two cancelled initializeRequest attempts, then successful endRequest. US-IQA-BUSY now attaches to begin/end only. It centres the shared ring inside recognised native Find inputs, preserves layout and disabled state, and restores aria-busy on cleanup. No custom onclick, duplicate postback or error suppression is added. Duplicate includes and ASP.NET application loads are idempotent. Live visual verification remains after deploying the updated JS/CSS.

IQA adapter v1.1 centres the ring inside Find. Runtime us-iqa-find-busy hides label paint only; the native value, accessible name, size and disabled state remain intact. Completion/error restores the label. This replaces the earlier adjacent placement. Deploy both CSS and JS.

## Native sign-in busy state
UnionSuiteSignInBusy observes enabled-to-disabled transitions on input.TextButton.SignInButton[type=submit]. It retains the native Signing In… text and reserves leading padding for the simple ring, centring the ring and label together without accessing credentials or changing native validation/postback, value or disabled state. Cleanup follows re-enable, removal, PRM endRequest and page lifecycle. The owner confirmed the sign-in spinner works; additional failure/recovery states still need live checks.

The sign-in overlay ring copies the disabled button opacity as well as its text colour, matching the faded native label.

Native IQA Export dropdowns retain a pressed brand-tinted appearance while their btn-group is open or aria-expanded is true. Native dropdown scripts still own state; no extra author class is needed.

Native CommandBar Save inputs with TextButton.Save and data-ajaxupdatedcontrolid receive a centred simple ring on native enabled-to-disabled transitions via UnionSuiteSaveBusy. Native validation runs first; no submission or disabled state is changed. Cancel is excluded.

## Shared spinner presentation (current)
UnionSuiteBusy.show(button, {mode}) returns an idempotent handle with clear(); UnionSuiteBusy.clear(button) is the equivalent convenience API. Modes: auto (default, leading ring and text if space permits), center (ring only), label (leading ring with retained label). It reserves width, mirrors disabled opacity, follows scroll/resize and restores its styling/ARIA changes. It does not own submission, validation or disabled state. UnionSuiteButtons.run is the Promise lifecycle helper and delegates presentation to it. Native IQA/SignIn/Save adapters likewise delegate presentation while retaining their existing trigger and completion rules. Use only one lifecycle owner per control. Native adapters do not globally turn disabled controls into busy controls.

## Additional native adapters
UnionSuiteWizardBusy 1.2 handles recognised CCO Next/Previous inputs on accepted partial and full-page submissions. Next is disabled after submission values are captured, and restored on cleanup; Previous keeps native disabled handling. The owner confirmed navigation loading works.

UnionSuiteThemeSaveBusy 1.2 covers Theme Upload Save (_AppThemeEditControl_UploadButton), Import (_TemplateBody_ImportButton), and initial Upload (_TemplateBody_UploadButton inside _ImporterControlPanel). It uses the centred ring and accepted-request disabling while preserving validation and submit values. Native file selection still controls the initially disabled Upload button. Verify blocked validation and recovery live.

Select/Remove inside Theme Upload and XML Import use scoped secondary hover/focus/pressed styling; these file controls are not postback busy actions. UnionSuiteIqaRefresh uses the section circles over its target grid, rather than a button ring.
