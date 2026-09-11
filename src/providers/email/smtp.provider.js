const nodemailer = require("nodemailer");
const EmailProvider = require("./email.provider");
const { EmailProviderError } = require("../../utils/AppError");
const logger = require("../../utils/logger");

class SMTPProvider extends EmailProvider {
  constructor(options = {}) {
    super();
    this.options = options;
    this._transporter = options.transporter || null;
    this._transporterCacheKey = null;
  }

  getTransporter() {
    if (this.options?.transporter) {
      return this.options.transporter;
    }

    const host = this.options?.host || process.env.SMTP_HOST || "smtp-relay.brevo.com";
    const port = Number(this.options?.port || process.env.SMTP_PORT || 587);
    const user = this.options?.user || process.env.SMTP_USER;
    const pass = this.options?.pass || process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new EmailProviderError("SMTP credentials are not configured.");
    }

    const cacheKey = `${host}:${port}:${user}:${pass}`;
    if (this._transporter && this._transporterCacheKey === cacheKey) {
      return this._transporter;
    }

    const secure = port === 465;

    this._transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    this._transporterCacheKey = cacheKey;

    return this._transporter;
  }

  async verifyConnection() {
    const transporter = this.getTransporter();
    return transporter.verify();
  }

  async send({ to, subject, html, text }) {
    if (!to) {
      throw new EmailProviderError("Recipient email address is required.");
    }

    if (!subject) {
      throw new EmailProviderError("Email subject is required.");
    }

    const transporter = this.getTransporter();

    const fromAddress =
      this.options?.from ||
      process.env.EMAIL_FROM ||
      "GoRide <noreply@goride.com>";

    const mailOptions = {
      from: fromAddress,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
    };

    if (html) {
      mailOptions.html = html;
    }
    if (text) {
      mailOptions.text = text;
    }

    try {
      const info = await transporter.sendMail(mailOptions);
      return {
        id: info.messageId,
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected,
        ...info,
      };
    } catch (error) {
      logger.error("SMTP email delivery failed.", {
        to: mailOptions.to,
        from: mailOptions.from,
        errorCode: error.code,
        errorMessage: error.message,
      });

      const safeMessage = error.code
        ? `SMTP delivery failed [${error.code}]: ${error.message}`
        : `SMTP delivery failed: ${error.message}`;

      throw new EmailProviderError(safeMessage);
    }
  }
}

module.exports = SMTPProvider;