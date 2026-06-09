// Coach-only middleware. Must run AFTER the auth middleware (needs req.user).
// Admins are allowed through too (they can act as coaches).
module.exports = function coachOnly(req, res, next) {
  if (!req.user || (req.user.role !== 'coach' && req.user.role !== 'admin')) {
    return res.status(403).json({ message: 'Coach access required' });
  }
  next();
};
