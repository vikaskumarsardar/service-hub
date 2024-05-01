/**
 * Main Seeder Script
 * Run: node src/seeders/index.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../core/utils/logger');
const dbConfig = require('../config/database');
const featuresConfig = require('../config/features.config');

// Import seeders
const userSeeder = require('./userSeeder');
const restaurantSeeder = require('./restaurantSeeder');
const grocerySeeder = require('./grocerySeeder');
const pharmacySeeder = require('./pharmacySeeder');
const meatShopSeeder = require('./meatShopSeeder');

const seedDatabase = async () => {
  try {
    // Connect to database
    await mongoose.connect(dbConfig.uri, dbConfig.options);
    logger.info('✅ Connected to database');

    // Clear existing data (optional - uncomment if you want to clear)
    // await clearDatabase();

    // Seed users (vendors, customers, drivers)
    logger.info('🌱 Seeding users...');
    const users = await userSeeder.seed();
    logger.info(`✅ Created ${users.length} users`);

    // Get enabled modules
    const enabledModules = featuresConfig.getEnabledModules();
    logger.info(`📦 Enabled modules: ${enabledModules.join(', ')}`);

    // Seed each enabled module
    if (enabledModules.includes('restaurant')) {
      logger.info('🌱 Seeding restaurants...');
      const restaurants = await restaurantSeeder.seed(users.vendors);
      logger.info(`✅ Created ${restaurants.stores.length} restaurants with ${restaurants.products.length} menu items`);
    }

    if (enabledModules.includes('grocery')) {
      logger.info('🌱 Seeding grocery stores...');
      const groceries = await grocerySeeder.seed(users.vendors);
      logger.info(`✅ Created ${groceries.stores.length} grocery stores with ${groceries.products.length} products`);
    }

    if (enabledModules.includes('pharmacy')) {
      logger.info('🌱 Seeding pharmacies...');
      const pharmacies = await pharmacySeeder.seed(users.vendors);
      logger.info(`✅ Created ${pharmacies.stores.length} pharmacies with ${pharmacies.products.length} medicines`);
    }

    if (enabledModules.includes('meatShop')) {
      logger.info('🌱 Seeding meat shops...');
      const meatShops = await meatShopSeeder.seed(users.vendors);
      logger.info(`✅ Created ${meatShops.stores.length} meat shops with ${meatShops.products.length} products`);
    }

    logger.info('🎉 Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Optional: Clear database function
const clearDatabase = async () => {
  const collections = await mongoose.connection.db.collections();
  
  for (let collection of collections) {
    await collection.deleteMany({});
  }
  
  logger.info('🗑️  Database cleared');
};

// Run seeder
seedDatabase();

