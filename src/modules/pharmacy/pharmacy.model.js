const mongoose = require('mongoose');
const Store = require('../../core/models/Store.model');
const Product = require('../../core/models/Product.model');

/**
 * Pharmacy Store Discriminator
 * Extends base Store with pharmacy-specific fields
 */
const Pharmacy = Store.discriminator(
  'pharmacy',
  new mongoose.Schema({
    licenseNumber: {
      type: String,
      required: true,
    },
    is24Hours: {
      type: Boolean,
      default: false,
    },
    prescriptionRequired: {
      type: Boolean,
      default: true,
    },
    emergencyServices: {
      type: Boolean,
      default: false,
    },
    hasPharmacist: {
      type: Boolean,
      default: true,
    },
  })
);

/**
 * Medicine Discriminator
 * Extends base Product with medicine-specific fields
 */
const Medicine = Product.discriminator(
  'medicine',
  new mongoose.Schema({
    // Medical info
    genericName: String,
    manufacturer: {
      type: String,
      required: true,
    },
    composition: String,
    
    // Prescription
    requiresPrescription: {
      type: Boolean,
      default: false,
    },
    
    // Medicine type
    medicineType: {
      type: String,
      enum: ['tablet', 'capsule', 'syrup', 'injection', 'drops', 'cream', 'ointment', 'powder', 'other'],
      default: 'tablet',
    },
    
    // Dosage
    strength: String, // e.g., "500mg"
    dosageForm: String,
    
    // Packaging
    packSize: String, // e.g., "10 tablets"
    stripSize: Number,
    
    // Dates
    expiryDate: {
      type: Date,
      required: true,
    },
    manufactureDate: Date,
    
    // Storage
    storageConditions: String,
    
    // Usage
    usageInstructions: String,
    sideEffects: [String],
    warnings: [String],
    
    // Schedule (controlled substances)
    schedule: {
      type: String,
      enum: ['H', 'H1', 'X', 'G', 'none'],
      default: 'none',
    },
  })
);

module.exports = {
  Pharmacy,
  Medicine,
};

