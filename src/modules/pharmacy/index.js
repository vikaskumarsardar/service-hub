const express = require('express');
const router = express.Router();
const PharmacyController = require('./pharmacy.controller');
const AuthMiddleware = require('../../core/middleware/auth.middleware');

// Public routes
router.get('/nearby', PharmacyController.getNearbyPharmacies);
router.get('/:pharmacyId/medicines', PharmacyController.getMedicines);

// Vendor routes
router.post(
  '/',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('vendor'),
  PharmacyController.createPharmacy
);

router.post(
  '/:pharmacyId/medicines',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('vendor'),
  PharmacyController.addMedicine
);

// Customer routes
router.post(
  '/orders',
  AuthMiddleware.authenticate,
  PharmacyController.placeOrder
);

module.exports = router;

