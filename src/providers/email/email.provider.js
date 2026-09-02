class EmailProvider {
  /**
   * Send an email.
   *
   * @param {Object} options
   * @param {string|string[]} options.to
   * @param {string} options.subject
   * @param {string} [options.text]
   * @param {string} [options.html]
   */
  async send(options) {
    throw new Error(
      `${this.constructor.name} must implement the send() method.`
    );
  }
}

module.exports = EmailProvider;