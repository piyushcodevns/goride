const SMTPProvider = require("./email/smtp.provider");
const FirebaseProvider = require("./push/firebase.provider");
const TwilioSMSProvider = require("./sms/twilio.provider");

class ProviderFactory {
  static createEmailProvider() {
    return new SMTPProvider();
  }

  static createPushProvider() {
    return new FirebaseProvider();
  }

  static createSMSProvider() {
    return new TwilioSMSProvider();
  }
}

module.exports = ProviderFactory;
