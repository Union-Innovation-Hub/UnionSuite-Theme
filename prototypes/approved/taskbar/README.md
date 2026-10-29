# Approved taskbar, palette and Recents

Status: Option C approved on 20 September 2026; production integration is pending.
Keep this specification tracked until implementation, verification and guide
promotion are complete.

- [Taskbar decisions and source details](Taskbar-Workshop.md)
- [Recents decisions and source details](Recents-Workshop.md)
- [Integration and loader plan](../../../docs/THEME-ENHANCEMENTS-INTEGRATION-PLAN.md)
- [Taskbar preview](../../../references/Taskbar-Workshop.html)
- [Recents preview](../../../references/Recents-Workshop.html)

From the project root, rebuild with `node tools/build-taskbar-workshop.cjs` and
`node tools/build-recents-workshop.cjs`; add `--check` to verify either output.
The generated previews stay tracked as an exception so the accepted design is
directly reviewable. A and B are retained within the workshop for context; C is
the accepted direction. See the integration plan for remaining production work.

Use the existing theme tokens and shared popup conventions when implementing the
design. Move implemented documentation, author templates and maintained examples
into `Theme/UnionSuite-Guides/usage/`. Archive alternatives only after their useful
decisions are preserved there and no maintained build depends on them.
