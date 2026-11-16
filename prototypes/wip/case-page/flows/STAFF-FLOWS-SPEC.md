# Case staff flows and check IQA: specification

What the theme's Case team needs on the server (16 November 2026). The theme
side is built (release `1.0.28`): the role menu (`US-CASE-STAFF-ROLE` in
`zUnionSuite.js`) and **Remove from case** (`cases.remove-staff` in
`Scripts/ActionDefinitions.js`). Until these exist, a role change says *Not
saved* and Remove fails after its question.

Both flows follow `Cases: Complete Task` (`Cases-Complete-Task.flow.json`):
an iMIS-validated HTTP endpoint, Request Authorization, one validation SQL
that also checks the user's entity access and gets the local timestamp,
the iMIS update, the CloudToolz update, `LogChangesToIMIS`, then a JSON
answer. Errors are plain text with the status codes below; the theme shows
its own message for any status that isn't 2xx.

Names marked **(confirm)** are read from the Case Staff IQA export and the
existing flows, not from the table definitions.

## 1. Cases: Quick Update - Set Staff Role

Changes a case staff member's role from the role menu on their card.

**Endpoint:** `POST /cases/quick-update/set-staff-role`, Read Content on,
Validate iMIS Request on, then Request Authorization (Unauthorised → 401
`Unauthorised` and a Fault, as Complete Task).

**Request body** (JSON, from the theme)

| Field | Example | What it is |
| --- | --- | --- |
| `CaseID` | `C49` | The case's ID (from the page address) |
| `CaseNum` | `48` | The case's ordinal |
| `StaffOrdinal` | `702` | The case staff row (`i4u_UT_Cases_Staff.Ordinal`) |
| `Role` | `SUP` | The chosen role's **value** from `Case Value List - Case Contact Types` |

**Validation SQL** (one row back, `Valid` 1 or 0, with the message):

- the case exists (`Cases.i4u_UT_Cases` where `Ordinal = @CaseNum` and
  `CaseID = @CaseID`);
- the staff row exists **on this case** (`Cases.i4u_UT_Cases_Staff` where
  `Ordinal = @StaffOrdinal` and `CaseOrdinal = @CaseNum`) **(confirm column
  names)**;
- the row is not a delegate: its current `StaffType` is not
  `'Representative'` (the theme shows a delegate's role as plain text; the
  flow refuses it too);
- `@Role` is a value in the Case Contact Types list and is not
  `'Representative'`. Either run the IQA
  (`$/_i4u_/Core/Cases/Value Lists/Case - Form Data/Case Value List - Case
  Contact Types`, as Set Status runs its status list) and check in an If,
  or check the value list's table in this SQL;
- the user's entity matches the case (`UnionTemplate.EntityAccess` join on
  `OrgCode`, as Complete Task);
- return `Valid`, `Message`, `Timestamp` (from
  `UnionTemplate.fn_GetDateTimeWithTimeZone`), the row's `Ordinal`,
  `CaseOrdinal`, `CaseID`, `StaffId`, and `OldStaffType` (for the log).

Not valid → 400 with the message (`Staff member not on this case`, `Choose
a role from the list`, `A delegate's role can't be changed`), or 401 for
the entity check.

**Writes**

1. iMIS: update the `i4u_UT_Cases_Staff` row (`StaffType = @Role`) by its
   Ordinal (Bulk Data Source Operation, Update, as Complete Task updates
   `Zen_CloudFiles_Notes`). Failure → 500 `The role could not be updated in
   iMIS.`
2. CloudToolz: `UPDATE Cases.i4u_UT_Cases_Staff SET StaffType = @Role,
   LastUpdatedBy = @LoggedInUser, LastUpdatedOn = @LocalTimestamp WHERE
   Ordinal = @StaffOrdinal AND CaseOrdinal = @CaseNum` **(confirm the
   audit column names)**. Failure → 500 with the exception.

**Log** (`LogChangesToIMIS`, fire and forget): Note `Case <CaseID>: Set
Staff Role`, Table `i4u_UT_Cases_Staff`, UpdateReason `Edit`,
sourceOrdinal the staff row, fieldsToCompare `["StaffType"]`, body
`StaffType` = new, `OldValue` = `{StaffType: old}`, profileID the CaseID.
The change history shows it as *Staff updated*.

**Answer:** 200 `{"StaffOrdinal": 702, "Role": "SUP"}`. The theme only
needs a 2xx.

**Note:** the role is the same field as the group. Refusing
`'Representative'` both ways (to and from) keeps Staff and Delegate apart.

## 2. Cases: Quick Update - Remove Staff

Takes a staff member off the case, from **Remove from case** on their card.

**Endpoint:** `POST /cases/quick-update/remove-staff`, Read Content on,
Validate iMIS Request on, then Request Authorization.

The theme may send it **as the page closes** (`fetch` with `keepalive`),
when a removal is still waiting out its Undo. The request is the same; the
theme just can't show the answer. Keep the body small (it is) and the flow
idempotent (below).

**Request body**

| Field | Example | What it is |
| --- | --- | --- |
| `CaseID` | `C49` | The case's ID |
| `CaseNum` | `48` | The case's ordinal |
| `StaffID` | `10195` | The person's iMIS ID (`StaffId`) |
| `StaffOrdinal` | `702` | The case staff row |

**Validation SQL**

- the case exists (`Ordinal = @CaseNum` and `CaseID = @CaseID`);
- the user's entity matches the case (as above);
- read the staff row by `Ordinal = @StaffOrdinal` and `CaseOrdinal =
  @CaseNum`, and check its `StaffId = @StaffID`;
- **already gone** (no row): return `Valid = 1` with `AlreadyRemoved = 1`
  (someone removed them in another tab, or this is a resend). The flow then
  answers 200 without writing or logging;
- `WasLead` = 1 when the case's `StaffLeadID` = the row's `StaffId`;
- return `Valid`, `Message`, `Timestamp`, `AlreadyRemoved`, `WasLead`, the
  row's `Ordinal`, `StaffId`, `StaffType`, and the person's name (for the
  log summary, e.g. from `_i4u_UT_Contact_Name`).

Not valid → 400 (`Staff member not on this case` when the row's `StaffId`
doesn't match) or 401 for the entity check. No warnings are enforced here:
removing the lead, the last staff member, or yourself is allowed (the theme
asks on the card first).

**Writes** (skipped when `AlreadyRemoved`)

1. iMIS: delete the `i4u_UT_Cases_Staff` row (Bulk Data Source Operation,
   **Delete** **(confirm the operation is available; otherwise the data
   source's delete)**). Failure → 500 `The staff member could not be removed
   in iMIS.`
2. If `WasLead`: clear the case's lead in iMIS (Update Single Instance Data
   Source `i4u_UT_Cases`, `StaffLeadID` = blank, PartyId `CaseNum`, as Set
   Status updates `Status`).
3. CloudToolz: `DELETE FROM Cases.i4u_UT_Cases_Staff WHERE Ordinal =
   @StaffOrdinal AND CaseOrdinal = @CaseNum`; if `WasLead`, `UPDATE
   Cases.i4u_UT_Cases SET StaffLeadID = NULL, LastUpdatedBy =
   @LoggedInUser, LastUpdateOn = @LocalTimestamp WHERE Ordinal = @CaseNum`.
   (The cases table's column is `LastUpdateOn`, as Set Status writes it.)

**Log:** Note `Case <CaseID>: Remove Staff`, Table `i4u_UT_Cases_Staff`,
UpdateReason `Delete`, sourceOrdinal the staff row, body with the removed
row's `StaffId` and `StaffType` (summary: the person's name and ID). The
change history shows *Staff removed*. If `WasLead`, a second entry on
`i4u_UT_Cases` (`StaffLeadID` old → blank, UpdateReason `Edit`).

**Answer:** 200 `{"StaffOrdinal": 702, "WasLead": false, "AlreadyRemoved":
false}`. The theme only needs a 2xx; it then reloads the list and the
banner's Lead staff.

## 3. The check IQA for Remove from case

**Path:** `$/_i4u_/Core/Cases/UnionSuite/Manage Case/API - Manage Case - Staff
Removal Check`

The theme runs it through `GET /api/query?QueryName=…&CaseNum=<case>` when
the trash icon is pressed, before it asks or removes. It can't reuse the
Case team IQA: that one reads the case from the page address
(`@url:CaseNum`), which `/api/query` can't fill.

**Sources:** `i4u_UT_Cases_Staff` (the case staff rows), joined to
`i4u_UT_Cases` on `CaseStaff.CaseOrdinal = Cases.Ordinal`, as the Case team
IQA.

**Filter:** the case's `Ordinal` (or `CaseStaff.CaseOrdinal`), **prompted
and required, with the prompt named `CaseNum`**. Check the name with
`GET /api/QueryParameterDefinition?QueryPath=…`.

**Columns** (one row per staff member on the case)

| Column | Value | Used for |
| --- | --- | --- |
| `Ordinal` | `CaseStaff.Ordinal` | Finding the card's row; a missing row means *no longer on this case* |
| `IsLead` | `CASE WHEN Cases.StaffLeadID = CaseStaff.StaffId THEN 'true' ELSE 'false' END` | The lead warning |
| `CaseAccess` | The case's Access, as the words `Open`, `Team` or `Individual` (a `CASE` if the column holds codes) **(confirm the column)** | The last-staff and lose-access warnings (Individual only) |
| `CanOpen` | Optional. `CASE WHEN CaseStaff.StaffType = 'Representative' THEN 'false' ELSE 'true' END`, **only if** a delegate on the case does not let them open an Individual case (match `/cases/case-access`) | Which other rows count as "someone left who can open it" |

**How the theme uses it:** it counts the other rows (those whose `CanOpen`
isn't `'false'`). With Individual access and none left, it warns *No staff
will be left on this case*. If the card is the signed-in user's own and
the access is Individual, it shows *You'll lose access to this case*. A
lead row adds the lead warning. Any warning means the card asks first;
otherwise the card goes with Undo.

**Settings:** available to REST (as the other `API -` IQAs); no sort
needed; no row limit needed (the theme asks for up to 200). If the check
fails, the theme still asks, with a note that the access couldn't be
checked, so a broken IQA never blocks a removal.
