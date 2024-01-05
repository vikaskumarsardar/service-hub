const mongoose = require('mongoose');

/**
 * Base Store Schema - Common fields for all vendor stores
 * Modules will extend this using discriminators
 */
const storeSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    storeType: {
      type: String,
      enum: ['restaurant', 'grocery', 'pharmacy', 'meatShop'],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    
    // Location (common for all)
    location: {
      address: String,
      coordinates: {
        type: { type: String, default: 'Point' },
        coordinates: {
          type: [Number],
          default: [0, 0],
        },
      },
    },

    // Contact
    phone: String,
    email: String,

    // Images
    images: [String],
    logo: String,

    // Operating hours (common structure)
    openingHours: {
      monday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
      tuesday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
      wednesday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
      thursday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
      friday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
      saturday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
      sunday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    },

    // Ratings (common)
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 },
    },

    // Delivery settings (common)
    deliveryRadius: {
      type: Number,
      default: 10,
    },
    deliveryFee: {
      type: Number,
      default: 30,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    discriminatorKey: 'storeType',
  }
);

// Add geospatial index
storeSchema.index({ 'location.coordinates': '2dsphere' });
storeSchema.index({ storeType: 1, isActive: 1 });
storeSchema.index({ vendor: 1, isActive: 1 });

// Create base model
const Store = mongoose.model('Store', storeSchema);

module.exports = Store;
