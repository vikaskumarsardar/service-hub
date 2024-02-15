const { Pharmacy, Medicine } = require('./pharmacy.model');
const Store = require('../../core/models/Store.model');
const Product = require('../../core/models/Product.model');
const Order = require('../../core/models/Order.model');
const OrderService = require('../../core/services/order.service');
const Helpers = require('../../core/utils/helpers');

class PharmacyService {
  /**
   * Create pharmacy
   */
  static async createPharmacy(vendorId, pharmacyData) {
    const pharmacy = await Pharmacy.create({
      ...pharmacyData,
      vendor: vendorId,
      storeType: 'pharmacy',
    });
    return pharmacy;
  }

  /**
   * Get nearby pharmacies
   */
  static async getNearbyPharmacies(coordinates, maxDistance = 20, page = 1, limit = 20) {
    const { skip, limit: pageLimit } = Helpers.paginate(page, limit);

    const pharmacies = await Store.find({
      storeType: 'pharmacy',
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
      storeType: 'pharmacy',
      isActive: true,
    });

    return Helpers.formatPaginationResponse(pharmacies, page, limit, total);
  }

  /**
   * Get 24/7 pharmacies
   */
  static async get24HourPharmacies(coordinates, maxDistance = 20) {
    const pharmacies = await Pharmacy.find({
      is24Hours: true,
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

    return pharmacies;
  }

  /**
   * Get pharmacy details
   */
  static async getPharmacyDetails(pharmacyId) {
    const pharmacy = await Store.findOne({
      _id: pharmacyId,
      storeType: 'pharmacy',
    }).populate('vendor', 'name phone email');

    if (!pharmacy) {
      throw new Error('Pharmacy not found');
    }

    return pharmacy;
  }

  /**
   * Add medicine
   */
  static async addMedicine(pharmacyId, medicineData) {
    const pharmacy = await Store.findOne({
      _id: pharmacyId,
      storeType: 'pharmacy',
    });
    
    if (!pharmacy) {
      throw new Error('Pharmacy not found');
    }

    const medicine = await Medicine.create({
      ...medicineData,
      store: pharmacyId,
      productType: 'medicine',
    });

    return medicine;
  }

  /**
   * Get medicines
   */
  static async getMedicines(pharmacyId, category = null) {
    const query = {
      store: pharmacyId,
      productType: 'medicine',
      isAvailable: true,
    };
    
    if (category) {
      query.category = category;
    }

    const medicines = await Product.find(query);
    return medicines;
  }

  /**
   * Search medicines by name
   */
  static async searchMedicines(searchTerm, coordinates = null, maxDistance = 20) {
    const query = {
      productType: 'medicine',
      isAvailable: true,
      $text: { $search: searchTerm },
    };

    let medicines = await Product.find(query)
      .populate('store', 'name location')
      .limit(50);

    // If coordinates provided, sort by nearby pharmacies
    if (coordinates && medicines.length > 0) {
      const storeIds = medicines.map((m) => m.store._id);
      const nearbyStores = await Store.find({
        _id: { $in: storeIds },
        'location.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: coordinates,
            },
            $maxDistance: maxDistance * 1000,
          },
        },
      });

      // Sort medicines by store proximity
      const storeOrder = new Map(nearbyStores.map((s, i) => [s._id.toString(), i]));
      medicines.sort((a, b) => {
        const orderA = storeOrder.get(a.store._id.toString()) ?? 999;
        const orderB = storeOrder.get(b.store._id.toString()) ?? 999;
        return orderA - orderB;
      });
    }

    return medicines;
  }

  /**
   * Place order using OrderService with pharmacy configuration
   */
  static async placeOrder(customerId, orderData) {
    const config = {
      moduleName: 'Pharmacy',
      serviceType: 'pharmacy',
      getStore: async (data) => {
        return await Store.findOne({
          _id: data.pharmacyId,
          storeType: 'pharmacy',
        });
      },
      processItems: async (items) => {
        let itemsTotal = 0;
        const processedItems = [];
        let requiresPrescription = false;

        for (const item of items) {
          const medicine = await Medicine.findOne({
            _id: item.medicineId,
            productType: 'medicine',
          });
          
          if (!medicine || !medicine.isAvailable) {
            throw new Error(`Medicine ${item.medicineId} not available`);
          }

          if (medicine.requiresPrescription) {
            requiresPrescription = true;
          }

          if (medicine.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${medicine.name}`);
          }

          itemsTotal += medicine.price * item.quantity;
          processedItems.push({
            name: medicine.name,
            quantity: item.quantity,
            price: medicine.price,
            image: medicine.image,
            description: medicine.description,
          });
        }

        if (requiresPrescription && !orderData.prescription) {
          throw new Error('Prescription required for this order');
        }

        return { items: processedItems, itemsTotal };
      },
      updateStock: async (items) => {
        for (const item of items) {
          await Medicine.findByIdAndUpdate(
            item.medicineId,
            { $inc: { stock: -item.quantity } }
          );
        }
      },
      additionalFields: (data) => ({
        prescription: data.prescription,
        urgency: data.urgency || 'normal',
        patientName: data.patientName,
      }),
    };

    // Call OrderService using apply
    return await OrderService.placeOrder.apply(OrderService, [config, orderData, customerId]);
  }
}

module.exports = PharmacyService;
