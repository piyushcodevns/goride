const { getUserById } = require("../../repositories/user.repository");

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
 * PUSH remains intentionally unchanged until its
 * existing provider is fully configured for delivery.
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

    case NOTIFICATION_CHANNELS.PUSH:
      throw new InvalidNotificationChannelError(
        "Push notification provider is not configured.",
      );

    default:
      throw new InvalidNotificationChannelError(
        `Unsupported notification channel: ${notification.channel}`,
      );
  }
};

module.exports = {
  deliverNotification,
};
