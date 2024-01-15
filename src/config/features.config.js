/**
 * Feature Configuration
 * Controls which modules are enabled/disabled
 */

module.exports = {
  enabledModules: {
    taxi: process.env.ENABLE_TAXI === 'true',
    restaurant: process.env.ENABLE_RESTAURANT === 'true' || true,
    grocery: process.env.ENABLE_GROCERY === 'true' || true,
    pharmacy: process.env.ENABLE_PHARMACY === 'true',
    meatShop: process.env.ENABLE_MEAT_SHOP === 'true',
  },

  // Module-specific configurations
  moduleConfig: {
    taxi: {
      supportedVehicleTypes: ['car', 'bike', 'auto'],
      maxRadius: 50, // km
      baseFare: 50,
      perKmFare: 10,
      perMinuteFare: 2,
    },
    restaurant: {
      supportedCuisines: ['italian', 'chinese', 'indian', 'american', 'mexican', 'thai'],
      maxDeliveryRadius: 10,
      deliveryFee: 30,
    },
    grocery: {
      maxDeliveryRadius: 15,
      deliveryFee: 20,
      categories: ['vegetables', 'fruits', 'dairy', 'bakery', 'beverages', 'snacks'],
    },
    pharmacy: {
      requirePrescription: true,
      maxDeliveryRadius: 20,
      deliveryFee: 25,
    },
    meatShop: {
      maxDeliveryRadius: 10,
      deliveryFee: 35,
      categories: ['chicken', 'mutton', 'fish', 'seafood'],
    },
  },

  // Get list of enabled modules
  getEnabledModules() {
    return Object.keys(this.enabledModules).filter(
      (module) => this.enabledModules[module]
    );
  },

  // Check if a module is enabled
  isModuleEnabled(moduleName) {
    return this.enabledModules[moduleName] === true;
  },
};

