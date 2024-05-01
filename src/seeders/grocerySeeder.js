const { GroceryStore } = require('../modules/grocery/grocery.model');
const { GroceryProduct } = require('../modules/grocery/grocery.model');

const seed = async (vendors) => {
  const locations = [
    { coordinates: [77.5787, 12.9611], address: '15 HSR Layout, Bangalore' },
    { coordinates: [77.6412, 12.9889], address: '88 Marathahalli, Bangalore' },
  ];

  const storeData = [
    {
      name: 'Fresh Mart',
      description: 'Your daily fresh groceries delivered at your doorstep',
      storeCategories: ['vegetables', 'fruits', 'dairy', 'bakery', 'beverages', 'snacks'],
      organicAvailable: true,
      bulkOrdersAvailable: true,
    },
    {
      name: 'Green Valley Organics',
      description: '100% organic produce from local farms',
      storeCategories: ['vegetables', 'fruits', 'dairy', 'grains'],
      organicAvailable: true,
      bulkOrdersAvailable: false,
    },
  ];

  const stores = [];
  const products = [];

  for (let i = 0; i < storeData.length; i++) {
    const store = await GroceryStore.create({
      vendor: vendors[i]._id,
      storeType: 'grocery',
      ...storeData[i],
      location: {
        address: locations[i].address,
        coordinates: {
          type: 'Point',
          coordinates: locations[i].coordinates,
        },
      },
      phone: `+91800${i}000000`,
      email: `${storeData[i].name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      deliveryRadius: 15,
      deliveryFee: 20,
      minOrderAmount: 150,
      rating: {
        average: 4 + Math.random(),
        count: Math.floor(Math.random() * 300) + 50,
      },
      isActive: true,
      isVerified: true,
      isFeatured: i === 0,
    });

    stores.push(store);

    // Create products for each store
    const storeProducts = await createProducts(store._id, i);
    products.push(...storeProducts);
  }

  return { stores, products };
};

const createProducts = async (storeId, storeIndex) => {
  const productTemplates = [
    // Vegetables
    { name: 'Tomato', category: 'vegetables', price: 40, unit: 'kg', isOrganic: true, isFresh: true },
    { name: 'Onion', category: 'vegetables', price: 35, unit: 'kg', isOrganic: false, isFresh: true },
    { name: 'Potato', category: 'vegetables', price: 30, unit: 'kg', isOrganic: false, isFresh: true },
    { name: 'Carrot', category: 'vegetables', price: 50, unit: 'kg', isOrganic: true, isFresh: true },
    { name: 'Cucumber', category: 'vegetables', price: 45, unit: 'kg', isOrganic: false, isFresh: true },
    { name: 'Spinach', category: 'vegetables', price: 20, unit: 'piece', isOrganic: true, isFresh: true },
    
    // Fruits
    { name: 'Apple', category: 'fruits', price: 150, unit: 'kg', isOrganic: false, isFresh: true },
    { name: 'Banana', category: 'fruits', price: 50, unit: 'dozen', isOrganic: false, isFresh: true },
    { name: 'Orange', category: 'fruits', price: 80, unit: 'kg', isOrganic: true, isFresh: true },
    { name: 'Mango', category: 'fruits', price: 120, unit: 'kg', isOrganic: false, isFresh: true },
    { name: 'Grapes', category: 'fruits', price: 90, unit: 'kg', isOrganic: true, isFresh: true },
    
    // Dairy
    { name: 'Milk', category: 'dairy', price: 60, unit: 'l', isOrganic: false, isFresh: true, brand: 'Amul' },
    { name: 'Curd', category: 'dairy', price: 50, unit: 'pack', isOrganic: false, isFresh: true, brand: 'Mother Dairy' },
    { name: 'Butter', category: 'dairy', price: 50, unit: 'pack', isOrganic: false, isFresh: false, brand: 'Amul' },
    { name: 'Cheese', category: 'dairy', price: 150, unit: 'pack', isOrganic: false, isFresh: false, brand: 'Britannia' },
    
    // Bakery
    { name: 'Bread', category: 'bakery', price: 40, unit: 'piece', isOrganic: false, isFresh: true, brand: 'Britannia' },
    { name: 'Bun', category: 'bakery', price: 30, unit: 'pack', isOrganic: false, isFresh: true, brand: 'Modern' },
    
    // Beverages
    { name: 'Coca Cola', category: 'beverages', price: 80, unit: 'l', isOrganic: false, isFresh: false, brand: 'Coca Cola' },
    { name: 'Orange Juice', category: 'beverages', price: 120, unit: 'l', isOrganic: true, isFresh: true, brand: 'Real' },
    
    // Snacks
    { name: 'Potato Chips', category: 'snacks', price: 20, unit: 'pack', isOrganic: false, isFresh: false, brand: 'Lays' },
    { name: 'Cookies', category: 'snacks', price: 30, unit: 'pack', isOrganic: false, isFresh: false, brand: 'Parle-G' },
  ];

  const products = [];

  for (const template of productTemplates) {
    // Skip some products for second store to create variety
    if (storeIndex === 1 && !template.isOrganic) continue;

    const product = await GroceryProduct.create({
      store: storeId,
      productType: 'groceryProduct',
      ...template,
      description: `Fresh ${template.name.toLowerCase()} - ${template.category}`,
      unitValue: 1,
      countryOfOrigin: 'India',
      stock: Math.floor(Math.random() * 100) + 50,
      lowStockThreshold: 20,
      isAvailable: true,
      rating: {
        average: 4 + Math.random(),
        count: Math.floor(Math.random() * 100) + 10,
      },
      isFeatured: Math.random() > 0.8,
      isPopular: Math.random() > 0.7,
      bulkAvailable: Math.random() > 0.6,
      minBulkQuantity: 10,
    });

    products.push(product);
  }

  return products;
};

module.exports = { seed };

