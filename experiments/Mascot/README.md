# Mascot prototypes

Open `pip-koala.html`, `pip-koala-v2.html` or `biscuit-puppy.html` in a browser to play the standalone prototype.

| Character | Browser prototype | Editable source |
| --- | --- | --- |
| Pip, the mint koala | `pip-koala.html` | `pip-koala.source.html` |
| Pip v2, rounder and livelier | `pip-koala-v2.html` | `pip-koala-v2.source.html` |
| Biscuit, the floppy-eared puppy | `biscuit-puppy.html` | `biscuit-puppy.source.html` |

Each source file contains the complete HTML, CSS drawing and animation, and JavaScript timing and interactions. No image assets or animation library are needed for any mascot.

Pip v1 keeps its original simple CSS drawing: outlined mint fur, round ears, small shiny eyes and the same nose, smile and paws. It now borrows v2's look-around while peeking, springy arrival with squash and stretch, gentle idle breathing, irregular blinks (sometimes doubled), occasional ear twitches, subtle pointer-following head turns, ears that perk on hover, a smooth two-second wave with a body bounce and ear wiggle, and an anticipation dip before leaving. The gaze resets when the pointer leaves or a visit restarts. Arrival, breathing and wave movement use separate layers so finishing a wave does not replay the landing.

Pip v2 draws the character as inline SVG instead of CSS boxes, which allows soft gradient fur with no outlines, fluffy ears and cheeks, big two-catchlight eyes, a sprout of hair, and paws that grip the taskbar edge. Its wave also switches to happy eyes and an open smile. Both Pip versions retain the koala/blob, colour and size design controls. The exported preview shell uses optional external scripts for its surrounding icons and preview helpers; the mascots themselves make no requests. Codex design controls are optional and only appear in a host that provides them.

All prototypes peek above the taskbar, blink, look towards the pointer, wave on arrival and wave again when clicked. Replay visit restarts the sequence. Biscuit also wags his tail, flops an ear and briefly shows his tongue while waving. None has a speech bubble or hearts. Pip v1's reduced-motion mode skips the animated peek, bounce, breathing, blinks, twitches, head tracking and exit, and uses a static raised paw for greetings. Changes to the motion preference also take effect during a visit. Touch input does not drive the gaze; tapping or keyboard-activating Pip still greets. Replay cancels pending animation timers, and leaving the page stops the prototype.

These are demonstrations: the first visit plays automatically when visible, and Replay visit forces another appearance. Random appearance rules, persistent cooldowns and live iMIS integration have not been added. The surrounding taskbar items are visual context only. A focused mascot remains visible until focus leaves it.

Edit the `.source.html` files to change the character or animation. The `.html` files are generated browser exports using the visualization skill's `scripts/render.py`:

```text
python render.py pip-koala.source.html pip-koala.html --force
python render.py biscuit-puppy.source.html biscuit-puppy.html --force
```

Use the full path to `render.py` from the installed visualization skill when rebuilding. If that skill is not installed, `rewrap.js` rebuilds an export with Node alone by reusing the shell of an existing export and swapping in the new source:

```text
node rewrap.js pip-koala-v2.source.html pip-koala-v2.html --title "Pip v2 - Koala mascot prototype"
node rewrap.js pip-koala.source.html pip-koala.html --shell pip-koala-v2.html --title "Pip - Koala mascot prototype"
```

Run these commands from `Mascot`. Choose a shell whose matching source has not changed since its export was built; the v1 command above uses the unchanged v2 export as its shell.

These prototypes remain independent design examples. Biscuit is now the production
taskbar mascot, replacing Pip. The approved drawing is 30% larger than the original
preview; the floppy ears are attached to his head and follow its turns and curious
tilt. Maintained production CSS is in `Theme/UnionSuite/zUnionSuite.css`, dark
colours in `zzDarkMode.css`, and markup/timing/storage in `Scripts/UnionSuiteTaskbar.js`.
The legacy pip-prefixed configuration, storage and CSS hooks remain compatible.

The [taskbar preview](../references/Taskbar-Preview.html) and
[Biscuit review preview](../references/Taskbar-Biscuit-Preview.html) both use those
shared production assets. Build with `node Theme/UnionSuite-Guides/usage/build/taskbar-preview.cjs` and
`node tools/build-taskbar-biscuit.cjs` from the project root. Replay, appearance
and scratch/tilt controls remain preview-only. See the
[installation guide](../Theme/UnionSuite-Guides/Usage-Guide.html#taskbar-pip).
Editing a standalone mascot prototype does not change the production taskbar.
