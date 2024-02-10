const GroceryService = require('./grocery.service');
const ApiResponse = require('../../core/utils/response');

class GroceryController {
  static async createStore(req, res, next) {
    try {
      const store = await GroceryService.createStore(req.user._id, req.body);
      return ApiResponse.created(res, store, 'Store created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getNearbyStores(req, res, next) {
    try {
      const { longitude, latitude, maxDistance, page, limit } = req.query;
      const stores = await GroceryService.getNearbyStores(
        [parseFloat(longitude), parseFloat(latitude)],
        maxDistance ? parseInt(maxDistance) : 15,
        page,
        limit
      );
      return ApiResponse.success(res, stores, 'Stores fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async addProduct(req, res, next) {
    try {
      const { storeId } = req.params;
      const product = await GroceryService.addProduct(storeId, req.body);
      return ApiResponse.created(res, product, 'Product added successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getProducts(req, res, next) {
    try {
      const { storeId } = req.params;
      const { category } = req.query;
      const products = await GroceryService.getProducts(storeId, category);
      return ApiResponse.success(res, products, 'Products fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async placeOrder(req, res, next) {
    try {
      const order = await GroceryService.placeOrder(req.user._id, req.body);
      return ApiResponse.created(res, order, 'Order placed successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = GroceryController;

