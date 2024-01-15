const express = require('express');
const featuresConfig = require('../config/features.config');
const logger = require('../core/utils/logger');

/**
 * Dynamically loads and registers enabled modules
 */
const loadModules = (app) => {
  const { enabledModules } = featuresConfig;
  const apiRouter = express.Router();

  // Load core routes (always available)
  const authRoutes = require('../core/routes/auth.routes');
  apiRouter.use('/auth', authRoutes);

  // Load enabled modules dynamically
  Object.keys(enabledModules).forEach((moduleName) => {
    if (enabledModules[moduleName]) {
      try {
        // Dynamically require the module
        const moduleRouter = require(`../modules/${moduleName}`);
        
        // Register module routes
        apiRouter.use(`/${moduleName}`, moduleRouter);
        
        logger.info(`✅ Module loaded: ${moduleName}`);
      } catch (error) {
        logger.error(`❌ Failed to load module: ${moduleName}`, error.message);
      }
    } else {
      logger.info(`⏭️  Module disabled: ${moduleName}`);
    }
  });

  // Get enabled modules endpoint
  apiRouter.get('/features', (req, res) => {
    res.json({
      success: true,
      data: {
        enabledModules: featuresConfig.getEnabledModules(),
        moduleConfig: featuresConfig.moduleConfig,
      },
    });
  });

  // Register all API routes under /api/v1
  app.use('/api/v1', apiRouter);
  
  return app;
};

module.exports = loadModules;

