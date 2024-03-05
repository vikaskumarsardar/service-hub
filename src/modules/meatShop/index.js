const express = require('express');
const router = express.Router();
const MeatShopController = require('./meatShop.controller');
const AuthMiddleware = require('../../core/middleware/auth.middleware');

// Public routes
router.get('/shops/nearby', MeatShopController.getNearbyShops);
router.get('/shops/:shopId/products', MeatShopController.getProducts);

// Vendor routes
router.post(
  '/shops',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('vendor'),
  MeatShopController.createShop
);

router.post(
  '/shops/:shopId/products',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('vendor'),
  MeatShopController.addProduct
);

// Customer routes
router.post(
  '/orders',
  AuthMiddleware.authenticate,
  MeatShopController.placeOrder
);

module.exports = router;

