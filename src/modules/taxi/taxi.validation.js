const Joi = require('joi');

const taxiValidation = {
  bookRide: Joi.object({
    vehicleType: Joi.string().valid('car', 'bike', 'auto').required(),
    pickup: Joi.object({
      address: Joi.string().required(),
      coordinates: Joi.array().items(Joi.number()).length(2).required(),
    }).required(),
    dropoff: Joi.object({
      address: Joi.string().required(),
      coordinates: Joi.array().items(Joi.number()).length(2).required(),
    }).required(),
    paymentMethod: Joi.string().valid('cash', 'card', 'wallet', 'upi').required(),
    scheduledTime: Joi.date().optional(),
  }),

  updateStatus: Joi.object({
    status: Joi.string()
      .valid('accepted', 'arrived', 'started', 'completed', 'cancelled')
      .required(),
  }),

  rateRide: Joi.object({
    rating: Joi.number().min(1).max(5).required(),
    review: Joi.string().optional(),
  }),
};

module.exports = taxiValidation;

