const express = require('express');
const router = express.Router();
const RestaurantController = require('./restaurant.controller');
const AuthMiddleware = require('../../core/middleware/auth.middleware');

// Public routes
router.get('/nearby', RestaurantController.getNearbyRestaurants);
router.get('/:restaurantId', RestaurantController.getRestaurantDetails);
router.get('/:restaurantId/menu', RestaurantController.getMenuItems);

// Vendor routes
router.post(
  '/',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('vendor'),
  RestaurantController.createRestaurant
);

router.post(
  '/:restaurantId/menu',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('vendor'),
  RestaurantController.addMenuItem
);

router.get(
  '/:restaurantId/orders',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('vendor'),
  RestaurantController.getRestaurantOrders
);

// Customer routes
router.post(
  '/orders',
  AuthMiddleware.authenticate,
  RestaurantController.placeOrder
);

module.exports = router;

