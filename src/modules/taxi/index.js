const express = require('express');
const router = express.Router();
const TaxiController = require('./taxi.controller');
const AuthMiddleware = require('../../core/middleware/auth.middleware');
const validateRequest = require('../../core/middleware/validation.middleware');
const taxiValidation = require('./taxi.validation');

// Customer routes
router.post(
  '/book',
  AuthMiddleware.authenticate,
  validateRequest(taxiValidation.bookRide),
  TaxiController.bookRide
);

router.get(
  '/rides',
  AuthMiddleware.authenticate,
  TaxiController.getUserRides
);

router.get(
  '/rides/:rideId',
  AuthMiddleware.authenticate,
  TaxiController.getRideDetails
);

router.get(
  '/nearby-drivers',
  AuthMiddleware.authenticate,
  TaxiController.getNearbyDrivers
);

// Driver routes
router.post(
  '/rides/:rideId/accept',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('driver'),
  TaxiController.acceptRide
);

router.put(
  '/rides/:rideId/status',
  AuthMiddleware.authenticate,
  validateRequest(taxiValidation.updateStatus),
  TaxiController.updateRideStatus
);

// Rating
router.post(
  '/rides/:rideId/rate',
  AuthMiddleware.authenticate,
  validateRequest(taxiValidation.rateRide),
  TaxiController.rateRide
);

module.exports = router;

