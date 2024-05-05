const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongooseLoader = require('./loaders/mongoose.loader');
const modulesLoader = require('./loaders/modules.loader');
const { errorHandler, notFoundHandler } = require('./core/middleware/error.middleware');
const logger = require('./core/utils/logger');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

// Create necessary directories
const logsDir = path.join(__dirname, '../logs');
const uploadsDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Static files
app.use('/uploads', express.static(uploadsDir));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to On-Demand Services Platform API',
    version: process.env.API_VERSION || 'v1',
    documentation: '/api/v1/features',
  });
});

// API Routes
const deliveryTrackingRoutes = require('./core/routes/deliveryTracking.routes');
app.use('/api/v1/delivery-tracking', deliveryTrackingRoutes);

// Initialize database and load modules
const startServer = async () => {
  try {
    // Connect to database
    await mongooseLoader();
    
    // Load enabled modules dynamically
    modulesLoader(app);
    
    // Start geofence monitoring service
    const geofenceMonitoringService = require('./core/services/geofenceMonitoring.service');
    await geofenceMonitoringService.startMonitoring();
    
    // 404 handler (must be after all routes)
    app.use(notFoundHandler);
    
    // Error handling middleware (must be last)
    app.use(errorHandler);
    
    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 API URL: http://localhost:${PORT}`);
      logger.info(`📚 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;

