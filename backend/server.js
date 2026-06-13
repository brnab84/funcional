const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pkg = require('../package.json');

if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch (e) { /* dotenv optional in dev */ }
}

// ── Environment validation ──────────────────────────
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const VERSION = pkg.version;

const warnings = [];
if (!MONGO_URI) warnings.push('MONGO_URI not set — database features will fail');
if (!JWT_SECRET) warnings.push('JWT_SECRET not set — using insecure fallback (set this in production!)');
if (!process.env.ANTHROPIC_API_KEY) warnings.push('ANTHROPIC_API_KEY not set — AI features disabled');
if (warnings.length) warnings.forEach(w => console.warn('[CONFIG WARNING]', w));

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security middleware ─────────────────────────────
// Helmet with CSP disabled (app uses inline handlers + CDN scripts + PWA)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
}));

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// ── Rate limiting ───────────────────────────────────
// General API limit: 300 requests / 15 min per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' }
});

// Stricter limit for auth (prevent brute force): 20 / 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later' }
});

// ── Static files with no-cache ──────────────────────
app.use(express.static(path.join(__dirname, '../frontend'), {
  setHeaders: function (res, filePath) {
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// ── API routes ──────────────────────────────────────
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/workouts', apiLimiter, require('./routes/workouts'));
app.use('/api/exercises', apiLimiter, require('./routes/exercises'));
app.use('/api/upload', apiLimiter, require('./routes/upload'));
app.use('/api/admin', apiLimiter, require('./routes/admin'));
app.use('/api/coach', apiLimiter, require('./routes/coach'));
app.use('/api/sports', apiLimiter, require('./routes/sports'));
app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  version: VERSION,
  mongo: mongoose.connection.readyState
}));

// ── Landing page (marketing) — separate link from the app ───
// App stays at "/". Landing lives at "/inicio". Self-contained HTML.
app.get('/inicio', (req, res) => {
  const landingPath = path.join(__dirname, '../frontend/landing.html');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(landingPath, (err) => { if (err) res.status(500).send('Error loading landing'); });
});

// ── Serve index.html with version-busted URLs ───────
app.get('*', (req, res) => {
  const htmlPath = path.join(__dirname, '../frontend/index.html');
  fs.readFile(htmlPath, 'utf8', (err, html) => {
    if (err) return res.status(500).send('Error loading app');
    let versioned = html.replace('/sw.js', '/sw.js?v=' + VERSION);
    // Cache-bust all js and css module files
    versioned = versioned.replace(/\/js\/([\w.-]+)"/g, '/js/$1?v=' + VERSION + '"');
    versioned = versioned.replace(/\/css\/([\w.-]+)"/g, '/css/$1?v=' + VERSION + '"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(versioned);
  });
});

// ── Centralized error handler ───────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// ── Startup ─────────────────────────────────────────
const startServer = () => app.listen(PORT, '0.0.0.0', () =>
  console.log('Functional Workouts v' + VERSION + ' on port ' + PORT));

if (!MONGO_URI) {
  console.error('Starting without database (MONGO_URI missing)');
  startServer();
} else {
  mongoose.connect(MONGO_URI)
    .then(() => { console.log('MongoDB connected'); startServer(); })
    .catch(err => { console.error('MongoDB error:', err.message); startServer(); });
}



