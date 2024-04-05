const Geofence = require('../models/Geofence.model');
const UserGeofenceState = require('../models/UserGeofenceState.model');
const GeofenceEvent = require('../models/GeofenceEvent.model');
const Notification = require('../models/Notification.model');
const NotificationService = require('./notification.service');
const logger = require('../utils/logger');

class GeofenceService {
  /**
   * Check if a location is inside any geofences
   * @param {Array} coordinates - [longitude, latitude]
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Array of geofences containing the point
   */
  static async checkLocationInGeofences(coordinates, options = {}) {
    try {
      const { orderId, userId, deliveryPartnerId, storeId } = options;
      
      // Build query for relevant geofences
      const query = {
        isActive: true,
        $or: [
          // Circle geofences
          {
            type: 'circle',
            $expr: {
              $lte: [
                {
                  $multiply: [
                    6371000, // Earth's radius in meters
                    {
                      $acos: {
                        $add: [
                          {
                            $multiply: [
                              { $sin: { $multiply: [{ $arrayElemAt: ['$geometry.coordinates', 1] }, Math.PI / 180] } },
                              { $sin: { $multiply: [coordinates[1], Math.PI / 180] } }
                            ]
                          },
                          {
                            $multiply: [
                              { $cos: { $multiply: [{ $arrayElemAt: ['$geometry.coordinates', 1] }, Math.PI / 180] } },
                              { $cos: { $multiply: [coordinates[1], Math.PI / 180] } },
                              { $cos: { $multiply: [{ $subtract: [{ $arrayElemAt: ['$geometry.coordinates', 0] }, coordinates[0]] }, Math.PI / 180] } }
                            ]
                          }
                        ]
                      }
                    }
                  ]
                },
                '$radius'
              ]
            }
          },
          // Polygon geofences
          {
            type: 'polygon',
            geometry: {
              $geoIntersects: {
                $geometry: {
                  type: 'Point',
                  coordinates: coordinates,
                },
              },
            },
          },
        ],
      };

      // Add metadata filters if provided
      if (orderId) {
        query['metadata.orderId'] = orderId;
      }
      if (userId) {
        query['metadata.userId'] = userId;
      }
      if (deliveryPartnerId) {
        query['metadata.deliveryPartnerId'] = deliveryPartnerId;
      }
      if (storeId) {
        query['metadata.storeId'] = storeId;
      }

      const geofences = await Geofence.find(query).sort({ priority: -1 });
      
      logger.info(`Found ${geofences.length} geofences containing point [${coordinates.join(', ')}]`);
      return geofences;
    } catch (error) {
      logger.error('Error checking location in geofences:', error);
      throw error;
    }
  }

  /**
   * Update user geofence state and detect changes
   * @param {String} userId - User ID
   * @param {Array} coordinates - [longitude, latitude]
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Geofence changes detected
   */
  static async updateUserGeofenceState(userId, coordinates, options = {}) {
    try {
      const { orderId, deliveryPartnerId, storeId } = options;
      
      // Get current geofences containing the location
      const activeGeofences = await this.checkLocationInGeofences(coordinates, {
        orderId,
        userId,
        deliveryPartnerId,
        storeId,
      });

      const activeGeofenceIds = activeGeofences.map(g => g._id);

      // Get or create user geofence state
      let userState = await UserGeofenceState.findByUserId(userId);
      
      if (!userState) {
        userState = await UserGeofenceState.createOrUpdate(userId, coordinates, options);
      } else {
        await userState.updateLocation(coordinates, options);
      }

      // Get previous active geofences
      const previousActiveIds = userState.activeGeofenceIds.map(id => id.toString());
      const currentActiveIds = activeGeofenceIds.map(id => id.toString());

      // Find changes
      const entered = activeGeofenceIds.filter(id => !previousActiveIds.includes(id.toString()));
      const exited = userState.activeGeofenceIds.filter(id => !currentActiveIds.includes(id.toString()));

      // Update active geofences
      for (const geofenceId of entered) {
        await userState.addActiveGeofence(geofenceId, coordinates);
      }

      for (const geofenceId of exited) {
        await userState.removeActiveGeofence(geofenceId, coordinates);
      }

      // Create events for changes
      const events = [];
      
      for (const geofenceId of entered) {
        const geofence = activeGeofences.find(g => g._id.equals(geofenceId));
        if (geofence) {
          const event = await GeofenceEvent.createEnterEvent({
            userId,
            geofenceId,
            location: coordinates,
            orderId,
            storeId,
            deliveryPartnerId,
            distance: geofence.type === 'circle' ? 
              geofence.calculateDistance(coordinates, geofence.geometry.coordinates) : null,
            ...options,
          });
          events.push(event);
        }
      }

      for (const geofenceId of exited) {
        const geofence = await Geofence.findById(geofenceId);
        if (geofence) {
          const event = await GeofenceEvent.createExitEvent({
            userId,
            geofenceId,
            location: coordinates,
            orderId,
            storeId,
            deliveryPartnerId,
            distance: geofence.type === 'circle' ? 
              geofence.calculateDistance(coordinates, geofence.geometry.coordinates) : null,
            ...options,
          });
          events.push(event);
        }
      }

      logger.info(`User ${userId} geofence state updated. Entered: ${entered.length}, Exited: ${exited.length}`);

      return {
        entered,
        exited,
        events,
        activeGeofences: activeGeofenceIds,
      };
    } catch (error) {
      logger.error('Error updating user geofence state:', error);
      throw error;
    }
  }

  /**
   * Process geofence events and send notifications
   * @param {Array} events - Geofence events to process
   * @returns {Promise<Array>} Processed events
   */
  static async processGeofenceEvents(events) {
    const processedEvents = [];

    for (const event of events) {
      try {
        await event.populate([
          { path: 'userId', select: 'name email phone' },
          { path: 'geofenceId', select: 'name type triggers' },
          { path: 'metadata.orderId', select: 'orderNumber status' },
          { path: 'metadata.storeId', select: 'name storeType' },
          { path: 'metadata.deliveryPartnerId', select: 'name phone' },
        ]);

        // Send notification based on geofence triggers
        await this.sendGeofenceNotification(event);

        // Mark event as processed
        await event.markAsProcessed();
        processedEvents.push(event);

        logger.info(`Processed geofence event: ${event.action} for user ${event.userId.name}`);
      } catch (error) {
        logger.error(`Error processing geofence event ${event._id}:`, error);
        
        // Increment retry count
        await event.incrementRetry();
      }
    }

    return processedEvents;
  }

  /**
   * Send notification for geofence event
   * @param {Object} event - Geofence event
   * @returns {Promise<void>}
   */
  static async sendGeofenceNotification(event) {
    try {
      const { geofenceId, action, userId } = event;
      const geofence = event.geofenceId;
      
      if (!geofence || !geofence.triggers) {
        logger.warn(`No triggers found for geofence ${geofenceId}`);
        return;
      }

      // Send notification using NotificationService
      await NotificationService.sendGeofenceNotification(userId._id, geofence, action);

      // Mark notification as sent
      await event.markNotificationSent({
        success: true,
        provider: 'internal',
      });

      logger.info(`Notification sent for geofence event: ${action} for user ${userId.name}`);
    } catch (error) {
      logger.error('Error sending geofence notification:', error);
      
      // Mark notification as failed
      await event.markNotificationSent({
        success: false,
        error: error.message,
        provider: 'internal',
      });
      
      throw error;
    }
  }

  /**
   * Create delivery tracking geofences for an order
   * @param {String} orderId - Order ID
   * @param {Object} orderData - Order data
   * @returns {Promise<Array>} Created geofences
   */
  static async createDeliveryTrackingGeofences(orderId, orderData) {
    try {
      const { storeId, customerId, deliveryLocation } = orderData;
      const geofences = [];

      // 1. Store proximity geofence (when driver reaches store)
      const storeGeofence = await Geofence.create({
        name: `Store Proximity - Order ${orderId}`,
        description: 'Delivery partner has reached the store',
        type: 'circle',
        geometry: {
          type: 'Point',
          coordinates: orderData.pickupLocation.coordinates,
        },
        radius: 100, // 100 meters
        triggers: {
          onEnter: {
            title: 'Driver Reached Store',
            message: 'Your delivery partner has reached the store and is preparing your order.',
            action: 'notification',
          },
          onExit: {
            title: 'Driver Left Store',
            message: 'Your delivery partner has left the store with your order.',
            action: 'notification',
          },
        },
        metadata: {
          orderId,
          storeId,
          userId: customerId,
        },
        priority: 5,
      });
      geofences.push(storeGeofence);

      // 2. Customer proximity geofence (when driver is near customer)
      const customerGeofence = await Geofence.create({
        name: `Customer Proximity - Order ${orderId}`,
        description: 'Delivery partner is near customer location',
        type: 'circle',
        geometry: {
          type: 'Point',
          coordinates: deliveryLocation.coordinates,
        },
        radius: 200, // 200 meters
        triggers: {
          onEnter: {
            title: 'Driver Near You',
            message: 'Your delivery partner is near your location and will arrive shortly.',
            action: 'notification',
          },
          onExit: {
            title: 'Driver Left Area',
            message: 'Your delivery partner has left your area.',
            action: 'notification',
          },
        },
        metadata: {
          orderId,
          storeId,
          userId: customerId,
        },
        priority: 3,
      });
      geofences.push(customerGeofence);

      logger.info(`Created ${geofences.length} delivery tracking geofences for order ${orderId}`);
      return geofences;
    } catch (error) {
      logger.error('Error creating delivery tracking geofences:', error);
      throw error;
    }
  }

  /**
   * Clean up geofences for completed order
   * @param {String} orderId - Order ID
   * @returns {Promise<void>}
   */
  static async cleanupOrderGeofences(orderId) {
    try {
      // Deactivate geofences for the order
      await Geofence.updateMany(
        { 'metadata.orderId': orderId },
        { isActive: false }
      );

      logger.info(`Deactivated geofences for order ${orderId}`);
    } catch (error) {
      logger.error('Error cleaning up order geofences:', error);
      throw error;
    }
  }

  /**
   * Get geofence events for an order
   * @param {String} orderId - Order ID
   * @returns {Promise<Array>} Geofence events
   */
  static async getOrderGeofenceEvents(orderId) {
    try {
      const events = await GeofenceEvent.findByOrder(orderId);
      return events;
    } catch (error) {
      logger.error('Error getting order geofence events:', error);
      throw error;
    }
  }

  /**
   * Start geofence monitoring for a user
   * @param {String} userId - User ID
   * @param {Object} options - Monitoring options
   * @returns {Promise<void>}
   */
  static async startGeofenceMonitoring(userId, options = {}) {
    try {
      const userState = await UserGeofenceState.findByUserId(userId);
      
      if (userState) {
        userState.isTracking = true;
        userState.trackingSettings = {
          ...userState.trackingSettings,
          ...options,
        };
        await userState.save();
      } else {
        await UserGeofenceState.createOrUpdate(userId, [0, 0], {
          isTracking: true,
          trackingSettings: options,
        });
      }

      logger.info(`Started geofence monitoring for user ${userId}`);
    } catch (error) {
      logger.error('Error starting geofence monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop geofence monitoring for a user
   * @param {String} userId - User ID
   * @returns {Promise<void>}
   */
  static async stopGeofenceMonitoring(userId) {
    try {
      const userState = await UserGeofenceState.findByUserId(userId);
      
      if (userState) {
        userState.isTracking = false;
        await userState.save();
      }

      logger.info(`Stopped geofence monitoring for user ${userId}`);
    } catch (error) {
      logger.error('Error stopping geofence monitoring:', error);
      throw error;
    }
  }
}

module.exports = GeofenceService;
