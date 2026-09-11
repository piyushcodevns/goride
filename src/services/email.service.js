const SMTPProvider = require("../providers/email/smtp.provider");
const { EmailProviderError } = require("../utils/AppError");

const logger = require("../utils/logger");

const emailProvider = new SMTPProvider();

const sendEmail = async ({ to, subject, html, text }) => {
  if (process.env.NODE_ENV === "test") {
    if (typeof sendEmail.testInterceptor === "function") {
      return sendEmail.testInterceptor({ to, subject, html, text });
    }
    return { messageId: "test-mock-message-id" };
  }

  try {
    const info = await emailProvider.send({
      to,
      subject,
      html,
      text,
    });

    logger.info("Email sent successfully.", {
      to,
      messageId: info.messageId,
    });

    return info;
  } catch (error) {
    logger.error("Email sending failed.", {
      to,
      error: error.message,
      stack: error.stack,
    });

    if (error instanceof EmailProviderError) {
      throw error;
    }
    throw new EmailProviderError(error.message || "Unable to send email notification.");
  }
};

module.exports = {
  sendEmail,
};
