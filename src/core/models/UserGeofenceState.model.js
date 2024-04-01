const mongoose = require('mongoose');

const userGeofenceStateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    currentLocation: {
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: function(coords) {
            return coords.length === 2 && 
                   typeof coords[0] === 'number' && 
                   typeof coords[1] === 'number' &&
                   coords[0] >= -180 && coords[0] <= 180 && // longitude
                   coords[1] >= -90 && coords[1] <= 90;     // latitude
          },
          message: 'Invalid coordinates format. Expected [longitude, latitude]',
        },
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      accuracy: Number, // GPS accuracy in meters
      heading: Number,  // Direction of movement
      speed: Number,    // Speed in m/s
    },
    activeGeofences: [{
      geofenceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Geofence',
        required: true,
      },
      enteredAt: {
        type: Date,
        default: Date.now,
      },
      location: {
        coordinates: [Number],
        timestamp: Date,
      },
    }],
    lastGeofences: [{
      geofenceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Geofence',
        required: true,
      },
      exitedAt: {
        type: Date,
        default: Date.now,
      },
      location: {
        coordinates: [Number],
        timestamp: Date,
      },
    }],
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    isTracking: {
      type: Boolean,
      default: false,
    },
    trackingSettings: {
      updateInterval: {
        type: Number,
        default: 5000, // 5 seconds in milliseconds
      },
      accuracyThreshold: {
        type: Number,
        default: 100, // 100 meters
      },
      enableNotifications: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userGeofenceStateSchema.index({ userId: 1 });
userGeofenceStateSchema.index({ 'currentLocation.coordinates': '2dsphere' });
userGeofenceStateSchema.index({ lastUpdated: 1 });
userGeofenceStateSchema.index({ isTracking: 1 });
userGeofenceStateSchema.index({ 'activeGeofences.geofenceId': 1 });

// Virtual for active geofence IDs
userGeofenceStateSchema.virtual('activeGeofenceIds').get(function() {
  return this.activeGeofences.map(g => g.geofenceId);
});

// Virtual for last geofence IDs
userGeofenceStateSchema.virtual('lastGeofenceIds').get(function() {
  return this.lastGeofences.map(g => g.geofenceId);
});

// Method to update location
userGeofenceStateSchema.methods.updateLocation = function(coordinates, options = {}) {
  this.currentLocation = {
    coordinates,
    timestamp: new Date(),
    accuracy: options.accuracy,
    heading: options.heading,
    speed: options.speed,
  };
  this.lastUpdated = new Date();
  return this.save();
};

// Method to add active geofence
userGeofenceStateSchema.methods.addActiveGeofence = function(geofenceId, location) {
  // Remove if already exists
  this.activeGeofences = this.activeGeofences.filter(
    g => !g.geofenceId.equals(geofenceId)
  );
  
  // Add new active geofence
  this.activeGeofences.push({
    geofenceId,
    enteredAt: new Date(),
    location: {
      coordinates: location,
      timestamp: new Date(),
    },
  });
  
  return this.save();
};

// Method to remove active geofence
userGeofenceStateSchema.methods.removeActiveGeofence = function(geofenceId, location) {
  // Find the geofence to remove
  const geofenceToRemove = this.activeGeofences.find(
    g => g.geofenceId.equals(geofenceId)
  );
  
  if (geofenceToRemove) {
    // Add to last geofences
    this.lastGeofences.push({
      geofenceId,
      exitedAt: new Date(),
      location: {
        coordinates: location,
        timestamp: new Date(),
      },
    });
    
    // Remove from active geofences
    this.activeGeofences = this.activeGeofences.filter(
      g => !g.geofenceId.equals(geofenceId)
    );
  }
  
  return this.save();
};

// Method to get geofence changes
userGeofenceStateSchema.methods.getGeofenceChanges = function(newActiveGeofenceIds) {
  const currentIds = this.activeGeofenceIds.map(id => id.toString());
  const newIds = newActiveGeofenceIds.map(id => id.toString());
  
  const entered = newIds.filter(id => !currentIds.includes(id));
  const exited = currentIds.filter(id => !newIds.includes(id));
  
  return { entered, exited };
};

// Static method to find by user ID
userGeofenceStateSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId }).populate('activeGeofences.geofenceId');
};

// Static method to create or update state
userGeofenceStateSchema.statics.createOrUpdate = async function(userId, location, options = {}) {
  let state = await this.findOne({ userId });
  
  if (!state) {
    state = new this({
      userId,
      currentLocation: {
        coordinates: location,
        timestamp: new Date(),
        ...options,
      },
    });
  } else {
    state.currentLocation = {
      coordinates: location,
      timestamp: new Date(),
      ...options,
    };
    state.lastUpdated = new Date();
  }
  
  return state.save();
};

const UserGeofenceState = mongoose.model('UserGeofenceState', userGeofenceStateSchema);

module.exports = UserGeofenceState;
