// Shared constants — single source of truth for sport-specific data.
const CATEGORIES = {
  functional: ['lower', 'upper', 'core', 'conditioning', 'power'],
  swimming: ['stroke', 'kick', 'drill', 'pull', 'sprint', 'endurance', 'rest']
};

const MODALITIES = {
  functional: ['EMOM', 'OTM', 'AMRAP', 'ROUNDS', 'FOR TIME', 'TABATA'],
  swimming: ['A1-A2', 'A2-A3', 'A3 SPRINT', 'A3 QUEBRADO', 'TECHNIQUE', 'ENDURANCE', 'PROGRESSIVE', 'DESCENDING', 'INTERVALS', 'RECOVERY']
};

const WORKOUT_SOURCES = ['local', 'ai', 'manual', 'imported'];

function categoriesFor(sport) { return CATEGORIES[sport] || CATEGORIES.functional; }
function modalitiesFor(sport) { return MODALITIES[sport] || MODALITIES.functional; }

module.exports = { CATEGORIES, MODALITIES, WORKOUT_SOURCES, categoriesFor, modalitiesFor };
