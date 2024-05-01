const { MeatShop } = require('../modules/meatShop/meatShop.model');
const { MeatProduct } = require('../modules/meatShop/meatShop.model');

const seed = async (vendors) => {
  const locations = [
    { coordinates: [77.6408, 12.9698], address: '33 Whitefield Main Road, Bangalore' },
    { coordinates: [77.5787, 12.9611], address: '67 HSR Layout Sector 1, Bangalore' },
  ];

  const shopData = [
    {
      name: 'Fresh Meat Corner',
      description: 'Premium quality fresh meat and seafood',
      isHalal: true,
      isKosher: false,
      meatTypes: ['chicken', 'mutton', 'fish', 'seafood'],
      freshGuarantee: true,
      customCuttingAvailable: true,
    },
    {
      name: 'The Butcher Shop',
      description: 'Fresh cuts delivered daily from local farms',
      isHalal: false,
      isKosher: false,
      meatTypes: ['chicken', 'mutton', 'beef', 'fish'],
      freshGuarantee: true,
      customCuttingAvailable: true,
    },
  ];

  const stores = [];
  const products = [];

  for (let i = 0; i < shopData.length; i++) {
    const shop = await MeatShop.create({
      vendor: vendors[i]._id,
      storeType: 'meatShop',
      ...shopData[i],
      location: {
        address: locations[i].address,
        coordinates: {
          type: 'Point',
          coordinates: locations[i].coordinates,
        },
      },
      phone: `+91600${i}000000`,
      email: `${shopData[i].name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      deliveryRadius: 10,
      deliveryFee: 35,
      minOrderAmount: 200,
      rating: {
        average: 4 + Math.random(),
        count: Math.floor(Math.random() * 200) + 50,
      },
      isActive: true,
      isVerified: true,
      isFeatured: i === 0,
    });

    stores.push(shop);

    // Create products for each shop
    const shopProducts = await createProducts(shop._id, i);
    products.push(...shopProducts);
  }

  return { stores, products };
};

const createProducts = async (shopId, shopIndex) => {
  const productTemplates = [
    // Chicken
    {
      name: 'Chicken Breast',
      category: 'chicken',
      meatCategory: 'chicken',
      cutType: 'breast',
      price: 280,
      unit: 'kg',
      isFresh: true,
      isFrozen: false,
    },
    {
      name: 'Chicken Drumstick',
      category: 'chicken',
      meatCategory: 'chicken',
      cutType: 'drumstick',
      price: 240,
      unit: 'kg',
      isFresh: true,
      isFrozen: false,
    },
    {
      name: 'Chicken Wings',
      category: 'chicken',
      meatCategory: 'chicken',
      cutType: 'wings',
      price: 220,
      unit: 'kg',
      isFresh: true,
      isFrozen: false,
    },
    {
      name: 'Whole Chicken',
      category: 'chicken',
      meatCategory: 'chicken',
      cutType: 'whole',
      price: 200,
      unit: 'kg',
      isFresh: true,
      isFrozen: false,
    },
    
    // Mutton
    {
      name: 'Mutton Curry Cut',
      category: 'mutton',
      meatCategory: 'mutton',
      cutType: 'curry cut',
      price: 650,
      unit: 'kg',
      isFresh: true,
      isFrozen: false,
    },
    {
      name: 'Mutton Boneless',
      category: 'mutton',
      meatCategory: 'mutton',
      cutType: 'boneless',
      price: 750,
      unit: 'kg',
      isFresh: true,
      isFrozen: false,
    },
    {
      name: 'Mutton Leg',
      category: 'mutton',
      meatCategory: 'mutton',
      cutType: 'leg',
      price: 680,
      unit: 'kg',
      isFresh: true,
      isFrozen: false,
    },
    
    // Fish
    {
      name: 'Pomfret',
      category: 'fish',
      meatCategory: 'fish',
      cutType: 'whole',
      price: 450,
      unit: 'kg',
      isFresh: true,
      isFrozen: false,
    },
    {
      name: 'Salmon Fillet',
      category: 'fish',
      meatCategory: 'fish',
      cutType: 'fillet',
      price: 850,
      unit: 'kg',
      isFresh: true,
      isFrozen: false,
    },
    {
      name: 'Rohu',
      category: 'fish',
      meatCategory: 'fish',
      cutType: 'whole',
      price: 320,
      unit: 'kg',
      isFresh: true,
      isFrozen: false,
    },
    
    // Seafood
    {
      name: 'Prawns Large',
      category: 'seafood',
      meatCategory: 'seafood',
      cutType: 'whole',
      price: 550,
      unit: 'kg',
      isFresh: true,
      isFrozen: false,
    },
    {
      name: 'Crab',
      category: 'seafood',
      meatCategory: 'seafood',
      cutType: 'whole',
      price: 480,
      unit: 'kg',
      isFresh: true,
      isFrozen: false,
    },
  ];

  const products = [];

  for (const template of productTemplates) {
    // Skip beef for shop 0 (halal doesn't typically have beef in India)
    // Skip pork for halal shop
    if (shopIndex === 0 && (template.meatCategory === 'beef' || template.meatCategory === 'pork')) {
      continue;
    }

    const bestBefore = new Date();
    bestBefore.setDate(bestBefore.getDate() + 2); // 2 days fresh

    const harvestDate = new Date();

    const product = await MeatProduct.create({
      store: shopId,
      productType: 'meatProduct',
      ...template,
      description: `Fresh ${template.name} - ${template.cutType}`,
      isHalal: shopIndex === 0,
      isKosher: false,
      isProcessed: false,
      isMarinated: Math.random() > 0.7,
      customCuttingAvailable: true,
      origin: 'Local Farm',
      farmSource: 'Karnataka Farms',
      bestBefore,
      harvestDate,
      stock: Math.floor(Math.random() * 50) + 20,
      lowStockThreshold: 10,
      isAvailable: true,
      rating: {
        average: 4 + Math.random(),
        count: Math.floor(Math.random() * 80) + 15,
      },
      isFeatured: Math.random() > 0.8,
      isPopular: template.meatCategory === 'chicken',
    });

    products.push(product);
  }

  return products;
};

module.exports = { seed };

