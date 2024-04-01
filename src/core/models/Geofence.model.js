const mongoose = require('mongoose');

const geofenceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    type: {
      type: String,
      enum: ['circle', 'polygon'],
      required: true,
    },
    geometry: {
      type: {
        type: String,
        enum: ['Point', 'Polygon'],
        required: true,
      },
      coordinates: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
      },
    },
    radius: {
      type: Number,
      min: 0,
      // Only required for circle type
      validate: {
        validator: function(value) {
          // For non-circle types, radius is optional
          if (this.type !== 'circle') {
            return true;
          }
          // For circle type, radius must be a positive number
          return value != null && value > 0;
        },
        message: 'Radius is required and must be greater than 0 for circle geofences',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    triggers: {
      onEnter: {
        title: String,
        message: String,
        action: String, // 'notification', 'webhook', 'sms', etc.
      },
      onExit: {
        title: String,
        message: String,
        action: String,
      },
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
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      deliveryPartnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
geofenceSchema.index({ geometry: '2dsphere' });
geofenceSchema.index({ isActive: 1 });
geofenceSchema.index({ 'metadata.orderId': 1 });
geofenceSchema.index({ 'metadata.storeId': 1 });
geofenceSchema.index({ 'metadata.userId': 1 });
geofenceSchema.index({ 'metadata.deliveryPartnerId': 1 });
geofenceSchema.index({ type: 1, isActive: 1 });

// Virtual for geofence area (for circles)
geofenceSchema.virtual('area').get(function() {
  if (this.type === 'circle' && this.radius) {
    return Math.PI * this.radius * this.radius;
  }
  return null;
});

// Method to check if a point is inside the geofence
geofenceSchema.methods.containsPoint = function(coordinates) {
  if (this.type === 'circle') {
    const distance = this.calculateDistance(coordinates, this.geometry.coordinates);
    return distance <= this.radius;
  } else if (this.type === 'polygon') {
    // For polygon, we'll use MongoDB's geospatial query
    // This is a simplified check - in practice, use $geoIntersects
    return true; // Placeholder - actual implementation would use spatial query
  }
  return false;
};

// Method to calculate distance between two points (Haversine formula)
geofenceSchema.methods.calculateDistance = function(coord1, coord2) {
  const R = 6371000; // Earth's radius in meters
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in meters
  
  return distance;
};

// Static method to find geofences containing a point
// OPTIMIZED: Uses $near for circles (much simpler than Haversine formula)
geofenceSchema.statics.findContainingPoint = async function(coordinates) {
  const containingGeofences = [];
  
  // Step 1: Get all active geofences (small dataset, so this is fine)
  const allGeofences = await this.find({ isActive: true });
  
  // Step 2: Check each geofence
  for (const geofence of allGeofences) {
    if (geofence.type === 'circle') {
      // For circles: Use $near with geofence's specific radius
      const result = await this.findOne({
        _id: geofence._id,
        'geometry.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: coordinates
            },
            $maxDistance: geofence.radius  // Use this geofence's radius
          }
        }
      });
      
      if (result) containingGeofences.push(result);
      
    } else if (geofence.type === 'polygon') {
      // For polygons: Use $geoIntersects (same as before)
      const result = await this.findOne({
        _id: geofence._id,
        geometry: {
          $geoIntersects: {
            $geometry: {
              type: 'Point',
              coordinates: coordinates,
            },
          },
        },
      });
      
      if (result) containingGeofences.push(result);
    }
  }
  
  return containingGeofences;
};

const Geofence = mongoose.model('Geofence', geofenceSchema);

module.exports = Geofence;
