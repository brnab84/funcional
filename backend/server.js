const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const pkg = require('../package.json');
if (process.env.NODE_ENV !== 'production') { try { require('dotenv').config(); } catch(e) {} }
const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/workouts', require('./routes/workouts'));
app.use('/api/exercises', require('./routes/exercises'));
app.use('/api/upload', require('./routes/upload'));
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: pkg.version, mongo: mongoose.connection.readyState }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));
const startServer = () => app.listen(PORT, '0.0.0.0', () => console.log('Functional Workouts v' + pkg.version + ' on port ' + PORT));
if (!MONGO_URI) { console.error('MONGO_URI not set'); startServer(); }
else {
  mongoose.connect(MONGO_URI)
    .then(() => { console.log('MongoDB connected'); startServer(); })
    .catch(err => { console.error('MongoDB error:', err.message); startServer(); });
}
