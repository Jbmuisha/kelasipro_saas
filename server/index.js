const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const schoolsRoutes = require('./routes/schools');
const classesRoutes = require('./routes/classes');
const teachersRoutes = require('./routes/teachers');
const coursesRoutes = require('./routes/courses');
const gradesRoutes = require('./routes/grades');
const messagesRoutes = require('./routes/messages');
const schedulesRoutes = require('./routes/schedules');
const uploadsRoutes = require('./routes/uploads');
const subscriptionsRoutes = require('./routes/subscriptions');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/schools', schoolsRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/grades', gradesRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Kelasipro API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message, err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Kelasipro server running on port ${PORT}`);
});

module.exports = app;