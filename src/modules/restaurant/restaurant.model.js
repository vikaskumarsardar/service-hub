const mongoose = require('mongoose');
const Store = require('../../core/models/Store.model');
const Product = require('../../core/models/Product.model');

/**
 * Restaurant Store Discriminator
 * Extends base Store with restaurant-specific fields
 */
const Restaurant = Store.discriminator(
  'restaurant',
  new mongoose.Schema({
    cuisineTypes: [String],
    specialties: [String],
    averageCostForTwo: Number,
    dietaryOptions: {
      vegetarian: { type: Boolean, default: false },
      vegan: { type: Boolean, default: false },
      glutenFree: { type: Boolean, default: false },
      halal: { type: Boolean, default: false },
    },
    tableBookingAvailable: {
      type: Boolean,
      default: false,
    },
  })
);

/**
 * Menu Item Discriminator
 * Extends base Product with menu item-specific fields
 */
const MenuItem = Product.discriminator(
  'menuItem',
  new mongoose.Schema({
    cuisineType: String,
    
    // Dietary info
    isVeg: {
      type: Boolean,
      default: true,
    },
    isVegan: {
      type: Boolean,
      default: false,
    },
    isGlutenFree: {
      type: Boolean,
      default: false,
    },
    spiceLevel: {
      type: String,
      enum: ['mild', 'medium', 'hot', 'extra-hot', 'none'],
      default: 'none',
    },
    
    // Nutrition (optional)
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
    
    // Preparation
    preparationTime: {
      type: Number,
      default: 20, // minutes
    },
    
    // Serving
    servingSize: String,
    portionSize: {
      type: String,
      enum: ['small', 'medium', 'large', 'family'],
      default: 'medium',
    },
    
    // Customization
    customizationAvailable: {
      type: Boolean,
      default: false,
    },
    addons: [
      {
        name: String,
        price: Number,
      },
    ],
  })
);

module.exports = {
  Restaurant,
  MenuItem,
};

