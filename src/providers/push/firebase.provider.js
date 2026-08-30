const PushProvider = require("./push.provider");
const { InvalidNotificationChannelError } = require("../../utils/AppError");

class FirebaseProvider extends PushProvider {
  async send() {
    throw new InvalidNotificationChannelError(
      "Push notification provider is not configured. Firebase FCM integration requires device token storage and Firebase credentials.",
    );
  }
}

module.exports = FirebaseProvider;
 