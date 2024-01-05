const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // Module type
    serviceType: {
      type: String,
      enum: ['taxi', 'restaurant', 'grocery', 'pharmacy', 'meatShop'],
      required: true,
    },

    // Order items (for non-taxi services)
    items: [
      {
        name: String,
        quantity: Number,
        price: Number,
        image: String,
        description: String,
      },
    ],

    // Locations
    pickupLocation: {
      address: String,
      coordinates: {
        type: { type: String, default: 'Point' },
        coordinates: [Number], // [longitude, latitude]
      },
    },
    deliveryLocation: {
      address: String,
      coordinates: {
        type: { type: String, default: 'Point' },
        coordinates: [Number],
      },
    },

    // Pricing
    pricing: {
      itemsTotal: { type: Number, default: 0 },
      deliveryFee: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      total: { type: Number, required: true },
    },

    // Status
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'preparing',
        'ready',
        'assigned',
        'picked_up',
        'in_transit',
        'delivered',
        'cancelled',
        'refunded',
      ],
      default: 'pending',
    },

    // Payment
    payment: {
      method: {
        type: String,
        enum: ['cash', 'card', 'wallet', 'upi'],
        required: true,
      },
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending',
      },
      transactionId: String,
      paidAt: Date,
    },

    // Delivery details
    deliveryInstructions: String,
    estimatedDeliveryTime: Date,
    actualDeliveryTime: Date,

    // Ratings
    rating: {
      customerRating: { type: Number, min: 1, max: 5 },
      vendorRating: { type: Number, min: 1, max: 5 },
      driverRating: { type: Number, min: 1, max: 5 },
      review: String,
    },

    // Cancellation
    cancellationReason: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledAt: Date,

    // Geofence tracking
    geofenceTracking: {
      enabled: {
        type: Boolean,
        default: false,
      },
      geofenceIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Geofence',
      }],
      lastLocationUpdate: {
        coordinates: [Number], // [longitude, latitude]
        timestamp: Date,
        accuracy: Number,
      },
      trackingStatus: {
        type: String,
        enum: ['not_started', 'active', 'paused', 'completed'],
        default: 'not_started',
      },
      events: [{
        type: {
          type: String,
          enum: ['store_reached', 'customer_approaching', 'customer_reached', 'delivery_completed'],
        },
        timestamp: Date,
        location: {
          coordinates: [Number],
          address: String,
        },
        description: String,
      }],
    },
  },
  {
    timestamps: true,
  }
);

// Add geospatial indexes
orderSchema.index({ 'pickupLocation.coordinates': '2dsphere' });
orderSchema.index({ 'deliveryLocation.coordinates': '2dsphere' });

// Generate order number
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    this.orderNumber = `ORD${timestamp}${random}`;
  }
  next();
});

// Methods for geofence tracking
orderSchema.methods.enableGeofenceTracking = function() {
  this.geofenceTracking.enabled = true;
  this.geofenceTracking.trackingStatus = 'active';
  return this.save();
};

orderSchema.methods.disableGeofenceTracking = function() {
  this.geofenceTracking.enabled = false;
  this.geofenceTracking.trackingStatus = 'completed';
  return this.save();
};

orderSchema.methods.updateLocation = function(coordinates, accuracy) {
  this.geofenceTracking.lastLocationUpdate = {
    coordinates,
    timestamp: new Date(),
    accuracy,
  };
  return this.save();
};

orderSchema.methods.addTrackingEvent = function(type, location, description) {
  this.geofenceTracking.events.push({
    type,
    timestamp: new Date(),
    location: {
      coordinates: location.coordinates,
      address: location.address,
    },
    description,
  });
  return this.save();
};

orderSchema.methods.addGeofence = function(geofenceId) {
  if (!this.geofenceTracking.geofenceIds.includes(geofenceId)) {
    this.geofenceTracking.geofenceIds.push(geofenceId);
  }
  return this.save();
};

orderSchema.methods.removeGeofence = function(geofenceId) {
  this.geofenceTracking.geofenceIds = this.geofenceTracking.geofenceIds.filter(
    id => !id.equals(geofenceId)
  );
  return this.save();
};

// Static method to find orders with active geofence tracking
orderSchema.statics.findWithActiveTracking = function() {
  return this.find({
    'geofenceTracking.enabled': true,
    'geofenceTracking.trackingStatus': 'active',
  }).populate('customer driver vendor geofenceTracking.geofenceIds');
};

// Static method to find orders by driver
orderSchema.statics.findByDriver = function(driverId) {
  return this.find({ driver: driverId }).populate('customer vendor');
};

module.exports = mongoose.model('Order', orderSchema);

