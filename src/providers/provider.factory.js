const SMTPProvider = require('./email/smtp.provider');
const FirebaseProvider = require('./push/firebase.provider');

class ProviderFactory {
  static createEmailProvider() {
    return new SMTPProvider();
  }

  static createPushProvider() {
    return new FirebaseProvider();
  }
}

module.exports = ProviderFactory;
 