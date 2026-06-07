const { test } = require('node:test');
const assert = require('node:assert');
const { categoriesFor, modalitiesFor, WORKOUT_SOURCES } = require('../backend/utils/constants');

test('functional categories', () => {
  assert.deepStrictEqual(categoriesFor('functional'), ['lower', 'upper', 'core', 'conditioning', 'power']);
});

test('swimming categories include rest', () => {
  assert.ok(categoriesFor('swimming').includes('stroke'));
  assert.ok(categoriesFor('swimming').includes('rest'));
});

test('unknown sport defaults to functional', () => {
  assert.deepStrictEqual(categoriesFor('xyz'), categoriesFor('functional'));
});

test('workout sources include all four types', () => {
  ['local', 'ai', 'manual', 'imported'].forEach(s => {
    assert.ok(WORKOUT_SOURCES.includes(s), s + ' is valid source');
  });
});
