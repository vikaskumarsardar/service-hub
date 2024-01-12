const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const AuthMiddleware = require('../middleware/auth.middleware');
const Joi = require('joi');
const validateRequest = require('../middleware/validation.middleware');

// Validation schemas
const registerSchema = Joi.object({
  name: Joi.string().required().min(2).max(50),
  email: Joi.string().email().required(),
  phone: Joi.string().required().min(10).max(15),
  password: Joi.string().required().min(6),
  role: Joi.string().valid('customer', 'driver', 'vendor', 'admin').optional(),
});

const loginSchema = Joi.object({
  emailOrPhone: Joi.string().required(),
  password: Joi.string().required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().required().min(6),
});

// Routes
router.post('/register', validateRequest(registerSchema), AuthController.register);
router.post('/login', validateRequest(loginSchema), AuthController.login);
router.get('/profile', AuthMiddleware.authenticate, AuthController.getProfile);
router.put('/profile', AuthMiddleware.authenticate, AuthController.updateProfile);
router.put('/change-password', AuthMiddleware.authenticate, validateRequest(changePasswordSchema), AuthController.changePassword);

module.exports = router;

