#!/usr/bin/env node
/*
 * Checks the staff help's matcher (Theme/UnionSuite/Scripts/UnionSuiteHelpMatch.js) answers
 * questions worded the way staff ask them, not the way the topics say
 * them. Builds the help JSON in memory, so no build is needed first.
 *
 *   node tools/test-user-guide.cjs
 *
 * A failure means a topic needs another ask or keyword (or a word in
 * synonyms.json), not new weights in the matcher.
 */
'use strict';

const path = require('path');
const {loadArea, helpJson, GUIDE, MATCHER} = require('./build-user-guide.cjs');
const Match = require(MATCHER);

const loaded = loadArea(path.join(GUIDE, 'cases'));
if (loaded.problems.length) {
  console.error(loaded.problems.join('\n'));
  process.exit(1);
}
const matcher = Match.create(helpJson(loaded));

// Question → the topic it must answer. None of these is one of the
// topics' own asks word for word.
const EXPECT = [
  ['how do i close this case', 'resolve-and-close'],
  ['the matter is settled, how do I finish it', 'resolve-and-close'],
  ['I closed it by mistake', 'reopen-or-edit-resolution'],
  ['reopen', 'reopen-or-edit-resolution'],
  ['start a new case for a member', 'create-a-case'],
  ['add a comment', 'add-a-note'],
  ['log a phone call with the member', 'add-a-note'],
  ['add a to do', 'add-and-complete-tasks'],
  ['tick off a task', 'add-and-complete-tasks'],
  ['book an appointment', 'add-a-meeting'],
  ['attach a pdf', 'upload-an-attachment'],
  ['upload documents', 'upload-an-attachment'],
  ['rename a document', 'change-something-you-added'],
  ['the file is locked', 'restricted-notes-and-files'],
  ['is the member unfinancial', 'the-member-card'],
  ['member works two jobs', 'choose-the-workplace'],
  ['add the employer', 'add-a-party'],
  ['change the main member', 'change-the-primary-party'],
  ['add a delegate', 'add-staff'],
  ['hand the case over to a colleague', 'change-the-lead-staff'],
  ['who is responsible for this case', 'change-the-lead-staff'],
  ['send an email to the members', 'email-the-parties'],
  ['see old emails', 'see-the-case-history'],
  ['who changed the priority', 'see-what-changed'],
  ['put the case on hold', 'change-the-status'],
  ['change the subtype', 'update-case-details'],
  ['make the case confidential', 'who-can-see-a-case'],
  ['why do I get no access', 'who-can-see-a-case'],
  ['my note failed to save', 'if-something-goes-wrong'],
  ['what does red last member contact mean', 'read-the-banner'],
  ['what are the tabs', 'find-your-way-around']
];

// Questions with nothing to do with cases must not get a sure answer.
const UNSURE = ['what is the weather', 'pay my invoice', 'banana'];

let failed = 0;
for (const [question, id] of EXPECT) {
  const answer = matcher.reply(question);
  const got = answer.topic ? answer.topic.id : '(none)';
  if (got !== id || !answer.sure) {
    failed++;
    const ranked = matcher.rank(question, 3).map(r => r.topic.id + ' ' + r.score).join(', ');
    console.log('FAIL  "' + question + '" → ' + got + (answer.sure ? '' : ' (unsure)') + ', expected ' + id + '\n      ' + ranked);
  }
}
for (const question of UNSURE) {
  const answer = matcher.reply(question);
  if (answer.sure) {
    failed++;
    console.log('FAIL  "' + question + '" was sure: ' + answer.topic.id + ' ' + answer.score);
  }
}

const total = EXPECT.length + UNSURE.length;
console.log((total - failed) + ' of ' + total + ' passed.');
process.exitCode = failed ? 1 : 0;
