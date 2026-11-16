---
target: Remove staff confirmation (red side bar)
total_score: 28
max_score: 36
na_heuristics: 10
p0_count: 0
p1_count: 1
timestamp: 2026-11-16T09-25-53Z
slug: prototypes-wip-case-page-remove-staff-candidate-js
---
Method: dual-agent (A: design review · B: detector + browser)

Target: case page mockup, Remove staff confirmation on a staff card (C43): remove-staff.candidate.js, case-page.candidate.css (C43), Case-Staff-Query-Template.html.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Checking line and warnings clear; buttons can scroll off after warnings arrive |
| 2 | Match system / real world | 4 | Plain union-office wording |
| 3 | User control and freedom | 3 | Cancel/Escape return focus; no undo after removal |
| 4 | Consistency and standards | 3 | Red inset side stripe clashes with the theme's side-bar idiom (selected/current, status tone) |
| 5 | Error prevention | 4 | Fresh check, Remove disabled until it answers, non-blocking warnings |
| 6 | Recognition over recall | 4 | |
| 7 | Flexibility and efficiency | 2 | Icon, Tab, Enter every time |
| 8 | Aesthetic and minimalist | 2 | Red three times plus two amber boxes in a ~260px column |
| 9 | Error recovery | 3 | Good "no longer on this case" and failed-check handling |
| 10 | Help and documentation | n/a | The warnings are the help |
| Total | | 28/36 | Good |

Verdict on the red side stripe: remove it. It reads as "selected" in the wrong colour, curves into a crescent on the 8px radius, is the most saturated thing on the card while saying the least, and adds nothing when there are no warnings. Replace with a danger-tinted card border:
.us-case-staff .us-contact-tile[data-us-staff-removing] { border-color: color-mix(in srgb, var(--danger) 45%, var(--border)); }

Priority issues
- [P1] Buttons can end up below the fold: scrollIntoView runs before the warnings arrive. Fix: scroll again after the status is filled (success and failure).
- [P2] Red said three times (stripe, busy icon, Remove button). Fix: drop the stripe.
- [P2] Two stacked amber boxes are heavy. Fix: one warning block, one icon, short list; tighter copy.
- [P3] Crown and pencil stay live during the question (race with Make lead). Fix: inert/disable them while asking.
- [P3] Checking spinner in link blue adds a third colour. Fix: --text-muted.

Detector: CLI clean but degraded (parser modules unavailable). Browser overlay: 14 page-wide findings, none in the staff card (banner badges 4.1:1, 10px action-menu headings, side-tab on banner and field-group alert). Computed: warning text 14.6:1 light / 10.8:1 dark; Remove 4.97:1 light; warning icon #ff9947 1.88:1 on light (aria-hidden, text carries meaning).

Personas: power user will learn Tab-Enter and skip warnings; first-timer may see warnings with no buttons in view (P1), and "make someone else lead" doesn't say how.

Questions: should removing yourself from an Individual case be the loudest warning ("You won't be able to open this case")? With no warnings, is an undo toast better than a confirmation?
