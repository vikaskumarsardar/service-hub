const Notification = require('../models/Notification.model');
const User = require('../models/User.model');
const logger = require('../utils/logger');

class NotificationService {
  /**
   * Send notification to user
   * @param {String} userId - User ID
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Created notification
   */
  static async sendNotification(userId, notificationData) {
    try {
      const { title, message, type = 'general', data = {}, priority = 'normal' } = notificationData;

      // Validate user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Create notification
      const notification = await Notification.create({
        user: userId,
        type,
        title,
        message,
        data,
        priority,
        isRead: false,
      });

      // Send push notification (if user has device tokens)
      if (user.deviceTokens && user.deviceTokens.length > 0) {
        await this.sendPushNotification(user.deviceTokens, {
          title,
          body: message,
          data: {
            notificationId: notification._id,
            type,
            ...data,
          },
        });
      }

      // Send SMS (if configured)
      if (type === 'urgent' || priority === 'high') {
        await this.sendSMS(user.phone, message);
      }

      logger.info(`Notification sent to user ${userId}: ${title}`);
      return notification;
    } catch (error) {
      logger.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Send geofence notification
   * @param {String} userId - User ID
   * @param {Object} geofenceData - Geofence data
   * @param {String} action - 'enter' or 'exit'
   * @returns {Promise<Object>} Created notification
   */
  static async sendGeofenceNotification(userId, geofenceData, action) {
    try {
      const { name, triggers, orderId, storeId, deliveryPartnerId } = geofenceData;
      
      const trigger = action === 'enter' ? triggers.onEnter : triggers.onExit;
      if (!trigger) {
        logger.warn(`No ${action} trigger found for geofence ${name}`);
        return null;
      }

      const notificationData = {
        title: trigger.title || `${name} - ${action === 'enter' ? 'Entered' : 'Exited'}`,
        message: trigger.message || `You have ${action === 'enter' ? 'entered' : 'exited'} ${name}`,
        type: 'geofence',
        data: {
          geofenceName: name,
          action,
          orderId,
          storeId,
          deliveryPartnerId,
        },
        priority: 'normal',
      };

      return await this.sendNotification(userId, notificationData);
    } catch (error) {
      logger.error('Error sending geofence notification:', error);
      throw error;
    }
  }

  /**
   * Send delivery tracking notification
   * @param {String} userId - User ID
   * @param {String} eventType - Event type
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>} Created notification
   */
  static async sendDeliveryTrackingNotification(userId, eventType, orderData) {
    try {
      const { orderNumber, driverName, storeName } = orderData;
      
      let title, message;
      
      switch (eventType) {
        case 'store_reached':
          title = 'Driver Reached Store';
          message = `Your delivery partner has reached ${storeName} and is preparing your order ${orderNumber}.`;
          break;
        case 'customer_approaching':
          title = 'Driver Approaching';
          message = `${driverName} is approaching your location with order ${orderNumber}.`;
          break;
        case 'customer_reached':
          title = 'Driver Arrived';
          message = `${driverName} has arrived at your location with order ${orderNumber}.`;
          break;
        case 'delivery_completed':
          title = 'Delivery Completed';
          message = `Your order ${orderNumber} has been delivered successfully.`;
          break;
        default:
          title = 'Delivery Update';
          message = `Update for your order ${orderNumber}.`;
      }

      const notificationData = {
        title,
        message,
        type: 'delivery_tracking',
        data: {
          eventType,
          orderNumber,
          driverName,
          storeName,
        },
        priority: 'high',
      };

      return await this.sendNotification(userId, notificationData);
    } catch (error) {
      logger.error('Error sending delivery tracking notification:', error);
      throw error;
    }
  }

  /**
   * Send push notification
   * @param {Array} deviceTokens - Device tokens
   * @param {Object} payload - Notification payload
   * @returns {Promise<void>}
   */
  static async sendPushNotification(deviceTokens, payload) {
    try {
      // TODO: Implement actual push notification service (FCM, APNS, etc.)
      // For now, just log the notification
      logger.info(`Push notification sent to ${deviceTokens.length} devices:`, payload);
      
      // Example implementation with FCM:
      // const admin = require('firebase-admin');
      // const message = {
      //   notification: {
      //     title: payload.title,
      //     body: payload.body,
      //   },
      //   data: payload.data,
      //   tokens: deviceTokens,
      // };
      // const response = await admin.messaging().sendMulticast(message);
      // logger.info(`Push notification response:`, response);
    } catch (error) {
      logger.error('Error sending push notification:', error);
      throw error;
    }
  }

  /**
   * Send SMS notification
   * @param {String} phoneNumber - Phone number
   * @param {String} message - SMS message
   * @returns {Promise<void>}
   */
  static async sendSMS(phoneNumber, message) {
    try {
      // TODO: Implement actual SMS service (Twilio, AWS SNS, etc.)
      // For now, just log the SMS
      logger.info(`SMS sent to ${phoneNumber}: ${message}`);
      
      // Example implementation with Twilio:
      // const twilio = require('twilio');
      // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      // await client.messages.create({
      //   body: message,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: phoneNumber,
      // });
    } catch (error) {
      logger.error('Error sending SMS:', error);
      throw error;
    }
  }

  /**
   * Get user notifications
   * @param {String} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} User notifications
   */
  static async getUserNotifications(userId, options = {}) {
    try {
      const { page = 1, limit = 20, type, isRead } = options;
      const skip = (page - 1) * limit;

      const query = { user: userId };
      if (type) query.type = type;
      if (isRead !== undefined) query.isRead = isRead;

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Notification.countDocuments(query);

      return {
        notifications,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalNotifications: total,
          notificationsPerPage: limit,
        },
      };
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   * @param {String} notificationId - Notification ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Updated notification
   */
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, user: userId },
        { isRead: true, readAt: new Date() },
        { new: true }
      );

      if (!notification) {
        throw new Error('Notification not found or not authorized');
      }

      logger.info(`Notification ${notificationId} marked as read by user ${userId}`);
      return notification;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for user
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Update result
   */
  static async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { user: userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      logger.info(`Marked ${result.modifiedCount} notifications as read for user ${userId}`);
      return result;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics for user
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Notification statistics
   */
  static async getNotificationStats(userId) {
    try {
      const total = await Notification.countDocuments({ user: userId });
      const unread = await Notification.countDocuments({ user: userId, isRead: false });
      const byType = await Notification.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]);

      return {
        total,
        unread,
        read: total - unread,
        byType: byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      };
    } catch (error) {
      logger.error('Error getting notification stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old notifications
   * @param {Number} daysOld - Days old threshold
   * @returns {Promise<Object>} Cleanup result
   */
  static async cleanupOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate },
        isRead: true,
      });

      logger.info(`Cleaned up ${result.deletedCount} old notifications`);
      return result;
    } catch (error) {
      logger.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
