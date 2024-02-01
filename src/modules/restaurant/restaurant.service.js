const { Restaurant, MenuItem } = require('./restaurant.model');
const Store = require('../../core/models/Store.model');
const Product = require('../../core/models/Product.model');
const Order = require('../../core/models/Order.model');
const OrderService = require('../../core/services/order.service');
const Helpers = require('../../core/utils/helpers');

class RestaurantService {
  /**
   * Create a restaurant
   */
  static async createRestaurant(vendorId, restaurantData) {
    const restaurant = await Restaurant.create({
      ...restaurantData,
      vendor: vendorId,
      storeType: 'restaurant',
    });
    return restaurant;
  }

  /**
   * Get nearby restaurants
   */
  static async getNearbyRestaurants(coordinates, maxDistance = 10, page = 1, limit = 20) {
    const { skip, limit: pageLimit } = Helpers.paginate(page, limit);

    const restaurants = await Store.find({
      storeType: 'restaurant',
      isActive: true,
      'location.coordinates.coordinates': {  // Fixed: Added second 'coordinates'
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: coordinates,
          },
          $maxDistance: maxDistance * 1000,
        },
      },
    })
      .populate('vendor', 'name phone')
      .skip(skip)
      .limit(pageLimit);

    const total = await Store.countDocuments({
      storeType: 'restaurant',
      isActive: true,
    });

    return Helpers.formatPaginationResponse(restaurants, page, limit, total);
  }

  /**
   * Get restaurant details
   */
  static async getRestaurantDetails(restaurantId) {
    const restaurant = await Store.findOne({
      _id: restaurantId,
      storeType: 'restaurant',
    }).populate('vendor', 'name phone email');

    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    return restaurant;
  }

  /**
   * Add menu item
   */
  static async addMenuItem(restaurantId, menuItemData) {
    const restaurant = await Store.findOne({
      _id: restaurantId,
      storeType: 'restaurant',
    });
    
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    const menuItem = await MenuItem.create({
      ...menuItemData,
      store: restaurantId,
      productType: 'menuItem',
    });

    return menuItem;
  }

  /**
   * Get menu items
   */
  static async getMenuItems(restaurantId, category = null) {
    const query = {
      store: restaurantId,
      productType: 'menuItem',
      isAvailable: true,
    };
    
    if (category) {
      query.category = category;
    }

    const menuItems = await Product.find(query);
    return menuItems;
  }

  /**
   * Update menu item
   */
  static async updateMenuItem(menuItemId, updates) {
    const menuItem = await MenuItem.findOneAndUpdate(
      { _id: menuItemId, productType: 'menuItem' },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!menuItem) {
      throw new Error('Menu item not found');
    }

    return menuItem;
  }

  /**
   * Delete menu item
   */
  static async deleteMenuItem(menuItemId) {
    const menuItem = await MenuItem.findOneAndDelete({
      _id: menuItemId,
      productType: 'menuItem',
    });

    if (!menuItem) {
      throw new Error('Menu item not found');
    }

    return menuItem;
  }

  /**
   * Place order using OrderService with restaurant configuration
   */
  static async placeOrder(customerId, orderData) {
    const config = {
      moduleName: 'Restaurant',
      serviceType: 'restaurant',
      getStore: async (data) => {
        return await Store.findOne({
          _id: data.restaurantId,
          storeType: 'restaurant',
        });
      },
      processItems: async (items) => {
        let itemsTotal = 0;
        const processedItems = [];

        for (const item of items) {
          const menuItem = await MenuItem.findOne({
            _id: item.menuItemId,
            productType: 'menuItem',
          });
          
          if (!menuItem || !menuItem.isAvailable) {
            throw new Error(`Item ${item.menuItemId} not available`);
          }

          itemsTotal += menuItem.price * item.quantity;
          processedItems.push({
            name: menuItem.name,
            quantity: item.quantity,
            price: menuItem.price,
            image: menuItem.image,
            description: menuItem.description,
          });
        }

        return { items: processedItems, itemsTotal };
      },
      updateStock: async (items) => {
        for (const item of items) {
          await MenuItem.findByIdAndUpdate(
            item.menuItemId,
            { $inc: { stock: -item.quantity } }
          );
        }
      },
      additionalFields: (data) => ({
        preferredDeliveryTime: data.preferredDeliveryTime,
        dietaryPreferences: data.dietaryPreferences || [],
      }),
    };

    // Call OrderService.placeOrder with restaurant config
    return await OrderService.placeOrder.call(OrderService, config, orderData, customerId);
  }

  /**
   * Get restaurant orders
   */
  static async getRestaurantOrders(restaurantId, page = 1, limit = 10) {
    const restaurant = await Store.findOne({
      _id: restaurantId,
      storeType: 'restaurant',
    });
    
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    const { skip, limit: pageLimit } = Helpers.paginate(page, limit);

    const orders = await Order.find({
      vendor: restaurant.vendor,
      serviceType: 'restaurant',
    })
      .populate('customer', 'name phone')
      .populate('driver', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    const total = await Order.countDocuments({
      vendor: restaurant.vendor,
      serviceType: 'restaurant',
    });

    return Helpers.formatPaginationResponse(orders, page, limit, total);
  }
}

module.exports = RestaurantService;
