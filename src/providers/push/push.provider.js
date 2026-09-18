class PushProvider {
  async send(options) {
    throw new Error(`${this.constructor.name} must implement the send() method.`);
  }
}

module.exports = PushProvider;
