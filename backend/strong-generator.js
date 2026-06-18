// strong-generator.js — strength sessions modeled on real coach plans.
// Reads per-user options from settings.sportConfig.strong (goal/progression/split)
// and adapts day template, main scheme and rep ranges. Learns via TrainingStats.
// Same interface + output shape as generator.js / swim-generator.js.

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

function pickFromGroup(pool, group, n, rand, stats, used) {
  var freq = (stats && stats.exerciseFreq) ? stats.exerciseFreq : {};
  var inGroup = pool.filter(function (e) { return e.category === group && !used[e.name]; });
  var src = inGroup.length ? inGroup : pool.filter(function (e) { return !used[e.name]; });
  var scored = src.map(function (ex) { return { ex: ex, score: 1 + (freq[ex.name.replace(/[.$]/g, '_')] || 0) }; });
  scored.sort(function (a, b) { return (b.score * rand()) - (a.score * rand()); });
  var out = [];
  for (var i = 0; i < scored.length && out.length < n; i++) { out.push(scored[i].ex); used[scored[i].ex.name] = true; }
  return out;
}

// Day templates tagged with which split(s) they belong to
var DAYS = [
  { pattern: 'PIERNA ANTERIOR', groups: ['legs', 'legs', 'glutes', 'core'], splits: ['grupo', 'torso-pierna', 'PPL'] },
  { pattern: 'PIERNA POSTERIOR / GLÚTEOS', groups: ['hamstrings', 'glutes', 'hamstrings', 'core'], splits: ['grupo', 'torso-pierna', 'PPL'] },
  { pattern: 'PECHO / TRÍCEPS', groups: ['chest', 'chest', 'triceps'], splits: ['grupo', 'PPL'] },
  { pattern: 'ESPALDA / BÍCEPS', groups: ['back', 'back', 'biceps'], splits: ['grupo', 'PPL'] },
  { pattern: 'HOMBRO / PIERNA', groups: ['shoulders', 'shoulders', 'legs', 'glutes'], splits: ['grupo'] },
  { pattern: 'TORSO A', groups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'], splits: ['grupo', 'torso-pierna'] },
  { pattern: 'TORSO B', groups: ['back', 'chest', 'shoulders', 'triceps', 'biceps'], splits: ['grupo', 'torso-pierna'] },
  { pattern: 'FULL BODY', groups: ['legs', 'chest', 'back', 'core'], splits: ['grupo', 'full body'] }
];

var MAIN_SCHEMES = [
  { m: 'PIRÁMIDE', reps: '12-10-12', cfg: 'Sube carga, baja reps' },
  { m: 'PIRÁMIDE', reps: '12-10-10-8', cfg: '4 series, sube carga' },
  { m: 'FUERZA', reps: '4 x 6-8', cfg: 'Pesado, técnica perfecta' },
  { m: '4x8', reps: '4 x 8', cfg: '@ RPE 8' }
];
// Main scheme by progression model (settings)
var PROGRESSION = {
  '5x5': { m: '5x5', reps: '5 x 5', cfg: 'Misma carga las 5 series' },
  '5-3-1': { m: '5/3/1', reps: '5 / 3 / 1+', cfg: 'Sube la carga cada serie' },
  'doble': { m: 'DOBLE PROG.', reps: '3 x 8-12', cfg: 'Subí reps y luego carga' },
  'RPE': { m: 'RPE', reps: '4 x 6 @ RPE 8', cfg: 'Autorregulado' }
};
// Rep ranges by goal
var GOAL_HYPER = { fuerza: ['4 x 6', '5 x 5', '4 x 5'], hipertrofia: ['3 x 10', '4 x 10', '3 x 12'], potencia: ['5 x 3', '6 x 3', '4 x 4'] };
var GOAL_ACC = { fuerza: ['3 x 8', '3 x 6'], hipertrofia: ['3 x 12', '3 x 15'], potencia: ['3 x 6', '4 x 5'] };
var CORE_REPS = ['3 x 20', '4 x 15', '3 x 15'];

function generateStrongWorkout(exercisePool, seed, variantNum, recentExercises, userSettings, approvedMods, stats) {
  var rand = seededRand(String(seed) + '-strong-' + (variantNum || 1));
  var used = {};
  var cfg = (userSettings && userSettings.sportConfig && userSettings.sportConfig.strong) || {};
  var split = cfg.split || 'grupo muscular';
  var splitKey = split === 'grupo muscular' ? 'grupo' : split;
  var goal = GOAL_HYPER[cfg.goal] ? cfg.goal : 'hipertrofia';

  // Pick a day matching the chosen split (fallback to all)
  var dayPool = DAYS.filter(function (d) { return d.splits.indexOf(splitKey) >= 0; });
  if (!dayPool.length) dayPool = DAYS;
  var day = dayPool[(Math.floor(rand() * dayPool.length) + (variantNum || 1)) % dayPool.length];

  var warmup = pick([
    { rounds: 1, exercises: [{ name: 'Movilidad Articular', reps: '10 min', category: 'core' }] },
    { rounds: 1, exercises: [{ name: 'Cinta / Aeróbico', reps: '3 km', category: 'core' }] },
    { rounds: 1, exercises: [{ name: 'Aeróbico suave', reps: '20 min', category: 'core' }] }
  ], rand);

  var mainScheme = PROGRESSION[cfg.progression] || pick(MAIN_SCHEMES, rand);

  var blocks = [];
  var labels = ['A', 'B', 'C', 'D', 'E', 'F'];
  day.groups.forEach(function (group, idx) {
    var modality, config, reps, n;
    if (idx === 0) { modality = mainScheme.m; config = 'Principal · ' + mainScheme.cfg; reps = mainScheme.reps; n = 1; }
    else if (group === 'core') { modality = 'RONDAS'; config = 'Core'; reps = pick(CORE_REPS, rand); n = 3; }
    else if (idx <= 1) { modality = goal === 'fuerza' ? 'FUERZA' : 'HIPERTROFIA'; config = 'Accesorio compuesto'; reps = pick(GOAL_HYPER[goal], rand); n = 2; }
    else { modality = 'ACCESORIO'; config = 'Aislamiento'; reps = pick(GOAL_ACC[goal], rand); n = 2; }
    var exs = pickFromGroup(exercisePool, group, n, rand, stats, used);
    if (!exs.length) return;
    blocks.push({
      label: labels[blocks.length], modality: modality, config: config,
      exercises: exs.map(function (ex) { return { name: ex.name, reps: reps, category: ex.category }; })
    });
  });

  var goalTag = { fuerza: 'Fuerza', hipertrofia: 'Hipertrofia', potencia: 'Potencia' }[goal] || '';
  return { warmup: warmup, blocks: blocks, pattern: day.pattern + (goalTag ? ' · ' + goalTag : '') };
}

module.exports = { generateStrongWorkout: generateStrongWorkout };
