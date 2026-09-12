const nodemailer = require("nodemailer");

// Ensure Nodemailer restricts DNS resolution to IPv4 in containerized environments (e.g. Railway)
const shared = require("nodemailer/lib/shared");
if (shared && shared.networkInterfaces) {
  for (const name of Object.keys(shared.networkInterfaces)) {
    shared.networkInterfaces[name] = shared.networkInterfaces[name].filter(
      (iface) => iface.family === 4 || iface.family === "IPv4"
    );
  }
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

// SMTP connection verify
transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP connection failed:", error.message);
    return;
  }

  console.log("SMTP Server Connected Successfully");
});

module.exports = transporter;