require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db/pool');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || true,
    credentials: false,
  })
);
app.use(express.json());

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/projects', require('./routes/projects'));
app.use('/projects/:id/tasks', require('./routes/tasks'));
app.use('/dashboard', require('./routes/dashboard'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Init DB schema and start
async function start() {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('Database schema initialized');
  } catch (err) {
    console.error('Schema init error:', err.message);
  }

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start();
