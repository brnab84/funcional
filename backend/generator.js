function seededRand(seed) {
  var s = 0;
  for (var i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return function() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function shuffle(arr, rand) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function pickBalanced(pool, count, rand) {
  var cats = ['lower','upper','core','conditioning','power'];
  var sel = [], sh = shuffle(pool, rand);
  cats.forEach(function(cat) { if (sel.length >= count) return; var ex = sh.find(function(e) { return e.category === cat && !sel.find(function(s) { return s.name === e.name; }); }); if (ex) sel.push(ex); });
  sh.forEach(function(ex) { if (sel.length < count && !sel.find(function(s) { return s.name === ex.name; })) sel.push(ex); });
  return sel.slice(0, count);
}

var WARMUP = [
  {name:'Jumping Jacks',category:'conditioning',reps:['20','25','30']},
  {name:'Air Squats',category:'lower',reps:['10','15','20']},
  {name:'Mountain Climbers',category:'core',reps:['20','30']},
  {name:'Sprawl',category:'conditioning',reps:['7','10']},
  {name:'Shoulder Taps',category:'upper',reps:['10','15','20']},
  {name:'Sit Up',category:'core',reps:['15','20']},
  {name:'Push Up',category:'upper',reps:['10','15','20']},
  {name:'Abs Crunch',category:'core',reps:['20','25','30']},
  {name:'Abs Bike',category:'core',reps:['20','25','30']},
  {name:'Plank Get Up',category:'core',reps:['10']},
  {name:'Walking Kicks',category:'lower',reps:['5','10']},
  {name:'Espinales',category:'lower',reps:['15','20']},
  {name:'Abs Ball',category:'core',reps:['20','30']},
  {name:'Climbers',category:'conditioning',reps:['20','30','50']},
];

function buildWarmup(rand) {
  var rounds = [3,4,5,7][Math.floor(rand() * 4)];
  var count = [5,6,7][Math.floor(rand() * 3)];
  var pool = shuffle(WARMUP, rand);
  return { rounds: rounds, exercises: pool.slice(0, count).map(function(ex) {
    return { name: ex.name, reps: ex.reps[Math.floor(rand() * ex.reps.length)], category: ex.category };
  })};
}

// Realistic rep ranges per category
function realisticReps(category, modality, rand) {
  if (modality === 'FOR TIME') {
    // For Time: moderate reps, completable
    var ftReps = { lower: ['15','20','25','30'], upper: ['10','15','20','25'], core: ['15','20','25','30'], conditioning: ['15','20','25'], power: ['15','20','25','30'] };
    var arr = ftReps[category] || ['15','20'];
    return arr[Math.floor(rand() * arr.length)];
  }
  if (modality === 'TABATA') return 'Station';
  // Standard: EMOM/OTM/AMRAP/ROUNDS
  var stdReps = { lower: ['8','10','12','15'], upper: ['8','10','12','15'], core: ['10','12','15','20'], conditioning: ['8','10','12'], power: ['8','10','12','15'] };
  var arr2 = stdReps[category] || ['10','12'];
  return arr2[Math.floor(rand() * arr2.length)];
}

function buildBlock(pool, rand, label, modality) {
  if (modality === 'EMOM') {
    var mins = [7,10,14][Math.floor(rand() * 3)];
    var count = mins <= 7 ? 2 : 3;
    return { label: label, modality: 'EMOM', config: mins + "'", exercises: pickBalanced(pool, count, rand).map(function(ex) {
      return { name: ex.name, reps: realisticReps(ex.category, 'EMOM', rand), category: ex.category };
    })};
  }
  if (modality === 'OTM') {
    var interval = [2, 2.5, 3, 4][Math.floor(rand() * 4)];
    var rnds = [5,6,7][Math.floor(rand() * 3)];
    return { label: label, modality: 'OTM', config: 'OTM ' + interval + "' — " + rnds + ' rounds', exercises: pickBalanced(pool, [4,5,6][Math.floor(rand() * 3)], rand).map(function(ex) {
      return { name: ex.name, reps: realisticReps(ex.category, 'OTM', rand), category: ex.category };
    })};
  }
  if (modality === 'AMRAP') {
    var amMins = [5,8,10,12][Math.floor(rand() * 4)];
    return { label: label, modality: 'AMRAP', config: amMins + "'", exercises: pickBalanced(pool, [4,5,6][Math.floor(rand() * 3)], rand).map(function(ex) {
      return { name: ex.name, reps: realisticReps(ex.category, 'AMRAP', rand), category: ex.category };
    })};
  }
  if (modality === 'FOR TIME') {
    return { label: label, modality: 'FOR TIME', config: 'A Completar', exercises: pickBalanced(pool, [5,6,7][Math.floor(rand() * 3)], rand).map(function(ex) {
      return { name: ex.name, reps: realisticReps(ex.category, 'FOR TIME', rand), category: ex.category };
    })};
  }
  if (modality === 'TABATA') {
    var work = [40,45][Math.floor(rand() * 2)];
    var rest = [10,15][Math.floor(rand() * 2)];
    var series = [2,3][Math.floor(rand() * 2)];
    return { label: label, modality: 'TABATA', config: work + '"x' + rest + '" — ' + series + ' series', exercises: pickBalanced(pool, [7,8,9][Math.floor(rand() * 3)], rand).map(function(ex, i) {
      return { name: ex.name, reps: 'Station ' + (i + 1), category: ex.category };
    })};
  }
  // Default: ROUNDS
  var rnds2 = [2,3,4,5][Math.floor(rand() * 4)];
  return { label: label, modality: 'ROUNDS', config: rnds2 + ' Rounds', exercises: pickBalanced(pool, [4,5,6][Math.floor(rand() * 3)], rand).map(function(ex) {
    return { name: ex.name, reps: realisticReps(ex.category, 'ROUNDS', rand), category: ex.category };
  })};
}

function generateWorkout(exercisePool, seed, variantNum, recentExercises, userSettings) {
  variantNum = variantNum || 1;
  recentExercises = recentExercises || [];
  userSettings = userSettings || {};
  var rand = seededRand(seed + '-v' + variantNum);

  var blockCount = userSettings.blockCount || 2;
  var blockModalities = userSettings.blockModalities || {};

  // Filter recent
  var recentSet = {};
  recentExercises.forEach(function(e) { recentSet[e.toLowerCase()] = true; });
  var pool = exercisePool.filter(function(e) { return !recentSet[e.name.toLowerCase()]; });
  if (pool.length < 8) pool = exercisePool;

  var warmup = buildWarmup(rand);
  var sh = shuffle(pool, rand);

  // Always generate exactly blockCount blocks
  var labels = ['A','B','C','D'].slice(0, blockCount);
  var allModalities = ['EMOM','OTM','AMRAP','ROUNDS','FOR TIME'];
  var blocks = [];
  var usedMods = {};

  labels.forEach(function(label, i) {
    // Get modality: from settings, or random (avoid repeating)
    var mod = blockModalities[label];
    if (!mod || mod === 'random') {
      // Pick random, try not to repeat
      var available = allModalities.filter(function(m) { return !usedMods[m]; });
      if (available.length === 0) available = allModalities;
      mod = available[Math.floor(rand() * available.length)];
    }
    usedMods[mod] = true;

    // Split pool so each block gets different exercises
    var chunkSize = Math.ceil(sh.length / blockCount);
    var chunk = sh.slice(i * chunkSize, (i + 1) * chunkSize);
    if (chunk.length < 3) chunk = sh; // fallback if not enough

    blocks.push(buildBlock(chunk, rand, label, mod));
  });

  var pattern = 'EC+' + labels.join('');
  return { warmup: warmup, blocks: blocks, pattern: pattern };
}

module.exports = { generateWorkout: generateWorkout };
