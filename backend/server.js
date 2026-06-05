require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.use('/api/workouts', require('./routes/workouts'));
app.use('/api/exercises', require('./routes/exercises'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Frontend fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    
    // Auto-seed exercises if empty
    const ExerciseLibrary = require('./models/ExerciseLibrary');
    const count = await ExerciseLibrary.countDocuments();
    if (count === 0) {
      const { default: fetch } = await import('node-fetch').catch(() => ({ default: global.fetch }));
      // Trigger seed via internal
      const exercises = require('./routes/exercises');
      console.log('No exercises found - POST /api/exercises/seed to initialize');
    }
    
    app.listen(PORT, () => {
      console.log(`Functional Workouts running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
