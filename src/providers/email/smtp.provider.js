const nodemailer = require("nodemailer");
const EmailProvider = require("./email.provider");
const { EmailProviderError } = require("../../utils/AppError");
const logger = require("../../utils/logger");

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const REQUEST_TIMEOUT_MS = 10000;

function parseSender(fromStr) {
  if (!fromStr) {
    return { name: "GoRide", email: "noreply@goride.com" };
  }
  const match = fromStr.match(/^(?:([^<]+)\s*)?<([^>]+)>$/);
  if (match) {
    return {
      name: match[1]?.trim() || "GoRide",
      email: match[2]?.trim(),
    };
  }
  return { name: "GoRide", email: fromStr.trim() };
}

function formatRecipients(to) {
  const recipients = Array.isArray(to) ? to : [to];
  return recipients.map((r) => {
    if (typeof r === "string") {
      const match = r.match(/^(?:([^<]+)\s*)?<([^>]+)>$/);
      if (match) {
        return { name: match[1]?.trim() || undefined, email: match[2]?.trim() };
      }
      return { email: r.trim() };
    }
    return r;
  });
}

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

  async sendViaBrevoApi({ to, subject, html, text, apiKey, fromAddress }) {
    const payload = {
      sender: parseSender(fromAddress),
      to: formatRecipients(to),
      subject,
    };

    if (html) {
      payload.htmlContent = html;
    }
    if (text) {
      payload.textContent = text;
    }

    let response;
    try {
      response = await fetch(BREVO_API_URL, {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (networkError) {
      throw new EmailProviderError(
        networkError.name === "TimeoutError"
          ? "Brevo email delivery timed out."
          : `Brevo email delivery network failure: ${networkError.message}`
      );
    }

    if (!response.ok) {
      let errorMessage = `Brevo API returned status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData?.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Ignore JSON parse failure
      }

      logger.error("Brevo API rejected email delivery.", {
        statusCode: response.status,
        error: errorMessage,
        from: fromAddress,
      });

      throw new EmailProviderError(errorMessage);
    }

    const data = await response.json();
    return {
      id: data.messageId,
      messageId: data.messageId,
      response: data.messageId,
      accepted: Array.isArray(to) ? to : [to],
      rejected: [],
      ...data,
    };
  }

  async send({ to, subject, html, text }) {
    if (!to) {
      throw new EmailProviderError("Recipient email address is required.");
    }

    if (!subject) {
      throw new EmailProviderError("Email subject is required.");
    }

    const fromAddress =
      this.options?.from ||
      process.env.EMAIL_FROM ||
      "GoRide <noreply@goride.com>";

    const brevoApiKey =
      this.options?.apiKey ||
      process.env.BREVO_API_KEY ||
      (process.env.SMTP_PASS?.startsWith("xkeysib-") ? process.env.SMTP_PASS : null);

    // If explicit transporter was passed, always use it
    if (this.options?.transporter) {
      return this.sendViaTransporter({ to, subject, html, text, fromAddress });
    }

    // If Brevo API key is available, use Brevo HTTPS API (essential for cloud platforms like Railway where outbound SMTP ports 25/465/587 are blocked)
    if (brevoApiKey) {
      return this.sendViaBrevoApi({ to, subject, html, text, apiKey: brevoApiKey, fromAddress });
    }

    // Otherwise use standard SMTP transport
    return this.sendViaTransporter({ to, subject, html, text, fromAddress });
  }

  async sendViaTransporter({ to, subject, html, text, fromAddress }) {
    const transporter = this.getTransporter();

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

      const isTimeout = error.code === "ETIMEDOUT" || error.message?.includes("timeout");
      const safeMessage = isTimeout
        ? `SMTP delivery timed out [ETIMEDOUT]. Note: Cloud platforms (such as Railway) block outbound SMTP ports (587/465/25). Set BREVO_API_KEY to deliver via Brevo HTTPS API.`
        : error.code
        ? `SMTP delivery failed [${error.code}]: ${error.message}`
        : `SMTP delivery failed: ${error.message}`;

      throw new EmailProviderError(safeMessage);
    }
  }
}

module.exports = SMTPProvider;