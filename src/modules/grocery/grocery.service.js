const { GroceryStore, GroceryProduct } = require('./grocery.model');
const Store = require('../../core/models/Store.model');
const Product = require('../../core/models/Product.model');
const Order = require('../../core/models/Order.model');
const OrderService = require('../../core/services/order.service');
const Helpers = require('../../core/utils/helpers');

class GroceryService {
  /**
   * Create grocery store
   */
  static async createStore(vendorId, storeData) {
    const store = await GroceryStore.create({
      ...storeData,
      vendor: vendorId,
      storeType: 'grocery',
    });
    return store;
  }

  /**
   * Get nearby stores
   */
  static async getNearbyStores(coordinates, maxDistance = 15, page = 1, limit = 20) {
    const { skip, limit: pageLimit } = Helpers.paginate(page, limit);

    const stores = await Store.find({
      storeType: 'grocery',
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
      storeType: 'grocery',
      isActive: true,
    });

    return Helpers.formatPaginationResponse(stores, page, limit, total);
  }

  /**
   * Get store details
   */
  static async getStoreDetails(storeId) {
    const store = await Store.findOne({
      _id: storeId,
      storeType: 'grocery',
    }).populate('vendor', 'name phone email');

    if (!store) {
      throw new Error('Store not found');
    }

    return store;
  }

  /**
   * Add product
   */
  static async addProduct(storeId, productData) {
    const store = await Store.findOne({
      _id: storeId,
      storeType: 'grocery',
    });
    
    if (!store) {
      throw new Error('Store not found');
    }

    const product = await GroceryProduct.create({
      ...productData,
      store: storeId,
      productType: 'groceryProduct',
    });

    return product;
  }

  /**
   * Get products
   */
  static async getProducts(storeId, category = null) {
    const query = {
      store: storeId,
      productType: 'groceryProduct',
      isAvailable: true,
    };
    
    if (category) {
      query.category = category;
    }

    const products = await Product.find(query);
    return products;
  }

  /**
   * Update product
   */
  static async updateProduct(productId, updates) {
    const product = await GroceryProduct.findOneAndUpdate(
      { _id: productId, productType: 'groceryProduct' },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }

  /**
   * Place order using OrderService with grocery configuration
   */
  static async placeOrder(customerId, orderData) {
    const config = {
      moduleName: 'Grocery Store',
      serviceType: 'grocery',
      getStore: async (data) => {
        return await Store.findOne({
          _id: data.storeId,
          storeType: 'grocery',
        });
      },
      processItems: async (items) => {
        let itemsTotal = 0;
        const processedItems = [];

        for (const item of items) {
          const product = await GroceryProduct.findOne({
            _id: item.productId,
            productType: 'groceryProduct',
          });
          
          if (!product || !product.isAvailable) {
            throw new Error(`Product ${item.productId} not available`);
          }

          if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}`);
          }

          itemsTotal += product.price * item.quantity;
          processedItems.push({
            name: product.name,
            quantity: item.quantity,
            price: product.price,
            image: product.image,
          });
        }

        return { items: processedItems, itemsTotal };
      },
      updateStock: async (items) => {
        for (const item of items) {
          await GroceryProduct.findByIdAndUpdate(
            item.productId,
            { $inc: { stock: -item.quantity } }
          );
        }
      },
      additionalFields: (data) => ({
        deliverySlot: data.deliverySlot,
        packagingPreference: data.packagingPreference || 'standard',
      }),
    };

    // Call OrderService with grocery config using bind
    const boundPlaceOrder = OrderService.placeOrder.bind(OrderService, config);
    return await boundPlaceOrder(orderData, customerId);
  }

  /**
   * Get store orders
   */
  static async getStoreOrders(storeId, page = 1, limit = 10) {
    const store = await Store.findOne({
      _id: storeId,
      storeType: 'grocery',
    });
    
    if (!store) {
      throw new Error('Store not found');
    }

    const { skip, limit: pageLimit } = Helpers.paginate(page, limit);

    const orders = await Order.find({
      vendor: store.vendor,
      serviceType: 'grocery',
    })
      .populate('customer', 'name phone')
      .populate('driver', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    const total = await Order.countDocuments({
      vendor: store.vendor,
      serviceType: 'grocery',
    });

    return Helpers.formatPaginationResponse(orders, page, limit, total);
  }
}

module.exports = GroceryService;
