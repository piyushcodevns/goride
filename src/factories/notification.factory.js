const {
  NOTIFICATION_EVENTS,
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PRIORITY,
} = require("../constants/notification.constants");

class NotificationFactory {
  /**
   * Welcome Notification
   */
  static createWelcomeNotification(user) {
    return {
      userId: user.id,

      title: "Welcome to GoRide! 🚖",

      message: `Hi ${user.fullName}, welcome to GoRide. Your account has been created successfully.`,

      type: NOTIFICATION_TYPES.ACCOUNT,

      channel: NOTIFICATION_CHANNELS.IN_APP,

      priority: NOTIFICATION_PRIORITY.NORMAL,

      metadata: null,
    };
  }

  /**
   * Ride Booked Notification
   */
  static createRideBookedNotification({
    userId,
    rideId,
    pickup,
    destination,
    status,
  }) {
    return {
      userId,

      title: "Ride Booked Successfully 🚖",

      message: `Your ride from ${pickup} to ${destination} has been booked successfully.`,

      type: NOTIFICATION_TYPES.RIDE,

      channel: NOTIFICATION_CHANNELS.IN_APP,

      priority: NOTIFICATION_PRIORITY.HIGH,

      metadata: {
        rideId,
        status,
      },
    };
  }

  /**
   * Ride Accepted Notification
   */
  static createRideAcceptedNotification({ userId, rideId, driverId, status }) {
    return {
      userId,

      title: "Ride Accepted 🚖",

      message: "Your driver has accepted your ride and will reach you soon.",

      type: NOTIFICATION_TYPES.RIDE,

      channel: NOTIFICATION_CHANNELS.IN_APP,

      priority: NOTIFICATION_PRIORITY.HIGH,

      metadata: {
        rideId,
        driverId,
        status,
      },
    };
  }

  /**
   * Driver Arrived Notification
   */
  static createDriverArrivedNotification({ userId, rideId, driverId, status }) {
    return {
      userId,

      title: "Driver Arrived 🚗",

      message: "Your driver has arrived at pickup location.",

      type: NOTIFICATION_TYPES.RIDE,

      channel: NOTIFICATION_CHANNELS.IN_APP,

      priority: NOTIFICATION_PRIORITY.HIGH,

      metadata: {
        rideId,
        driverId,
        status,
      },
    };
  }

  /**
   * Ride Started Notification
   */
  static createRideStartedNotification({ userId, rideId, driverId, status }) {
    return {
      userId,

      title: "Ride Started 🚖",

      message: "Your ride has started. Have a safe journey.",

      type: NOTIFICATION_TYPES.RIDE,

      channel: NOTIFICATION_CHANNELS.IN_APP,

      priority: NOTIFICATION_PRIORITY.HIGH,

      metadata: {
        rideId,
        driverId,
        status,
      },
    };
  }

  /**
   * Ride Completed Notification
   */
  static createRideCompletedNotification({ userId, rideId, driverId, status }) {
    return {
      userId,

      title: "Ride Completed 🎉",

      message: "Your ride has been completed successfully.",

      type: NOTIFICATION_TYPES.RIDE,

      channel: NOTIFICATION_CHANNELS.IN_APP,

      priority: NOTIFICATION_PRIORITY.HIGH,

      metadata: {
        rideId,
        driverId,
        status,
      },
    };
  }

  /**
   * Ride Cancelled Notification
   */
  static createRideCancelledNotification({
    userId,
    rideId,
    pickup,
    destination,
    status,
  }) {
    return {
      userId,

      title: "Ride Cancelled ❌",

      message: `Your ride from ${pickup} to ${destination} has been cancelled.`,

      type: NOTIFICATION_TYPES.RIDE,

      channel: NOTIFICATION_CHANNELS.IN_APP,

      priority: NOTIFICATION_PRIORITY.HIGH,

      metadata: {
        rideId,
        status,
      },
    };
  }

  /**
   * Ride Rejected Notification
   */
  static createRideRejectedNotification({ userId, rideId, driverId }) {
    return {
      userId,

      title: "Ride Rejected",

      message:
        "Your ride request was rejected by the driver. We are searching for another driver.",

      type: NOTIFICATION_TYPES.RIDE,

      channel: NOTIFICATION_CHANNELS.IN_APP,

      priority: NOTIFICATION_PRIORITY.HIGH,

      metadata: {
        rideId,
        driverId,
        status: "REJECTED",
      },
    };
  }

  /**
   * Payment Success Notification
   */
  static createPaymentSuccessNotification(payment) {
    return {
      userId: payment.userId,

      title: "Payment Successful 💳",

      message: `Your payment of ₹${payment.amount} has been completed successfully.`,

      type: NOTIFICATION_TYPES.PAYMENT,

      channel: NOTIFICATION_CHANNELS.IN_APP,

      priority: NOTIFICATION_PRIORITY.HIGH,

      metadata: {
        paymentId: payment.id,
        rideId: payment.rideId,
        status: payment.status,
      },
    };
  }

  /**
   * Payment Failed Notification
   */
  static createPaymentFailedNotification(payment) {
    return {
      userId: payment.userId,

      title: "Payment Failed ❌",

      message: `Your payment of ₹${payment.amount} could not be completed.`,

      type: NOTIFICATION_TYPES.PAYMENT,

      channel: NOTIFICATION_CHANNELS.IN_APP,

      priority: NOTIFICATION_PRIORITY.HIGH,

      metadata: {
        paymentId: payment.id,
        rideId: payment.rideId,
        status: payment.status,
      },
    };
  }

  /**
   * Coupon Applied Notification
   */
  static createCouponAppliedNotification({
    userId,
    rideId,
    couponCode,
    discountAmount,
  }) {
    return {
      userId,

      title: "Coupon Applied 🎉",

      message: `Coupon ${couponCode} applied successfully. You saved ₹${discountAmount}.`,

      type: NOTIFICATION_TYPES.PROMOTION,

      channel: NOTIFICATION_CHANNELS.IN_APP,

      priority: NOTIFICATION_PRIORITY.NORMAL,

      metadata: {
        rideId,
        couponCode,
        discountAmount,
      },
    };
  }

  /**
   * Password Reset Notification
   */
  static createPasswordResetNotification(user) {
    return {
      userId: user.id,

      title: "Password Reset Successful 🔒",

      message:
        "Your GoRide account password has been changed successfully. If you did not perform this action, please contact support immediately.",

      type: NOTIFICATION_TYPES.SECURITY,

      channel: NOTIFICATION_CHANNELS.IN_APP,

      priority: NOTIFICATION_PRIORITY.HIGH,

      metadata: null,
    };
  }
}

module.exports = NotificationFactory;
