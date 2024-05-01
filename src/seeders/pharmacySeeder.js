const { Pharmacy } = require('../modules/pharmacy/pharmacy.model');
const { Medicine } = require('../modules/pharmacy/pharmacy.model');

const seed = async (vendors) => {
  const locations = [
    { coordinates: [77.6101, 12.9344], address: '45 Indiranagar Main Road, Bangalore' },
    { coordinates: [77.5946, 12.9716], address: '78 Koramangala 4th Block, Bangalore' },
  ];

  const pharmacyData = [
    {
      name: 'Apollo Pharmacy',
      description: '24/7 pharmacy with wide range of medicines and healthcare products',
      licenseNumber: 'PH/KA/2023/001234',
      is24Hours: true,
      prescriptionRequired: true,
      emergencyServices: true,
      hasPharmacist: true,
    },
    {
      name: 'MedPlus',
      description: 'Trusted pharmacy chain with quality medicines',
      licenseNumber: 'PH/KA/2023/005678',
      is24Hours: false,
      prescriptionRequired: true,
      emergencyServices: false,
      hasPharmacist: true,
    },
  ];

  const stores = [];
  const products = [];

  for (let i = 0; i < pharmacyData.length; i++) {
    const pharmacy = await Pharmacy.create({
      vendor: vendors[i]._id,
      storeType: 'pharmacy',
      ...pharmacyData[i],
      location: {
        address: locations[i].address,
        coordinates: {
          type: 'Point',
          coordinates: locations[i].coordinates,
        },
      },
      phone: `+91700${i}000000`,
      email: `${pharmacyData[i].name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      deliveryRadius: 20,
      deliveryFee: 25,
      minOrderAmount: 100,
      rating: {
        average: 4.5 + Math.random() * 0.5,
        count: Math.floor(Math.random() * 500) + 200,
      },
      isActive: true,
      isVerified: true,
      isFeatured: i === 0,
    });

    stores.push(pharmacy);

    // Create medicines for each pharmacy
    const medicines = await createMedicines(pharmacy._id);
    products.push(...medicines);
  }

  return { stores, products };
};

const createMedicines = async (pharmacyId) => {
  const medicineTemplates = [
    // Common OTC medicines
    {
      name: 'Paracetamol 500mg',
      category: 'Pain Relief',
      price: 20,
      genericName: 'Paracetamol',
      manufacturer: 'Cipla',
      requiresPrescription: false,
      medicineType: 'tablet',
      strength: '500mg',
      packSize: '10 tablets',
      schedule: 'none',
    },
    {
      name: 'Ibuprofen 400mg',
      category: 'Pain Relief',
      price: 35,
      genericName: 'Ibuprofen',
      manufacturer: 'Sun Pharma',
      requiresPrescription: false,
      medicineType: 'tablet',
      strength: '400mg',
      packSize: '10 tablets',
      schedule: 'none',
    },
    {
      name: 'Cetirizine 10mg',
      category: 'Allergy',
      price: 15,
      genericName: 'Cetirizine',
      manufacturer: 'Dr. Reddy\'s',
      requiresPrescription: false,
      medicineType: 'tablet',
      strength: '10mg',
      packSize: '10 tablets',
      schedule: 'none',
    },
    
    // Prescription medicines
    {
      name: 'Amoxicillin 500mg',
      category: 'Antibiotic',
      price: 120,
      genericName: 'Amoxicillin',
      manufacturer: 'GSK',
      requiresPrescription: true,
      medicineType: 'capsule',
      strength: '500mg',
      packSize: '15 capsules',
      schedule: 'H',
    },
    {
      name: 'Azithromycin 500mg',
      category: 'Antibiotic',
      price: 180,
      genericName: 'Azithromycin',
      manufacturer: 'Cipla',
      requiresPrescription: true,
      medicineType: 'tablet',
      strength: '500mg',
      packSize: '3 tablets',
      schedule: 'H',
    },
    {
      name: 'Metformin 500mg',
      category: 'Diabetes',
      price: 45,
      genericName: 'Metformin',
      manufacturer: 'Sun Pharma',
      requiresPrescription: true,
      medicineType: 'tablet',
      strength: '500mg',
      packSize: '15 tablets',
      schedule: 'H',
    },
    {
      name: 'Atorvastatin 10mg',
      category: 'Cholesterol',
      price: 85,
      genericName: 'Atorvastatin',
      manufacturer: 'Pfizer',
      requiresPrescription: true,
      medicineType: 'tablet',
      strength: '10mg',
      packSize: '10 tablets',
      schedule: 'H',
    },
    
    // Syrups
    {
      name: 'Cough Syrup',
      category: 'Cold & Flu',
      price: 95,
      genericName: 'Dextromethorphan',
      manufacturer: 'Dabur',
      requiresPrescription: false,
      medicineType: 'syrup',
      strength: '100ml',
      packSize: '1 bottle',
      schedule: 'none',
    },
    
    // Vitamins
    {
      name: 'Vitamin C Tablets',
      category: 'Vitamins',
      price: 150,
      genericName: 'Ascorbic Acid',
      manufacturer: 'HealthVit',
      requiresPrescription: false,
      medicineType: 'tablet',
      strength: '500mg',
      packSize: '30 tablets',
      schedule: 'none',
    },
    {
      name: 'Multivitamin Capsules',
      category: 'Vitamins',
      price: 250,
      genericName: 'Multivitamin',
      manufacturer: 'Centrum',
      requiresPrescription: false,
      medicineType: 'capsule',
      strength: 'N/A',
      packSize: '30 capsules',
      schedule: 'none',
    },
    
    // Topical
    {
      name: 'Antiseptic Cream',
      category: 'First Aid',
      price: 65,
      genericName: 'Povidone-Iodine',
      manufacturer: 'Savlon',
      requiresPrescription: false,
      medicineType: 'cream',
      strength: '50g',
      packSize: '1 tube',
      schedule: 'none',
    },
  ];

  const medicines = [];

  for (const template of medicineTemplates) {
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 2); // 2 years from now

    const manufactureDate = new Date();
    manufactureDate.setMonth(manufactureDate.getMonth() - 3); // 3 months ago

    const medicine = await Medicine.create({
      store: pharmacyId,
      productType: 'medicine',
      ...template,
      description: `${template.name} - ${template.category}`,
      composition: `${template.genericName} ${template.strength}`,
      expiryDate,
      manufactureDate,
      storageConditions: 'Store in cool, dry place away from sunlight',
      usageInstructions: 'Take as directed by physician',
      sideEffects: ['Nausea', 'Dizziness', 'Headache'],
      warnings: ['Not for children under 12', 'Consult doctor if pregnant'],
      stock: Math.floor(Math.random() * 200) + 50,
      lowStockThreshold: 30,
      isAvailable: true,
      rating: {
        average: 4 + Math.random(),
        count: Math.floor(Math.random() * 150) + 20,
      },
      isFeatured: Math.random() > 0.8,
      isPopular: template.requiresPrescription === false,
    });

    medicines.push(medicine);
  }

  return medicines;
};

module.exports = { seed };

