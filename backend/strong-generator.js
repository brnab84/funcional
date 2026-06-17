// strong-generator.js — strength sessions modeled on real coach plans:
// muscle-group split days, pyramid/range/rounds/superset schemes, mobility/cardio
// warm-up. Same interface + output shape as generator.js / swim-generator.js.
// Learns per user via TrainingStats (exerciseFreq weighting).

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

// Weighted pick within a muscle group (favours approved exercises via stats)
function pickFromGroup(pool, group, n, rand, stats, used) {
  var freq = (stats && stats.exerciseFreq) ? stats.exerciseFreq : {};
  var inGroup = pool.filter(function (e) { return e.category === group && !used[e.name]; });
  var src = inGroup.length ? inGroup : pool.filter(function (e) { return !used[e.name]; });
  var scored = src.map(function (ex) {
    var key = ex.name.replace(/[.$]/g, '_');
    return { ex: ex, score: 1 + (freq[key] || 0) };
  });
  scored.sort(function (a, b) { return (b.score * rand()) - (a.score * rand()); });
  var out = [];
  for (var i = 0; i < scored.length && out.length < n; i++) { out.push(scored[i].ex); used[scored[i].ex.name] = true; }
  return out;
}

// Muscle-split day templates (first block = main/heavy)
var DAYS = [
  { pattern: 'PIERNA ANTERIOR', groups: ['legs', 'legs', 'glutes', 'core'] },
  { pattern: 'PIERNA POSTERIOR / GLÚTEOS', groups: ['hamstrings', 'glutes', 'hamstrings', 'core'] },
  { pattern: 'PECHO / TRÍCEPS', groups: ['chest', 'chest', 'triceps'] },
  { pattern: 'ESPALDA / BÍCEPS', groups: ['back', 'back', 'biceps'] },
  { pattern: 'HOMBRO / PIERNA', groups: ['shoulders', 'shoulders', 'legs', 'glutes'] },
  { pattern: 'TORSO A', groups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
  { pattern: 'TORSO B', groups: ['back', 'chest', 'shoulders', 'triceps', 'biceps'] },
  { pattern: 'FULL BODY', groups: ['legs', 'chest', 'back', 'core'] }
];

var MAIN_SCHEMES = [
  { m: 'PIRÁMIDE', reps: '12-10-12', cfg: 'Sube carga, baja reps' },
  { m: 'PIRÁMIDE', reps: '12-10-10-8', cfg: '4 series, sube carga' },
  { m: 'FUERZA', reps: '4 x 6-8', cfg: 'Pesado, técnica perfecta' },
  { m: '4x8', reps: '4 x 8', cfg: '@ RPE 8' },
  { m: 'PIRÁMIDE', reps: '10-10-8', cfg: 'Sube carga' }
];
var HYPER_SCHEMES = [
  { m: '3x10', reps: '3 x 10' }, { m: '4x10', reps: '4 x 10' },
  { m: '3x12', reps: '3 x 12' }, { m: '3x8-10', reps: '3 x 8-10' }, { m: '3x10-12', reps: '3 x 10-12' }
];
var ACCESSORY_SCHEMES = [
  { m: '3x15', reps: '3 x 15' }, { m: '3x12-15', reps: '3 x 12-15' },
  { m: 'SUPERSET', reps: '3 x 12' }, { m: 'AL FALLO', reps: '2 x al fallo' }
];
var CORE_SCHEMES = [
  { m: 'RONDAS', reps: '3 x 20' }, { m: 'RONDAS', reps: '4 x 15' }, { m: 'RONDAS', reps: '3 x 15' }
];

function generateStrongWorkout(exercisePool, seed, variantNum, recentExercises, userSettings, approvedMods, stats) {
  var rand = seededRand(String(seed) + '-strong-' + (variantNum || 1));
  var used = {};
  var day = DAYS[(Math.floor(rand() * DAYS.length) + (variantNum || 1)) % DAYS.length];

  // Warm-up: mobility or light cardio
  var warmup = pick([
    { rounds: 1, exercises: [{ name: 'Movilidad Articular', reps: '10 min', category: 'core' }] },
    { rounds: 1, exercises: [{ name: 'Cinta / Aeróbico', reps: '3 km', category: 'core' }] },
    { rounds: 1, exercises: [{ name: 'Aeróbico suave', reps: '20 min', category: 'core' }] }
  ], rand);

  var blocks = [];
  var labels = ['A', 'B', 'C', 'D', 'E', 'F'];
  day.groups.forEach(function (group, idx) {
    var scheme, n;
    if (idx === 0) { scheme = pick(MAIN_SCHEMES, rand); n = 1; }
    else if (group === 'core') { scheme = pick(CORE_SCHEMES, rand); n = 3; }
    else if (idx <= 1) { scheme = pick(HYPER_SCHEMES, rand); n = 2; }
    else { scheme = pick(ACCESSORY_SCHEMES, rand); n = 2; }
    var exs = pickFromGroup(exercisePool, group, n, rand, stats, used);
    if (!exs.length) return;
    blocks.push({
      label: labels[blocks.length],
      modality: scheme.m,
      config: (idx === 0 ? 'Principal · ' : '') + (scheme.cfg || group),
      exercises: exs.map(function (ex) { return { name: ex.name, reps: scheme.reps, category: ex.category }; })
    });
  });

  return { warmup: warmup, blocks: blocks, pattern: day.pattern };
}

module.exports = { generateStrongWorkout: generateStrongWorkout };
