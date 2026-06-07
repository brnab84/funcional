// Swimming Generator v7 — based on real coaching patterns
// Zones: A1 (easy aerobic), A2 (threshold), A3 (VO2max/speed)
// Equipment: Aletas (fins), Manoplas (paddles), Snorkel

function seededRand(seed) {
  var s = 0;
  for (var i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return function() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function shuffle(arr, rand) {
  var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a;
}
function pick(arr, rand) { return arr[Math.floor(rand() * arr.length)]; }
function pd(m, pool) { pool = pool || 25; return Math.max(pool, Math.round(m / pool) * pool); }
function fd(reps, dist, pool) { var d = pd(dist, pool); return reps > 1 ? reps + 'x' + d + 'm' : d + 'm'; }
function fmtRest(sec) { if (sec < 60) return sec + "''"; var m = Math.floor(sec / 60), s = sec % 60; return s > 0 ? m + ':' + String(s).padStart(2, '0') : m + ':00'; }
function getRestSec(dist, s) { var t = (s && s.swimRestTimes) || {}; var d = parseInt(dist) || 50; if (d <= 50) return t.d50 || 30; if (d <= 100) return t.d100 || 45; if (d <= 200) return t.d200 || 60; if (d <= 300) return t.d300 || 75; if (d <= 400) return t.d400 || 90; return t.d500 || 120; }

// ── SESSION TEMPLATES based on real coaching data ──

function buildWarmup(rand, p) {
  var warmups = [
    // Pattern: fins + mixed strokes
    function() { return [
      { name: 'Aletas (75 Crol + 25 Espalda)', reps: fd(5, 200, p), category: 'stroke' },
      { name: 'Patada Cambiando Posiciones', reps: fd(2, 200, p), category: 'kick' },
    ];},
    // Pattern: fins + drill
    function() { return [
      { name: 'Aletas (75 Crol + 25 Drill)', reps: fd(3, 100, p), category: 'drill' },
      { name: 'Nado Prog 1-4', reps: fd(4, 50, p) + ' c/1:10', category: 'stroke' },
      { name: 'Manoplas Aletas (75 Crol + 25 Remadas)', reps: fd(3, 100, p), category: 'pull' },
      { name: 'Nado Prog 1-4', reps: fd(4, 50, p) + ' c/1:10', category: 'stroke' },
    ];},
    // Pattern: mixed strokes warmup
    function() { return [
      { name: 'Crol - Espalda - Crol - Pecho', reps: fd(1, 200, p), category: 'stroke' },
      { name: 'Aletas Amplitud', reps: fd(3, 300, p), category: 'stroke' },
    ];},
    // Pattern: fins kick/swim
    function() { return [
      { name: 'Aletas (25 Patada + 75 Crol resp c/3 + 25 Espalda)', reps: fd(1, 500, p), category: 'stroke' },
    ];},
    // Pattern: progressive warmup
    function() { return [
      { name: 'Aletas Prog 1-3 Nado Amplitud', reps: fd(3, 200, p) + " c/30''", category: 'stroke' },
    ];},
  ];
  return { rounds: 1, exercises: pick(warmups, rand)() };
}

function buildAerobicSet(rand, label, p, settings) {
  // A1-A2 aerobic work - longer distances, moderate intensity
  var rest100 = fmtRest(getRestSec(100, settings));
  var rest50 = fmtRest(getRestSec(50, settings));
  var sets = [
    // 20x50 pattern
    function() { return { modality: 'A1-A2', config: fd(20, 50, p) + ' Crol (3xA1 + 2xA2) c/1:10', exercises: [
      { name: 'Nado Crol A1', reps: fd(12, 50, p) + ' c/1:10', category: 'stroke' },
      { name: 'Nado Crol A2', reps: fd(8, 50, p) + ' c/1:10', category: 'stroke' },
    ]};},
    // 10x100 with fins/paddles progressive
    function() { return { modality: 'PROGRESSIVE', config: fd(10, 100, p) + ' Aletas Manoplas Prog 4-3-2-1', exercises: [
      { name: 'Aletas Manoplas Crol A1', reps: fd(4, 100, p) + ' c/1:50', category: 'pull' },
      { name: 'Aletas Manoplas Crol A1-A2', reps: fd(3, 100, p) + ' c/1:50', category: 'pull' },
      { name: 'Aletas Manoplas Crol A2', reps: fd(2, 100, p) + ' c/1:50', category: 'pull' },
      { name: 'Aletas Manoplas Crol A2-A3', reps: fd(1, 100, p) + ' c/1:50', category: 'pull' },
    ]};},
    // 16x50 pattern
    function() { return { modality: 'A1-A2', config: fd(16, 50, p) + ' Crol (3xA1 + 1xA2) c/1:10', exercises: [
      { name: 'Nado Crol A1', reps: fd(12, 50, p) + ' c/1:10', category: 'stroke' },
      { name: 'Nado Crol A2', reps: fd(4, 50, p) + ' c/1:10', category: 'stroke' },
    ]};},
    // Descending fins sets
    function() { return { modality: 'DESCENDING', config: 'Aletas Crol A1 Descendente', exercises: [
      { name: 'Aletas Crol A1', reps: fd(3, 100, p) + ' c/1:50', category: 'stroke' },
      { name: 'MAX Nado', reps: fd(2, 50, p) + ' c/1:20', category: 'sprint' },
      { name: 'Aletas Crol A1', reps: fd(2, 100, p) + ' c/1:55', category: 'stroke' },
      { name: 'MAX Nado', reps: fd(2, 50, p) + ' c/1:20', category: 'sprint' },
      { name: 'Aletas Crol A1', reps: fd(1, 100, p) + ' c/2:00', category: 'stroke' },
      { name: 'MAX + Suave', reps: pd(25, p) + 'm MAX + ' + pd(75, p) + 'm suave', category: 'sprint' },
    ]};},
  ];
  var s = pick(sets, rand)();
  return { label: label, modality: s.modality, config: s.config, exercises: s.exercises };
}

function buildSpeedSet(rand, label, p, settings) {
  // A3 speed work - short distances, high intensity, more rest
  var sets = [
    // Broken set (QUEBRADO)
    function() { return { modality: 'A3 QUEBRADO', config: '4 series de 100m quebrado MAX', exercises: [
      { name: '1ra: 4x' + pd(25, p) + 'm MAX', reps: 'c/1:00', category: 'sprint' },
      { name: '2da: ' + pd(25, p) + 'm + ' + pd(50, p) + 'm + ' + pd(25, p) + 'm MAX', reps: 'c/1:00-1:30', category: 'sprint' },
      { name: '3ra: 2x' + pd(50, p) + 'm MAX', reps: 'c/1:30', category: 'sprint' },
      { name: '4ta: ' + pd(50, p) + 'm + 2x' + pd(25, p) + 'm MAX', reps: 'c/1:00-1:30', category: 'sprint' },
      { name: 'Entre series: 2x' + pd(100, p) + 'm Manoplas Aletas A1', reps: "c/20''", category: 'pull' },
    ]};},
    // Progressive 50s
    function() { return { modality: 'A3 SPRINT', config: fd(8, 50, p) + ' Progresando', exercises: [
      { name: 'Nado Crol Progresivo 1-4', reps: fd(4, 50, p) + " c/15''", category: 'sprint' },
      { name: 'Aletas Sprint ' + pd(25, p) + 'm + Suave ' + pd(75, p) + 'm', reps: fd(1, 100, p), category: 'sprint' },
      { name: 'Nado Crol Progresivo 1-4', reps: fd(4, 50, p) + " c/15''", category: 'sprint' },
    ]};},
    // 100m speed with paddles/fins between
    function() { return { modality: 'A2-A3', config: '3x100 Prog A2-A3 + Manoplas', exercises: [
      { name: 'Nado Crol Prog 1-3 (A2 a A3)', reps: fd(3, 100, p) + " c/30-40''", category: 'stroke' },
      { name: 'Manoplas Serie 1: 2xA2 + 1xA3', reps: fd(3, 50, p), category: 'pull' },
      { name: 'Manoplas Serie 2: 1xA2 + 2xA3', reps: fd(3, 50, p), category: 'pull' },
      { name: 'Manoplas Serie 3: 3xA3', reps: fd(3, 50, p), category: 'pull' },
    ]};},
    // Sprint + recovery pattern
    function() { return { modality: 'A3 SPRINT', config: fd(6, 50, p) + ' MAX + recuperación', exercises: [
      { name: 'MAX Nado Crol', reps: fd(6, 50, p) + ' c/1:20', category: 'sprint' },
      { name: 'Entre pares: ' + pd(50, p) + 'm Suave', reps: '', category: 'stroke' },
    ]};},
  ];
  var s = pick(sets, rand)();
  return { label: label, modality: s.modality, config: s.config, exercises: s.exercises };
}

function buildTechniqueSet(rand, label, p) {
  // Drill/technique focus
  var drills = ['Codos Altos', 'Terminar Brazada Atrás', 'Relajar Cuello', 'Salidas de Pared', 'Remadas', 'Catch-up', 'Fingertip Drag'];
  var d1 = pick(drills, rand), d2 = pick(drills, rand);
  var sets = [
    // Drill focus day
    function() { return { modality: 'TECHNIQUE', config: 'Drills + Técnica', exercises: [
      { name: 'Drills Ejercicios', reps: fd(6, 50, p), category: 'drill' },
      { name: 'Nado Foco: ' + d1, reps: fd(3, 100, p) + " c/20''", category: 'stroke' },
      { name: 'Nado Foco: ' + d2, reps: fd(3, 100, p) + " c/20''", category: 'stroke' },
    ]};},
    // Fins amplitude + drills
    function() { return { modality: 'TECHNIQUE', config: 'Aletas Amplitud + Drill', exercises: [
      { name: 'Aletas Amplitud (Snorkel opcional)', reps: fd(3, 300, p), category: 'stroke' },
      { name: 'Ejercicios Drills', reps: fd(6, 50, p), category: 'drill' },
      { name: 'Sprint + Nado Pensando Técnica', reps: fd(3, 100, p) + " (25 Sprint + 75 Técnica) c/20''", category: 'sprint' },
    ]};},
    // Kick + drill combo
    function() { return { modality: 'TECHNIQUE', config: 'Patada + Drill + Técnica', exercises: [
      { name: 'Aletas Doble Espalda + Crol resp c/3 + Remadas', reps: fd(1, 300, p), category: 'drill' },
      { name: 'Nado Crol Foco Técnica', reps: fd(4, 50, p) + " c/15'' Prog 1-4", category: 'stroke' },
      { name: 'Aletas Sprint ' + pd(25, p) + 'm + ' + pd(75, p) + 'm Suave', reps: fd(1, 100, p), category: 'sprint' },
    ]};},
  ];
  var s = pick(sets, rand)();
  return { label: label, modality: s.modality, config: s.config, exercises: s.exercises };
}

function buildEnduranceSet(rand, label, p, settings) {
  var rest = fmtRest(getRestSec(100, settings));
  var sets = [
    function() { return { modality: 'ENDURANCE', config: 'Series largas A1-A2', exercises: [
      { name: 'Aletas Prog 1-3 Nado Amplitud', reps: fd(3, 200, p) + " c/30''", category: 'stroke' },
      { name: 'Nado Crol Prog 1-3 (A2-A3)', reps: fd(3, 100, p) + " c/30-40''", category: 'stroke' },
    ]};},
    function() { return { modality: 'ENDURANCE', config: fd(4, 100, p) + ' Crol + ' + fd(4, 100, p) + ' Pull', exercises: [
      { name: 'Nado Crol A1-A2', reps: fd(4, 100, p) + " c/20-30''", category: 'stroke' },
      { name: 'Manoplas Aletas Crol', reps: fd(4, 100, p) + " c/20''", category: 'pull' },
    ]};},
    function() { return { modality: 'ENDURANCE', config: 'Pyramid Aletas', exercises: [
      { name: 'Aletas Crol', reps: pd(200, p) + 'm + ' + pd(300, p) + 'm + ' + pd(400, p) + 'm + ' + pd(300, p) + 'm + ' + pd(200, p) + 'm', category: 'stroke' },
      { name: 'Descanso entre cada', reps: rest, category: 'rest' },
    ]};},
  ];
  var s = pick(sets, rand)();
  return { label: label, modality: s.modality, config: s.config, exercises: s.exercises };
}

function buildCooldown(rand, p) {
  var opts = [
    [{ name: 'Recuperar a gusto', reps: fd(1, 200, p), category: 'stroke' }],
    [{ name: 'Suaves', reps: fd(1, 150, p), category: 'stroke' }],
    [{ name: 'Aletas Patada + Nado Suave', reps: fd(1, 300, p) + ' (50 Patada + 50 Nado)', category: 'kick' }],
    [{ name: 'Suaves', reps: fd(1, 100, p), category: 'stroke' }],
  ];
  return { label: 'Cool-down', modality: 'RECOVERY', config: 'A gusto', exercises: pick(opts, rand) };
}

// ── SESSION TYPES based on real training programs ──
var SESSION_TYPES = [
  { name: 'A1-A2', builders: ['aerobic', 'aerobic'] },
  { name: 'A1-A3', builders: ['aerobic', 'speed'] },
  { name: 'A2-A3', builders: ['speed', 'speed'] },
  { name: 'Técnica-Velocidad', builders: ['technique', 'speed'] },
  { name: 'A1-A2-A3', builders: ['aerobic', 'speed', 'endurance'] },
  { name: 'Endurance', builders: ['endurance', 'aerobic'] },
  { name: 'Técnica', builders: ['technique', 'technique'] },
];

function generateSwimWorkout(exercisePool, seed, variantNum, recentExercises, userSettings, approvedMods) {
  var rand = seededRand(seed + '-swim-v' + (variantNum || 1));
  var blockCount = (userSettings && userSettings.blockCount) || 2;
  var pool = (userSettings && userSettings.poolLength) || 25;
  approvedMods = approvedMods || [];

  // Pick session type — weight by approved history
  var typePool = SESSION_TYPES.slice();
  if (approvedMods.length > 0) {
    approvedMods.forEach(function(m) {
      m = (m || '').toUpperCase();
      if (m.includes('A1')) typePool.push(SESSION_TYPES[0], SESSION_TYPES[1]);
      if (m.includes('A3') || m.includes('SPRINT') || m.includes('QUEBRADO')) typePool.push(SESSION_TYPES[1], SESSION_TYPES[2]);
      if (m.includes('TECH')) typePool.push(SESSION_TYPES[3], SESSION_TYPES[6]);
      if (m.includes('ENDUR')) typePool.push(SESSION_TYPES[5]);
    });
  }
  var session = pick(typePool, rand);

  var warmup = buildWarmup(rand, pool);
  var labels = ['A', 'B', 'C', 'D'].slice(0, blockCount);
  var blocks = [];

  labels.forEach(function(label, i) {
    var builderName = session.builders[i % session.builders.length];
    if (builderName === 'aerobic') blocks.push(buildAerobicSet(rand, label, pool, userSettings));
    else if (builderName === 'speed') blocks.push(buildSpeedSet(rand, label, pool, userSettings));
    else if (builderName === 'technique') blocks.push(buildTechniqueSet(rand, label, pool));
    else if (builderName === 'endurance') blocks.push(buildEnduranceSet(rand, label, pool, userSettings));
    else blocks.push(buildAerobicSet(rand, label, pool, userSettings));
  });

  blocks.push(buildCooldown(rand, pool));
  return { warmup: warmup, blocks: blocks, pattern: session.name };
}

module.exports = { generateSwimWorkout: generateSwimWorkout };
