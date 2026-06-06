const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const pkg = require('../package.json');

if (process.env.NODE_ENV !== 'production') { try { require('dotenv').config(); } catch(e) {} }

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const VERSION = pkg.version;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Static files with no-cache
app.use(express.static(path.join(__dirname, '../frontend'), {
  setHeaders: function(res, filePath) {
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/workouts', require('./routes/workouts'));
app.use('/api/exercises', require('./routes/exercises'));
app.use('/api/upload', require('./routes/upload'));
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: VERSION, mongo: mongoose.connection.readyState }));

// Serve index.html with version-busted CSS/JS URLs
app.get('*', (req, res) => {
  const htmlPath = path.join(__dirname, '../frontend/index.html');
  fs.readFile(htmlPath, 'utf8', (err, html) => {
    if (err) return res.status(500).send('Error loading app');
    // Inject version query params to bust cache
    const versioned = html
      .replace('/styles.css"', '/styles.css?v=' + VERSION + '"')
      .replace('/app.js"', '/app.js?v=' + VERSION + '"')
      .replace('/sw.js', '/sw.js?v=' + VERSION);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(versioned);
  });
});

const startServer = () => app.listen(PORT, '0.0.0.0', () => console.log('Functional Workouts v' + VERSION + ' on port ' + PORT));
if (!MONGO_URI) { console.error('MONGO_URI not set'); startServer(); }
else {
  mongoose.connect(MONGO_URI)
    .then(() => { console.log('MongoDB connected'); startServer(); })
    .catch(err => { console.error('MongoDB error:', err.message); startServer(); });
}
