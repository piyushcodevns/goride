const emailVerificationTemplate = ({ otp }) => {
  return `
    <h2>Email Verification</h2>

    <p>Your verification code is:</p>

    <h1>${otp}</h1>

    <p>This code will expire in 15 minutes.</p>

    <br>

    <p>GoRide Team</p>
  `;
};

module.exports = {
  emailVerificationTemplate,
};