const passwordResetTemplate = ({ token }) => {
  return `
    <h2>Password Reset</h2>

    <p>Your password reset code is:</p>

    <h1>${token}</h1>

    <p>This code will expire in 15 minutes.</p>

    <br>

    <p>If you didn't request this, please ignore this email.</p>

    <br>

    <p>GoRide Team</p>
  `;
};

module.exports = {
  passwordResetTemplate,
};