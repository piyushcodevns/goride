const EmailProvider = require("./email.provider");
const { EmailProviderError } = require("../../utils/AppError");
const logger = require("../../utils/logger");

const RESEND_API_URL = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 10000;

class SMTPProvider extends EmailProvider {
  async send({ to, subject, html, text }) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new EmailProviderError("RESEND_API_KEY is not configured.");
    }

    const fromAddress = process.env.EMAIL_FROM || process.env.RESEND_FROM || "GoRide <onboarding@resend.dev>";

    if (process.env.NODE_ENV === "production" && fromAddress.includes("onboarding@resend.dev")) {
      logger.warn(
        "EMAIL_FROM is using Resend testing domain (onboarding@resend.dev). A verified domain in EMAIL_FROM is required in production to deliver to arbitrary recipients."
      );
    }

    const payload = {
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
    };

    if (html) {
      payload.html = html;
    }
    if (text) {
      payload.text = text;
    }

    let response;
    try {
      response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (networkError) {
      throw new EmailProviderError(
        networkError.name === "TimeoutError"
          ? "Email delivery timed out."
          : `Email delivery network failure: ${networkError.message}`
      );
    }

    if (!response.ok) {
      let errorMessage = `Resend API returned status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData?.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Ignore JSON parsing failure for error response
      }

      logger.error("Resend API rejected email delivery.", {
        statusCode: response.status,
        error: errorMessage,
        from: fromAddress,
      });

      throw new EmailProviderError(errorMessage);
    }

    const data = await response.json();

    return {
      id: data.id,
      messageId: data.id,
      ...data,
    };
  }
}

module.exports = SMTPProvider;