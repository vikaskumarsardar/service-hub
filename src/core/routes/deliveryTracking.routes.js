const express = require('express');
const router = express.Router();
const DeliveryTrackingController = require('../controllers/deliveryTracking.controller');
const AuthMiddleware = require('../middleware/auth.middleware');
const ApiResponse = require('../utils/response');
const { body, param, query, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.badRequest(res, 'Validation Error', errors.array());
  }
  next();
};

// Validation schemas
const startTrackingValidation = [
  body('driverId').optional().isMongoId().withMessage('Invalid driver ID'),
];

const updateLocationValidation = [
  body('coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array of [longitude, latitude]')
    .custom((value) => {
      if (typeof value[0] !== 'number' || typeof value[1] !== 'number') {
        throw new Error('Coordinates must be numbers');
      }
      if (value[0] < -180 || value[0] > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }
      if (value[1] < -90 || value[1] > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }
      return true;
    }),
  body('accuracy').optional().isNumeric().withMessage('Accuracy must be a number'),
  body('heading').optional().isNumeric().withMessage('Heading must be a number'),
  body('speed').optional().isNumeric().withMessage('Speed must be a number'),
];

const orderIdValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

// Routes

/**
 * @route   POST /api/v1/delivery-tracking/:orderId/start
 * @desc    Start geofence tracking for an order
 * @access  Private (Vendor/Admin)
 */
router.post(
  '/:orderId/start',
  orderIdValidation,
  startTrackingValidation,
  validate,
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(['vendor', 'admin']),
  DeliveryTrackingController.startTracking
);

/**
 * @route   POST /api/v1/delivery-tracking/:orderId/location
 * @desc    Update driver location for an order
 * @access  Private (Driver)
 */
router.post(
  '/:orderId/location',
  orderIdValidation,
  updateLocationValidation,
  validate,
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(['driver']),
  DeliveryTrackingController.updateLocation
);

/**
 * @route   GET /api/v1/delivery-tracking/:orderId/status
 * @desc    Get order tracking status
 * @access  Private (Customer/Driver/Vendor/Admin)
 */
router.get(
  '/:orderId/status',
  orderIdValidation,
  validate,
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(['customer', 'driver', 'vendor', 'admin']),
  DeliveryTrackingController.getTrackingStatus
);

/**
 * @route   POST /api/v1/delivery-tracking/:orderId/stop
 * @desc    Stop geofence tracking for an order
 * @access  Private (Driver/Admin)
 */
router.post(
  '/:orderId/stop',
  orderIdValidation,
  validate,
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(['driver', 'admin']),
  DeliveryTrackingController.stopTracking
);

/**
 * @route   GET /api/v1/delivery-tracking/:orderId/events
 * @desc    Get geofence events for an order
 * @access  Private (Customer/Driver/Vendor/Admin)
 */
router.get(
  '/:orderId/events',
  orderIdValidation,
  paginationValidation,
  validate,
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(['customer', 'driver', 'vendor', 'admin']),
  DeliveryTrackingController.getGeofenceEvents
);

/**
 * @route   GET /api/v1/delivery-tracking/active
 * @desc    Get all orders with active tracking
 * @access  Private (Admin/Vendor)
 */
router.get(
  '/active',
  paginationValidation,
  validate,
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(['admin', 'vendor']),
  DeliveryTrackingController.getActiveTrackingOrders
);

module.exports = router;
