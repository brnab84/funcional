const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

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

const startServer = () => {
  // Listen on 0.0.0.0 so Railway can reach it
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Functional Workouts running on port ${PORT}`);
  });
};

if (!MONGO_URI) {
  console.error('ERROR: MONGO_URI not set');
  startServer();
} else {
  mongoose.connect(MONGO_URI)
    .then(async () => {
      console.log('MongoDB connected');
      const ExerciseLibrary = require('./models/ExerciseLibrary');
      const count = await ExerciseLibrary.countDocuments();
      if (count === 0) console.log('Exercise library empty - hit POST /api/exercises/seed');
      startServer();
    })
    .catch(err => {
      console.error('MongoDB error:', err.message);
      startServer();
    });
}
