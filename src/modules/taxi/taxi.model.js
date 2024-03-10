const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema(
  {
    rideNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    vehicleType: {
      type: String,
      enum: ['car', 'bike', 'auto'],
      required: true,
    },
    pickup: {
      address: {
        type: String,
        required: true,
      },
      coordinates: {
        type: { type: String, default: 'Point' },
        coordinates: {
          type: [Number],
          required: true,
        },
      },
    },
    dropoff: {
      address: {
        type: String,
        required: true,
      },
      coordinates: {
        type: { type: String, default: 'Point' },
        coordinates: {
          type: [Number],
          required: true,
        },
      },
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'arrived', 'started', 'completed', 'cancelled'],
      default: 'pending',
    },
    fare: {
      baseFare: { type: Number, required: true },
      distanceFare: { type: Number, required: true },
      timeFare: { type: Number, default: 0 },
      totalFare: { type: Number, required: true },
    },
    payment: {
      method: {
        type: String,
        enum: ['cash', 'card', 'wallet', 'upi'],
        required: true,
      },
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending',
      },
      transactionId: String,
    },
    distance: {
      type: Number,
      required: true,
    },
    duration: Number,
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    review: String,
    scheduledTime: Date,
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
  },
  {
    timestamps: true,
  }
);

// Add geospatial indexes
rideSchema.index({ 'pickup.coordinates': '2dsphere' });
rideSchema.index({ 'dropoff.coordinates': '2dsphere' });

// Generate ride number
rideSchema.pre('save', async function (next) {
  if (!this.rideNumber) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    this.rideNumber = `RIDE${timestamp}${random}`;
  }
  next();
});

module.exports = mongoose.model('Ride', rideSchema);

