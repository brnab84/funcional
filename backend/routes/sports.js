const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { publicSports } = require('../config/sports');

// GET /api/sports — the sports this user can use (role-filtered)
router.get('/', auth, function (req, res) {
  res.json({ sports: publicSports(req.user) });
});

module.exports = router;
