const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const ApiResponse = require('../utils/response');

/**
 * Authentication Middleware
 */
class AuthMiddleware {
  /**
   * Verify JWT token and authenticate user
   */
  static async authenticate(req, res, next) {
    try {
      // Get token from header
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return ApiResponse.unauthorized(res, 'No token provided');
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return ApiResponse.unauthorized(res, 'User not found');
      }

      if (!user.isActive) {
        return ApiResponse.forbidden(res, 'Account is deactivated');
      }

      // Attach user to request
      req.user = user;
      next();
    } catch (error) {
      return ApiResponse.unauthorized(res, 'Invalid or expired token');
    }
  }

  /**
   * Check if user has specific role
   */
  static authorize(...roles) {
    return (req, res, next) => {
      if (!req.user) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      if (!roles.includes(req.user.role)) {
        return ApiResponse.forbidden(
          res,
          'You do not have permission to perform this action'
        );
      }

      next();
    };
  }

  /**
   * Optional authentication (doesn't fail if no token)
   */
  static async optionalAuth(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (user && user.isActive) {
          req.user = user;
        }
      }
      next();
    } catch (error) {
      next();
    }
  }
}

module.exports = AuthMiddleware;

