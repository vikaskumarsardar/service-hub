const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['customer', 'driver', 'vendor', 'admin'],
      default: 'customer',
    },
    profileImage: {
      type: String,
      default: null,
    },

    // Location for drivers/vendors
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0], // [longitude, latitude]
      },
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },

    // Vendor-specific fields
    vendorType: {
      type: String,
      enum: ['taxi', 'restaurant', 'grocery', 'pharmacy', 'meatShop', null],
      default: null,
    },
    businessName: {
      type: String,
      default: null,
    },
    businessLicense: {
      type: String,
      default: null,
    },
    businessDescription: {
      type: String,
      default: null,
    },

    // Driver-specific fields
    vehicleInfo: {
      type: {
        type: String,
        enum: ['car', 'bike', 'auto', null],
        default: null,
      },
      model: String,
      plateNumber: String,
      color: String,
    },
    driverLicense: {
      type: String,
      default: null,
    },

    // Status flags
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },

    // Wallet
    wallet: {
      balance: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Ratings
    ratings: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Verification tokens
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
);

// Add geospatial index
userSchema.index({ location: '2dsphere' });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function () {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

module.exports = mongoose.model('User', userSchema);

