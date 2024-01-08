const ApiResponse = require('../utils/response');

/**
 * Validation Middleware using Joi
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => detail.message);
      return ApiResponse.badRequest(res, 'Validation Error', errors);
    }

    next();
  };
};

module.exports = validateRequest;

