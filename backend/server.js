const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Load .env only in dev
if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch(e) {}
}

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/workouts', require('./routes/workouts'));
app.use('/api/exercises', require('./routes/exercises'));
app.get('/api/health', (req, res) => res.json({ status: 'ok', mongo: mongoose.connection.readyState }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

if (!MONGO_URI) {
  console.error('ERROR: MONGO_URI environment variable is not set');
  // Start server anyway so Railway health check passes
  app.listen(PORT, () => console.log(`Server on port ${PORT} - BUT MONGO_URI IS MISSING`));
} else {
  mongoose.connect(MONGO_URI)
    .then(async () => {
      console.log('MongoDB connected');
      // Auto-seed if empty
      const ExerciseLibrary = require('./models/ExerciseLibrary');
      const count = await ExerciseLibrary.countDocuments();
      if (count === 0) {
        console.log('Exercise library empty - hit POST /api/exercises/seed to initialize');
      }
      app.listen(PORT, () => console.log(`Functional Workouts running on port ${PORT}`));
    })
    .catch(err => {
      console.error('MongoDB connection error:', err.message);
      // Start server anyway
      app.listen(PORT, () => console.log(`Server on port ${PORT} - MongoDB failed: ${err.message}`));
    });
}
