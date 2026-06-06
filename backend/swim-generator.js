// Swimming Workout Generator
// Structure: Warm-up → Main Set (Sprint/Endurance/Technique/Mixed) → Cool-down

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
function pick(arr, n, rand) {
  return shuffle(arr, rand).slice(0, n);
}

var SESSION_TYPES = ['sprint', 'endurance', 'technique', 'mixed'];

function buildSwimWarmup(rand) {
  var warmups = [
    // Pattern 1: easy swim + kick + drill
    [
      { name: 'Easy Freestyle', reps: '200m', category: 'stroke' },
      { name: 'Flutter Kick', reps: '4x50m', category: 'kick' },
      { name: 'Catch-up Drill', reps: '4x25m', category: 'drill' },
    ],
    // Pattern 2: mixed strokes + kick
    [
      { name: 'Easy Freestyle', reps: '300m', category: 'stroke' },
      { name: 'Backstroke', reps: '100m', category: 'stroke' },
      { name: 'Kick with Board', reps: '4x50m', category: 'kick' },
    ],
    // Pattern 3: KDS (kick-drill-swim)
    [
      { name: 'Easy Freestyle', reps: '200m', category: 'stroke' },
      { name: 'K-D-S (Kick/Drill/Swim)', reps: '6x75m', category: 'drill' },
      { name: 'Descending Freestyle', reps: '4x50m', category: 'stroke' },
    ],
    // Pattern 4: IM warmup
    [
      { name: 'Easy Freestyle', reps: '400m', category: 'stroke' },
      { name: 'IM Drill (all strokes)', reps: '4x25m', category: 'drill' },
      { name: 'Dolphin Kick', reps: '4x25m', category: 'kick' },
    ],
    // Pattern 5: pull + kick
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

function buildSprintSet(exercises, rand, label) {
  var sets = [
    { config: '8x25m Sprint @ 90-100%', rest: 'Rest 45s between reps', exercises: [
      { name: 'Sprint Freestyle', reps: '8x25m', category: 'sprint' },
    ]},
    { config: '6x50m Fast @ 85-95%', rest: 'Rest 1:00 between reps', exercises: [
      { name: 'Fast Freestyle', reps: '6x50m', category: 'sprint' },
    ]},
    { config: '4x25m + 4x50m Sprint', rest: 'Rest 30-60s', exercises: [
      { name: 'Sprint Freestyle', reps: '4x25m', category: 'sprint' },
      { name: 'Fast Freestyle', reps: '4x50m', category: 'sprint' },
    ]},
    { config: '5x100m All-out', rest: 'Rest 2:00 between reps', exercises: [
      { name: 'Sprint Freestyle', reps: '5x100m', category: 'sprint' },
      { name: 'Easy Recovery', reps: '50m between each', category: 'stroke' },
    ]},
    { config: '10x25m Sprint alternating strokes', rest: 'Rest 30s', exercises: [
      { name: 'Sprint Freestyle', reps: '5x25m', category: 'sprint' },
      { name: 'Sprint Backstroke', reps: '5x25m', category: 'sprint' },
    ]},
    { config: '8x50m Descending', rest: 'Rest 45s', exercises: [
      { name: 'Freestyle Descending', reps: '8x50m', category: 'sprint' },
      { name: 'Goal: each 50m faster', reps: '', category: 'sprint' },
    ]},
  ];
  var s = sets[Math.floor(rand() * sets.length)];
  return { label: label, modality: 'SPRINT', config: s.config, exercises: s.exercises };
}

function buildEnduranceSet(exercises, rand, label) {
  var sets = [
    { config: '3x400m Moderate pace', rest: 'Rest 30s', exercises: [
      { name: 'Freestyle', reps: '3x400m', category: 'stroke' },
    ]},
    { config: '4x200m Steady', rest: 'Rest 20s', exercises: [
      { name: 'Freestyle', reps: '4x200m', category: 'stroke' },
    ]},
    { config: '8x100m Even splits', rest: 'Rest 15s', exercises: [
      { name: 'Freestyle', reps: '8x100m', category: 'stroke' },
    ]},
    { config: '1500m Continuous', rest: 'Steady pace', exercises: [
      { name: 'Continuous Freestyle', reps: '1500m', category: 'endurance' },
    ]},
    { config: 'Pyramid 50-100-200-100-50', rest: 'Rest 20s', exercises: [
      { name: 'Freestyle', reps: '50m', category: 'stroke' },
      { name: 'Freestyle', reps: '100m', category: 'stroke' },
      { name: 'Freestyle', reps: '200m', category: 'stroke' },
      { name: 'Freestyle', reps: '100m', category: 'stroke' },
      { name: 'Freestyle', reps: '50m', category: 'stroke' },
    ]},
    { config: '4x100m Pull + 4x100m Kick', rest: 'Rest 20s', exercises: [
      { name: 'Pull with Buoy', reps: '4x100m', category: 'pull' },
      { name: 'Kick with Board', reps: '4x100m', category: 'kick' },
    ]},
    { config: '3x(200m Free + 100m Back)', rest: 'Rest 15s', exercises: [
      { name: 'Freestyle', reps: '3x200m', category: 'stroke' },
      { name: 'Backstroke', reps: '3x100m', category: 'stroke' },
    ]},
  ];
  var s = sets[Math.floor(rand() * sets.length)];
  return { label: label, modality: 'ENDURANCE', config: s.config, exercises: s.exercises };
}

function buildTechniqueSet(exercises, rand, label) {
  var drills = ['Catch-up Drill', 'Fingertip Drag', 'Superman Drill', 'One-arm Drill', 'Sculling', 'Fist Drill', 'Side Kick'];
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
      { name: 'Build Freestyle', reps: '4x100m', category: 'stroke' },
    ]},
  ];
  var s = sets[Math.floor(rand() * sets.length)];
  return { label: label, modality: 'TECHNIQUE', config: s.config, exercises: s.exercises };
}

function buildIntervalSet(exercises, rand, label) {
  var dists = ['25m', '50m', '100m'];
  var dist = dists[Math.floor(rand() * dists.length)];
  var reps = dist === '25m' ? [8,10,12] : dist === '50m' ? [6,8,10] : [4,6,8];
  var rep = reps[Math.floor(rand() * reps.length)];
  var restOpts = dist === '25m' ? ['20s','30s'] : dist === '50m' ? ['30s','45s','1:00'] : ['45s','1:00','1:30'];
  var rest = restOpts[Math.floor(rand() * restOpts.length)];
  var strokes = ['Freestyle', 'Backstroke', 'IM'];
  var stroke = strokes[Math.floor(rand() * strokes.length)];

  return {
    label: label,
    modality: 'INTERVALS',
    config: rep + 'x' + dist + ' @ Rest ' + rest,
    exercises: [
      { name: stroke, reps: rep + 'x' + dist, category: 'stroke' },
      { name: 'Rest', reps: rest + ' between reps', category: 'rest' },
    ]
  };
}

function generateSwimWorkout(exercisePool, seed, variantNum, recentExercises, userSettings) {
  var rand = seededRand(seed + '-swim-v' + (variantNum || 1));
  var blockCount = (userSettings && userSettings.blockCount) || 2;

  var warmup = buildSwimWarmup(rand);
  var cooldown = buildSwimCooldown(rand);

  // Determine session type (random or from settings)
  var sessionTypes = ['sprint', 'endurance', 'technique', 'intervals'];
  var labels = ['A', 'B', 'C', 'D'].slice(0, blockCount);
  var blocks = [];

  labels.forEach(function(label, i) {
    var type = sessionTypes[Math.floor(rand() * sessionTypes.length)];
    // Try to vary: don't repeat same type
    if (i > 0 && blocks[i-1]) {
      var prev = blocks[i-1].modality;
      var attempts = 0;
      while (type.toUpperCase() === prev && attempts < 5) {
        type = sessionTypes[Math.floor(rand() * sessionTypes.length)];
        attempts++;
      }
    }

    if (type === 'sprint') blocks.push(buildSprintSet(exercisePool, rand, label));
    else if (type === 'endurance') blocks.push(buildEnduranceSet(exercisePool, rand, label));
    else if (type === 'technique') blocks.push(buildTechniqueSet(exercisePool, rand, label));
    else blocks.push(buildIntervalSet(exercisePool, rand, label));
  });

  // Add cooldown as last block
  blocks.push(cooldown);

  var pattern = 'WU+' + labels.join('') + '+CD';
  return { warmup: warmup, blocks: blocks, pattern: pattern };
}

module.exports = { generateSwimWorkout: generateSwimWorkout };
