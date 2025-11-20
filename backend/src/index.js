require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const db = require('./config/database');
const migrate = require('./config/migrate');
const endpointsRouter = require('./routes/endpoints');
const settingsRouter = require('./routes/settings');
const schedulerService = require('./services/SchedulerService');
const cleanupService = require('./services/CleanupService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow Swagger UI and frontend
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Documentation - only load in non-packaged environments
if (!process.env.ELECTRON_APP) {
  try {
    const swaggerUi = require('swagger-ui-express');
    const swaggerSpecs = require('./config/swagger');
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
  } catch (err) {
    console.log('Swagger UI not available (production build)');
  }
}

// API Routes
app.use('/api/endpoints', endpointsRouter);
app.use('/api', endpointsRouter); // Also mount directly for check-results routes
app.use('/api/settings', settingsRouter);

// Health check endpoint for the API itself
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, '../../public');
  app.use(express.static(publicPath));

  // Serve index.html for all non-API routes (SPA routing)
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
} else {
  // Development mode - just show API info
  app.get('/', (req, res) => {
    res.json({ 
      message: 'Health Check Dashboard API',
      version: '1.0.0',
      documentation: '/api-docs'
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  schedulerService.stopAll();
  cleanupService.stop();
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  schedulerService.stopAll();
  cleanupService.stop();
  await db.close();
  process.exit(0);
});

// Start server
async function start() {
  try {
    // Run database migration (this also connects to the database)
    console.log('Running database migration...');
    await migrate();

    // Start scheduler service
    await schedulerService.start();

    // Start cleanup service
    cleanupService.start();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
      if (process.env.NODE_ENV === 'production') {
        console.log(`Dashboard: http://localhost:${PORT}`);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

module.exports = app;
