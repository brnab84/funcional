// Workout Generator - Based on real gym patterns
// Patterns extracted from whiteboard photos

const WARMUP_EXERCISES = [
  { name: 'Jumping Jacks', category: 'conditioning' },
  { name: 'Air Squats', category: 'lower' },
  { name: 'Mountain Climbers', category: 'core' },
  { name: 'Sprawl', category: 'conditioning' },
  { name: 'Shoulder Taps', category: 'upper' },
  { name: 'Sit Up', category: 'core' },
  { name: 'Push Up', category: 'upper' },
  { name: 'Abs Crunch', category: 'core' },
  { name: 'Abs Bike', category: 'core' },
  { name: 'Plank Get Up', category: 'core' },
  { name: 'Walking Kicks (W.K)', category: 'lower' },
  { name: 'Espinales', category: 'lower' },
  { name: 'Abs Ball', category: 'core' },
  { name: 'Climbers', category: 'conditioning' },
  { name: 'Jump Rope', category: 'conditioning' },
];

const WARMUP_REPS = {
  conditioning: ['20', '25', '30', '50'],
  lower: ['10', '15', '20'],
  upper: ['10', '15', '20'],
  core: ['15', '20', '25', '30'],
};

// Modalities from photos
const MODALITIES = [
  'EMOM',
  'OTM',
  'AMRAP',
  'FOR TIME',       // "A Completar"
  'ROUNDS',
  'TABATA',         // 45x15 or 40x15
  'DESCENDING',     // 21-15-9 or 21-15-12-9
  'ZONES',          // Zona 1, 2, 3
  'MINI AMRAP',
];

function seededRand(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickBalanced(pool, count, rand) {
  const categories = ['lower', 'upper', 'core', 'conditioning', 'power'];
  const selected = [];
  const shuffled = shuffle(pool, rand);
  
  // First pass: one per category
  categories.forEach(cat => {
    if (selected.length >= count) return;
    const ex = shuffled.find(e => e.category === cat && !selected.find(s => s.name === e.name));
    if (ex) selected.push(ex);
  });
  
  // Second pass: fill remaining
  shuffled.forEach(ex => {
    if (selected.length >= count) return;
    if (!selected.find(s => s.name === ex.name)) selected.push(ex);
  });
  
  return selected.slice(0, count);
}

function buildWarmup(rand, rounds) {
  const warmupRounds = rounds || [3, 4, 5, 7][Math.floor(rand() * 4)];
  const shuffled = shuffle(WARMUP_EXERCISES, rand);
  const count = [5, 6, 7][Math.floor(rand() * 3)];
  const exercises = shuffled.slice(0, count).map(ex => {
    const repsOptions = WARMUP_REPS[ex.category] || ['20'];
    return {
      name: ex.name,
      reps: repsOptions[Math.floor(rand() * repsOptions.length)],
      category: ex.category
    };
  });
  return { rounds: warmupRounds, exercises };
}

function buildEMOM(exercises, rand) {
  const minutes = [7, 10, 14, 21][Math.floor(rand() * 4)];
  const count = minutes <= 7 ? 2 : minutes <= 14 ? 3 : 3;
  const selected = pickBalanced(exercises, count, rand);
  return {
    label: 'A',
    modality: 'EMOM',
    config: `${minutes}'`,
    exercises: selected.map(ex => ({
      name: ex.name,
      reps: ['8', '10', '12', '15'][Math.floor(rand() * 4)],
      category: ex.category
    }))
  };
}

function buildOTM(exercises, rand) {
  const interval = [2, 2.5, 3, 4][Math.floor(rand() * 4)];
  const rounds = [5, 6, 7][Math.floor(rand() * 3)];
  const count = [4, 5, 6][Math.floor(rand() * 3)];
  const selected = pickBalanced(exercises, count, rand);
  return {
    label: 'A',
    modality: 'OTM',
    config: `${interval}' — ${rounds} rounds`,
    exercises: selected.map(ex => ({
      name: ex.name,
      reps: ['10', '12', '15', '20', '30'][Math.floor(rand() * 5)],
      category: ex.category
    }))
  };
}

function buildAMRAP(exercises, rand) {
  const minutes = [5, 8, 9, 10, 12][Math.floor(rand() * 5)];
  const count = [4, 5, 6][Math.floor(rand() * 3)];
  const selected = pickBalanced(exercises, count, rand);
  return {
    label: 'A',
    modality: 'AMRAP',
    config: `${minutes}'`,
    exercises: selected.map(ex => ({
      name: ex.name,
      reps: ['8', '10', '12', '15', '20'][Math.floor(rand() * 5)],
      category: ex.category
    }))
  };
}

function buildForTime(exercises, rand) {
  const count = [6, 7, 8, 9][Math.floor(rand() * 4)];
  const selected = pickBalanced(exercises, count, rand);
  const repOptions = ['20', '25', '30', '40', '50', '100', '150', '200'];
  return {
    label: 'A',
    modality: 'FOR TIME',
    config: 'A Completar',
    exercises: selected.map(ex => ({
      name: ex.name,
      reps: repOptions[Math.floor(rand() * repOptions.length)],
      category: ex.category
    }))
  };
}

function buildRounds(exercises, rand) {
  const rounds = [2, 3, 4, 5][Math.floor(rand() * 4)];
  const count = [4, 5, 6][Math.floor(rand() * 3)];
  const selected = pickBalanced(exercises, count, rand);
  return {
    label: 'A',
    modality: 'ROUNDS',
    config: `${rounds} Rounds`,
    exercises: selected.map(ex => ({
      name: ex.name,
      reps: ['10', '15', '20', '30'][Math.floor(rand() * 4)],
      category: ex.category
    }))
  };
}

function buildTabata(exercises, rand) {
  const work = [40, 45][Math.floor(rand() * 2)];
  const rest = [10, 15][Math.floor(rand() * 2)];
  const series = [2, 3][Math.floor(rand() * 2)];
  const count = [7, 8, 9, 10][Math.floor(rand() * 4)];
  const selected = pickBalanced(exercises, count, rand);
  return {
    label: 'A',
    modality: 'TABATA',
    config: `${work}"x${rest}" — ${series} series`,
    exercises: selected.map((ex, i) => ({
      name: ex.name,
      reps: `Station ${i + 1}`,
      category: ex.category
    }))
  };
}

function buildDescending(exercises, rand) {
  const schemes = ['21-15-9', '21-15-12-9', '15-12-9'][Math.floor(rand() * 3)];
  const count = [4, 5][Math.floor(rand() * 2)];
  const selected = pickBalanced(exercises, count, rand);
  return {
    label: 'EC',
    modality: 'DESCENDING',
    config: schemes,
    exercises: selected.map(ex => ({
      name: ex.name,
      reps: schemes.split('-')[0],
      category: ex.category
    }))
  };
}

function buildZones(exercises, rand) {
  const zoneCount = [2, 3][Math.floor(rand() * 2)];
  const blocks = [];
  const usedNames = new Set();
  
  for (let z = 1; z <= zoneCount; z++) {
    const available = exercises.filter(e => !usedNames.has(e.name));
    const count = [2, 3][Math.floor(rand() * 2)];
    const selected = pickBalanced(available, count, rand);
    selected.forEach(e => usedNames.add(e.name));
    blocks.push({
      label: `Zone ${z}`,
      modality: 'ZONES',
      config: `Zona ${z}`,
      exercises: selected.map(ex => ({
        name: ex.name,
        reps: ['10', '10+10', '15'][Math.floor(rand() * 3)],
        category: ex.category
      }))
    });
  }
  return blocks;
}

function buildMiniAmrap(exercises, rand) {
  const stations = [3, 4, 5][Math.floor(rand() * 3)];
  const minutes = 5;
  const blocks = [];
  const shuffled = shuffle(exercises, rand);
  
  for (let s = 1; s <= stations; s++) {
    const start = (s - 1) * 3;
    const exForStation = shuffled.slice(start, start + 3);
    if (exForStation.length === 0) break;
    blocks.push({
      label: `${s}`,
      modality: 'MINI AMRAP',
      config: `${minutes}'`,
      exercises: exForStation.map(ex => ({
        name: ex.name,
        reps: ['5', '8', '10'][Math.floor(rand() * 3)],
        category: ex.category
      }))
    });
  }
  return blocks;
}

function buildMultiBlock(exercises, rand) {
  // Like photos with A + B blocks of different modalities
  const modA = ['EMOM', 'OTM', 'ROUNDS'][Math.floor(rand() * 3)];
  const modB = ['AMRAP', 'FOR TIME', 'ROUNDS'][Math.floor(rand() * 3)];
  
  const half = Math.floor(exercises.length / 2);
  const exA = exercises.slice(0, half);
  const exB = exercises.slice(half);
  
  const blockA = buildBlockByModality(modA, exA, rand);
  blockA.label = 'A';
  
  const blockB = buildBlockByModality(modB, exB, rand);
  blockB.label = 'B';
  
  return [blockA, blockB];
}

function buildBlockByModality(modality, exercises, rand) {
  switch (modality) {
    case 'EMOM': return buildEMOM(exercises, rand);
    case 'OTM': return buildOTM(exercises, rand);
    case 'AMRAP': return buildAMRAP(exercises, rand);
    case 'FOR TIME': return buildForTime(exercises, rand);
    case 'ROUNDS': return buildRounds(exercises, rand);
    case 'TABATA': return buildTabata(exercises, rand);
    default: return buildRounds(exercises, rand);
  }
}

function generateWorkout(exercisePool, seed, variantNum = 1, recentExercises = []) {
  const rand = seededRand(`${seed}-v${variantNum}`);
  
  // Filter out recently used exercises (avoid repeats)
  const recentSet = new Set(recentExercises.map(e => e.toLowerCase()));
  let pool = exercisePool.filter(e => !recentSet.has(e.name.toLowerCase()));
  if (pool.length < 8) pool = exercisePool; // fallback if too few
  
  const warmup = buildWarmup(rand);
  
  // Pick main modality pattern
  const patterns = [
    'single', 'single', 'single',   // more weight to single block
    'multi',                          // A + B
    'tabata',
    'zones',
    'descending',
    'mini_amrap'
  ];
  const pattern = patterns[Math.floor(rand() * patterns.length)];
  
  let blocks = [];
  const shuffledPool = shuffle(pool, rand);
  
  switch (pattern) {
    case 'single': {
      const mods = ['EMOM', 'OTM', 'AMRAP', 'FOR TIME', 'ROUNDS'];
      const mod = mods[Math.floor(rand() * mods.length)];
      const block = buildBlockByModality(mod, shuffledPool, rand);
      block.label = 'A';
      blocks = [block];
      break;
    }
    case 'multi':
      blocks = buildMultiBlock(shuffledPool, rand);
      break;
    case 'tabata':
      blocks = [buildTabata(shuffledPool, rand)];
      break;
    case 'zones':
      blocks = buildZones(shuffledPool, rand);
      break;
    case 'descending': {
      const desc = buildDescending(shuffledPool, rand);
      blocks = [desc];
      break;
    }
    case 'mini_amrap':
      blocks = buildMiniAmrap(shuffledPool, rand);
      break;
    default:
      blocks = [buildRounds(shuffledPool, rand)];
  }
  
  return { warmup, blocks };
}

module.exports = { generateWorkout };
