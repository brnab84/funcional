// Subscription plans — single source of truth for coach athlete limits.
const PLAN_LIMITS = { free: 3, pro: 25, studio: Infinity };

function athleteLimitFor(plan) {
  var l = PLAN_LIMITS[plan];
  return l === undefined ? PLAN_LIMITS.free : l;
}

// JSON-safe limit (Infinity -> null = unlimited)
function planLimitJson(plan) {
  var l = athleteLimitFor(plan);
  return l === Infinity ? null : l;
}

module.exports = { PLAN_LIMITS, athleteLimitFor, planLimitJson };
