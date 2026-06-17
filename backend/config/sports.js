// Central sport registry — single source of truth for everything sport-specific.
// Adding a new sport = add one entry here (+ optionally a generator and seed).
const SPORTS = {
  functional: {
    label: 'Functional', icon: '⚡', accent: '#f5c518', themeClass: 'sport-functional',
    title: 'FUNCTIONAL WOD', todayTitle: "TODAY'S WOD", themeColor: '#0d0f12',
    categories: ['lower', 'upper', 'core', 'conditioning', 'power'],
    modalities: ['EMOM', 'OTM', 'AMRAP', 'ROUNDS', 'FOR TIME', 'TABATA'],
    generator: 'functional',
    adminOnly: false
  },
  swimming: {
    label: 'Swimming', icon: '🏊', accent: '#00b4d8', themeClass: 'sport-swimming',
    title: 'SWIM SESSION', todayTitle: "TODAY'S SESSION", themeColor: '#071a2e',
    categories: ['stroke', 'kick', 'drill', 'pull', 'sprint', 'endurance', 'rest'],
    modalities: ['A1-A2', 'A2-A3', 'A3 SPRINT', 'A3 QUEBRADO', 'TECHNIQUE', 'ENDURANCE', 'PROGRESSIVE', 'DESCENDING', 'INTERVALS', 'RECOVERY'],
    generator: 'swim',
    adminOnly: false
  },
  strong: {
    label: 'Strong', icon: '🏋️', accent: '#e63946', themeClass: 'sport-strong',
    title: 'STRONG', todayTitle: "TODAY'S LIFT", themeColor: '#120d0e',
    categories: ['squat', 'hinge', 'push', 'pull', 'olympic', 'accessory', 'core'],
    modalities: ['STRENGTH', '5x5', '3x8', 'PYRAMID', 'DROP SET', 'SUPERSET', 'EMOM', 'TEMPO'],
    generator: 'strong',
    adminOnly: true
  }
};

const DEFAULT_SPORT = 'functional';

function listSports() { return Object.keys(SPORTS); }
function sportMeta(sport) { return SPORTS[sport] || SPORTS[DEFAULT_SPORT]; }

function canUseSport(sport, user) {
  const m = SPORTS[sport];
  if (!m) return false;
  if (!m.adminOnly) return true;
  if (user && user.role === 'admin') return true;
  if (user && Array.isArray(user.extraSports) && user.extraSports.indexOf(sport) >= 0) return true;
  return false;
}

// Admin-only sport keys (the ones that can be granted per user)
function adminOnlySports() {
  return listSports().filter(function (s) { return SPORTS[s].adminOnly; });
}

function availableSports(user) {
  return listSports().filter(function (s) { return canUseSport(s, user); });
}

// Role-safe view for the frontend (only sports the user can use)
function publicSports(user) {
  return availableSports(user).map(function (key) {
    const m = SPORTS[key];
    return {
      key: key, label: m.label, icon: m.icon, accent: m.accent, themeClass: m.themeClass,
      title: m.title, todayTitle: m.todayTitle, themeColor: m.themeColor,
      categories: m.categories, modalities: m.modalities
    };
  });
}

module.exports = { SPORTS, DEFAULT_SPORT, listSports, sportMeta, canUseSport, availableSports, publicSports, adminOnlySports };
