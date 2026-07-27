const transporter = require("../config/mail");

const sendEmail = async ({ to, subject, html }) => {
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });

  console.log("=================================");
  console.log("EMAIL SENT");
  console.log("TO:", to);
  console.log("MESSAGE ID:", info.messageId);
  console.log("=================================");
};

module.exports = {
  sendEmail,
};