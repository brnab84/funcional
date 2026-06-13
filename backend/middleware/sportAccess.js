// Blocks a request whose `sport` (query or body) the user is not allowed to use
// (e.g. admin-only sports). Must run AFTER the auth middleware (needs req.user).
// No-op for sports everyone can use, so existing flows are unaffected.
const { canUseSport } = require('../config/sports');

module.exports = function sportAccess(req, res, next) {
  const sport = (req.query && req.query.sport) || (req.body && req.body.sport);
  if (sport && !canUseSport(sport, req.user)) {
    return res.status(403).json({ message: 'This sport is not available on your account.' });
  }
  next();
};
