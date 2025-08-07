require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sql = require('mssql');

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '12345678',
  server: process.env.DB_SERVER || 'DESKTOP-4T15CKL',   // Just machine name
  database: process.env.DB_NAME || 'TaskManagementSystem',
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    instanceName: 'SQLEXPRESS02'   // <-- ADD THIS
  }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then(pool => {
    console.log('Connected to SQL Server');
    return pool;
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });

sql.on('error', err => {
  console.error('SQL error:', err.message);
});

app.locals.poolPromise = poolPromise; // Attach poolPromise to app.locals

// Import routes
const userRoutes = require('./userRoutes');
const projectRoutes = require('./projectRoutes');
const taskRoutes = require('./taskRoutes');
const notificationsRoutes = require('./notifications');
const projectViewsRoutes = require('./projectviews');
const taskHistoryRoutes = require('./taskHistoryRoutes');
const userViewsRoutes = require('./user-views');
const milestoneRoutes = require('./milestones');
const userAchievementsRoutes = require('./user_achievements'); // Import user_achievements.js
const kanbanBoardRoutes = require('./kanban-board'); // Import kanban-board.js

// Register routes
app.use('/api/users', (req, res, next) => {
  req.poolPromise = poolPromise;
  next();
}, userRoutes);

app.use('/api/projects', (req, res, next) => {
  req.poolPromise = poolPromise;
  next();
}, projectRoutes);

app.use('/api/tasks', (req, res, next) => {
  req.poolPromise = poolPromise;
  next();
}, taskRoutes);

app.use('/api/notifications', (req, res, next) => {
  req.poolPromise = poolPromise;
  next();
}, notificationsRoutes);

app.use('/api/project-views', (req, res, next) => {
  req.poolPromise = poolPromise;
  next();
}, projectViewsRoutes);

app.use('/api/task-history', (req, res, next) => {
  req.poolPromise = poolPromise;
  next();
}, taskHistoryRoutes);

app.use('/api/user-views', (req, res, next) => {
  req.poolPromise = poolPromise;
  next();
}, userViewsRoutes);

app.use('/api/milestones', (req, res, next) => {
  req.poolPromise = poolPromise;
  next();
}, milestoneRoutes);

app.use('/api/user-achievements', (req, res, next) => {
  req.poolPromise = poolPromise;
  next();
}, userAchievementsRoutes); // Register user_achievements.js

app.use('/api/kanban', (req, res, next) => {
  req.poolPromise = poolPromise;
  next();
}, kanbanBoardRoutes); // Register kanban-board.js

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
