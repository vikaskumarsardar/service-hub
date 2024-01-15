const Order = require('../models/Order.model');
const Helpers = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Universal Order Service
 * Uses configuration object to handle different module-specific logic
 */
class OrderService {
  /**
   * Place order with module-specific configuration
   * @param {Object} config - Module configuration
   * @param {Function} config.validateItems - Validate items function
   * @param {Function} config.processItems - Process items function  
   * @param {Function} config.getStore - Get store function
   * @param {Function} config.updateStock - Update stock function
   * @param {Object} orderData - Order data from request
   * @param {String} userId - Customer ID
   */
  static async placeOrder(config, orderData, userId) {
    try {
      // Get store using module-specific function
      const store = await config.getStore(orderData);
      
      if (!store) {
        throw new Error(`${config.moduleName} not found`);
      }

      // Validate and process items using module-specific logic
      const { items: processedItems, itemsTotal } = await config.processItems(orderData.items);

      // Check minimum order amount
      if (itemsTotal < store.minOrderAmount) {
        throw new Error(`Minimum order amount is ₹${store.minOrderAmount}`);
      }

      // Calculate pricing
      const deliveryFee = store.deliveryFee || 0;
      const tax = Math.round(itemsTotal * 0.18 * 100) / 100; // 18% GST
      const discount = orderData.discount || 0;
      const total = itemsTotal + deliveryFee + tax - discount;

      // Create order
      const order = await Order.create({
        customer: userId,
        vendor: store.vendor,
        serviceType: config.serviceType,
        items: processedItems,
        pickupLocation: {
          address: store.location?.address,
          coordinates: store.location?.coordinates,
        },
        deliveryLocation: orderData.deliveryLocation,
        pricing: {
          itemsTotal,
          deliveryFee,
          tax,
          discount,
          total,
        },
        payment: {
          method: orderData.paymentMethod,
        },
        deliveryInstructions: orderData.deliveryInstructions,
        ...config.additionalFields?.(orderData) // Module-specific fields
      });

      // Update stock using module-specific function
      if (config.updateStock) {
        await config.updateStock(orderData.items);
      }

      // Post-processing callback
      if (config.postProcess) {
        await config.postProcess(order, orderData);
      }

      return await order.populate(['customer', 'vendor']);
    } catch (error) {
      logger.error(`${config.moduleName} order error:`, error);
      throw error;
    }
  }

  /**
   * Get user orders
   */
  static async getUserOrders(serviceType, userId, page = 1, limit = 10) {
    const { skip, limit: pageLimit } = Helpers.paginate(page, limit);

    const orders = await Order.find({
      customer: userId,
      serviceType: serviceType,
    })
      .populate('vendor', 'name phone email')
      .populate('driver', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    const total = await Order.countDocuments({
      customer: userId,
      serviceType: serviceType,
    });

    return Helpers.formatPaginationResponse(orders, page, limit, total);
  }

  /**
   * Get order details
   */
  static async getOrderDetails(orderId, userId, serviceType = null) {
    const query = { _id: orderId, customer: userId };
    if (serviceType) {
      query.serviceType = serviceType;
    }

    const order = await Order.findOne(query)
      .populate('customer', 'name phone email')
      .populate('vendor', 'name phone email')
      .populate('driver', 'name phone vehicleInfo');

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(orderId, status, userId, role = 'customer', serviceType = null) {
    const validStatuses = [
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'assigned',
      'picked_up',
      'in_transit',
      'delivered',
      'cancelled',
    ];

    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    const query = { _id: orderId };
    if (serviceType) {
      query.serviceType = serviceType;
    }

    // Role-based access
    if (role === 'customer') {
      query.customer = userId;
    } else if (role === 'vendor') {
      query.vendor = userId;
    }

    const order = await Order.findOneAndUpdate(
      query,
      {
        status,
        ...(status === 'delivered' && { actualDeliveryTime: new Date() }),
        ...(status === 'cancelled' && { cancelledAt: new Date() }),
      },
      { new: true }
    );

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }

  /**
   * Get vendor orders
   */
  static async getVendorOrders(vendorId, serviceType, page = 1, limit = 10) {
    const { skip, limit: pageLimit } = Helpers.paginate(page, limit);

    const orders = await Order.find({
      vendor: vendorId,
      serviceType: serviceType,
    })
      .populate('customer', 'name phone')
      .populate('driver', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    const total = await Order.countDocuments({
      vendor: vendorId,
      serviceType: serviceType,
    });

    return Helpers.formatPaginationResponse(orders, page, limit, total);
  }
}

module.exports = OrderService;
