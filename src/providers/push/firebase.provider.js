const PushProvider = require("./push.provider");
const { InvalidNotificationChannelError } = require("../../utils/AppError");
const axios = require("axios");

class FirebaseProvider extends PushProvider {
  async send({ token, title, message, data = {} }) {
    const serverKey = process.env.FCM_SERVER_KEY || process.env.FIREBASE_SERVER_KEY;
    if (!serverKey) {
      throw new InvalidNotificationChannelError("Push provider is not configured.");
    }
    if (!token || !title || !message) {
      throw new InvalidNotificationChannelError("Push token, title, and message are required.");
    }
    try {
      const response = await axios.post(
        "https://fcm.googleapis.com/fcm/send",
        { to: token, notification: { title, body: message }, data },
        {
          headers: {
            Authorization: `key=${serverKey}`,
            "Content-Type": "application/json",
          },
          timeout: Number(process.env.PUSH_REQUEST_TIMEOUT_MS || 10000),
        },
      );
      if (response.data?.failure) {
        throw new Error("FCM rejected the push notification.");
      }
      return {
        success: true,
        provider: "FCM",
        messageId: response.data?.results?.[0]?.message_id || null,
      };
    } catch (error) {
      throw new InvalidNotificationChannelError(
        `Push delivery failed: ${error.response?.data?.error || error.message}`,
      );
    }
  }
}

module.exports = FirebaseProvider;
 