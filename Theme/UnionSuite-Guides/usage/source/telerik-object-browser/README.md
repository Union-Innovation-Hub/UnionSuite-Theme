# Object Browser verification assets

Read-only snapshots for offline documentation, not production theme replacements.
Native Telerik skins and sprites are version 2026.3.812, matching the supplied
Object Browser capture. Source: `https://aspnet-skins.telerikstatic.com/ajaxz/2026.3.812/`.
Base files are at the root; Splitter skin/sprite are under `Metro/`; Menu and
TreeView skins/sprites are under `MetroTouch/`. Native iMIS icons were fetched
from the exact public `Assets/images/Icons/DocumentSystem/` and
`AsiCommon/Images/` paths referenced by the supplied DOM on
`https://uhubemsdev.imiscloud.com/`.

Original assets remain owned by Progress Telerik and ASI. The generator embeds
only used icons; unused checkbox/loading/legacy tree-line image URLs are omitted.
No Telerik JavaScript, iMIS postbacks or live navigation runs in the example.
The summary iframe contains an explicitly labelled example, since its document
was not included in the DOM capture. It loads the shared theme independently.
