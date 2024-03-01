const { MeatShop, MeatProduct } = require('./meatShop.model');
const Store = require('../../core/models/Store.model');
const Product = require('../../core/models/Product.model');
const Order = require('../../core/models/Order.model');
const OrderService = require('../../core/services/order.service');
const Helpers = require('../../core/utils/helpers');

class MeatShopService {
  /**
   * Create meat shop
   */
  static async createShop(vendorId, shopData) {
    const shop = await MeatShop.create({
      ...shopData,
      vendor: vendorId,
      storeType: 'meatShop',
    });
    return shop;
  }

  /**
   * Get nearby shops
   */
  static async getNearbyShops(coordinates, maxDistance = 10, page = 1, limit = 20) {
    const { skip, limit: pageLimit } = Helpers.paginate(page, limit);

    const shops = await Store.find({
      storeType: 'meatShop',
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
      storeType: 'meatShop',
      isActive: true,
    });

    return Helpers.formatPaginationResponse(shops, page, limit, total);
  }

  /**
   * Get halal shops
   */
  static async getHalalShops(coordinates, maxDistance = 10) {
    const shops = await MeatShop.find({
      isHalal: true,
      isActive: true,
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: coordinates,
          },
          $maxDistance: maxDistance * 1000,
        },
      },
    }).populate('vendor', 'name phone');

    return shops;
  }

  /**
   * Get shop details
   */
  static async getShopDetails(shopId) {
    const shop = await Store.findOne({
      _id: shopId,
      storeType: 'meatShop',
    }).populate('vendor', 'name phone email');

    if (!shop) {
      throw new Error('Shop not found');
    }

    return shop;
  }

  /**
   * Add product
   */
  static async addProduct(shopId, productData) {
    const shop = await Store.findOne({
      _id: shopId,
      storeType: 'meatShop',
    });
    
    if (!shop) {
      throw new Error('Shop not found');
    }

    const product = await MeatProduct.create({
      ...productData,
      store: shopId,
      productType: 'meatProduct',
    });

    return product;
  }

  /**
   * Get products
   */
  static async getProducts(shopId, category = null) {
    const query = {
      store: shopId,
      productType: 'meatProduct',
      isAvailable: true,
    };
    
    if (category) {
      query.meatCategory = category;
    }

    const products = await Product.find(query);
    return products;
  }

  /**
   * Get products by meat type
   */
  static async getProductsByMeatType(shopId, meatCategory) {
    const products = await MeatProduct.find({
      store: shopId,
      meatCategory: meatCategory,
      isAvailable: true,
    });

    return products;
  }

  /**
   * Place order using OrderService with meat shop configuration
   */
  static async placeOrder(customerId, orderData) {
    const config = {
      moduleName: 'Meat Shop',
      serviceType: 'meatShop',
      getStore: async (data) => {
        return await Store.findOne({
          _id: data.shopId,
          storeType: 'meatShop',
        });
      },
      processItems: async (items) => {
        let itemsTotal = 0;
        const processedItems = [];

        for (const item of items) {
          const product = await MeatProduct.findOne({
            _id: item.productId,
            productType: 'meatProduct',
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
            description: `${product.meatCategory} - ${product.cutType || 'Standard cut'}`,
          });
        }

        return { items: processedItems, itemsTotal };
      },
      updateStock: async (items) => {
        for (const item of items) {
          await MeatProduct.findByIdAndUpdate(
            item.productId,
            { $inc: { stock: -item.quantity } }
          );
        }
      },
      additionalFields: (data) => ({
        cuttingPreferences: data.cuttingPreferences || [],
        packagingType: data.packagingType || 'standard',
        isHalal: data.isHalal,
      }),
    };

    // Call OrderService with meat shop config
    return await OrderService.placeOrder.call(OrderService, config, orderData, customerId);
  }
}

module.exports = MeatShopService;
