const RestaurantService = require('./restaurant.service');
const ApiResponse = require('../../core/utils/response');

class RestaurantController {
  /**
   * Create restaurant
   */
  static async createRestaurant(req, res, next) {
    try {
      const restaurant = await RestaurantService.createRestaurant(
        req.user._id,
        req.body
      );
      return ApiResponse.created(res, restaurant, 'Restaurant created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get nearby restaurants
   */
  static async getNearbyRestaurants(req, res, next) {
    try {
      const { longitude, latitude, maxDistance, page, limit } = req.query;
      const restaurants = await RestaurantService.getNearbyRestaurants(
        [parseFloat(longitude), parseFloat(latitude)],
        maxDistance ? parseInt(maxDistance) : 10,
        page,
        limit
      );
      return ApiResponse.success(res, restaurants, 'Restaurants fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get restaurant details
   */
  static async getRestaurantDetails(req, res, next) {
    try {
      const { restaurantId } = req.params;
      const restaurant = await RestaurantService.getRestaurantDetails(restaurantId);
      return ApiResponse.success(res, restaurant, 'Restaurant details fetched');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add menu item
   */
  static async addMenuItem(req, res, next) {
    try {
      const { restaurantId } = req.params;
      const menuItem = await RestaurantService.addMenuItem(restaurantId, req.body);
      return ApiResponse.created(res, menuItem, 'Menu item added successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get menu items
   */
  static async getMenuItems(req, res, next) {
    try {
      const { restaurantId } = req.params;
      const { category } = req.query;
      const menuItems = await RestaurantService.getMenuItems(restaurantId, category);
      return ApiResponse.success(res, menuItems, 'Menu items fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Place order
   */
  static async placeOrder(req, res, next) {
    try {
      const order = await RestaurantService.placeOrder(req.user._id, req.body);
      return ApiResponse.created(res, order, 'Order placed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get restaurant orders
   */
  static async getRestaurantOrders(req, res, next) {
    try {
      const { restaurantId } = req.params;
      const { page, limit } = req.query;
      const orders = await RestaurantService.getRestaurantOrders(
        restaurantId,
        page,
        limit
      );
      return ApiResponse.success(res, orders, 'Orders fetched successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RestaurantController;

