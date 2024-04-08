const GeofenceService = require('./geofence.service');
const UserGeofenceState = require('../models/UserGeofenceState.model');
const Order = require('../models/Order.model');
const GeofenceEvent = require('../models/GeofenceEvent.model');
const logger = require('../utils/logger');

class GeofenceMonitoringService {
  constructor() {
    this.monitoringIntervals = new Map(); // userId -> intervalId
    this.isRunning = false;
    this.processingQueue = [];
  }

  /**
   * Start monitoring all active geofence tracking
   */
  async startMonitoring() {
    if (this.isRunning) {
      logger.warn('Geofence monitoring is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting geofence monitoring service...');

    // Start monitoring for all users with active tracking
    await this.startMonitoringForAllUsers();

    // Start event processing queue
    this.startEventProcessing();

    logger.info('Geofence monitoring service started successfully');
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring() {
    if (!this.isRunning) {
      logger.warn('Geofence monitoring is not running');
      return;
    }

    this.isRunning = false;

    // Clear all monitoring intervals
    for (const [userId, intervalId] of this.monitoringIntervals) {
      clearInterval(intervalId);
    }
    this.monitoringIntervals.clear();

    logger.info('Geofence monitoring service stopped');
  }

  /**
   * Start monitoring for all users with active tracking
   */
  async startMonitoringForAllUsers() {
    try {
      const activeStates = await UserGeofenceState.find({
        isTracking: true,
      }).populate('userId');

      for (const state of activeStates) {
        await this.startMonitoringForUser(state.userId._id);
      }

      logger.info(`Started monitoring for ${activeStates.length} users`);
    } catch (error) {
      logger.error('Error starting monitoring for all users:', error);
    }
  }

  /**
   * Start monitoring for a specific user
   */
  async startMonitoringForUser(userId) {
    try {
      // Check if already monitoring
      if (this.monitoringIntervals.has(userId)) {
        logger.warn(`Already monitoring user ${userId}`);
        return;
      }

      const userState = await UserGeofenceState.findByUserId(userId);
      if (!userState || !userState.isTracking) {
        logger.warn(`User ${userId} is not set for tracking`);
        return;
      }

      const intervalId = setInterval(async () => {
        await this.processUserLocation(userId);
      }, userState.trackingSettings.updateInterval || 5000);

      this.monitoringIntervals.set(userId, intervalId);
      logger.info(`Started monitoring for user ${userId}`);
    } catch (error) {
      logger.error(`Error starting monitoring for user ${userId}:`, error);
    }
  }

  /**
   * Stop monitoring for a specific user
   */
  async stopMonitoringForUser(userId) {
    try {
      const intervalId = this.monitoringIntervals.get(userId);
      if (intervalId) {
        clearInterval(intervalId);
        this.monitoringIntervals.delete(userId);
        logger.info(`Stopped monitoring for user ${userId}`);
      }
    } catch (error) {
      logger.error(`Error stopping monitoring for user ${userId}:`, error);
    }
  }

  /**
   * Process user location and detect geofence changes
   */
  async processUserLocation(userId) {
    try {
      const userState = await UserGeofenceState.findByUserId(userId);
      if (!userState || !userState.isTracking) {
        await this.stopMonitoringForUser(userId);
        return;
      }

      // Check if location is recent enough
      const locationAge = Date.now() - userState.currentLocation.timestamp.getTime();
      const maxAge = (userState.trackingSettings.updateInterval || 5000) * 2;

      if (locationAge > maxAge) {
        logger.warn(`Location too old for user ${userId}: ${locationAge}ms`);
        return;
      }

      // Check accuracy threshold
      if (userState.currentLocation.accuracy > (userState.trackingSettings.accuracyThreshold || 100)) {
        logger.warn(`Location accuracy too low for user ${userId}: ${userState.currentLocation.accuracy}m`);
        return;
      }

      // Get active orders for this user
      const activeOrders = await Order.find({
        driver: userId,
        'geofenceTracking.enabled': true,
        'geofenceTracking.trackingStatus': 'active',
      });

      if (activeOrders.length === 0) {
        logger.debug(`No active orders for user ${userId}`);
        return;
      }

      // Process each order
      for (const order of activeOrders) {
        await this.processOrderGeofences(userId, order, userState.currentLocation.coordinates);
      }
    } catch (error) {
      logger.error(`Error processing location for user ${userId}:`, error);
    }
  }

  /**
   * Process geofences for a specific order
   */
  async processOrderGeofences(userId, order, coordinates) {
    try {
      // Update geofence state for this order
      const changes = await GeofenceService.updateUserGeofenceState(userId, coordinates, {
        orderId: order._id,
        storeId: order.vendor,
        customerId: order.customer,
        deliveryPartnerId: userId,
      });

      // Add events to processing queue
      if (changes.events.length > 0) {
        this.processingQueue.push(...changes.events);
        logger.info(`Added ${changes.events.length} geofence events to processing queue for order ${order._id}`);
      }

      // Update order tracking events
      for (const geofenceId of changes.entered) {
        const geofence = await GeofenceService.checkLocationInGeofences(coordinates, { orderId: order._id });
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

      // Check if delivery is completed - check if any entered geofence is customer proximity
      const geofences = await GeofenceService.checkLocationInGeofences(coordinates, { orderId: order._id });
      const customerProximityEntered = changes.entered.some(id => {
        const geofence = geofences.find(g => g._id.equals(id));
        return geofence && geofence.name.includes('Customer Proximity');
      });

      if (customerProximityEntered) {
        // Driver reached customer - could trigger delivery completion
        await order.addTrackingEvent('customer_reached', {
          coordinates,
          address: 'Customer location',
        }, 'Driver has reached customer location');
      }
    } catch (error) {
      logger.error(`Error processing geofences for order ${order._id}:`, error);
    }
  }

  /**
   * Start event processing queue
   */
  startEventProcessing() {
    setInterval(async () => {
      if (this.processingQueue.length > 0) {
        const events = this.processingQueue.splice(0, 10); // Process 10 events at a time
        await this.processEvents(events);
      }
    }, 1000); // Process every second
  }

  /**
   * Process geofence events
   */
  async processEvents(events) {
    try {
      const processedEvents = await GeofenceService.processGeofenceEvents(events);
      logger.info(`Processed ${processedEvents.length} geofence events`);
    } catch (error) {
      logger.error('Error processing geofence events:', error);
    }
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus() {
    return {
      isRunning: this.isRunning,
      activeUsers: this.monitoringIntervals.size,
      queueSize: this.processingQueue.length,
      monitoredUsers: Array.from(this.monitoringIntervals.keys()),
    };
  }

  /**
   * Force process all pending events
   */
  async processAllPendingEvents() {
    try {
      const unprocessedEvents = await GeofenceEvent.findUnprocessed(100);
      if (unprocessedEvents.length > 0) {
        await this.processEvents(unprocessedEvents);
        logger.info(`Force processed ${unprocessedEvents.length} pending events`);
      }
    } catch (error) {
      logger.error('Error processing pending events:', error);
    }
  }

  /**
   * Clean up completed orders
   */
  async cleanupCompletedOrders() {
    try {
      const completedOrders = await Order.find({
        'geofenceTracking.enabled': true,
        status: { $in: ['delivered', 'cancelled', 'refunded'] },
      });

      for (const order of completedOrders) {
        // Disable geofence tracking
        await order.disableGeofenceTracking();

        // Clean up geofences
        await GeofenceService.cleanupOrderGeofences(order._id);

        // Stop monitoring for driver
        if (order.driver) {
          await this.stopMonitoringForUser(order.driver);
        }

        logger.info(`Cleaned up geofence tracking for completed order ${order._id}`);
      }

      logger.info(`Cleaned up ${completedOrders.length} completed orders`);
    } catch (error) {
      logger.error('Error cleaning up completed orders:', error);
    }
  }
}

// Create singleton instance
const geofenceMonitoringService = new GeofenceMonitoringService();

module.exports = geofenceMonitoringService;
