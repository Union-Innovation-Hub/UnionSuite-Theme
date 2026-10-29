# Sign-in easter eggs

Status: WIP trial. Built into `Theme/UnionSuite/Scripts/SignInPage.js` (loader
release 0.3.7-trial); this folder holds the mockup and design notes.

Hidden extras for the sign-in page's constellation background. People who
linger or play find them; nobody else is affected.

## The eggs

1. **Gravity well:** press and hold on the open background. Stars that come
   close are caught and follow the well anywhere, so dragging sweeps them up.
   Let go and they scatter, then spring home.
   - **It grows as you catch more.** It starts small: a 150px pull reach and a
     30px catch radius. Every 5% of stars caught, it steps up by 9px of reach
     and 5px of catch, easing to its new size. With every star caught it
     reaches 330px and 130px. The well's glow grows with it, and a pulse goes
     out at each step.
   - **Messages along the way,** above the well, each once per browser
     session: 20% "This is unexpected", 40% "I see you're determined",
     90% "Almost there…", 100% "Nailed it!". If one sweep passes several
     marks at once, only the highest shows. The counter (e.g. "71 / 88")
     shows from 75%, which has no message of its own (it said "You can do
     it!" until 8 October 2026). Screen readers hear each message.
   - **Supernova (second egg):** catch every star in one hold. They collapse
     into a single point under "Nailed it!", then burst out with a flash and
     spring home.
   - **Difficulty,** tested at 1280 × 760 (88 stars):
     - A quick six-row sweep (about 9 seconds) catches 77.
     - A careful ten-row sweep (about 19 seconds) catches 83.
     - Going back over the screen a second time (about 16 seconds) catches
       all 88.
2. **Shooting star:** 1 in 5 visits, or after 45 seconds without input, a
   shooting star crosses the open space beside the card. Clicking it opens a
   dialog headed "You caught a shooting star" with a curiosity quote and a
   Close button. Each catch shows the next of five quotes (Einstein, Zora
   Neale Hurston, Marie Curie, James Stephens, Bernard Baruch). The position
   is remembered between visits.

Dropped after review: drawing your own constellation, the logo in the stars,
the union calendar, and a separate supernova message.

## Words

All visible text is in `EGG_MESSAGES` under Settings at the top of
`SignInPage.js`:

- the shooting-star heading, quotes (text and citation) and button
- the milestone messages and their marks; `showCount` marks where the counter
  starts

Text is inserted as plain text, so it can be edited freely.

## Rules

- **Nothing fires from the card, links, buttons or fields,** or while signing
  in (the Sign In button is disabled).
- **Holding and dragging never selects text:** background presses don't start
  a selection, and nothing is selectable while a well is held. Text in the card
  can still be selected normally.
- **Each egg has a switch** (`EGGS` in `SignInPage.js`), following the Easter Eggs
  register's kill-switch rule.
- **Reduced motion:** all eggs are off, because the field is a single still
  frame.
- **On a phone,** holding on the background opens the well without the context
  menu, and the shooting star's click target is larger.
- **Star count** follows screen size (one per 11,000 px², 50 to 140), so the
  supernova takes longer on larger screens. Resizing during a hold resets the
  catch.

## Files

- `index.html`: the v2 card (native markup copied from `../v2/index.html`,
  shared theme CSS and loader) with the mockup controls, which call
  `window.HubSignIn.eggs` in `SignInPage.js`
- `eggs.css`: the controls panel

The eggs, their styles and the `HubSignIn.eggs` hooks are in `SignInPage.js`.

## Preview

Run the `static-node` launch configuration and open
`http://localhost:8778/prototypes/wip/login-screen/eggs/`. The controls panel
lists each egg with its trigger and a "Show me" button. "Reset messages" lets
the milestone messages show again in the same session. Add `?accent=blue` for a
blue accent.

## Open decisions

- Shooting-star frequency.
- How the eggs are switched per site (theme config).
- Document the eggs in the usage guide alongside the sign-in design, when the
  trial is approved.
