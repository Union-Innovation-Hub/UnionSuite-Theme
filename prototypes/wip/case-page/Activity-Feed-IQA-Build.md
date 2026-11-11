# Case activity feed: IQA build notes

Build notes for the IQAs behind the case page's activity timelines (owner,
21 October 2026): the Overview's Recent activity and the Activity tab's All
activity. Both are the theme's activity feed
(`US-ACTIVITY-FEED`): a one-row Query Template that names a folder of source
IQAs, each read through `GET /api/query`, merged newest first.

Status (21 October 2026): not built. The column contract below is the
theme's (the `US-ACTIVITY-FEED` header in `zUnionSuite.js`); the sample rows
in `case-page.js` follow it.

## Folders

| Folder | Holds | Who changes it |
| --- | --- | --- |
| `$/_i4u_/Core/Cases/UnionSuite/Manage Case/Activity Feed - Base` | The base IQAs: Notes, Emails Sent, Emails Logged, Meetings, Attachments. One row per record, in the feed's fixed columns. | Fixed: the theme reads these columns by name. |
| `$/_i4u_/Client/Cases - UnionSuite/Layouts/Activity Feed - Details` | The details IQAs: Notes Details, Emails Sent Details, Emails Logged Details, Meetings Details. One row per record, read when its card first opens. | The client: add or remove `Additional-*` columns freely. |

The templates point at them with `data-us-activity-folder` (base) and
`data-us-activity-details-folder` (details). Recent activity and All
activity use the same base IQAs: Recent activity's 30 days is the
theme's fixed window (`data-us-activity-window="30"`), sent as `StartDate`,
so there is no Last 30 Days folder.

## Rules for every base IQA

- **Filters, both prompted and named exactly** (the feed sends them by name;
  check with `GET /api/QueryParameterDefinition?QueryPath=…`):
  - `CaseNum`: the case's `Ordinal`, Equal. Not `@url`: the feed passes it.
  - `StartDate`: the record's date, Greater than or equal. Optional: the
    feed leaves it out for All time, so the IQA must run without it.
- **Sort:** `ActivityDate` descending, then the record's ordinal
  descending, so paging is stable when two records share a time.
- **Access:** available through the REST API (the feed calls
  `GET /api/query` with `limit` and `offset`, and reads `TotalCount` for the
  type counts).
- **One row per record.** No joins that repeat a record (one row per tag or
  per recipient): put lists in one column, or in the details IQA.
- **Column names are the aliases below, exactly.** Unused optional columns
  can be left out.
- **Values are text.** The feed shows every value as plain text, never HTML.

### The fixed columns

| Column | Required | Holds |
| --- | --- | --- |
| `ActivityKey` | yes | The record's `Ordinal` (owner, 21 October 2026: no type prefix). It only has to be unique within its IQA: the theme keeps each source's keys apart. The details IQA is filtered on it (a prompted filter on its `Ordinal`, named `ActivityKey`), and the restricted-note check reads the note ordinal from it. |
| `ActivityDate` | yes | Date and time of the record (server local time, as `/api/query` returns it). Sorts the timeline; the time shows on the card. |
| `Subject` | one of the two | The card's headline. |
| `Summary` | one of the two | The line under the headline, or the headline when there is no Subject. |
| `Detail` | no | Longer text, shown when the card opens (the source's `data-detail-label` heads it). |
| `CreatedBy` | no | Who added it, by name. |
| `Category` | no | A sub-type shown after the type ("Note · Employer"). |
| `Priority` | no | `High` or `Urgent` shows a flag; anything else is ignored. |
| `RecordUrl` | no | The record's own page, for the card's View button (same site only). |
| `Direction` | no | `In` or `Out`; overrides the source's own direction. |
| `Data-<name>` | no | A `data-<name>` attribute on the card, for its record actions to read: `Data-us-file-id`, `Data-us-file-branch`, `Data-us-file-name` for View and Download. |
| `FollowUpRequired`, `FollowUpDate`, `FollowUpActioned`, `FollowUpNotes` | no | A note converted to a task: the follow-up badge, and its notes when the card opens. |

## The base IQAs

### Notes

Every note on the case, tasks included (a task is a note with a follow-up).

On a task, the note's **FollowUpNotes is the task itself**, what needs
doing, and its note text is a general note or details about the task (owner,
21 October 2026; the same as the task lists, where FollowUpNotes is the
title). So a task's card leads with the task: it is the `Subject`, the note
text the line under it.

| Column | From |
| --- | --- |
| `ActivityKey` | the note's `Ordinal` |
| `ActivityDate` | when the note was added (date and time) |
| `Subject` | a task's FollowUpNotes (what needs doing); blank for a plain note |
| `Summary` | the note text, **or the literal `Restricted` for a restricted note** |
| `Category` | the note's category |
| `Priority` | `High` for a high-priority note, else blank |
| `CreatedBy` | the author's name |
| `FollowUpRequired` | `true` / `false` |
| `FollowUpDate` | the follow-up (due) date |
| `FollowUpActioned` | `true` once done |
| `FollowUpNotes` | blank (select `''`): the task is already the `Subject`, and the card would repeat it under a Follow-up heading when opened |
| `RecordUrl` | optional: the note's page |

A custom SQL expression for `Subject`, where `<FollowUpRequired>` and
`<FollowUpNotes>` are the note's columns:

```sql
CASE WHEN <FollowUpRequired> = 1 THEN ISNULL(<FollowUpNotes>, '') ELSE '' END
```

Restricted notes must come back with `Summary` = `Restricted` and no text
anywhere else in the row (`Subject`, `Detail` and `FollowUpNotes` blank,
so a restricted task shows no task text either): the IQA is the only thing
standing between the note and everyone who can open the case. The card then
offers Show note, which asks CloudToolz `/ca/note-access` with the note
ordinal. The starting point is the existing
`$/_i4u_/Core/Cases/Manage Case/Case Notes`.

### Emails Sent

Emails sent from iMIS through the case send page (`Send-Email-Parties.aspx`),
linked to the case after each send in `i4u_UT_Cases_Communications`, exactly
as agreement emails are linked in `i4u_UT_CA_Communications` (the same
columns, with `CaseOrdinal` for `AgreementOrdinal`; owner, 21 October 2026).
Always outgoing: the source carries `data-direction="out"`. One row per send.

The card is the agreement Communications panel's (owner, 21 October 2026):
the audience, the subject without its tag, "4 recipients · 4 sent", and,
opened, the full subject and the send's results and recipients. Start from a
copy of the agreement's summary IQA with `vBoi4u_UT_Cases_Communications` in
place of `vBoi4u_UT_CA_Communications`, then rename to the feed's columns:

| Column | From | Change from the agreement IQA |
| --- | --- | --- |
| `ActivityKey` | `[vBoi4u_UT_Cases_Communications].[Ordinal]` | add |
| `ActivityDate` | `[vBoCommunicationLogSummary].[SentDate]`, raw | replaces the formatted `SentDate` and `SentTime`: the feed needs the datetime and formats it itself |
| `Subject` | the `Title` expression (the subject without "Case C217 – ") | `Title` renamed: the feed's headline is `Subject` |
| `Summary` | the `Summary` expression ("4 recipients · 4 sent") | as is |
| `Category` | `[vBoi4u_UT_Cases_Communications].[Audience]` | the card's tag after Email ("Parties", "Staff"), as the agreement card shows the audience; the old Category moves to the details IQA |
| `CreatedBy` | the sender's `FullName` | `SentBy` renamed |
| `CommunicationLogKey` | as is | the recipients block loads on it |
| `Audience` | `[vBoi4u_UT_Cases_Communications].[Audience]` | add: a Members send shows counts only |
| `Recipients`, `Delivered`, `NotSent` | as is | the results bar's numbers |

Leave out the full `Subject`, `RecordType` and `Category` here (the details
IQA has the first and last). Sort on the raw `SentDate` descending, then the
link row's `Ordinal` descending.

The source names the recipients IQA in `data-comms-recipients`: the
agreement's `$/_i4u_/Core/CA/v2/API - Manage Agreement - Communications -
Details`, which is filtered on `CommunicationLogKey` alone, so it serves cases
as it is (one row per recipient: `Recipient`, `Address`, `Status`).

Emails Sent Details (the details folder): filtered on `CaseNum` and
`ActivityKey` (the link row's `Ordinal`), it returns `Additional-Subject`
(the full subject as sent) and `Additional-Type` (the old `Category`
expression: the send page's Type, blank for "None").

The filters are the base rules' `CaseNum` (on `CaseOrdinal`) and
`StartDate` (on `SentDate`).

The send page and the link are in the theme (`us-case-comms` in
`US-SUBJECT-TAG` and `US-COMMS-LOG`, 21 October 2026): the send page's
Communication Creator iPart carries `us-case-comms`, and after each send the
theme inserts `CaseOrdinal`, `CommunicationLogKey`, `Audience` (Parties or
Staff) and `CommunicationType`. Setup: the usage guide's `#subject-tag-cases`.

### Emails Logged

Emails attached to the case through the Outlook plugin: generally received,
but staff file emails they sent too, so each row says which. The owner's
dedicated email business object (one row per logged email; the same table
also holds emails logged against contacts). Duplicates of Emails Sent are
fine (owner, 21 October 2026).

| Column | From |
| --- | --- |
| `ActivityKey` | `Ordinal` |
| `ActivityDate` | `Email_ReceivedOn` |
| `Subject` | `Email_Subject` |
| `Summary` | `'From ' + Email_From` when incoming, `'To ' + Email_To` when outgoing (the `Direction` expression below decides) |
| `Direction` | the expression below: `Out` when the sender is on one of the union's domains, `In` otherwise, blank when there is no sender |
| `Category` | `Logged from Outlook` |
| `CreatedBy` | who logged it: the name of the contact `FirstCreatedBy` names |
| `Data-us-file-id` | `UniqueCloudId`: the stored email, opened by View and Download as an attachment is |
| `Data-us-file-branch` | `EntityCode` |
| `Data-us-file-name` | `FileName` |

Filter `CaseNum` on **`CaseOrdinal`** (the table mixes case and contact
emails; `CaseOrdinal` is the case's, owner 21 October 2026), and `StartDate`
on `Email_ReceivedOn`.

The union's own domains are client values, so keep them out of the Core
IQA's expression: a general lookup table (proposed
`I4U_UT_STAFF_EMAIL_DOMAINS`, one domain per `CODE`, such as `zentso.com`)
that the expression reads:

```sql
CASE
  WHEN ISNULL(<Email_From>, '') = '' THEN ''
  WHEN EXISTS (SELECT 1 FROM Gen_Tables g
               WHERE g.TABLE_NAME = 'I4U_UT_STAFF_EMAIL_DOMAINS'
                 AND <Email_From> LIKE '%@' + RTRIM(g.CODE)) THEN 'Out'
  ELSE 'In'
END
```

`Summary` repeats the test:

```sql
CASE
  WHEN EXISTS (SELECT 1 FROM Gen_Tables g
               WHERE g.TABLE_NAME = 'I4U_UT_STAFF_EMAIL_DOMAINS'
                 AND <Email_From> LIKE '%@' + RTRIM(g.CODE))
    THEN 'To ' + ISNULL(<Email_To>, '')
  ELSE 'From ' + ISNULL(<Email_From>, '')
END
```

A shared mailbox on the union's domain (`projects@…`) counts as the union's.
The source carries `data-record-actions="agreements.view-attachment
agreements.download-attachment"`, so the opened card shows View and Download,
which read the `Data-us-file-*` columns and the `ActivityKey`.

Open: the `Access` column (`Open` or blank in the sample). If logged emails
can be restricted, decide how a restricted one shows (as restricted
attachments do: hidden behind Unlock).

### Meetings

| Column | From |
| --- | --- |
| `ActivityKey` | the meeting's `Ordinal` |
| `ActivityDate` | the meeting's date and start time (midnight when it has no time) |
| `Subject` | the meeting title: `Title`, or `MeetingType – Matter` when it has none (the `MeetingTitle` expression in `templates/Case-Meetings-Query-Template.html`) |
| `Summary` | optional: one line, such as the location |
| `Detail` | the description or agenda (headed Description on the card) |
| `CreatedBy` | who added it |
| `RecordUrl` | optional: the meeting's page |

A future meeting dates the card in the future, so it sorts above today's
records. Starting point: `Manage Case - Meetings - All`.

### Attachments

| Column | From |
| --- | --- |
| `ActivityKey` | the file's `Ordinal` |
| `ActivityDate` | when it was uploaded |
| `Subject` | the file name |
| `Summary` | its tags, joined with ` · ` (one row per file, not per tag) |
| `CreatedBy` | who uploaded it |
| `Data-us-file-id` | the file's `UniqueID` (View and Download, as on the attachment rows) |
| `Data-us-file-branch` | `EntityCode` |
| `Data-us-file-name` | the file name |

Starting point: the case's CloudFiles storage IQA with its tags. The source
carries the same `data-record-actions` as Emails Logged.

### Changes: not a feed source

The case's change history is its own section, apart from the timeline
(owner, 25 October 2026): a Query Template Display of one card per save,
each loading its fields when opened. Its two IQAs, template and fields are
the theme's change history standard, documented in the usage guide
(`#change-history`), for cases and agreements alike.

## The details IQAs

In the Client folder. Each is filtered on `CaseNum` and `ActivityKey` (both
prompted, Equal; `ActivityKey` is a filter on the record's `Ordinal` with its
prompt named `ActivityKey`) and returns one row. Everything it returns is the
record's additional data (owner, 22 October 2026), laid out when the card
opens as the field group panels lay out their IQAs (Case details,
Resolution): `Group-Label` columns (`FollowUp-Task status`) under a heading
per group, in column order; a number group (`1-Outcome`) starts a block with
no heading; `Tone-*` badges and `Alert-*` columns work as in the panels;
dates read "22 May 2026" and true/false Yes/No. **A blank value is hidden**,
and a group left empty goes too, **unless the column name ends
`(show blank)`** (owner, 22 October 2026): `FollowUp-Actioned notes (show
blank)` shows Actioned notes with a dash when blank; the marker is not shown.
The panels are unchanged (blanks there are always a dash).
Left out: `Ordinal`, `ActivityKey` and `CaseNum` (the keys). Untick any other
key you select for a join, such as `CaseOrdinal`, or it shows too. An
`Additional-*` column, the first convention, reads as its label alone.

| IQA | Suggested columns |
| --- | --- |
| Notes Details | `Additional-Staff` (staff the note is assigned to), `Additional-Members` (members it is assigned to) |
| Emails Sent Details | `Additional-Subject` (the full subject), `Additional-Type` (the send page's Type); the recipients come from the source's `data-comms-recipients` IQA |
| Emails Logged Details | `Additional-From` (`Email_From`), `Additional-To` (`Email_To`), `Additional-Cc` (`Email_CC`) |
| Meetings Details | `Additional-Location`, `Additional-Attendees` |

A restricted note's details IQA must return nothing beyond the assignees.

## The placeholder IQA

Each of the three feed iParts is a Query Template Display on a one-row case
IQA filtered on `@url:CaseID`, selecting the case's `Ordinal` unaliased
(`{#query.Ordinal}` in the templates). It returns nothing else.
