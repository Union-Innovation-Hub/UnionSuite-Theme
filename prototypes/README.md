# Design lifecycle

Keep current ideas and accepted implementation specifications in Git. The
maintained guide and implemented author templates live in
`Theme/UnionSuite-Guides/usage/`.

| Stage | Location | Exit condition |
|---|---|---|
| Work in progress | `wip/` | A direction is approved or the experiment is abandoned |
| Approved, awaiting implementation | `approved/` | Behaviour is implemented, tested and documented |
| Implemented | Production theme plus `UnionSuite-Guides/usage/` | Ongoing maintenance belongs to these canonical sources |
| Not yet classified | `legacy/` | Each item is moved to one of the other stages |
| Superseded research | Repository-root `archive/` | Ignored by Git; retain locally only if useful |

Approval moves a design to `approved/`, not to the archive. Each active design
should record its status, source files, preview/build command, acceptance decisions
and implementation-plan link. Ignore generated captures and obsolete alternatives,
not the only copy of an accepted requirement.

Option C taskbar, palette and Recents sources are in `approved/taskbar/`.

`legacy/` holds the prototypes, comparisons and fixtures that sat loose in this
folder before the lifecycle existed (gathered there 28 October 2026). They
remain tracked pending explicit classification, and many are still live
inputs: most `tools/build-*-comparison.cjs` and `tools/build-*-preview.cjs`
generators read their CSS and JS from here to build `references/*.html`, and
the usage guide links several. Do not bulk-archive a folder merely because its
name says prototype or comparison; check what reads it first.

Archiving a previously tracked file requires removing it from the Git index as
well as adding an ignore rule. This does not remove its earlier committed history.
No commit or push is performed without explicit approval.
