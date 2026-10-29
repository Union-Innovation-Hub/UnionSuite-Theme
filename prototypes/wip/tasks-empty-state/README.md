# Biscuit task empty state

Status: implemented in the shared theme for `us-home-tasks`. This original visual
mockup remains as the accepted design reference, not a second implementation.
Maintained behaviour/drawing now lives in `Theme/UnionSuite/zUnionSuite.js`, with
component CSS in `zUnionSuite.css`. Installation, the No results template and the
live supported example are in the canonical usage guide, `#home-tasks-empty`.

The home page needs a friendly message when the logged-in user has no outstanding
tasks. This concept places Biscuit asleep in a gently rocking hammock inside the
My tasks panel. The drawing adapts Biscuit's existing tan fur, cream blaze,
brown floppy ears, eye patch, mint collar and gold tag from the mascot source.

Maintained files: `index.html` and `empty-state.css`. Theme tokens are loaded from
the shared theme; illustration and page geometry remain local to this prototype.
Open `index.html` directly, or run `python -m http.server 8765` from the repository
root and visit `/prototypes/wip/tasks-empty-state/`.

The preview width and motion controls affect this demo only. Reduced motion
disables the rocking automatically. The illustration is decorative; the visible
heading and description communicate the actual state.

The production version counts loaded tasks before search filtering and uses an
explicit No results paragraph for queries without a result container. It settles
the hammock once, rather than running continuously. The query remains responsible
for user scoping and including all outstanding records. No open design decisions.
