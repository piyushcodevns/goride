const { getUserById } = require("../../repositories/user.repository");
const { findPushDevices } = require("../../repositories/admin/adminNotification.repository");

const {
  InvalidNotificationChannelError,
  EmailProviderError,
} = require("../../utils/AppError");

const logger = require("../../utils/logger");
const ProviderFactory = require("../../providers/provider.factory");

const {
  NOTIFICATION_CHANNELS,
} = require("../../constants/notification.constants");

const emailProvider = ProviderFactory.createEmailProvider();
const smsProvider = ProviderFactory.createSMSProvider();

/**
 * Handle all notification deliveries.
 *
 * Supported:
 * - IN_APP
 * - EMAIL
 * - SMS
 *
 * PUSH is delivered to every active device registered for the user.
 */
const deliverNotification = async (notification) => {
  switch (notification.channel) {
    case NOTIFICATION_CHANNELS.IN_APP:
      return {
        success: true,
        channel: "IN_APP",
      };

    case NOTIFICATION_CHANNELS.EMAIL: {
      const user = await getUserById(notification.userId);

      if (!user?.email) {
        throw new EmailProviderError(
          "User email not found for notification delivery.",
        );
      }

      await emailProvider.send({
        to: user.email,
        subject: notification.title,
        html: notification.message,
      });

      logger.info("Email notification delivered.", {
        notificationId: notification.id,
        userId: notification.userId,
      });

      return {
        success: true,
        channel: "EMAIL",
      };
    }

    case NOTIFICATION_CHANNELS.SMS: {
      const user = await getUserById(notification.userId);

      if (!user?.phone) {
        throw new InvalidNotificationChannelError(
          "User phone number not found for SMS notification delivery.",
        );
      }

      const result = await smsProvider.send({
        to: user.phone,
        message: notification.message,
      });

      logger.info("SMS notification delivered.", {
        notificationId: notification.id,
        userId: notification.userId,
        provider: result?.provider || "UNKNOWN",
        messageId: result?.messageId || null,
      });

      return {
        success: true,
        channel: "SMS",
        provider: result?.provider || null,
        messageId: result?.messageId || null,
      };
    }

    case NOTIFICATION_CHANNELS.PUSH: {
      const devices = await findPushDevices(notification.userId);
      if (!devices.length) {
        throw new InvalidNotificationChannelError(
          "No active push device is registered for this user.",
        );
      }
      const results = await Promise.all(
        devices.map((device) =>
          ProviderFactory.createPushProvider().send({
            token: device.token,
            title: notification.title,
            message: notification.message,
            data: notification.metadata || {},
          }),
        ),
      );
      return {
        success: true,
        channel: "PUSH",
        provider: "FCM",
        deliveredDevices: results.length,
      };
    }

    default:
      throw new InvalidNotificationChannelError(
        `Unsupported notification channel: ${notification.channel}`,
      );
  }
};

module.exports = {
  deliverNotification,
};
