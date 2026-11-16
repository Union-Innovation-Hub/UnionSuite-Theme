# IQA filters: repeated property warning

Status: mock-up only. Nothing is in the IQA enhancer yet.

## The problem

On the Filters tab, two rows on the same property in the same group are joined
with OR, not AND. The screen gives no sign of it, and the rows need not be next
to each other. The query `$/_i4u_/SandBox/Case Display` on the dev tenant shows
it:

```sql
WHERE ([vBoi4u_UT_Cases].[CaseID] = '123'
  OR [vBoi4u_UT_Cases].[CaseID] NOT LIKE '%SEC%'
  AND [vBoi4u_UT_Cases].[Date] >= CAST(dbo.asi_GetAppDatetime() AS date)
  AND [vBoi4u_UT_Cases].[Status] = 'Complete')
```

There are no brackets round the OR, and AND binds first, so case 123 is
returned whatever its date or status.

## The proposal

Open `mockup.html` (serve the repo root; the Stock / Proposed switch and the
scenario buttons are mock-up controls only).

- A lane down the left joins the rows that share a property, with an OR chip on
  each. Pointing at or tabbing into one marks the rows it is joined to.
- Two tiers. Amber when the OR changes the result in a way nobody would guess:
  a "not" comparison in the set, a from/to pair, or other filters in the group
  that the earlier OR rows skip. Neutral when the OR is the whole group and
  every comparison is a positive one.
- A card under the group says what happens in words, shows how the group runs
  with the brackets written in, and says how to fix it.
- A count on the Filters tab for the amber cases. Saving is never blocked.

## To confirm before building

Taken from the one query above; check on more before relying on them.

- The OR is written without brackets in every case, not only this row order.
- The SQL lists a group's filters by property name, not in screen order.
- Rows are matched by source and property, not by display name alone. Each row
  holds a hidden field (`F|FL3`, `F|FL6` here) that names the filter line, not
  the property, so the source has to come from somewhere else.
- Prompted filters (In Search = Yes) and the Where Not tab behave the same.
- How separate groups are combined and bracketed, since the fix advice sends
  people to Add Condition.
