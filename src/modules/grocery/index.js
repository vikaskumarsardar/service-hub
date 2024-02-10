const express = require('express');
const router = express.Router();
const GroceryController = require('./grocery.controller');
const AuthMiddleware = require('../../core/middleware/auth.middleware');

// Public routes
router.get('/stores/nearby', GroceryController.getNearbyStores);
router.get('/stores/:storeId/products', GroceryController.getProducts);

// Vendor routes
router.post(
  '/stores',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('vendor'),
  GroceryController.createStore
);

router.post(
  '/stores/:storeId/products',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('vendor'),
  GroceryController.addProduct
);

// Customer routes
router.post(
  '/orders',
  AuthMiddleware.authenticate,
  GroceryController.placeOrder
);

module.exports = router;

