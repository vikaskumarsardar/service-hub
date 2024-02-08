const mongoose = require('mongoose');
const Store = require('../../core/models/Store.model');
const Product = require('../../core/models/Product.model');

/**
 * Grocery Store Discriminator
 * Extends base Store with grocery-specific fields
 */
const GroceryStore = Store.discriminator(
  'grocery',
  new mongoose.Schema({
    storeCategories: {
      type: [String],
      default: ['vegetables', 'fruits', 'dairy', 'bakery', 'beverages', 'snacks'],
    },
    organicAvailable: {
      type: Boolean,
      default: false,
    },
    bulkOrdersAvailable: {
      type: Boolean,
      default: false,
    },
  })
);

/**
 * Grocery Product Discriminator
 * Extends base Product with grocery-specific fields
 */
const GroceryProduct = Product.discriminator(
  'groceryProduct',
  new mongoose.Schema({
    unit: {
      type: String,
      enum: ['kg', 'g', 'l', 'ml', 'piece', 'dozen', 'pack'],
      default: 'piece',
    },
    unitValue: {
      type: Number,
      default: 1,
    },
    
    // Product details
    brand: String,
    manufacturer: String,
    countryOfOrigin: String,
    
    // Organic/Fresh
    isOrganic: {
      type: Boolean,
      default: false,
    },
    isFresh: {
      type: Boolean,
      default: false,
    },
    
    // Expiry
    expiryDate: Date,
    manufactureDate: Date,
    shelfLife: String,
    
    // Packaging
    packageType: String,
    packageWeight: String,
    
    // Bulk
    bulkAvailable: {
      type: Boolean,
      default: false,
    },
    minBulkQuantity: Number,
  })
);

module.exports = {
  GroceryStore,
  GroceryProduct,
};

