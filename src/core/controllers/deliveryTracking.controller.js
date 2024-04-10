const GeofenceService = require('../services/geofence.service');
const Order = require('../models/Order.model');
const GeofenceEvent = require('../models/GeofenceEvent.model');
const UserGeofenceState = require('../models/UserGeofenceState.model');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

class DeliveryTrackingController {
  /**
   * Start geofence tracking for an order
   */
  static async startTracking(req, res, next) {
    try {
      const { orderId } = req.params;
      const { driverId } = req.body;

      // Find the order
      const order = await Order.findById(orderId)
        .populate('customer vendor');

      if (!order) {
        return ApiResponse.notFound(res, 'Order not found');
      }

      // Assign driver if provided
      if (driverId) {
        order.driver = driverId;
        await order.save();
      }

      // Create delivery tracking geofences
      const geofences = await GeofenceService.createDeliveryTrackingGeofences(orderId, {
        storeId: order.vendor,
        customerId: order.customer._id,
        pickupLocation: order.pickupLocation,
        deliveryLocation: order.deliveryLocation,
      });

      // Add geofences to order
      for (const geofence of geofences) {
        await order.addGeofence(geofence._id);
      }

      // Enable geofence tracking
      await order.enableGeofenceTracking();

      // Start monitoring for driver
      if (driverId) {
        await GeofenceService.startGeofenceMonitoring(driverId, {
          updateInterval: 5000, // 5 seconds
          accuracyThreshold: 100, // 100 meters
        });
      }

      logger.info(`Started geofence tracking for order ${orderId}`);

      return ApiResponse.success(res, {
        orderId,
        geofences: geofences.map(g => ({
          id: g._id,
          name: g.name,
          type: g.type,
          radius: g.radius,
        })),
        trackingStatus: order.geofenceTracking.trackingStatus,
      }, 'Geofence tracking started successfully');
    } catch (error) {
      logger.error('Error starting geofence tracking:', error);
      next(error);
    }
  }

  /**
   * Update driver location
   */
  static async updateLocation(req, res, next) {
    try {
      const { orderId } = req.params;
      const { coordinates, accuracy, heading, speed } = req.body;
      const driverId = req.user._id;

      // Validate coordinates
      if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
        return ApiResponse.badRequest(res, 'Invalid coordinates format. Expected [longitude, latitude]');
      }

      // Find the order
      const order = await Order.findById(orderId);
      if (!order) {
        return ApiResponse.notFound(res, 'Order not found');
      }

      // Check if driver is assigned to this order
      if (order.driver && !order.driver.equals(driverId)) {
        return ApiResponse.unauthorized(res, 'Not authorized to update location for this order');
      }

      // Update order location
      await order.updateLocation(coordinates, accuracy);

      // Update driver geofence state
      const changes = await GeofenceService.updateUserGeofenceState(driverId, coordinates, {
        orderId,
        storeId: order.vendor,
        customerId: order.customer,
        deliveryPartnerId: driverId,
        accuracy,
        heading,
        speed,
      });

      // Process geofence events
      if (changes.events.length > 0) {
        await GeofenceService.processGeofenceEvents(changes.events);
      }

      // Add tracking events based on geofence changes
      for (const geofenceId of changes.entered) {
        const geofence = await GeofenceService.checkLocationInGeofences(coordinates, { orderId });
        const enteredGeofence = geofence.find(g => g._id.equals(geofenceId));
        
        if (enteredGeofence) {
          let eventType, description;
          
          if (enteredGeofence.name.includes('Store Proximity')) {
            eventType = 'store_reached';
            description = 'Driver has reached the store';
          } else if (enteredGeofence.name.includes('Customer Proximity')) {
            eventType = 'customer_approaching';
            description = 'Driver is approaching customer location';
          }

          if (eventType) {
            await order.addTrackingEvent(eventType, {
              coordinates,
              address: 'Current location',
            }, description);
          }
        }
      }

      logger.info(`Updated location for order ${orderId}: [${coordinates.join(', ')}]`);

      return ApiResponse.success(res, {
        orderId,
        location: {
          coordinates,
          timestamp: new Date(),
          accuracy,
        },
        geofenceChanges: {
          entered: changes.entered.length,
          exited: changes.exited.length,
        },
      }, 'Location updated successfully');
    } catch (error) {
      logger.error('Error updating location:', error);
      next(error);
    }
  }

  /**
   * Get order tracking status
   */
  static async getTrackingStatus(req, res, next) {
    try {
      const { orderId } = req.params;
      const userId = req.user._id;

      // Find the order
      const order = await Order.findById(orderId)
        .populate('customer driver vendor geofenceTracking.geofenceIds');

      if (!order) {
        return ApiResponse.notFound(res, 'Order not found');
      }

      // Check authorization
      if (!order.customer.equals(userId) && (!order.driver || !order.driver.equals(userId))) {
        return ApiResponse.unauthorized(res, 'Not authorized to view tracking for this order');
      }

      // Get geofence events for this order
      const events = await GeofenceEvent.findByOrder(orderId);

      // Get driver's current location if available
      let driverLocation = null;
      if (order.driver) {
        const driverState = await UserGeofenceState.findByUserId(order.driver._id);
        if (driverState && driverState.currentLocation) {
          driverLocation = driverState.currentLocation;
        }
      }

      return ApiResponse.success(res, {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        tracking: {
          enabled: order.geofenceTracking.enabled,
          status: order.geofenceTracking.trackingStatus,
          lastLocationUpdate: order.geofenceTracking.lastLocationUpdate,
          events: order.geofenceTracking.events,
          geofences: order.geofenceTracking.geofenceIds.map(g => ({
            id: g._id,
            name: g.name,
            type: g.type,
            radius: g.radius,
          })),
        },
        driver: order.driver ? {
          id: order.driver._id,
          name: order.driver.name,
          phone: order.driver.phone,
          currentLocation: driverLocation,
        } : null,
        geofenceEvents: events.map(event => ({
          id: event._id,
          action: event.action,
          timestamp: event.createdAt,
          location: event.location.coordinates,
          geofence: {
            id: event.geofenceId._id,
            name: event.geofenceId.name,
          },
        })),
      }, 'Tracking status retrieved successfully');
    } catch (error) {
      logger.error('Error getting tracking status:', error);
      next(error);
    }
  }

  /**
   * Stop geofence tracking for an order
   */
  static async stopTracking(req, res, next) {
    try {
      const { orderId } = req.params;
      const driverId = req.user._id;

      // Find the order
      const order = await Order.findById(orderId);
      if (!order) {
        return ApiResponse.notFound(res, 'Order not found');
      }

      // Check if driver is assigned to this order
      if (order.driver && !order.driver.equals(driverId)) {
        return ApiResponse.unauthorized(res, 'Not authorized to stop tracking for this order');
      }

      // Disable geofence tracking
      await order.disableGeofenceTracking();

      // Add delivery completed event
      await order.addTrackingEvent('delivery_completed', {
        coordinates: order.deliveryLocation.coordinates,
        address: order.deliveryLocation.address,
      }, 'Delivery completed successfully');

      // Clean up geofences
      await GeofenceService.cleanupOrderGeofences(orderId);

      // Stop monitoring for driver
      if (driverId) {
        await GeofenceService.stopGeofenceMonitoring(driverId);
      }

      logger.info(`Stopped geofence tracking for order ${orderId}`);

      return ApiResponse.success(res, {
        orderId,
        trackingStatus: order.geofenceTracking.trackingStatus,
      }, 'Geofence tracking stopped successfully');
    } catch (error) {
      logger.error('Error stopping geofence tracking:', error);
      next(error);
    }
  }

  /**
   * Get geofence events for an order
   */
  static async getGeofenceEvents(req, res, next) {
    try {
      const { orderId } = req.params;
      const userId = req.user._id;
      const { page = 1, limit = 20 } = req.query;

      // Find the order
      const order = await Order.findById(orderId);
      if (!order) {
        return ApiResponse.notFound(res, 'Order not found');
      }

      // Check authorization
      if (!order.customer.equals(userId) && (!order.driver || !order.driver.equals(userId))) {
        return ApiResponse.unauthorized(res, 'Not authorized to view events for this order');
      }

      // Get geofence events
      const events = await GeofenceEvent.findByOrder(orderId);

      // Paginate results
      const skip = (page - 1) * limit;
      const paginatedEvents = events.slice(skip, skip + parseInt(limit));

      return ApiResponse.success(res, {
        orderId,
        events: paginatedEvents.map(event => ({
          id: event._id,
          action: event.action,
          timestamp: event.createdAt,
          location: {
            coordinates: event.location.coordinates,
            accuracy: event.location.accuracy,
          },
          geofence: {
            id: event.geofenceId._id,
            name: event.geofenceId.name,
            type: event.geofenceId.type,
          },
          notification: {
            sent: event.notification.sent,
            title: event.notification.title,
            message: event.notification.message,
          },
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(events.length / limit),
          totalEvents: events.length,
          eventsPerPage: parseInt(limit),
        },
      }, 'Geofence events retrieved successfully');
    } catch (error) {
      logger.error('Error getting geofence events:', error);
      next(error);
    }
  }

  /**
   * Get all orders with active tracking (for admin/dashboard)
   */
  static async getActiveTrackingOrders(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;

      // Get orders with active tracking
      const orders = await Order.findWithActiveTracking();

      // Paginate results
      const skip = (page - 1) * limit;
      const paginatedOrders = orders.slice(skip, skip + parseInt(limit));

      return ApiResponse.success(res, {
        orders: paginatedOrders.map(order => ({
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          customer: {
            id: order.customer._id,
            name: order.customer.name,
            phone: order.customer.phone,
          },
          driver: order.driver ? {
            id: order.driver._id,
            name: order.driver.name,
            phone: order.driver.phone,
          } : null,
          tracking: {
            status: order.geofenceTracking.trackingStatus,
            lastLocationUpdate: order.geofenceTracking.lastLocationUpdate,
            eventsCount: order.geofenceTracking.events.length,
          },
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(orders.length / limit),
          totalOrders: orders.length,
          ordersPerPage: parseInt(limit),
        },
      }, 'Active tracking orders retrieved successfully');
    } catch (error) {
      logger.error('Error getting active tracking orders:', error);
      next(error);
    }
  }
}

module.exports = DeliveryTrackingController;
