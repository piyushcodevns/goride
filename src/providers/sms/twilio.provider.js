const {
  NotificationDeliveryFailedError,
} = require("../../utils/AppError");

const axios = require("axios");
const SMSProvider = require("./sms.provider");

class TwilioSMSProvider extends SMSProvider {
  constructor() {
    super();

    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.from = process.env.TWILIO_FROM_NUMBER;
    this.timeout = Number(process.env.SMS_REQUEST_TIMEOUT_MS || 10000);
  }

  async send({ to, message }) {
    if (!this.accountSid || !this.authToken || !this.from) {
      throw new NotificationDeliveryFailedError(
        "SMS provider is not configured.",
      );
    }

    if (!to) {
      throw new NotificationDeliveryFailedError(
        "SMS recipient phone number is required.",
      );
    }

    if (!message) {
      throw new NotificationDeliveryFailedError(
        "SMS message is required.",
      );
    }

    try {
      const body = new URLSearchParams({
        To: to,
        From: this.from,
        Body: message,
      });

      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
          this.accountSid,
        )}/Messages.json`,
        body.toString(),
        {
          auth: {
            username: this.accountSid,
            password: this.authToken,
          },
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: this.timeout,
        },
      );

      return {
        success: true,
        provider: "TWILIO",
        messageId: response.data?.sid || null,
        status: response.data?.status || null,
      };
    } catch (error) {
      throw new NotificationDeliveryFailedError(
        `SMS delivery failed: ${
          error.response?.data?.message ||
          error.message ||
          "Unknown provider error"
        }`,
      );
    }
  }
}

module.exports = TwilioSMSProvider;
