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

/**
 * Handle all notification deliveries.
 * Currently supports:
 * - IN_APP
 * - EMAIL
 *
 * Future:
 * - PUSH
 * - SMS
 */
const deliverNotification = async (notification) => {
  switch (notification.channel) {
    case NOTIFICATION_CHANNELS.IN_APP:
      return {
        success: true,
        channel: "IN_APP",
      };

    case NOTIFICATION_CHANNELS.EMAIL:{
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

    case NOTIFICATION_CHANNELS.PUSH:
      throw new InvalidNotificationChannelError(
        "Push notification provider is not configured.",
      );

    case NOTIFICATION_CHANNELS.SMS:
      throw new InvalidNotificationChannelError(
        "SMS notification provider is not configured.",
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
