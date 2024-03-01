const mongoose = require('mongoose');
const Store = require('../../core/models/Store.model');
const Product = require('../../core/models/Product.model');

/**
 * Meat Shop Store Discriminator
 * Extends base Store with meat shop-specific fields
 */
const MeatShop = Store.discriminator(
  'meatShop',
  new mongoose.Schema({
    isHalal: {
      type: Boolean,
      default: false,
    },
    isKosher: {
      type: Boolean,
      default: false,
    },
    meatTypes: {
      type: [String],
      enum: ['chicken', 'mutton', 'beef', 'fish', 'seafood', 'pork'],
      default: ['chicken', 'mutton'],
    },
    freshGuarantee: {
      type: Boolean,
      default: true,
    },
    customCuttingAvailable: {
      type: Boolean,
      default: true,
    },
  })
);

/**
 * Meat Product Discriminator
 * Extends base Product with meat-specific fields
 */
const MeatProduct = Product.discriminator(
  'meatProduct',
  new mongoose.Schema({
    unit: {
      type: String,
      enum: ['kg', 'g', 'piece'],
      default: 'kg',
    },
    
    // Meat type
    meatCategory: {
      type: String,
      enum: ['chicken', 'mutton', 'beef', 'fish', 'seafood', 'pork'],
      required: true,
    },
    
    // Cut/Type
    cutType: String, // e.g., "breast", "leg", "fillet"
    
    // Freshness
    isFresh: {
      type: Boolean,
      default: true,
    },
    isFrozen: {
      type: Boolean,
      default: false,
    },
    
    // Certifications
    isHalal: {
      type: Boolean,
      default: false,
    },
    isKosher: {
      type: Boolean,
      default: false,
    },
    
    // Processing
    isProcessed: {
      type: Boolean,
      default: false,
    },
    isMarinated: {
      type: Boolean,
      default: false,
    },
    
    // Custom cutting
    customCuttingAvailable: {
      type: Boolean,
      default: true,
    },
    
    // Source
    origin: String,
    farmSource: String,
    
    // Best before
    bestBefore: Date,
    harvestDate: Date,
  })
);

module.exports = {
  MeatShop,
  MeatProduct,
};

