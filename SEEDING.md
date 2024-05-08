# 🌱 Database Seeding Guide

## Overview

The seeding system populates your database with sample data for all enabled modules. Perfect for development, testing, and demos!

## 📦 What Gets Seeded?

### **Users (Always)**
- 5 Vendors
- 10 Customers  
- 5 Drivers

### **Module Data (Based on Enabled Modules)**

#### **Restaurant Module**
- 3 Restaurants (Pizza Paradise, Spice Garden, The Chinese Wok)
- ~24 Menu Items (8 per restaurant)
- Categories: Pizza, Pasta, Main Course, Desserts, etc.

#### **Grocery Module**
- 2 Grocery Stores (Fresh Mart, Green Valley Organics)
- ~40+ Products
- Categories: Vegetables, Fruits, Dairy, Bakery, Beverages, Snacks

#### **Pharmacy Module**
- 2 Pharmacies (Apollo Pharmacy, MedPlus)
- ~20+ Medicines
- Types: OTC, Prescription, Vitamins, First Aid

#### **Meat Shop Module**
- 2 Meat Shops (Fresh Meat Corner, The Butcher Shop)
- ~20+ Products
- Categories: Chicken, Mutton, Fish, Seafood

---

## 🚀 How to Run Seeders

### **Method 1: NPM Script (Recommended)**

```bash
# Navigate to backend
cd backend

# Run seeder
npm run seed
```

### **Method 2: Direct Node**

```bash
cd backend
node src/seeders/index.js
```

### **Method 3: Development Mode**

```bash
npm run seed:dev
```

---

## ⚙️ Configuration

### **Enable/Disable Modules**

Edit `backend/.env`:

```bash
# Enable all modules
ENABLE_TAXI=true
ENABLE_RESTAURANT=true
ENABLE_GROCERY=true
ENABLE_PHARMACY=true
ENABLE_MEAT_SHOP=true

# Or enable only specific modules
ENABLE_RESTAURANT=true
ENABLE_GROCERY=true
ENABLE_PHARMACY=false
ENABLE_MEAT_SHOP=false
```

**Only enabled modules will be seeded!**

---

## 📊 Sample Data Created

### **Users Created**

| Type | Count | Email Pattern | Password |
|------|-------|--------------|----------|
| Vendors | 5 | `vendor1@example.com` | `password123` |
| Customers | 10 | `customer1@example.com` | `password123` |
| Drivers | 5 | `driver1@example.com` | `password123` |

### **Locations** (Bangalore)
- Koramangala: `[77.5946, 12.9716]`
- Whitefield: `[77.6408, 12.9698]`
- Indiranagar: `[77.6101, 12.9344]`
- HSR Layout: `[77.5787, 12.9611]`
- Marathahalli: `[77.6412, 12.9889]`

---

## 📁 Seeder Files

```
backend/src/seeders/
├── index.js              # Main seeder orchestrator
├── userSeeder.js         # Creates users (vendors, customers, drivers)
├── restaurantSeeder.js   # Creates restaurants + menu items
├── grocerySeeder.js      # Creates grocery stores + products
├── pharmacySeeder.js     # Creates pharmacies + medicines
└── meatShopSeeder.js     # Creates meat shops + products
```

---

## 🎯 Use Cases

### **1. Development Setup**

```bash
# Fresh database with sample data
npm run seed
```

### **2. Testing APIs**

```bash
# Seed database
npm run seed

# Start server
npm run dev

# Test with seeded data
curl http://localhost:5000/api/v1/restaurant/nearby?longitude=77.5946&latitude=12.9716
```

### **3. Demo/Presentation**

```bash
# Enable only needed modules in .env
ENABLE_RESTAURANT=true
ENABLE_GROCERY=true

# Seed
npm run seed

# Present with realistic data!
```

### **4. Client-Specific Setup**

```bash
# Client A wants only Taxi + Restaurant
ENABLE_TAXI=true
ENABLE_RESTAURANT=true
ENABLE_GROCERY=false
ENABLE_PHARMACY=false
ENABLE_MEAT_SHOP=false

npm run seed
# Only restaurant data seeded!
```

---

## 🔄 Re-seeding

### **Option 1: Clear and Re-seed**

Uncomment the `clearDatabase()` line in `seeders/index.js`:

```javascript
// Uncomment to clear before seeding
await clearDatabase();
```

Then run:
```bash
npm run seed
```

### **Option 2: Manual Clear**

```bash
# Drop database
mongo
> use on-demand-platform
> db.dropDatabase()

# Then seed
npm run seed
```

---

## 📝 Sample Data Examples

### **Restaurant Menu Items**

```javascript
// Pizza Paradise
{
  name: "Margherita Pizza",
  price: 299,
  category: "Pizza",
  isVeg: true,
  spiceLevel: "none",
  preparationTime: 20
}
```

### **Grocery Products**

```javascript
// Fresh Mart
{
  name: "Tomato",
  price: 40,
  unit: "kg",
  category: "vegetables",
  isOrganic: true,
  isFresh: true
}
```

### **Medicines**

```javascript
// Apollo Pharmacy
{
  name: "Paracetamol 500mg",
  price: 20,
  requiresPrescription: false,
  medicineType: "tablet",
  manufacturer: "Cipla"
}
```

### **Meat Products**

```javascript
// Fresh Meat Corner
{
  name: "Chicken Breast",
  price: 280,
  unit: "kg",
  meatCategory: "chicken",
  cutType: "breast",
  isHalal: true
}
```

---

## 🧪 Testing Seeded Data

### **1. Check Users**

```bash
# Login as vendor
POST http://localhost:5000/api/v1/auth/login
{
  "emailOrPhone": "vendor1@example.com",
  "password": "password123"
}
```

### **2. Query Restaurants**

```bash
# Get nearby restaurants
GET http://localhost:5000/api/v1/restaurant/nearby?longitude=77.5946&latitude=12.9716
```

### **3. Check Products**

```bash
# Get restaurant menu (replace with actual restaurantId)
GET http://localhost:5000/api/v1/restaurant/{restaurantId}/menu
```

---

## 🎨 Customizing Seed Data

### **Add More Products**

Edit `seeders/restaurantSeeder.js`:

```javascript
const menuTemplates = [
  // Add your custom items
  { 
    name: 'Custom Pizza', 
    category: 'Pizza', 
    price: 399, 
    isVeg: true 
  },
  // ... existing items
];
```

### **Change Locations**

Edit any seeder file:

```javascript
const locations = [
  { coordinates: [YOUR_LNG, YOUR_LAT], address: 'Your Address' },
  // ... more locations
];
```

### **Adjust Quantities**

```javascript
// Create more stores
for (let i = 0; i < 10; i++) {  // Change from 3 to 10
  // ...
}
```

---

## ⚠️ Important Notes

1. **Password**: All seeded users have password: `password123`
2. **Verified**: All users and stores are pre-verified
3. **Ratings**: Random ratings between 4.0 - 5.0
4. **Stock**: Random stock levels (50-200 units)
5. **Coordinates**: All in Bangalore, India

---

## 🐛 Troubleshooting

### **"Connection refused"**
```bash
# Make sure MongoDB is running
mongod

# Or check connection string in .env
MONGODB_URI=mongodb://localhost:27017/on-demand-platform
```

### **"Module not enabled"**
```bash
# Check .env file
ENABLE_RESTAURANT=true  # Make sure it's "true" not "false"
```

### **"Duplicate key error"**
```bash
# Database already has data
# Option 1: Drop database
# Option 2: Use different email/phone in seeders
```

---

## 📚 Related Documentation

- Main README: `../README.md`
- Database Architecture: `../DATABASE_ARCHITECTURE.md`
- API Documentation: `backend/README.md`

---

**Happy Seeding! 🌱**

Now you can develop and test with realistic data across all modules!

