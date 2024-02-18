const PharmacyService = require('./pharmacy.service');
const ApiResponse = require('../../core/utils/response');

class PharmacyController {
  static async createPharmacy(req, res, next) {
    try {
      const pharmacy = await PharmacyService.createPharmacy(req.user._id, req.body);
      return ApiResponse.created(res, pharmacy, 'Pharmacy created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getNearbyPharmacies(req, res, next) {
    try {
      const { longitude, latitude, maxDistance, page, limit } = req.query;
      const pharmacies = await PharmacyService.getNearbyPharmacies(
        [parseFloat(longitude), parseFloat(latitude)],
        maxDistance ? parseInt(maxDistance) : 20,
        page,
        limit
      );
      return ApiResponse.success(res, pharmacies, 'Pharmacies fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async addMedicine(req, res, next) {
    try {
      const { pharmacyId } = req.params;
      const medicine = await PharmacyService.addMedicine(pharmacyId, req.body);
      return ApiResponse.created(res, medicine, 'Medicine added successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getMedicines(req, res, next) {
    try {
      const { pharmacyId } = req.params;
      const { category } = req.query;
      const medicines = await PharmacyService.getMedicines(pharmacyId, category);
      return ApiResponse.success(res, medicines, 'Medicines fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async placeOrder(req, res, next) {
    try {
      const order = await PharmacyService.placeOrder(req.user._id, req.body);
      return ApiResponse.created(res, order, 'Order placed successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PharmacyController;

