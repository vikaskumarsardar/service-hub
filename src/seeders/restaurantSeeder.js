const { Restaurant } = require('../modules/restaurant/restaurant.model');
const { MenuItem } = require('../modules/restaurant/restaurant.model');

const seed = async (vendors) => {
  const locations = [
    { coordinates: [77.5946, 12.9716], address: '123 MG Road, Koramangala, Bangalore' },
    { coordinates: [77.6408, 12.9698], address: '456 ITPL Main Road, Whitefield, Bangalore' },
    { coordinates: [77.6101, 12.9344], address: '789 100 Feet Road, Indiranagar, Bangalore' },
    // Add Chandigarh locations for demo
    { coordinates: [76.6738432, 30.7331072], address: 'Sector 17, Chandigarh' },
    { coordinates: [76.7821, 30.7333], address: 'Sector 35, Chandigarh' },
  ];

  const restaurantData = [
    {
      name: 'Pizza Paradise',
      description: 'Best Italian pizzas in town with wood-fired oven',
      cuisineTypes: ['Italian', 'Pizza', 'Continental'],
      specialties: ['Margherita Pizza', 'Pasta Carbonara'],
      averageCostForTwo: 800,
      dietaryOptions: { vegetarian: true, vegan: true, halal: false },
      tableBookingAvailable: true,
    },
    {
      name: 'Spice Garden',
      description: 'Authentic Indian cuisine with traditional recipes',
      cuisineTypes: ['Indian', 'North Indian', 'South Indian'],
      specialties: ['Butter Chicken', 'Biryani', 'Masala Dosa'],
      averageCostForTwo: 600,
      dietaryOptions: { vegetarian: true, vegan: false, halal: true },
      tableBookingAvailable: false,
    },
    {
      name: 'The Chinese Wok',
      description: 'Pan-Asian cuisine with fresh ingredients',
      cuisineTypes: ['Chinese', 'Thai', 'Asian'],
      specialties: ['Dim Sum', 'Kung Pao Chicken', 'Pad Thai'],
      averageCostForTwo: 700,
      dietaryOptions: { vegetarian: true, vegan: true, halal: false },
      tableBookingAvailable: true,
    },
  ];

  const stores = [];
  const products = [];

  for (let i = 0; i < restaurantData.length; i++) {
    const restaurant = await Restaurant.create({
      vendor: vendors[i]._id,
      storeType: 'restaurant',
      ...restaurantData[i],
      location: {
        address: locations[i].address,
        coordinates: {
          type: 'Point',
          coordinates: locations[i].coordinates,
        },
      },
      phone: `+91900${i}000000`,
      email: `${restaurantData[i].name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      deliveryRadius: 10,
      deliveryFee: 40,
      minOrderAmount: 200,
      rating: {
        average: 4 + Math.random(),
        count: Math.floor(Math.random() * 500) + 100,
      },
      isActive: true,
      isVerified: true,
      isFeatured: i === 0,
    });

    stores.push(restaurant);

    // Create menu items for each restaurant
    const menuItems = await createMenuItems(restaurant._id, i);
    products.push(...menuItems);
  }

  return { stores, products };
};

const createMenuItems = async (restaurantId, restaurantIndex) => {
  const menuTemplates = [
    // Pizza Paradise menu
    [
      { name: 'Margherita Pizza', category: 'Pizza', price: 299, isVeg: true, spiceLevel: 'none', preparationTime: 20 },
      { name: 'Pepperoni Pizza', category: 'Pizza', price: 399, isVeg: false, spiceLevel: 'mild', preparationTime: 20 },
      { name: 'Veggie Supreme Pizza', category: 'Pizza', price: 349, isVeg: true, spiceLevel: 'mild', preparationTime: 25 },
      { name: 'Pasta Carbonara', category: 'Pasta', price: 249, isVeg: false, spiceLevel: 'none', preparationTime: 15 },
      { name: 'Penne Arrabiata', category: 'Pasta', price: 229, isVeg: true, spiceLevel: 'hot', preparationTime: 15 },
      { name: 'Caesar Salad', category: 'Salad', price: 199, isVeg: true, spiceLevel: 'none', preparationTime: 10 },
      { name: 'Garlic Bread', category: 'Sides', price: 99, isVeg: true, spiceLevel: 'none', preparationTime: 10 },
      { name: 'Tiramisu', category: 'Dessert', price: 149, isVeg: true, spiceLevel: 'none', preparationTime: 5 },
    ],
    // Spice Garden menu
    [
      { name: 'Butter Chicken', category: 'Main Course', price: 320, isVeg: false, spiceLevel: 'medium', preparationTime: 25 },
      { name: 'Paneer Butter Masala', category: 'Main Course', price: 280, isVeg: true, spiceLevel: 'medium', preparationTime: 20 },
      { name: 'Chicken Biryani', category: 'Rice', price: 299, isVeg: false, spiceLevel: 'hot', preparationTime: 30 },
      { name: 'Vegetable Biryani', category: 'Rice', price: 249, isVeg: true, spiceLevel: 'medium', preparationTime: 25 },
      { name: 'Masala Dosa', category: 'South Indian', price: 120, isVeg: true, spiceLevel: 'medium', preparationTime: 15 },
      { name: 'Idli Sambar', category: 'South Indian', price: 80, isVeg: true, spiceLevel: 'mild', preparationTime: 10 },
      { name: 'Tandoori Chicken', category: 'Tandoor', price: 350, isVeg: false, spiceLevel: 'hot', preparationTime: 30 },
      { name: 'Gulab Jamun', category: 'Dessert', price: 60, isVeg: true, spiceLevel: 'none', preparationTime: 5 },
    ],
    // Chinese Wok menu
    [
      { name: 'Kung Pao Chicken', category: 'Main Course', price: 320, isVeg: false, spiceLevel: 'hot', preparationTime: 20 },
      { name: 'Vegetable Spring Rolls', category: 'Starters', price: 180, isVeg: true, spiceLevel: 'mild', preparationTime: 15 },
      { name: 'Dim Sum Platter', category: 'Starters', price: 299, isVeg: false, spiceLevel: 'mild', preparationTime: 20 },
      { name: 'Pad Thai', category: 'Noodles', price: 280, isVeg: false, spiceLevel: 'medium', preparationTime: 18 },
      { name: 'Vegetable Fried Rice', category: 'Rice', price: 220, isVeg: true, spiceLevel: 'mild', preparationTime: 15 },
      { name: 'Sweet and Sour Chicken', category: 'Main Course', price: 310, isVeg: false, spiceLevel: 'mild', preparationTime: 20 },
      { name: 'Manchurian', category: 'Indo-Chinese', price: 240, isVeg: true, spiceLevel: 'hot', preparationTime: 18 },
      { name: 'Ice Cream', category: 'Dessert', price: 80, isVeg: true, spiceLevel: 'none', preparationTime: 2 },
    ],
  ];

  const items = [];
  const template = menuTemplates[restaurantIndex] || menuTemplates[0];

  for (const item of template) {
    const menuItem = await MenuItem.create({
      store: restaurantId,
      productType: 'menuItem',
      ...item,
      description: `Delicious ${item.name.toLowerCase()}`,
      cuisineType: ['Italian', 'Indian', 'Chinese'][restaurantIndex],
      isVegan: item.isVeg && Math.random() > 0.7,
      isGlutenFree: Math.random() > 0.8,
      calories: Math.floor(Math.random() * 500) + 200,
      portionSize: 'medium',
      customizationAvailable: true,
      stock: 100,
      isAvailable: true,
      rating: {
        average: 4 + Math.random(),
        count: Math.floor(Math.random() * 200) + 20,
      },
      isFeatured: Math.random() > 0.7,
      isPopular: Math.random() > 0.6,
    });

    items.push(menuItem);
  }

  return items;
};

module.exports = { seed };

