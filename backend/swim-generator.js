// Swimming Generator v6.1 — pool-size aware + learns from approved workouts

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

// Round distance to nearest multiple of pool length
function poolDist(meters, pool) {
  pool = pool || 25;
  return Math.max(pool, Math.round(meters / pool) * pool);
}

// Format distance: "4x50m" or "200m"
function fd(reps, dist, pool) {
  var d = poolDist(dist, pool);
  if (reps > 1) return reps + 'x' + d + 'm';
  return d + 'm';
}

// Get rest time from settings
function getRestSec(dist, settings) {
  var srt = (settings && settings.swimRestTimes) || {};
  var d = parseInt(dist) || 50;
  if (d <= 50) return srt.d50 || 30;
  if (d <= 100) return srt.d100 || 45;
  if (d <= 200) return srt.d200 || 60;
  if (d <= 300) return srt.d300 || 75;
  if (d <= 400) return srt.d400 || 90;
  return srt.d500 || 120;
}
function fmtRest(sec) {
  if (sec < 60) return sec + 's';
  var m = Math.floor(sec / 60), s = sec % 60;
  return s > 0 ? m + ':' + String(s).padStart(2, '0') : m + ':00';
}

// Pick weighted item from array (items that appear more = higher chance)
function weightedPick(arr, rand) {
  return arr[Math.floor(rand() * arr.length)];
}

// ── WARMUP ──────────────────────────────────────────
function buildWarmup(rand, pool) {
  var patterns = [
    function() { return [
      { name: 'Easy Freestyle', reps: fd(1, 200, pool), category: 'stroke' },
      { name: 'Flutter Kick', reps: fd(4, 50, pool), category: 'kick' },
      { name: 'Catch-up Drill', reps: fd(4, 25, pool), category: 'drill' },
    ];},
    function() { return [
      { name: 'Easy Freestyle', reps: fd(1, 300, pool), category: 'stroke' },
      { name: 'Backstroke', reps: fd(1, 100, pool), category: 'stroke' },
      { name: 'Kick with Board', reps: fd(4, 50, pool), category: 'kick' },
    ];},
    function() { return [
      { name: 'Easy Freestyle', reps: fd(1, 200, pool), category: 'stroke' },
      { name: 'K-D-S (Kick/Drill/Swim)', reps: fd(3, 75, pool), category: 'drill' },
      { name: 'Backstroke', reps: fd(4, 50, pool), category: 'stroke' },
    ];},
    function() { return [
      { name: 'Easy Freestyle', reps: fd(1, 400, pool), category: 'stroke' },
      { name: 'IM Drill', reps: fd(4, 25, pool), category: 'drill' },
      { name: 'Dolphin Kick', reps: fd(4, 25, pool), category: 'kick' },
    ];},
    function() { return [
      { name: 'Easy Freestyle', reps: fd(1, 200, pool), category: 'stroke' },
      { name: 'Pull with Buoy', reps: fd(1, 200, pool), category: 'pull' },
      { name: 'Flutter Kick', reps: fd(1, 200, pool), category: 'kick' },
    ];},
  ];
  return { rounds: 1, exercises: patterns[Math.floor(rand() * patterns.length)]() };
}

// ── COOLDOWN ────────────────────────────────────────
function buildCooldown(rand, pool) {
  var opts = [
    [{ name: 'Easy Freestyle', reps: fd(1, 200, pool), category: 'stroke' }, { name: 'Easy Backstroke', reps: fd(1, 100, pool), category: 'stroke' }],
    [{ name: 'Easy Mixed Strokes', reps: fd(1, 300, pool), category: 'stroke' }],
    [{ name: 'Easy Freestyle', reps: fd(1, 200, pool), category: 'stroke' }, { name: 'Flutter Kick', reps: fd(1, 100, pool), category: 'kick' }],
  ];
  return { label: 'Cool-down', modality: 'EASY', config: 'Recovery', exercises: opts[Math.floor(rand() * opts.length)] };
}

// ── SETS ────────────────────────────────────────────
function buildSprintSet(rand, label, pool, settings) {
  var p = pool;
  var rest25 = fmtRest(getRestSec(25, settings));
  var rest50 = fmtRest(getRestSec(50, settings));
  var rest100 = fmtRest(getRestSec(100, settings));
  var sets = [
    function() { return { config: fd(8, 25, p) + ' Sprint | Rest ' + rest25, exercises: [
      { name: 'Sprint Freestyle', reps: fd(8, 25, p), category: 'sprint' },
      { name: 'Rest', reps: rest25, category: 'rest' },
    ]};},
    function() { return { config: fd(6, 50, p) + ' Fast | Rest ' + rest50, exercises: [
      { name: 'Fast Freestyle', reps: fd(6, 50, p), category: 'sprint' },
      { name: 'Rest', reps: rest50, category: 'rest' },
    ]};},
    function() { return { config: fd(4, 25, p) + ' + ' + fd(4, 50, p) + ' Sprint', exercises: [
      { name: 'Sprint Freestyle', reps: fd(4, 25, p), category: 'sprint' },
      { name: 'Fast Freestyle', reps: fd(4, 50, p), category: 'sprint' },
      { name: 'Rest', reps: rest50, category: 'rest' },
    ]};},
    function() { return { config: fd(5, 100, p) + ' All-out | Rest ' + rest100, exercises: [
      { name: 'Sprint Freestyle', reps: fd(5, 100, p), category: 'sprint' },
      { name: 'Recovery', reps: fd(1, 50, p) + ' easy between', category: 'stroke' },
      { name: 'Rest at wall', reps: rest100, category: 'rest' },
    ]};},
    function() { return { config: fd(8, 50, p) + ' Descending | Rest ' + rest50, exercises: [
      { name: 'Freestyle Descending', reps: fd(8, 50, p) + ' (each faster)', category: 'sprint' },
      { name: 'Rest', reps: rest50, category: 'rest' },
    ]};},
  ];
  var s = sets[Math.floor(rand() * sets.length)]();
  return { label: label, modality: 'SPRINT', config: s.config, exercises: s.exercises };
}

function buildEnduranceSet(rand, label, pool, settings) {
  var p = pool;
  var r100 = fmtRest(getRestSec(100, settings));
  var r200 = fmtRest(getRestSec(200, settings));
  var r400 = fmtRest(getRestSec(400, settings));
  var sets = [
    function() { return { config: fd(3, 400, p) + ' Steady | Rest ' + r400, exercises: [
      { name: 'Freestyle', reps: fd(3, 400, p), category: 'stroke' },
      { name: 'Rest', reps: r400, category: 'rest' },
    ]};},
    function() { return { config: fd(4, 200, p) + ' Even splits | Rest ' + r200, exercises: [
      { name: 'Freestyle', reps: fd(4, 200, p), category: 'stroke' },
      { name: 'Rest', reps: r200, category: 'rest' },
    ]};},
    function() { return { config: fd(8, 100, p) + ' Consistent | Rest ' + r100, exercises: [
      { name: 'Freestyle', reps: fd(8, 100, p), category: 'stroke' },
      { name: 'Rest', reps: r100, category: 'rest' },
    ]};},
    function() { var d1=poolDist(50,p),d2=poolDist(100,p),d3=poolDist(200,p); return { config: 'Pyramid ' + d1 + '-' + d2 + '-' + d3 + '-' + d2 + '-' + d1 + 'm | Rest ' + r100, exercises: [
      { name: 'Freestyle Pyramid', reps: d1+'m > '+d2+'m > '+d3+'m > '+d2+'m > '+d1+'m', category: 'stroke' },
      { name: 'Rest between', reps: r100, category: 'rest' },
    ]};},
    function() { return { config: fd(4, 100, p) + ' Pull + ' + fd(4, 100, p) + ' Kick', exercises: [
      { name: 'Pull with Buoy', reps: fd(4, 100, p), category: 'pull' },
      { name: 'Kick with Board', reps: fd(4, 100, p), category: 'kick' },
      { name: 'Rest', reps: r100, category: 'rest' },
    ]};},
  ];
  var s = sets[Math.floor(rand() * sets.length)]();
  return { label: label, modality: 'ENDURANCE', config: s.config, exercises: s.exercises };
}

function buildTechniqueSet(rand, label, pool) {
  var p = pool;
  var drills = ['Catch-up Drill','Fingertip Drag','Superman Drill','One-arm Drill','Sculling','Fist Drill'];
  var strokes = ['Freestyle','Backstroke','Breaststroke','Butterfly'];
  var d1 = drills[Math.floor(rand() * drills.length)];
  var d2 = drills[Math.floor(rand() * drills.length)];
  var st = strokes[Math.floor(rand() * strokes.length)];
  var sets = [
    function() { return { config: 'Drill Focus', exercises: [
      { name: d1, reps: fd(4, 50, p), category: 'drill' },
      { name: st + ' (focus form)', reps: fd(4, 50, p), category: 'stroke' },
      { name: d2, reps: fd(4, 50, p), category: 'drill' },
      { name: st + ' (apply drill)', reps: fd(4, 50, p), category: 'stroke' },
    ]};},
    function() { return { config: 'Stroke Technique', exercises: [
      { name: 'Freestyle Drill', reps: fd(4, 25, p), category: 'drill' },
      { name: 'Backstroke Drill', reps: fd(4, 25, p), category: 'drill' },
      { name: 'Breaststroke Drill', reps: fd(4, 25, p), category: 'drill' },
      { name: 'IM Build', reps: fd(4, 100, p), category: 'stroke' },
    ]};},
    function() { return { config: 'Kick + Drill', exercises: [
      { name: 'Flutter Kick', reps: fd(6, 50, p), category: 'kick' },
      { name: d1, reps: fd(6, 50, p), category: 'drill' },
      { name: 'Build ' + st, reps: fd(4, 100, p), category: 'stroke' },
    ]};},
  ];
  var s = sets[Math.floor(rand() * sets.length)]();
  return { label: label, modality: 'TECHNIQUE', config: s.config, exercises: s.exercises };
}

function buildIntervalSet(rand, label, pool, settings) {
  var p = pool;
  var distOpts = [poolDist(50,p), poolDist(100,p), poolDist(200,p)];
  var dist = distOpts[Math.floor(rand() * distOpts.length)];
  var repsMap = {}; repsMap[poolDist(50,p)] = [6,8,10]; repsMap[poolDist(100,p)] = [4,6,8]; repsMap[poolDist(200,p)] = [3,4,6];
  var reps = repsMap[dist] || [6,8]; var rep = reps[Math.floor(rand() * reps.length)];
  var rest = fmtRest(getRestSec(dist, settings));
  var strokes = ['Freestyle','Backstroke','IM'];
  var stroke = strokes[Math.floor(rand() * strokes.length)];
  return {
    label: label, modality: 'INTERVALS',
    config: rep + 'x' + dist + 'm | Rest ' + rest,
    exercises: [
      { name: stroke, reps: rep + 'x' + dist + 'm', category: 'stroke' },
      { name: 'Rest between reps', reps: rest, category: 'rest' },
    ]
  };
}

// ── MAIN GENERATOR ──────────────────────────────────
function generateSwimWorkout(exercisePool, seed, variantNum, recentExercises, userSettings, approvedMods) {
  var rand = seededRand(seed + '-swim-v' + (variantNum || 1));
  var blockCount = (userSettings && userSettings.blockCount) || 2;
  var pool = (userSettings && userSettings.poolLength) || 25;
  approvedMods = approvedMods || [];

  var warmup = buildWarmup(rand, pool);
  var cooldown = buildCooldown(rand, pool);

  // Build weighted session type list from approved history
  var types = ['sprint', 'endurance', 'technique', 'intervals'];
  var weighted = types.slice(); // start with one of each
  if (approvedMods.length > 0) {
    approvedMods.forEach(function(m) {
      m = (m || '').toLowerCase();
      if (m.includes('sprint')) weighted.push('sprint', 'sprint');
      if (m.includes('endur')) weighted.push('endurance', 'endurance');
      if (m.includes('tech')) weighted.push('technique', 'technique');
      if (m.includes('interval')) weighted.push('intervals', 'intervals');
    });
  }

  var labels = ['A', 'B', 'C', 'D'].slice(0, blockCount);
  var blocks = [];
  var usedTypes = {};

  labels.forEach(function(label) {
    var type, attempts = 0;
    do {
      type = weighted[Math.floor(rand() * weighted.length)];
      attempts++;
    } while (usedTypes[type] && attempts < 15);
    usedTypes[type] = true;

    if (type === 'sprint') blocks.push(buildSprintSet(rand, label, pool, userSettings));
    else if (type === 'endurance') blocks.push(buildEnduranceSet(rand, label, pool, userSettings));
    else if (type === 'technique') blocks.push(buildTechniqueSet(rand, label, pool));
    else blocks.push(buildIntervalSet(rand, label, pool, userSettings));
  });

  blocks.push(cooldown);
  return { warmup: warmup, blocks: blocks, pattern: 'WU+' + labels.join('') + '+CD' };
}

module.exports = { generateSwimWorkout: generateSwimWorkout };
