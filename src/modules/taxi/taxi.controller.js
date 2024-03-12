const TaxiService = require('./taxi.service');
const ApiResponse = require('../../core/utils/response');

class TaxiController {
  /**
   * Book a ride
   */
  static async bookRide(req, res, next) {
    try {
      const ride = await TaxiService.bookRide(req.user._id, req.body);
      return ApiResponse.created(res, ride, 'Ride booked successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get nearby drivers
   */
  static async getNearbyDrivers(req, res, next) {
    try {
      const { longitude, latitude, maxDistance } = req.query;
      const drivers = await TaxiService.getNearbyDrivers(
        [parseFloat(longitude), parseFloat(latitude)],
        maxDistance ? parseInt(maxDistance) : 5
      );
      return ApiResponse.success(res, drivers, 'Nearby drivers fetched');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Accept a ride (driver)
   */
  static async acceptRide(req, res, next) {
    try {
      const { rideId } = req.params;
      const ride = await TaxiService.acceptRide(rideId, req.user._id);
      return ApiResponse.success(res, ride, 'Ride accepted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update ride status
   */
  static async updateRideStatus(req, res, next) {
    try {
      const { rideId } = req.params;
      const { status } = req.body;
      const ride = await TaxiService.updateRideStatus(rideId, status, req.user._id);
      return ApiResponse.success(res, ride, 'Ride status updated');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user rides
   */
  static async getUserRides(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const rides = await TaxiService.getUserRides(
        req.user._id,
        req.user.role,
        page,
        limit
      );
      return ApiResponse.success(res, rides, 'Rides fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get ride details
   */
  static async getRideDetails(req, res, next) {
    try {
      const { rideId } = req.params;
      const ride = await TaxiService.getRideDetails(rideId);
      return ApiResponse.success(res, ride, 'Ride details fetched');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Rate a ride
   */
  static async rateRide(req, res, next) {
    try {
      const { rideId } = req.params;
      const { rating, review } = req.body;
      const ride = await TaxiService.rateRide(rideId, rating, review);
      return ApiResponse.success(res, ride, 'Ride rated successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TaxiController;

