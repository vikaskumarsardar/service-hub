# 🔧 Backend - On-Demand Services Platform

Node.js + Express + MongoDB backend with modular architecture.

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js          # MongoDB configuration
│   │   └── features.config.js   # Feature toggles
│   │
│   ├── core/                     # Shared core functionality
│   │   ├── controllers/
│   │   │   └── auth.controller.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js
│   │   │   ├── error.middleware.js
│   │   │   └── validation.middleware.js
│   │   ├── models/
│   │   │   ├── User.model.js
│   │   │   ├── Order.model.js
│   │   │   └── Notification.model.js
│   │   ├── routes/
│   │   │   └── auth.routes.js
│   │   ├── services/
│   │   │   └── auth.service.js
│   │   └── utils/
│   │       ├── logger.js
│   │       ├── response.js
│   │       └── helpers.js
│   │
│   ├── modules/                  # Feature modules
│   │   ├── taxi/
│   │   │   ├── taxi.model.js
│   │   │   ├── taxi.service.js
│   │   │   ├── taxi.controller.js
│   │   │   ├── taxi.validation.js
│   │   │   └── index.js
│   │   ├── restaurant/
│   │   ├── grocery/
│   │   ├── pharmacy/
│   │   └── meatShop/
│   │
│   ├── loaders/
│   │   ├── mongoose.loader.js   # Database initialization
│   │   └── modules.loader.js    # Dynamic module loading
│   │
│   └── app.js                    # Main application entry
│
├── logs/                         # Application logs
├── uploads/                      # File uploads
├── .env                          # Environment variables
├── .gitignore
└── package.json
```

## 🚀 Getting Started

### Install Dependencies
```bash
npm install
```

### Environment Setup
Create `.env` file:
```bash
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/on-demand-platform
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d

# Module toggles
ENABLE_TAXI=true
ENABLE_RESTAURANT=true
ENABLE_GROCERY=true
ENABLE_PHARMACY=true
ENABLE_MEAT_SHOP=true

CORS_ORIGIN=http://localhost:3000
```

### Run Development Server
```bash
npm run dev
```

### Run Production Server
```bash
npm start
```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "password123",
  "role": "customer"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "emailOrPhone": "john@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Get Profile
```http
GET /auth/profile
Authorization: Bearer {token}
```

### Taxi Module Endpoints

#### Book Ride
```http
POST /taxi/book
Authorization: Bearer {token}
Content-Type: application/json

{
  "vehicleType": "car",
  "pickup": {
    "address": "123 Main St",
    "coordinates": [77.5946, 12.9716]
  },
  "dropoff": {
    "address": "456 Park Ave",
    "coordinates": [77.6408, 12.9698]
  },
  "paymentMethod": "cash"
}
```

#### Get User Rides
```http
GET /taxi/rides?page=1&limit=10
Authorization: Bearer {token}
```

#### Get Nearby Drivers
```http
GET /taxi/nearby-drivers?longitude=77.5946&latitude=12.9716&maxDistance=5
Authorization: Bearer {token}
```

### Restaurant Module Endpoints

#### Get Nearby Restaurants
```http
GET /restaurant/nearby?longitude=77.5946&latitude=12.9716&maxDistance=10
```

#### Get Restaurant Menu
```http
GET /restaurant/{restaurantId}/menu?category=main-course
```

#### Place Order
```http
POST /restaurant/orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "restaurantId": "64a1b2c3d4e5f6789",
  "items": [
    {
      "menuItemId": "64a1b2c3d4e5f6790",
      "quantity": 2
    }
  ],
  "deliveryLocation": {
    "address": "123 Main St",
    "coordinates": {
      "type": "Point",
      "coordinates": [77.5946, 12.9716]
    }
  },
  "paymentMethod": "card"
}
```

## 🔐 Authentication

All protected routes require JWT token in the Authorization header:
```
Authorization: Bearer {your-jwt-token}
```

## 🎯 Role-Based Access Control

- **Customer**: Can place orders and book services
- **Driver**: Can accept rides and update status
- **Vendor**: Can manage products and orders
- **Admin**: Full system access

Example:
```javascript
router.post('/vendor-only', 
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('vendor'),
  controller.method
);
```

## 🗺️ Geospatial Queries

The platform uses MongoDB's geospatial features for location-based queries.

**Coordinate Format**: `[longitude, latitude]`

Example:
```javascript
// Find nearby drivers within 5km
const drivers = await User.find({
  location: {
    $near: {
      $geometry: {
        type: 'Point',
        coordinates: [77.5946, 12.9716]
      },
      $maxDistance: 5000 // meters
    }
  }
});
```

## 🔧 Adding New Modules

1. **Create module directory**:
```bash
mkdir src/modules/newModule
```

2. **Create module files**:
```
newModule/
├── newModule.model.js
├── newModule.service.js
├── newModule.controller.js
├── newModule.validation.js
└── index.js
```

3. **Add to features config**:
```javascript
// src/config/features.config.js
enabledModules: {
  newModule: process.env.ENABLE_NEW_MODULE === 'true',
}
```

4. **Add to .env**:
```bash
ENABLE_NEW_MODULE=true
```

The module will be automatically loaded!

## 📊 Database Schemas

### User Schema
```javascript
{
  name: String,
  email: String (unique),
  phone: String (unique),
  password: String (hashed),
  role: ['customer', 'driver', 'vendor', 'admin'],
  location: {
    type: 'Point',
    coordinates: [Number]
  },
  // ... more fields
}
```

### Order Schema
```javascript
{
  orderNumber: String (unique),
  customer: ObjectId (ref: User),
  vendor: ObjectId (ref: User),
  driver: ObjectId (ref: User),
  serviceType: ['taxi', 'restaurant', 'grocery', 'pharmacy', 'meatShop'],
  items: [{ name, quantity, price }],
  pricing: {
    itemsTotal, deliveryFee, tax, discount, total
  },
  status: String,
  // ... more fields
}
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## 🐛 Error Handling

All errors are handled centrally:

```javascript
// Validation errors return 400
{
  "success": false,
  "message": "Validation Error",
  "errors": ["Email is required", "Password must be at least 6 characters"]
}

// Authentication errors return 401
{
  "success": false,
  "message": "Invalid or expired token"
}

// Not found errors return 404
{
  "success": false,
  "message": "Resource not found"
}
```

## 📝 Logging

Logs are written to `logs/` directory:
- `combined.log` - All logs
- `error.log` - Error logs only

## 🔒 Security Best Practices

1. Always use HTTPS in production
2. Rotate JWT secrets regularly
3. Implement rate limiting
4. Validate all user inputs
5. Use MongoDB connection string with authentication
6. Never commit `.env` file
7. Keep dependencies updated

## 📦 Production Deployment

1. Set environment to production:
```bash
NODE_ENV=production
```

2. Use production MongoDB:
```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
```

3. Set strong JWT secret:
```bash
JWT_SECRET=$(openssl rand -base64 32)
```

4. Enable CORS for your domain:
```bash
CORS_ORIGIN=https://yourdomain.com
```

5. Run with PM2:
```bash
npm install -g pm2
pm2 start src/app.js --name on-demand-api
```

## 🚀 Performance Tips

1. Use indexes on frequently queried fields
2. Implement Redis caching for frequently accessed data
3. Use pagination for large datasets
4. Optimize MongoDB queries
5. Use connection pooling
6. Implement API rate limiting

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [MongoDB Geospatial Queries](https://docs.mongodb.com/manual/geospatial-queries/)

---

**Happy coding! 🚀**

