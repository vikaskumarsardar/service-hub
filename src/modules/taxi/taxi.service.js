const Ride = require('./taxi.model');
const User = require('../../core/models/User.model');
const Helpers = require('../../core/utils/helpers');
const featuresConfig = require('../../config/features.config');

class TaxiService {
  /**
   * Book a new ride
   */
  static async bookRide(customerId, rideData) {
    const { vehicleType, pickup, dropoff, paymentMethod, scheduledTime } = rideData;

    // Calculate distance
    const distance = Helpers.calculateDistance(
      pickup.coordinates[1],
      pickup.coordinates[0],
      dropoff.coordinates[1],
      dropoff.coordinates[0]
    );

    // Calculate fare
    const config = featuresConfig.moduleConfig.taxi;
    const baseFare = config.baseFare;
    const distanceFare = distance * config.perKmFare;
    const totalFare = baseFare + distanceFare;

    // Create ride
    const ride = await Ride.create({
      customer: customerId,
      vehicleType,
      pickup: {
        address: pickup.address,
        coordinates: {
          type: 'Point',
          coordinates: pickup.coordinates,
        },
      },
      dropoff: {
        address: dropoff.address,
        coordinates: {
          type: 'Point',
          coordinates: dropoff.coordinates,
        },
      },
      fare: {
        baseFare,
        distanceFare,
        totalFare,
      },
      distance,
      payment: {
        method: paymentMethod,
      },
      scheduledTime: scheduledTime || null,
    });

    // TODO: Notify nearby drivers

    return await ride.populate('customer', 'name phone email');
  }

  /**
   * Get nearby available drivers
   */
  static async getNearbyDrivers(coordinates, maxDistance = 5) {
    const drivers = await User.find({
      role: 'driver',
      isActive: true,
      isOnline: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: coordinates,
          },
          $maxDistance: maxDistance * 1000, // Convert km to meters
        },
      },
    }).select('name phone vehicleInfo location ratings');

    return drivers;
  }

  /**
   * Accept a ride (driver)
   */
  static async acceptRide(rideId, driverId) {
    const ride = await Ride.findById(rideId);

    if (!ride) {
      throw new Error('Ride not found');
    }

    if (ride.status !== 'pending') {
      throw new Error('Ride is not available');
    }

    ride.driver = driverId;
    ride.status = 'accepted';
    await ride.save();

    return await ride.populate(['customer', 'driver']);
  }

  /**
   * Update ride status
   */
  static async updateRideStatus(rideId, status, userId) {
    const ride = await Ride.findById(rideId);

    if (!ride) {
      throw new Error('Ride not found');
    }

    // Validate status transition
    const validTransitions = {
      pending: ['accepted', 'cancelled'],
      accepted: ['arrived', 'cancelled'],
      arrived: ['started', 'cancelled'],
      started: ['completed'],
      completed: [],
      cancelled: [],
    };

    if (!validTransitions[ride.status].includes(status)) {
      throw new Error(`Cannot transition from ${ride.status} to ${status}`);
    }

    ride.status = status;

    if (status === 'started') {
      ride.startedAt = new Date();
    } else if (status === 'completed') {
      ride.completedAt = new Date();
      ride.payment.status = 'completed';
    } else if (status === 'cancelled') {
      ride.cancelledAt = new Date();
    }

    await ride.save();

    return await ride.populate(['customer', 'driver']);
  }

  /**
   * Get user rides
   */
  static async getUserRides(userId, role, page = 1, limit = 10) {
    const query = role === 'driver' ? { driver: userId } : { customer: userId };
    const { skip, limit: pageLimit } = Helpers.paginate(page, limit);

    const rides = await Ride.find(query)
      .populate('customer', 'name phone email')
      .populate('driver', 'name phone vehicleInfo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    const total = await Ride.countDocuments(query);

    return Helpers.formatPaginationResponse(rides, page, limit, total);
  }

  /**
   * Get ride details
   */
  static async getRideDetails(rideId) {
    const ride = await Ride.findById(rideId)
      .populate('customer', 'name phone email profileImage')
      .populate('driver', 'name phone vehicleInfo profileImage ratings');

    if (!ride) {
      throw new Error('Ride not found');
    }

    return ride;
  }

  /**
   * Rate a ride
   */
  static async rateRide(rideId, rating, review) {
    const ride = await Ride.findById(rideId);

    if (!ride) {
      throw new Error('Ride not found');
    }

    if (ride.status !== 'completed') {
      throw new Error('Can only rate completed rides');
    }

    ride.rating = rating;
    ride.review = review;
    await ride.save();

    // Update driver rating
    if (ride.driver) {
      const driver = await User.findById(ride.driver);
      const totalRating = driver.ratings.average * driver.ratings.count + rating;
      driver.ratings.count += 1;
      driver.ratings.average = totalRating / driver.ratings.count;
      await driver.save();
    }

    return ride;
  }
}

module.exports = TaxiService;

