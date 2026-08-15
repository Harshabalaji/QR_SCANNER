const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { checkDatabaseHealth, initializeSchema } = require('./config/database');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const productsRouter = require('./routes/products');
const salesRouter = require('./routes/sales');
const dashboardRouter = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration (allow frontend at localhost:8081 and localhost dev origins)
const allowedOrigins = ['http://localhost:8081', 'http://127.0.0.1:8081', 'http://localhost:19006'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    callback(null, true); // Fallback: allow for local dev
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (verifies actual MySQL connection)
app.get('/api/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();

  if (dbHealth.connected) {
    return res.json({
      success: true,
      message: 'Store Manager API is running',
      database: 'connected',
      schema: dbHealth.database,
      tablesCount: dbHealth.tables.length,
    });
  } else {
    return res.status(500).json({
      success: false,
      message: 'Store Manager API server running, but database connection failed',
      database: 'disconnected',
      error: dbHealth.error,
    });
  }
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/dashboard', dashboardRouter);

// Centralized 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.url}`,
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[API Server Error]', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`\n==================================================`);
  console.log(`🛒 Store Manager Backend API running on http://localhost:${PORT}`);
  console.log(`==================================================`);

  // Initialize/verify DB schema
  await initializeSchema();
  const dbHealth = await checkDatabaseHealth();
  if (dbHealth.connected) {
    console.log(`[Database Status] Connected to MySQL database "${dbHealth.database}"`);
    console.log(`[Database Tables] ${dbHealth.tables.join(', ') || 'No tables yet'}`);
  } else {
    console.warn(`[Database Status] WARNING: Database connection failed: ${dbHealth.error}`);
    console.warn(`[Action Required] Please set valid DB_PASSWORD in backend/.env`);
  }
});
