const transporter = require("../../config/mail");
const EmailProvider = require("./email.provider");

class SMTPProvider extends EmailProvider {
  async send({ to, subject, html, text }) {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      text,
    });

    return info;
  }
}

module.exports = SMTPProvider;