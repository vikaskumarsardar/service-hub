const mongoose = require('mongoose');

const geofenceEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    geofenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Geofence',
      required: true,
    },
    action: {
      type: String,
      enum: ['enter', 'exit'],
      required: true,
    },
    location: {
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      accuracy: Number,
      heading: Number,
      speed: Number,
    },
    metadata: {
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
      },
      storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
      },
      deliveryPartnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      distance: Number, // Distance from geofence center (for circles)
      duration: Number, // Time spent in geofence (for exit events)
    },
    notification: {
      sent: {
        type: Boolean,
        default: false,
      },
      sentAt: Date,
      title: String,
      message: String,
      type: {
        type: String,
        enum: ['push', 'sms', 'email', 'in_app'],
        default: 'push',
      },
      response: {
        success: Boolean,
        error: String,
        provider: String,
      },
    },
    processed: {
      type: Boolean,
      default: false,
    },
    processedAt: Date,
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
geofenceEventSchema.index({ userId: 1 });
geofenceEventSchema.index({ geofenceId: 1 });
geofenceEventSchema.index({ action: 1 });
geofenceEventSchema.index({ createdAt: -1 });
geofenceEventSchema.index({ processed: 1 });
geofenceEventSchema.index({ 'metadata.orderId': 1 });
geofenceEventSchema.index({ 'metadata.storeId': 1 });
geofenceEventSchema.index({ 'metadata.deliveryPartnerId': 1 });
geofenceEventSchema.index({ 'location.coordinates': '2dsphere' });

// Compound indexes for common queries
geofenceEventSchema.index({ userId: 1, action: 1, createdAt: -1 });
geofenceEventSchema.index({ geofenceId: 1, processed: 1 });
geofenceEventSchema.index({ 'metadata.orderId': 1, action: 1 });

// Virtual for event age
geofenceEventSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Virtual for is retryable
geofenceEventSchema.virtual('isRetryable').get(function() {
  return this.retryCount < this.maxRetries && !this.processed;
});

// Method to mark as processed
geofenceEventSchema.methods.markAsProcessed = function() {
  this.processed = true;
  this.processedAt = new Date();
  return this.save();
};

// Method to mark notification as sent
geofenceEventSchema.methods.markNotificationSent = function(response) {
  this.notification.sent = true;
  this.notification.sentAt = new Date();
  this.notification.response = response;
  return this.save();
};

// Method to increment retry count
geofenceEventSchema.methods.incrementRetry = function() {
  this.retryCount += 1;
  return this.save();
};

// Static method to find unprocessed events
geofenceEventSchema.statics.findUnprocessed = function(limit = 100) {
  return this.find({
    processed: false,
    retryCount: { $lt: this.maxRetries },
  })
    .populate('userId', 'name email phone')
    .populate('geofenceId', 'name type triggers')
    .populate('metadata.orderId', 'orderNumber status')
    .populate('metadata.storeId', 'name storeType')
    .populate('metadata.deliveryPartnerId', 'name phone')
    .sort({ createdAt: 1 })
    .limit(limit);
};

// Static method to find events by order
geofenceEventSchema.statics.findByOrder = function(orderId) {
  return this.find({ 'metadata.orderId': orderId })
    .populate('geofenceId', 'name type triggers')
    .populate('userId', 'name email phone')
    .sort({ createdAt: -1 });
};

// Static method to find events by user
geofenceEventSchema.statics.findByUser = function(userId, limit = 50) {
  return this.find({ userId })
    .populate('geofenceId', 'name type')
    .populate('metadata.orderId', 'orderNumber status')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to create enter event
geofenceEventSchema.statics.createEnterEvent = function(data) {
  return this.create({
    userId: data.userId,
    geofenceId: data.geofenceId,
    action: 'enter',
    location: {
      coordinates: data.location,
      timestamp: new Date(),
      accuracy: data.accuracy,
      heading: data.heading,
      speed: data.speed,
    },
    metadata: {
      orderId: data.orderId,
      storeId: data.storeId,
      deliveryPartnerId: data.deliveryPartnerId,
      distance: data.distance,
    },
  });
};

// Static method to create exit event
geofenceEventSchema.statics.createExitEvent = function(data) {
  return this.create({
    userId: data.userId,
    geofenceId: data.geofenceId,
    action: 'exit',
    location: {
      coordinates: data.location,
      timestamp: new Date(),
      accuracy: data.accuracy,
      heading: data.heading,
      speed: data.speed,
    },
    metadata: {
      orderId: data.orderId,
      storeId: data.storeId,
      deliveryPartnerId: data.deliveryPartnerId,
      distance: data.distance,
      duration: data.duration,
    },
  });
};

const GeofenceEvent = mongoose.model('GeofenceEvent', geofenceEventSchema);

module.exports = GeofenceEvent;
