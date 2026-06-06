// Swimming Workout Generator v5.1
// Uses: user rest time settings, approved workout patterns as reference

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

// Get rest time from user settings for a given distance
function getRestTime(dist, settings) {
  var srt = (settings && settings.swimRestTimes) || {};
  var d = parseInt(dist) || 50;
  if (d <= 50) return (srt.d50 || 30) + 's';
  if (d <= 100) return (srt.d100 || 45) + 's';
  if (d <= 200) return (srt.d200 || 60) + 's';
  if (d <= 300) return (srt.d300 || 75) + 's';
  if (d <= 400) return (srt.d400 || 90) + 's';
  return (srt.d500 || 120) + 's';
}

function formatRest(seconds) {
  if (seconds < 60) return seconds + 's';
  var m = Math.floor(seconds / 60);
  var s = seconds % 60;
  return s > 0 ? m + ':' + String(s).padStart(2, '0') : m + ':00';
}

function buildSwimWarmup(rand) {
  var warmups = [
    [
      { name: 'Easy Freestyle', reps: '200m', category: 'stroke' },
      { name: 'Flutter Kick', reps: '4x50m', category: 'kick' },
      { name: 'Catch-up Drill', reps: '4x25m', category: 'drill' },
    ],
    [
      { name: 'Easy Freestyle', reps: '300m', category: 'stroke' },
      { name: 'Backstroke', reps: '100m', category: 'stroke' },
      { name: 'Kick with Board', reps: '4x50m', category: 'kick' },
    ],
    [
      { name: 'Easy Freestyle', reps: '200m', category: 'stroke' },
      { name: 'K-D-S (Kick/Drill/Swim)', reps: '6x75m', category: 'drill' },
      { name: 'Descending Freestyle', reps: '4x50m', category: 'stroke' },
    ],
    [
      { name: 'Easy Freestyle', reps: '400m', category: 'stroke' },
      { name: 'IM Drill (all strokes)', reps: '4x25m', category: 'drill' },
      { name: 'Dolphin Kick', reps: '4x25m', category: 'kick' },
    ],
    [
      { name: 'Easy Freestyle', reps: '200m', category: 'stroke' },
      { name: 'Pull with Buoy', reps: '200m', category: 'pull' },
      { name: 'Flutter Kick', reps: '200m', category: 'kick' },
    ],
  ];
  return { rounds: 1, exercises: warmups[Math.floor(rand() * warmups.length)] };
}

function buildSwimCooldown(rand) {
  var cooldowns = [
    [{ name: 'Easy Freestyle', reps: '200m', category: 'stroke' }, { name: 'Easy Backstroke', reps: '100m', category: 'stroke' }],
    [{ name: 'Easy Mixed Strokes', reps: '300m', category: 'stroke' }],
    [{ name: 'Easy Freestyle', reps: '200m', category: 'stroke' }, { name: 'Flutter Kick', reps: '100m', category: 'kick' }],
  ];
  return {
    label: 'Cool-down',
    modality: 'EASY',
    config: 'Recovery',
    exercises: cooldowns[Math.floor(rand() * cooldowns.length)]
  };
}

function buildSprintSet(rand, label, settings) {
  var rest50 = getRestTime(50, settings);
  var rest100 = getRestTime(100, settings);
  var sets = [
    { config: '8x25m Sprint | Rest ' + getRestTime(25, settings), exercises: [
      { name: 'Sprint Freestyle', reps: '8x25m', category: 'sprint' },
      { name: 'Rest between reps', reps: getRestTime(25, settings), category: 'rest' },
    ]},
    { config: '6x50m Fast | Rest ' + rest50, exercises: [
      { name: 'Fast Freestyle', reps: '6x50m', category: 'sprint' },
      { name: 'Rest between reps', reps: rest50, category: 'rest' },
    ]},
    { config: '4x25m + 4x50m Sprint', exercises: [
      { name: 'Sprint Freestyle', reps: '4x25m', category: 'sprint' },
      { name: 'Rest', reps: getRestTime(25, settings), category: 'rest' },
      { name: 'Fast Freestyle', reps: '4x50m', category: 'sprint' },
      { name: 'Rest', reps: rest50, category: 'rest' },
    ]},
    { config: '5x100m All-out | Rest ' + rest100, exercises: [
      { name: 'Sprint Freestyle', reps: '5x100m', category: 'sprint' },
      { name: 'Easy Recovery', reps: '50m between each', category: 'stroke' },
      { name: 'Rest at wall', reps: rest100, category: 'rest' },
    ]},
    { config: '8x50m Descending | Rest ' + rest50, exercises: [
      { name: 'Freestyle Descending', reps: '8x50m (each faster)', category: 'sprint' },
      { name: 'Rest between reps', reps: rest50, category: 'rest' },
    ]},
  ];
  var s = sets[Math.floor(rand() * sets.length)];
  return { label: label, modality: 'SPRINT', config: s.config, exercises: s.exercises };
}

function buildEnduranceSet(rand, label, settings) {
  var rest200 = getRestTime(200, settings);
  var rest100 = getRestTime(100, settings);
  var rest400 = getRestTime(400, settings);
  var sets = [
    { config: '3x400m Steady | Rest ' + rest400, exercises: [
      { name: 'Freestyle', reps: '3x400m', category: 'stroke' },
      { name: 'Rest', reps: rest400, category: 'rest' },
    ]},
    { config: '4x200m Even splits | Rest ' + rest200, exercises: [
      { name: 'Freestyle', reps: '4x200m', category: 'stroke' },
      { name: 'Rest', reps: rest200, category: 'rest' },
    ]},
    { config: '8x100m Consistent | Rest ' + rest100, exercises: [
      { name: 'Freestyle', reps: '8x100m', category: 'stroke' },
      { name: 'Rest', reps: rest100, category: 'rest' },
    ]},
    { config: 'Pyramid 50-100-200-100-50 | Rest ' + rest100, exercises: [
      { name: 'Freestyle Pyramid', reps: '50m > 100m > 200m > 100m > 50m', category: 'stroke' },
      { name: 'Rest between each', reps: rest100, category: 'rest' },
    ]},
    { config: '4x100m Pull + 4x100m Kick | Rest ' + rest100, exercises: [
      { name: 'Pull with Buoy', reps: '4x100m', category: 'pull' },
      { name: 'Kick with Board', reps: '4x100m', category: 'kick' },
      { name: 'Rest', reps: rest100, category: 'rest' },
    ]},
  ];
  var s = sets[Math.floor(rand() * sets.length)];
  return { label: label, modality: 'ENDURANCE', config: s.config, exercises: s.exercises };
}

function buildTechniqueSet(rand, label) {
  var drills = ['Catch-up Drill', 'Fingertip Drag', 'Superman Drill', 'One-arm Drill', 'Sculling', 'Fist Drill'];
  var strokes = ['Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly'];
  var d1 = drills[Math.floor(rand() * drills.length)];
  var d2 = drills[Math.floor(rand() * drills.length)];
  var st = strokes[Math.floor(rand() * strokes.length)];
  var sets = [
    { config: 'Drill Focus', exercises: [
      { name: d1, reps: '4x50m', category: 'drill' },
      { name: st + ' (focus form)', reps: '4x50m', category: 'stroke' },
      { name: d2, reps: '4x50m', category: 'drill' },
      { name: st + ' (apply drill)', reps: '4x50m', category: 'stroke' },
    ]},
    { config: 'Stroke Technique', exercises: [
      { name: 'Freestyle Drill', reps: '4x25m', category: 'drill' },
      { name: 'Backstroke Drill', reps: '4x25m', category: 'drill' },
      { name: 'Breaststroke Drill', reps: '4x25m', category: 'drill' },
      { name: 'IM Build', reps: '4x100m', category: 'stroke' },
    ]},
    { config: 'Kick + Drill', exercises: [
      { name: 'Flutter Kick', reps: '6x50m', category: 'kick' },
      { name: d1, reps: '6x50m', category: 'drill' },
      { name: 'Build ' + st, reps: '4x100m', category: 'stroke' },
    ]},
  ];
  var s = sets[Math.floor(rand() * sets.length)];
  return { label: label, modality: 'TECHNIQUE', config: s.config, exercises: s.exercises };
}

function buildIntervalSet(rand, label, settings) {
  var dists = [50, 100, 200];
  var dist = dists[Math.floor(rand() * dists.length)];
  var reps = dist === 50 ? [6,8,10] : dist === 100 ? [4,6,8] : [3,4,6];
  var rep = reps[Math.floor(rand() * reps.length)];
  var rest = getRestTime(dist, settings);
  var strokes = ['Freestyle', 'Backstroke', 'IM'];
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

function generateSwimWorkout(exercisePool, seed, variantNum, recentExercises, userSettings, approvedPatterns) {
  var rand = seededRand(seed + '-swim-v' + (variantNum || 1));
  var blockCount = (userSettings && userSettings.blockCount) || 2;
  approvedPatterns = approvedPatterns || [];

  var warmup = buildSwimWarmup(rand);
  var cooldown = buildSwimCooldown(rand);

  // Weight session types based on approved history
  var sessionTypes = ['sprint', 'endurance', 'technique', 'intervals'];
  if (approvedPatterns.length > 0) {
    // Add more weight to modalities that appear in approved workouts
    approvedPatterns.forEach(function(p) {
      var m = (p || '').toLowerCase();
      if (m.includes('sprint')) sessionTypes.push('sprint');
      if (m.includes('endur')) sessionTypes.push('endurance');
      if (m.includes('tech')) sessionTypes.push('technique');
      if (m.includes('interval')) sessionTypes.push('intervals');
    });
  }

  var labels = ['A', 'B', 'C', 'D'].slice(0, blockCount);
  var blocks = [];
  var usedTypes = {};

  labels.forEach(function(label) {
    var type;
    var attempts = 0;
    do {
      type = sessionTypes[Math.floor(rand() * sessionTypes.length)];
      attempts++;
    } while (usedTypes[type] && attempts < 10);
    usedTypes[type] = true;

    if (type === 'sprint') blocks.push(buildSprintSet(rand, label, userSettings));
    else if (type === 'endurance') blocks.push(buildEnduranceSet(rand, label, userSettings));
    else if (type === 'technique') blocks.push(buildTechniqueSet(rand, label));
    else blocks.push(buildIntervalSet(rand, label, userSettings));
  });

  blocks.push(cooldown);
  var pattern = 'WU+' + labels.join('') + '+CD';
  return { warmup: warmup, blocks: blocks, pattern: pattern };
}

module.exports = { generateSwimWorkout: generateSwimWorkout };
