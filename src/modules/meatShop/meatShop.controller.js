const MeatShopService = require('./meatShop.service');
const ApiResponse = require('../../core/utils/response');

class MeatShopController {
  static async createShop(req, res, next) {
    try {
      const shop = await MeatShopService.createShop(req.user._id, req.body);
      return ApiResponse.created(res, shop, 'Meat shop created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getNearbyShops(req, res, next) {
    try {
      const { longitude, latitude, maxDistance, page, limit } = req.query;
      const shops = await MeatShopService.getNearbyShops(
        [parseFloat(longitude), parseFloat(latitude)],
        maxDistance ? parseInt(maxDistance) : 10,
        page,
        limit
      );
      return ApiResponse.success(res, shops, 'Shops fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async addProduct(req, res, next) {
    try {
      const { shopId } = req.params;
      const product = await MeatShopService.addProduct(shopId, req.body);
      return ApiResponse.created(res, product, 'Product added successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getProducts(req, res, next) {
    try {
      const { shopId } = req.params;
      const { category } = req.query;
      const products = await MeatShopService.getProducts(shopId, category);
      return ApiResponse.success(res, products, 'Products fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async placeOrder(req, res, next) {
    try {
      const order = await MeatShopService.placeOrder(req.user._id, req.body);
      return ApiResponse.created(res, order, 'Order placed successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MeatShopController;

