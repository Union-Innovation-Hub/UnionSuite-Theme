---
id: remove-staff
title: Remove someone from the case
section: People on the case
answer: On the Overview's Case team, press the bin (**Remove from case**) on their card. They go at once, with **Undo** for a few seconds. If removing them needs a warning, the card asks you first.
asks:
  - how do I remove staff from a case
  - take someone off a case
  - remove a delegate from a case
  - I added the wrong person to the case
  - undo removing someone from a case
  - remove myself from a case
keywords: [remove, remove staff, take off, unassign, delete, bin, trash, case team, delegate, undo, wrong person]
related: [add-staff, change-the-lead-staff, change-staff-role, who-can-see-a-case]
verify:
  - In the theme from 1.0.28, but its save (/cases/quick-update/remove-staff) and the case check behind it (API - Manage Case - Staff Removal Check) are not built yet. Confirm both work before staff rely on this topic.
---
1. On the **Overview**, find *Case team*.
2. On the person's card, press the bin: **Remove from case**.

The case is checked first, so the bin shows a spinner for a moment.

**Most of the time: removed, with Undo**

Their card closes up straight away, and in its place a line says *Dani Sundara · Removed from the case* with **Undo**. A thin bar along its foot runs down while it waits.

- Press **Undo** to put them back. Nothing has changed: it isn't saved, and it doesn't appear in the case's history.
- Do nothing, and the removal saves when the bar runs out, after about 6 seconds. It waits while your pointer or keyboard is on the line.
- If you leave or refresh the page before then, the removal saves straight away.
- If it couldn't save, their card comes back with a red line under it saying so. Press **Dismiss** and try again.

**When the card asks you first**

The card asks *Remove … from this case?* with **Cancel** and **Remove** when removing them matters more:

- **They're the lead staff member.** The case will have no lead until you [make someone else lead](#change-the-lead-staff).
- **Nobody would be left who can open the case**, on a case with Individual access. Only managers and system administrators could open it.
- **It's you, and the case has Individual access.** In red: *You'll lose access to this case.* You won't be able to open it again unless you're a manager or system administrator.

Press **Remove** to go ahead (it saves straight away, with no Undo), or **Cancel** to keep them. You can always go ahead: the warnings are there so you know what will happen.

> **Tip:** If the card says they're *no longer on this case*, someone removed them somewhere else. Press **OK** and the list shows who is on the case now.
