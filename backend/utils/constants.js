// Shared constants — now derived from the central sport registry (config/sports.js)
// so categories/modalities live in one place. Exports below are unchanged.
const { SPORTS } = require('../config/sports');

const CATEGORIES = {};
const MODALITIES = {};
Object.keys(SPORTS).forEach(function (s) {
  CATEGORIES[s] = SPORTS[s].categories;
  MODALITIES[s] = SPORTS[s].modalities;
});

const WORKOUT_SOURCES = ['local', 'ai', 'manual', 'imported'];

function categoriesFor(sport) { return CATEGORIES[sport] || CATEGORIES.functional; }
function modalitiesFor(sport) { return MODALITIES[sport] || MODALITIES.functional; }

module.exports = { CATEGORIES, MODALITIES, WORKOUT_SOURCES, categoriesFor, modalitiesFor };
