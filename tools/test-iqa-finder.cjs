// Tests the IQA finder's search (Theme/UnionSuite/Scripts/IQA-Finder.js).
// Run from the project root: node --test tools/test-iqa-finder.cjs
'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const finder = require('../Theme/UnionSuite/Scripts/IQA-Finder.js');

const entries = [
  { k: '1', n: 'Milestones', p: '$/_i4u_/Core/CA/v2/Reports/Milestones' },
  { k: '2', n: 'Agreement Milestones', p: '$/_i4u_/Core/CA/Dashboards/Agreement Milestones' },
  { k: '3', n: 'Notes', p: '$/_i4u_/Core/CA/v2/Reports/Notes' },
  { k: '4', n: 'API - Manage Agreement - Banner Details', p: '$/_i4u_/Core/CA/v2/API - Manage Agreement - Banner Details' },
  { k: '5', n: 'Query Template - Manage Agreement - Banner', p: '$/_i4u_/Core/CA/v2/Query Template - Manage Agreement - Banner' },
  { k: '6', n: 'Milestone Tasks', p: '$/_i4u_/SandBox/Milestone Tasks' },
  { k: '7', n: 'Résumé list', p: '$/_i4u_/SandBox/Résumé list' }
];
const names = query => finder.search(entries, query).map(entry => entry.n);

test('an exact name comes first, then names that start with it, then others', () => {
  assert.deepEqual(names('milestones'), ['Milestones', 'Agreement Milestones']);
  assert.deepEqual(names('milestone'), ['Milestone Tasks', 'Milestones', 'Agreement Milestones']);
});

test('every word must match the name or the path', () => {
  assert.deepEqual(names('banner details'), ['API - Manage Agreement - Banner Details']);
  assert.deepEqual(names('reports notes'), ['Notes']);
  assert.deepEqual(names('ca v2 reports'), ['Milestones', 'Notes']);
  assert.deepEqual(names('banner nothing'), []);
});

test('path separators and accents do not matter', () => {
  assert.deepEqual(names('v2/reports/notes'), ['Notes']);
  assert.deepEqual(names('resume'), ['Résumé list']);
});

test('an empty query finds nothing; the limit applies', () => {
  assert.deepEqual(names('   '), []);
  assert.equal(finder.search(entries, 'a', 2).length, 2);
});

test('the server is asked for the longest word only', () => {
  assert.equal(finder.serverTerm('ca v2 milestones'), 'milestones');
  assert.equal(finder.serverTerm('  Banner  '), 'banner');
  assert.equal(finder.serverTerm(''), '');
});

test('folder of a path', () => {
  assert.equal(finder.folderOf('$/_i4u_/Core/CA/v2/Reports/Notes'), '$/_i4u_/Core/CA/v2/Reports');
});
