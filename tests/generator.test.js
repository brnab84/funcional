const { test } = require('node:test');
const assert = require('node:assert');
const { generateWorkout } = require('../backend/generator');

const POOL = [
  { name: 'Air Squats', category: 'lower' }, { name: 'Push Up', category: 'upper' },
  { name: 'Sit Up', category: 'core' }, { name: 'Burpees', category: 'conditioning' },
  { name: 'Thruster', category: 'power' }, { name: 'Pull Up', category: 'upper' },
  { name: 'Box Jump', category: 'lower' }, { name: 'V-Ups', category: 'core' },
  { name: 'Run', category: 'conditioning' }, { name: 'Wall Ball', category: 'power' }
];

test('generates a workout with warmup and blocks', () => {
  const w = generateWorkout(POOL, 'seed', 1, [], { blockCount: 2 }, [], null);
  assert.ok(w.warmup, 'has warmup');
  assert.ok(Array.isArray(w.blocks), 'blocks is array');
  assert.ok(w.pattern, 'has pattern');
});

test('respects blockCount setting', () => {
  const w2 = generateWorkout(POOL, 'seed', 1, [], { blockCount: 2 }, [], null);
  const w4 = generateWorkout(POOL, 'seed', 1, [], { blockCount: 4 }, [], null);
  assert.strictEqual(w2.blocks.length, 2);
  assert.strictEqual(w4.blocks.length, 4);
});

test('every block has label, modality, and exercises', () => {
  const w = generateWorkout(POOL, 'seed', 1, [], { blockCount: 3 }, [], null);
  w.blocks.forEach(b => {
    assert.ok(b.label, 'block has label');
    assert.ok(b.modality, 'block has modality');
    assert.ok(b.exercises.length > 0, 'block has exercises');
  });
});

test('does not crash when stats provided (regression for v7.5.1)', () => {
  const stats = { exerciseFreq: { 'Air_Squats': 5 }, modalityFreq: { 'AMRAP': 3 } };
  assert.doesNotThrow(() => {
    generateWorkout(POOL, 'seed', 1, [], { blockCount: 2 }, [], stats);
  });
});

test('same seed produces same workout (deterministic)', () => {
  const a = generateWorkout(POOL, 'fixed', 1, [], { blockCount: 2 }, [], null);
  const b = generateWorkout(POOL, 'fixed', 1, [], { blockCount: 2 }, [], null);
  assert.strictEqual(a.pattern, b.pattern);
});
