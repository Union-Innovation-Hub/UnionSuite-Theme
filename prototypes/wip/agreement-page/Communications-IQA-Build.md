# Agreement communications: IQAs

The agreement's Communications panel (README decision 13): one card per
send, from a Query Template Display on the summary IQA; opening a staff
(contact) send loads its recipients from the details IQA through
`/api/query`, filtered on the send's `CommunicationLogKey`. Member sends show
the summary only. Owner, 5 October 2026.

The business objects are the contact page's (`prototypes/wip/contact-page-v3/Outbound-Emails-Build.md`):
`_i4u_UT_OutboundEmails` (view `vBo_i4u_UT_OutboundEmails`), a contact
business object with `ContactKey` and `FullName` (not `NetContactData`), and
the agreement link table `i4u_UT_CA_Communications` (written after each send
by US-COMMS-LOG). Reference codes and the status tone rules are in that note.

IQAs (owner, 5 October 2026):

- Summary: `$/_i4u_/Core/CA/v2/Query Template - Manage Agreement - Communications - Summary`
- Details: `$/_i4u_/Core/Shared/API - Communication Details (shared; was `$/_i4u_/Core/CA/v2/API - Manage Agreement - Communications - Details` until 5 November 2026)`

## 1. Summary (Query Template base): one row per send

Starting point (owner's export, 5 October 2026): `vBoi4u_UT_CA_Communications`
inner joined to `vBoCommunicationLogSummary` on `CommunicationLogKey`, columns
`Sent`, `CommunicationLogKey`, `CommunicationLogStatusCode`,
`CommunicationType`, `CreatedByUserKey`, `MessageType`, `NotDelivered`,
`Delivered`, `SentDate`, `Subject`.

Changes:

| What | Change | Why |
|---|---|---|
| Agreement filter | `[vBoi4u_UT_CA_Communications].[AgreementOrdinal]` Equal `@url:AgreementNum`, prompt **No** | The panel sits on the agreement page; the export shows `= null` |
| Sender | Add the contact business object, **left** join on `CreatedByUserKey = ContactKey` | The card names who sent it |
| Link table columns | Add `Audience` and `CommunicationType` from `vBoi4u_UT_CA_Communications` | Staff or Members, Email or SMS (the log's own `CommunicationType` is the Type dropdown, "None") |
| Counts | Re-alias without spaces (below) | Query Template fields cannot hold spaces |
| Title | Expression below | The subject without the "Agreement A107 – " prefix every send carries |
| Sort | the raw `[vBoCommunicationLogSummary].[SentDate]` descending | Newest first; the formatted alias would sort as text |

Aliases (all columns; rename to these):

| Alias | Value | Notes |
|---|---|---|
| `CommunicationLogKey` | `[vBoCommunicationLogSummary].[CommunicationLogKey]` | Loads the recipients; required |
| `SentDate` | `FORMAT([vBoCommunicationLogSummary].[SentDate], 'd MMM yyyy', 'en-AU')` | Card date ("5 Oct 2026"); sort on the raw SentDate, not this alias |
| `SentTime` | `LOWER(FORMAT([vBoCommunicationLogSummary].[SentDate], 'h:mm tt', 'en-AU'))` | Card time ("10:04 pm"), as the Notes ledger shows times |
| `Subject` | `[vBoCommunicationLogSummary].[Subject]` | The full subject, as sent |
| `Title` | expression below | The card headline |
| `SentBy` | sender `FullName` | Blank if the sender has no contact record |
| `Audience` | `[vBoi4u_UT_CA_Communications].[Audience]` | `Staff` loads recipients; `Members` shows the summary only |
| `Channel` | `[vBoi4u_UT_CA_Communications].[CommunicationType]` | `Email` or `SMS`; the card's type label |
| `RecordType` | `LOWER([vBoi4u_UT_CA_Communications].[CommunicationType])` | `email` or `sms`: the card's rail icon (matched in lower case) |
| `Summary` | expression below | The card's preview line: "7 recipients · 4 sent · 3 not sent" |
| `Recipients` | `[vBoCommunicationLogSummary].[Sent]` | Everyone the send was for (the export's "Attempted": 7) |
| `Delivered` | `[vBoCommunicationLogSummary].[Delivered]` | Sent out (export's "Sent": 4) |
| `NotSent` | `[vBoCommunicationLogSummary].[NotDelivered]` | Not sent: no email or no contact (export's "Not Sent": 3) |
| `Category` | expression below | The Type chosen on the send page; the default "None" reads as blank; optional |

Leave out `CommunicationLogStatusCode`, `CreatedByUserKey` and `MessageType`
unless a filter needs them (the link table already says Email or SMS).

`Title`:

```sql
CASE
  WHEN CHARINDEX(N' ' + NCHAR(8211) + N' ', [vBoCommunicationLogSummary].[Subject]) > 0
    THEN SUBSTRING([vBoCommunicationLogSummary].[Subject],
                   CHARINDEX(N' ' + NCHAR(8211) + N' ', [vBoCommunicationLogSummary].[Subject]) + 3, 400)
  ELSE [vBoCommunicationLogSummary].[Subject]
END
```

`Summary` (`NCHAR(183)` is the middle dot; "not sent" only when there are any):

```sql
CAST([vBoCommunicationLogSummary].[Sent] AS nvarchar(10))
  + CASE WHEN [vBoCommunicationLogSummary].[Sent] = 1 THEN N' recipient' ELSE N' recipients' END
  + N' ' + NCHAR(183) + N' ' + CAST([vBoCommunicationLogSummary].[Delivered] AS nvarchar(10)) + N' sent'
  + CASE WHEN [vBoCommunicationLogSummary].[NotDelivered] > 0
      THEN N' ' + NCHAR(183) + N' ' + CAST([vBoCommunicationLogSummary].[NotDelivered] AS nvarchar(10)) + N' not sent'
      ELSE N'' END
```

`Category`:

```sql
CASE
  WHEN [vBoCommunicationLogSummary].[CommunicationType] IN ('None', '') THEN ''
  ELSE [vBoCommunicationLogSummary].[CommunicationType]
END
```

In `Title`, `NCHAR(8211)` is the en dash, so the expression does not depend on how the
IQA editor stores a typed "–". A subject that is only the tag
("Agreement A107") stays as it is.

## 2. Details (lazy, `/api/query`): one row per recipient of one send

Starting point (owner's export, 5 October 2026): the recipient rows of
`CommunicationLogRecipient` for one key, including the `Communication` column
(the whole send definition as XML, on every row).

Sources: `_i4u_UT_OutboundEmails`; the contact business object, **left** join
on `ContactKey` (the recipient's name).

| Filter property | Operator | Prompt | Search label |
|---|---|---|---|
| `CommunicationLogKey` | Equal | Required | `CommunicationLogKey` |

| Alias | Value | Notes |
|---|---|---|
| `Recipient` | contact `FullName` | Required; the export has no name, only `Contact Key` |
| `Address` | `[vBo_i4u_UT_OutboundEmails].[SentTo]` | The address it went to; its own column on the card |
| `Status` | `[vBo_i4u_UT_OutboundEmails].[Status]` | The latest event's name (Delivered, Bounce, Open…), or its code (`LastCommunicationLogEventTypeCode`): the theme shows a code as its name |
| `StatusTone` | expression below | danger, success, warning or blank |
| `LastEvent` | `[vBo_i4u_UT_OutboundEmails].[LastEventDateTime]` | When the status last changed; optional |
| `LastEventDetail` | `[vBo_i4u_UT_OutboundEmails].[LastEventReason]` | A bounce reason; optional, once the business object has it (contact note "To add") |

Do not select the `Communication` column: it repeats the full send
definition on every row. Sort: `Recipient` ascending (the card lists problems
first itself).

`StatusTone` (on the status name, so the business object needs no new column;
codes in the contact note):

```sql
CASE
  WHEN [vBo_i4u_UT_OutboundEmails].[Status] IN ('Dropped', 'Bounce', 'Spam Report') THEN 'danger'
  WHEN [vBo_i4u_UT_OutboundEmails].[Status] IN ('Delivered', 'Open', 'Click') THEN 'success'
  WHEN [vBo_i4u_UT_OutboundEmails].[Status] IN ('Deferred', 'Unsubscribe') THEN 'warning'
  ELSE ''
END
```

Known limit: `_i4u_UT_OutboundEmails` inner-joins `ContactMain`, so a
recipient with no contact record has no row (they are counted in the
summary's `NotSent`, which the card shows).

## Checks once built

- `GET /api/QueryParameterDefinition?QueryPath=<details IQA>`: the filter is
  named `CommunicationLogKey`.
- `GET /api/query?QueryName=<details IQA>&CommunicationLogKey=01a10bbc-4cd0-70d8-9af9-bbb7cb51e83f`
  returns three rows (Dani Sundara, Tony Fin Stark, Tony Williams) with
  `Status` Delivered.
- The summary on agreement 123 returns the two sends in the export, newest
  first, with `Title` "SBU Team 3" and "Agreement A107".
