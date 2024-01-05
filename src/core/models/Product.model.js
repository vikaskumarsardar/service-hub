const mongoose = require('mongoose');

/**
 * Base Product Schema - Common fields for all products
 * Modules will extend this using discriminators
 */
const productSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    productType: {
      type: String,
      enum: ['menuItem', 'groceryProduct', 'medicine', 'meatProduct'],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    
    // Pricing
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPrice: {
      type: Number,
      min: 0,
    },
    
    // Category
    category: {
      type: String,
      required: true,
    },
    subCategory: String,
    
    // Stock management
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
    },
    
    // Media
    image: String,
    images: [String],
    
    // Availability
    isAvailable: {
      type: Boolean,
      default: true,
    },
    
    // Ratings
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
    
    // Tags for search
    tags: [String],
    
    // Popular/Featured
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    discriminatorKey: 'productType',
  }
);

// Indexes
productSchema.index({ store: 1, isAvailable: 1 });
productSchema.index({ productType: 1, category: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ store: 1, productType: 1 });

// Create base model
const Product = mongoose.model('Product', productSchema);

module.exports = Product;
