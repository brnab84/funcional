// strong-generator.js — strength sessions (main lift + secondary + accessories).
// Same interface/output shape as generator.js / swim-generator.js so it plugs
// into workouts.js via the sport registry.

function seededRand(seed) {
  var s = 0;
  for (var i = 0; i < String(seed).length; i++) s = (s * 31 + String(seed).charCodeAt(i)) >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function shuffle(arr, rand) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function pick(arr, rand) { return arr[Math.floor(rand() * arr.length)]; }

// Weighted pick from a category set (favours approved exercises via stats)
function pickFromCats(pool, cats, n, rand, stats, used) {
  used = used || {};
  var freq = (stats && stats.exerciseFreq) ? stats.exerciseFreq : {};
  var inCats = pool.filter(function (e) { return cats.indexOf(e.category) >= 0 && !used[e.name]; });
  var src = inCats.length ? inCats : pool.filter(function (e) { return !used[e.name]; });
  var scored = src.map(function (ex) {
    var key = ex.name.replace(/[.$]/g, '_');
    return { ex: ex, score: 1 + (freq[key] || 0) };
  });
  scored.sort(function (a, b) { return (b.score * rand()) - (a.score * rand()); });
  var out = [];
  for (var i = 0; i < scored.length && out.length < n; i++) { out.push(scored[i].ex); used[scored[i].ex.name] = true; }
  return out;
}

var STRONG_WARMUP = [
  { name: 'Bike / Row easy', reps: '3-5 min', category: 'accessory' },
  { name: 'Band Pull-Apart', reps: '15', category: 'pull' },
  { name: 'Bodyweight Squat', reps: '10-15', category: 'squat' },
  { name: 'Hip Opener', reps: '8 c/lado', category: 'hinge' },
  { name: 'Scapular Pull-Up', reps: '8', category: 'pull' },
  { name: 'Push-Up', reps: '10-12', category: 'push' },
  { name: 'Light Ramp Sets', reps: '2-3 series', category: 'accessory' }
];

var DAYS = [
  { pattern: 'LOWER — SQUAT', main: ['squat'], secondary: ['hinge'] },
  { pattern: 'LOWER — HINGE', main: ['hinge'], secondary: ['squat'] },
  { pattern: 'UPPER — PUSH', main: ['push'], secondary: ['pull'] },
  { pattern: 'UPPER — PULL', main: ['pull'], secondary: ['push'] },
  { pattern: 'FULL BODY', main: ['squat', 'hinge'], secondary: ['push', 'pull'] },
  { pattern: 'OLYMPIC + STRENGTH', main: ['olympic'], secondary: ['squat'] }
];

var MAIN_SCHEMES = [
  { m: '5x5', reps: '5 x 5', cfg: 'Misma carga las 5 series' },
  { m: '5/3/1', reps: '5 / 3 / 1+', cfg: 'Subí la carga cada serie' },
  { m: '4x6', reps: '4 x 6', cfg: '@ RPE 8' },
  { m: '3x5', reps: '3 x 5', cfg: 'Pesado, técnica perfecta' },
  { m: 'PYRAMID', reps: '12/10/8/6', cfg: 'Sube carga, baja reps' }
];
var SECONDARY_SCHEMES = [
  { m: '3x8', reps: '3 x 8' }, { m: '4x8', reps: '4 x 8' }, { m: '3x10', reps: '3 x 10' }
];
var ACCESSORY_SCHEMES = [
  { m: 'SUPERSET', reps: '3 x 12' }, { m: '3x12', reps: '3 x 12' },
  { m: '3x15', reps: '3 x 15' }, { m: 'DROP SET', reps: '2 x 12 + drop' }
];

function generateStrongWorkout(exercisePool, seed, variantNum, recentExercises, userSettings, approvedMods, stats) {
  var rand = seededRand(String(seed) + '-strong-' + (variantNum || 1));
  var used = {};
  var day = DAYS[(Math.floor(rand() * DAYS.length) + (variantNum || 1)) % DAYS.length];

  // Warm-up
  var wuPool = shuffle(STRONG_WARMUP, rand);
  var warmup = { rounds: 1, exercises: wuPool.slice(0, 5).map(function (e) { return { name: e.name, reps: e.reps, category: e.category }; }) };

  var blocks = [];

  // Block A — main lift
  var mainScheme = pick(MAIN_SCHEMES, rand);
  var mainLift = pickFromCats(exercisePool, day.main, 1, rand, stats, used);
  blocks.push({
    label: 'A', modality: mainScheme.m, config: 'Lift principal · ' + mainScheme.cfg,
    exercises: mainLift.map(function (ex) { return { name: ex.name, reps: mainScheme.reps, category: ex.category }; })
  });

  // Block B — secondary compound(s)
  var secScheme = pick(SECONDARY_SCHEMES, rand);
  var secCount = day.secondary.length > 1 ? 2 : 1;
  var secLifts = pickFromCats(exercisePool, day.secondary, secCount, rand, stats, used);
  if (secLifts.length) {
    blocks.push({
      label: 'B', modality: secScheme.m, config: 'Accesorio compuesto',
      exercises: secLifts.map(function (ex) { return { name: ex.name, reps: secScheme.reps, category: ex.category }; })
    });
  }

  // Block C — accessories + core
  var accScheme = pick(ACCESSORY_SCHEMES, rand);
  var accLifts = pickFromCats(exercisePool, ['accessory', 'core'], 3, rand, stats, used);
  if (accLifts.length) {
    blocks.push({
      label: secLifts.length ? 'C' : 'B', modality: accScheme.m, config: 'Accesorios',
      exercises: accLifts.map(function (ex) { return { name: ex.name, reps: accScheme.reps, category: ex.category }; })
    });
  }

  return { warmup: warmup, blocks: blocks, pattern: day.pattern };
}

module.exports = { generateStrongWorkout: generateStrongWorkout };
