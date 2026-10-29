/* Task form (UnionSuiteForms "task"). Owner, 19 and 20 October 2026.

   One form for personal tasks (home page), case tasks and agreement tasks,
   adding and editing. Each module has its own iMIS page holding only a
   placeholder; UnionSuiteForms.js loads this file and draws the form:

     Personal   <div data-us-form="task" data-module="personal"></div>
     Case       <div data-us-form="task" data-module="case"></div>
     Agreement  <div data-us-form="task" data-module="agreement" data-assign="all"></div>

   Optional placeholder settings:
     data-tags-module   the Module filter for the task tag IQA (default: the
                        page's module; "" for every tag)
     data-assign        agreements only: "all" (every staff member, the
                        default) or "record" (the agreement's own staff)
     data-record-query  an IQA giving the record's name for the record line
                        (filter ModuleID, column Name)

   Address: ID (signed-in user), ModuleID + ModuleOrdinal (case or
   agreement; not on personal tasks) and Ordinal (the task, when editing).

   The IQAs and the CloudToolz endpoint are not built yet (owner,
   20 October 2026): CONFIG below holds them, blank until they are. Until
   then the form draws, its lists are empty (Tags is not drawn at all), edit
   says it is not set up, and Save says saving is not set up and logs what
   it would send. CloudToolz does all the saving, including the insert into
   iMIS. The IQAs each need the filters and columns listed beside them.

   The definition format is documented in the usage guide (#popup-forms). */
(function (root) {
  'use strict';

  const CONFIG = {
    // CloudToolz: adds a task (no Ordinal) or saves an edit (Ordinal set);
    // answers {Ordinal}. TBC.
    endpoint: '',
    queries: {
      // One task. Filters: Module, Ordinal. Columns: Title, Details,
      // AssignToID, AssignToName, DueDate, DueTime, HighPriority, Completed,
      // TagOrdinals and SubtagOrdinals ("5,6"), AddedBy, AddedOn.
      task: '',
      // Task tags. Filter: Module (optional). Columns: Ordinal, TagName.
      parentTags: '',
      // Subtags of the chosen tags. Filter: ParentTag ("5","6").
      // Columns: Ordinal, TagName, ParentTagOrdinal.
      childTags: '',
      // Assign to lists. Filter: ModuleOrdinal (the case or agreement).
      // Columns: ID, Name.
      caseStaff: '',
      agreementStaff: '',
      // Every staff member. No filter. Columns: ID, Name.
      allStaff: ''
    }
  };

  // Previews and the usage guide name their own sample IQAs and endpoint
  // (window.UnionSuiteFormsConfig.forms.task); production values live above.
  const preview = root.UnionSuiteFormsConfig?.forms?.task;
  if (preview) {
    if (preview.endpoint != null) CONFIG.endpoint = preview.endpoint;
    Object.assign(CONFIG.queries, preview.queries || {});
  }

  const RECORDS = {
    personal: {icon: 'user', label: () => 'Personal task', detail: 'Assigned to you'},
    case: {icon: 'briefcase', label: context => 'Case ' + context.moduleId},
    agreement: {icon: 'file', label: context => 'Agreement ' + context.moduleId}
  };

  // Which Assign to list a page uses: cases their own staff; agreements
  // every staff member or their own (data-assign); personal tasks none.
  function staffSource(context) {
    const own = context.module === 'case' ||
      (context.module === 'agreement' && context.options.assign === 'record');
    return {
      query: own ? CONFIG.queries[context.module + 'Staff'] : CONFIG.queries.allStaff,
      params: own ? () => ({ModuleOrdinal: context.moduleOrdinal}) : null,
      value: 'ID',
      label: 'Name'
    };
  }

  const tagsModule = context => context.options.tagsModule ?? context.module;

  // "Added by James Driscoll on 14 October 2026".
  function addedLine(context, record) {
    const forms = root.UnionSuiteForms?.core;
    if (!record || !forms) return '';
    const by = String(forms.column(record, 'AddedBy') ?? '').trim();
    const day = forms.dateOnly(forms.column(record, 'AddedOn'));
    const on = day ? new Date(day + 'T00:00:00').toLocaleDateString('en-AU', {day: 'numeric', month: 'long', year: 'numeric'}) : '';
    if (!by && !on) return '';
    return 'Added' + (by ? ' by ' + by : '') + (on ? ' on ' + on : '');
  }

  const spec = {
    type: 'task',
    modules: ['personal', 'case', 'agreement'],
    recordModules: ['case', 'agreement'],
    config: CONFIG,

    // The line at the top: where the task is going.
    record: context => {
      const line = RECORDS[context.module];
      return {icon: line.icon, label: line.label(context), detail: line.detail || ''};
    },

    // Edit: the task, by Module and Ordinal.
    load: {
      query: CONFIG.queries.task,
      params: context => ({Module: context.module, Ordinal: context.ordinal}),
      toValues: (row, context, lookup) => {
        const forms = root.UnionSuiteForms.core;
        const get = name => forms.column(row, name);
        const assignId = String(get('AssignToID') ?? '').trim();
        return {
          Title: String(get('Title') ?? ''),
          Details: String(get('Details') ?? ''),
          HighPriority: forms.truthy(get('HighPriority')),
          DueDate: forms.dateOnly(get('DueDate')),
          DueTime: forms.timeOnly(get('DueTime')),
          AssignTo: assignId ? lookup('AssignTo', [assignId], [String(get('AssignToName') ?? '').trim()]) : [],
          Tags: lookup('Tags', get('TagOrdinals')),
          Subtags: lookup('Subtags', get('SubtagOrdinals')),
          Completed: forms.truthy(get('Completed'))
        };
      }
    },

    fields: [
      {type: 'record'},
      {
        type: 'text', name: 'Title', label: 'What needs doing?', size: 'large',
        placeholder: 'e.g. Send the revised log of claims to HR',
        required: 'Say what needs doing before saving.', draft: 'Task',
        flag: {name: 'HighPriority', label: 'High priority', badge: 'High Priority'},
        details: {name: 'Details', label: 'Details', link: 'Add details', optional: true, short: true,
          placeholder: 'Anything the person doing it needs to know…'}
      },
      // Due date first: it starts empty and is what people set; the
      // assignee starts as the signed-in user (owner, 20 October 2026).
      {
        type: 'date', name: 'DueDate', label: 'Due date', optional: true, row: 'when',
        quick: [{label: 'Today', days: 0}, {label: 'Tomorrow', days: 1}, {label: 'In a week', days: 7}],
        time: {name: 'DueTime', label: 'Due time (optional)', add: 'Add time', step: 900}
      },
      // Optional on cases and agreements: an unassigned task belongs to the
      // record itself. Personal tasks have no field; they are always the
      // signed-in user's (spec.payload).
      {
        type: 'select', name: 'AssignTo', label: 'Assign to', optional: true, row: 'when',
        modules: ['case', 'agreement'], single: true, emptyText: 'Unassigned',
        unavailable: 'No staff to choose from',
        source: staffSource,
        default: context => [{id: context.userId, label: 'Me'}]
      },
      // Task tags, separate from note tags. Not drawn when the list is empty
      // (no task tags set up for this module).
      {
        type: 'select', name: 'Tags', label: 'Tags', optional: true, row: 'tags', hideWhenEmpty: true,
        source: context => ({
          query: CONFIG.queries.parentTags,
          params: () => (tagsModule(context) ? {Module: tagsModule(context)} : {}),
          value: 'Ordinal',
          label: 'TagName'
        }),
        toPayload: items => items.map(item => ({TagOrdinal: item.id, TagName: item.label}))
      },
      // Subtags fade in only when the chosen tags have some.
      {
        type: 'select', name: 'Subtags', label: 'Subtags', optional: true, row: 'tags', hideWhenEmpty: true,
        dependsOn: 'Tags',
        source: () => ({
          query: CONFIG.queries.childTags,
          params: (context, values) => ({ParentTag: values.Tags.map(tag => '"' + tag.id + '"').join(',')}),
          value: 'Ordinal',
          label: 'TagName',
          parent: 'ParentTagOrdinal'
        }),
        toPayload: items => items.map(item => ({TagOrdinal: item.parent, SubtagOrdinal: item.id, SubtagName: item.label}))
      },
      // Edit only: tick the task off (or reopen it); the task line strikes
      // through, as on the task rows.
      {type: 'check', name: 'Completed', label: 'Completed', modes: ['edit'], strikes: 'Title', row: 'done'},
      {type: 'meta', modes: ['edit'], row: 'done', text: addedLine}
    ],

    actions: {save: 'Save task', saveEdit: 'Save changes', again: 'Save and add another'},

    // Save and add another keeps these for the next task (tasks added in a
    // batch usually share them) and clears the rest.
    again: {keep: ['DueDate', 'DueTime', 'AssignTo', 'Tags', 'Subtags']},

    submit: {path: CONFIG.endpoint, failed: 'The task could not be saved. Try again.'},

    // Personal tasks are always the signed-in user's. The assignee "Me"
    // default carries only the ID; CloudToolz takes the ID as the truth.
    payload: (payload, context) => {
      if (context.module === 'personal') payload.AssignTo = {ID: context.userId, Name: ''};
      else if (payload.AssignTo && payload.AssignTo.Name === 'Me') payload.AssignTo.Name = '';
      if (context.mode !== 'edit') delete payload.Completed;
      return payload;
    }
  };

  if (typeof module === 'object' && module.exports) module.exports = spec;
  if (root.UnionSuiteForms) root.UnionSuiteForms.define('task', spec);
})(typeof window !== 'undefined' ? window : globalThis);
