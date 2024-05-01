const User = require('../core/models/User.model');

const seed = async () => {
  // Sample locations (coordinates: [longitude, latitude])
  const locations = [
    { coordinates: [77.5946, 12.9716], address: 'Koramangala, Bangalore' },
    { coordinates: [77.6408, 12.9698], address: 'Whitefield, Bangalore' },
    { coordinates: [77.6101, 12.9344], address: 'Indiranagar, Bangalore' },
    { coordinates: [77.5787, 12.9611], address: 'HSR Layout, Bangalore' },
    { coordinates: [77.6412, 12.9889], address: 'Marathahalli, Bangalore' },
  ];

  // Create vendors
  const vendors = [];
  for (let i = 0; i < 5; i++) {
    const vendor = await User.create({
      name: `Vendor ${i + 1}`,
      email: `vendor${i + 1}@example.com`,
      phone: `+91900000000${i}`,
      password: 'password123',
      role: 'vendor',
      location: {
        type: 'Point',
        coordinates: locations[i].coordinates,
      },
      address: {
        street: locations[i].address,
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
      },
      isVerified: true,
    });
    vendors.push(vendor);
  }

  // Create customers
  const customers = [];
  for (let i = 0; i < 10; i++) {
    const customer = await User.create({
      name: `Customer ${i + 1}`,
      email: `customer${i + 1}@example.com`,
      phone: `+91800000000${i}`,
      password: 'password123',
      role: 'customer',
      location: {
        type: 'Point',
        coordinates: locations[i % 5].coordinates,
      },
      isVerified: true,
    });
    customers.push(customer);
  }

  // Create drivers
  const drivers = [];
  for (let i = 0; i < 5; i++) {
    const driver = await User.create({
      name: `Driver ${i + 1}`,
      email: `driver${i + 1}@example.com`,
      phone: `+91700000000${i}`,
      password: 'password123',
      role: 'driver',
      location: {
        type: 'Point',
        coordinates: locations[i].coordinates,
      },
      vehicleInfo: {
        type: ['car', 'bike', 'auto'][i % 3],
        model: 'Honda City',
        plateNumber: `KA01AB${1000 + i}`,
        color: 'White',
      },
      isVerified: true,
      isOnline: true,
    });
    drivers.push(driver);
  }

  return {
    vendors,
    customers,
    drivers,
    all: [...vendors, ...customers, ...drivers],
  };
};

module.exports = { seed };

