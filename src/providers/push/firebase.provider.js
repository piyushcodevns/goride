const PushProvider = require('./push.provider');

class FirebaseProvider extends PushProvider {
  async send() {
    return { success: true, provider: 'firebase' };
  }
}

module.exports = FirebaseProvider;
