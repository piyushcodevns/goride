const SMTPProvider = require("../providers/email/smtp.provider");
const { EmailProviderError } = require("../utils/AppError");

const logger = require("../utils/logger");

const emailProvider = new SMTPProvider();

const sendEmail = async ({ to, subject, html, text }) => {
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

    throw new EmailProviderError("Unable to send email notification.");
  }
};

module.exports = {
  sendEmail,
};
