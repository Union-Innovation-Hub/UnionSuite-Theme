# Easter eggs — idea register

Ideas recorded before any mockup work, for the **staff** membership system / CRM.
Each entry states the trigger, the payoff, and what would make it fail. Nothing
here is built yet.

House style for all of them: **quiet, rare, and never in the way.** An easter egg
a user has to dismiss is a bug. Target frequency is that a daily staff user meets
roughly one every few weeks — often enough to become a story they tell a new
starter, rare enough that it never becomes furniture.

**Mockups** — seven of these are built as working HTML in this folder. Open
`index.html` for the contact sheet, or go straight to `01-error-pages.html`,
`02-search-magic-words.html`, `03-tenure-marker.html`, `04-empty-states.html`,
`05-idle-logo.html`, `06-task-age-celebration.html`, `07-do-not-click.html`.
They use the real tokens from `experiments/tokens/tokens.css`. Four are interactive (02, 05,
06, 07). Nothing is wired into the product.

**Contents**

- [Shared plumbing](#shared-plumbing-decide-once-before-the-first-mockup)
- [Two tonal rules](#two-tonal-rules-worth-agreeing-before-copy-is-written)
- [A. Member record — longevity and loyalty](#a-member-record--longevity-and-loyalty)
- [B. Search](#b-search)
- [C. Empty states and query results](#c-empty-states-and-query-results)
- [D. History and timeline](#d-history-and-timeline)
- [E. Staff session and calendar](#e-staff-session-and-calendar)
- [F. Chrome — logo, idle, error pages](#f-chrome--logo-idle-error-pages)
- [G. Completion and reward](#g-completion-and-reward)
- [H. Planted discoveries](#h-planted-discoveries)
- [Mockup order](#suggested-mockup-order)
- [Open questions](#open-questions)

---

## Shared plumbing (decide once, before the first mockup)

Everything below shares the same scaffolding, so it is worth agreeing on once
rather than thirty times.

- **One module.** A single `zUnionSuite-Delight.js` (or a namespaced section of
  `zUnionSuite.js`), not scattered hooks. One file to read, one file to delete.
- **Kill switch.** A theme-config flag (`data-delight="off"` on `<body>`, driven
  from `Theme-Config.html` / `ThemeSettings.xml`) that disables everything at
  once. Some clients will want it off and should not have to ask.
- **Per-egg toggles.** Same config surface, one flag each, so a client can keep
  the empty states and drop the sleeping logo.
- **Staff site only.** Nothing in this register should be able to render on a
  member-facing self-service page. Several lines are affectionate about a member
  in a way that only works when the member is not reading it. Scope the module
  to the staff shell and assert it, do not assume it.
- **Motion respect.** Every animation behind
  `@media (prefers-reduced-motion: no-preference)`. Where an egg is *only* an
  animation, reduced-motion means it does not run — no static fallback that
  draws more attention than the animation would have.
- **Styling location.** Behaviour in the shared script, presentation in
  `Theme/UnionSuite/zUnionSuite.css`, dark-mode variants in `zzDarkMode.css`,
  client-specific art in `UnionSuite-Client/Override.css`.
- **Never in a destructive or financial path.** No egg fires on a delete, a
  batch commit, a payment, a merge or a bulk update. The moment a user cannot
  tell whether the system is joking or broken while committing money, the whole
  programme is finished.
- **Demo-safe.** Suppressed in demo/sandbox instances by default, or we find out
  about a bad one live in front of a client.
- **Nothing that survives into a report, export or PDF.** Transient UI only.
- **Screen-share aware.** Staff show this screen to members and to boards. Every
  line should survive being read aloud by someone who did not write it.

---

## Two tonal rules worth agreeing before copy is written

**1. Do not joke about staff working hours.** This is a union system. Unions
campaign on hours, unpaid overtime and the right to disconnect. An app that
notices someone is working at 11pm and says *"Everything okay?"*, or that winks
at Friday knock-off, is making a joke about the exact thing the organisation
exists to fight — and it is doing it while logging the timestamp. Affectionate
in a startup, tone-deaf here, and quite possibly raised at a staff meeting.
This affects the late-login egg, the Friday save button, and `overtime` as a
search term. Flagged individually below; recommend cutting all three.

**2. Warmth points at members, dryness points at the database.** The lines that
work best in this set are warm about long-standing members (*"A true original"*,
*"They were here before us"*) and dry about the system's own limits (*"Not
currently indexed"*, *"You are not that kind of admin"*). Lines that are dry
*about a member* — or that imply staff neglect — are the ones that get
uncomfortable when a member is in the room. Keep the categories separate.

---

## A. Member record — longevity and loyalty

The strongest group in the register. These are affectionate, they reward exactly
the people the organisation most wants to honour, and none of them interrupt.

| # | Trigger | Payoff |
|---|---|---|
| A1 | Member for 20+ years | Tiny ✨ beside "Member since" — *"A true original."* |
| A2 | Join date precedes the CRM's own earliest record | *"They were here before us."* |
| A3 | 50-year membership anniversary | A small gold crown beside the member-since date. No popup, no interruption. |
| A4 | Lifetime membership | Hover the expiry date → *"Nope. Never."* |
| A5 | Work anniversary or birthday is today | Subtle confetti or gradient ring on the avatar for the day. |
| A6 | No profile photo | The placeholder avatar occasionally wears a small disguise. |
| A7 | Name matches an obvious placeholder pattern | A dry aside: *"We won't tell."* |

**A1–A3 are one component, not three.** A single "tenure marker" beside the
member-since date with tiers: nothing under 20 years, ✨ at 20, crown at 50, and
the pre-CRM line as a special case. Build it once with a tier table in config so
a client can set their own thresholds — a union founded in 1990 has a different
idea of "a true original" than one founded in 1902.

**A2 needs care with data quality.** "Before the CRM existed" in practice means
"before the migration cut-off", and migrations are where join dates go to die.
A default 01/01/1900 or a blank-coerced-to-epoch date would trigger this on
records that are simply wrong, and it would do so on exactly the records staff
are least sure about. Gate on a plausible date range, and consider whether the
honest version of this egg is actually a *data quality* flag wearing a joke.

**A4 is the cheapest win in the whole register.** It is a tooltip on a field that
otherwise says nothing, it is factually correct, and it makes the record feel
like someone wrote it rather than generated it.

**A5 carries the only real privacy exposure.** Birthdays are personal data and
some people actively do not want them surfaced. The ring must respect whatever
opt-out or visibility flag the record carries; if no such flag exists, ship
anniversary-only until one does. It also needs a hover/focus label so the ring
is not a mystery to a screen reader user — explain it or hide it from assistive
tech entirely.

**A6 needs frequency discipline and a check on what "disguise" implies.**
Placeholder avatars appear in lists, so "occasionally" has to mean *this record,
this session*, not a dice roll per render that makes a list flicker. And the
disguise should read as *the avatar is hiding*, not *this person is suspicious* —
a moustache and glasses, not a balaclava. Never on a member-facing page.

**A7 needs whole-word matching, not substring.** Real organisations contain
"test" — Contest, Protest, Testa. A false positive on a real member record
implies the system thinks a real person is fake, which is the worst miss in this
document. Match exact or near-exact names only. Patterns: `test`, `asdf`,
`qwerty`, `xxx`, `do not use`, `delete me`.

*Open question on A7:* should this double as a genuine signal? A quiet marker on
obvious test data sitting in a production instance is actually useful to staff,
and the joke is just the delivery mechanism.

---

## B. Search

The richest surface, and the one where discovery happens organically — staff
find these themselves and tell each other, which is the entire point. It is also
the surface where the mechanism needs the most thought, because the listed ideas
are actually **three different behaviours** wearing one coat.

### B-i. Zero-result responses

The query runs, legitimately returns nothing, and the empty state carries a
custom line instead of the standard one.

| Term | Response |
|---|---|
| `nobody` | *"Excellent news: 0 results."* |
| `sudo` | *"You are not that kind of admin."* |
| `coffee` | *"Essential staff resource. Not currently indexed."* |
| `help` | *"That bad, huh?"* — **must still show the real help link.** |
| `friday` | *"Nearly there."* / on a Friday, *"It actually is!"* |
| `asdf` | *"A respected member of every database."* |

### B-ii. Result-count asides

These terms *do* return results. The line appears **alongside** the results as a
small aside, never instead of them, and never delays the list.

| Term / shape | Response |
|---|---|
| A very common name returning a large set (`john smith`, 87 results) | *"Good luck."* |
| `everyone` | *"That's going to be a long list."* |
| `*` | *"Ah. The nuclear option."* |

**The count threshold is the design question here**, not the copy. *"Good luck"*
at 87 results is funny; at 9 it is confusing. Suggest firing only above a
threshold (50?) and only where the query is a plain two-word personal name.

**`*` must not actually run.** A literal wildcard over the member table is a
genuinely expensive query, and a joke printed over a thirty-second spinner is
not a joke. Intercept it, print the line, and either return nothing or offer a
"show all members" link that goes through the normal paged path.

### B-iii. Query-shaped asides (regardless of result count)

| Term | Response |
|---|---|
| `me` | *"Looking for yourself?"* |
| `test` | *"We know what you're doing."* |

**`me` should be quietly useful as well as funny** — pair the line with a link to
the signed-in user's own staff record. That is the version people actually use.

### Rules for the dictionary

- **Lives in config, not code**, so words can be added without a theme release.
- **Every word gets checked against real member and organisation naming before
  it ships.** If a client has a member surnamed Friday, or an affiliated body
  called Everyone, that word comes out for that client. This check is per client,
  not once.
- **Never suppress a real result.** The line is additive in every case.
- **Case- and whitespace-insensitive, whole-string match.** `help` matches, but a
  search for `help desk officer` is a real search and must behave like one.
- **`overtime` is cut** — see tonal rule 1. A membership system winking about
  unpaid hours is the wrong joke in this building.

---

## C. Empty states and query results

| # | Trigger | Payoff |
|---|---|---|
| C1 | Approval / task queue renders with zero rows | *"Nothing to approve. Suspicious."* Optionally a small hammock. |
| C2 | A query returns 0 members | Empty chairs — *"Nobody's here."* |
| C3 | Staff runs the same query repeatedly | Eventually: *"Still the same."* |

**C1 and C2 must distinguish empty from broken.** A joke printed on top of a
silent load failure is the worst outcome in this category — the user concludes
there is no work when there is. Also distinguish *no filter applied yet* from
*filter applied, nothing matched*. If the state cannot be told apart reliably,
the egg does not run.

**C3 is the one to be careful with, because it makes a factual claim.** Staff
re-run a query precisely *because* they expect the answer to change — a payment
to land, an import to finish, an approval to clear. *"Still the same"* asserts
that nothing changed, and if it says that while the data actually did change
(same row count, different rows), it has actively misled someone during a task
they were concentrating on. Two options:

- Compare a hash of the result set, not the count, and only fire on a genuine
  no-change; or
- Soften the copy so it claims nothing — *"Still here."* / *"Same as it was."*
  said about the page, not the data.

Recommend the second. It keeps the joke and drops the liability. Also cap it:
third or fourth identical run, once per session, then never again.

---

## D. History and timeline

| # | Trigger | Payoff |
|---|---|---|
| D1 | Scrolled to the end of a member's interaction history | *"You have reached the beginning."* |
| D2 | …and that history spans 20+ years | *"You've reached the ancient records."* |
| D3 | No contact with the member for 10+ years | A small cobweb on the activity timeline. |

**D1 and D2 are one end-of-list marker with two tiers**, the same pattern as
A1–A3. Worth building as a single component with a depth/age tier table.

**D1 is quietly excellent** because it solves a real problem — infinite-scroll
lists rarely tell you that you have actually reached the end, and staff genuinely
wonder. This is a usability fix that happens to be charming, which is the best
kind of entry in this document.

**D3 is the one line in the register that points at staff failure**, and it does
it on a member's record. A cobweb says *we forgot about this person for a decade*
— true, probably, but that is a sentence that reads very differently when the
screen is being shared with the member, an organiser, or a board. It is also the
kind of thing that turns up in a screenshot in a review of member engagement.
Either cut it, or reframe it from neglect to opportunity — a "dormant" marker
that is informational rather than funny, and that staff can act on. The joke
version is not worth the meeting it might cause.

---

## E. Staff session and calendar

| # | Trigger | Payoff | Verdict |
|---|---|---|---|
| E1 | First login of the calendar year | *"Welcome back. Same database."* | Ship it |
| E2 | 31 October | One small ghost somewhere in the navigation. No explanation. | Ship it |
| E3 | Login very late at night | *"Everything okay?"* | **Recommend cutting** |
| E4 | Friday after 16:00 | Save button reads "Save & Run" | **Recommend cutting or reworking** |

**E1 is the best staff-facing line in the set.** Dry, self-deprecating, points at
the system rather than the person, and lands on a day when everyone is already
thinking about the year ahead. Once a year is perfect scarcity.

**E2 works precisely because there is no explanation.** Resist the urge to add a
tooltip. One ghost, one day, in the navigation, gone on 1 November. Note that
Halloween is a weaker fixture in Australia than the US — worth a per-client flag,
and worth asking whether a local date would land harder.

**E3 should not ship.** See tonal rule 1. It is warm in intent and it reads as
surveillance: the system has noticed what time you are working and has an
opinion about it. In a union workplace that is a live issue, not a cute one, and
"the CRM asked if I was okay at 11pm" is a story that travels for the wrong
reasons. If we want to be kind to people working late, the honest version is not
a joke — it is not nagging them at all.

**E4 has a second problem on top of the tonal one.** Changing a button's *label*
changes what a user believes they are agreeing to, and label text appears in
training material, support scripts, screenshots and accessibility names. A user
told "click Save" who sees "Save & Run" may reasonably hesitate — and hesitation
on the primary action of a CRM is a real cost for a small joke. If it survives,
move the joke somewhere non-load-bearing: the tooltip, a small icon, the footer.
Worth mocking both versions and deciding from the comparison rather than from
argument.

---

## F. Chrome — logo, idle, error pages

| # | Trigger | Payoff |
|---|---|---|
| F1 | Any 404 / error page | A lost forklift wandering an empty warehouse — or, closer to home, a lone figure in an empty hall, a clipboard blowing across an empty depot. Slow, looping, quiet. |
| F2 | ~5 minutes with no pointer, key or scroll input | The logo or mascot slowly closes its eyes. Any input and it snaps awake. |
| F3 | Pointer movement | The logo's eyes track the cursor. |
| F4 | Logo held for ~1.5s | Swaps to a hand-drawn version of itself for the rest of the session. |

**F1 is the best value in the whole register** — zero workflow risk, the largest
blank canvas in the product, and the highest payoff per hour spent. One rule: the
error text stays primary and fully legible. A user hitting an error needs to know
what broke and what to do next; charm sits underneath that, never in front of it.
Mock 404, 500 and permission-denied together, and drop the tone as severity
rises: playful for a wrong URL, dry for a real failure.

**F2 and F3 are one component, not two** — the same mark with an idle state and
an awake state. Design them together or they will fight. F2's wake must be
instant and unconditional; a logo that stays asleep even 200ms after a click
reads as a frozen page. The idle timer must not keep the session alive or
interfere with session-timeout warnings. F3 must be throttled through
`requestAnimationFrame`, passive, paused when the tab is hidden, and off on
touch.

**F4 is blocked on client art** and ships off by default — some clients will love
a hand-drawn mark and some will read it as defacement. Must not conflict with the
logo's normal click (home link) or with touch context menus.

**All four want a mascot.** A wordmark has no eyes. See the open question below.

---

## G. Completion and reward

The only group in the register that fires on **success** rather than on absence,
which makes it structurally different from everything above: every other egg
decorates a moment when nothing is happening, and this one lands in the middle of
someone actually finishing a piece of work.

| # | Trigger | Payoff |
|---|---|---|
| G1 | A task, case or action item is closed, scaled to how long it sat open | Under a week, a plain tick. A month, a small flourish. A year or more, full confetti and the age said out loud: *"Opened 412 days ago."* |

**Why it is the strongest idea in the document.** It attaches celebration to the
thing the organisation actually wants more of — old work being finished — and it
scales the reward to the difficulty, which almost nothing else in enterprise
software does. It is also the only egg here that a manager would defend on
grounds other than charm.

**The tone trap, and it is a real one.** "Opened 412 days ago" can be read two
ways: *well done, you cleared something ancient*, or *this organisation ignored a
member for over a year*. The person closing it is very often not the person who
let it sit. Copy must congratulate the closer and stay factually neutral about
the gap — *"Opened 412 days ago. Closed today."* works; anything containing
"finally", "at last" or "about time" does not. And the number should never appear
in a report, a dashboard tile or an export, where it stops being a joke and
becomes a metric someone gets asked about.

**Bulk close is the failure mode.** Clear forty stale tasks in one batch action
and forty confetti bursts turn the CRM into a poker machine. The egg fires on a
single, deliberate close and is suppressed entirely inside bulk operations — no
exceptions, no "just the biggest one".

**Other rules:**

- **Once per task, ever.** A task closed, reopened and closed again does not
  celebrate twice. Store the fact that it fired.
- **Non-blocking, always.** No modal, no delay to the save, no focus steal.
  The record closes at the same speed whether the egg runs or not.
- **Reduced motion keeps the message, drops the particles.** The toast still
  appears and still says the age; nothing flies.
- **Announce it politely.** `aria-live="polite"` on the message, and the
  confetti layer `aria-hidden`. A screen reader user should get the sentence,
  not the decoration.
- **The age must be trustworthy.** A task created by the migration with a
  defaulted date produces *"Opened 9,432 days ago"*, which is both wrong and
  funnier than intended. Same date-floor gate as A2: below the floor, no age is
  claimed and the tier drops to the plain tick.

---

## H. Planted discoveries

| # | Trigger | Payoff |
|---|---|---|
| H1 | A button appears, unbidden, reading "Do not click" | On click: an animation and *"You rebel. I like you."* Then it removes itself. |

**This is the highest-risk idea in the register, and it is worth being blunt
about why.** Every other egg in this document decorates a state the product
already produces. H1 is the only one that **plants a fake control inside a
working interface** — and to a staff member, a button that appears unbidden in a
CRM is indistinguishable from a bug, a broken iPart, or something injected into
the page, right up until they click it.

There is also a direct conflict with security training. Organisations run
phishing simulations and tell staff, in as many words, *do not click unexpected
things*. An egg whose entire premise is rewarding someone for clicking an
unexpected button is teaching the opposite lesson in the same building, and the
person who reports it to IT as suspicious is the person who did exactly what
they were trained to do.

None of that makes it unshippable. It makes it **placement-critical**:

- **Never on a transactional surface.** Not on a record, not in a form, not on a
  page where money, membership status or member data can change. The blast radius
  of "staff member is unsure what that button did" must be zero.
- **Only on non-transactional chrome**: the About/version screen, a help page, or
  a deliberately empty area of the dashboard. The About screen is the strongest
  candidate — it is where people already go to poke around, and it is where the
  "click the version number seven times" egg would live too.
- **It must do nothing.** No state change, no navigation, no request, no logging
  that looks like an action. It shows a message, plays an animation, and deletes
  itself.
- **Unmistakably not a control of record.** It should not wear the primary button
  styling, because the joke depends on it looking planted rather than official.
- **Once per user, ever** — or once a quarter at the very most. A recurring prank
  button is not a discovery, it is a nuisance with a punchline.
- **Tell the service desk it exists.** The first ticket will be "there is a
  strange button on the About page", and someone should already know the answer.

**Recommendation:** ship it on the About screen, once per user, with the
placement rules above. That keeps the delight and removes every version of the
question "did I just break something?"

---

## Suggested mockup order

Ordered by value-to-risk, not by preference:

1. **F1 — error pages.** No workflow risk, biggest canvas, most visible payoff.
2. **B — search dictionary.** Highest discovery value, and the one staff will
   actually talk to each other about. Mock all three mechanisms (zero-result,
   count aside, query-shaped aside) so the difference is visible.
3. **A1–A4 — the tenure marker.** One component, four states, warm, safe.
4. **C1 + C2 — empty states.** Copy-led and cheap, reusing states that already
   exist.
5. **D1/D2 — end-of-history marker.** Half usability fix, half joke.
6. **F2 + F3 — the logo, as one idle/awake behaviour.**
7. **A5 — anniversary ring.** Resolve the privacy flag question before design.
8. **E1 + E2 — first login of the year, Halloween ghost.** Trivial to build,
   worth doing last because they are calendar-gated and hard to demo.
9. **A6, A7 — avatar disguise, placeholder records.** Need their matching and
   frequency rules pinned down first.
10. **F4 — long-press logo.** Blocked on client art.

**Parked pending a decision:** E3 (late login), E4 (Friday save button), D3
(cobweb), `overtime` in the search dictionary.

---

## Open questions

1. **Kill switch home** — is there an existing per-client theme flag to hang it
   off, or does `ThemeSettings.xml` need a new node?
2. **Birthday visibility** — does the member record carry any birthday privacy or
   opt-out flag today? A5 is blocked on this.
3. **Mascot** — do we have one, or can we commission one? F1–F4 are all much
   stronger with a character, and the mascot is itself the best idea in this
   document: a figure who only ever appears in peripheral places (spinner, 404,
   changelog header, favicon, October 31) and never inside a workflow. Staff
   assemble the character themselves and explain it to new starters, which is the
   actual goal — this is internal culture, not a feature.
4. **Tenure tiers** — 20 and 50 years are the right defaults for whom? Should the
   thresholds be per client, given founding dates differ by decades?
5. **Migration date floor** — what is the earliest *trustworthy* join date in the
   data? A2 and the tenure tiers both depend on the answer.
6. **Dictionary review owner** — who signs off that no magic search word collides
   with a real member, organisation or campaign name, per client, per release?
