const { test } = require('node:test');
const assert = require('node:assert');
const { generateSwimWorkout } = require('../backend/swim-generator');

function extractDistances(workout) {
  const dists = [];
  const re = /(\d+)\s*m/g;
  const scan = ex => {
    let m;
    const s = String(ex.reps || '');
    while ((m = re.exec(s)) !== null) dists.push(parseInt(m[1]));
  };
  (workout.warmup.exercises || []).forEach(scan);
  workout.blocks.forEach(b => (b.exercises || []).forEach(scan));
  return dists;
}

test('generates swim workout with warmup, blocks, pattern', () => {
  const w = generateSwimWorkout([], 's', 1, [], { poolLength: 25, blockCount: 2 }, [], null);
  assert.ok(w.warmup);
  assert.ok(w.blocks.length >= 2);
  assert.ok(w.pattern);
});

test('all distances are multiples of 25m pool', () => {
  for (let v = 1; v <= 5; v++) {
    const w = generateSwimWorkout([], 'seed' + v, v, [], { poolLength: 25, blockCount: 3 }, [], null);
    extractDistances(w).forEach(d => {
      assert.strictEqual(d % 25, 0, `distance ${d} should be multiple of 25`);
    });
  }
});

test('all distances are multiples of 50m pool', () => {
  for (let v = 1; v <= 5; v++) {
    const w = generateSwimWorkout([], 'seed' + v, v, [], { poolLength: 50, blockCount: 3 }, [], null);
    extractDistances(w).forEach(d => {
      assert.strictEqual(d % 50, 0, `distance ${d} should be multiple of 50`);
    });
  }
});

test('does not crash with stats', () => {
  const stats = { patternFreq: { 'A1-A3': 2 } };
  assert.doesNotThrow(() => {
    generateSwimWorkout([], 's', 1, [], { poolLength: 25, blockCount: 2 }, [], stats);
  });
});
